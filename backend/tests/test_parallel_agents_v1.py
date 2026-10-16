import asyncio
import copy
import json
from types import SimpleNamespace

import httpx
import pytest

from app import parallel_agents as pa
from app.generic_reader import GenericResult, GenericOutcome
from app.portal_reader import UserPermissionContext, ReaderTimeoutBudget
from app.principal import Principal
from app.readonly_api import ReadonlyAPI, CATALOG, ReadParameters
from app.timing import Trace, CURRENT, span, request, timing_header, ingest
from app.timing_report import report

P=Principal('staff-1','tenant-1','request-1',umc_token='test-private-session')
PERMISSION=UserPermissionContext(user_id=P.user_id,roles=('License Staff',),
    pages=('/licensing/applications','/licensing/team-management'))
INFO={'ok':True,'result':{'data':{'id':P.user_id,'rolesInfo':[{'roleName':'License Staff'}],
    'listSysPermission':[{'frontendRoute':p} for p in PERMISSION.pages]}}}


def run(coro): return asyncio.run(coro)


def test_seven_skills_disable_nine_unscoped_operations():
    assert len(CATALOG)==7
    ops=[o for s in CATALOG for o in s['operations']]
    assert len(ops)==26 and sum(o['enabled'] for o in ops)==17
    assert all(not o['enabled'] for o in ops if o['id'].startswith(('LIC','BOOK')))


@pytest.mark.parametrize('op', ['Approve','LIC06','BOOK01'])
def test_forbidden_operation_never_sends_http(op):
    calls=[]
    async def scenario():
        api=ReadonlyAPI('http://admin.test',PERMISSION,P,transport=httpx.MockTransport(lambda r:calls.append(r)))
        with pytest.raises(PermissionError):
            await api.invoke('umc.admin-licensing-work.read',op)
        await api.close()
    run(scenario());assert not calls


@pytest.mark.parametrize('params',[{'PageIndex':4},{'PageSize':21},{'UserId':'other'},{'url':'http://evil.test'},{'PageIndex':True}])
def test_model_parameters_cannot_change_identity_origin_or_limits(params):
    with pytest.raises(ValueError): ReadParameters.model_validate(params)


def test_identity_mismatch_denies_api_before_http():
    async def scenario():
        api=ReadonlyAPI('http://admin.test',UserPermissionContext(user_id='other'),P)
        with pytest.raises(PermissionError):await api.invoke('umc.admin-licensing-work.read','ADM01')
        await api.close()
    run(scenario())


def test_api_project_and_personal_task_query_single_flight():
    calls=[]
    def handler(req):
        calls.append(req)
        return httpx.Response(200,json={'data':{'page':{'items':[{'applicationNumber':'ML-123',
            'status':'Pending Review','taskId':'task-1','password':'secret','phone':'123','formData':'private'}], 'total':1}}})
    async def scenario():
        api=ReadonlyAPI('http://admin.test',PERMISSION,P,transport=httpx.MockTransport(handler))
        result=await asyncio.gather(*(api.invoke('umc.admin-licensing-work.read','ADM01',parameters={'Keyword':'ML-123'}) for _ in range(2)))
        assert result[0]['page']['items']==[{'applicationNumber':'ML-123','status':'Pending Review','taskId':'task-1'}]
        await api.close()
    run(scenario());assert len(calls)==1
    assert calls[0].method=='POST' and calls[0].url.path=='/api/Application/MyTodoPage'


def test_team_urgent_requires_current_module_leader_in_order():
    calls=[]
    def handler(req):
        calls.append(req.url.path)
        return httpx.Response(200,json={'data':False})
    async def scenario():
        api=ReadonlyAPI('http://admin.test',PERMISSION,P,transport=httpx.MockTransport(handler))
        with pytest.raises(PermissionError):await api.invoke('umc.admin-licensing-work.read','ADM05')
        await api.close()
    run(scenario());assert calls==['/api/Application/IsLeader']


def test_post_api_rejects_wrong_response_contract():
    async def scenario():
        api=ReadonlyAPI('http://admin.test',PERMISSION,P,transport=httpx.MockTransport(lambda r:httpx.Response(200,json={'data':[]})))
        with pytest.raises(ValueError):await api.invoke('umc.admin-licensing-work.read','ADM01')
        await api.close()
    run(scenario())


