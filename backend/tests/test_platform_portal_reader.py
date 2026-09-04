import asyncio
import importlib.util
import os
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import ValidationError


os.environ["UMC_PORTAL"] = "admin"
MODULE_PATH = Path(__file__).parents[2] / "platform-gateway" / "app.py"
SPEC = importlib.util.spec_from_file_location("admin_reader_platform_gateway", MODULE_PATH)
assert SPEC and SPEC.loader
gateway = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = gateway
SPEC.loader.exec_module(gateway)


def read_request(actions=None, **overrides):
    payload = {
        "startPath": "/licensing",
        "actions": actions or [{"type": "observe"}],
        "expectedFields": [],
    }
    payload.update(overrides)
    return gateway.AdminPortalReadRequest.model_validate(payload)


def admin_user_info(*, roles=True, pages=True):
    return {
        "data": {
            "id": "admin-7",
            "rolesInfo": [{"roleName": "Licensing Manager"}] if roles else [],
            "listRoles": [{"nameEn": "Manager"}] if roles else [],
            "listSysPermission": [
                {
                    "frontendRoute": "/licensing",
                    "children": [{"frontendRoute": "/licensing/tasks/:id"}],
                    "buttonList": [{"permissionCode": "licensing.view_detail"}],
                }
            ] if pages else [],
            "dataScope": {"scope": "team"},
        }
    }


def error_code(exc: HTTPException) -> str:
    return exc.detail["code"]


class FakeRequest:
    def __init__(self, method, url, resource_type="xhr"):
        self.method = method
        self.url = url
        self.resource_type = resource_type


class FakeRoute:
    def __init__(self, method, url, resource_type="xhr"):
        self.request = FakeRequest(method, url, resource_type)
        self.result = None

    async def abort(self, reason):
        self.result = ("abort", reason)

    async def continue_(self):
        self.result = ("continue", None)


class FakeLocator:
    def __init__(self, *, descriptor="Next", role="", tag="button", rel=None, aria_controls=None, aria_expanded=None):
        self.first = self
        self.descriptor = descriptor
        self.attributes = {
            "aria-label": descriptor,
            "title": None,
            "role": role,
            "rel": rel,
            "aria-controls": aria_controls,
            "aria-expanded": aria_expanded,
        }
        self.tag = tag
        self.clicked = False

    async def count(self):
        return 1

    async def get_attribute(self, name):
        return self.attributes.get(name)

    async def inner_text(self):
        return self.descriptor

    async def evaluate(self, script):
        return self.tag

    async def click(self, timeout):
        self.clicked = True


class FakePage:
    def __init__(self, locator):
        self.result = locator

    def locator(self, selector):
        return self.result

    def get_by_role(self, role, **kwargs):
        return self.result


class FakeQueryLocator:
    def __init__(self, values, index=0):
        self.values = values
        self.index = index

    async def count(self):
        return len(self.values)

    def nth(self, index):
        return FakeQueryLocator(self.values, index)

    async def is_visible(self):
        value = self.values[self.index]
        return value[1] if isinstance(value, tuple) else True

    async def inner_text(self):
        value = self.values[self.index]
        return value[0] if isinstance(value, tuple) else value


class FakeObservationLocator:
    def __init__(self, values, index=0):
        self.values = values
        self.index = index

    async def count(self):
        return len(self.values)

    def nth(self, index):
        return FakeObservationLocator(self.values, index)

    async def is_visible(self):
        return self.values[self.index][1]

    async def inner_text(self):
        return self.values[self.index][0]


class FakeObservationContainer:
    def __init__(self, rows, *, tag="table", visible=True, aria_busy=None):
        self.rows = rows
        self.tag = tag
        self.visible = visible
        self.aria_busy = aria_busy

    async def is_visible(self):
        return self.visible

    async def get_attribute(self, name):
        return self.aria_busy if name == "aria-busy" else None

    async def evaluate(self, script):
        return self.tag

    def locator(self, selector):
        return FakeObservationLocator(self.rows)


