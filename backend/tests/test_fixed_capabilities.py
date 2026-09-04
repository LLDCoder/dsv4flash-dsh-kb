import asyncio
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.platform import PlatformGatewayClient
from app.reader_limits import (
    MAX_PLATFORM_TIMEOUT_SECONDS,
    PORTAL_EXECUTION_TIMEOUT_SECONDS,
    READER_TOTAL_TIMEOUT_SECONDS,
    effective_platform_timeout,
)
from app.service import DSHService
from app.skills import DEFAULT_SKILL_DEFINITIONS
from app.tool_gateway import SYSTEM_DEFAULT_TOOL_NAMES


def test_only_generic_runtime_skills_remain() -> None:
    by_id = {item["skill_id"]: item for item in DEFAULT_SKILL_DEFINITIONS}

    assert set(by_id) == {"admin_portal_reader", "general_knowledge"}
    assert by_id["admin_portal_reader"]["allowed_tools"] == ["knowledge.search", "admin.portal.read"]
    assert by_id["general_knowledge"]["allowed_tools"] == ["knowledge.search"]


def test_only_fixed_read_only_tools_are_executable() -> None:
    assert SYSTEM_DEFAULT_TOOL_NAMES == {"knowledge.search", "admin.portal.read"}


def test_reader_response_prompt_forbids_claiming_bounded_rows_are_complete() -> None:
    prompt = DSHService._runtime_system_prompt("admin_portal_reader", "en", "", "")

    assert "bounded extract" in prompt
    assert "never say they are all current records" in prompt


def test_reader_timeout_defaults_cover_two_stage_planning_and_portal_executor() -> None:
    settings = Settings(_env_file=None, platform_timeout_seconds=1)
    platform = PlatformGatewayClient(settings)

    assert settings.reader_total_timeout_seconds == READER_TOTAL_TIMEOUT_SECONDS == 90
    assert platform.timeout > PORTAL_EXECUTION_TIMEOUT_SECONDS == 45


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("reader_total_timeout_seconds", float("nan")),
        ("reader_total_timeout_seconds", float("inf")),
        ("reader_total_timeout_seconds", 181),
        ("platform_timeout_seconds", float("nan")),
        ("platform_timeout_seconds", float("inf")),
        ("platform_timeout_seconds", 181),
    ],
)
def test_reader_timeout_settings_reject_non_finite_and_unbounded_values(field, value) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{field: value})


def test_effective_platform_timeout_has_a_fixed_upper_bound() -> None:
    assert effective_platform_timeout(1_000_000) == MAX_PLATFORM_TIMEOUT_SECONDS
    with pytest.raises(ValueError):
        effective_platform_timeout(float("inf"))


def test_hot_config_ignores_invalid_reader_timeouts() -> None:
    settings = Settings(_env_file=None)
    service = object.__new__(DSHService)
    service.settings = settings
    service.console_password = "test"
    service.llm = SimpleNamespace(settings=settings)
    service.tool_gateway = SimpleNamespace(
        knowledge=SimpleNamespace(base_url="", timeout=0, retry_attempts=0),
        platform=SimpleNamespace(base_url="", timeout=0, user_info_url="", portal_base_url=""),
    )
    entries = [
        SimpleNamespace(key="reader_total_timeout_seconds", value={"value": "inf"}),
        SimpleNamespace(key="platform_timeout_seconds", value={"value": "1000000"}),
    ]

    asyncio.run(service.apply_config_entries(entries))

    assert service.settings.reader_total_timeout_seconds == READER_TOTAL_TIMEOUT_SECONDS
    assert service.settings.platform_timeout_seconds == 50
    assert service.tool_gateway.platform.timeout == 50