def test_timing_preserves_attempt_owner_and_duration_without_credentials():
    async def scenario():
        trace=Trace('request-1');token=CURRENT.set(trace)
        try:
            with span('turn.end_to_end'):
                async with httpx.AsyncClient(transport=httpx.MockTransport(lambda r:httpx.Response(403,json={}))) as client:
                    await request(client,'POST','http://admin.test/api/Application/MyReviewDetail/task-123456',owner='UMC',
                                  headers={'Authorization':'Bearer private'},json={'private':'payload'})
            encoded=json.dumps(trace.export());assert 'private' not in encoded and 'payload' not in encoded
            call=next(s for s in trace.spans if s['stage']=='http.request')
            assert call['owner']=='UMC' and call['status']=='http_error' and call['statusCode']==403
            assert call['durationMs']>=0 and call['startUtc']<=call['endUtc']
            assert call['route'].endswith('/{id}') and call['upstreamInternalMs'] is None
        finally:CURRENT.reset(token)
    run(scenario())


def test_parallel_result_conflict_and_permission_denial_fail_closed():
    task=SimpleNamespace(outputShape='detail',recordIdentity='ML-123',requestedAttributes=['status'],requestedMeasures=[],needsLiveData=True)
    api=pa.AgentResult('api','success',facts=['Pending Review'],evidence={'recordIdentity':'ML-123','status':'Pending Review'})
    page=pa.AgentResult('page','success',evidence={'public':{'result':'success','facts':['ML-123 Status: Completed']}})
    kb=pa.AgentResult('knowledge','success')
    result,conflict=pa.merge_results({'api':api,'page':page,'knowledge':kb},task)
    assert result['result']=='not_confirmed' and not result['facts'] and conflict
    page.evidence={'public':{'result':'no_permission','facts':[]}}
    result,_=pa.merge_results({'api':api,'page':page,'knowledge':kb},task)
    assert result['result']=='no_permission'


def test_three_agents_start_before_any_result_and_isolate_failure(monkeypatch):
    started=set();barrier=asyncio.Event()
    async def mark(name):
        started.add(name)
        if len(started)==3:barrier.set()
        await asyncio.wait_for(barrier.wait(),1)
    class FakeGateway:
        async def get_user_info(self,p):return copy.deepcopy(INFO)
        async def invoke(self,p,tool,args,**kwargs):
            await mark('knowledge')
            return {'ok':True,'result':{'chunks':[]}}
    class FakePlanner:
        async def generic_reader_json(self,**kwargs):raise ValueError('invalid')
    class FakePage:
        def __init__(self,*a,**kw):pass
        async def run(self,*a,**kw):
            await mark('page')
            return GenericOutcome(GenericResult({'result':'success','facts':['verified'],'scope':'personal'}),{})
    async def fake_api(*a,**kw):
        await mark('api');raise RuntimeError('unavailable')
    monkeypatch.setattr(pa,'AdminPortalReader',FakePage);monkeypatch.setattr(pa,'api_agent',fake_api)
    async def scenario():
        reader=pa.ParallelReader(FakeGateway(),FakePlanner(),portal_base_url='http://admin.test',knowledge_folder_id='folder',
                                 timeout_budget=ReaderTimeoutBudget(total_seconds=15))
        outcome=await reader.run(P,'Show my tasks')
        assert outcome.result.public_json()['facts']==['verified']
        assert outcome.audit_evidence['agents']['api']['status']=='load_failed'
    run(scenario());assert started=={'api','page','knowledge'}


def test_parent_cancellation_awaits_all_agent_cleanup(monkeypatch):
    started=set();stopped=set();all_started=asyncio.Event()
    async def wait(name):
        started.add(name)
        if len(started)==3:all_started.set()
        try:await asyncio.sleep(100)
        finally:stopped.add(name)
    class Gateway:
        async def get_user_info(self,p):return copy.deepcopy(INFO)
        async def invoke(self,*a,**kw):return await wait('knowledge')
    class Planner:
        async def generic_reader_json(self,**kw):raise ValueError()
    class Page:
        def __init__(self,*a,**kw):pass
        async def run(self,*a,**kw):return await wait('page')
    monkeypatch.setattr(pa,'AdminPortalReader',Page)
    monkeypatch.setattr(pa,'api_agent',lambda *a,**kw:wait('api'))
    async def scenario():
        reader=pa.ParallelReader(Gateway(),Planner(),portal_base_url='http://admin.test',knowledge_folder_id='folder',
                                 timeout_budget=ReaderTimeoutBudget(total_seconds=15))
        job=asyncio.create_task(reader.run(P,'Show my tasks'))
        await asyncio.wait_for(all_started.wait(),1);job.cancel()
        with pytest.raises(asyncio.CancelledError):await job
        assert stopped==started
        assert not [t for t in asyncio.all_tasks() if t is not asyncio.current_task() and not t.done()]
    run(scenario())


