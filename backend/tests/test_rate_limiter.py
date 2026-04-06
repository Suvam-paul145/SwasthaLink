import pytest

from services.rate_limiter_service import LLMRateLimiter, RateLimitExceeded


def test_blocks_before_hitting_limit_threshold():
    limiter = LLMRateLimiter(
        {
            "requests_per_minute": 5,
            "requests_per_day": 100,
            "warning_threshold": 0.80,
            "block_threshold": 0.95,
        }
    )

    for _ in range(4):
        limiter.check_and_record(context="/api/process", api_key="key-alpha")

    with pytest.raises(RateLimitExceeded) as exc:
        limiter.check_and_record(context="/api/process", api_key="key-alpha")

    assert "Context='/api/process'" in str(exc.value)

    usage = limiter.get_usage()
    assert usage["requests_per_minute"]["used"] == 4
    assert usage["will_block_next_request"] is True


def test_key_rotation_resets_in_memory_counters():
    limiter = LLMRateLimiter(
        {
            "requests_per_minute": 10,
            "requests_per_day": 100,
            "warning_threshold": 0.80,
            "block_threshold": 0.95,
        }
    )

    limiter.check_and_record(context="text_generation", api_key="key-alpha")
    limiter.check_and_record(context="text_generation", api_key="key-alpha")
    usage_before = limiter.get_usage()

    assert usage_before["requests_per_minute"]["used"] == 2
    first_fp = usage_before["active_key_fingerprint"]

    limiter.check_and_record(context="text_generation", api_key="key-beta")
    usage_after = limiter.get_usage()

    assert usage_after["requests_per_minute"]["used"] == 1
    assert usage_after["active_key_fingerprint"] is not None
    assert usage_after["active_key_fingerprint"] != first_fp
