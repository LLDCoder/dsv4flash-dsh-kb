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


@pytest.mark.parametrize('question',[
    'From the queued task list, give me one Task No. and only the information needed to identify it.',
    'Open /work/team-management specifically and tell me whether that page works.',
])
def test_explicit_record_and_route_commands_require_a_live_permission_check(question):
    from app.portal_reader import question_requires_live_portal
    assert question_requires_live_portal(question)


def test_denied_same_record_followup_never_invents_an_identifier():
    outcome=run_reader(Gateway(info={'ok':True,'result':user_info_for_paths('/allowed')}),Planner(),
        question='Find that same task by its Task No.',
        conversation_context={'previousIntent':{'question':'Show a task','resultStatus':'no_permission','page':'/work/tasks'}})
    assert outcome.result.status=='no_permission'
    assert 'no identifier was guessed' in outcome.result.facts[0]


def test_missing_parent_tab_is_explained_without_attempting_hidden_child():
    from test_admin_portal_reader import portal_plan_for
    obs={'readHealth':{'healthy':True},'tabControls':[{'name':'To Do','selected':True},{'name':'Completed','selected':False}]}
    g=Gateway(info={'ok':True,'result':user_info_for_paths('/work/tasks')},
        portal_result={'ok':True,'result':{'result':'success','page':'/work/tasks','observation':obs}})
    p=Planner(portal_plan_for('/work/tasks',[{'type':'switch_tab','role':'tab','name':'Team Tasks'},
                                         {'type':'switch_tab','role':'tab','name':'Completed'}]))
    result=run_reader(g,p,question='Show completed team work tasks.').result
    assert result.missing==('requested_view_not_visible',)
    assert 'Team Tasks tab is not visible' in result.facts[0]
    reads=[args for name,args,_ in g.calls if name=='admin.portal.read']
    assert len(reads)==1 and reads[0]['actions']==[{'type':'observe'}]


def test_final_nested_observation_can_establish_native_filter_fields():
    obs={'readHealth':{'healthy':True},'dialogs':['Filter Type Priority'], 'filterDialogFields':['Type','Priority']}
    outcome=ReaderOutcome(ReaderResult(status='not_confirmed',summary=''),{'portalEvidence':{'result':{'observation':obs}}})
    result=_native_filter_outcome(outcome,'Open the filter and inspect its fields.',
        [{'status':'passed','input':{'actionTypes':['show_filter'],'startPath':'/work'}}]).result
    assert result.status=='success' and result.page=='/work' and 'Type; Priority' in result.facts[0]


def test_created_by_dependency_remains_get_only():
    import json
    from pathlib import Path
    policy=json.loads((Path(__file__).parents[2]/'platform-gateway/config/reader-network-policy.json').read_text())
    path='/api/admin/inspection/tasks/created-by-users'
    assert path in policy['allowedMethods']['GET']
    assert all(path not in paths for method,paths in policy['allowedMethods'].items() if method!='GET')


@pytest.mark.parametrize('status',['success','not_confirmed','no_permission'])
def test_first_turn_documented_source_survives_service_projection(status):
    from app.service import _reader_conversation_context
    from test_reader_intent_service import event
    history=[event(1,'user.message',{'content':'Which work filter criteria are available?'}),
             event(2,'reader.result',{'result':status,'page':'','sourceHint':{'page':'/work/tasks','section':'Filter'}}),
             event(3,'user.message',{'content':'Open the Filter surface and list its fields without applying changes.'})]
    context=_reader_conversation_context(history,history[-1])
    assert context['previousIntent']['sourceHint']=={'page':'/work/tasks','section':'Filter'}
    from app.reader_intent import resolve_literal_filter_followup
    resolution=resolve_literal_filter_followup(history[-1].event_json['content'],context)
    assert resolution.planner_context(context)['sourceHint']['page']=='/work/tasks'


@pytest.mark.parametrize('q',[
    'Open the Filter surface and list its fields without applying changes.',
    'Cancel that filter and return to the task list.',
    'Open that ticket filter and inspect the available fields without applying it.',
])
def test_same_filter_source_denial_does_not_read_another_page(q):
    context={'previousIntent':{'question':'What work filters can I use?',
             'sourceHint':{'page':'/work/tasks','section':'Filter'}}}
    g=Gateway(info={'ok':True,'result':user_info_for_paths('/work/cases')})
    result=run_reader(g,Planner(),question=q,conversation_context=context).result
    assert result.status=='no_permission' and result.page=='/work/tasks'
    assert 'admin.portal.read' not in g.events


def test_explicit_denied_route_is_not_replaced_by_a_permitted_sibling():
    g=Gateway(info={'ok':True,'result':user_info_for_paths('/work/tasks')})
    result=run_reader(g,Planner(),question='Open /work/team-management specifically and tell me whether that page works.').result
    assert result.status=='no_permission' and result.page=='/work/team-management'
    assert g.events==['GetUserInfo']


def test_formatter_cannot_erase_documented_role_or_fresh_view_qualifiers():
    from app.service import reader_natural_answer_is_grounded as grounded
    source='The filter was rechecked for Inspection Manager; Authority is available.'
    assert not grounded('Your filter offers Authority.',source,'Which filters can I use?')
    assert grounded('The Inspection Manager filter offers Authority.',source,'Which filters can I use?')
    source='In a fresh read-only view, the Filter surface is now closed.'
    assert not grounded('Your filter is now closed.',source,'Cancel the filter.')
    assert grounded('The filter is closed in a fresh read-only view.',source,'Cancel the filter.')


def test_filter_followup_does_not_capture_an_explicit_new_module_request():
    from app.reader_intent import resolve_literal_filter_followup
    context={'previousIntent':{'sourceHint':{'page':'/work/tasks','section':'Filter'}}}
    assert resolve_literal_filter_followup('Open the Licensing filter instead.',context) is None
    assert resolve_literal_filter_followup('Open /other/tasks and inspect the filter.',context) is None
