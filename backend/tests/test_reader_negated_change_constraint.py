"""Intent-boundary contracts, not live business acceptance data."""
import pytest

from app.portal_reader import _mutation_request_refusal_result


@pytest.mark.parametrize('question,language', [
    ('Which content cases warrant escalation because of SLA delays? Do not change any status.', 'en'),
    ("List pending applications without changing their status.", 'en'),
    ("Show the record; don't delete the application.", 'en'),
    ('ما القضايا المتأخرة؟ لا تغيّر حالة الطلب.', 'ar'),
    ('اعرض المهام. لا تنقل المهمة.', 'ar'),
    ('列出逾期任务，不要修改任务状态。', 'zh'),
])
def test_read_only_constraints_are_not_execution_commands(question, language):
    assert _mutation_request_refusal_result(question, language) is None


@pytest.mark.parametrize('question,language', [
    ('Do not delete the application, but approve the application now.', 'en'),
    ('List tasks without changing their status; transfer the task to another department.', 'en'),
    ('لا تغير حالة الطلب. انقل المهمة إلى قسم آخر.', 'ar'),
    ('不要修改任务状态，请删除这条记录。', 'zh'),
    ('Change the task status to Approved.', 'en'),
])
def test_positive_commands_remain_refused_after_a_negated_clause(question, language):
    result = _mutation_request_refusal_result(question, language)
    assert result is not None
    assert 'action_not_read_only' in result.missing
