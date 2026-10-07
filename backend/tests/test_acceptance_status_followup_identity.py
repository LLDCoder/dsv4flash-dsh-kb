"""Context contracts only; native deployed browser reads provide acceptance."""
import pytest
from app.portal_reader import _single_application_status_followup, _finance_application_result


@pytest.mark.parametrize('question', [
    'What is the payment status?', 'What is the complaint status?',
    'ما هي حالة الدفع؟', 'ما هو وضع الشكوى؟',
])
def test_single_requested_identity_survives_status_object_change(question):
    context = {'previousIntent': {'question': 'Licensing status of ML-7-8-1234567?',
        'resultStatus': 'not_confirmed'}}
    assert _single_application_status_followup(question, context).endswith('ML-7-8-1234567')
    context['previousIntent'] = {'question': 'What is the payment status?',
        'recordIdentity': 'ML-7-8-1234567', 'resultStatus': 'success'}
    assert _single_application_status_followup(question, context).endswith('ML-7-8-1234567')


@pytest.mark.parametrize('previous', [
    {'question': 'Statuses of ML-7-8-1234567 and ML-7-8-7654321', 'resultStatus': 'success'},
    {'question': 'ML-7-8-1234567', 'resultStatus': 'no_permission'},
    {'question': 'List payments', 'resultStatus': 'success'},
    {'recordIdentity': 'ML-7-8-1234567', 'resultStatus': 'load_failed'},
])
def test_no_guess_from_multi_record_list_or_denied_failed_read(previous):
    question = 'What is the payment status?'
    assert _single_application_status_followup(question, {'previousIntent': previous}) == question


@pytest.mark.parametrize('question', ['Show all payments', 'What is the status of HC-01-2026-1234567?',
    'What is the payment status of ML-7-8-7654321?'])
def test_new_identity_or_collection_is_not_overwritten(question):
    context = {'previousIntent': {'recordIdentity': 'ML-7-8-1234567', 'resultStatus': 'success'}}
    assert _single_application_status_followup(question, context) == question


def test_exact_payment_result_persists_identity_not_list_first_row():
    result = _finance_application_result({'ML-7-8-1234567': ({'status': 'Completed'},)},
        question='Payment status?', scope='personal', complete=True)
    assert result.record_identity == 'ML-7-8-1234567'
    multiple = _finance_application_result({'ML-7-8-1234567': (), 'ML-7-8-7654321': ()},
        question='Payment statuses?', scope='personal', complete=True)
    assert not multiple.record_identity
