"""Unit contracts only; acceptance must separately use live portal data."""
import asyncio
import json
import pytest

from app.portal_reader import (
    ReaderOutcome, ReaderResult, UserPermissionContext,
    _guard_inspection_target_history, _inspection_history_request,
    _member_metric_followup_question, _self_profile_result,
    _team_member_card_result, _ticket_team_summary_requested,
    _visible_dashboard_scope,
    _named_group_in_question, _guard_named_group_scope,
)
from app.service import DSHService, reader_evidence_only_response, _reader_source_sentence


@pytest.mark.parametrize('prefix', ['', 'ب', 'ل', 'و', 'وب', 'ول'])
def test_arabic_attached_prepositions_do_not_bypass_named_group_guard(prefix):
    question = f'اعرض طلبات {prefix}فريق Fixture Group.'
    assert _named_group_in_question(question) == 'Fixture Group'
    outcome = ReaderOutcome(ReaderResult(status='success', summary='unfiltered queue',
        page='/licensing/team-management', facts=('unrelated row',)), {})
    assert not _guard_named_group_scope(outcome, question).result.facts
    assert _named_group_in_question(f'اعرض المهام {prefix}فريق العمل.') == ''


def test_named_group_guard_also_rejects_documentation_substitute_without_page():
    outcome = ReaderOutcome(ReaderResult(status='success', summary='documentation',
        facts=('Documented destination: Licenses list.',)), {})
    guarded = _guard_named_group_scope(outcome, 'Show applications from the Fixture Group team.')
    assert guarded.result.missing == ('requested_group_scope_unverified',)
    assert not guarded.result.facts
    assert 'Documented' not in reader_evidence_only_response(guarded.result.public_json(), 'ar')


@pytest.mark.parametrize('language', ['en', 'ar'])
def test_denial_has_no_role_inventory_or_navigation_even_with_extra_facts(language):
    answer = reader_evidence_only_response({
        'result': 'no_permission', 'page': '/licensing/applications',
        'missing': ['page_not_permitted'],
        'facts': ['Current role: Fixture Manager', '[Open](/licensing/applications)'],
    }, language)
    assert 'Fixture' not in answer and '/licensing' not in answer
    assert not (language == 'en' and any('\u0600' <= char <= '\u06ff' for char in answer))


@pytest.mark.parametrize('question,language', [
    ('What department and role am I signed in with?', 'en'),
    ('What data and pages can I access with my current role?', 'en'),
    ('هل تعرف في أي قسم وبأي دور أنا حاليًا أقوم بتسجيل الدخول؟', 'ar'),
    ('ما البيانات والصفحات التي يمكنني الوصول إليها بصلاحياتي الحالية؟', 'ar'),
])
def test_verified_identity_never_calls_a_prose_model(question, language):
    result = _self_profile_result(question, UserPermissionContext(
        account='fixture@example.test', current_role='Fixture Officer', departments=('Fixture Unit',)),
        language=language)
    assert result.workflow_state == 'verified_profile'
    service = object.__new__(DSHService)  # A model/settings must not be needed.
    answer, failed, strategy = asyncio.run(service._natural_reader_response(question, result.public_json(), language))
    assert 'fixture@example.test' in answer and 'Fixture Officer' in answer
    assert not failed and strategy == 'deterministic_verified_profile'


@pytest.mark.parametrize('question', ['How many are overdue?', 'كم عدد المواعيد المتأخرة؟'])
@pytest.mark.parametrize('route_key', ['route', 'currentPage', 'current_page'])
def test_short_overdue_on_current_team_page_keeps_measure_not_queue_total(question, route_key):
    resolved = _member_metric_followup_question(question, {
        'currentPage': {route_key: '/happiness/team-management?tab=teamMembers'}})
    assert _ticket_team_summary_requested(resolved)
    assert _member_metric_followup_question(question, {'currentPage': {'route': '/financial-payment/transactions'}}) == question


@pytest.mark.parametrize('question', ['How many are overdue?', 'كم عدد المواعيد المتأخرة؟'])
def test_fresh_dashboard_shorthand_requires_reader_verified_team_scope(question):
    context = {'currentPage': {'route': '/dashboard'}, 'verifiedWorkloadScope': {'dashboardScope': 'team'}}
    assert _member_metric_followup_question(question, context) == question
    resolved = _member_metric_followup_question(question, context, verified_team_dashboard=True)
    assert _ticket_team_summary_requested(resolved)
    payment = 'كم عدد الحالات التي تأخر في سدادها؟'
    assert _member_metric_followup_question(payment, context, verified_team_dashboard=True) == payment


