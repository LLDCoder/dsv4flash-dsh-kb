import asyncio
import json

import pytest

from app.portal_reader import (
    ALLOWED_READER_ACTIONS,
    READER_STATUSES,
    AdminPortalReader,
    PortalReadRequest,
    ReadOnlyPortalPolicy,
    ReaderResult,
    UserPermissionContext,
    bounded_json,
    knowledge_search_query,
    knowledge_result_from_plan,
    permission_audit_summary,
    permission_context_from_user_info,
    permission_path_matches,
    portal_request_paths,
    portal_read_request_from_plan,
)
from app.principal import Principal


def user_info(*, roles=True, pages=True, user_id="admin-7") -> dict:
    return {
        "data": {
            "id": user_id,
            "rolesInfo": [{"roleName": "Licensing Manager", "departmentId": 14}] if roles else [],
            "listRoles": [{"nameEn": "Manager"}] if roles else [],
            "listSysPermission": [
                {
                    "frontendRoute": "/licensing",
                    "children": [
                        {"frontendRoute": "/licensing/tasks"},
                        {"frontendRoute": "/licensing/tasks/:id"},
                    ],
                    "buttonList": [{"permissionCode": "licensing.view_detail"}],
                }
            ] if pages else [],
            "dataScope": {"scope": "team"},
        }
    }


def principal(user_id="admin-7") -> Principal:
    return Principal(user_id=user_id, tenant_id="tenant", request_id="request", umc_token="token")


def portal_plan(actions=None) -> dict:
    return {
        "mode": "portal_read",
        "portalRequest": {
            "startPath": "/licensing",
            "actions": actions or [{"type": "query", "field": "Status"}],
            "expectedFields": ["Status"],
        },
    }


class Planner:
    def __init__(self, *plans: dict):
        self.plans = list(plans or (portal_plan(),))
        self.calls = []

    async def plan_admin_portal_read(self, question, permission_context, knowledge_context):
        self.calls.append((question, permission_context, knowledge_context))
        return self.plans.pop(0)


class Gateway:
    def __init__(self, *, info=None, portal_result=None, events=None):
        self.info = info if info is not None else {"ok": True, "result": user_info()}
        self.portal_result = portal_result if portal_result is not None else {
            "ok": True,
            "result": {"result": "success", "page": "Licensing", "facts": ["One relevant task"]},
        }
        self.events = events if events is not None else []
        self.calls = []

    async def get_user_info(self, current_principal):
        self.events.append("GetUserInfo")
        return self.info

    async def invoke(self, current_principal, tool_name, arguments, *, allowed_tools=None):
        self.events.append(tool_name)
        self.calls.append((tool_name, arguments, allowed_tools))
        if tool_name == "knowledge.search":
            return {"ok": True, "result": {"facts": ["manual"]}}
        return self.portal_result


def run_reader(gateway, planner=None, *, folder="kb"):
    reader = AdminPortalReader(
        gateway,
        planner or Planner(),
        portal_base_url="https://admin.example.test",
        knowledge_folder_id=folder,
    )
    return asyncio.run(reader.run(principal(), "Show my licensing tasks"))


def permissions() -> UserPermissionContext:
    return permission_context_from_user_info(user_info())


def test_permission_context_normalizes_real_admin_shape() -> None:
    context = permissions()

    assert context.user_id == "admin-7"
    assert "Licensing Manager" in context.roles
    assert "/licensing" in context.pages
    assert "/licensing/tasks" in context.subpages
    assert "licensing.view_detail" in context.buttons
    assert "14" in context.departments


def test_knowledge_query_uses_permission_context_without_identity() -> None:
    context = UserPermissionContext(
        user_id="sensitive-user-id",
        roles=("Licensing Officer",),
        departments=("License",),
        pages=("/dashboard",),
        subpages=("/licensing/profile",),
    )

    query = knowledge_search_query("Which fields are shown in Profile Verification?", context)

    assert query.startswith("Admin Portal user manual")
    assert "Licensing Officer" in query
    assert "/licensing/profile" in query
    assert "sensitive-user-id" not in query


def test_knowledge_query_reserves_space_for_the_question() -> None:
    marker = "QUESTION-MUST-SURVIVE"
    context = UserPermissionContext(
        roles=tuple("role-" + "x" * 300 for _ in range(4)),
        departments=tuple("department-" + "x" * 300 for _ in range(4)),
        pages=tuple(f"/permission-{index}-" + "x" * 280 for index in range(20)),
    )

    query = knowledge_search_query(marker, context)

    assert marker in query
    assert len(query) <= 2_000


