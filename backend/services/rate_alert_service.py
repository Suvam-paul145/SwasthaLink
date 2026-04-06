"""
Rate Alert Service — tracks API usage against daily limits.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _as_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class RateAlertService:
    def __init__(self):
        self.enabled = _as_bool(os.getenv("RATE_ALERTS_ENABLED", "true"), True)
        self.threshold_percent = _as_int(os.getenv("RATE_ALERT_THRESHOLD_PERCENT", "80"), 80)
        self.limits = {
            "llm": _as_int(os.getenv("RATE_ALERT_LLM_DAILY_LIMIT", "1000"), 1000),
            "twilio": _as_int(os.getenv("RATE_ALERT_TWILIO_DAILY_LIMIT", "500"), 500),
            "supabase": _as_int(os.getenv("RATE_ALERT_SUPABASE_DAILY_LIMIT", "5000"), 5000),
            "s3": _as_int(os.getenv("RATE_ALERT_S3_DAILY_LIMIT", "1000"), 1000),
        }
        self.current_day = self._today_utc()
        self.usage_counts = {s: 0 for s in self.limits}
        self.alerted_today = set()

    @staticmethod
    def _today_utc():
        return datetime.now(timezone.utc).date().isoformat()

    def _reset_if_new_day(self):
        today = self._today_utc()
        if today != self.current_day:
            self.current_day = today
            self.usage_counts = {s: 0 for s in self.limits}
            self.alerted_today.clear()
            logger.info("RateAlertService counters reset for new UTC day")

    def track_usage(self, service, increment=1, context=""):
        if not self.enabled:
            return
        self._reset_if_new_day()
        if service not in self.limits:
            return
        limit = self.limits.get(service, 0)
        if limit <= 0:
            return
        self.usage_counts[service] += max(0, increment)
        used = self.usage_counts[service]
        pct = round((used / limit) * 100, 2)
        if pct >= self.threshold_percent and service not in self.alerted_today:
            title = f"[SwasthaLink] {service.upper()} usage at {pct}%"
            body = self._build_alert_body(service, used, limit, pct, context)
            self._send_alerts(title, body)
            self.alerted_today.add(service)
            logger.warning(f"Rate alert triggered for {service}: {used}/{limit} ({pct}%)")

    def _build_alert_body(self, service, used, limit, pct, context=""):
        remaining = max(limit - used, 0)
        return (
            "SwasthaLink proactive rate alert\n\n"
            f"Service: {service}\nUTC day: {self.current_day}\n"
            f"Used: {used}\nConfigured limit: {limit}\n"
            f"Usage: {pct}%\nRemaining: {remaining}\n"
            f"Threshold: {self.threshold_percent}%\n"
            f"Context: {context or 'N/A'}\n\n"
            "Action needed:\n1) Rotate/upgrade provider plan if needed\n"
            "2) Reduce request volume or cache responses\n"
            "3) Tune RATE_ALERT_*_DAILY_LIMIT values to real provider quotas\n"
        )

    def _send_alerts(self, title, body):
        logger.warning(f"Rate alert: {title}")

    def get_status(self) -> Dict[str, Any]:
        self._reset_if_new_day()
        status = {}
        for svc, limit in self.limits.items():
            used = self.usage_counts.get(svc, 0)
            pct = round((used / limit) * 100, 2) if limit > 0 else 0
            status[svc] = {"used": used, "limit": limit, "usage_percent": pct,
                           "threshold_percent": self.threshold_percent,
                           "alert_sent_today": svc in self.alerted_today}
        return {"enabled": self.enabled, "utc_day": self.current_day, "services": status}


rate_alert_service = RateAlertService()
