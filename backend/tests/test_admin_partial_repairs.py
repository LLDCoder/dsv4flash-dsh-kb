import json
from datetime import datetime, timezone

from app.portal_reader import (
    ReaderOutcome,
    ReaderResult,
    UserPermissionContext,
    _inspection_today_rollup,
    _mutation_request_refusal_result,
    _record_detail_facts,
    _self_profile_result,
)


def test_capability_profile_uses_authorized_pages_not_fixed_all_modules():
    context = UserPermissionContext(
        account="content@example.test",
        current_role="Content Manager",
        roles=("Content Manager",),
        departments=("2",),
        pages=("/content/ContentApplications", "/dashboard", "opaque-role-id-1234567890"),
    )
    result = _self_profile_result("List every business module and capability that my account can access.", context)
    assert result is not None
    text = " ".join(result.facts)
    assert "Content" in text and "Dashboard" in text
    assert "Inspection" not in text and "Finance" not in text
    assert "GetUserInfo" not in text and "2" not in text


def test_transfer_request_is_explicitly_refused_with_portal_next_step():
    result = _mutation_request_refusal_result(
        "Transfer inspection task IN-2026-0141753 to the License department."
    )
    assert result is not None and result.status == "not_confirmed"
    assert "No transfer" in " ".join(result.facts)
    assert "Inspection > Task Management" in " ".join(result.facts)
    assert "transfer_rule_not_verified" in result.missing


def test_inspection_checklist_detail_projects_materials_and_steps():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/tasks/IN-1/checklist-template",
        "status": 200,
        "responseEvidence": {"data": {"items": [
            {"step": "Identity verification", "material": "Trade licence"},
            {"step": "Site visit", "material": "Safety plan"},
        ]}},
    }]}}
    facts = _record_detail_facts("what materials and steps should I prepare?", observation, "IN-1")
    text = " ".join(facts)
    assert "Trade licence" in text and "Safety plan" in text
    assert "Identity verification" in text


def test_inspection_detail_does_not_treat_task_detail_as_checklist():
    observation = {"apiDiscovery": {"candidates": [
        {
            "operationKey": "GET /api/admin/inspection/tasks/{id}",
            "status": 200,
            "responseEvidence": {"data": {"id": 7, "taskNo": "IN-1", "targetName": "North"}},
        },
    ]}}
    facts = _record_detail_facts("what materials and steps should I prepare?", observation, "IN-1")
    assert "checklist endpoint returned" not in " ".join(facts)


def test_target_history_facts_are_scoped_and_report_completeness():
    observation = {"apiDiscovery": {"candidates": [
        {
            "operationKey": "GET /api/admin/inspection/tasks/by-target",
            "status": 200,
            "responseEvidence": {"data": {"items": [{"taskNo": "IN-1", "statusName": "Completed"}]}},
            "relatedReadReceipt": {"complete": True, "total": 1},
        },
        {
            "operationKey": "GET /api/admin/inspection/violations/by-target",
            "status": 200,
            "responseEvidence": {"data": {"items": [{"violationNo": "VN-1", "fineAmount": 100}]}},
            "relatedReadReceipt": {"complete": True, "total": 1},
        },
    ]}}
    facts = _record_detail_facts(
        "Show all past inspections and penalties for the institution behind IN-1.",
        observation,
        "IN-1",
    )
    text = " ".join(facts)
    assert "IN-1" in text and "VN-1" in text
    assert "target-scoped" in text


def test_today_rollup_does_not_count_stale_rows_as_today():
    today = datetime.now(timezone.utc).date().isoformat()
    rows = [
        {"taskNo": "IN-OLD", "createdOn": "2026-08-29", "inspectorName": "Old Inspector", "statusName": "Completed"},
        {"taskNo": "IN-TODAY", "createdOn": today, "inspectorName": "Current Inspector", "statusName": "Completed"},
    ]
    outcome = ReaderOutcome(
        ReaderResult(status="success", page="/inspection/tasks", answer_shape="list", facts=("old",)),
        {"observations": {"tasks": {"apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": rows}},
        }]}}}},
    )
    result = _inspection_today_rollup(outcome, "Summarize today's tasks by inspector, including completion rate.")
    assert result is not None and result.result.status == "success"
    assert "Current Inspector" in " ".join(result.result.facts)
    assert "Old Inspector" not in " ".join(result.result.facts)


def test_today_rollup_returns_explicit_empty_for_only_stale_rows():
    outcome = ReaderOutcome(
        ReaderResult(status="success", page="/inspection/tasks", answer_shape="list", facts=("old",)),
        {"observation": {"apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": [{"taskNo": "IN-OLD", "createdOn": "2026-08-29"}]}},
        }]}}},
    )
    result = _inspection_today_rollup(outcome, "Summarize today's tasks by inspector.")
    assert result is not None and result.result.status == "no_data"
    assert "older task rows were not counted" in result.result.facts[0]


def test_institution_history_does_not_invent_history_or_contacts():
    facts = _record_detail_facts(
        "Show all past inspections, penalties, and contacts for the institution behind IN-1.",
        {"apiDiscovery": {"candidates": []}}, "IN-1",
    )
    text = " ".join(facts)
    assert "did not return a historical inspection collection" in text
    assert "Contact details are not returned" in text
