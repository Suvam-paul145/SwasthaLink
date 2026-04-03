"""
SwasthaLink Backend API
FastAPI application — slim entrypoint that mounts domain routers.
"""

import os
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables before anything else
load_dotenv()

from core.config import FRONTEND_URL, ALLOWED_ORIGINS
from routes import all_routers
from services.gemini_service import check_gemini_health
from services.twilio_service import check_twilio_health
from services.s3_service import check_s3_health
from db.supabase_service import check_supabase_health
from services.rate_limiter_service import clear_all_rate_limits

from core.logger import setup_logger

# Logging
logger = setup_logger(__name__)
access_logger = setup_logger("access")


# ---------------------------------------------------------------------------
# Lifespan (replaces deprecated on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    logger.info("=" * 50)
    logger.info("SwasthaLink API Starting...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Frontend URL: {FRONTEND_URL}")
    logger.info("=" * 50)
    logger.info(f"Gemini API: {check_gemini_health().get('status')}")
    logger.info(f"Twilio API: {check_twilio_health().get('status')}")
    logger.info(f"Supabase:   {check_supabase_health().get('status')}")
    logger.info(f"AWS S3:     {check_s3_health().get('status')}")
    logger.info("=" * 50)

    yield  # App is running

    # ---- Shutdown ----
    logger.info("SwasthaLink API shutting down...")
    clear_all_rate_limits()


# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SwasthaLink API",
    description="Medical discharge summary simplification with bilingual output and WhatsApp delivery",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Log request start
    access_logger.info("Request started", extra={
        "request_id": request_id, 
        "method": request.method, 
        "path": request.url.path
    })
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log request end
    access_logger.info("Request completed", extra={
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "process_time_ms": round(process_time * 1000, 2)
    })
    
    return response

# Mount all domain routers
for router in all_routers:
    app.include_router(router)


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    logger.exception(exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") == "true" else "An unexpected error occurred",
        },
    )


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="info",
    )

