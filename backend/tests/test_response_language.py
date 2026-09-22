from app.service import DSHService
from app.skills import (
    normalize_response_language,
    resolve_response_language,
    response_language_for,
    response_language_mismatch,
    response_language_name,
)


def test_message_language_wins_over_portal_language():
    assert response_language_for("How many licenses do I have?") == "en"
    assert response_language_for("مرحبا، كم عدد التراخيص المتاحة؟") == "ar"
    assert resolve_response_language("How many licenses do I have?", "ar") == "en"
    assert resolve_response_language("مرحبا، كم عدد التراخيص المتاحة؟", "en") == "ar"


def test_messages_without_language_signal_fall_back_to_the_portal_language():
    for text in ("", "17", "ML-3-7-5263529", "12/09/2026", "🙂", "  -  "):
        assert response_language_for(text) is None, text
        assert resolve_response_language(text, "ar") == "ar", text
        assert resolve_response_language(text, "en-AE") == "en", text
        assert resolve_response_language(text, None) == "en", text


def test_unknown_portal_language_falls_back_to_english():
    assert normalize_response_language("ar-AE") == "ar"
    assert normalize_response_language("zh_CN") == "zh"
    assert normalize_response_language("fr-FR") is None
    assert resolve_response_language("17", "fr-FR") == "en"


def test_generated_answer_must_use_the_resolved_language():
    english_answer = "I only received the number 17 without any context. Could you tell me what this refers to?"
    assert response_language_mismatch(english_answer, "ar") is True
    assert response_language_mismatch(english_answer, "en") is False
    arabic_answer = "لم أتلقَّ سوى الرقم 17 دون أي سياق. هل يمكنك توضيح ما الذي تقصده بالضبط؟"
    assert response_language_mismatch(arabic_answer, "ar") is False
    assert response_language_mismatch(arabic_answer, "en") is True
    # identifiers, references and short answers are never treated as a violation
    assert response_language_mismatch("ML-3-7-5263529", "ar") is False
    assert response_language_mismatch("17", "ar") is False
    assert response_language_name("ar") == "ARABIC"


def test_router_clarification_is_kept_only_in_the_resolved_language():
    english_question = {"needsClarification": True, "clarifyingQuestion": "Which record do you mean?"}
    assert DSHService.clarification_message(english_question, "en") == "Which record do you mean?"
    assert DSHService.clarification_message(english_question, "ar").startswith("هل يمكنك توضيح")

    arabic_question = {"needsClarification": True, "clarifyingQuestion": "أي سجل تقصد؟"}
    assert DSHService.clarification_message(arabic_question, "ar") == "أي سجل تقصد؟"
    assert DSHService.clarification_message(arabic_question, "en").startswith("Could you clarify")

    assert DSHService.clarification_message({"needsClarification": False}, "ar") is None
