"""Parser/projection contracts. These are not live acceptance evidence."""
import asyncio
import json
import pytest
from app.portal_reader import (
    _inspection_history_request, _inspection_target_history_name,
    _explicit_reader_source, _inspection_overdue_list_requested,
    _inspection_overdue_result, UserPermissionContext,
    ReaderOutcome, ReaderResult, _guard_inspection_target_history,
)
from app.service import DSHService


@pytest.mark.parametrize('question', [
    "For inspection target 'Fixture Unit', show its history, violations and contact details.",
    'For inspection target “Fixture Unit”, display past inspection records and violations.',
    'For the target Fixture Unit, display its historical inspection records, violations, and contact information.',
    'For the target "Fixture Unit", display its historical inspection records, violations, and contact information.',
    'Show historical inspection records, violations and contacts for target Fixture Unit.',
    "Show history, violations and contacts for 'Fixture Unit' target.",
    'بالنسبة لهدف التفتيش «Fixture Unit»، اعرض سجلات الفحص التاريخية والمخالفات ومعلومات الاتصال.',
    'بالنسبة للهدف Fixture Unit، اعرض سجلات الفحص التاريخية الخاصة به.',
    '对于检查目标“Fixture Unit”，显示其历史检查记录，违规行为及联系方式。',
])
def test_target_name_is_exact_and_owns_its_history_route(question):
    assert _inspection_target_history_name(question) == 'Fixture Unit'
    assert _inspection_history_request(question)
    assert _explicit_reader_source(question, {}) == '/inspection/tasks'


@pytest.mark.parametrize('target', ['ren_jg1', 'Another Unit', 'المؤسسة'])
def test_reported_bare_target_question_requires_exact_binding(target):
    question = (f'For the target {target}, display its historical inspection records, '
                'violations, and contact information.')
    assert _inspection_target_history_name(question) == target
    assert _explicit_reader_source(question, {}) == '/inspection/tasks'
    unrelated = ReaderOutcome(ReaderResult(status='success', summary='unfiltered queue',
        page='/inspection/violations', facts=('unrelated violation',)), {})
    guarded = _guard_inspection_target_history(unrelated, question)
    assert guarded.result.status == 'not_confirmed'
    assert not guarded.result.facts
    bound = ReaderOutcome(ReaderResult(status='success', summary='target history',
        page='/inspection/tasks', facts=('bound history',)),
        {'inspectionTargetBinding': {'targetName': target, 'taskNo': 'IN-2026-1'}})
    assert _guard_inspection_target_history(bound, question) == bound


def test_bare_target_without_inspection_context_does_not_claim_inspection_identity():
    assert _inspection_target_history_name('For the target Fixture Unit, show ticket history.') == ''


@pytest.mark.parametrize('question', [
    'How many tasks exceeding the SLA are currently pending? Please list them and sort them by the number of days overdue.',
    'كم عدد المهام التي تجاوزت معايير SLA حاليًا؟ يرجى سرد هذه المهام وترتيبها حسب عدد أيام التأخير.',
])
def test_sla_list_uses_authorized_inspection_department_not_refunds(question):
    permission = UserPermissionContext(current_role='Inspector', departments=('Inspection Unit',),
        pages=('/inspection/tasks', '/happiness/team-management'))
    assert _inspection_overdue_list_requested(question)
    assert _explicit_reader_source(question, {'currentPage': {'route': '/dashboard'}}, permission) == '/inspection/tasks'
    committee = UserPermissionContext(current_role='Committee Staff', departments=('Inspection Unit',),
        pages=('/inspection/violations',))
    # Selecting the required source does not authorize it: the normal policy
    # must reject the absent task permission, rather than read another queue.
    assert _explicit_reader_source(question, {}, committee) == '/inspection/tasks'


@pytest.mark.parametrize('slas', [('3d Overdue', '15 days overdue', 'Due in 4 days'),
    ('متأخر ٣ يوم', 'متأخر لمدة ١٥ يوم', 'خلال ٤ أيام')])
@pytest.mark.parametrize('language', ['en', 'ar'])
def test_sla_filter_sort_and_presentation_are_native_and_deterministic(slas, language):
    rows = tuple({'taskNo': f'IN-fixture-{i}', 'SLA': sla, 'Status': 'Queued'} for i, sla in enumerate(slas))
    result = _inspection_overdue_result({}, page='/inspection/tasks', question='List overdue tasks.',
        scope='team', complete=True, page_count=1, total_rows=3, rows_override=rows)
    assert result and result.status == 'success'
    assert [json.loads(f)['Overdue Days'] for f in result.facts if f.startswith('{')] == [15, 3]
    service = object.__new__(DSHService)
    answer, failed, strategy = asyncio.run(service._natural_reader_response('List overdue tasks.', result.public_json(), language))
    assert not failed and strategy == 'deterministic_bound_business_facts'
    assert answer.index('IN-fixture-1') < answer.index('IN-fixture-0')
    assert 'IN-fixture-2' not in answer
