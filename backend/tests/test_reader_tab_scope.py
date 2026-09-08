import pytest

from app.portal_reader import (
    _category_control_requiring_children,
    _result_from_structured_observation,
    observation_fallback_result,
    reader_answer_shape,
    observation_result_from_plan,
)
from test_admin_portal_reader import Gateway, Planner, portal_plan_for, run_reader, user_info_for_paths


@pytest.mark.parametrize('kind,facts,shape', [
    ('metrics',['Total 0'],'count'), ('cards',['Person A Completed 7'],'list'),
])
@pytest.mark.parametrize('healthy',[True,False])
@pytest.mark.parametrize('status',['success','not_confirmed'])
def test_metric_and_card_results_require_settled_data(kind,facts,shape,healthy,status):
    source='observation-'+kind+'-001'
    observation={'sectionSummaries':[{'nodeId':source,'kind':kind,'heading':'',
        'summaries':facts if kind=='metrics' else [],'cardSummaries':facts if kind=='cards' else []}],
        'readHealth':{'healthy':healthy,'pending':[] if healthy else ['/api/example/list']}}
    plan={'mode':'observation_result','result':status,'facts':facts,'missing':[],
          'sourceSection':source,'answerShape':shape,'completeness':'bounded'}
    if status == 'not_confirmed':
        plan['missing'] = ['remaining_fields_unavailable']
    assert (observation_result_from_plan(plan,observation) is not None) is healthy
    result=_result_from_structured_observation(observation,page='/work',section_name=source,
        answer_shape=shape,scope='unknown',question='How many records?' if shape=='count' else 'Show members')
    assert (result is not None) is healthy


def test_initial_unobserved_section_is_observed_before_scoped_action():
    observation = observed('Group Items')
    gateway = Gateway(info={'ok': True, 'result': user_info_for_paths('/work')},
                      portal_result={'ok': True, 'result': {'result': 'success', 'observation': observation}})
    planner = Planner(
        portal_plan_for('/work', [{'type': 'switch_tab', 'role': 'tab', 'name': 'Group Items',
                                  'section': 'Documented list title'}]),
        {'mode': 'observation_result', 'result': 'success', 'page': '/work',
         'section': 'Group Items', 'sourceSection': 'observation-table-001', 'answerShape': 'list',
         'completeness': 'bounded', 'selectedState': 'Group Items', 'facts': ['REF-1 Waiting'], 'missing': []},
    )
    outcome = run_reader(gateway, planner, question='Show Group Items')
    read = next(call for call in gateway.calls if call[0] == 'admin.portal.read')
    assert read[1]['actions'] == [{'type': 'observe'}]
    assert planner.calls[1][2]['planningDirective']['preserveRequestedScope'] is True
    instruction = planner.calls[1][2]['planningDirective']['instruction']
    assert 'not a user scope constraint' in instruction
    assert 'Do not preserve its invented section name' in instruction
    assert 'user requires a particular region' in instruction
    assert planner.calls[1][2]['unverifiedInitialPlan']['actions'][0]['section'] == 'Documented list title'
    assert outcome.result.facts == ('REF-1 Waiting',)


def observed(active="Waiting Items"):
    return {
        "tabControls": [{"name": name, "selected": name == active} for name in ("Waiting Items", "Group Items", "Group Members")],
        "sectionSummaries": [{
            "nodeId": "observation-table-001", "kind": "table", "heading": "",
            "selectedState": active, "columnHeaders": ["Reference", "Status"],
            "rowSummaries": ["REF-1 Waiting"], "summaries": ["Total 37"],
        }],
        "readHealth": {"healthy": True},
    }


def test_initial_overlay_reset_is_observed_before_any_button_click():
    observation = observed('Group Items')
    observation['dialogs'] = []
    gateway = Gateway(info={'ok': True, 'result': user_info_for_paths('/work')},
                      portal_result={'ok': True, 'result': {'result': 'success', 'observation': observation}})
    planner = Planner(
        portal_plan_for('/work', [{'type': 'reset_filter', 'role': 'button', 'name': 'Invented Reset'}]),
        {'mode': 'observation_result', 'result': 'success', 'page': '/work', 'section': 'Group Items',
         'sourceSection': 'observation-table-001', 'answerShape': 'list', 'completeness': 'bounded',
         'selectedState': 'Group Items', 'facts': ['REF-1 Waiting'], 'missing': []},
    )
    outcome = run_reader(gateway, planner, question='Show Group Items')
    reads = [call for call in gateway.calls if call[0] == 'admin.portal.read']
    assert reads[0][1]['actions'] == [{'type': 'observe'}]
    assert not any(action['type'] == 'reset_filter' for call in reads for action in call[1]['actions'])
    assert outcome.result.status == 'success'


@pytest.mark.parametrize("shape,question", [
    ("list", "Show Group Items"), ("detail", "Show details of Group Items"),
    ("count", "How many Group Items are there?"),
    ("overview", "Show a current summary of Group Items"),
])
def test_unselected_named_tab_requires_its_own_evidence(shape, question):
    requirement = _category_control_requiring_children(question, observed(), None, shape)
    assert requirement is not None
    assert requirement.control_label == "Group Items"


@pytest.mark.parametrize("shape", ["list", "count"])
def test_default_tab_rows_cannot_become_named_tab_fallback(shape):
    assert _result_from_structured_observation(
        observed(), page="/work", section_name="observation-table-001", answer_shape=shape,
        scope="unknown", question="Show Group Items" if shape == "list" else "How many Group Items?",
    ) is None
    assert observation_fallback_result(
        "Show Group Items", observed(), page="/work", section="observation-table-001", answer_shape=shape,
    ) is None


