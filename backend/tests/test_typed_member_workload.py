"""Contract fixtures; these never stand in for actual browser acceptance."""
import json
import pytest
from app.portal_reader import (_ticket_team_summary_requested, _team_member_card_result,
    _explicit_reader_source, _team_workload_permission_missing, UserPermissionContext)
from app.reader_semantic_task import ReaderTaskSpec, current_task, validate_task


@pytest.fixture(autouse=True)
def reset_context():
    token = current_task.set(None)
    yield
    current_task.reset(token)


def bind(question, person='Fixture Person', **changes):
    data = dict(stage='task', businessObject='ticket', businessFocus='unfinished work',
        requestedScope='unknown', requestedGrain='per person',
        requestedMeasures=['count of unfinished ticket work'], requestedAttributes=[],
        groupBy=[], timeRange='current', filters=[f'tickets assigned to {person}', 'tickets that are unfinished'],
        outputShape='count', needsLiveData=True, readOnly=True, unresolvedSlots=[], searchQuery='team members unfinished tasks',
        subjectBindings=[dict(name=person, semanticRole='responsible_person', questionQuote=question)])
    current_task.set(validate_task(ReaderTaskSpec(**(data | changes)), question, {}))


def observation():
    return {'apiDiscovery': {'candidates': [{
        'operationKey': 'GET /api/happiness/team-management/members', 'status': 200,
        'responseEvidence': {'data': {'startDate': '2026-01-01', 'endDate': '2026-01-07',
            'cards': [{'userName': name, 'metricsByCategory': {'All': {
                'completedTasks': 0, 'totalAssignedTasks': count, 'overdueTasks': 0}}}
                for name, count in [('Fixture Person', 0), ('Other Person', 8)]]}}}]}}


@pytest.mark.parametrize('question', [
    'For Fixture Person specifically, how much unfinished ticket work remains?',
    'بالنسبة إلى Fixture Person، كم تبقى من عمل التذاكر غير المكتمل؟',
])
def test_subject_count_routes_to_authorized_cards_not_unrelated_list(question):
    bind(question)
    assert _ticket_team_summary_requested(question)
    permission = UserPermissionContext(pages=('/happiness/team-management',), current_role='Happiness Manager')
    assert _explicit_reader_source(question, {}, permission) == '/happiness/team-management'
    result = _team_member_card_result(observation(), question=question, scope='team', page='/happiness/team-management')
    assert result.status == 'success' and result.answer_shape == 'count'
    assert json.loads(result.facts[0]) == {'Team Member': 'Fixture Person', 'Pending Tasks': 0}
    assert 'Other Person' not in str(result.facts)


def test_missing_bound_person_cannot_become_all_members():
    question = 'For Missing Person, count unfinished tickets.'
    bind(question, person='Missing Person')
    assert _team_member_card_result(observation(), question=question, scope='team', page='/happiness/team-management') is None


@pytest.mark.parametrize('question', [
    'For Fixture Person specifically, count unfinished ticket work.',
    'بالنسبة إلى Fixture Person، كم تبقى من عمل التذاكر غير المكتمل؟',
])
def test_personal_permission_cannot_read_team_workload(question):
    bind(question)
    permission = UserPermissionContext(pages=('/dashboard', '/happiness/tickets'), current_role='Arbitrary Role')
    assert _team_workload_permission_missing(question, permission)


@pytest.mark.parametrize('page', ['/happiness/team-management', '/content/team-management',
    '/licensing/team-management', '/inspection/tasks'])
def test_authorized_team_surface_still_runs_live_policy_and_projection(page):
    question = 'For Fixture Person specifically, count unfinished ticket work.'
    bind(question)
    assert not _team_workload_permission_missing(question, UserPermissionContext(pages=(page,)))


def test_personal_queue_question_is_not_a_team_permission_denial():
    assert not _team_workload_permission_missing('List my pending tickets.',
        UserPermissionContext(pages=('/happiness/tickets',)))


def test_unrelated_documented_module_keeps_its_own_visible_tab_validation():
    assert not _team_workload_permission_missing('Show completed team work tasks.',
        UserPermissionContext(pages=('/work/tasks',)))


@pytest.mark.parametrize('filters', [
    ['assignee is Fixture Person', 'ticket work is unfinished'],
    ['tickets that are still pending', 'tickets belonging to team member Fixture Person'],
])
def test_equivalent_assignee_predicate_keeps_exact_roster_boundary(filters):
    question = 'Count unfinished work for Fixture Person.'
    bind(question, filters=filters)
    result = _team_member_card_result(observation(), question=question, scope='team', page='/happiness/team-management')
    assert json.loads(result.facts[0]) == {'Team Member': 'Fixture Person', 'Pending Tasks': 0}