class FakeObservationContainers:
    def __init__(self, containers, index=0):
        self.containers = containers
        self.index = index

    async def count(self):
        return len(self.containers)

    def nth(self, index):
        return self.containers[index]


class FakeStructuredRow:
    def __init__(self, cells, *, visible=True):
        self.cells = cells
        self.visible = visible

    async def is_visible(self):
        return self.visible

    async def inner_text(self):
        return " ".join(value for value, _ in self.cells)

    def locator(self, selector):
        return FakeObservationLocator(self.cells)


class FakeStructuredRows:
    def __init__(self, rows, index=0):
        self.rows = rows
        self.index = index

    async def count(self):
        return len(self.rows)

    def nth(self, index):
        return self.rows[index]


class FakeStructuredContainer(FakeObservationContainer):
    def __init__(self, headers, rows):
        super().__init__([], tag="table")
        self.headers = headers
        self.structured_rows = rows

    def locator(self, selector):
        if selector == "thead th,[role='columnheader']":
            return FakeObservationLocator(self.headers)
        return FakeStructuredRows(self.structured_rows)


class FakeObservationPage:
    def __init__(self, values_by_selector, *, containers=None):
        self.values_by_selector = values_by_selector
        self.containers = containers or []
        self.selectors = []

    def locator(self, selector):
        self.selectors.append(selector)
        if selector == "table,[role='grid']":
            return FakeObservationContainers(self.containers)
        return FakeObservationLocator(self.values_by_selector.get(selector, []))


class FakeQueryPage:
    def __init__(self, values, *, empty_state_present=False, empty_state_visible=False, failure_states=(), body_text=""):
        self.values = values
        self.empty_state_present = empty_state_present or empty_state_visible
        self.empty_state_visible = empty_state_visible
        self.failure_states = failure_states
        self.body_text = body_text

    def locator(self, selector):
        if selector == gateway.READER_FAILURE_STATE_SELECTOR:
            return FakeQueryLocator(self.failure_states)
        if selector == "body":
            return FakeQueryLocator([(self.body_text, True)]) if self.body_text else FakeQueryLocator([])
        return FakeQueryLocator(self.values)

    def get_by_text(self, text, exact=True):
        return FakeQueryLocator([(text, self.empty_state_visible)] if self.empty_state_present else [])


def guard(method, path, *, resource_type="xhr"):
    route = FakeRoute(method, f"https://admin.example.test{path}", resource_type)
    asyncio.run(gateway._guard_reader_request(route, "https://admin.example.test"))
    return route.result


def test_gateway_action_enum_matches_runtime_contract() -> None:
    assert gateway.READER_ACTIONS == {
        "observe", "navigate", "query", "filter", "paginate", "switch_tab", "expand_details"
    }


def test_column_header_is_a_bounded_query_role() -> None:
    request = read_request([{"type": "query", "role": "columnheader", "name": "Status"}])

    gateway._validate_reader_request(request)


def test_query_field_is_observed_only_with_a_value_or_explicit_empty_state() -> None:
    action = gateway.PortalReadAction(
        type="query",
        selector="[class*='field']",
        label="Status",
        emptyState="No data",
    )

    missing = asyncio.run(gateway._query_page_values(FakeQueryPage([]), action, 20))
    empty = asyncio.run(gateway._query_page_values(FakeQueryPage([], empty_state_visible=True), action, 20))
    present = asyncio.run(gateway._query_page_values(FakeQueryPage(["Pending Review"]), action, 20))

    assert missing == ("Status", [], False)
    assert empty == ("Status", [], True)
    assert present == ("Status", ["Pending Review"], False)


