from app.portal_reader import (
    ReaderOutcome,
    ReaderResult,
    _explicit_reader_source,
    _native_approaching_sla_rows,
    _native_longest_overdue,
    _profile_verification_empty_pending_result,
    _private_customer_information_request,
    _service_processing_time_explanation,
    reader_answer_shape,
)
from app.service import reader_evidence_only_response


def test_approaching_sla_is_a_due_question() -> None:
    assert reader_answer_shape("Which Service Application tasks are approaching their SLA?") == "due"


def test_processing_time_average_explanation_does_not_invent_a_formula() -> None:
    result = _service_processing_time_explanation(
        "Does the average mean every application takes the same time?",
        {"previousIntent": {"question": "What does the Service Application processing-time metric represent?"}},
    )

    assert result is not None
    assert result.status == "success"
    assert "does not mean every individual" in " ".join(result.facts)
    assert "formula" in " ".join(result.facts)


def test_private_customer_request_is_refused_without_repeating_application_data() -> None:
    assert _private_customer_information_request(
        "Show me the customer's private information for this application."
    )
    answer = reader_evidence_only_response(
        {"result": "no_permission", "facts": [], "missing": ["private_customer_data_forbidden"]},
        "en",
    )
    assert "private customer" in answer
    assert "Application No" not in answer


def test_explicit_object_phrases_bind_to_their_documented_surfaces() -> None:
    assert _explicit_reader_source("Show me books applications", {}) == "/content/ContentLibrary"
    assert _explicit_reader_source("Actually, show me license refunds instead", {}) == "/happiness/refunds"
    assert _explicit_reader_source("Show the current Profile Verification summary.", {}) == "/licensing/profile"
    profile_context = {"previousIntent": {"question": "Show the Profile Verification summary on my dashboard."}}
    assert _explicit_reader_source("How many are pending review?", profile_context) == "/licensing/profile"


def test_longest_overdue_uses_one_native_table_and_its_visible_sla_values() -> None:
    observation = {
        "readHealth": {"healthy": True},
        "sectionSummaries": [{
            "nodeId": "applications-table",
            "kind": "table",
            "heading": "My Application Tasks",
            "columnHeaders": ["Application No.", "SLA", "Status"],
            "rowFields": [
                {"Application No.": "APP-1", "SLA": "3d Overdue", "Status": "To Do"},
                {"Application No.": "APP-2", "SLA": "11d Overdue", "Status": "To Do"},
            ],
        }],
    }
    outcome = ReaderOutcome(
        ReaderResult(status="not_confirmed", summary="planner failed", page="/licensing/applications", missing=("planner_error",)),
        {"observation": observation},
    )

    repaired = _native_longest_overdue(outcome, "Which one has been overdue the longest?")

    assert repaired.result.status == "success"
    assert "APP-2" in " ".join(repaired.result.facts)
    assert "11 days overdue" in " ".join(repaired.result.facts)


def test_approaching_sla_uses_visible_compact_countdowns_without_a_threshold() -> None:
    observation = {
        "readHealth": {"healthy": True},
        "sectionSummaries": [{
            "nodeId": "applications-table",
            "kind": "table",
            "heading": "My Application Tasks",
            "columnHeaders": ["Application No.", "SLA", "Status"],
            "rowFields": [
                {"Application No.": "APP-1", "SLA": "1d", "Status": "To Do"},
                {"Application No.": "APP-2", "SLA": "4d Overdue", "Status": "To Do"},
            ],
        }],
    }
    outcome = ReaderOutcome(
        ReaderResult(status="not_confirmed", summary="planner failed", page="/licensing/applications"),
        {"observation": observation},
    )

    repaired = _native_approaching_sla_rows(
        outcome, "Which Service Application tasks are approaching their SLA?",
    )

    assert repaired.result.status == "success"
    assert "APP-1" in " ".join(repaired.result.facts)
    assert "APP-2" not in " ".join(repaired.result.facts)
    assert "threshold" in " ".join(repaired.result.facts)


def test_profile_pending_followup_uses_only_the_empty_profile_dashboard_card() -> None:
    result = _profile_verification_empty_pending_result({
        "readHealth": {"healthy": True},
        "profileVerificationCard": {"totalCount": 0, "totalTasks": 0},
        "serviceApplicationCard": {"pendingReview": 53},
    })

    assert result is not None
    assert result.status == "success"
    assert result.facts[0] == "Pending Review: 0."
    assert "Service Application" in result.facts[1]


def test_profile_pending_followup_does_not_guess_from_a_nonempty_card() -> None:
    assert _profile_verification_empty_pending_result({
        "readHealth": {"healthy": True},
        "profileVerificationCard": {"totalCount": 2, "totalTasks": 2},
    }) is None