def test_overview_cannot_fall_back_to_another_tabs_total():
    assert observation_fallback_result(
        'Show a current summary of Group Items', observed(), page='/work',
        section='observation-table-001', answer_shape='overview',
    ) is None


def test_unhealthy_read_cannot_become_a_successful_overview_fallback():
    observation = observed('Group Items')
    observation['readHealth'] = {'healthy': False, 'blocked': ['/api/unknown-dependency']}
    assert observation_fallback_result(
        'Show a current summary of Group Items', observation, page='/work',
        section='observation-table-001', answer_shape='overview',
    ) is None


def test_healthy_selected_overview_keeps_its_own_summary():
    result = observation_fallback_result(
        'Show a current summary of Group Items', observed('Group Items'), page='/work',
        section='observation-table-001', answer_shape='overview',
    )
    assert result is not None and result.facts == ('Total 37',)


def test_selected_tab_is_not_read_again_when_evidence_is_present():
    assert _category_control_requiring_children("Show Group Items", observed("Group Items"), None, "list") is None
    result = _result_from_structured_observation(
        observed("Group Items"), page="/work", section_name="observation-table-001",
        answer_shape="list", scope="unknown", question="Show Group Items",
    )
    assert result is not None and result.facts == ("REF-1 Waiting",)


@pytest.mark.parametrize("question", ["Show items", "Show Waiting Items", "Show unrelated records", "Show group"])
def test_do_not_invent_unrequested_tab_requirement(question):
    assert _category_control_requiring_children(question, observed(), None, "list") is None


@pytest.mark.parametrize("question", [
    "How many blocked records are there?", "How many overdue tasks?", "Count the items needing attention",
    "How many records are due today?", "有多少条逾期任务？", "有几个需要关注的记录？",
])
def test_explicit_count_keeps_count_shape(question):
    assert reader_answer_shape(question) == "count"


def test_standalone_count_repairs_planner_answer_shape_before_returning_rows():
    observation = observed("Group Items")
    initial = {"mode": "observation_result", "result": "success", "page": "/work",
               "section": "Group Items", "sourceSection": "observation-table-001", "answerShape": "attention",
               "facts": ["REF-1 Waiting"], "missing": []}
    corrected = {**initial, "answerShape": "count", "facts": ["Total 37"]}
    planner = Planner(portal_plan_for("/work", [{"type": "observe"}]), initial, corrected)
    gateway = Gateway(info={"ok": True, "result": user_info_for_paths("/work")},
                      portal_result={"ok": True, "result": {"result": "success", "observation": observation}})
    outcome = run_reader(gateway, planner, question="How many Group Items are there?")
    assert outcome.result.status == "success"
    assert outcome.result.answer_shape == "count"
    assert outcome.result.facts == ("Total 37",)
    assert len(planner.calls) == 3
    assert planner.calls[-1][2]["planningDirective"]["requestedAnswerShape"] == "count"


@pytest.mark.parametrize("selected", ["To Do", "Completed", "Group Items", "待处理"])
def test_previous_visible_selected_state_is_a_valid_view_anchor(selected):
    from app.reader_intent import SLOT_NAMES, parse_intent_resolution
    slots = {name: {"source": "unspecified", "value": "", "evidence": ""} for name in SLOT_NAMES}
    slots["view"] = {"source": "previous", "value": selected, "evidence": selected}
    context = {"previousIntent": {"question": "Show my records", "selectedState": selected, "answerShape": "list"}}
    result = parse_intent_resolution({"relation": "continue", "slots": slots, "clarificationOptions": []}, "Show three", context)
    assert dict(result.slots)["view"].value == selected


def test_explicit_previous_view_takes_precedence_over_visible_default_tab():
    from app.reader_intent import SLOT_NAMES, parse_intent_resolution
    slots = {name: {"source": "unspecified", "value": "", "evidence": ""} for name in SLOT_NAMES}
    context = {"previousIntent": {"question": "Show Group Items", "view": "Group Items", "selectedState": "Waiting Items"}}
    result = parse_intent_resolution({"relation": "continue", "slots": slots, "clarificationOptions": []}, "Show three", context)
    assert dict(result.slots)["view"].value == "Group Items"


@pytest.mark.parametrize("question", [
    "What is the difference between Waiting Items and Group Items?",
    "Does Group Items mean that each record has that status?",
    "Do Group Items prove personal assignment?",
])
def test_conceptual_tab_mention_does_not_require_inactive_tab_rows(question):
    assert _category_control_requiring_children(question, observed(), None, "detail") is None


def test_standalone_record_request_repairs_total_only_answer():
    observation = observed("Group Items")
    initial = {"mode": "observation_result", "result": "success", "page": "/work",
               "section": "Group Items", "sourceSection": "observation-table-001", "answerShape": "overview",
               "facts": ["Total 37"], "missing": []}
    corrected = {**initial, "answerShape": "list", "facts": ["REF-1 Waiting"]}
    planner = Planner(portal_plan_for("/work", [{"type": "observe"}]), initial, corrected)
    gateway = Gateway(info={"ok": True, "result": user_info_for_paths("/work")},
                      portal_result={"ok": True, "result": {"result": "success", "observation": observation}})
    outcome = run_reader(gateway, planner, question="Show Group Items including their statuses")
    assert outcome.result.status == "success"
    assert outcome.result.answer_shape == "list"
    assert outcome.result.facts == ("REF-1 Waiting",)
