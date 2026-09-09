from dataclasses import replace
import pytest
from app.portal_reader import (
    ReaderResult, ReaderOutcome, _documented_object_source, _qualify_knowledge_facts,
    _native_filter_outcome, previous_sample_explanation, PRIOR_UNVERIFIED_LIST_FACT,
)
from app.reader_intent import SLOT_NAMES
from test_admin_portal_reader import Gateway, Planner, run_reader, user_info_for_paths


def knowledge():
    return {'ok': True, 'chunks': [{'content':
        '## Semantic node: Team tasks\n- **page:** `/work/tasks`\n- **section:** Team tasks\n'
        '- **content:** Task No.; Status; Related Account ID.\n'
        '- **scope:** Verified for the Manager representative.\n'}, {'content':
        '## Semantic node: Cases\n- **page:** `/work/cases`\n- **content:** Case No.; Source Task; Status.\n'}]}


def test_primary_source_is_resolved_before_role_variant_is_excluded():
    gateway = Gateway(info={'ok':True, 'result':user_info_for_paths('/work/cases')},
        knowledge_result={'ok':True,'result':knowledge()})
    result=run_reader(gateway, Planner(), question='Show current work tasks.').result
    assert result.status=='no_permission' and result.page=='/work/tasks'
    assert result.source_hint=={'page':'/work/tasks'}
    assert gateway.events==['GetUserInfo','knowledge.search']


@pytest.mark.parametrize('q,expected',[
    ('Show work tasks.','/work/tasks'), ('Show work cases.','/work/cases'),
    ('Show work accounts.',''), ('Show tasks.',''),
    ('Open /work/cases specifically.',''), ('Explain work task fields.',''),
])
def test_source_selection_is_primary_unambiguous_and_module_bounded(q,expected):
    assert _documented_object_source(knowledge(),q,{})==expected


def test_knowledge_facts_preserve_unique_source_without_claiming_live_page():
    kb={'ok':True,'chunks':[{'content':'## Semantic node: Filter\n- **page:** `/work/tasks`\n- **section:** Filter\n- **content:** Date and owner criteria.'}]}
    result=_qualify_knowledge_facts(ReaderResult(status='success',summary='',facts=('Date and owner criteria.',)),kb)
    assert result.page=='' and result.source_hint=={'page':'/work/tasks','section':'Filter'}


def test_named_entry_in_bad_identity_slot_does_not_force_live_access():
    fact='The documented Team Members entry is inside Task Management.'
    class EntryPlanner(Planner):
        async def resolve_admin_portal_intent(self,*args):
            slots={name:{'source':'unspecified','value':'','evidence':''} for name in SLOT_NAMES}
            slots['recordIdentity']={'source':'current','value':'Team Members','evidence':'Team Members'}
            return {'relation':'switch','slots':slots,'clarificationOptions':[]}
    gateway=Gateway(knowledge_result={'ok':True,'result':{'chunks':[{'content':fact}]}})
    planner=EntryPlanner({'mode':'knowledge_only','result':'success','facts':[fact],'missing':[]})
    outcome=run_reader(gateway,planner,question='What is the working read-only entry for Team Members?',
        conversation_context={'previousIntent':{'question':'Open the members page','page':'/work/tasks'}})
    assert outcome.result.status=='success' and 'admin.portal.read' not in gateway.events


def test_partial_grounding_keeps_supported_scope_but_rejects_invented_values():
    fact='The documented filter belongs to the Manager layout.'
    plan={'mode':'knowledge_only','result':'not_confirmed','facts':[fact,'There are 999 matching records.'],'missing':['current_layout_unverified']}
    outcome=run_reader(Gateway(knowledge_result={'ok':True,'result':{'chunks':[{'content':fact}]}}),
        Planner(plan,plan),question='Which filter criteria are available?')
    assert outcome.result.status=='not_confirmed' and outcome.result.facts==(fact,)


@pytest.mark.parametrize('healthy,actions,dialogs,expected',[
    (True,['show_filter'],['Filter Type Priority'],'success'),
    (False,['show_filter'],['Filter Type Priority'],'not_confirmed'),
    (True,['observe'],['Filter Type Priority'],'not_confirmed'),
    (True,['show_filter'],[],'not_confirmed'),
])
def test_filter_schema_needs_opened_healthy_overlay_and_actual_labels(healthy,actions,dialogs,expected):
    observation={'readHealth':{'healthy':healthy},'dialogs':dialogs,'filterDialogFields':['Type','Priority']}
    outcome=ReaderOutcome(ReaderResult(status='not_confirmed',summary='',page='/work'),{'observation':observation})
    executions=[{'status':'passed','input':{'actionTypes':actions}}]
    result=_native_filter_outcome(outcome,'Open the filter and list its fields.',executions).result
    assert result.status==expected
    if expected=='success': assert 'Type; Priority' in result.facts[0]


def test_closed_fresh_page_alone_does_not_prove_cancel():
    outcome=ReaderOutcome(ReaderResult(status='not_confirmed',summary='',page='/work'),{'observation':{'readHealth':{'healthy':True},'dialogs':[]}})
    question='Cancel the filter and return to the list.'
    assert _native_filter_outcome(outcome,question,[{'status':'passed','input':{'actionTypes':['observe']}}])==outcome
    result=_native_filter_outcome(outcome,question,[{'status':'passed','input':{'actionTypes':['show_filter','dismiss_overlay']}}]).result
    assert result.status=='success' and 'not a change to your browser session' in result.facts[0]


def test_failed_prior_request_establishes_neither_sample_nor_total():
    assert previous_sample_explanation('Is that the total or just the sample shown?',
        {'previousIntent':{'resultStatus':'no_permission'}})==PRIOR_UNVERIFIED_LIST_FACT
