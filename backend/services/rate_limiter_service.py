"""
LLM API Rate Limiter Service.

Tracks usage per-minute and per-day.  Proactively blocks requests
*before* they hit the API and prints clear console alerts telling the
developer to rotate their API key.

Supports:
- Runtime configuration via environment variables
- Projected-usage checks (blocks before the next request would cross threshold)
- Automatic counter reset when the active API key changes

Usage:
    from services.rate_limiter_service import llm_rate_limiter
    llm_rate_limiter.check_and_record()  # raises if over limit
"""

import hashlib
import logging
import os
import time
from collections import deque
from threading import Lock
from typing import Optional

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────


def _as_positive_int(value: Optional[str], default: int) -> int:
    try:
        parsed = int(str(value).strip())
        return parsed if parsed > 0 else default
    except (TypeError, ValueError, AttributeError):
        return default


def _as_fraction(value: Optional[str], default: float) -> float:
    """
    Parse threshold value as fraction.

    Accepts:
    - Fraction values like 0.8 / 0.95
    - Percentage values like 80 / 95
    """
    try:
        raw = float(str(value).strip())
        if raw > 1:
            raw = raw / 100.0
        # Keep thresholds sane to prevent accidental hard-locking
        return min(max(raw, 0.01), 0.999)
    except (TypeError, ValueError, AttributeError):
        return default


_default_warning_threshold = _as_fraction(
    os.getenv("LLM_RATE_WARNING_THRESHOLD", os.getenv("RATE_ALERT_THRESHOLD_PERCENT", "80")),
    0.80,
)
_default_block_threshold = _as_fraction(
    os.getenv("LLM_RATE_BLOCK_THRESHOLD", "95"),
    0.95,
)

# Ensure block threshold is always above warning threshold
if _default_block_threshold <= _default_warning_threshold:
    _default_block_threshold = min(0.999, _default_warning_threshold + 0.05)

RATE_LIMITS = {
    "requests_per_minute": _as_positive_int(os.getenv("LLM_RPM_LIMIT"), 15),
    "requests_per_day": _as_positive_int(os.getenv("LLM_RPD_LIMIT"), 1500),
    "warning_threshold": _default_warning_threshold,  # alert at threshold
    "block_threshold": _default_block_threshold,      # block at threshold
}

_BANNER = """
╔══════════════════════════════════════════════════════════════════╗
║  {icon}  LLM API RATE LIMIT {level:<8}                         ║
║  Per-minute : {rpm_used:>4}/{rpm_limit:<4} requests ({rpm_pct:>3.0f}%)                   ║
║  Per-day    : {rpd_used:>5}/{rpd_limit:<5} requests ({rpd_pct:>3.0f}%)                  ║
║  ACTION     : {action:<50}║
╚══════════════════════════════════════════════════════════════════╝
"""


class RateLimitExceeded(Exception):
    """Raised when the LLM API rate limit is about to be breached."""


