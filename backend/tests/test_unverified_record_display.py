"""Display contracts only; these fixtures are not live acceptance data."""
import pytest

from app.service import reader_evidence_only_response


@pytest.mark.parametrize('language,question,false_claim', [
    ('en', 'Has payment completed for ABC-47? What amount was paid?', 'I located'),
    ('ar', 'هل اكتمل دفع الطلب ABC-47 وما المبلغ المدفوع؟', 'وجدت الطلب'),
    ('ar', 'اعرض مبلغ الرسوم وعملة الطلب ABC-47.', 'وجدت الطلب'),
    ('zh', 'ABC-47 的支付金额是什么？', '已定位'),
])
def test_unverified_details_do_not_claim_location_or_refund(language, question, false_claim):
    result = {'result': 'not_confirmed', 'facts': [],
              'page': '/licensing/applications',
              'missing': ['license_application_detail_unverified']}
    answer = reader_evidence_only_response(result, language, question=question)
    assert 'ABC-47' in answer
    assert false_claim not in answer
    assert 'refund' not in answer.casefold() and 'استرداد' not in answer
    assert '退款' not in answer and 'Licensing / Applications' not in answer
    assert 'give' not in answer.casefold() and 'أعطِ' not in answer


@pytest.mark.parametrize('language,question,expected', [
    ('en', 'What happened to refund RF-47?', 'refund record RF-47'),
    ('ar', 'اعرض الاسترداد RF-47.', 'سجل الاسترداد RF-47'),
])
def test_explicit_refund_still_preserves_its_object(language, question, expected):
    answer = reader_evidence_only_response(
        {'result': 'not_confirmed', 'facts': [], 'page': '/financial-payment/refunds'},
        language, question=question)
    assert expected in answer


@pytest.mark.parametrize('language', ['en', 'ar'])
def test_already_read_detail_does_not_request_the_identifier_again(language):
    from app.service import _reader_next_step_sentence
    result = {'result': 'not_confirmed', 'page': 'Licensing / Applications',
              'workflowState': 'authorized_record_detail',
              'facts': ['Verified record status: Cancelled.'],
              'missing': ['application_payment_detail_incomplete']}
    assert _reader_next_step_sentence(result, language) == ''


@pytest.mark.parametrize('workflow,facts', [('', ['Matched row']),
                                         ('authorized_record_detail', [])])
def test_unverified_details_still_have_a_next_step(workflow, facts):
    from app.service import _reader_next_step_sentence
    result = {'result': 'not_confirmed', 'page': 'Licensing / Applications',
              'workflowState': workflow, 'facts': facts,
              'missing': ['detail_field_unavailable']}
    assert _reader_next_step_sentence(result, 'en')