def test_portal_request_paths_include_start_and_action_navigation() -> None:
    request = PortalReadRequest(
        "/dashboard",
        ({"type": "navigate", "path": "/licensing"}, {"type": "navigate", "url": "/licensing/profile"}),
    )

    assert portal_request_paths(request) == frozenset({"/dashboard", "/licensing", "/licensing/profile"})


def test_permission_audit_uses_fingerprint_not_identity_or_tree() -> None:
    audit = permission_audit_summary(permissions())
    other_identity = permission_context_from_user_info(user_info(user_id="another-admin"))

    assert len(audit["fingerprint"]) == 64
    assert "userId" not in audit
    assert "pages" not in audit
    assert audit["pageCount"] >= 1
    assert audit["fingerprint"] == permission_audit_summary(other_identity)["fingerprint"]


def test_permission_fingerprint_normalizes_scope_and_permission_order() -> None:
    first = UserPermissionContext(
        user_id="first",
        roles=("Manager", "Officer"),
        departments=("Licensing",),
        pages=("/dashboard", "/licensing"),
        subpages=("/licensing/licenses",),
        buttons=("view.detail", "list.read"),
        data_scope={"levels": ["TEAM", "Personal"], "active": True},
    )
    second = UserPermissionContext(
        user_id="second",
        roles=("officer", "manager"),
        departments=("licensing",),
        pages=("/licensing", "/dashboard"),
        subpages=("/licensing/licenses",),
        buttons=("LIST.READ", "VIEW.DETAIL"),
        data_scope={"active": True, "levels": ["personal", "team"]},
    )

    assert permission_audit_summary(first)["fingerprint"] == permission_audit_summary(second)["fingerprint"]


@pytest.mark.parametrize(
    ("requested", "allowed", "expected"),
    [
        ("/licensing/tasks/123", "/licensing/tasks/:id", True),
        ("/licensing/tasks/abc", "/licensing/tasks/:id", False),
        ("/licensing/tasks/record-9", "/licensing/tasks/{id}", True),
        ("/licensing/reports", "/licensing/tasks", False),
    ],
)
def test_permission_path_matching_is_bounded(requested, allowed, expected) -> None:
    assert permission_path_matches(requested, allowed) is expected


def test_reader_actions_and_statuses_are_closed_enums() -> None:
    assert ALLOWED_READER_ACTIONS == {
        "observe", "navigate", "query", "filter", "paginate", "switch_tab", "expand_details"
    }
    assert READER_STATUSES == {"success", "no_data", "no_permission", "load_failed", "not_confirmed"}


@pytest.mark.parametrize("action", sorted(ALLOWED_READER_ACTIONS))
def test_policy_accepts_each_declared_action(action) -> None:
    item = {"type": action}
    if action == "navigate":
        item["path"] = "/licensing/tasks"
    if action == "expand_details":
        item["permissionCode"] = "LICENSING.VIEW_DETAIL"
    request = PortalReadRequest("/licensing", (item,))

    assert ReadOnlyPortalPolicy("https://admin.example.test").validate(request, permissions()) is None


def test_expand_details_requires_exact_normalized_button_permission() -> None:
    policy = ReadOnlyPortalPolicy("https://admin.example.test")

    assert policy.validate(
        PortalReadRequest("/licensing", ({"type": "expand_details"},)), permissions()
    ) == "button_not_permitted"
    assert policy.validate(
        PortalReadRequest("/licensing", ({"type": "expand_details", "permissionCode": "view_detail"},)), permissions()
    ) == "button_not_permitted"
    assert policy.validate(
        PortalReadRequest("/licensing", ({"type": "expand_details", "permissionCode": "LICENSING-VIEW-DETAIL"},)), permissions()
    ) is None


@pytest.mark.parametrize("term", ["suspend", "archive", "enable", "disable", "close", "open", "activate", "deactivate"])
def test_policy_blocks_additional_write_verbs(term) -> None:
    request = PortalReadRequest("/licensing", ({"type": "query", "label": f"{term} record"},))

    assert ReadOnlyPortalPolicy("https://admin.example.test").validate(request, permissions()) == "action_not_read_only"


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_policy_blocks_model_supplied_non_get_methods(method) -> None:
    request = PortalReadRequest("/licensing", ({"type": "query", "method": method},))

    assert ReadOnlyPortalPolicy("https://admin.example.test").validate(request, permissions()) == "method_not_read_only"


