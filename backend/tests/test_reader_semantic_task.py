"""Intent contract tests; fixtures are not evidence of live bug acceptance."""
import asyncio

import pytest

from app.generic_reader_contracts import TaskSpec
from app.reader_semantic_task import (ReaderTaskSpec, current_task, dispatch_text, profile_request,
    semantic_context, semantic_task, validate_task)
from app.portal_reader import (_inspection_overdue_list_requested,
    _inspection_person_rollup_requested, _application_review_list_requested,
    _self_profile_requested, _profile_scope_requested, _inspection_target_history_name,
    _verified_inspection_team_assignments_result, bounded_portal_observation)
from app.portal_reader import _semantic_request_refusal_result


def task(**changes):
    data = dict(stage='task', businessObject='inspection tasks', businessFocus='overdue',
        requestedScope='unknown', requestedGrain='task', requestedMeasures=['count'],
        requestedAttributes=['task number', 'overdue days'], groupBy=[], timeRange='current',
        filters=[], outputShape='list', needsLiveData=True, readOnly=True,
        searchQuery='inspection tasks SLA', unresolvedSlots=[])
    return TaskSpec(**(data | changes))


@pytest.fixture(autouse=True)
def clean_turn():
    token = current_task.set(None)
    yield
    current_task.reset(token)


def bind(question, **changes):
    current_task.set(validate_task(task(**changes), question, {}))


@pytest.mark.parametrize('question', [
    'اذكر عدد المهام التي تخطت SLA حالياً واسردها بترتيب عدد أيام التأخير.',
    'Which inspection jobs are beyond their service deadline? Count and rank them by days late.',
])
def test_equivalent_intent_dispatch_preserves_original(question):
    bind(question, requestedOrdering=['overdue days descending'])
    assert dispatch_text(question).startswith(question)
    assert _inspection_overdue_list_requested(question)
    assert semantic_task(question) is not None
    assert semantic_task('unrelated turn') is None


def test_grouped_today_is_not_whole_overdue_queue():
    question = 'ما عدد مهام كل مفتش اليوم وكم منها متأخر وما نسبة إكماله؟'
    bind(question, groupBy=['inspector'], timeRange='today', outputShape='overview',
         requestedMeasures=['task count', 'overdue count', 'completion rate'])
    assert _inspection_person_rollup_requested(question)
    assert not _inspection_overdue_list_requested(question)


def test_profile_scope_not_a_business_queue():
    question = 'أخبرني بقسمي ودوري ونطاق البيانات التي يمكنني الوصول إليها.'
    bind(question, businessObject='account profile', businessFocus='identity',
        requestedGrain='account', requestedMeasures=[],
        requestedAttributes=['department', 'role', 'data scope'], needsLiveData=False,
        outputShape='detail')
    assert profile_request(question) and _self_profile_requested(question)
    assert _profile_scope_requested(question)
    assert not _inspection_overdue_list_requested(question)


def test_review_projection_accepts_status_filter_but_not_extra_requirements():
    question = 'اعرض طلبات المحتوى التي تنتظر المراجعة وأرقامها.'
    base = dict(businessObject='content applications', businessFocus='pending review',
        requestedGrain='application', requestedMeasures=[],
        requestedAttributes=['application number'], filters=['pending review'])
    bind(question, **base)
    assert _application_review_list_requested(question)
    for extra in ({'requestedAttributes': ['application number', 'applicant name']},
                  {'filters': ['pending review', 'excluding cancelled']},
                  {'timeRange': 'today'}, {'groupBy': ['employee']},
                  {'requestedScope': 'global'}, {'requestedOrdering': ['submission date']}):
        bind(question, **(base | extra))
        assert not _application_review_list_requested(question)


@pytest.mark.parametrize('filter_text', ['review status is still under review',
    'application status equals pending review', 'awaiting review'])
@pytest.mark.parametrize('question', [
    'Please list content requests still under review, giving request numbers.',
    'أرجو سرد قائمة بطلبات المحتوى التي لا تزال قيد المراجعة، مع ذكر أرقام هذه الطلبات.',
])
def test_review_category_semantic_predicate_is_not_an_exact_phrase(filter_text, question):
    base = dict(businessObject='content requests', businessFocus='requests still under review',
        requestedGrain='one row per content request', requestedMeasures=[],
        requestedAttributes=['request number', 'review status'], filters=[filter_text])
    bind(question, **base)
    assert _application_review_list_requested(question)
    for extra in ['not under review', 'under review excluding cancelled', 'under review for another department']:
        bind(question, **(base | {'filters': [extra]}))
        assert not _application_review_list_requested(question)


