"""
Gemini API Rate Limiter Service.

Tracks usage per-minute and per-day.  Proactively blocks requests
*before* they hit the API and prints clear console alerts telling the
developer to rotate their API key.

Usage:
    from services.rate_limiter_service import gemini_rate_limiter
    gemini_rate_limiter.check_and_record()  # raises if over limit
"""

import logging
import time
from collections import deque
from threading import Lock

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────

RATE_LIMITS = {
    "requests_per_minute": 15,
    "requests_per_day": 1500,
    "warning_threshold": 0.80,   # alert at 80 %
    "block_threshold": 0.95,     # block at 95 %
}

_BANNER = """
╔══════════════════════════════════════════════════════════════════╗
║  {icon}  GEMINI API RATE LIMIT {level:<8}                         ║
║  Per-minute : {rpm_used:>4}/{rpm_limit:<4} requests ({rpm_pct:>3.0f}%)                   ║
║  Per-day    : {rpd_used:>5}/{rpd_limit:<5} requests ({rpd_pct:>3.0f}%)                  ║
║  ACTION     : {action:<50}║
╚══════════════════════════════════════════════════════════════════╝
"""


class RateLimitExceeded(Exception):
    """Raised when the Gemini API rate limit is about to be breached."""


class GeminiRateLimiter:
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

    # ── public ─────────────────────────────────────────────────────────────────

    def check_and_record(self, context: str = "") -> None:
        """
        Call before every Gemini API request.

        - Records the request timestamp.
        - Prints WARNING at 80 % capacity.
        - Raises ``RateLimitExceeded`` at 95 % capacity.
        """
        now = time.time()

        with self._lock:
            self._prune(now)

            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)

            rpm_pct = rpm_used / self.rpm_limit if self.rpm_limit else 0
            rpd_pct = rpd_used / self.rpd_limit if self.rpd_limit else 0

            # ── BLOCK ──────────────────────────────────────────────────────
            if rpm_pct >= self.block_pct or rpd_pct >= self.block_pct:
                self._print_banner(
                    "BLOCKED", "🚫",
                    "CHANGE YOUR GEMINI API KEY NOW!",
                    rpm_used, rpd_used,
                )
                raise RateLimitExceeded(
                    f"Gemini API rate limit reached "
                    f"(RPM {rpm_used}/{self.rpm_limit}, RPD {rpd_used}/{self.rpd_limit}). "
                    f"Rotate your API key."
                )

            # ── WARN ───────────────────────────────────────────────────────
            if rpm_pct >= self.warn_pct or rpd_pct >= self.warn_pct:
                # Throttle warning output to once per 15 s
                if now - self._last_warn_minute > 15.0:
                    self._print_banner(
                        "WARNING", "⚠️",
                        "Prepare to rotate API key if usage continues.",
                        rpm_used, rpd_used,
                    )
                    self._last_warn_minute = now

            # ── RECORD ─────────────────────────────────────────────────────
            self._minute_window.append(now)
            self._day_window.append(now)

            if context:
                logger.debug(f"Gemini call recorded ({context}): RPM={rpm_used+1}, RPD={rpd_used+1}")

    def get_usage(self) -> dict:
        """Return current usage snapshot (for health endpoints)."""
        now = time.time()
        with self._lock:
            self._prune(now)
            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)
        return {
            "requests_per_minute": {"used": rpm_used, "limit": self.rpm_limit},
            "requests_per_day": {"used": rpd_used, "limit": self.rpd_limit},
            "rpm_pct": round(rpm_used / self.rpm_limit * 100, 1) if self.rpm_limit else 0,
            "rpd_pct": round(rpd_used / self.rpd_limit * 100, 1) if self.rpd_limit else 0,
        }


# ── Singleton ──────────────────────────────────────────────────────────────────

gemini_rate_limiter = GeminiRateLimiter()
