"""Regression fixtures only; browser business evidence is recorded separately."""
import pytest

from app.portal_reader import (
    UserPermissionContext, _explicit_reader_source,
    _application_exact_sla_row_result, _license_overdue_all_pages_result,
)


@pytest.mark.parametrize('question', [
    'What is the SLA of ML-2-801-1234567?',
    'ما اتفاقية مستوى الخدمة للطلب ML-2-801-1234567؟',
])
def test_single_sla_routes_and_reads_only_exact_rendered_value(question):
    permission = UserPermissionContext(pages=('/licensing/applications',))
    assert _explicit_reader_source(question, {}, permission) == '/licensing/applications'
    observation = {'readHealth': {'healthy': True}, 'sectionSummaries': [{
        'kind': 'table', 'columnHeaders': ['Application No.', 'SLA', 'Apply For'],
        'rowFields': [{'Application No.': 'ML-2-801-1234567', 'SLA': '46d Overdue', 'Apply For': 'Entity'},
                      {'Application No.': 'ML-2-801-9999999', 'SLA': '50d Overdue', 'Apply For': 'Other'}],
    }]}
    result = _application_exact_sla_row_result(observation, 'ML-2-801-1234567',
        page='/licensing/applications', scope='team', question=question)
    assert result.status == 'success'
    assert '46' in str(result.facts) and '50' not in str(result.facts)
    assert 'Entity' not in str(result.facts)
    assert _application_exact_sla_row_result(observation, 'ML-2-801-8888888',
        page='/licensing/applications', scope='team', question=question) is None
    observation['readHealth']['healthy'] = False
    assert _application_exact_sla_row_result(observation, 'ML-2-801-1234567',
        page='/licensing/applications', scope='team', question=question) is None


@pytest.mark.parametrize('question', [
    "Today's most urgent permit applications and SLAs",
    'أهم طلبات التصاريح واتفاقيات مستوى الخدمة اليوم',
])
def test_urgency_requires_all_pages_returns_every_maximum_tie(question):
    pages = []
    for index, records in enumerate([
        [('ML-1-111', '46d Overdue'), ('ML-1-222', '-')],
        [('ML-1-333', '92d Overdue'), ('ML-1-444', '92d Overdue')],
    ], start=1):
        pages.append({'rowSummaries': [f'{identity} {value}' for identity, value in records],
            'apiDiscovery': {'candidates': [{'status': 200, 'operationKey': 'POST /api/Application/MyTodoPage',
                'responseEvidence': {'pageSlaProjection': {'pageIndex': index, 'pageSize': 2, 'total': 4,
                    'items': [{'applicationNumber': identity, 'slaDescription': value,
                               'slaMinutes': None, 'isOverdue': True} for identity, value in records]}}}]}})
    result = _license_overdue_all_pages_result(pages, question=question, scope='team')
    assert result.status == 'success' and result.completeness == 'complete'
    assert result.workflow_state == 'license_urgency_full'
    assert 'ML-1-333' in str(result.facts) and 'ML-1-444' in str(result.facts)
    assert 'ML-1-111' not in str(result.facts)
    assert '1' in result.facts[1]  # Blank value is reported, not zero or a guessed day count.
    assert _license_overdue_all_pages_result(pages[:1], question=question, scope='team').status == 'not_confirmed'
    pages[1]['apiDiscovery']['candidates'][0]['responseEvidence']['pageSlaProjection']['items'][1]['applicationNumber'] = 'ML-1-333'
    assert _license_overdue_all_pages_result(pages, question=question, scope='team').status == 'not_confirmed'


def test_mixed_field_question_keeps_detail_workflow_and_blank_sla_is_not_zero():
    observation = {'readHealth': {'healthy': True}, 'sectionSummaries': [{
        'kind': 'table', 'columnHeaders': ['Application No.', 'SLA'],
        'rowFields': [{'Application No.': 'ML-1-111', 'SLA': '-'}],
    }]}
    args = dict(page='/licensing/applications', scope='team')
    assert _application_exact_sla_row_result(observation, 'ML-1-111', question='SLA and payment status?', **args) is None
    result = _application_exact_sla_row_result(observation, 'ML-1-111', question='What is the SLA?', **args)
    assert result.status == 'not_confirmed' and '0' not in str(result.facts)
