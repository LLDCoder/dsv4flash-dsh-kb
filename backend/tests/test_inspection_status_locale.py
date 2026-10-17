import asyncio,json
from types import SimpleNamespace
import pytest
from app.inspection_read import inspection_public,normalize_inspection_status,INSPECTION_STATUS_AR
from app.answer_stream import AnswerStream
from app.service import DSHService
from app.timing import CURRENT,Trace

NUMBER='IN-2026-1000001'
def evidence(status='Pending Visit'):
 return inspection_public({'verified':True,'taskNo':NUMBER,'taskId':'7','bindingScopes':['TeamTodo'],
     'detail':{'taskNo':NUMBER,'statusName':status}},NUMBER,'status')

@pytest.mark.parametrize('status',list(INSPECTION_STATUS_AR))
def test_portal_labels_are_idempotent_and_keep_english_identity(status):
 text=f'حالة {NUMBER} هي {status} (ترجمة خاطئة).\n'
 result=normalize_inspection_status(text,evidence(status),'ar')
 assert f'{status} ({INSPECTION_STATUS_AR[status]})' in result and NUMBER in result
 assert normalize_inspection_status(result,evidence(status),'ar')==result

@pytest.mark.parametrize('text',[
 f'حالة {NUMBER} هي Pending Visit (قيد الزيارة).',
 f'حالة {NUMBER} هي **Pending Visit** (قيد الزيارة).',
 f'حالة {NUMBER} هي قيد الزيارة.',
 'حالته قيد الزيارة.',
])
def test_observed_wrong_current_status_is_corrected(text):
 result=normalize_inspection_status(text,evidence(),'ar')
 assert 'قيد الزيارة' not in result and 'بانتظار الزيارة' in result

@pytest.mark.parametrize('change',[{'inspectionStatus':None},{'recordIdentity':'another'},
 {'workflowState':'history'},{'result':'no_permission'},{'facts':[]}])
def test_unverified_denied_and_other_workflows_are_not_rewritten(change):
 text=f'حالة {NUMBER} هي Pending Visit (قيد الزيارة).'
 assert normalize_inspection_status(text,{**evidence(),**change},'ar')==text

def test_english_unknown_status_and_checklist_negation_remain_unchanged():
 text=f'Inspection {NUMBER} Pending Visit (قيد الزيارة).'
 assert normalize_inspection_status(text,evidence(),'en')==text
 assert normalize_inspection_status('حالة جديدة',evidence('Unknown'),'ar')=='حالة جديدة'
 line='- C1: لا تغيّر قيد الزيارة أو Pending Visit (نص العنصر).\n'
 assert normalize_inspection_status(line,evidence(),'ar')==line

def test_unknown_parenthetical_facts_are_preserved_for_validation():
 text=f'حالة {NUMBER} هي Pending Visit (خلال ٥ أيام).'
 result=normalize_inspection_status(text,evidence(),'ar')
 assert '(خلال ٥ أيام)' in result
 assert normalize_inspection_status(result,evidence(),'ar')==result

def test_split_model_tokens_never_publish_the_wrong_translation():
 async def run():
  events=[]
  async def publish(value):events.append(value)
  class Model:
   async def stream(self,messages):
    for token in [f'حالة {NUMBER} هي Pending ', 'Visit (قيد ', 'الزيارة).\n\n','القراءة من صفحة التفتيش ضمن عرض الفريق الحالي.']:
     yield token
  service=object.__new__(DSHService);service.llm=Model()
  service.settings=SimpleNamespace(llm_base_url='http://model.test',llm_api_key='fake')
  stream=AnswerStream(publish);trace=Trace('locale-test');token=CURRENT.set(trace)
  try:
   result,failed,strategy=await service._natural_reader_response('ما الحالة الحالية '+NUMBER+'؟',evidence(),'ar',answer_stream=stream)
   assert not failed and strategy=='guarded_stream_organized'
   assert result==''.join(e['content'] for e in events) and 'قيد الزيارة' not in result
   assert 'Pending Visit (بانتظار الزيارة)' in result
   assert any(s['stage']=='answer.inspection_status_locale' and s.get('changed') for s in trace.spans)
   assert NUMBER not in json.dumps(trace.export()) and 'قيد الزيارة' not in json.dumps(trace.export(),ensure_ascii=False)
  finally:CURRENT.reset(token)
 asyncio.run(run())