def test_concurrent_turn_brokers_never_share_identity_or_results():
    seen=[]
    class Gateway:
        async def invoke(self,p,*a,**kw):
            seen.append(p.user_id);return {'ok':True,'result':{'identity':p.user_id}}
    async def scenario():
        a,b=pa.KnowledgeBroker(Gateway(),P),pa.KnowledgeBroker(Gateway(),Principal('other','tenant','req',umc_token='other'))
        args={'query':'same','folder_id':'folder'}
        vals=await asyncio.gather(a.search(args),a.search(args),b.search(args))
        assert vals[0]['result']['identity']!=vals[2]['result']['identity']
        await a.close();await b.close()
    run(scenario());assert sorted(seen)==['other','staff-1']


def test_swagger_documents_timing_auth_and_null_upstream_internals():
    from app.main import app
    spec=app.openapi();path=spec['paths']['/api/v1/conversations/{conversation_id}/timings']['get']
    assert {'401','403','404'}<=set(path['responses'])
    assert 'TimingSpan' in spec['components']['schemas']
    assert 'UMC-internal' in path['description']


@pytest.mark.parametrize('filters,expected',[
 (['licensing application identifier ML-123'],True),
 (['application number ML-123'],True),
 (['ML-123 and paid only'],False),
 (['ML-123 before 2026-01-01'],False),
 (['other team application ML-123'],False),
])
def test_identity_filter_binding_preserves_all_additional_constraints(filters,expected):
    task=SimpleNamespace(recordIdentity='ML-123',filters=filters)
    assert pa.only_identity_filters(task) is expected


def test_unique_authorized_module_routes_generic_application_but_ambiguous_does_not():
    task=SimpleNamespace(businessObject='application',businessFocus='',requestedAttributes=['status'],
        requestedMeasures=[],requestedScope='unknown',groupBy=[],recordIdentity='ML-123')
    skills,module=pa.selected_skills(task,{},PERMISSION)
    assert module=='licensing' and 'umc.team-workload.read' in skills
    both=UserPermissionContext(pages=PERMISSION.pages+('/content/ContentApplications',))
    assert pa.selected_skills(task,{},both)[1] is None


@pytest.mark.parametrize('value,expected',[
 ('current status of the request',True),('workflow stage',True),('approval status',True),
 ('current status and payment amount',False),('status history',False),('application owner',False),
])
def test_status_coverage_never_drops_other_requested_attributes(value,expected):
    assert pa.status_attribute(value) is expected


def test_arabic_canonical_request_uses_same_unique_authorized_application_module():
    task=SimpleNamespace(businessObject='request',businessFocus='current status',requestedAttributes=['current status'],
        requestedMeasures=[],requestedScope='unknown',groupBy=[],recordIdentity='ML-123')
    assert pa.selected_skills(task,{},PERMISSION)[1]=='licensing'


def test_generic_dashboard_task_count_does_not_route_to_application_population():
    task=SimpleNamespace(businessObject='tasks',businessFocus='todo',requestedAttributes=[],requestedMeasures=['count'],
        requestedScope='unknown',groupBy=[],recordIdentity='')
    assert pa.selected_skills(task,{},PERMISSION)[1] is None


@pytest.mark.parametrize('filters,module,expected',[
 (['application identifier ML-123','licensing department'],'licensing',True),
 (['application identifier ML-123','licensing department'],'content',False),
 (['application identifier ML-123','another licensing department'],'licensing',False),
 (['application identifier ML-123','department id 99'],'licensing',False),
])
def test_only_controller_fixed_module_filter_can_be_bound(filters,module,expected):
    assert pa.only_identity_filters(SimpleNamespace(filters=filters,recordIdentity='ML-123'),module) is expected



def test_policy_retrieval_without_grounded_answer_is_not_a_scope_denial():
    task=SimpleNamespace(needsLiveData=False,requestKind='business_read',outputShape='detail',
        recordIdentity='',requestedAttributes=['SLA meaning'],requestedMeasures=[])
    page=pa.AgentResult('page','not_confirmed',evidence={'public':{'result':'not_confirmed','facts':[],
        'missing':['requested_group_scope_unverified']}})
    api=pa.AgentResult('api','not_applicable')
    knowledge=pa.AgentResult('knowledge','not_confirmed',missing=['knowledge_no_applicable_policy_excerpt'])
    value,_=pa.merge_results({'api':api,'page':page,'knowledge':knowledge},task)
    assert value['result']=='not_confirmed' and value['missing']==knowledge.missing
    assert value['workflowState']=='knowledge_policy_unavailable'



def test_each_remote_call_receives_the_unique_client_http_parent_span():
    seen=[]
    def handler(req):
        seen.append(req.headers['X-DSH-Parent-Span']);return httpx.Response(200,json={})
    async def scenario():
        trace=Trace('request-1');ctx=CURRENT.set(trace)
        try:
            with span('parent'):
                async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
                    await request(client,'GET','http://gateway.test/read',owner='DSH.platform-gateway')
                    await request(client,'GET','http://gateway.test/read',owner='DSH.platform-gateway')
            calls=[s['spanId'] for s in trace.spans if s['stage']=='http.request']
            assert seen==calls and len(set(seen))==2
        finally:CURRENT.reset(ctx)
    run(scenario())


