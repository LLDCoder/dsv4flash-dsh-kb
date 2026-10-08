"""Projection/dispatch contracts; fixture values are not browser acceptance."""
import copy
import pytest

from app.portal_reader import _team_overdue_task_count_requested, _team_overdue_task_count_result, _team_overdue_page_actions
from app.reader_semantic_task import ReaderTaskSpec, current_task, validate_task
from app.service import reader_evidence_only_response


@pytest.fixture(autouse=True)
def clear_task():
    token = current_task.set(None)
    yield
    current_task.reset(token)


def source():
    return {'tabControls': [{'name': 'Team Tasks', 'selected': True}, {'name': 'To Do', 'selected': True}],
            'sectionSummaries': [{'kind': 'table', 'nodeId': 'verified-table',
                'columnHeaders': ['Task No.', 'Assigned To', 'SLA'], 'rowFields': [
                    {'Task No.': 'EXAMPLE-A', 'Assigned To': 'Owner One', 'SLA': '4d Overdue'},
                    {'Task No.': 'EXAMPLE-B', 'Assigned To': 'Owner Two', 'SLA': '1d Overdue'},
                    {'Task No.': 'EXAMPLE-C', 'Assigned To': 'Owner One', 'SLA': '-'},
                    {'Task No.': 'EXAMPLE-D', 'Assigned To': 'Owner Two', 'SLA': 'On Time'}]}],
            'apiDiscovery': {'candidates': [{'status': 200, 'responseEvidence': {'data': {
                'items': [{}, {}, {}, {}], 'pageIndex': 1, 'pageSize': 10, 'total': 4}}}]}}


def bind(question, **changes):
    data = dict(stage='task', businessObject='tasks', requestedScope='team', requestedGrain='task',
                requestedMeasures=['count of overdue tasks'], requestedAttributes=['responsible person name'],
                filters=['overdue tasks', 'team scope'], outputShape='count', timeRange='current',
                groupBy=[], searchQuery='overdue team tasks', unresolvedSlots=[], readOnly=True, needsLiveData=True)
    current_task.set(validate_task(ReaderTaskSpec(**(data | changes)), question, {}))


@pytest.mark.parametrize('question', ['Count late work in our team and name its owners.',
                                   'كم عدد المهام المتأخرة في فريقي؟ اذكر العدد وأسماء المسؤولين عنها.'])
def test_task_grain_total_and_owner_names_do_not_switch_to_dated_member_cards(question):
    bind(question)
    assert _team_overdue_task_count_requested(question)
    result = _team_overdue_task_count_result(source(), question=question, page='/happiness/team-management',
                                           scope='team', pages_verified=True)
    assert result.completeness == 'complete' and result.answer_shape == 'count'
    assert '2' in result.facts[0] and 'Owner One' in result.facts[0] and 'Owner Two' in result.facts[0]
    reply = reader_evidence_only_response(result.public_json(), 'ar' if question.startswith('كم') else 'en')
    assert 'Owner One' in reply and 'Owner Two' in reply
    assert 'Team Members' not in reply and 'Finance' not in reply
    if question.startswith('كم'):
        assert 'المهام ذات علامة تأخر' in reply and 'All 4 Team Tasks' not in reply


@pytest.mark.parametrize('changes', [
    {'groupBy': ['team member']}, {'requestedGrain': 'per person'},
    {'requestedMeasures': ['pending count', 'overdue count']}, {'timeRange': 'last month'},
    {'filters': ['overdue tasks in another category']}, {'requestedScope': 'global'},
    {'requestedAttributes': ['responsible person contact details']},
])
def test_additional_grain_measure_date_or_filter_cannot_be_dropped(changes):
    question = 'Count overdue team work.'
    bind(question, **changes)
    assert not _team_overdue_task_count_requested(question)


def test_missing_pages_cannot_claim_complete_or_use_total_as_overdue():
    observation = source()
    observation['apiDiscovery']['candidates'][0]['responseEvidence']['data']['total'] = 18
    result = _team_overdue_task_count_result(observation, question='Count overdue team tasks.',
                                           page='/content/team-management', scope='team', pages_verified=True)
    assert result.completeness == 'bounded'
    assert 'marker: 2' in result.facts[0] and 'Only 4 of 18' in result.facts[1]
    assert 'no SLA marker' in result.facts[2]


def test_verified_paginated_queue_is_not_resampled_to_thirty_rows():
    observation = source()
    observation['sectionSummaries'][0]['rowFields'] = [
        {'Task No.': f'EXAMPLE-{i}', 'Assigned To': 'Owner', 'SLA': '1d Overdue'}
        for i in range(34)]
    observation['apiDiscovery']['candidates'][0]['responseEvidence']['data']['total'] = 34
    result = _team_overdue_task_count_result(observation, question='Count overdue team tasks.',
        page='/happiness/team-management', scope='team', pages_verified=True)
    assert result.completeness == 'complete'
    assert 'marker: 34' in result.facts[0] and 'All 34 Team Tasks' in result.facts[1]


def test_fresh_page_reads_replay_forward_not_presentation_numeric_links():
    observation = source()
    observation['paginationControls'] = [
        {'role': 'link', 'name': '4', 'pagination': True},
        {'role': 'button', 'name': 'left', 'direction': 'previous', 'disabled': True},
        {'role': 'button', 'name': 'right', 'direction': 'next', 'disabled': False}]
    assert _team_overdue_page_actions(observation, 4, action_budget=12) == (
        {'type': 'paginate', 'role': 'button', 'name': 'right', 'direction': 'next'},) * 3
    assert not _team_overdue_page_actions(observation, 4, action_budget=2)
    observation['paginationControls'].pop()
    assert not _team_overdue_page_actions(observation, 4, action_budget=12)


def test_owner_group_on_task_grain_uses_task_assignments_not_member_cards():
    question = 'How many overdue tasks are in our team and who is responsible?'
    bind(question, groupBy=['responsible person'], outputShape='overview')
    assert _team_overdue_task_count_requested(question)
    result = _team_overdue_task_count_result(source(), question=question,
        page='/happiness/team-management', scope='team', pages_verified=True)
    assert 'marker: 2' in result.facts[0]
    assert 'Owner One: 1, Owner Two: 1' in result.facts[1]
    assert not any('Team Members' in fact for fact in result.facts)


def test_forward_replay_requires_verified_first_page_and_unambiguous_control():
    observation = source()
    control = {'role': 'button', 'name': 'right', 'direction': 'next'}
    observation['paginationControls'] = [control, dict(control)]
    assert not _team_overdue_page_actions(observation, 2, action_budget=12)
    observation['paginationControls'] = [control]
    observation['apiDiscovery']['candidates'][0]['responseEvidence']['data']['pageIndex'] = 2
    assert not _team_overdue_page_actions(observation, 3, action_budget=12)


@pytest.mark.parametrize('damage', ['owner', 'sla', 'duplicate', 'completed'])
def test_unverified_schema_or_duplicate_identity_is_not_an_aggregate(damage):
    observation = copy.deepcopy(source())
    node = observation['sectionSummaries'][0]
    if damage == 'duplicate':
        node['rowFields'][1]['Task No.'] = node['rowFields'][0]['Task No.']
    elif damage == 'completed':
        observation['tabControls'][1]['name'] = 'Completed'
    else:
        node['columnHeaders'].remove('Assigned To' if damage == 'owner' else 'SLA')
    assert _team_overdue_task_count_result(observation, question='Count overdue team tasks.',
                                         page='/happiness/team-management', scope='team') is None