@pytest.mark.parametrize(
    "action",
    [
        {"type": "export"},
        {"type": "navigate", "path": "/licensing/export"},
        {"type": "navigate", "path": "/licensing/%64ownload"},
        {"type": "query", "label": "Download report"},
        {"type": "query", "parameters": {"exportFormat": "csv"}},
    ],
)
def test_policy_blocks_export_download_and_encoded_variants(action) -> None:
    request = PortalReadRequest("/licensing", (action,))

    assert ReadOnlyPortalPolicy("https://admin.example.test").validate(request, permissions()) == "action_not_read_only"


def test_policy_rejects_forbidden_start_path() -> None:
    request = PortalReadRequest("/licensing/download", ({"type": "query"},))

    assert ReadOnlyPortalPolicy("https://admin.example.test").validate(request, permissions()) == "action_not_read_only"


def test_policy_fails_closed_without_roles_or_pages() -> None:
    request = PortalReadRequest("/licensing", ({"type": "query"},))
    policy = ReadOnlyPortalPolicy("https://admin.example.test")

    assert policy.validate(request, UserPermissionContext(pages=("/licensing",))) == "permission_context_incomplete"
    assert policy.validate(request, UserPermissionContext(roles=("Manager",))) == "permission_context_incomplete"


def test_policy_enforces_action_and_page_limits() -> None:
    policy = ReadOnlyPortalPolicy("https://admin.example.test")
    too_many_actions = PortalReadRequest("/licensing", tuple({"type": "query"} for _ in range(13)))
    too_many_pages = PortalReadRequest(
        "/licensing",
        (
            {"type": "navigate", "path": "/licensing/tasks/1"},
            {"type": "navigate", "path": "/licensing/tasks/2"},
            {"type": "navigate", "path": "/licensing/tasks/3"},
        ),
    )

    assert policy.validate(too_many_actions, permissions()) == "invalid_action_count"
    assert policy.validate(too_many_pages, permissions()) == "page_limit_exceeded"


def test_model_cannot_raise_server_owned_limits() -> None:
    payload = PortalReadRequest("/licensing", ({"type": "query"},)).as_payload()

    assert payload["maxPages"] == 3
    assert payload["timeoutSeconds"] == 45
    assert payload["maxOutputItems"] == 20


def test_planner_modes_reject_extra_or_unknown_fields() -> None:
    assert portal_read_request_from_plan(portal_plan()) is not None
    assert portal_read_request_from_plan({**portal_plan(), "extra": True}) is None
    assert portal_read_request_from_plan({"mode": "tool", "portalRequest": {}}) is None
    assert knowledge_result_from_plan({
        "mode": "knowledge_only", "result": "success", "facts": ["Manual fact"], "missing": []
    }) is not None
    assert knowledge_result_from_plan({
        "mode": "knowledge_only", "result": "no_permission", "facts": [], "missing": []
    }) is None


def test_get_user_info_is_always_first() -> None:
    events = []
    gateway = Gateway(events=events)

    outcome = run_reader(gateway)

    assert outcome.result.status == "success"
    assert events == ["GetUserInfo", "knowledge.search", "admin.portal.read"]


def test_failed_get_user_info_stops_before_knowledge_or_browser() -> None:
    gateway = Gateway(info={"ok": False, "code": "permission_denied"})

    outcome = run_reader(gateway)

    assert outcome.result.status == "no_permission"
    assert gateway.events == ["GetUserInfo"]


def test_ui_access_claim_cannot_override_empty_get_user_info_permissions() -> None:
    empty = user_info(roles=False, pages=False)
    empty["uiAppearsAccessible"] = True
    gateway = Gateway(info={"ok": True, "result": empty})

    outcome = run_reader(gateway)

    assert outcome.result.status == "no_permission"
    assert outcome.result.missing == ("permission_context_incomplete",)
    assert gateway.events == ["GetUserInfo"]


def test_identity_mismatch_stops_before_knowledge_or_browser() -> None:
    gateway = Gateway(info={"ok": True, "result": user_info(user_id="someone-else")})

    outcome = run_reader(gateway)

    assert outcome.result.status == "no_permission"
    assert gateway.events == ["GetUserInfo"]


