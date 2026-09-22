from app.skills import (
    normalize_response_language,
    resolve_response_language,
    response_language_for,
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
