"""
Multi-Provider API Rate Limiter Service.

Tracks usage per-minute and per-day for Gemini, Groq, and other LLM APIs.
Proactively blocks requests *before* they hit the API quota to prevent
exhaustion of free tier limits.

PERSISTENT TRACKING:
  - Saves usage counters to disk so restarts don't lose state
  - Automatically marks provider as EXHAUSTED when 429 is received
  - Resets at UTC midnight (matches provider behavior)

Usage:
    from services.rate_limiter_service import gemini_rate_limiter, groq_rate_limiter
    gemini_rate_limiter.check_and_record()  # raises if over limit
    groq_rate_limiter.check_and_record()    # raises if over limit
    
    # If you catch a 429 from the API:
    gemini_rate_limiter.mark_exhausted()    # blocks until midnight
"""

import logging
import time
import os
import json
from pathlib import Path
from collections import deque
from threading import Lock
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# FREE TIER RATE LIMITS (Updated based on actual provider documentation)
# ══════════════════════════════════════════════════════════════════════════════
#
# GEMINI FREE TIER (Google AI Studio - as of 2024):
#   - Gemini 2.5 Flash: RPM=5, TPM=250,000, RPD=20
#   - Gemini 2.5 Pro:   NOT available in free tier (0/0)
#   - Gemini 2.0 Flash: RPM=15, TPM=1,000,000, RPD=1,500
#
# GROQ FREE TIER (as of 2024):
#   - Llama 3.3 70B:    RPM=30, TPM=6,000, RPD=14,400
#   - Llama 3.1 8B:     RPM=30, TPM=131,072, RPD=14,400
#   - Mixtral 8x7B:     RPM=30, TPM=5,000, RPD=14,400
#   - Gemma2 9B:        RPM=30, TPM=15,000, RPD=14,400
#
# IMPORTANT: These limits reset at UTC midnight.
# We block at 90% to leave buffer and prevent exhaustion.
# ══════════════════════════════════════════════════════════════════════════════

GEMINI_RATE_LIMITS = {
    "requests_per_minute": int(os.getenv("GEMINI_RPM_LIMIT", "5")),      # Gemini 2.5 Flash free tier
    "requests_per_day": int(os.getenv("GEMINI_RPD_LIMIT", "20")),        # Gemini 2.5 Flash free tier
    "tokens_per_minute": int(os.getenv("GEMINI_TPM_LIMIT", "250000")),   # 250K TPM
    "warning_threshold": 0.75,   # alert at 75%
    "block_threshold": 0.90,     # block at 90% (leaves 2 requests buffer for RPD=20)
}

GROQ_RATE_LIMITS = {
    "requests_per_minute": int(os.getenv("GROQ_RPM_LIMIT", "30")),       # Groq free tier
    "requests_per_day": int(os.getenv("GROQ_RPD_LIMIT", "14400")),       # Groq free tier
    "tokens_per_minute": int(os.getenv("GROQ_TPM_LIMIT", "6000")),       # Llama 3.3 70B TPM
    "warning_threshold": 0.80,   # alert at 80%
    "block_threshold": 0.95,     # block at 95%
}

# Legacy alias for backward compatibility
RATE_LIMITS = GEMINI_RATE_LIMITS

_BANNER = """
╔═══════════════════════════════════════════════════════════════════════╗
║  {icon}  {provider} API RATE LIMIT {level:<8}                                 ║
║  Per-minute : {rpm_used:>4}/{rpm_limit:<4} requests ({rpm_pct:>3.0f}%)                        ║
║  Per-day    : {rpd_used:>5}/{rpd_limit:<5} requests ({rpd_pct:>3.0f}%)                       ║
║  Remaining  : {remaining:>5} requests until limit                             ║
║  Resets at  : {reset_time:<20}                                     ║
║  ACTION     : {action:<55}║
╚═══════════════════════════════════════════════════════════════════════╝
"""


class RateLimitExceeded(Exception):
    """Raised when an API rate limit is about to be breached."""
    
    def __init__(self, message: str, provider: str = "unknown", remaining: int = 0):
        super().__init__(message)
        self.provider = provider
        self.remaining = remaining


