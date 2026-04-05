"""
SwasthaLink Backend API.
FastAPI application entrypoint with a reload-safe development runner.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logging.getLogger("watchfiles").setLevel(logging.WARNING)
logging.getLogger("watchfiles.main").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
RELOAD_EXCLUDES = [
    "*.db",
    "*.db-*",
    "*.db-journal",
    "*.db-wal",
    "*.sqlite",
    "*.sqlite3",
    "*.log",
    "*.log.*",
    "*.pyc",
    "__pycache__",
    "__pycache__/*",
    ".pytest_cache",
    ".pytest_cache/*",
    ".ruff_cache",
    ".ruff_cache/*",
    "venv",
    "venv/*",
    ".venv",
    ".venv/*",
    "env",
    "env/*",
    "ENV",
    "ENV/*",
    "tmp",
    "tmp/*",
    "temp",
    "temp/*",
    "uploads",
    "uploads/*",
]


def _load_runtime_dependencies():
    load_dotenv()

    from core.config import ALLOWED_ORIGINS, FRONTEND_URL
    from db.supabase_service import check_supabase_health
    from routes import all_routers
    from services.gemini_service import check_gemini_health
    from services.s3_service import check_s3_health
    from services.twilio_service import check_twilio_health

    return {
        "allowed_origins": ALLOWED_ORIGINS,
        "frontend_url": FRONTEND_URL,
        "routers": all_routers,
        "check_gemini_health": check_gemini_health,
        "check_twilio_health": check_twilio_health,
        "check_supabase_health": check_supabase_health,
        "check_s3_health": check_s3_health,
    }


def _quiet_status(checker):
    """Run a health checker while suppressing noisy third-party info logs."""
    root_logger = logging.getLogger()
    previous_level = root_logger.level
    try:
        if previous_level <= logging.INFO:
            root_logger.setLevel(logging.WARNING)
        return checker().get("status")
    finally:
        root_logger.setLevel(previous_level)


def create_app() -> FastAPI:
    runtime = _load_runtime_dependencies()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("=" * 50)
        logger.info("SwasthaLink API Starting...")
        logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
        logger.info(f"Frontend URL: {runtime['frontend_url']}")
        logger.info("=" * 50)
        logger.info(f"Gemini API: {_quiet_status(runtime['check_gemini_health'])}")
        logger.info(f"Twilio API: {runtime['check_twilio_health']().get('status')}")
        logger.info(f"Supabase:   {runtime['check_supabase_health']().get('status')}")
        logger.info(f"AWS S3:     {runtime['check_s3_health']().get('status')}")
        logger.info("=" * 50)
        yield
        logger.info("SwasthaLink API shutting down...")

    app = FastAPI(
        title="SwasthaLink API",
        description="Medical discharge summary simplification with bilingual output and WhatsApp delivery",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=runtime["allowed_origins"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in runtime["routers"]:
        app.include_router(router)

    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error(f"Unhandled exception: {exc}")
        logger.exception(exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": (
                    str(exc)
                    if os.getenv("DEBUG", "").strip().lower() == "true"
                    else "An unexpected error occurred"
                ),
            },
        )

    return app


if __name__ != "__main__":
    app = create_app()


if __name__ == "__main__":
    import uvicorn

    load_dotenv()

    uvicorn.run(
        "main:create_app",
        factory=True,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        reload_dirs=[BACKEND_DIR],
        reload_includes=["*.py"],
        reload_excludes=RELOAD_EXCLUDES,
        log_level="info",
    )