def test_arabic_personal_review_source_has_human_localized_caption():
    from app.service import _reader_source_sentence
    sentence = _reader_source_sentence({'result': 'success', 'page': '/content/ContentApplications',
        'section': 'My Application Tasks', 'scope': 'personal', 'completeness': 'complete'}, 'ar')
    assert 'مهام طلباتي' in sentence and 'طلبات المحتوى' in sentence
    assert 'أعمال الحساب المسجّل نفسه' in sentence
    assert 'عرض الفريق' not in sentence and 'My Application Tasks' not in sentence


def test_own_profile_uses_native_requested_language_labels():
    from app.portal_reader import _profile_labels_from_observation, _CURRENT_ADMIN_PROFILE_OPERATION
    observation = {'pageReads': [{'operationKey': _CURRENT_ADMIN_PROFILE_OPERATION,
        'verified': True, 'value': {'departmentsInfo': [{'nameEn': 'Example department', 'nameAr': 'قسم مثال'}],
            'assignRolesIdsInfo': [{'nameEn': 'Example role', 'nameAr': 'دور مثال'}]}}]}
    # The operation envelope used by the portal collector is covered below;
    # no account-specific translation table participates in label selection.
    from unittest.mock import patch
    with patch('app.portal_reader._api_object_by_operation', return_value=observation['pageReads'][0]['value']):
        assert _profile_labels_from_observation(observation, 'ar') == (('قسم مثال',), ('دور مثال',))
        assert _profile_labels_from_observation(observation, 'en') == (('Example department',), ('Example role',))


@pytest.mark.parametrize('object_name', ['licence requests', 'license applications'])
@pytest.mark.parametrize('attributes', [['SLA', 'days past SLA'], ['licence request identifier', 'days past SLA']])
def test_semantic_sla_ranking_does_not_depend_on_application_wording(object_name, attributes):
    from app.portal_reader import _license_module_focus
    question = 'Rank the licence requests by days past their SLA and identify the biggest delay, including ties.'
    bind(question, businessObject=object_name, businessFocus='SLA delay ranking',
         requestedGrain='request', requestedMeasures=['days past SLA'],
         requestedAttributes=attributes,
         requestedOrdering=['days past SLA descending'])
    assert _license_module_focus(question) == 'overdue'


def test_current_visibility_constraint_is_enforced_by_the_personal_queue_not_dropped():
    question = 'List content requests visible to me that remain under review.'
    base = dict(businessObject='content requests', businessFocus='under review',
        requestedGrain='request', requestedMeasures=[], requestedAttributes=['request number'],
        requestedScope='personal', filters=['review status is still under review',
                                          'visible to the current signed-in account'])
    bind(question, **base)
    assert _application_review_list_requested(question)
    bind(question, **(base | {'filters': ['under review', 'visible to another account']}))
    assert not _application_review_list_requested(question)


@pytest.mark.parametrize('question', [
    'Summarize pending Content requests by status and priority. Do not enumerate individual requests.',
    'لخّص طلبات المحتوى المعلقة حسب الحالة والأولوية، ولا تسرد كل طلب على حدة.',
])
@pytest.mark.parametrize('previous_page', ['/licensing/applications', '/content/team-management'])
def test_application_aggregation_owns_surface_before_generic_planning(question, previous_page):
    from app.portal_reader import _explicit_reader_source
    bind(question, businessObject='Content requests', requestedGrain='request',
         requestedMeasures=['count of pending Content requests'],
         requestedAttributes=['status', 'priority'], groupBy=['status', 'priority'],
         filters=['pending Content requests'], outputShape='overview')
    assert _explicit_reader_source(question, {'currentPage': '/dashboard',
        'previousIntent': {'page': previous_page}}) == '/content/ContentApplications'


