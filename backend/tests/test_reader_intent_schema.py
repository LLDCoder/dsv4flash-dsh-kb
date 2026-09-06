from copy import deepcopy

import pytest

from app.reader_intent import (
    SLOT_NAMES, clarification_question, format_clarification_options, parse_intent_resolution,
)


CONTEXT = {"previousIntent": {
    "question": "Show current appeals for my team, including record REF-41",
    "businessObject": "appeals", "recordIdentity": "REF-41", "view": "To Do",
    "requestedScope": "team", "answerShape": "list", "page": "/old-page",
    "sourceSection": "Appeals", "facts": ["REF-99"],
}}


def plan(relation="continue", **slots):
    return {
        "relation": relation,
        "slots": {
            name: slots.get(name, {"source": "clear", "value": "", "evidence": ""})
            for name in SLOT_NAMES
        },
        "clarificationOptions": [],
    }


def slot(value, evidence=None, source="current"):
    return {"source": source, "value": value, "evidence": evidence or value}


@pytest.mark.parametrize("relation,question,slots", [
    ("continue", "Which of these need attention?", {
        "businessObject": slot("appeals", source="previous"),
        "answerShape": slot("attention"),
    }),
    ("refine", "How about the completed ones?", {
        "businessObject": slot("appeals", source="previous"),
        "view": slot("Completed", "completed"),
    }),
    ("switch", "What about refunds?", {"businessObject": slot("refunds")}),
    ("broaden", "Show all my tasks", {
        "businessObject": slot("tasks"), "requestedScope": slot("personal", "my"),
    }),
])
def test_relations_retain_only_explicitly_resolved_semantic_slots(relation, question, slots):
    payload = plan(relation, **slots)
    resolution = parse_intent_resolution(payload, question, CONTEXT)
    assert resolution.public_json() == payload
    assert resolution.planner_context(CONTEXT) == {"resolvedIntent": payload}
    assert "/old-page" not in str(resolution.planner_context(CONTEXT))
    public = resolution.public_json()
    public["slots"]["businessObject"]["value"] = "mutated"
    assert resolution.public_json() == payload


def test_clarification_allows_cleared_slots_and_uses_fixed_localized_question():
    payload = plan("clarify")
    payload["clarificationOptions"] = ["the previous appeals", "all your tasks"]
    resolution = parse_intent_resolution(payload, "What tasks need attention?", CONTEXT)
    assert clarification_question(resolution, "en") == 'Do you mean "the previous appeals" or "all your tasks"?'
    assert "你指的是" in clarification_question(resolution, "zh")
    assert "هل تقصد" in clarification_question(resolution, "ar")
    assert clarification_question(resolution, "unknown") == clarification_question(resolution, "en")


def test_clarification_context_can_be_used_by_next_answer_without_old_page_or_facts():
    previous = plan("clarify", businessObject=slot("appeals", source="previous"))
    previous["clarificationOptions"] = ["the previous appeals", "all your tasks"]
    context = {"previousIntent": {"question": "What tasks need attention?", "intentContext": previous}}
    payload = plan("broaden", businessObject=slot("tasks", "all your tasks", "previous"))
    resolved = parse_intent_resolution(payload, "The second option", context)
    assert resolved.public_json() == payload
    assert resolved.planner_context(context)["resolvedChoiceOptions"] == previous["clarificationOptions"]
    assert "previousIntent" not in resolved.planner_context(context)


def test_unicode_and_whitespace_normalized_evidence():
    payload = plan("continue", businessObject=slot("appeals", "APPEALS"))
    assert parse_intent_resolution(payload, "Show\n ＡＰＰＥＡＬＳ", {}).public_json() == payload


@pytest.mark.parametrize("source,value,evidence,question,context", [
    ("current", "REF-42", "REF-42", "Find REF-42", CONTEXT),
    ("previous", "REF-41", "record REF-41", "Find the same record", CONTEXT),
    ("previous", "REF-41", "REF-41", "Find it", {"previousIntent": {
        "intentContext": plan(recordIdentity=slot("REF-41")),
    }}),
])
def test_record_identity_is_bound_to_current_literal_or_known_previous_identity(source, value, evidence, question, context):
    payload = plan(recordIdentity=slot(value, evidence, source))
    assert parse_intent_resolution(payload, question, context).public_json() == payload


