"""
Doctor-specific activity and summary routes.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any

from db.supabase_service import supabase_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/doctor", tags=["doctor"])

@router.get("/daily-summary")
async def get_daily_summary(doctor_id: str = Query(..., description="The ID of the doctor")):
    """
    Fetch all prescriptions and discharge summaries processed by a doctor in the last 24 hours.
    Used for CSV export and activity tracking.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        # Start of "today" in UTC
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        # 1. Fetch prescriptions
        presc_result = (
            supabase_client.table("prescriptions")
            .select("patient_id, patient_name, diagnosis, status, created_at, report_type")
            .eq("doctor_id", doctor_id)
            .gte("created_at", today_start)
            .execute()
        )
        prescriptions = presc_result.data or []

        # 2. Fetch discharge summaries
        # Note: discharge_results table might use 'created_at' too.
        disc_result = (
            supabase_client.table("discharge_results")
            .select("patient_id, risk_level, created_at")
            .eq("doctor_id", doctor_id)
            .gte("created_at", today_start)
            .execute()
        )
        discharges = disc_result.data or []

        # Merge and normalize
        summary = []
        for p in prescriptions:
            summary.append({
                "type": p.get("report_type", "prescription"),
                "pid": p.get("patient_id"),
                "name": p.get("patient_name", "N/A"),
                "diagnosis": p.get("diagnosis", "N/A"),
                "status": p.get("status", "completed"),
                "timestamp": p.get("created_at")
            })
        
        for d in discharges:
            summary.append({
                "type": "discharge_summary",
                "pid": d.get("patient_id"),
                "name": "N/A",  # Discharge results might not store name directly in that table
                "diagnosis": f"Risk: {d.get('risk_level', 'N/A')}",
                "status": "completed",
                "timestamp": d.get("created_at")
            })

        # Sort by timestamp descending
        summary.sort(key=lambda x: x["timestamp"] or "", reverse=True)

        return {
            "doctor_id": doctor_id,
            "date": today_start[:10],
            "count": len(summary),
            "items": summary
        }

    except Exception as e:
        logger.error(f"Error fetching daily summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
