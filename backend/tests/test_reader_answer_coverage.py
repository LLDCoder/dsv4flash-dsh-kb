import pytest

from app.portal_reader import PRIOR_LIST_SAMPLE_FACT, previous_sample_explanation
from app.service import _reader_conversation_context, reader_evidence_only_response
from test_admin_portal_reader import Gateway, Planner, run_reader
from test_service_reader_context import event


PRIOR = {"previousIntent": {"question": "Show three records", "resultStatus": "success",
                            "deliveredAnswerShape": "list", "completeness": "bounded"}}


@pytest.mark.parametrize("question", [
    "Is that the total number, or only the sample you listed?",
    "Is this all or just a sample?", "这是总数还是你列出的样本？",
])
def test_answer_coverage_uses_only_verified_presentation_metadata(question):
    gateway, planner = Gateway(), Planner()
    outcome = run_reader(gateway, planner, question=question, conversation_context=PRIOR)
    assert outcome.result.status == "success"
    assert "sample" in outcome.result.facts[0]
    assert "separately verified total" in outcome.result.facts[0]
    assert gateway.events == ["GetUserInfo"]
    assert planner.calls == []


@pytest.mark.parametrize("field,value", [
    ("resultStatus", "not_confirmed"), ("resultStatus", "no_data"),
    ("deliveredAnswerShape", "count"), ("deliveredAnswerShape", "overview"),
    ("completeness", "complete"), ("completeness", "unknown"),
])
def test_missing_or_different_presentation_evidence_does_not_invent_a_sample(field, value):
    context = {"previousIntent": {**PRIOR["previousIntent"], field: value}}
    assert previous_sample_explanation("Is that total or only a sample?", context) is None


@pytest.mark.parametrize("question", ["How many records are there now?", "Show all records.", "List the next page."])
def test_current_data_questions_cannot_use_old_presentation_metadata(question):
    assert previous_sample_explanation(question, PRIOR) is None


@pytest.mark.parametrize("with_intent", [False, True])
def test_service_retains_only_previous_presentation_metadata(with_intent):
    previous = event(1, "user.message", {"content": "Show three records"})
    result = {"result": "success", "answerShape": "list", "completeness": "bounded",
              "facts": ['{"Reference":"PRIVATE-123"}']}
    if with_intent:
        result["intentContext"] = {"relation": "refine", "slots": {"answerShape": {
            "source": "current", "value": "list", "evidence": "Show",
        }}, "clarificationOptions": []}
    current = event(3, "user.message", {"content": "Is that total or a sample?"})
    context = _reader_conversation_context([previous, event(2, "reader.result", result), current], current)
    assert context["previousIntent"]["completeness"] == "bounded"
    assert context["previousIntent"]["deliveredAnswerShape"] == "list"
    assert "PRIVATE-123" not in str(context)


@pytest.mark.parametrize("language", ["en", "zh", "ar"])
def test_sample_explanation_bypasses_formatter_without_retracting_earlier_total(language):
    result = {"result": "success", "answerShape": "detail", "facts": [PRIOR_LIST_SAMPLE_FACT], "missing": []}
    response = reader_evidence_only_response(result, language, prior_answer_coverage=True)
    assert response
    assert not any(char.isdigit() for char in response)
    if language == "en":
        assert "immediately preceding list" in response
        assert "does not change any separately verified total" in response
    assert reader_evidence_only_response(result, language) is None


@pytest.mark.parametrize("patch", [
    {"answerShape": "count"}, {"facts": [PRIOR_LIST_SAMPLE_FACT, "Total 493"]},
    {"facts": ["The earlier total was just a sample."]}, {"missing": ["unverified"]},
])
def test_coverage_guard_does_not_trust_generated_or_mixed_facts(patch):
    result = {"result": "success", "answerShape": "detail", "facts": [PRIOR_LIST_SAMPLE_FACT], "missing": [], **patch}
    assert reader_evidence_only_response(result, "en", prior_answer_coverage=True) is None
