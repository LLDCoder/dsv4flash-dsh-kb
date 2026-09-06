import asyncio
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))

from app.portal_reader import ReaderTimeoutBudget, observation_result_from_plan
from app.tool_gateway import ToolGateway
from test_admin_portal_reader import Gateway, Planner, portal_plan_for, principal, run_reader, user_info_for_paths


def _observation(*, healthy=True, rows=()):
    return {
        "readHealth": {"healthy": healthy, "blocked": [], "failed": [], "pending": []},
        "sectionSummaries": [{
            "nodeId": "observation-table-001",
            "kind": "table",
            "heading": "Applications",
            "rowSummaries": list(rows),
        }],
    }


def test_health_false_observation_keeps_loaded_rows_and_does_not_fallback_to_no_data() -> None:
    observation = _observation(healthy=False, rows=("APP-100 Pending Review",))
    planner = Planner(
        portal_plan_for("/licensing/applications", [{"type": "observe"}]),
        {
            "mode": "observation_result",
            "result": "success",
            "page": "/licensing/applications",
            "section": "Applications",
            "sourceSection": "observation-table-001",
            "answerShape": "list",
            "facts": ["APP-100 Pending Review"],
            "missing": [],
        },
    )
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/licensing/applications")},
        portal_result={"ok": True, "result": {"result": "not_confirmed", "observation": observation}},
    )

    outcome = run_reader(gateway, planner, question="Show my application records")

    assert outcome.result.facts == ("APP-100 Pending Review",)
    assert outcome.result.status == "success"
    assert outcome.result.status != "no_data"


def test_health_false_empty_observation_cannot_be_reduced_to_no_data() -> None:
    observation = _observation(healthy=False)
    planner = Planner(
        portal_plan_for("/licensing/applications", [{"type": "observe"}]),
        {
            "mode": "observation_result",
            "result": "no_data",
            "page": "/licensing/applications",
            "section": "Applications",
            "sourceSection": "observation-table-001",
            "answerShape": "list",
            "facts": [],
            "missing": [],
        },
    )
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/licensing/applications")},
        portal_result={"ok": True, "result": {"result": "not_confirmed", "observation": observation}},
    )

    outcome = run_reader(gateway, planner, question="Show my application records")

    assert outcome.result.status == "not_confirmed"
    assert outcome.result.status != "no_data"


def test_early_observation_failure_retains_bounded_source_versions_without_chunk_text() -> None:
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/records")},
        knowledge_result={"ok": True, "result": {"chunks": [
            {"source_name": "Admin-User-Manual-v1.md", "content": "Private reference passage."},
        ]}},
        portal_result={"ok": True, "result": {"status": "load_failed", "observation": {}}},
    )
    planner = Planner(portal_plan_for("/records", [{"type": "observe"}]))
    outcome = run_reader(gateway, planner, question="Show the current records")
    assert outcome.result.status == "load_failed"
    assert "knowledge" not in outcome.audit_evidence
    trace = outcome.audit_evidence["qualityTrace"]
    retrieval = next(entry for entry in trace if entry["stage"] == "knowledge_retrieval")
    assert retrieval["output"]["sourceNames"] == ["Admin-User-Manual-v1.md"]
    assert "Private reference passage" not in json.dumps(trace)


@pytest.mark.parametrize("trailing_observe", [False, True])
def test_initial_state_change_reduces_returned_observation_without_an_extra_read(trailing_observe) -> None:
    observation = _observation(rows=("APP-200 Completed",))
    observation["sectionSummaries"][0]["selectedState"] = "Completed"
    planner = Planner(
        portal_plan_for("/licensing/applications", [
            {"type": "switch_tab", "role": "tab", "name": "Completed"},
            *([{"type": "observe"}] if trailing_observe else []),
        ]),
        {
            "mode": "observation_result", "result": "success", "page": "/licensing/applications",
            "section": "Applications", "sourceSection": "observation-table-001", "selectedState": "Completed",
            "answerShape": "list", "facts": ["APP-200 Completed"], "missing": [],
        },
    )
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/licensing/applications")},
        portal_result={"ok": True, "result": {
            "status": "not_confirmed", "facts": [], "missing": ["Application No.", "Status"],
            "observation": observation,
        }},
    )
    outcome = run_reader(gateway, planner, question="Show the completed applications")
    assert outcome.result.status == "success"
    assert outcome.result.facts == ("APP-200 Completed",)
    assert outcome.result.selected_state == "Completed"
    assert gateway.events.count("admin.portal.read") == 1
    assert gateway.calls[-1][1]["actions"] == [{"type": "switch_tab", "role": "tab", "name": "Completed"}]
    assert planner.calls[1][2]["priorPortalRead"]["actions"][0]["name"] == "Completed"
    assert outcome.audit_evidence["observation"]