@pytest.mark.parametrize('quote,expected',[
 ('Select the Completed tab to view completed tasks.','success'),
 ('All applications are approved automatically.','not_confirmed'),
])
def test_knowledge_agent_must_bind_every_answer_excerpt_to_retrieved_text(monkeypatch,quote,expected):
    question='How do I view completed licensing tasks?'
    class Gateway:
        async def get_user_info(self,p):return copy.deepcopy(INFO)
        async def invoke(self,*a,**kw):
            return {'ok':True,'result':{'total':1,'chunks':[{'id':'manual-1','source_name':'Licensing manual',
                'content':'Select the Completed tab to view completed tasks.'}]}}
    class Planner:
        async def generic_reader_json(self,**kw):
            if kw['schema'].get('title')=='KBExtract':
                return {'excerpts':[{'sourceId':'0','quote':quote}]}
            return {'stage':'task','businessObject':'licensing tasks','businessFocus':'navigation guidance',
                'requestedScope':'personal','requestedGrain':'task','requestedMeasures':[],
                'requestedAttributes':['navigation steps'],'groupBy':[],'timeRange':'','filters':[],
                'outputShape':'detail','needsLiveData':False,'readOnly':True,'searchQuery':question,
                'unresolvedSlots':[],'requestKind':'business_read'}
    class Page:
        def __init__(self,*a,**kw):pass
        async def run(self,*a,**kw):return GenericOutcome(GenericResult({'result':'not_confirmed','facts':[],
            'missing':['page_not_needed_for_policy']}),{})
    monkeypatch.setattr(pa,'AdminPortalReader',Page)
    async def scenario():
        reader=pa.ParallelReader(Gateway(),Planner(),portal_base_url='http://admin.test',knowledge_folder_id='folder',
                                 timeout_budget=ReaderTimeoutBudget(total_seconds=15))
        result=await reader.run(P,question)
        assert result.result.public_json()['result']==expected
        facts=result.result.public_json().get('facts',[])
        assert (facts==[quote]) if expected=='success' else not facts
    run(scenario())



def test_member_projection_enforces_exact_id_even_when_upstream_ignores_it():
    def handler(req):
        if req.url.path.endswith('IsLeader'):return httpx.Response(200,json={'data':True})
        return httpx.Response(200,json={'data':[
            {'userId':'member-a','userName':'A','totalTaskCount':4,'completedTaskCount':2,'sla':99,'leaveTypeNameEn':'private'},
            {'userId':'member-b','userName':'B','totalTaskCount':6,'completedTaskCount':3},
            {'userId':'member-zero','userName':'Z','totalTaskCount':0,'completedTaskCount':0}]})
    async def scenario():
        api=ReadonlyAPI('http://admin.test',PERMISSION,P,transport=httpx.MockTransport(handler))
        value=await api.invoke('umc.team-workload.read','TL3',parameters={'MemberId':'member-a'})
        assert value['members']==[{'userId':'member-a','userName':'A','totalTaskCount':4,'completedTaskCount':2}]
        assert value['populationComplete'] is False and 'sla_formula_not_authoritative' in value['missing']
        await api.close()
    run(scenario())



def test_policy_text_cannot_fill_missing_authenticated_profile_facts():
    task=SimpleNamespace(needsLiveData=False,requestKind='account_profile',outputShape='detail',
        recordIdentity='',requestedAttributes=['department'],requestedMeasures=[])
    page=pa.AgentResult('page','not_confirmed',evidence={'public':{'result':'not_confirmed','facts':[],
        'missing':['profile_department_not_confirmed']}})
    api=pa.AgentResult('api','not_applicable')
    knowledge=pa.AgentResult('knowledge','success',facts=['Example officer department: Licensing.'])
    value,_=pa.merge_results({'api':api,'page':page,'knowledge':knowledge},task)
    assert value['result']=='not_confirmed' and not value['facts']



@pytest.mark.parametrize('kind,obj,valid',[
 ('assistant_capabilities','license applications',False),
 ('assistant_capabilities','AI assistant capabilities in licensing',True),
 ('account_profile','completed licensing applications',False),
 ('account_profile','current user role and department',True),
 ('business_read','license applications navigation',True),
])
def test_semantic_kind_must_match_the_actor_and_business_object(kind,obj,valid):
    candidate=SimpleNamespace(requestKind=kind,businessObject=obj)
    if valid:pa.validate_semantic_kind(candidate)
    else:
        with pytest.raises(ValueError):pa.validate_semantic_kind(candidate)
