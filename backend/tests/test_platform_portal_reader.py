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
    def __init__(
        self, *, descriptor="Next", role="", tag="button", rel=None, aria_controls=None,
        aria_expanded=None, aria_selected=None, aria_sort=None, input_type=None, visible=True,
    ):
        self.first = self
        self.last = self
        self.descriptor = descriptor
        self.attributes = {
            "aria-label": descriptor,
            "title": None,
            "role": role,
            "rel": rel,
            "aria-controls": aria_controls,
            "aria-expanded": aria_expanded,
            "aria-selected": aria_selected,
            "aria-sort": aria_sort,
            "type": input_type,
        }
        self.tag = tag
        self.visible = visible
        self.clicked = False
        self.filled = None
        self.selected = None

    async def count(self):
        return 1

    def nth(self, index):
        return self

    async def get_attribute(self, name):
        return self.attributes.get(name)

    async def inner_text(self):
        return self.descriptor

    async def is_visible(self):
        return self.visible

    async def evaluate(self, script):
        return self.tag

    async def click(self, timeout):
        self.clicked = True

    async def fill(self, value, timeout):
        self.filled = value

    async def select_option(self, *, label, timeout):
        self.selected = label

    def locator(self, selector):
        return self

    def get_by_label(self, label, exact=True):
        return self

    def get_by_role(self, role, **kwargs):
        return self


class FakePage:
    def __init__(self, locator):
        self.result = locator

    def locator(self, selector):
        return self.result

    def get_by_role(self, role, **kwargs):
        return self.result

    def get_by_label(self, label, exact=True):
        return self.result

    def get_by_text(self, text, exact=True):
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
    def __init__(self, rows, *, tag="table", visible=True, aria_busy=None, heading="", parent_index=None):
        self.rows = rows
        self.tag = tag
        self.visible = visible
        self.aria_busy = aria_busy
        self.heading = heading
        self.parent_index = parent_index

    async def is_visible(self):
        return self.visible

    async def get_attribute(self, name):
        if name == "aria-busy":
            return self.aria_busy
        if name == "role" and self.tag == "grid":
            return "grid"
        return None

    async def evaluate(self, script):
        if "tagName" in script:
            return self.tag
        if "parentIndex" in script:
            return {"heading": self.heading, "parentIndex": self.parent_index}
        return self.heading

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


class FakeSemanticSection:
    def __init__(
        self,
        heading,
        controls,
        *,
        aria_label="",
        card_summaries=(),
        selected_states=(),
        empty_state="",
        visible=True,
    ):
        self.heading = heading
        self.controls = controls
        self.aria_label = aria_label
        self.card_summaries = card_summaries
        self.selected_states = selected_states
        self.empty_state = empty_state
        self.visible = visible
        self.selectors = []

    async def is_visible(self):
        return self.visible

    async def get_attribute(self, name):
        return self.aria_label if name == "aria-label" else None

    def locator(self, selector):
        self.selectors.append(selector)
        if selector == "h1,h2,h3,[role='heading']":
            return FakeObservationLocator([(self.heading, True)] if self.heading else [])
        if selector == "[role='tab'],[role='button'],button[aria-label],a[aria-label]":
            return FakeObservationLocator([(value, True) for value in self.controls])
        if selector == "[role='tab'][aria-selected='true']":
            return FakeObservationLocator(self.selected_states)
        if selector == ".stat-card:not([class*='skeleton']):not(:has([class*='skeleton']))":
            return FakeObservationLocator([(value, True) for value in self.card_summaries])
        if selector == ".ant-empty-description,[role='status']":
            return FakeObservationLocator([(self.empty_state, True)] if self.empty_state else [])
        return FakeObservationLocator([])


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
    def __init__(self, headers, rows, *, heading="", empty_state="", parent_index=None):
        super().__init__([], tag="table", heading=heading, parent_index=parent_index)
        self.headers = headers
        self.structured_rows = rows
        self.empty_state = empty_state

    def locator(self, selector):
        if selector == "thead th,[role='columnheader']":
            return FakeObservationLocator(self.headers)
        if selector == ".ant-empty-description,[role='status']":
            return FakeObservationLocator([(self.empty_state, True)] if self.empty_state else [])
        return FakeStructuredRows(self.structured_rows)


class FakeObservationPage:
    def __init__(self, values_by_selector, *, containers=None, sections=None):
        self.values_by_selector = values_by_selector
        self.containers = containers or []
        self.sections = sections or []
        self.selectors = []

    def locator(self, selector):
        self.selectors.append(selector)
        if selector == "table,[role='grid']":
            return FakeObservationContainers(self.containers)
        if selector == "section,[role='region']":
            return FakeObservationContainers(self.sections)
        return FakeObservationLocator(self.values_by_selector.get(selector, []))


