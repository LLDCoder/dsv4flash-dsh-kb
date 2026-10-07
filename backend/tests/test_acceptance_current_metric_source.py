"""Routing contracts; actual metric values must be verified in the portal."""
import pytest
from app.portal_reader import _explicit_reader_source


@pytest.mark.parametrize('question', [
    'What is our SLA Compliance right now? Give just that one metric.',
    'ما قيمة الالتزام باتفاقية مستوى الخدمة لفريقنا الآن؟ أعطني هذا المؤشر فقط.',
    'ما قيمة الامتثال باتفاقية مستوى الخدمة الآن؟',
])
def test_current_single_kpi_uses_dashboard_before_manual_planning(question):
    assert _explicit_reader_source(question, {}) == '/dashboard'


def test_same_metric_followup_preserves_dashboard_and_record_sla_is_separate():
    context = {'previousIntent': {'question': 'What is our SLA Compliance right now?'}}
    assert _explicit_reader_source('ما قيمة نفس المؤشر الذي ذكرته للتو؟ أعطني ذلك المؤشر فقط.', context) == '/dashboard'
    assert _explicit_reader_source('Show the current SLA for IN-2026-1234567.', {}) == '/inspection/tasks'
    assert _explicit_reader_source('What was the SLA Compliance trend last month?', {}) != '/dashboard'
