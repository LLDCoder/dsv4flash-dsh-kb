import pytest

from app.portal_reader import _named_group_in_question, _ticket_team_summary_requested


@pytest.mark.parametrize("question", [
    "Summarize all pending and overdue tasks for each member of my team.",
    "Summarize pending and overdue tasks for every member of our team.",
    "List overdue tasks for all members of my team.",
    "List overdue tasks for members of the current team.",
    "قم بتلخيص جميع المهام المعلقة والمتأخرة لكل عضو في فريقي.",
])
def test_generic_member_rollup_does_not_invent_a_named_group(question):
    assert _named_group_in_question(question) == ""
    assert _ticket_team_summary_requested(question)


@pytest.mark.parametrize("question", [
    "List overdue tasks for each member of the Foreign Media team.",
    "List overdue tasks for the Foreign Media team.",
    "List overdue tasks in the Foreign Media department.",
])
def test_explicit_group_remains_subject_to_observed_group_guard(question):
    assert _named_group_in_question(question) == "Foreign Media"