class FakeQueryPage:
    def __init__(self, values, *, empty_state_present=False, empty_state_visible=False, failure_states=(), body_text=""):
        self.values = values
        self.empty_state_present = empty_state_present or empty_state_visible
        self.empty_state_visible = empty_state_visible
        self.failure_states = failure_states
        self.body_text = body_text

    def locator(self, selector):
        if selector == "[role='dialog']:visible,[role='alertdialog']:visible,.ant-drawer-content:visible":
            return FakeQueryLocator([])
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
        "observe", "navigate", "query", "filter", "paginate", "switch_tab", "expand_details",
        "show_filter", "apply_filter", "reset_filter", "sort", "show_detail", "dismiss_overlay",
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


def test_observe_semantics_keeps_rows_bound_to_their_dashboard_section() -> None:
    page = FakeObservationPage({}, containers=[
        FakeStructuredContainer([], [FakeStructuredRow([("Service Applications 15", True)])], heading="My Tasks"),
        FakeStructuredContainer(
            [],
            [
                FakeStructuredRow([("ML-1 Pending Modification Customer", True)]),
                FakeStructuredRow([("ML-2 Pending Modification Customer", True)]),
            ],
            heading="Needs Your Attention",
        ),
    ])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["sectionSummaries"] == [
        {
            "nodeId": "observation-table-001",
            "kind": "table",
            "heading": "My Tasks",
            "sourceSection": "My Tasks",
            "columnHeaders": [],
            "rowSummaries": ["Service Applications 15"],
            "emptyState": "",
        },
        {
            "nodeId": "observation-table-002",
            "kind": "table",
            "heading": "Needs Your Attention",
            "sourceSection": "Needs Your Attention",
            "columnHeaders": [],
            "rowSummaries": ["ML-1 Pending Modification Customer", "ML-2 Pending Modification Customer"],
            "emptyState": "",
        },
    ]


def test_observe_semantics_preserves_explicit_empty_state_with_section_identity() -> None:
    page = FakeObservationPage({}, containers=[
        FakeStructuredContainer(
            [("Task No.", True), ("Service Name", True)],
            [],
            heading="Needs Your Attention",
            empty_state="No data",
        ),
    ])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["sectionSummaries"] == [{
        "nodeId": "observation-table-001",
        "kind": "table",
        "heading": "Needs Your Attention",
        "sourceSection": "Needs Your Attention",
        "columnHeaders": ["Task No.", "Service Name"],
        "rowSummaries": [],
        "emptyState": "No data",
    }]


def test_observe_semantics_binds_controls_to_visible_semantic_sections() -> None:
    page = FakeObservationPage({}, sections=[
        FakeSemanticSection("Hidden", ["Hidden 99"], visible=False),
        FakeSemanticSection("My Tasks", ["Service Application 14", "Profile Verification 0"]),
        FakeSemanticSection("Needs Your Attention", ["All 2", "Pending Modification 2"]),
    ])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["regionSummaries"] == [
        {
            "nodeId": "observation-region-002",
            "kind": "region",
            "heading": "My Tasks",
            "sourceSection": "My Tasks",
            "controls": ["Service Application 14", "Profile Verification 0"],
            "emptyState": "",
        },
        {
            "nodeId": "observation-region-003",
            "kind": "region",
            "heading": "Needs Your Attention",
            "sourceSection": "Needs Your Attention",
            "controls": ["All 2", "Pending Modification 2"],
            "emptyState": "",
        },
    ]


def test_observe_semantics_binds_cards_to_their_semantic_section() -> None:
    page = FakeObservationPage({}, sections=[
        FakeSemanticSection("Queue Overview", [], card_summaries=("Open 8", "Closed 3")),
        FakeSemanticSection("Other Overview", [], card_summaries=("Waiting 2",)),
    ])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["regionSummaries"] == [
        {
            "nodeId": "observation-region-001",
            "kind": "region",
            "heading": "Queue Overview",
            "sourceSection": "Queue Overview",
            "controls": [],
            "emptyState": "",
            "cardSummaries": ["Open 8", "Closed 3"],
            "summaries": ["Open 8", "Closed 3"],
        },
        {
            "nodeId": "observation-region-002",
            "kind": "region",
            "heading": "Other Overview",
            "sourceSection": "Other Overview",
            "controls": [],
            "emptyState": "",
            "cardSummaries": ["Waiting 2"],
            "summaries": ["Waiting 2"],
        },
    ]


