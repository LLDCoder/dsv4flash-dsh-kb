from app.portal_reader import _native_metric_trend_fallback, reader_answer_shape
from app.schemas import MAX_CHAT_MESSAGE_CHARS, WSMessage
from app.service import _response_language_for, reader_evidence_only_response, reader_natural_answer_is_grounded


def test_cross_language_metric_follow_up_keeps_the_named_metric_and_reports_missing_history():
    context = {"previousIntent": {"question": "What is my SLA Compliance value on my performance panel?"}}
    assert reader_answer_shape("What is my SLA Compliance value?", context) == "count"
    assert reader_answer_shape("ما هي وحدته وهل هناك اتجاه تاريخي؟", context) == "overview"
    result = _native_metric_trend_fallback(
        {"metrics": [{"label": "SLA Compliance", "value": "92%"}, {"label": "Avg. Processing Time", "value": "3d"}]},
        page="/dashboard",
        scope="personal",
        question="ما هي وحدته وهل هناك اتجاه تاريخي؟",
        conversation_context=context,
    )
    assert result is not None
    assert result.workflow_state == "metric_trend_unavailable"
    assert result.facts[0] == "SLA Compliance: 92%"
    assert "No historical data" in result.facts[1]
    answer = reader_evidence_only_response(
        {**result.public_json(), "facts": list(result.facts)}, "en",
        question="What is its unit and did it change over the last 7 days?",
    )
    assert "SLA Compliance: 92%" in answer
    assert "No historical data" in answer
    assert "Avg. Processing Time" not in answer


def test_refund_amount_presentation_keeps_rows_total_and_missing_currency_boundary():
    evidence = {
        "result": "success",
        "answerShape": "list",
        "completeness": "bounded",
        "sourceSection": "observation-table-001",
        "facts": [
            '{"Refund No":"HC-02-2026-5239576","Amount":-200.00,"Status":"Completed"}',
            '{"Refund No":"HC-02-2026-1111111","Amount":-100.00,"Status":"Completed"}',
        ],
    }
    answer = reader_evidence_only_response(evidence, "en", question="List each amount and currency and the total.")
    assert "-200.0" in answer and "-100.0" in answer and "-300.00" in answer
    assert "does not provide a currency field" in answer
    assert not reader_natural_answer_is_grounded(
        "Confirmed details only.", "-200.00; -100.00", "List each amount and the total.", completeness="bounded"
    )
    assert reader_natural_answer_is_grounded(
        "The amounts are -200.00 and -100.00; the displayed-record total is -300.00.",
        "-200.00; -100.00\nTotal of the displayed records: -300.00.",
        "List each amount and the total.",
        completeness="bounded",
    )


def test_arabic_refund_list_localizes_dynamic_field_names_and_enum_values():
    evidence = {
        "result": "success",
        "answerShape": "list",
        "completeness": "bounded",
        "facts": [
            '{"Page Index":1,"Page Size":10,"Total Count":20}',
            '{"Items Refund No":"HC-02-2026-5239576","Items Status":"Completed","Items Type":"Refund","Items Refund Scope":"Full","Items Payment Method":"Credit Debit Card","Items Amount":-200.0,"Items Currency":"AED"}',
        ],
    }
    answer = reader_evidence_only_response(
        evidence,
        "ar",
        question="ما مبلغ وعمِلة طلب الاسترداد المكتمل الظاهر في هذه الصفحة؟",
    )
    assert "رقم الاسترداد" in answer
    assert "الحالة: مكتمل" in answer
    assert "النوع: استرداد" in answer
    assert "نطاق الاسترداد: كامل" in answer
    assert "طريقة الدفع: بطاقة ائتمانية/خصم" in answer
    assert "المبلغ: -200.0" in answer
    assert "العملة: AED" in answer
    assert "Items Status" not in answer
    assert "Items Amount" not in answer