def test_query_returns_only_visible_values_and_redacts_credentials() -> None:
    action = gateway.PortalReadAction(type="query", selector="[class*='field']", label="Result")
    page = FakeQueryPage([
        ("Hidden stale record", False),
        ("Authorization: Bearer abc.def", True),
        ("A normal token status", True),
        ("access_token=secret-value", True),
    ])

    _, values, confirmed_empty = asyncio.run(gateway._query_page_values(page, action, 20))

    assert values == [
        "Authorization: [redacted]",
        "A normal token status",
        "access_token=[redacted]",
    ]
    assert not confirmed_empty


def test_hidden_empty_state_or_visible_failure_state_cannot_confirm_no_data() -> None:
    action = gateway.PortalReadAction(
        type="query",
        selector="[class*='field']",
        label="Status",
        emptyState="No data",
    )

    hidden_empty = FakeQueryPage([], empty_state_present=True, empty_state_visible=False)
    loading = FakeQueryPage([], empty_state_visible=True, failure_states=[("Loading...", True)])
    error_page = FakeQueryPage([], empty_state_visible=True, body_text="503 Server Error - Retry")

    assert asyncio.run(gateway._query_page_values(hidden_empty, action, 20))[2] is False
    assert asyncio.run(gateway._query_page_values(loading, action, 20))[2] is False
    assert asyncio.run(gateway._query_page_values(error_page, action, 20))[2] is False


@pytest.mark.parametrize(
    "locator",
    [
        {"field": "Password"},
        {"name": "Access Token", "role": "status"},
        {"selector": "[data-field='authorization']"},
        {"selector": "[class*='api_key']"},
        {"section": "Cookie value", "role": "listitem"},
        {"label": "Credential", "role": "status"},
    ],
)
def test_gateway_rejects_sensitive_query_locators(locator) -> None:
    request = read_request([{"type": "query", **locator}])

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(request)

    assert error_code(raised.value) == "reader_sensitive_locator_forbidden"


def test_reader_text_sanitizer_preserves_normal_token_word_and_redacts_values() -> None:
    value = gateway._sanitize_reader_text(
        "Token status is active; password: hunter2; api_key=abc; "
        "JWT eyJabcdefgh.abcdefgh.abcdefgh; cookie is session=secret"
    )

    assert "Token status is active" in value
    assert "hunter2" not in value
    assert "api_key=[redacted]" in value
    assert "eyJabcdefgh.abcdefgh.abcdefgh" not in value
    assert "cookie is [redacted]" in value


def test_reader_text_sanitizer_redacts_basic_auth_and_all_cookie_pairs() -> None:
    value = gateway._sanitize_reader_text(
        "Authorization Basic abc123; Cookie: session=abc; Secure; refresh=def; "
        "access token xyz789; refresh token secretvalue; access token policy; Token status is active"
    )

    assert "abc123" not in value
    assert "session=abc" not in value
    assert "refresh=def" not in value
    assert "xyz789" not in value
    assert "secretvalue" not in value
    assert "access token policy" in value
    assert "Token status is active" in value


def test_observe_semantics_collects_only_visible_native_table_rows_within_bounds() -> None:
    rows = [("Hidden row", False), ("No data found", True), ("Loading...", True)] + [
        (f"Row {index} " + ("x" * 450), True)
        for index in range(10)
    ]
    page = FakeObservationPage({
        "h1,h2,h3,[role='heading']": [("Hidden heading", False), ("Dashboard", True)],
    }, containers=[FakeObservationContainer(rows)])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["headings"] == ["Dashboard"]
    assert "table,[role='grid']" in page.selectors
    assert len(observation["rowSummaries"]) == 8
    assert all("Hidden row" not in row for row in observation["rowSummaries"])
    assert all("No data" not in row and "Loading" not in row for row in observation["rowSummaries"])
    assert all(len(row) == 400 for row in observation["rowSummaries"])