def test_complete_domain_and_owner_grouping_are_not_extra_business_filters():
    question = 'For each staff member, including zero work, count pending, overdue and completed tickets by responsible staff, not applicant.'
    bind(question, subjectBindings=[], groupBy=['team member'], requestedScope='team',
        outputShape='overview', groupCompleteness='complete_domain',
        requestedMeasures=['pending ticket count', 'overdue ticket count', 'completed ticket count'],
        filters=['assigned employee is the responsible employee, not the requester', 'include team members with no tickets'])
    result = _team_member_card_result(observation(), question=question, scope='team', page='/happiness/team-management')
    assert result.status == 'success'
    assert len([fact for fact in result.facts if fact.startswith('{')]) == 2
    assert json.loads(result.facts[0])['Pending Tasks'] == 0


@pytest.mark.parametrize('ownership', ['tasks belonging to staff members in my team',
    "tasks belonging to the user's team"])
def test_current_team_pending_or_overdue_filter_uses_verified_cards(ownership):
    question = 'Summarize each staff member’s pending and overdue tasks in my team.'
    bind(question, subjectBindings=[], requestedScope='team', groupBy=['staff member'],
        requestedMeasures=['pending task count', 'overdue task count'],
        filters=[ownership, 'task status is pending or overdue'])
    result = _team_member_card_result(observation(), question=question, scope='team', page='/happiness/team-management')
    assert result.status == 'success'
    members = [json.loads(fact) for fact in result.facts if fact.startswith('{')]
    assert len(members) == 2
    assert members[0]['Pending Tasks'] == members[0]['Overdue Tasks'] == 0


def test_generic_work_items_are_same_verified_member_card_measures():
    question = 'لخّص لكل موظف في فريقي عدد الأعمال المعلقة والمهام المتأخرة.'
    bind(question, businessObject='work items and tasks', subjectBindings=[],
        requestedScope='team', groupBy=['employee'], outputShape='overview',
        filters=['pending work items', 'overdue tasks'],
        requestedMeasures=['count of pending work items', 'count of overdue tasks'])
    result = _team_member_card_result(observation(), question=question, scope='team',
        page='/licensing/team-management')
    assert result.status == 'success'
    members = [json.loads(fact) for fact in result.facts if fact.startswith('{')]
    assert len(members) == 2
    assert members[0]['Pending Tasks'] == members[0]['Overdue Tasks'] == 0


@pytest.mark.parametrize('question', [
    'Summarize for each staff member the number of pending and overdue tasks.',
    'لخّص لكل موظف في فريقي عدد المهام المعلقة والمتأخرة.',
])
def test_degraded_interpretation_keeps_per_person_counts_not_single_total(question):
    result = _team_member_card_result(observation(), question=question, scope='team', page='/content/team-management')
    assert result.status == 'success' and result.answer_shape == 'overview'
    members = [json.loads(fact) for fact in result.facts if fact.startswith('{')]
    assert len(members) == 2
    assert members[1]['Pending Tasks'] == 8


@pytest.mark.parametrize('question', [
    'For each staff member, count pending, overdue and returned tasks.',
    'لخّص لكل موظف في فريقي عدد المهام المعلقة والمتأخرة والمعادة.',
])
def test_missing_returned_metric_keeps_known_person_counts_and_reports_missing(question):
    bind(question, businessObject='tasks', subjectBindings=[], groupBy=['staff member'],
        requestedMeasures=['pending task count', 'overdue task count', 'returned task count'],
        filters=[], outputShape='overview')
    result = _team_member_card_result(observation(), question=question, scope='team', page='/content/team-management')
    assert result.status == 'not_confirmed'
    assert result.missing == ('returned_member_metric_unavailable',)
    members = [json.loads(fact) for fact in result.facts if fact.startswith('{')]
    assert len(members) == 2 and members[1]['Pending Tasks'] == 8
    assert all('Returned Tasks' not in member for member in members)


