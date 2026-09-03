from app.skills import DEFAULT_SKILL_DEFINITIONS
from app.tool_gateway import SYSTEM_DEFAULT_TOOL_NAMES


def test_only_generic_runtime_skills_remain() -> None:
    by_id = {item["skill_id"]: item for item in DEFAULT_SKILL_DEFINITIONS}

    assert set(by_id) == {"admin_portal_reader", "general_knowledge"}
    assert by_id["admin_portal_reader"]["allowed_tools"] == ["knowledge.search", "admin.portal.read"]
    assert by_id["general_knowledge"]["allowed_tools"] == ["knowledge.search"]


def test_only_fixed_read_only_tools_are_executable() -> None:
    assert SYSTEM_DEFAULT_TOOL_NAMES == {"knowledge.search", "admin.portal.read"}