def test_headingless_table_keeps_its_node_identity_and_native_row_facts() -> None:
    observation = {"sectionSummaries": [{
        "nodeId": "table-1", "kind": "table", "heading": "",
        "columnHeaders": ["Record No.", "Status"], "rowSummaries": ["R-100 Open"],
    }]}
    plan = {
        "mode": "observation_result", "result": "success", "sourceSection": "table-1",
        "answerShape": "list", "completeness": "complete", "facts": ["R-100 Open"],
    }
    result = observation_result_from_plan(plan, observation)
    assert result is not None and result.status == "success"
    assert result.completeness == "bounded"
    assert observation_result_from_plan({**plan, "sourceSection": "unknown-table"}, observation) is None


def test_native_row_fields_prevent_column_splitting_cross_row_join_and_duplicate_keys() -> None:
    rows = [
        {"Record No.": "R-100", "Customer": "George Business", "Issue Category": "General", "Status": "Open"},
        {"Record No.": "R-200", "Customer": "Another Business", "Issue Category": "Other", "Status": "Closed"},
    ]
    observation = {"sectionSummaries": [{
        "nodeId": "table-1", "kind": "table", "heading": "", "columnHeaders": list(rows[0]),
        "rowSummaries": ["R-100 George Business General Open", "R-200 Another Business Other Closed"],
        "rowFields": rows,
    }]}
    plan = {"mode": "observation_result", "result": "success", "sourceSection": "table-1", "answerShape": "list"}
    good = json.dumps({"Record No.": "R-100", "Status": "Open"})
    result = observation_result_from_plan({**plan, "facts": [good]}, observation)
    assert result is not None and result.facts == (good,)
    for bad in (
        json.dumps({"Record No.": "R-100", "Customer": "George", "Issue Category": "Business"}),
        json.dumps({"Record No.": "R-100", "Status": "Closed"}),
        '{"Record No.":"R-100","Status":"Closed","Status":"Open"}',
        "Record No.: R-100, Customer: George, Issue Category: Business",
    ):
        assert observation_result_from_plan({**plan, "facts": [bad]}, observation) is None


def test_structured_cells_survive_both_tool_and_planner_projection_without_secrets() -> None:
    observation = {"sectionSummaries": [{
        "nodeId": "table-1", "kind": "table", "heading": "", "columnHeaders": ["Record No.", "Status"],
        "rowSummaries": ["R-100 Open"], "rowFields": [{"Record No.": "R-100", "Status": "Open", "password": "secret"}],
    }]}
    class Platform:
        portal_base_url = "https://admin.example.test"

        async def admin_portal_read(self, *args, **kwargs):
            return {"status": "not_confirmed", "observation": observation}

    initial = portal_plan_for("/licensing/applications", [{"type": "observe"}])
    projected = asyncio.run(ToolGateway(None, Platform()).invoke(principal(), "admin.portal.read", initial["portalRequest"]))
    planner = Planner(initial, {
        "mode": "observation_result", "result": "success", "sourceSection": "table-1", "answerShape": "list",
        "facts": [json.dumps({"Record No.": "R-100", "Status": "Open"})],
    })
    gateway = Gateway(info={"ok": True, "result": user_info_for_paths("/licensing/applications")}, portal_result=projected)
    outcome = run_reader(gateway, planner, question="Show my application records")
    assert outcome.result.status == "success"
    cells = planner.calls[1][2]["portalObservation"]["sectionSummaries"][0]["rowFields"]
    assert cells == [{"Record No.": "R-100", "Status": "Open"}]
    assert "secret" not in str(projected)


def test_redundant_observe_normalization_does_not_hide_unsafe_metadata() -> None:
    planner = Planner(portal_plan_for("/licensing/applications", [
        {"type": "switch_tab", "role": "tab", "name": "Completed"},
        {"type": "observe", "method": "POST"},
    ]))
    gateway = Gateway(info={"ok": True, "result": user_info_for_paths("/licensing/applications")})
    outcome = run_reader(gateway, planner, question="Show the completed applications")
    assert outcome.result.status != "success"
    assert "admin.portal.read" not in gateway.events


def test_portal_stage_timeout_is_load_failed() -> None:
    class SlowGateway(Gateway):
        async def invoke(self, current_principal, tool_name, arguments, *, allowed_tools=None):
            if tool_name == "admin.portal.read":
                await asyncio.sleep(0.05)
            return await super().invoke(current_principal, tool_name, arguments, allowed_tools=allowed_tools)

    planner = Planner(portal_plan_for("/licensing/applications", [{"type": "observe"}]))
    gateway = SlowGateway(info={"ok": True, "result": user_info_for_paths("/licensing/applications")})
    budget = ReaderTimeoutBudget(
        total_seconds=2,
        get_user_info_seconds=1,
        knowledge_search_seconds=1,
        planner_seconds=1,
        portal_read_seconds=0.001,
    )

    outcome = run_reader(
        gateway,
        planner,
        timeout_budget=budget,
        question="Show my application records",
    )

    assert outcome.result.status == "load_failed"


def test_policy_rejects_excessive_actions_before_dispatch() -> None:
    actions = [{"type": "observe"}] * 13
    planner = Planner(portal_plan_for("/licensing/applications", actions))
    gateway = Gateway(info={"ok": True, "result": user_info_for_paths("/licensing/applications")})

    outcome = run_reader(gateway, planner, question="Show my application records")

    assert outcome.result.status == "not_confirmed"
    assert gateway.events.count("admin.portal.read") == 0