def test_observe_semantics_assigns_stable_parent_refs_to_nested_tables() -> None:
    page = FakeObservationPage(
        {},
        containers=[FakeStructuredContainer([], [FakeStructuredRow([("REF-101 Open", True)])], heading="Queue", parent_index=0)],
        sections=[FakeSemanticSection("Queue", [])],
    )

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["regionSummaries"][0]["nodeId"] == "observation-region-001"
    assert observation["regionSummaries"][0]["kind"] == "region"
    assert observation["regionSummaries"][0]["controls"] == []
    assert observation["sectionSummaries"][0]["nodeId"] == "observation-table-001"
    assert observation["sectionSummaries"][0]["kind"] == "table"
    assert observation["sectionSummaries"][0]["parentRef"] == "observation-region-001"


def test_observe_semantics_keeps_aria_label_only_region_referenced_by_table() -> None:
    page = FakeObservationPage(
        {},
        containers=[FakeStructuredContainer([], [FakeStructuredRow([("REF-101 Open", True)])], heading="Queue", parent_index=0)],
        sections=[FakeSemanticSection("", [], aria_label="Queue")],
    )

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert observation["regionSummaries"] == [{
        "nodeId": "observation-region-001",
        "kind": "region",
        "heading": "Queue",
        "sourceSection": "Queue",
        "controls": [],
        "emptyState": "",
    }]
    assert observation["sectionSummaries"][0]["parentRef"] == "observation-region-001"


def test_observe_semantics_includes_only_bounded_visible_dialog_content() -> None:
    page = FakeObservationPage({
        gateway.READER_OVERLAY_SELECTOR: [
            ("Hidden filter", False),
            ("Application Status Pending Review Apply Reset", True),
            *((f"Dialog {index} " + "x" * 900, True) for index in range(5)),
        ],
    })

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert len(observation["dialogs"]) == 4
    assert "Hidden filter" not in observation["dialogs"]
    assert all(len(value) <= 800 for value in observation["dialogs"])


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


def test_observe_semantics_records_selected_tab_per_region() -> None:
    selected_tab_selector = "[role='tab'][aria-selected='true']"
    section = FakeSemanticSection(
        heading="My Work",
        controls=["Applications 14", "Enquiries 2"],
        selected_states=[("Enquiries 2", True)],
    )
    page = FakeObservationPage({}, sections=[section])

    observation = asyncio.run(gateway._observe_semantics(page, 20))

    assert selected_tab_selector in section.selectors
    assert observation["regionSummaries"][0]["selectedState"] == "Enquiries 2"


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
        {"type": "show_filter", "role": "button", "name": "Filter"},
        {"type": "apply_filter", "role": "button", "name": "Apply"},
        {"type": "reset_filter", "role": "button", "name": "Reset"},
        {"type": "sort", "role": "columnheader", "name": "Submission Time", "direction": "ascending"},
        {"type": "dismiss_overlay", "role": "button", "name": "Close"},
    ],
)
def test_dashboard_and_licensing_read_only_interactions_are_accepted(action) -> None:
    gateway._validate_reader_request(read_request([action], startPath="/dashboard"))
    gateway._validate_reader_request(read_request([action], startPath="/licensing/applications"))


def test_extended_read_only_interactions_are_generic_for_permitted_pages() -> None:
    request = read_request(
        [{"type": "show_filter", "role": "button", "name": "Filter"}],
        startPath="/customer-happiness",
    )

    gateway._validate_reader_request(request)


@pytest.mark.parametrize("label", ["Refunds 2", "Appeals", "Open tasks", "Approval tasks"])
def test_gateway_allows_read_only_resource_and_status_tab_labels(label) -> None:
    gateway._validate_reader_request(read_request([
        {"type": "switch_tab", "role": "tab", "name": label},
    ]))


@pytest.mark.parametrize("path", ["/refunds", "/appeals", "/open-tasks", "/approval-tasks"])
def test_gateway_allows_read_only_resource_and_status_routes(path) -> None:
    gateway._validate_reader_request(read_request([
        {"type": "navigate", "path": path},
    ], startPath="/refunds"))


@pytest.mark.parametrize("label", ["Approve record", "Reject", "Submit", "Export all tasks", "Download report", "Close record"])
def test_gateway_rejects_explicit_mutation_control_labels(label) -> None:
    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(read_request([{"type": "query", "label": label}]))

    assert error_code(raised.value) == "action_not_read_only"


@pytest.mark.parametrize(
    "path",
    ["/licensing/approve-record", "/licensing/open-record", "/licensing/refund-record", "/licensing/tasks/123/close"],
)
def test_gateway_rejects_explicit_mutation_routes(path) -> None:
    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(read_request([{"type": "navigate", "path": path}]))

    assert error_code(raised.value) == "invalid_reader_path"


def test_gateway_dismiss_overlay_does_not_exempt_a_mutation_selector() -> None:
    request = read_request([
        {
            "type": "dismiss_overlay",
            "role": "button",
            "label": "Close",
            "selector": "[data-action='approve']",
        },
    ])

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(request)

    assert error_code(raised.value) == "action_not_read_only"