def test_observed_returned_metric_is_used_without_inventing_it():
    question = 'For each staff member, count pending and returned tasks.'
    bind(question, businessObject='tasks', subjectBindings=[], groupBy=['staff member'], filters=[],
        requestedMeasures=['pending task count', 'returned task count'], outputShape='overview')
    source = observation()
    for card in source['apiDiscovery']['candidates'][0]['responseEvidence']['data']['cards']:
        card['metricsByCategory']['All']['returnedTasks'] = 3
    result = _team_member_card_result(source, question=question, scope='team', page='/content/team-management')
    assert result.status == 'success' and not result.missing
    assert all(json.loads(fact)['Returned Tasks'] == 3 for fact in result.facts if fact.startswith('{'))


@pytest.mark.parametrize('language', ['en', 'ar'])
def test_missing_aggregate_field_does_not_request_unrelated_record_number(language):
    from app.service import _reader_next_step_sentence
    assert _reader_next_step_sentence({'result': 'not_confirmed',
        'page': '/content/team-management',
        'missing': ['returned_member_metric_unavailable']}, language) == ''


@pytest.mark.parametrize('question', [
    'Who submitted MC-3-101-12345 and what is its status and next step?',
    'ما مقدم الطلب MC-3-101-12345 وحالته والخطوة التالية؟',
])
def test_content_application_identity_enters_exact_detail_workflow(question):
    from app.portal_reader import _application_numbers, _application_state_type_row_result
    assert _application_numbers(question) == ('MC-3-101-12345',)
    assert _application_state_type_row_result({}, 'MC-3-101-12345',
        page='/content/ContentApplications', scope='team', question=question) is None


@pytest.mark.parametrize('question', [
    'Identify work items that warrant escalation to the Content Manager; leave statuses unchanged.',
    'ما القضايا التي يجب تصعيدها إلى مدير المحتوى استنادًا إلى التأخير في SLA أو المخاطر؟ لا تغيّر أي حالة.',
])
def test_validated_readonly_escalation_candidates_use_native_queue(question):
    from app.portal_reader import _content_escalation_requested, _content_overdue_list
    bind(question, businessObject='cases', businessFocus='escalation', subjectBindings=[],
        requestedMeasures=[], requestedAttributes=['SLA delay', 'risk'], filters=['SLA delay or risk'],
        searchQuery='cases requiring escalation to Content Manager based on SLA delay or risk',
        outputShape='list', groupBy=[])
    assert _content_escalation_requested(question) and _content_overdue_list(question)


def test_escalation_policy_without_live_cases_does_not_trigger_queue_scan():
    from app.portal_reader import _content_escalation_requested
    question = 'Explain the documented escalation policy for Content managers.'
    bind(question, businessObject='policy', subjectBindings=[], needsLiveData=False,
        requestedMeasures=[], filters=[], requestedAttributes=[],
        searchQuery='documented Content case escalation policy')
    assert not _content_escalation_requested(question)


def test_arabic_native_queue_source_caption_is_localized():
    from app.service import _reader_source_sentence
    sentence = _reader_source_sentence({'result': 'success', 'page': '/licensing/applications',
        'section': 'To Do applications', 'scope': 'team'}, 'ar')
    assert 'To Do applications' not in sentence
    assert 'الطلبات قيد الإنجاز' in sentence
    detail = _reader_source_sentence({'result': 'success', 'page': '/content/ContentApplications',
        'section': 'Application detail', 'scope': 'team'}, 'ar')
    assert 'Application detail' not in detail and 'تفاصيل الطلب' in detail


def test_arabic_sla_duration_noun_is_not_a_bypass_command():
    from app.portal_reader import _mutation_request_refusal_result
    question = 'رتّب طلبات الترخيص حسب عدد أيام تجاوز اتفاقية مستوى الخدمة من الأكبر إلى الأصغر، وبيّن أكبر تأخير مع جميع الطلبات المتعادلة.'
    assert _mutation_request_refusal_result(question, 'ar') is None
    assert _mutation_request_refusal_result(question + ' ثم عيّن الطلب إلى موظف.', 'ar') is not None
    assert _mutation_request_refusal_result('تجاوز المراجعة للطلب.', 'ar') is not None


def test_arabic_rule_request_scores_actual_source_with_validated_search_concepts():
    from app.portal_reader import _deterministic_rule_clauses, knowledge_supports_result, ReaderResult
    question = 'ما السياسات والقواعد الرسمية لقرارات الترخيص؟'
    bind(question, subjectBindings=[], businessObject='licensing policies',
        searchQuery='official licensing policies and rules', requestedMeasures=[], filters=[])
    clause = 'Article (27) The licensing authority shall review licensing applications under the prescribed criteria.'
    evidence = {'ok': True, 'chunks': [{'source_name': 'fixture-regulation.pdf', 'content': clause}]}
    facts = _deterministic_rule_clauses(question, evidence)
    assert facts == ('fixture-regulation.pdf: ' + clause,)
    assert knowledge_supports_result(ReaderResult(status='success', summary='Retrieved rule quotation.', facts=facts), evidence)
    assert not _deterministic_rule_clauses(question, {'chunks': []})