def test_observe_semantics_uses_only_first_visible_table_with_data_rows() -> None:
    page = FakeObservationPage({}, containers=[
        FakeObservationContainer([("Hidden table row", True)], visible=False),
        FakeObservationContainer([("No data found", True)]),
        FakeObservationContainer([("First table row 1", True), ("First table row 2", True)]),
        FakeObservationContainer([("Second table row", True)]),
    ])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["rowSummaries"] == ["First table row 1", "First table row 2"]


def test_observe_semantics_excludes_the_visible_actions_column_by_cell_index() -> None:
    container = FakeStructuredContainer(
        [("Application No.", True), ("Service Name", True), ("Actions", True)],
        [
            FakeStructuredRow([
                ("ML-1", True),
                ("Application for Media Export", True),
                ("Approve Reject", True),
            ])
        ],
    )
    page = FakeObservationPage({}, containers=[container])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["rowSummaries"] == ["ML-1 Application for Media Export"]


def test_observe_semantics_collects_bounded_visible_non_error_stat_cards() -> None:
    summary_selector = ".stat-card:not([class*='skeleton']):not(:has([class*='skeleton']))"
    summaries = [
        ("Hidden 1", False),
        ("Loading...", True),
        ("Error 500", True),
        ("Retry 503", True),
        *((f"Status {index} " + "x" * 220, True) for index in range(14)),
    ]
    page = FakeObservationPage({summary_selector: summaries})

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert summary_selector in page.selectors
    assert len(observation["summaries"]) == 12
    assert all(len(value) == 200 for value in observation["summaries"])
    assert all(
        marker not in " ".join(observation["summaries"])
        for marker in ("Hidden", "Loading", "Error", "Retry")
    )


def test_observe_semantics_redacts_credentials_in_all_text_collections() -> None:
    selectors = {
        "h1,h2,h3,[role='heading']": [("Authorization: Bearer heading-secret", True)],
        "label": [("password: label-secret", True)],
        "th,[role='columnheader']": [("api_key=column-secret", True)],
        "[role='region'][aria-label],section[aria-label]": [("access_token: region-secret", True)],
        "[role='tab'],.ant-pagination button,.ant-pagination a,button[aria-label],a[aria-label]": [("cookie=session-secret", True)],
        ".stat-card:not([class*='skeleton']):not(:has([class*='skeleton']))": [("secret: summary-secret", True)],
    }
    page = FakeObservationPage(
        selectors,
        containers=[FakeObservationContainer([("credential: row-secret", True)])],
    )

    observation = asyncio.run(gateway._observe_semantics(page, 20))
    encoded = str(observation)

    for secret in (
        "heading-secret", "label-secret", "column-secret", "region-secret",
        "session-secret", "summary-secret", "row-secret",
    ):
        assert secret not in encoded
    assert encoded.count("[redacted]") >= 7


def test_auth_init_script_executes_and_uses_portal_storage_shape() -> None:
    script = gateway._auth_init_script('token"value')

    assert script.lstrip().startswith("(() => {")
    assert script.rstrip().endswith("})();")
    assert "JSON.stringify({ value, timestamp: Date.now() })" in script
    assert 'const token = "token\\\"value";' in script


@pytest.mark.parametrize("action", ["approve", "export", "download", "delete", "submit"])
def test_gateway_rejects_dangerous_action_types(action) -> None:
    request = read_request([{"type": action}])

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(request)

    assert error_code(raised.value) == "action_not_read_only"


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_gateway_rejects_model_supplied_non_get_method(method) -> None:
    request = read_request([{"type": "query", "field": "Status", "method": method}])

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(request)

    assert error_code(raised.value) == "method_not_read_only"


@pytest.mark.parametrize(
    "path",
    ["/licensing/export", "/licensing/%64ownload", "/api/Document/Download", "/api/Document/Dowload"],
)
def test_gateway_rejects_export_and_download_paths(path) -> None:
    request = read_request([{"type": "navigate", "path": path}])

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(request)

    assert error_code(raised.value) == "invalid_reader_path"


