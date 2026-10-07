"""Read-only command contracts; these are not live business acceptance data."""
import pytest
from app.portal_reader import question_requests_business_mutation, _mutation_request_refusal_result


@pytest.mark.parametrize('question', [
    'قم بتعيين الطلب ML-4-6-1234567 إلى الموظف.',
    'يرجى قم بإسناد المهمة IN-2026-1234567 إلى المفتش.',
    'عيّن الطلب إلى موظف آخر.',
    'أسند المهمة إلى المفتش.',
])
def test_assignment_imperatives_are_refused_before_read(question):
    assert question_requests_business_mutation(question)
    result = _mutation_request_refusal_result(question, 'ar')
    assert result is not None
    assert 'action_not_read_only' in result.missing


@pytest.mark.parametrize('question', [
    'من قام بتعيين الطلب؟',
    'اعرض وقت تعيين المهمة ورقم الطلب.',
    'ما حالة الطلب الذي تم إسناده؟',
])
def test_assignment_history_and_field_queries_remain_readable(question):
    assert not question_requests_business_mutation(question)
    assert _mutation_request_refusal_result(question, 'ar') is None