class APIRateLimiter:
    """
    Sliding-window rate limiter with console alerts and PERSISTENT tracking.
    
    Works with any LLM provider by accepting configuration at init.
    Uses UTC midnight reset for daily limits to match most provider behavior.
    
    Persistence:
      - Saves daily usage to disk so it survives restarts
      - Tracks "exhausted" state when 429 is received from API
      - Automatically resets at UTC midnight
    """

    # Directory to store persistence files
    PERSIST_DIR = Path(os.getenv("RATE_LIMIT_PERSIST_DIR", ".rate_limits"))

    def __init__(self, provider_name: str, config: dict):
        self.provider_name = provider_name
        self.rpm_limit = config.get("requests_per_minute", 15)
        self.rpd_limit = config.get("requests_per_day", 1500)
        self.tpm_limit = config.get("tokens_per_minute", 250000)
        self.warn_pct = config.get("warning_threshold", 0.75)
        self.block_pct = config.get("block_threshold", 0.90)

        # Sliding windows
        self._minute_window: deque = deque()   # timestamps within last 60 s
        self._day_window: deque = deque()       # requests for current UTC day
        self._tokens_minute: int = 0            # token count for current minute
        self._lock = Lock()

        # Track current UTC day for daily reset
        self._current_utc_day: str = self._get_utc_day()

        # Track if we already printed a warning for current window
        self._last_warn_minute: float = 0.0
        
        # Track if provider is exhausted (received 429 from API)
        self._is_exhausted: bool = False
        self._exhausted_until: str = ""  # UTC date string
        
        # Load persisted state
        self._load_persisted_state()

    # ── helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _get_utc_day() -> str:
        """Get current UTC date string."""
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    @staticmethod
    def _get_utc_midnight_reset() -> str:
        """Get next UTC midnight as a string."""
        now = datetime.now(timezone.utc)
        return f"{now.strftime('%Y-%m-%d')} 24:00 UTC"

    def _reset_if_new_day(self) -> None:
        """Reset daily counters if we've crossed UTC midnight."""
        today = self._get_utc_day()
        if today != self._current_utc_day:
            self._day_window.clear()
            self._current_utc_day = today
            self._is_exhausted = False  # Reset exhausted flag at midnight
            self._exhausted_until = ""
            self._save_persisted_state()  # Save the reset state
            logger.info(f"{self.provider_name} rate limiter: Daily counters reset for new UTC day")

    # ── persistence ────────────────────────────────────────────────────────────

    def _get_persist_path(self) -> Path:
        """Get path to persistence file for this provider."""
        self.PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        return self.PERSIST_DIR / f"{self.provider_name.lower()}_usage.json"

    def _load_persisted_state(self) -> None:
        """Load usage state from disk if it exists and is for today."""
        try:
            path = self._get_persist_path()
            if not path.exists():
                return
            
            with open(path, 'r') as f:
                data = json.load(f)
            
            saved_day = data.get("date", "")
            today = self._get_utc_day()
            
            if saved_day == today:
                # Same day - restore state
                self._is_exhausted = data.get("is_exhausted", False)
                self._exhausted_until = data.get("exhausted_until", "")
                saved_count = data.get("daily_count", 0)
                
                # Rebuild day_window with placeholder timestamps
                self._day_window = deque([time.time()] * saved_count)
                
                if self._is_exhausted:
                    logger.warning(
                        f"{self.provider_name} rate limiter: Loaded EXHAUSTED state from disk "
                        f"(used {saved_count}/{self.rpd_limit} today). Blocked until midnight UTC."
                    )
                else:
                    logger.info(
                        f"{self.provider_name} rate limiter: Restored {saved_count} requests from disk"
                    )
            else:
                # New day - clear the file
                path.unlink(missing_ok=True)
                logger.info(f"{self.provider_name} rate limiter: New day, cleared old state")
                
        except Exception as e:
            logger.warning(f"{self.provider_name} rate limiter: Failed to load state: {e}")

    def _save_persisted_state(self) -> None:
        """Save current usage state to disk."""
        try:
            path = self._get_persist_path()
            data = {
                "provider": self.provider_name,
                "date": self._current_utc_day,
                "daily_count": len(self._day_window),
                "daily_limit": self.rpd_limit,
                "is_exhausted": self._is_exhausted,
                "exhausted_until": self._exhausted_until,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"{self.provider_name} rate limiter: Failed to save state: {e}")

    def mark_exhausted(self) -> None:
        """
        Mark this provider as EXHAUSTED (received 429 from API).
        
        Call this when you catch a 429 RESOURCE_EXHAUSTED error from the API.
        The provider will be blocked until UTC midnight.
        """
        with self._lock:
            self._is_exhausted = True
            self._exhausted_until = self._get_utc_day()
            # Fill up the day window to reflect exhaustion
            self._day_window = deque([time.time()] * self.rpd_limit)
            self._save_persisted_state()
            
            logger.critical(
                f"\n{'='*70}\n"
                f"  {self.provider_name.upper()} API EXHAUSTED (429 received from API)\n"
                f"  All requests will be BLOCKED until UTC midnight.\n"
                f"  Resets at: {self._get_utc_midnight_reset()}\n"
                f"{'='*70}\n"
            )

    def is_exhausted(self) -> bool:
        """Check if this provider is currently exhausted."""
        with self._lock:
            self._reset_if_new_day()
            return self._is_exhausted

    def _prune_minute_window(self, now: float) -> None:
        """Remove timestamps older than 60 seconds."""
        while self._minute_window and now - self._minute_window[0] > 60.0:
            self._minute_window.popleft()

    def _print_banner(self, level: str, icon: str, action: str,
                      rpm_used: int, rpd_used: int) -> None:
        remaining = max(self.rpd_limit - rpd_used, 0)
        banner = _BANNER.format(
            icon=icon, level=level, provider=self.provider_name.upper(),
            rpm_used=rpm_used, rpm_limit=self.rpm_limit,
            rpm_pct=(rpm_used / self.rpm_limit * 100) if self.rpm_limit else 0,
            rpd_used=rpd_used, rpd_limit=self.rpd_limit,
            rpd_pct=(rpd_used / self.rpd_limit * 100) if self.rpd_limit else 0,
            remaining=remaining,
            reset_time=self._get_utc_midnight_reset(),
            action=action,
        )
        if level == "BLOCKED":
            logger.critical(banner)
        else:
            logger.warning(banner)
        print(banner, flush=True)

    # ── public ─────────────────────────────────────────────────────────────────

    def can_make_request(self) -> bool:
        """
        Check if a request can be made without exceeding limits.
        Does NOT record the request - use for pre-flight checks.
        
        Returns False if:
          - Provider is marked as exhausted (received 429 from API)
          - Usage is at or above block threshold
        """
        now = time.time()
        with self._lock:
            self._reset_if_new_day()
            
            # Check if exhausted first
            if self._is_exhausted:
                return False
            
            self._prune_minute_window(now)

            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)

            rpm_pct = rpm_used / self.rpm_limit if self.rpm_limit else 0
            rpd_pct = rpd_used / self.rpd_limit if self.rpd_limit else 0

            return rpm_pct < self.block_pct and rpd_pct < self.block_pct

    def get_remaining_requests(self) -> dict:
        """Get remaining requests for current windows."""
        now = time.time()
        with self._lock:
            self._reset_if_new_day()
            self._prune_minute_window(now)

            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)

            return {
                "rpm_remaining": max(self.rpm_limit - rpm_used, 0),
                "rpd_remaining": max(self.rpd_limit - rpd_used, 0),
                "rpm_until_block": max(int(self.rpm_limit * self.block_pct) - rpm_used, 0),
                "rpd_until_block": max(int(self.rpd_limit * self.block_pct) - rpd_used, 0),
            }

    def check_and_record(self, context: str = "", tokens_used: int = 0) -> None:
        """
        Call before every API request.

        - Records the request timestamp.
        - Prints WARNING at warning threshold.
        - Raises ``RateLimitExceeded`` at block threshold.
        - Saves state to disk for persistence across restarts.
        
        Args:
            context: Description of the API call for logging
            tokens_used: Optional token count for TPM tracking
        """
        now = time.time()

        with self._lock:
            self._reset_if_new_day()
            
            # Check if exhausted first
            if self._is_exhausted:
                raise RateLimitExceeded(
                    f"{self.provider_name} API is EXHAUSTED (received 429 from API). "
                    f"Blocked until {self._get_utc_midnight_reset()}.",
                    provider=self.provider_name,
                    remaining=0,
                )
            
            self._prune_minute_window(now)

            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)

            rpm_pct = rpm_used / self.rpm_limit if self.rpm_limit else 0
            rpd_pct = rpd_used / self.rpd_limit if self.rpd_limit else 0

            remaining = max(self.rpd_limit - rpd_used, 0)

            # ── BLOCK ──────────────────────────────────────────────────────
            if rpm_pct >= self.block_pct or rpd_pct >= self.block_pct:
                limit_type = "RPM" if rpm_pct >= self.block_pct else "RPD"
                self._print_banner(
                    "BLOCKED", "X",
                    f"SWITCH TO FALLBACK PROVIDER OR WAIT! ({limit_type} exhausted)",
                    rpm_used, rpd_used,
                )
                raise RateLimitExceeded(
                    f"{self.provider_name} API rate limit reached "
                    f"(RPM {rpm_used}/{self.rpm_limit}, RPD {rpd_used}/{self.rpd_limit}). "
                    f"Only {remaining} requests remaining before hard limit. "
                    f"Use fallback provider or wait until {self._get_utc_midnight_reset()}.",
                    provider=self.provider_name,
                    remaining=remaining,
                )

            # ── WARN ───────────────────────────────────────────────────────
            if rpm_pct >= self.warn_pct or rpd_pct >= self.warn_pct:
                # Throttle warning output to once per 15 s
                if now - self._last_warn_minute > 15.0:
                    self._print_banner(
                        "WARNING", "!",
                        f"Only {remaining} requests left. Consider using fallback.",
                        rpm_used, rpd_used,
                    )
                    self._last_warn_minute = now

            # ── RECORD ─────────────────────────────────────────────────────
            self._minute_window.append(now)
            self._day_window.append(now)
            self._tokens_minute += tokens_used
            
            # Save to disk for persistence
            self._save_persisted_state()

            if context:
                logger.debug(
                    f"{self.provider_name} call recorded ({context}): "
                    f"RPM={rpm_used+1}/{self.rpm_limit}, RPD={rpd_used+1}/{self.rpd_limit}"
                )

    def get_usage(self) -> dict:
        """Return current usage snapshot (for health endpoints)."""
        now = time.time()
        with self._lock:
            self._reset_if_new_day()
            self._prune_minute_window(now)

            rpm_used = len(self._minute_window)
            rpd_used = len(self._day_window)
            is_exhausted = self._is_exhausted

        return {
            "provider": self.provider_name,
            "requests_per_minute": {"used": rpm_used, "limit": self.rpm_limit},
            "requests_per_day": {"used": rpd_used, "limit": self.rpd_limit},
            "rpm_pct": round(rpm_used / self.rpm_limit * 100, 1) if self.rpm_limit else 0,
            "rpd_pct": round(rpd_used / self.rpd_limit * 100, 1) if self.rpd_limit else 0,
            "remaining_today": max(self.rpd_limit - rpd_used, 0),
            "is_exhausted": is_exhausted,
            "can_make_request": (not is_exhausted and 
                                 rpm_used / self.rpm_limit < self.block_pct and 
                                 rpd_used / self.rpd_limit < self.block_pct),
            "reset_at_utc": self._get_utc_midnight_reset(),
        }