@pytest.mark.parametrize("status", sorted(READER_STATUSES))
def test_reader_preserves_all_five_result_states(status) -> None:
    gateway = Gateway(portal_result={"ok": True, "result": {"result": status, "facts": []}})

    outcome = run_reader(gateway)

    assert outcome.result.status == status


def test_knowledge_only_answer_does_not_open_portal() -> None:
    planner = Planner({
        "mode": "knowledge_only",
        "result": "success",
        "page": "Licensing",
        "facts": ["A documented workflow"],
        "missing": [],
    })
    gateway = Gateway()

    outcome = run_reader(gateway, planner)

    assert outcome.result.status == "success"
    assert gateway.events == ["GetUserInfo", "knowledge.search"]


def test_observe_is_separate_then_followed_by_semantic_read() -> None:
    planner = Planner(
        portal_plan([{"type": "observe"}]),
        portal_plan([{"type": "query", "field": "Application status", "section": "Task details"}]),
    )
    gateway = Gateway(portal_result={
        "ok": True,
        "result": {"result": "success", "observation": {"fields": ["Application status"]}, "facts": ["Observed"]},
    })

    outcome = run_reader(gateway, planner)

    assert outcome.result.status == "success"
    assert gateway.events.count("admin.portal.read") == 2
    assert len(planner.calls) == 2


def test_observe_follow_up_enforces_turn_wide_page_limit() -> None:
    planner = Planner(
        {"mode": "portal_read", "portalRequest": {"startPath": "/licensing", "actions": [{"type": "observe"}]}},
        {
            "mode": "portal_read",
            "portalRequest": {
                "startPath": "/licensing/tasks",
                "actions": [
                    {"type": "navigate", "path": "/licensing/tasks/42"},
                    {"type": "navigate", "path": "/dashboard"},
                ],
            },
        },
    )
    gateway = Gateway(portal_result={"ok": True, "result": {"result": "not_confirmed", "observation": {"headings": ["Tasks"]}}})

    outcome = run_reader(gateway, planner)

    assert outcome.result.status == "not_confirmed"
    assert outcome.result.missing == ("invalid_follow_up_plan",)
    assert gateway.events.count("admin.portal.read") == 1


def test_public_result_is_fixed_bounded_shape_without_internal_evidence() -> None:
    result = ReaderResult(
        status="success",
        summary="internal summary",
        page="Licensing",
        facts=tuple("x" * 400 for _ in range(40)),
    ).public_json()

    assert set(result) == {"result", "page", "section", "scope", "facts", "workflowState", "missing"}
    assert "summary" not in result
    assert len(result["facts"]) <= 20
    assert len(json.dumps(result).encode()) <= 12_000


def test_public_result_enforces_utf8_byte_limit_without_facts() -> None:
    value = "\U0001f600"
    result = ReaderResult(
        status="not_confirmed",
        summary="bounded",
        page=value * 500,
        section=value * 300,
        workflow_state=value * 500,
        missing=tuple(value * 200 for _ in range(10)),
    ).public_json()

    assert len(json.dumps(result, ensure_ascii=False).encode("utf-8")) <= 12_000


def test_audit_evidence_redacts_full_page_and_credentials() -> None:
    gateway = Gateway(portal_result={
        "ok": True,
        "result": {
            "result": "success",
            "facts": ["Relevant fact"],
            "fullPageHtml": "<html><body>secret page</body></html>",
            "sessionToken": "secret-token",
            "cookie": "secret-cookie",
            "completeTable": ["row"] * 200,
        },
    })

    outcome = run_reader(gateway)
    encoded = json.dumps(outcome.audit_evidence).casefold()

    assert outcome.result.public_json()["facts"] == ["Relevant fact"]
    assert "secret-token" not in encoded
    assert "secret-cookie" not in encoded
    assert "secret page" not in encoded
    assert "completetable" not in encoded


def test_bounded_json_rejects_sensitive_key_fragments_and_markup() -> None:
    value = bounded_json({
        "authorizationHeader": "Bearer secret",
        "rawDomSnapshot": "secret",
        "pageContent": "secret",
        "safe": "<b>kept as text</b>",
    })

    assert value == {"safe": "kept as text"}