def test_filter_requires_an_explicit_value() -> None:
    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(read_request([{"type": "filter", "field": "Status"}]))

    assert error_code(raised.value) == "reader_filter_value_required"


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


def test_show_detail_requires_permission_code() -> None:
    action = {"type": "show_detail", "role": "link", "name": "ML-123", "value": "ML-123"}

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(read_request([action]))

    assert error_code(raised.value) == "button_permission_required"


def test_show_detail_requires_stable_record_identity() -> None:
    action = {
        "type": "show_detail",
        "role": "link",
        "name": "Details",
        "permissionCode": "licensing.view_detail",
    }

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(read_request([action]))

    assert error_code(raised.value) == "reader_detail_identity_required"


def test_sort_requires_closed_direction() -> None:
    action = {"type": "sort", "role": "columnheader", "name": "Submission Time"}

    with pytest.raises(HTTPException) as raised:
        gateway._validate_reader_request(read_request([action]))
    assert error_code(raised.value) == "reader_sort_direction_required"

    action["direction"] = "ascending"
    gateway._validate_reader_request(read_request([action]))


def test_filter_sets_supported_text_and_native_select_controls() -> None:
    text_locator = FakeLocator(tag="input")
    select_locator = FakeLocator(tag="select")

    asyncio.run(gateway._set_filter_value(FakePage(text_locator), gateway.PortalReadAction(type="filter", field="Search", value="ML-123")))
    asyncio.run(gateway._set_filter_value(FakePage(select_locator), gateway.PortalReadAction(type="filter", field="Status", value="Pending Review")))

    assert text_locator.filled == "ML-123"
    assert select_locator.selected == ["Pending Review"]


def test_filter_sets_bounded_native_multiselect_values() -> None:
    select_locator = FakeLocator(tag="select")

    asyncio.run(gateway._set_filter_value(
        FakePage(select_locator),
        gateway.PortalReadAction(type="filter", field="Status", values=["Pending Review", "Completed"]),
    ))

    assert select_locator.selected == ["Pending Review", "Completed"]


def test_filter_rejects_unknown_or_password_controls() -> None:
    for locator in (FakeLocator(tag="div"), FakeLocator(tag="input", input_type="password")):
        with pytest.raises(RuntimeError):
            asyncio.run(
                gateway._set_filter_value(
                    FakePage(locator),
                    gateway.PortalReadAction(type="filter", field="Status", value="Pending Review"),
                )
            )


def test_runtime_click_validation_is_shared_by_selector_and_semantic_locators() -> None:
    for action in (
        gateway.PortalReadAction(type="paginate", selector="[aria-label='Next']", role="link", name="Next"),
        gateway.PortalReadAction(type="paginate", role="link", name="Next"),
    ):
        locator = FakeLocator(descriptor="Next", tag="a", rel="next")
        asyncio.run(gateway._safe_click(FakePage(locator), action))
        assert locator.clicked


def test_runtime_click_verifies_tab_and_sort_state() -> None:
    tab = FakeLocator(descriptor="To Do", role="tab", aria_selected="true")
    sort = FakeLocator(descriptor="Submission Time", role="columnheader", tag="th", aria_sort="ascending")

    asyncio.run(gateway._safe_click(FakePage(tab), gateway.PortalReadAction(type="switch_tab", role="tab", name="To Do")))
    asyncio.run(gateway._safe_click(FakePage(sort), gateway.PortalReadAction(
        type="sort", role="columnheader", name="Submission Time", direction="ascending",
    )))

    assert tab.clicked
    assert sort.clicked


@pytest.mark.parametrize("descriptor", ["Suspend", "Archive", "Enable", "Disable", "Close", "Open", "Activate", "Deactivate"])
def test_runtime_click_rejects_additional_write_descriptors(descriptor) -> None:
    action = gateway.PortalReadAction(type="paginate", role="link", name=descriptor)
    locator = FakeLocator(descriptor=descriptor, tag="a", rel="next")

    with pytest.raises(RuntimeError, match="action_not_read_only"):
        asyncio.run(gateway._safe_click(FakePage(locator), action))


@pytest.mark.parametrize("descriptor", ["Refunds 2", "Appeals", "Open tasks", "Approval tasks"])
def test_runtime_click_allows_read_only_resource_and_status_tabs(descriptor) -> None:
    action = gateway.PortalReadAction(type="switch_tab", role="tab", name=descriptor)
    locator = FakeLocator(descriptor=descriptor, role="tab", aria_selected="true")

    asyncio.run(gateway._safe_click(FakePage(locator), action))

    assert locator.clicked


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