@pytest.mark.parametrize("selector", ["html", "body", "main", "table", "*", "#root", "#app"])
def test_gateway_rejects_full_page_selectors(selector) -> None:
    request = read_request([{"type": "query", "selector": selector}])

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(request)

    assert error_code(raised.value) == "reader_selector_too_broad"


def test_gateway_requires_semantic_locators_for_interactions() -> None:
    request = read_request([{"type": "expand_details", "name": "Details"}])

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(request)

    assert error_code(raised.value) == "reader_semantic_locator_required"


@pytest.mark.parametrize(
    "action",
    [
        {"type": "expand_details", "role": "button", "name": "Details"},
        {"type": "expand_details", "selector": "[data-action='details']", "role": "button", "name": "Details"},
    ],
)
def test_expand_details_requires_permission_code_for_semantic_and_selector_clicks(action) -> None:
    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(read_request([action]))

    assert error_code(raised.value) == "button_permission_required"


def test_runtime_click_validation_is_shared_by_selector_and_semantic_locators() -> None:
    for action in (
        gateway.PortalReadAction(type="paginate", selector="[aria-label='Next']", role="link", name="Next"),
        gateway.PortalReadAction(type="paginate", role="link", name="Next"),
    ):
        locator = FakeLocator(descriptor="Next", tag="a", rel="next")
        asyncio.run(gateway._safe_click(FakePage(locator), action))
        assert locator.clicked


@pytest.mark.parametrize("descriptor", ["Suspend", "Archive", "Enable", "Disable", "Close", "Open", "Activate", "Deactivate"])
def test_runtime_click_rejects_additional_write_descriptors(descriptor) -> None:
    action = gateway.PortalReadAction(type="paginate", role="link", name=descriptor)
    locator = FakeLocator(descriptor=descriptor, tag="a", rel="next")

    with pytest.raises(RuntimeError, match="action_not_read_only"):
        asyncio.run(gateway._safe_click(FakePage(locator), action))


def test_runtime_click_rejects_role_descriptor_and_aria_mismatch() -> None:
    cases = (
        (gateway.PortalReadAction(type="switch_tab", role="tab", name="Licensing"), FakeLocator(descriptor="Licensing", role="button"), "reader_click_role_mismatch"),
        (gateway.PortalReadAction(type="paginate", role="link", name="Next"), FakeLocator(descriptor="Previous", tag="a", rel="next"), "reader_click_descriptor_mismatch"),
        (gateway.PortalReadAction(type="expand_details", role="button", name="Details", permissionCode="licensing.view_detail"), FakeLocator(descriptor="Details", tag="button"), "reader_click_target_not_expandable"),
    )
    for action, locator, error in cases:
        with pytest.raises(RuntimeError, match=error):
            asyncio.run(gateway._safe_click(FakePage(locator), action))


@pytest.mark.parametrize(
    "overrides",
    [
        {"maxPages": gateway.READER_MAX_PAGES + 1},
        {"timeoutSeconds": gateway.READER_TIMEOUT_SECONDS + 1},
        {"maxOutputItems": gateway.READER_MAX_OUTPUT_ITEMS + 1},
    ],
)
def test_gateway_schema_caps_page_timeout_and_output_limits(overrides) -> None:
    with pytest.raises(ValidationError):
        read_request(**overrides)


def test_gateway_schema_caps_actions() -> None:
    with pytest.raises(ValidationError):
        read_request([{"type": "observe"}] * (gateway.READER_MAX_ACTIONS + 1))


def test_gateway_permission_parser_handles_real_admin_shape() -> None:
    context = gateway._gateway_permission_context(admin_user_info())

    assert context["userId"] == "admin-7"
    assert "Licensing Manager" in context["roles"]
    assert "/licensing" in context["pages"]
    assert "/licensing/tasks/:id" in context["subpages"]
    assert context["departments"] == ()
    assert "licensing.view_detail" in context["buttons"]


