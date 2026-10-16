import asyncio,importlib.util,json,sys
from pathlib import Path
from types import SimpleNamespace
import pytest
from app.inspection_read import exact_inspection_request,inspection_public
from app.portal_reader import bounded_portal_observation

spec=importlib.util.spec_from_file_location('inspection_exact_gateway',Path(__file__).parents[2]/'platform-gateway/app.py')
g=importlib.util.module_from_spec(spec);sys.modules[spec.name]=g;spec.loader.exec_module(g)
N='IN-2026-1000001'
B=('Inspection.TaskManagement.Queued','Inspection.TaskManagement.TeamTasks')
def run(c):return asyncio.run(c)
def native(rows):return {'data':{'items':rows,'totalCount':len(rows),'pageIndex':1,'pageSize':25}}
def team(rows):return {'data':{'page':{'data':rows,'total':len(rows),'pageIndex':1,'pageSize':25}}}

@pytest.mark.parametrize('question,kind',[
 (f'What is the current status of inspection {N}?','status'),
 (f'Which stage has inspection {N} reached now?','status'),
 (f'ما الحالة الحالية للتفتيش {N}؟','status'),
 (f'في أي مرحلة يوجد التفتيش {N} الآن؟','status'),
 (f'For {N}, what materials and steps should I prepare for the inspection?','checklist'),
 (f'For inspection {N}, tell me the documents to have ready and how to prepare before the visit.','checklist'),
 (f'بالنسبة للتفتيش {N}، ما المستندات والخطوات التي يجب أن أجهزها قبل الزيارة؟','checklist'),
 (f'ما الأوراق التي ينبغي تجهيزها وكيف أستعد لزيارة التفتيش رقم {N}؟','checklist')])
def test_bilingual_original_and_rephrased_intent(question,kind):
 assert exact_inspection_request(question)==(N,kind)

@pytest.mark.parametrize('change',[{'timeRange':'last week'},{'requestedAttributes':['status','due date']},{'filters':['status Completed']},{'groupBy':['inspector']}])
def test_status_does_not_drop_other_requirements(change):
 task=SimpleNamespace(readOnly=True,requestKind='business_read',needsLiveData=True,timeRange='',requestedAttributes=['status'],requestedMeasures=[],filters=[],groupBy=[],requestedOrdering=[])
 for k,v in change.items():setattr(task,k,v)
 assert exact_inspection_request(f'Current status of {N}',task) is None

def install(monkeypatch,*,ambiguous=False,wrong_detail=False,wrong_checklist=False,items=70):
 monkeypatch.setattr(g,'READER_OPERATION_CATALOG',g._load_reader_operation_catalog(Path(__file__).parents[2]/'platform-gateway/config/reader-operation-catalog.json'))
 calls=[];active=0;peak=0
 async def fetch(page,url,*,method='GET',parameters=None,**kw):
  nonlocal active,peak
  calls.append((method,url,parameters));active+=1;peak=max(peak,active)
  try:
   await asyncio.sleep(.002)
   if method=='POST':
    return team([{'taskNo':N,'sourceId':'553' if parameters['view']=='todo' else '554'}] if parameters['view']=='todo' or ambiguous else []),200
   if '?' in url:return native([]),200
   if url.endswith('/checklist-template'):
    return {'data':{'taskId':999 if wrong_checklist else 553,'items':[{'checklistCode':f'C{i}','checklistName':f'Actual requirement {i}','isVisibleInChecklist':True} for i in range(items)]}},200
   return {'data':{'id':553,'taskNo':'IN-2026-9999999' if wrong_detail else N,'statusName':'Pending Visit','email':'must not project'}},200
  finally:active-=1
 monkeypatch.setattr(g,'_reader_get_document',fetch)
 return calls,lambda:peak

def test_cross_queue_binding_detail_then_full_checklist_and_no_private_fields(monkeypatch):
 calls,peak=install(monkeypatch)
 r=run(g._inspection_exact_task(object(),N,True,'http://admin.test',B))
 assert r['verified'] and r['bindingScopes']==['TeamTodo'] and len(r['checklist']['items'])==70
 assert peak()==2 and len(calls)==5
 assert calls[-2][1].endswith('/553') and calls[-1][1].endswith('/553/checklist-template')
 assert 'email' not in json.dumps(r)
 projected=bounded_portal_observation({'inspectionExactTask':r})['inspectionExactTask']
 assert len(projected['checklist']['items'])==70
 public=inspection_public(projected,N,'checklist')
 assert len([x for x in public['facts'] if x.startswith('C')])==70
 assert public['result']=='not_confirmed' and 'formal_materials_list_not_provided_by_source' in public['missing']