def test_explicit_refund_identity_not_confirmed_is_record_specific_in_english_and_arabic():
    evidence = {
        "result": "not_confirmed",
        "facts": [],
        "missing": ["evidence_not_confirmed"],
    }
    english = reader_evidence_only_response(
        evidence,
        "en",
        question="For the real refund record HC-02-2026-5239576, provide its status, amount, currency, and last updated time in English.",
    )
    arabic = reader_evidence_only_response(
        evidence,
        "ar",
        question="للسجل الحقيقي لطلب الاسترداد HC-02-2026-5239576، يرجى تزويدي بالحالة والمبلغ والعملة ووقت آخر تحديث باللغة العربية.",
    )
    assert "HC-02-2026-5239576" in english
    assert "I could not find or confirm refund record" in english
    assert "I have not substituted another refund record" in english
    assert "HC-02-2026-5239576" in arabic
    assert "لم أتمكن من العثور" in arabic
    assert "سجل استرداد آخر" in arabic
    assert "تعذر تأكيد المعلومات المطلوبة" not in arabic


def test_websocket_message_limit_is_shared_with_the_browser_contract():
    assert MAX_CHAT_MESSAGE_CHARS == 10_000
    message = WSMessage(type="message", content="x" * MAX_CHAT_MESSAGE_CHARS, clientMessageId="m-1")
    assert len(message.content) == MAX_CHAT_MESSAGE_CHARS
    assert WSMessage(type="message", content="x", clientMessageId="m-2", responseLanguage="ar").response_language == "ar"


def test_selected_portal_language_wins_for_each_turn_without_breaking_explicit_requests():
    assert _response_language_for("Please show my license status.", "ar") == "ar"
    # The current UI language is authoritative when the user does not
    # explicitly request another output language, even if the prompt is in
    # English (the regression covered by workbook item 45).
    assert _response_language_for("What can you do for me?", "ar") == "ar"
    assert _response_language_for("ما الذي يمكنك فعله من أجلي؟", "ar") == "ar"
    assert _response_language_for("Please answer in English.", "ar") == "en"


def test_mixed_language_clarification_uses_default_language_instead_of_echoing_wrong_script():
    answer = reader_evidence_only_response(
        {
            "result": "not_confirmed",
            "facts": [],
            "missing": ["intent_ambiguous"],
            "intentContext": {"relation": "clarify", "clarificationOptions": [
                "طلب مساعدة بخصوص UAE PASS", "طلب بخصوص العمل والمهام",
            ]},
            "clarificationOptions": ["طلب مساعدة بخصوص UAE PASS", "طلب بخصوص العمل والمهام"],
        },
        "en",
        question="How do I get UAE PASS?",
    )
    assert answer.startswith("I can continue in English or Arabic.")
    assert "طلب مساعدة" not in answer


def test_cross_script_fallback_explains_supported_languages_in_default_language():
    answer = reader_evidence_only_response(
        {"result": "not_confirmed", "facts": [], "missing": ["no_match"]},
        "en",
        question="كيف أحصل على UAE PASS؟",
    )
    assert answer.startswith("I could not confirm the requested information.")
    assert "Supported response languages are English and Arabic." in answer


def test_uae_pass_public_guidance_is_answered_without_claiming_portal_records():
    answer = reader_evidence_only_response(
        {"result": "not_confirmed", "facts": [], "missing": ["knowledge_gap"]},
        "en",
        question="How do I get UAE PASS?",
    )
    assert answer.startswith("To get UAE PASS")
    assert "password" in answer and "one-time code" in answer


def test_symbol_heavy_input_gets_a_single_language_supported_request_prompt():
    answer = reader_evidence_only_response(
        {
            "result": "not_confirmed",
            "facts": [],
            "missing": ["intent_ambiguous"],
            "intentContext": {"relation": "clarify", "clarificationOptions": ["one", "two"]},
            "clarificationOptions": ["one", "two"],
        },
        "en",
        question="$$!!%% @@## 😂🔥 qwezxcv",
    )
    assert answer.startswith("I could not identify a supported request.")
    assert "Do you mean" not in answer
