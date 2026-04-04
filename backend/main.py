"""
SwasthaLink Backend API
FastAPI application — slim entrypoint that mounts domain routers.
"""

import os
import logging
import json
import re
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables before anything else
load_dotenv()

from core.config import FRONTEND_URL, ALLOWED_ORIGINS
from routes import all_routers
from services.gemini_service import check_gemini_health
from services.gemini_service import _generate_text
from services.twilio_service import check_twilio_health
from services.twilio_service import start_followup_scheduler, restore_followup_jobs, stop_followup_scheduler
from services.s3_service import check_s3_health
from db.supabase_service import check_supabase_health
from db.supabase_service import get_share_payload_by_token
from ai.prompts import format_drug_interactions_prompt

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SwasthaLink API",
    description="Medical discharge summary simplification with bilingual output and WhatsApp delivery",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all domain routers
for router in all_routers:
    app.include_router(router)


class DrugInteractionsRequest(BaseModel):
    medications: List[str] = Field(default_factory=list)


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


@app.post("/api/drug-interactions")
async def check_drug_interactions(payload: DrugInteractionsRequest):
    """Return pairwise medication interactions from Gemini."""
    medications = [m.strip() for m in payload.medications if isinstance(m, str) and m.strip()]
    if len(medications) < 2:
        return {"interactions": []}

    try:
        prompt = format_drug_interactions_prompt(medications)
        raw_response = _generate_text(prompt=prompt, generation_config={"temperature": 0.1})
        interactions = _parse_interactions_array(raw_response)
        return {"interactions": interactions}
    except Exception as exc:
        logger.error(f"Drug interaction check failed: {exc}")
        return {"interactions": []}


@app.get("/api/share/{token}")
async def get_shared_summary(token: str):
    """Public endpoint for tokenized, non-PHI discharge summary access."""
    payload = await get_share_payload_by_token(token)
    if not payload:
        raise HTTPException(status_code=404, detail="Share link not found or expired")
    return payload


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
# Lifecycle events
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 50)
    logger.info("SwasthaLink API Starting...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Frontend URL: {FRONTEND_URL}")
    logger.info("=" * 50)
    logger.info(f"Gemini API: {check_gemini_health().get('status')}")
    logger.info(f"Twilio API: {check_twilio_health().get('status')}")
    logger.info(f"Supabase:   {check_supabase_health().get('status')}")
    logger.info(f"AWS S3:     {check_s3_health().get('status')}")
    start_followup_scheduler()
    await restore_followup_jobs()
    logger.info("Follow-up scheduler started and pending jobs restored")
    logger.info("=" * 50)


@app.on_event("shutdown")
async def shutdown_event():
    stop_followup_scheduler()
    logger.info("SwasthaLink API shutting down...")


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
