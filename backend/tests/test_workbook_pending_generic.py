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


def test_websocket_message_limit_is_shared_with_the_browser_contract():
    assert MAX_CHAT_MESSAGE_CHARS == 10_000
    message = WSMessage(type="message", content="x" * MAX_CHAT_MESSAGE_CHARS, clientMessageId="m-1")
    assert len(message.content) == MAX_CHAT_MESSAGE_CHARS
    assert WSMessage(type="message", content="x", clientMessageId="m-2", responseLanguage="ar").response_language == "ar"


def test_selected_portal_language_wins_for_each_turn_without_breaking_explicit_requests():
    assert _response_language_for("Please show my license status.", "ar") == "ar"
    assert _response_language_for("ما الذي يمكنك فعله من أجلي؟", "ar") == "ar"
    assert _response_language_for("Please answer in English.", "ar") == "en"