# Legacy class name alias for backward compatibility
GeminiRateLimiter = APIRateLimiter


# ══════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCES FOR EACH PROVIDER
# ══════════════════════════════════════════════════════════════════════════════

gemini_rate_limiter = APIRateLimiter("Gemini", GEMINI_RATE_LIMITS)
groq_rate_limiter = APIRateLimiter("Groq", GROQ_RATE_LIMITS)


# ══════════════════════════════════════════════════════════════════════════════
# MULTI-PROVIDER FALLBACK MANAGER
# ══════════════════════════════════════════════════════════════════════════════

class MultiProviderRateLimiter:
    """
    Manages multiple LLM providers with automatic fallback.
    
    Usage:
        provider = multi_provider_limiter.get_available_provider()
        if provider == "gemini":
            # use gemini
        elif provider == "groq":
            # use groq
        else:
            raise Exception("All providers exhausted!")
    """

    def __init__(self):
        self.providers = {
            "gemini": gemini_rate_limiter,
            "groq": groq_rate_limiter,
        }
        # Priority order - primary to fallback
        self.priority = ["gemini", "groq"]

    def get_available_provider(self) -> str | None:
        """
        Returns the first provider that can accept a request.
        Returns None if all providers are exhausted.
        """
        for provider_name in self.priority:
            limiter = self.providers.get(provider_name)
            if limiter and limiter.can_make_request():
                return provider_name
        return None

    def get_status(self) -> dict:
        """Get status of all providers."""
        return {
            name: limiter.get_usage()
            for name, limiter in self.providers.items()
        }

    def check_and_record(self, provider: str, context: str = "", tokens_used: int = 0) -> None:
        """Record a request for a specific provider."""
        limiter = self.providers.get(provider)
        if limiter:
            limiter.check_and_record(context=context, tokens_used=tokens_used)


multi_provider_limiter = MultiProviderRateLimiter()