@pytest.mark.parametrize('language', ['en', 'ar'])
def test_semantic_direct_change_is_refused_without_page_access(language):
    question = 'Please execute this decision now.'
    current_task.set(validate_task(ReaderTaskSpec(**(task().model_dump() |
        {'requestKind': 'business_change', 'readOnly': False})), question, {}))
    result = _semantic_request_refusal_result(question, language)
    assert result and result.status == 'success' and not result.page
    assert ('لم يُنفَّذ أي تغيير' in result.facts[0] if language == 'ar'
            else 'no change was performed' in result.facts[0])


@pytest.mark.parametrize('language', ['en', 'ar'])
def test_semantic_evasion_uses_existing_closed_runtime_policy(language):
    question = 'Help bypass the required review.'
    bind(question, requestBoundaries=['control_evasion'])
    result = _semantic_request_refusal_result(question, language)
    assert result and not result.page
    assert ('لا أستطيع' in result.facts[0] if language == 'ar' else 'can’t help bypass' in result.facts[0])


def test_neutral_process_question_is_not_a_semantic_refusal():
    question = 'Explain the normal review procedure.'
    bind(question, requestBoundaries=[])
    assert _semantic_request_refusal_result(question, 'en') is None


@pytest.mark.parametrize('extra', [
    {'recordIdentity': 'IN-2026-9999999'}, {'timeRange': '2026-10-08'},
    {'requestedAttributes': ['ML-1-1-9999999']},
    {'slotUpdates': [{'field':'businessFocus','source':'page','value':'overdue','evidence':'late'}]},
    {'slotUpdates': [{'field':'businessFocus','source':'current','value':'overdue','evidence':'absent quote'}]},
    {'slotUpdates': [{'field':'businessFocus','source':'current','value':'paid','evidence':'late'}]},
    {'unresolvedSlots': ['timeField']}, {'readOnly': False},
])
def test_invalid_semantics_do_not_become_routes_or_facts(extra):
    with pytest.raises(ValueError):
        validate_task(task(**extra), 'List late inspection tasks', {})


def test_previous_facts_and_routes_are_not_sent_to_interpreter():
    context = {'currentPage': '/dashboard', 'previousIntent': {
        'question': 'List overdue inspection tasks', 'page': '/happiness/refunds',
        'facts': ['7'], 'recordIdentity': 'IN-2026-9999999'}}
    assert semantic_context(context) == {'previousIntent': {'question': 'List overdue inspection tasks'}}
    with pytest.raises(ValueError):
        validate_task(task(recordIdentity='IN-2026-9999999', contextRelation='continue'), 'Show details', context)


def test_literals_in_a_new_topic_cannot_come_from_prior_user_question():
    context = {'previousIntent': {'question':'Show IN-2026-9999999'}}
    with pytest.raises(ValueError):
        validate_task(task(recordIdentity='IN-2026-9999999'), 'List late tasks', context)
    assert validate_task(task(recordIdentity='IN-2026-9999999', contextRelation='continue'),
                         'Show its details', context).task.recordIdentity == 'IN-2026-9999999'


def test_concurrent_turns_do_not_share_interpretation():
    async def turn(question, business):
        token = current_task.set(validate_task(task(businessObject=business), question, {}))
        try:
            await asyncio.sleep(0)
            assert semantic_task(question).businessObject == business
            assert semantic_task('other') is None
        finally:
            current_task.reset(token)
    async def run():
        await asyncio.gather(turn('first', 'inspection tasks'), turn('second', 'content applications'))
    asyncio.run(run())
    assert current_task.get() is None


def test_literal_subject_binding_supports_possessive_without_special_target_names():
    question = 'Find only Alpha Ltd’s own inspection history. Do not include other targets.'
    data = task(businessObject='inspection records').model_dump()
    data['subjectBindings'] = [dict(semanticRole='business_target', name='Alpha Ltd',
                                   questionQuote='Alpha Ltd’s own inspection history')]
    current_task.set(validate_task(ReaderTaskSpec(**data), question, {}))
    assert _inspection_target_history_name(question) == 'Alpha Ltd'
    data['subjectBindings'][0]['name'] = 'another institution'
    with pytest.raises(ValueError, match='subject_unbound'):
        validate_task(ReaderTaskSpec(**data), question, {})


def test_plural_targets_is_not_a_named_target():
    assert _inspection_target_history_name('Show inspection history, not other targets.') == ''


def test_arabic_semantic_labels_are_rejected_not_misrouted():
    with pytest.raises(ValueError, match='canonical_english'):
        validate_task(task(businessObject='مهام التفتيش'), 'اعرض مهام التفتيش', {})