@pytest.mark.parametrize("value,evidence,source,question", [
    ("REF-99", "appeals", "previous", "Find it"),
    ("REF-42", "same", "current", "Find the same record"),
    ("REF-41", "Find it", "previous", "Find it"),
    ("REF-4", "REF-41", "current", "Find REF-41"),
])
def test_invented_or_unbound_record_identity_is_rejected(value, evidence, source, question):
    with pytest.raises(ValueError):
        parse_intent_resolution(plan(recordIdentity=slot(value, evidence, source)), question, CONTEXT)


@pytest.mark.parametrize("change", [
    lambda p: p.pop("slots"),
    lambda p: p.update(permissions=["admin"]),
    lambda p: p.update(relation="inherit_all"),
    lambda p: p["slots"].pop("filter"),
    lambda p: p["slots"].update(page=slot("/old-page")),
    lambda p: p["slots"].update(filter={"source": "history", "value": "a", "evidence": "a"}),
    lambda p: p["slots"].update(filter={"source": "clear", "value": "a", "evidence": ""}),
    lambda p: p["slots"].update(filter={"source": "current", "value": "", "evidence": "a"}),
    lambda p: p["slots"].update(filter={"source": "current", "value": "a"}),
    lambda p: p["slots"].update(filter={**slot("a"), "permissions": "all"}),
    lambda p: p["slots"].update(filter=slot("x" * 241, "a")),
    lambda p: p["slots"].update(filter=slot("a", "x" * 501)),
    lambda p: p["slots"].update(requestedScope=slot("admin", "a")),
    lambda p: p["slots"].update(answerShape=slot("export", "a")),
    lambda p: p.update(clarificationOptions=["first", "second"]),
])
def test_closed_schema_and_bounds(change):
    payload = plan()
    change(payload)
    with pytest.raises(ValueError):
        parse_intent_resolution(payload, "a", CONTEXT)


@pytest.mark.parametrize("evidence", ["/old-page", "Appeals sourceSection", "REF-99", "invented"])
def test_prior_navigation_and_fact_bundle_cannot_supply_provenance(evidence):
    with pytest.raises(ValueError):
        parse_intent_resolution(plan(filter=slot("filtered", evidence, "previous")), "Continue", CONTEXT)


@pytest.mark.parametrize("options", [
    [], ["one"], ["one", "two", "three"], ["one", "ONE"],
    ["line\nbreak", "two"], ["https://example.com", "two"],
    ["<b>one</b>", "two"], ["```one```", "two"], ["password=secret123", "two"],
    ["x" * 121, "two"], ["hidden\u202e", "two"],
    ["mailto:person@example.com", "two"], ["javascript:alert(1)", "two"],
])
def test_unsafe_or_invalid_clarification_options_are_rejected(options):
    payload = plan("clarify")
    payload["clarificationOptions"] = options
    with pytest.raises(ValueError):
        parse_intent_resolution(payload, "Which tasks?", CONTEXT)


def test_previous_credential_like_metadata_cannot_be_inherited():
    context = deepcopy(CONTEXT)
    context["previousIntent"]["filter"] = "password=not-a-real-secret"
    with pytest.raises(ValueError):
        parse_intent_resolution(plan(filter=slot("secret", "password=not-a-real-secret", "previous")), "Continue", context)


def test_non_clarifying_resolution_cannot_render_clarification():
    with pytest.raises(ValueError):
        clarification_question(parse_intent_resolution(plan(), "Continue", {}), "en")


def test_standalone_formatter_revalidates_labels_without_needing_provenance():
    assert format_clarification_options(("these appeals", "all tasks"), "en") == 'Do you mean "these appeals" or "all tasks"?'
    with pytest.raises(ValueError):
        format_clarification_options(("<script>bad</script>", "all tasks"), "en")