def test_gateway_permission_context_includes_department_and_identity_free_fingerprint() -> None:
    first = admin_user_info()
    first["data"]["listRoles"][0]["departmentId"] = 42
    second = admin_user_info()
    second["data"]["listRoles"][0]["departmentId"] = 42
    second["data"]["id"] = "another-admin"

    first_context = gateway._gateway_permission_context(first)
    second_context = gateway._gateway_permission_context(second)

    assert "42" in first_context["departments"]
    assert gateway._permission_fingerprint(first_context) == gateway._permission_fingerprint(second_context)


def test_gateway_permission_fingerprint_covers_every_authorization_dimension() -> None:
    context = gateway._gateway_permission_context(admin_user_info())
    baseline = gateway._permission_fingerprint(context)

    for key in ("departments", "roles", "pages", "subpages", "buttons", "dataScope"):
        changed = {**context, key: (*context[key], "changed")}
        assert gateway._permission_fingerprint(changed) != baseline


def test_gateway_permissions_fail_closed_when_ui_claims_access_but_tree_is_empty() -> None:
    payload = admin_user_info(roles=False, pages=False)
    payload["uiAppearsAccessible"] = True

    with pytest.raises(HTTPException) as raised:
        gateway._validate_gateway_permissions(payload, "/licensing", "admin-7")

    assert error_code(raised.value) == "reader_permission_context_incomplete"


def test_default_post_allowlist_is_exact() -> None:
    assert gateway.READER_READ_ONLY_POST_PATHS == {
        "/api/AdminUser/GetUserInfo",
        "/api/Application/MyComplatedPage",
        "/api/Application/MyTodoPage",
        "/api/LicenseManagement/list",
    }


@pytest.mark.parametrize(
    "path",
    [
        "/api/AdminUser/GetUserInfo",
        "/api/Application/MyComplatedPage",
        "/api/Application/MyTodoPage",
        "/api/LicenseManagement/list",
    ],
)
def test_guard_allows_only_configured_read_only_posts(path) -> None:
    assert guard("POST", path) == ("continue", None)


def test_default_get_allowlist_is_server_owned_and_exact() -> None:
    assert gateway.READER_READ_ONLY_GET_PATHS == {
        "/api/license/dashboard/overview",
        "/api/license/dashboard/license-distribution",
        "/api/license/dashboard/performance",
        "/api/license/dashboard/performance-trend",
        "/api/license/dashboard/members-needing-coaching",
        "/api/license/dashboard/members-on-leave",
        "/api/license/dashboard/needs-attention",
        "/api/Content/Dashboard/Overview",
        "/api/Content/Dashboard/TaskList",
        "/api/Inspection/Dashboard/Overview",
        "/api/Inspection/Dashboard/TaskList",
        "/api/CustomerHappiness/Dashboard/Overview",
        "/api/CustomerHappiness/Dashboard/TaskList",
        "/api/AdminUser/LoginMethod",
        "/api/UserManagement/GetAdminUserAsync",
        "/api/TypeDictionary/GetTypeDictionaries/ServiceConfigServiceType",
        "/api/Application/UrgenCount",
        "/api/UserManagement/UserProfile/Approves",
        "/api/UserManagement/UserProfile/UserTypes",
        "/api/UserManagement/UserProfile/Status",
        "/api/UserManagement/UserProfile/Type/Count",
        "/api/LicenseManagement/statistics",
        "/api/TypeDictionary/GetTypeDictionaries/CertificateStatus",
        "/api/Application/MyReviewDetail/:taskId",
        "/api/UserManagement/UserProfile/:id/Personal",
        "/api/UserManagement/UserProfile/:id/Establishment",
        "/api/UserManagement/UserProfile/:id/Partners",
        "/api/LicenseManagement/:id",
    }


