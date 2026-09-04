"""Shared timeout limits for the bounded Admin Portal Reader."""

import math


PORTAL_EXECUTION_TIMEOUT_SECONDS = 45.0
PLATFORM_CLIENT_GRACE_SECONDS = 5.0
READER_TOTAL_TIMEOUT_SECONDS = 90.0
MIN_READER_TOTAL_TIMEOUT_SECONDS = 10.0
MAX_READER_TOTAL_TIMEOUT_SECONDS = 180.0
MIN_PLATFORM_TIMEOUT_SECONDS = 1.0
MAX_PLATFORM_TIMEOUT_SECONDS = 180.0


def bounded_reader_total_timeout(configured_seconds: float) -> float:
    value = float(configured_seconds)
    if not math.isfinite(value):
        raise ValueError("reader total timeout must be finite")
    return min(max(value, MIN_READER_TOTAL_TIMEOUT_SECONDS), MAX_READER_TOTAL_TIMEOUT_SECONDS)


def effective_platform_timeout(configured_seconds: float) -> float:
    """Keep the HTTP client alive longer than the browser executor's cap."""

    value = float(configured_seconds)
    if not math.isfinite(value):
        raise ValueError("platform timeout must be finite")
    return min(
        max(value, PORTAL_EXECUTION_TIMEOUT_SECONDS + PLATFORM_CLIENT_GRACE_SECONDS),
        MAX_PLATFORM_TIMEOUT_SECONDS,
    )