@pytest.mark.parametrize('question', [
    'How many overdue tasks are in my team? Give the count and the names of the people responsible.',
    'كم عدد المهام المتأخرة في فريقي؟ اذكر العدد وأسماء المسؤولين عنها.',
])
def test_total_request_is_one_aggregate_not_unsolicited_member_records(question):
    observation = {'apiDiscovery': {'candidates': [{
        'operationKey': 'GET /api/admin/happiness/team-management/members', 'status': 200,
        'responseEvidence': {'data': {'startDate': '2026-01-01', 'endDate': '2026-01-07',
            'cards': [{'userName': name, 'metricsByCategory': {'all': {
                'completedTasks': 0, 'totalAssignedTasks': assigned, 'overdueTasks': overdue}}}
                for name, assigned, overdue in [('Fixture A', 9, 2), ('Fixture B', 4, 0)]]}},
    }]}}
    result = _team_member_card_result(observation, question=question, scope='team', page='/happiness/team-management')
    assert result.facts[0] == 'Team Members overdue tasks total: 2; responsible members: Fixture A.'
    assert not any(fact.startswith('{') for fact in result.facts)
    assert 'Fixture B' not in str(result.facts)


def test_named_history_cannot_fall_back_to_readable_unrelated_violations():
    question = 'For inspection target Fixture Target, show its inspection history, violations and contacts.'
    outcome = ReaderOutcome(ReaderResult(status='success', summary='fixture queue', page='/inspection/violations',
        facts=(json.dumps({'Violation No.': 'VN-2026-1', 'Target': 'Other Target'}),)), {})
    guarded = _guard_inspection_target_history(outcome, question)
    assert guarded.result.status == 'not_confirmed' and not guarded.result.facts
    bound = ReaderOutcome(ReaderResult(status='success', summary='fixture history', page='/inspection/tasks',
        workflow_state='inspection_detail_full', facts=('authorized history',)),
        {'inspectionTargetBinding': {'targetName': 'Fixture Target', 'taskNo': 'IN-2026-1'}})
    assert _guard_inspection_target_history(bound, question) == bound
    assert _inspection_history_request('اعرض سجل الفحص للهدف Fixture Target، والمخالفات ومعلومات الاتصال.')


def test_arabic_navigation_captions_and_clarification_are_not_bilingual_or_confirmed_counts():
    source = _reader_source_sentence({'result': 'success', 'page': '/happiness/team-management',
                                     'section': 'Team Members', 'scope': 'team'}, 'ar')
    assert 'Team Members' not in source and 'Happiness' not in source
    assert 'أعضاء الفريق' in source and 'إدارة الفريق' in source
    answer = reader_evidence_only_response({'result': 'not_confirmed', 'answerShape': 'count',
        'workflowState': 'overdue_object_clarification', 'facts': ['هل تقصد المهام أم الدفع؟']}, 'ar')
    assert answer == 'هل تقصد المهام أم الدفع؟'


def test_manager_attention_is_observed_team_scope_even_when_kpi_heading_is_not_in_snapshot():
    assert _visible_dashboard_scope({'sectionSummaries': [
        {'heading': 'My Tasks', 'kind': 'cards'},
        {'heading': 'Needs Manager Attention', 'kind': 'table'},
    ]}) == 'team'
    assert _visible_dashboard_scope({'sectionSummaries': [
        {'heading': 'My Tasks', 'kind': 'cards'},
    ]}) == 'personal'


def test_arabic_capability_area_captions_are_localized_without_changing_profile_values():
    result = _self_profile_result('ما البيانات والصفحات التي يمكنني الوصول إليها بصلاحياتي الحالية؟',
        UserPermissionContext(account='fixture@example.test', current_role='Fixture Officer',
            pages=('/dashboard', '/happiness'), departments=('Fixture Unit',)),
        language='ar', observed_dashboard_scope='personal')
    assert 'Fixture Officer' in result.facts[1] and 'Fixture Unit' in result.facts[2]
    assert 'لوحة التحكم' in result.facts[3] and 'سعادة العملاء' in result.facts[3]
    assert 'Dashboard' not in result.facts[3] and 'Customer Happiness' not in result.facts[3]
