import json
from copy import deepcopy
import pytest
from app.portal_reader import (ReaderOutcome,ReaderResult,_documented_object_source,
    reader_answer_shape,_native_optional_record_fields,_native_status_values,
    _native_bounded_summary,_observed_identity_search)
from app.reader_intent import resolve_literal_same_record_reference
from test_admin_portal_reader import Gateway,Planner,run_reader,portal_plan_for,user_info_for_paths


def native(state='Permits'):
    return {'readHealth':{'healthy':True},'tabControls':[{'name':state,'selected':True}],
        'sectionSummaries':[{'kind':'table','nodeId':'t1','selectedState':state,
         'columnHeaders':['Permit No.','Status','Effective Date','Expiry Date'],
         'rowFields':[{'Permit No.':'P-1','Status':'Active','Effective Date':'30/09/2026','Expiry Date':'30/09/2026'},
                      {'Permit No.':'P-2','Status':'Active','Effective Date':'18/09/2026','Expiry Date':'30/09/2026'}]}]}


def outcome(obs=None,status='not_confirmed',missing=('planner_error',)):
    return ReaderOutcome(ReaderResult(status=status,summary='',page='/work/permits',missing=missing),{'observation':obs or native()})


def test_explicit_module_cannot_be_replaced_by_a_matching_queue_in_another_module():
    kb={'ok':True,'chunks':[
        {'content':'## Semantic node: Work permitted records\n- **page:** `/work/permits`\n- **section:** Permits\n- **content:** Permit No.; Status.'},
        {'content':'## Semantic node: Other applications\n- **page:** `/other/applications`\n- **section:** To Do\n- **content:** Application No.; Status.'}]}
    assert _documented_object_source(kb,'How many Work applications in the To Do queue are there?',{})==''
    assert _documented_object_source(kb,'Show Other applications in To Do.',{})=='/other/applications'


def test_listing_date_columns_does_not_request_an_expiration_countdown():
    assert reader_answer_shape('Show the current permits, including Effective Date, Expiry Date, and Status where available.')=='list'
    assert reader_answer_shape('Show permits expiring soon, including Expiry Date.')=='due'


@pytest.mark.parametrize('phrase',['including their identifiers and statuses where those fields exist','with Status where available'])
def test_optional_field_list_preserves_native_status_instead_of_api_code(phrase):
    old=outcome(status='success',missing=())
    result=_native_optional_record_fields(old,'Show the first three permits, '+phrase+'.').result
    assert result.status=='success' and json.loads(result.facts[0])['Status']=='Active'
    assert 'Permit No.' in result.facts[0]


@pytest.mark.parametrize('change,allowed',[('',True),('unhealthy',False),('multiple',False),('permission',False)])
def test_status_values_require_one_healthy_current_native_list(change,allowed):
    obs=native()
    if change=='unhealthy':obs['readHealth']['healthy']=False
    if change=='multiple':obs['sectionSummaries'].append(deepcopy(obs['sectionSummaries'][0]))
    old=outcome(obs,status='no_permission' if change=='permission' else 'not_confirmed')
    result=_native_status_values(old,'Which permit statuses are shown in this list?').result
    assert (result.status=='success') is allowed
    if allowed:assert result.facts[0]=='Status values in the currently observed rows: Active.' and 'not a complete' in result.facts[1]
    assert _native_status_values(old,'What do these statuses mean?')==old


@pytest.mark.parametrize('state,allowed',[('Library Analytics',True),('Unrelated Analytics',False)])
def test_bounded_native_summary_matches_selected_view_and_excludes_contacts(state,allowed):
    obs=native(state);obs['sectionSummaries'][0]['columnHeaders'].append('Email')
    obs['sectionSummaries'][0]['rowFields'][0]['Email']='private@example.test'
    result=_native_bounded_summary(outcome(obs),'Show a bounded summary of the current Library Analytics view.').result
    assert (result.status=='success') is allowed
    if allowed:assert 'private@' not in str(result.facts) and '2 observed rows' in result.facts[-1]


def test_same_identifier_search_retains_verified_identity_without_forcing_a_detail_click():
    q='Find that same application by its Application No.'
    prior={'previousIntent':{'question':'Give me one Application No.','recordIdentity':'APP-17'}}
    resolved=resolve_literal_same_record_reference(q,prior).public_json()
    assert resolved['slots']['answerShape']['value']=='list'
    obs={'filterControls':[{'label':'Search','role':'textbox','selector':'input[placeholder="Search"]','filterSurface':True,'commands':[],'selected':[]}]}
    plan=_observed_identity_search(q,{'resolvedIntent':resolved},obs,'/work')
    assert plan['portalRequest']['actions']==[{'type':'filter','selector':'input[placeholder="Search"]','value':'APP-17'}]
    assert _observed_identity_search(q,{},obs,'/work') is None


def test_post_switch_planning_failure_keeps_deep_native_rows_for_recovery():
    obs=native('Video Games')
    class FailingPlanner(Planner):
        async def plan_admin_portal_read(self,q,p,k,conversation_context=None):
            if k.get('portalObservation'):raise ValueError('invalid response')
            return portal_plan_for('/work/permits',[{'type':'switch_tab','role':'tab','name':'Video Games'}])
    g=Gateway(info={'ok':True,'result':user_info_for_paths('/work/permits')},portal_result={'ok':True,'result':{'result':'not_confirmed','observation':obs}})
    result=run_reader(g,FailingPlanner(),question='Show the first three records with Status where available.').result
    assert result.status=='success' and json.loads(result.facts[0])['Status']=='Active'
