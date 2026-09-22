from app.service import DSHService
from app.skills import (
    detect_message_language,
    needs_language_notice,
    normalize_response_language,
    resolve_response_language,
    response_language_for,
    response_language_mismatch,
    response_language_name,
    unsupported_language_notice,
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
    assert normalize_response_language("en-US") == "en"
    assert normalize_response_language("zh_CN") is None
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


def test_only_english_and_arabic_are_supported():
    assert response_language_for("How many licenses do I have?") == "en"
    assert response_language_for("كم عدد التراخيص المتاحة؟") == "ar"
    assert response_language_for("你好，我有多少张许可证？") is None
    assert response_language_for("Сколько у меня лицензий?") is None


def test_other_languages_are_detected_and_noticed():
    for text in (
        "Bonjour, combien de licences ai-je ?",
        "¿Cuántas licencias tengo?",
        "Wie viele Lizenzen habe ich?",
        "Combien de licences ai-je ?",
        "Сколько у меня лицензий?",
        "你好，我有多少张许可证？",
        "こんにちは、ライセンスはいくつありますか？",
    ):
        assert detect_message_language(text) == "other", text
        assert needs_language_notice(text) is True, text
        assert response_language_for(text) is None, text

    assert needs_language_notice("How many licenses do I have?") is False
    assert unsupported_language_notice("en").startswith("Note: I can help in English or Arabic")
    assert unsupported_language_notice("ar").startswith("ملاحظة")


def test_plain_english_is_not_flagged_as_another_language():
    for text in (
        "Where can I pay this fine?",
        "Show my violations and fines.",
        "I received an inspection notice. What should I do?",
        "What is the status of my application?",
    ):
        assert detect_message_language(text) == "en", text