@pytest.mark.parametrize('question', [
    'What is the payment status of ML-7-8-1234567?',
    'What is the complaint status of ML-7-8-1234567?',
    'ما حالة الدفع للطلب ML-7-8-1234567؟',
    'ما حالة الشكوى للطلب ML-7-8-1234567؟',
])
def test_payment_or_complaint_status_does_not_inherit_license_lifecycle(question):
    from app.portal_reader import _finance_application_result
    result = _finance_application_result({'ML-7-8-1234567': ({'status': 'Completed', 'amount': 12},)},
        question=question, scope='personal', complete=True)
    assert result.status == 'success'
    assert 'application_lifecycle_not_verified' not in result.missing
    assert not any('does not show the license status' in fact or 'لا تعرض المعاملات المالية حالة الترخيص' in fact
                   for fact in result.facts)


def test_combined_payment_and_license_status_still_keeps_explicit_boundary():
    from app.portal_reader import _finance_application_result
    result = _finance_application_result({'ML-7-8-1234567': ({'status': 'Completed'},)},
        question='What are the payment status and licensing status of ML-7-8-1234567?',
        scope='personal', complete=True)
    assert 'application_lifecycle_not_verified' in result.missing


@pytest.mark.parametrize('question', [
    'Check payment outcomes of ML-7-8-1234567 and distinguish unavailable licence details.',
    'تحقق من الدفع للطلب ML-7-8-1234567 وبيّن تفاصيل الترخيص غير المتاحة.',
])
def test_requested_unavailable_licence_details_are_not_silently_dropped(question):
    from app.portal_reader import _finance_application_result
    result = _finance_application_result({'ML-7-8-1234567': ({'status': 'Completed'},)},
        question=question, scope='personal', complete=True)
    assert result.status == 'not_confirmed'
    assert 'licence_details_not_read' in result.missing
    assert any('were not read' in fact or 'لم تتم قراءة تفاصيل الترخيص' in fact for fact in result.facts)


def test_finance_arabic_source_and_unavailable_field_next_step_are_consistent():
    from app.service import _reader_source_sentence, _reader_next_step_sentence
    result = {'result': 'not_confirmed', 'page': '/financial-payment/transactions',
        'section': 'Payments', 'missing': ['application_lifecycle_not_verified']}
    assert 'Payments' not in _reader_source_sentence(result, 'ar')
    assert 'المدفوعات' in _reader_source_sentence(result, 'ar')
    assert _reader_next_step_sentence(result, 'ar') == ''


def test_explicit_formal_role_restriction_cannot_be_flattened_to_all_members():
    question = 'Summarize pending and overdue work for Licensing Officers only in my team.'
    bind(question, subjectBindings=[], requestedScope='team', groupBy=['Licensing Officer'],
        filters=['Licensing Officers only'], requestedMeasures=['pending task count', 'overdue task count'])
    assert _team_member_card_result(observation(), question=question, scope='team', page='/licensing/team-management') is None


def test_state_object_paraphrase_keeps_each_business_boundary():
    from app.portal_reader import _finance_application_result
    question = 'Separate the licence decision, payment outcome and complaint progress for ML-7-8-1234567.'
    result = _finance_application_result({'ML-7-8-1234567': ({'status': 'Completed'},)},
        question=question, scope='personal', complete=True)
    assert 'application_lifecycle_not_verified' in result.missing
    assert any('does not show the license status' in fact for fact in result.facts)
    assert any('does not show the complaint status' in fact for fact in result.facts)
    assert result.completeness == 'complete'


@pytest.mark.parametrize('extra', [
    {'timeRange': '2026-10-08'}, {'filters': ['pending tickets worth more than 100']},
    {'requestedOrdering': ['submission date descending']},
    {'filters': ['tickets that are not pending']},
    {'filters': ['only team members with no tickets']},
    {'filters': ['tickets belonging to applicant Fixture Person']},
])
def test_additional_constraints_cannot_disappear_into_current_cards(extra):
    question = 'For Fixture Person, count unfinished tickets worth more than 100 on 2026-10-08.'
    bind(question, **extra)
    assert _team_member_card_result(observation(), question=question, scope='team', page='/happiness/team-management') is None
