import json
import pytest
from app.portal_reader import (
    _api_native_source, observation_result_from_plan, _guard_requested_team_scope,
    ReaderOutcome, knowledge_search_query, UserPermissionContext, _bind_observed_actions,
    PortalReadRequest, _api_evidence_fallback_plan,
)
from app.reader_limits import requested_record_limit
from app.service import _reader_select_requested_records, reader_natural_answer_is_grounded


def native():
    return {'readHealth': {'healthy': True}, 'apiEvidence': {'operationKey': 'POST /api/work/query',
        'data': {'items': [{'ref': 'REF-100', 'status': 'Waiting'}, {'ref': 'REF-101', 'status': 'Waiting'}], 'totalCount': 9}},
        'sectionSummaries': [{'kind': 'table', 'nodeId': 'table-1', 'heading': '',
          'columnHeaders': ['Reference', 'Status'], 'selectedState': 'To Do',
          'selectedTabPath': ['Team Work', 'To Do'],
          'rowFields': [{'Reference': 'REF-100', 'Status': 'Waiting'}, {'Reference': 'REF-101', 'Status': 'Waiting'}]}]}


def test_api_projection_keeps_matching_native_view_without_inventing_permission():
    obs = native()
    plan, _ = _api_evidence_fallback_plan(obs['apiEvidence'], answer_shape='list')
    result = observation_result_from_plan(plan, obs, observed_page='/work', verified_scope='unknown')
    assert result.source_section == 'table-1' and result.selected_state == 'To Do'
    assert result.scope == 'unknown'  # view association is not permission expansion
    assert _guard_requested_team_scope(ReaderOutcome(result, {'observation': obs}), {}, 'Show team work').result.status == 'success'


@pytest.mark.parametrize('change', ['wrong_rows', 'ambiguous', 'unhealthy', 'numeric', 'empty'])
def test_api_source_binding_rejects_unsupported_or_ambiguous_identity(change):
    obs = native()
    if change == 'wrong_rows': obs['sectionSummaries'][0]['rowFields'][0]['Reference'] = 'REF-999'
    if change == 'ambiguous': obs['sectionSummaries'].append({**obs['sectionSummaries'][0], 'nodeId': 'table-2'})
    if change == 'unhealthy': obs['readHealth']['healthy'] = False
    if change == 'numeric': obs['sectionSummaries'][0]['rowFields'] = [{'Reference': '1000'}]
    if change == 'empty': obs['sectionSummaries'][0]['rowFields'] = []
    assert _api_native_source(obs) is None


@pytest.mark.parametrize('question,n', [
    ('Show only the first three records.',3), ('Clear that search and show three queued records again.',3),
    ('Show up to five tasks.',5), ('List 2 accounts.',2), ('Show 7 days of records.',None),
    ('How many records? There were three yesterday.',None), ('Show records with 3 warnings.',None),
])
def test_requested_cardinality_is_not_a_filter_or_time_value(question,n):
    assert requested_record_limit(question) == n


def test_record_limit_keeps_separately_verified_total():
    obs=native()
    obs['apiEvidence']['data']['items']=[{'recordNo':f'REF-{i}', 'statusName':'Waiting'} for i in range(100,108)]
    plan,_=_api_evidence_fallback_plan(obs['apiEvidence'],answer_shape='list',semantic_query='Show three records.')
    rows=[json.loads(f) for f in plan['facts']]
    assert len(rows)==4 and sum('recordNo' in r for r in rows)==3
    result={**plan,'facts':[json.dumps({'Reference':f'REF-{i}'}) for i in range(100,107)]+[json.dumps({'totalCount':9})]}
    selected=_reader_select_requested_records(result,'Show three records.')
    assert len(selected['facts'])==4 and json.loads(selected['facts'][-1])['totalCount']==9


def test_conceptual_followup_keeps_page_in_query_but_switch_drops_it():
    context={'resolvedIntent':{'relation':'continue','slots':{}},'sourceHint':{'page':'/work/items'}}
    assert '/work/items' in knowledge_search_query('Why does one list show Assigned Time and the other Last Update?', UserPermissionContext(), context)
    context['resolvedIntent']['relation']='switch'
    assert '/work/items' not in knowledge_search_query('Explain another module.', UserPermissionContext(), context)


def test_child_tab_can_follow_bound_parent_but_not_an_unobserved_first_action():
    obs={'controls':['Team Work'],'sectionSummaries':[]}
    actions=({'type':'switch_tab','role':'tab','name':'Team Work'}, {'type':'switch_tab','role':'tab','name':'Completed','section':'invented'})
    bound,error=_bind_observed_actions(PortalReadRequest('/work',actions),obs,record_identity='')
    assert not error and bound.actions[-1] == {'type':'switch_tab','role':'tab','name':'Completed'}
    assert _bind_observed_actions(PortalReadRequest('/work',(actions[-1],)),obs,record_identity='')[1]


def test_blank_owner_does_not_support_negative_assignment_claim():
    verified='Reference: REF-100; Inspector: ; Status: Queued'
    assert not reader_natural_answer_is_grounded('These are not assigned to you.',verified,'Are these assigned to me?')
    assert reader_natural_answer_is_grounded('The assignment to you is not confirmed.',verified,'Are these assigned to me?')