class SequencedGateway(Gateway):
    def __init__(self, observations, **kwargs):
        super().__init__(**kwargs)
        self.observations = list(observations)

    async def invoke(self, current_principal, tool_name, arguments, *, allowed_tools=None):
        if tool_name == "knowledge.search":
            return await super().invoke(current_principal, tool_name, arguments, allowed_tools=allowed_tools)
        self.events.append(tool_name)
        self.calls.append((tool_name, arguments, allowed_tools))
        if tool_name == "admin.portal.read":
            value = self.observations.pop(0)
            return {"ok": True, "result": value}
        return self.portal_result


def _three_read_plans(*, third_actions=None):
    third_actions = third_actions or [{"type": "query", "role": "row", "name": "Application No."}]
    return (
        portal_plan_for("/dashboard", [{"type": "observe"}]),
        {
            "mode": "observation_result", "result": "success", "page": "/dashboard",
            "section": "My Tasks", "sourceSection": "observation-region-001",
            "answerShape": "overview", "facts": ["Enquiries & Complaints 2"], "missing": [],
        },
        portal_plan_for("/dashboard", [{"type": "switch_tab", "role": "tab", "name": "Enquiries & Complaints 2"}]),
        portal_plan_for("/licensing/applications", third_actions),
        {
            "mode": "observation_result", "result": "success", "page": "/licensing/applications",
            "section": "Applications", "sourceSection": "observation-table-001",
            "answerShape": "list", "facts": ["EC-101 Open"], "missing": [],
        },
    )


def _three_read_observations():
    return [
        {"result": "success", "observation": {"regionSummaries": [{"nodeId": "observation-region-001", "heading": "My Tasks", "controls": ["Enquiries & Complaints 2"]}]}},
        {"result": "success", "observation": {"regionSummaries": [{"nodeId": "observation-region-001", "heading": "My Tasks", "selectedState": "Enquiries & Complaints 2", "controls": ["Enquiries & Complaints 2"]}]}},
        {"result": "not_confirmed", "observation": {"readHealth": {"healthy": False}, "sectionSummaries": [{"nodeId": "observation-table-001", "kind": "table", "heading": "Applications", "rowSummaries": ["EC-101 Open"]}]}},
    ]


def test_three_reads_replay_rows_from_not_confirmed_observation() -> None:
    plans = _three_read_plans()
    planner = Planner(*plans)
    gateway = SequencedGateway(
        _three_read_observations(),
        info={"ok": True, "result": user_info_for_paths("/dashboard", "/licensing/applications")},
    )

    outcome = run_reader(
        gateway, planner, question="show me the list",
        conversation_context={"previousIntent": {"question": "How about my enquiries tasks?", "answerShape": "overview", "page": "/dashboard", "section": "My Tasks"}},
    )

    assert gateway.events.count("admin.portal.read") == 3
    assert outcome.audit_evidence["stage"] == "completed_after_bounded_replay"
    assert outcome.result.facts == ("EC-101 Open",)


def test_third_read_timeout_is_load_failed() -> None:
    class SlowThirdGateway(SequencedGateway):
        async def invoke(self, current_principal, tool_name, arguments, *, allowed_tools=None):
            if tool_name == "admin.portal.read" and self.events.count("admin.portal.read") >= 2:
                await asyncio.sleep(0.05)
            return await super().invoke(current_principal, tool_name, arguments, allowed_tools=allowed_tools)

    planner = Planner(*_three_read_plans())
    gateway = SlowThirdGateway(_three_read_observations(), info={"ok": True, "result": user_info_for_paths("/dashboard", "/licensing/applications")})
    budget = ReaderTimeoutBudget(total_seconds=2, get_user_info_seconds=1, knowledge_search_seconds=1, planner_seconds=1, portal_read_seconds=0.001)

    outcome = run_reader(gateway, planner, timeout_budget=budget, question="show me the list", conversation_context={"previousIntent": {"question": "How about my enquiries tasks?", "answerShape": "overview", "page": "/dashboard", "section": "My Tasks"}})

    assert outcome.result.status == "load_failed"
    assert gateway.events.count("admin.portal.read") == 2
    assert outcome.audit_evidence["stage"] == "portal_read_after_read_state_change"
    assert outcome.result.missing == ("portal_read_timeout",)


def test_cumulative_action_limit_blocks_third_read() -> None:
    plans = _three_read_plans(third_actions=[{"type": "query", "role": "row", "name": "Application No."}] * 11)
    planner = Planner(*plans)
    gateway = SequencedGateway(_three_read_observations(), info={"ok": True, "result": user_info_for_paths("/dashboard", "/licensing/applications")})

    outcome = run_reader(gateway, planner, question="show me the list", conversation_context={"previousIntent": {"question": "How about my enquiries tasks?", "answerShape": "overview", "page": "/dashboard", "section": "My Tasks"}})

    assert outcome.result.status == "not_confirmed"
    assert gateway.events.count("admin.portal.read") == 2