def test_missing_queue_permission_never_calls_upstream(monkeypatch):
 calls,_=install(monkeypatch)
 r=run(g._inspection_exact_task(object(),N,True,'http://admin.test',()))
 assert not r['verified'] and not calls
 assert not inspection_public(r,N,'checklist')['facts']

def test_ambiguous_reference_never_reads_detail(monkeypatch):
 calls,_=install(monkeypatch,ambiguous=True)
 r=run(g._inspection_exact_task(object(),N,True,'http://admin.test',B))
 assert not r['verified'] and r['reason']=='inspection_identity_ambiguous' and len(calls)==3

def test_wrong_detail_identity_never_reads_checklist(monkeypatch):
 calls,_=install(monkeypatch,wrong_detail=True)
 r=run(g._inspection_exact_task(object(),N,True,'http://admin.test',B))
 assert not r['verified'] and not any('/checklist-template' in x[1] for x in calls)
 assert not inspection_public(r,N,'checklist')['facts']

def test_wrong_checklist_task_cannot_claim_materials_confirmed(monkeypatch):
 install(monkeypatch,wrong_checklist=True)
 r=run(g._inspection_exact_task(object(),N,True,'http://admin.test',B))
 p=inspection_public(r,N,'checklist')
 assert p['result']=='not_confirmed' and 'inspection_checklist_identity_mismatch' in p['missing']

def test_status_success_requires_verified_detail(monkeypatch):
 install(monkeypatch)
 r=run(g._inspection_exact_task(object(),N,False,'http://admin.test',B))
 p=inspection_public(r,N,'status')
 assert p['result']=='success' and p['recordIdentity']==N and 'Pending Visit' in p['facts'][0]

@pytest.mark.parametrize('changes',[{'startPath':'/licensing'}, {'actions':[{'type':'filter','selector':'input[placeholder="Search"]','value':N}]},{'inspectionTaskNumber':None}])
def test_exact_workflow_cannot_be_combined_with_other_routes_or_actions(changes):
 r=g.AdminPortalReadRequest.model_validate({'startPath':'/inspection/tasks','actions':[{'type':'observe'}],'inspectionTaskNumber':N,'inspectionChecklist':True,**changes})
 with pytest.raises(g.HTTPException):g._validate_reader_request(r)

def test_supplemental_http_attempt_has_owner_status_trace_and_no_payload():
 timing=sys.modules['dsh_platform_timing'];trace=timing.Trace('test-rid');token=timing.CURRENT.set(trace)
 class Response:
  status=200
  async def body(self):return b'{"data":{"private":"not in trace"}}'
  async def dispose(self):pass
 class Transport:
  async def get(self,url,**kwargs):
   assert kwargs['headers']['X-DSH-Trace-ID']==trace.trace_id
   assert kwargs['headers']['X-DSH-Parent-Span']==timing.PARENT.get()
   return Response()
 try:
  result=run(g._reader_get_document(SimpleNamespace(_reader_request_context=Transport()),'http://admin.test/api/admin/inspection/tasks/553'))
  call=next(x for x in trace.spans if x['stage']=='http.request')
  assert call['owner']=='UMC' and call['route'].endswith('/{id}') and call['statusCode']==200
  assert call['durationMs']>=0 and 'private' not in json.dumps(trace.export())
 finally:timing.CURRENT.reset(token)

def test_runtime_tool_boundary_preserves_exact_task_flags_and_complete_receipt():
 from app.tool_gateway import ToolGateway
 from app.principal import Principal
 captured=[]
 class Platform:
  portal_base_url='http://admin.test'
  async def admin_portal_read(self,payload,**kwargs):
   captured.append(payload)
   return {'status':'success','observation':{'inspectionExactTask':{'taskNo':N,'verified':True,
     'checklist':{'verified':True,'items':[{'code':f'C{i}','name':f'Requirement {i}'} for i in range(70)]}}}}
 result=run(ToolGateway(None,Platform()).invoke(Principal('u','t','r',umc_token='fake'),
  'admin.portal.read',{'startPath':'/inspection/tasks','actions':[{'type':'observe'}],
                      'inspectionTaskNumber':N,'inspectionChecklist':True},allowed_tools=['admin.portal.read']))
 assert captured[0]['inspectionTaskNumber']==N and captured[0]['inspectionChecklist'] is True
 assert len(result['result']['observation']['inspectionExactTask']['checklist']['items'])==70

def test_source_gap_next_step_does_not_request_the_already_known_number():
 from app.service import _reader_next_step_sentence
 payload={'workflowState':'inspection_exact_detail','missing':['formal_materials_list_not_provided_by_source']}
 for language in ['en','ar']:
  text=_reader_next_step_sentence(payload,language)
  assert text and 'supply' not in text.lower() and 'open the record' not in text.lower()
