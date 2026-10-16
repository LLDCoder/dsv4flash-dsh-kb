import asyncio
from types import SimpleNamespace
import httpx
import pytest
from app.answer_stream import AnswerStream
from app.inspection_read import inspection_public,complete_verified_checklist_tail
from app.service import DSHService,reader_natural_answer_rejection,reader_natural_answer_is_grounded
from app.timing import Trace,CURRENT

NUMBER='IN-2026-1000001'
def evidence():
    return inspection_public({'verified':True,'taskNo':NUMBER,'taskId':'7','bindingScopes':['TeamTodo'],
        'detail':{'taskNo':NUMBER,'statusName':'Pending Visit'},
        'checklist':{'verified':True,'items':[{'code':'C1','name':'Content does not harm privacy'},
            {'code':'C2','name':'A valid license is displayed'}]}},NUMBER,'checklist')

PREFIX=f'التفتيش {NUMBER} حالته Pending Visit.\n\n- C1: المحتوى لا يضر بالخصوصية\n- C2: عرض رخصة سارية\n\n'

@pytest.mark.parametrize('language',['en','ar'])
def test_only_unpublished_tail_is_replaced_after_complete_guarded_prefix(language):
    e=evidence();text=complete_verified_checklist_tail(e,PREFIX,language)
    assert text.startswith(PREFIX) and len(text)>len(PREFIX)
    assert ('not provide' in text if language=='en' else 'لم يوفّر' in text)
    assert ('every point applies' in text if language=='en' else 'جميعها تنطبق' in text)

@pytest.mark.parametrize('change',[
    {'inspectionCoverage':None},{'recordIdentity':'IN-2026-9999999'},
    {'missing':['inspection_checklist_not_verified']},{'result':'no_permission'},
    {'workflowState':'another_reader'},
    {'inspectionCoverage':{'verified':True,'taskNo':NUMBER,'statusName':'Pending Visit','codes':['C1','C1']}},
])
def test_unverified_partial_denied_or_wrong_scope_cannot_be_recovered(change):
    assert complete_verified_checklist_tail({**evidence(),**change},PREFIX,'ar') is None

@pytest.mark.parametrize('prefix',[PREFIX.replace('- C2:', '- C20:'),PREFIX.replace(NUMBER,'another task'),
    PREFIX.replace('Pending Visit','unknown'),PREFIX.replace('- C2: عرض رخصة سارية','')])
def test_missing_code_status_or_identity_stays_partial(prefix):
    assert complete_verified_checklist_tail(evidence(),prefix,'ar') is None

def test_failure_reason_does_not_change_existing_grounding_policy():
    assert reader_natural_answer_rejection('Unknown ZZ-999999999','Known AA-100','status')=='unsupported_factual_token'
    assert not reader_natural_answer_is_grounded('Unknown ZZ-999999999','Known AA-100','status')

def test_final_validation_rejection_is_completed_with_source_close_and_logged():
    async def exercise():
        events=[]
        async def publish(item):events.append(item)
        class Model:
            async def stream(self,messages):
                yield PREFIX
                yield 'مرجع إضافي ZZ-999999999'
        service=object.__new__(DSHService);service.settings=SimpleNamespace(llm_base_url='http://model.test',llm_api_key='fake')
        service.llm=Model();stream=AnswerStream(publish);trace=Trace('test');token=CURRENT.set(trace)
        try:
            result,failed,strategy=await service._natural_reader_response('ما مستندات التفتيش '+NUMBER+'؟',evidence(),'ar',answer_stream=stream)
            assert strategy=='verified_checklist_tail_completion' and failed
            assert result.startswith(PREFIX) and 'ZZ-999999999' not in result
            await stream.verified(result)
            assert stream.content==result and ''.join(e['content'] for e in events)==result
            assert any(s.get('rejectionReason')=='unsupported_factual_token' for s in trace.spans)
            assert any(s.get('recovery')=='verified_source_close' for s in trace.spans)
            assert 'ZZ-999999999' not in str(trace.export())
        finally:CURRENT.reset(token)
    asyncio.run(exercise())

def test_transport_failure_is_not_mislabeled_as_validated_tail_recovery():
    async def exercise():
        async def publish(item):pass
        class Model:
            async def stream(self,messages):
                yield PREFIX
                raise httpx.ReadTimeout('transport unavailable')
        service=object.__new__(DSHService);service.settings=SimpleNamespace(llm_base_url='http://model.test',llm_api_key='fake')
        service.llm=Model()
        result,failed,strategy=await service._natural_reader_response('مستندات '+NUMBER,evidence(),'ar',answer_stream=AnswerStream(publish))
        assert failed and strategy=='guarded_stream_incomplete' and 'النص المعروض جزئي' in result
    asyncio.run(exercise())