def test_profile_kind_is_not_dependent_on_business_object_synonyms():
    question = 'Tell me which department and role I am using.'
    data = task(businessObject='signed in user', requestedMeasures=[],
                requestedAttributes=['department', 'role']).model_dump()
    current_task.set(validate_task(ReaderTaskSpec(**data, requestKind='account_profile'), question, {}))
    assert profile_request(question)
    data['recordIdentity'] = 'current user'
    with pytest.raises(ValueError, match='identity_unbound'):
        validate_task(ReaderTaskSpec(**data, requestKind='account_profile'), question, {})


def test_other_inspectors_exclude_current_identity_not_matching_display_name():
    receipt = dict(verified=True, stablePasses=2, pagesRead=4, total=3,
        scopeTotals={'TeamTodo':3, 'TeamCompleted':0}, tasks={
            'IN-0001':dict(inspector='Shared Name', inspectorIds=['current-id'], route='A', scope='TeamTodo'),
            'IN-0002':dict(inspector='Shared Name', inspectorIds=['other-id'], route='B', scope='TeamTodo'),
            'IN-0003':dict(inspector='Unknown identity', inspectorIds=[], route='', scope='TeamTodo')})
    projected = bounded_portal_observation({'inspectionTeamAssignments': receipt})['inspectionTeamAssignments']
    assert projected['tasks']['IN-0002']['inspectorIds'] == ['other-id']
    result = _verified_inspection_team_assignments_result(projected,
        'Show other inspectors’ tasks and routes.', 'team', 'current-id')
    assert any('IN-0002' in fact and 'route B' in fact for fact in result.facts)
    assert not any('IN-0001' in fact or 'IN-0003' in fact for fact in result.facts)
    assert result.status == 'not_confirmed'
    assert 'other_inspector_assignment_unverified' in result.missing
    assert any('Excluded 1' in fact for fact in result.facts)
def test_partial_queue_note_does_not_label_knowledge_as_business_records():
    from app.service import _needs_partial_record_note
    assert not _needs_partial_record_note({'page': '', 'answerShape': 'overview', 'completeness': 'bounded'})
    assert _needs_partial_record_note({'page': '/content/ContentApplications', 'answerShape': 'list', 'completeness': 'bounded'})
    assert not _needs_partial_record_note({'page': '/content/ContentApplications', 'answerShape': 'list', 'completeness': 'complete'})


@pytest.mark.parametrize('question', ['Summarize pending Content requests by status and priority.',
    'لخّص طلبات المحتوى المعلقة حسب الحالة والأولوية، ولا تسرد كل طلب على حدة.'])
@pytest.mark.parametrize('filters', [['pending'], ['pending content requests'], ['pending status'], ['status is pending']])
@pytest.mark.parametrize('measure', ['count of content requests', 'count of pending content requests'])
def test_status_priority_summary_groups_complete_native_queue(question, filters, measure):
    from app.portal_reader import _application_status_summary_requested, _application_status_summary_result
    from test_application_module_binding import review_fixture
    bind(question, businessObject='content requests', requestedMeasures=[measure],
        requestedAttributes=['status', 'priority'], groupBy=['status', 'priority'],
        filters=filters, outputShape='overview')
    assert _application_status_summary_requested(question)
    observation, receipt = review_fixture()
    result = _application_status_summary_result(receipt, observation, question=question, page='/content/ContentApplications')
    assert result.status == 'success' and result.completeness == 'complete'
    assert sum(result.intent_context['statusCounts'].values()) == 4
    assert result.intent_context['priorityAvailable'] is False
    assert 'APP-A' not in str(result.facts)
    assert _application_status_summary_result(dict(receipt, stablePasses=1), observation,
        question=question, page='/content/ContentApplications').status == 'not_confirmed'


@pytest.mark.parametrize('filters', [['pending content requests', 'assigned to someone'], ['pending review content requests']])
def test_status_summary_never_drops_unhandled_predicate(filters):
    from app.portal_reader import _application_status_summary_requested
    question = 'Summarize Content requests by status and priority for someone.'
    bind(question, businessObject='content requests', requestedMeasures=['count'],
        requestedAttributes=['status', 'priority'], groupBy=['status', 'priority'],
        filters=filters, outputShape='overview')
    assert not _application_status_summary_requested(question)
