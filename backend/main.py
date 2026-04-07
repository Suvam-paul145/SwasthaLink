"""
SwasthaLink Backend API.
FastAPI application entrypoint with a reload-safe development runner.
"""

import json
import logging
import os
import re
from contextlib import asynccontextmanager
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

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


class DrugInteractionsRequest(BaseModel):
    medications: List[str] = Field(default_factory=list)


def _load_runtime_dependencies():
    load_dotenv(os.path.join(BACKEND_DIR, ".env"))

    from ai.prompts import format_drug_interactions_prompt
    from core.config import ALLOWED_ORIGINS, FRONTEND_URL
    from db.supabase_service import (
        check_supabase_health,
        get_share_payload_by_token,
        get_schema_file_path,
        is_supabase_table_available,
    )
    from routes import all_routers
    from services.llm_service import _generate_text, check_llm_health, is_llm_configured
    from services.s3_service import check_s3_health
    from services.twilio_service import (
        check_twilio_health,
        restore_followup_jobs,
        start_followup_scheduler,
        stop_followup_scheduler,
    )

    return {
        "allowed_origins": ALLOWED_ORIGINS,
        "frontend_url": FRONTEND_URL,
        "routers": all_routers,
        "check_gemini_health": check_llm_health,
        "is_llm_configured": is_llm_configured,
        "check_twilio_health": check_twilio_health,
        "check_supabase_health": check_supabase_health,
        "check_s3_health": check_s3_health,
        "generate_text": _generate_text,
        "get_share_payload_by_token": get_share_payload_by_token,
        "get_schema_file_path": get_schema_file_path,
        "is_supabase_table_available": is_supabase_table_available,
        "format_drug_interactions_prompt": format_drug_interactions_prompt,
        "start_followup_scheduler": start_followup_scheduler,
        "restore_followup_jobs": restore_followup_jobs,
        "stop_followup_scheduler": stop_followup_scheduler,
    }


async def _quiet_status(checker):
    """Run a health checker while suppressing noisy third-party info logs."""
    root_logger = logging.getLogger()
    previous_level = root_logger.level
    try:
        if previous_level <= logging.INFO:
            root_logger.setLevel(logging.WARNING)
        result = await checker() if hasattr(checker, '__call__') else checker
        return result.get("status") if isinstance(result, dict) else "unknown"
    finally:
        root_logger.setLevel(previous_level)


def _parse_interactions_array(response_text: str) -> list[dict]:
    """Safely parse Gemini response into interaction objects."""
    if not response_text:
        return []

    cleaned = response_text.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start == -1 or end == -1 or end < start:
            return []
        try:
            parsed = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError:
            return []

    if not isinstance(parsed, list):
        return []

    allowed_severity = {"mild", "moderate", "severe"}
    normalized: list[dict] = []

    for item in parsed:
        if not isinstance(item, dict):
            continue

        drug_a = item.get("drug_a")
        drug_b = item.get("drug_b")
        severity = str(item.get("severity", "")).lower()
        description = item.get("description")
        action = item.get("action")

        if not all(isinstance(v, str) and v.strip() for v in [drug_a, drug_b, description, action]):
            continue
        if severity not in allowed_severity:
            continue

        normalized.append(
            {
                "drug_a": drug_a.strip(),
                "drug_b": drug_b.strip(),
                "severity": severity,
                "description": description.strip(),
                "action": action.strip(),
            }
        )

    return normalized


def create_app() -> FastAPI:
    runtime = _load_runtime_dependencies()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("=" * 50)
        logger.info("SwasthaLink API Starting...")
        logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
        logger.info(f"Frontend URL: {runtime['frontend_url']}")
        logger.info("=" * 50)

        # Fast health checks — no LLM API call at startup (was adding 2-10s)
        llm_status = "ok" if runtime["is_llm_configured"]() else "not configured"
        supabase_health = runtime["check_supabase_health"]()
        logger.info(f"LLM API:    {llm_status}")
        logger.info(f"Twilio API: {runtime['check_twilio_health']().get('status')}")
        logger.info(f"Supabase:   {supabase_health.get('status')}")
        logger.info(f"AWS S3:     {runtime['check_s3_health']().get('status')}")
        if supabase_health.get("setup_required"):
            logger.warning(supabase_health.get("message"))

        if runtime["is_supabase_table_available"]("followup_messages"):
            runtime["start_followup_scheduler"]()
            await runtime["restore_followup_jobs"]()
            logger.info("Follow-up scheduler started and pending jobs restored")
        else:
            logger.warning(
                "Skipping follow-up scheduler startup until Supabase schema is applied: %s",
                runtime["get_schema_file_path"](),
            )
        logger.info("=" * 50)
        yield
        runtime["stop_followup_scheduler"]()
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

    @app.middleware("http")
    async def normalize_double_slashes(request, call_next):
        """Fix double-slash paths (e.g. //api/... -> /api/...) that break CORS preflight."""
        path = request.scope.get("path", "")
        if "//" in path:
            cleaned = re.sub(r'/+', '/', path)
            request.scope["path"] = cleaned
            request.scope["raw_path"] = cleaned.encode("ascii")
        return await call_next(request)

    for router in runtime["routers"]:
        app.include_router(router)

    @app.post("/api/drug-interactions")
    async def check_drug_interactions(payload: DrugInteractionsRequest):
        """Return pairwise medication interactions from Gemini."""
        medications = [m.strip() for m in payload.medications if isinstance(m, str) and m.strip()]
        if len(medications) < 2:
            return {"interactions": []}

        try:
            prompt = runtime["format_drug_interactions_prompt"](medications)
            raw_response = await runtime["generate_text"](
                prompt=prompt,
                temperature=0.1,
                rate_limit_context="drug_interactions"
            )
            interactions = _parse_interactions_array(raw_response)
            return {"interactions": interactions}
        except Exception as exc:
            logger.error(f"Drug interaction check failed: {exc}")
            return {"interactions": []}

    @app.get("/api/share/{token}")
    async def get_shared_summary(token: str):
        """Public endpoint for tokenized, non-PHI discharge summary access."""
        payload = await runtime["get_share_payload_by_token"](token)
        if not payload:
            raise HTTPException(status_code=404, detail="Share link not found or expired")
        return payload

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

    load_dotenv(os.path.join(BACKEND_DIR, ".env"))

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