@pytest.mark.parametrize("path", sorted(gateway.READER_READ_ONLY_GET_PATHS))
def test_guard_allows_configured_read_only_gets(path) -> None:
    concrete_path = path.replace(":taskId", "task-42").replace(":id", "record-42")
    assert guard("GET", concrete_path, resource_type="fetch") == ("continue", None)


@pytest.mark.parametrize(
    "path",
    [
        "/api/AdminUser/GetUserInfo",
        "/api/Application/details",
        "/data/read",
        "/api/LicenseManagement",
        "/api/LicenseManagement/record-without-number",
        "/api/LicenseManagement/42/extra",
        "/api/Application/MyReviewDetail",
        "/api/UserManagement/UserProfile/42",
    ],
)
def test_guard_blocks_every_unverified_or_malformed_get_api_or_fetch(path) -> None:
    assert guard("GET", path, resource_type="fetch")[0] == "abort"


def test_guard_matches_get_path_without_using_query_as_a_prefix_escape() -> None:
    assert guard("GET", "/api/license/dashboard/overview?days=7") == ("continue", None)
    assert guard("GET", "/api/license/dashboard/overview/extra?days=7")[0] == "abort"


def test_health_reports_fixed_allowlist_counts() -> None:
    health = asyncio.run(gateway.healthz())

    assert health["readOnlyGetPathCount"] == 28
    assert health["readOnlyPostPathCount"] == 4


@pytest.mark.parametrize(
    ("path", "resource_type"),
    [
        ("/licensing", "document"),
        ("/assets/app.js", "script"),
        ("/assets/vendor-wangeditor.js", "script"),
        ("/assets/app.css", "stylesheet"),
        ("/assets/font.woff2", "font"),
        ("/assets/icon.png", "image"),
    ],
)
def test_guard_allows_same_origin_static_reads(path, resource_type) -> None:
    assert guard("GET", path, resource_type=resource_type) == ("continue", None)


def test_guard_allows_only_the_code_owned_static_fetch() -> None:
    assert guard("GET", "/config.json", resource_type="fetch") == ("continue", None)
    assert guard("GET", "/runtime.json", resource_type="fetch")[0] == "abort"


def test_post_allowlist_cannot_be_extended_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("PORTAL_READER_READ_ONLY_POST_PATHS", "/api/anything-else")

    assert "/api/anything-else" not in gateway.READER_READ_ONLY_POST_PATHS


@pytest.mark.parametrize(
    ("method", "path", "resource_type"),
    [
        ("POST", "/api/Document/OriginalNames", "xhr"),
        ("POST", "/api/clientlog/report", "xhr"),
        ("POST", "/api/anything-else", "xhr"),
        ("GET", "/api/Document/Download", "xhr"),
        ("GET", "/api/Document/%44ownload", "xhr"),
        ("GET", "/socket", "websocket"),
    ],
)
def test_guard_blocks_unapproved_posts_downloads_and_streams(method, path, resource_type) -> None:
    assert guard(method, path, resource_type=resource_type)[0] == "abort"


def test_guard_blocks_cross_origin_requests() -> None:
    route = FakeRoute("GET", "https://outside.example.test/api/data")

    asyncio.run(gateway._guard_reader_request(route, "https://admin.example.test"))

    assert route.result[0] == "abort"


def test_gateway_rechecks_get_user_info_before_browser(monkeypatch) -> None:
    calls = []

    async def fake_umc_request(method, path, **kwargs):
        calls.append((method, path))
        return admin_user_info(roles=False, pages=False)

    monkeypatch.setattr(gateway, "_umc_request", fake_umc_request)
    request = read_request()

    with pytest.raises(HTTPException) as raised:
        asyncio.run(gateway.admin_portal_read(
            request,
            authorization="Bearer token",
            x_request_id="request",
            x_user_id="admin-7",
        ))

    assert error_code(raised.value) == "reader_permission_context_incomplete"
    assert calls == [("POST", "/api/AdminUser/GetUserInfo")]