class LLMRateLimiter:
    """Sliding-window rate limiter with console alerts."""

    def __init__(self, config: dict | None = None):
        cfg = config or RATE_LIMITS
        self.rpm_limit = cfg["requests_per_minute"]
        self.rpd_limit = cfg["requests_per_day"]
        self.warn_pct = cfg["warning_threshold"]
        self.block_pct = cfg["block_threshold"]

        # Sliding windows
        self._minute_window: deque = deque()   # timestamps within last 60 s
        self._day_window: deque = deque()       # timestamps within last 86 400 s
        self._lock = Lock()

        # Track if we already printed a warning for current window
        self._last_warn_minute: float = 0.0
        self._last_warn_day: float = 0.0

        # Track active key fingerprint to detect runtime key rotation
        self._active_key_fingerprint: Optional[str] = None

    # ── helpers ────────────────────────────────────────────────────────────────

    def _prune(self, now: float) -> None:
        while self._minute_window and now - self._minute_window[0] > 60.0:
            self._minute_window.popleft()
        while self._day_window and now - self._day_window[0] > 86_400.0:
            self._day_window.popleft()

    def _print_banner(self, level: str, icon: str, action: str,
                      rpm_used: int, rpd_used: int) -> None:
        banner = _BANNER.format(
            icon=icon, level=level,
            rpm_used=rpm_used, rpm_limit=self.rpm_limit,
            rpm_pct=(rpm_used / self.rpm_limit * 100) if self.rpm_limit else 0,
            rpd_used=rpd_used, rpd_limit=self.rpd_limit,
            rpd_pct=(rpd_used / self.rpd_limit * 100) if self.rpd_limit else 0,
            action=action,
        )
        if level == "BLOCKED":
            logger.critical(banner)
        else:
            logger.warning(banner)
        print(banner, flush=True)

    @staticmethod
    def _fingerprint_key(api_key: str) -> str:
        return hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:12]

    def _reset_windows_for_new_key(self, key_fingerprint: str) -> None:
        if self._active_key_fingerprint == key_fingerprint:
            return

        if self._active_key_fingerprint is not None:
            logger.warning(
                "LLM API key rotation detected (%s -> %s). Resetting in-memory RPM/RPD counters.",
                self._active_key_fingerprint,
                key_fingerprint,
            )

        self._active_key_fingerprint = key_fingerprint
        self._minute_window.clear()
        self._day_window.clear()
        self._last_warn_minute = 0.0
        self._last_warn_day = 0.0

    # ── public ─────────────────────────────────────────────────────────────────

    def check_and_record(self, context: str = "", api_key: Optional[str] = None) -> None:
        """
        Call before every LLM API request.

        - Records the request timestamp.
        - Prints WARNING at configured warning threshold.
        - Raises ``RateLimitExceeded`` at configured block threshold.
        - Uses projected usage (current + 1) to block before crossing limits.
        - If a new API key is detected, counters are reset for the new key.
        """
        now = time.time()

        with self._lock:
            if api_key:
                key_fp = self._fingerprint_key(api_key)
                self._reset_windows_for_new_key(key_fp)

            self._prune(now)

            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)

            projected_rpm_used = rpm_used + 1
            projected_rpd_used = rpd_used + 1

            projected_rpm_pct = projected_rpm_used / self.rpm_limit if self.rpm_limit else 0
            projected_rpd_pct = projected_rpd_used / self.rpd_limit if self.rpd_limit else 0

            # ── BLOCK ──────────────────────────────────────────────────────
            if projected_rpm_pct >= self.block_pct or projected_rpd_pct >= self.block_pct:
                self._print_banner(
                    "BLOCKED", "🚫",
                    "CHANGE YOUR LLM API KEY NOW!",
                    rpm_used, rpd_used,
                )
                raise RateLimitExceeded(
                    "LLM request blocked to avoid provider quota breach. "
                    f"Context='{context or 'n/a'}'. "
                    f"Current usage: RPM {rpm_used}/{self.rpm_limit}, RPD {rpd_used}/{self.rpd_limit}. "
                    f"Projected next call: RPM {projected_rpm_used}/{self.rpm_limit}, "
                    f"RPD {projected_rpd_used}/{self.rpd_limit}. "
                    "Rotate/replace API key and retry."
                )

            # ── WARN ───────────────────────────────────────────────────────
            if projected_rpm_pct >= self.warn_pct or projected_rpd_pct >= self.warn_pct:
                # Throttle warning output to once per 15 s
                if now - self._last_warn_minute > 15.0:
                    self._print_banner(
                        "WARNING", "⚠️",
                        f"Prepare to rotate API key soon. Context: {context or 'n/a'}",
                        rpm_used, rpd_used,
                    )
                    self._last_warn_minute = now

            # ── RECORD ─────────────────────────────────────────────────────
            self._minute_window.append(now)
            self._day_window.append(now)

            if context:
                logger.debug(f"LLM call recorded ({context}): RPM={rpm_used+1}, RPD={rpd_used+1}")

    def get_usage(self) -> dict:
        """Return current usage snapshot (for health endpoints)."""
        now = time.time()
        with self._lock:
            self._prune(now)
            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)
            projected_rpm_used = rpm_used + 1
            projected_rpd_used = rpd_used + 1
            projected_rpm_pct = (projected_rpm_used / self.rpm_limit * 100) if self.rpm_limit else 0
            projected_rpd_pct = (projected_rpd_used / self.rpd_limit * 100) if self.rpd_limit else 0
        return {
            "requests_per_minute": {"used": rpm_used, "limit": self.rpm_limit},
            "requests_per_day": {"used": rpd_used, "limit": self.rpd_limit},
            "remaining": {
                "requests_per_minute": max(self.rpm_limit - rpm_used, 0),
                "requests_per_day": max(self.rpd_limit - rpd_used, 0),
            },
            "rpm_pct": round(rpm_used / self.rpm_limit * 100, 1) if self.rpm_limit else 0,
            "rpd_pct": round(rpd_used / self.rpd_limit * 100, 1) if self.rpd_limit else 0,
            "projected_next_request_pct": {
                "rpm": round(projected_rpm_pct, 1),
                "rpd": round(projected_rpd_pct, 1),
            },
            "warning_threshold_pct": round(self.warn_pct * 100, 1),
            "block_threshold_pct": round(self.block_pct * 100, 1),
            "will_block_next_request": (
                (projected_rpm_used / self.rpm_limit if self.rpm_limit else 0) >= self.block_pct
                or (projected_rpd_used / self.rpd_limit if self.rpd_limit else 0) >= self.block_pct
            ),
            "active_key_fingerprint": self._active_key_fingerprint,
        }

    def reset(self) -> None:
        """Reset in-memory counters (mainly for tests)."""
        with self._lock:
            self._minute_window.clear()
            self._day_window.clear()
            self._last_warn_minute = 0.0
            self._last_warn_day = 0.0
            self._active_key_fingerprint = None


# ── Singleton ──────────────────────────────────────────────────────────────────

llm_rate_limiter = LLMRateLimiter()
