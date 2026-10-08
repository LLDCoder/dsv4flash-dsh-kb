import asyncio
import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.portal_reader import (
    ReaderOutcome,
    ReaderResult,
    UserPermissionContext,
    _inspection_today_rollup,
    _verified_inspection_task_rollup_result,
    _inspection_rollup_with_dashboard_card,
    _verified_inspection_task_date_list_result,
    _inspection_person_rollup_requested,
    _api_candidate_rows,
    _explicit_reader_source,
    _inspection_overdue_list_requested,
    _inspection_overdue_is_metric_only_request,
    _inspection_overdue_result,
    _inspection_task_rows_from_observation,
    _merge_status_observations,
    _native_fine_decision_result,
    _mutation_request_refusal_result,
    _observed_api_rows,
    _other_inspector_routes_guard,
    _verified_inspection_team_assignments_result,
    bounded_portal_observation,
    _profile_labels_from_observation,
    _mutation_request_refusal_result,
    _record_detail_facts,
    _self_profile_result,
    _profile_capability_requested,
    _profile_scope_requested,
    _visible_dashboard_scope,
    _named_group_in_question,
    _guard_named_group_scope,
    _status_grouping_capable,
    _status_page_action_candidates,
    _status_page_info,
    _team_member_card_result,
    _team_task_assignment_list_requested,
    _outside_current_team_requested,
    _team_task_assignment_rows_result,
    _inspection_target_history_name,
    _bounded_conversation_context,
    PortalReadRequest,
    _ticket_team_summary_requested,
    _ticket_member_query,
    _license_module_focus,
    _safety_request_result,
)
from app.service import _sanitize_reader_internal_ids, _reader_source_sentence
from app.service import reader_evidence_only_response
from app.tool_gateway import ToolGateway
from app.principal import Principal


def test_outside_team_refusal_does_not_deny_current_page_or_link_it():
    result = {
        'result': 'no_permission',
        'page': '/content/team-management',
        'missing': ['outside_team_scope_not_authorized'],
        'facts': [],
    }
    english = reader_evidence_only_response(result, 'en')
    arabic = reader_evidence_only_response(result, 'ar')
    assert "current team's tasks" in english
    assert 'not another manager' in english
    assert 'not authorized to read Content' not in english
    assert '/content/team-management' not in english
    assert 'فريقه الحالي' in arabic
    assert '/content/team-management' not in arabic


def test_team_page_coverage_note_is_localized_in_arabic():
    result = {
        'result': 'success', 'page': '/content/team-management',
        'answerShape': 'list', 'scope': 'team', 'completeness': 'bounded',
        'facts': ['Current Team Tasks page shows 7 of 612 tasks; this is not a complete team-task list.'],
    }
    answer = reader_evidence_only_response(result, 'ar')
    assert 'تعرض صفحة مهام الفريق الحالية 7 من أصل 612' in answer
    assert 'Current Team Tasks page shows' not in answer


def test_diacritized_arabic_named_member_ticket_query_keeps_team_page():
    question = 'كم تذكرة معلّقة ما زالت لدى عضو الفريق shiting zhaozhao؟ أعطني العدد لهذا الشخص تحديدًا.'
    context = UserPermissionContext(
        current_role='Happiness Center Manager',
        pages=('/happiness/team-management', '/happiness/tickets'),
    )
    assert _ticket_team_summary_requested(question)
    assert _explicit_reader_source(question, {'currentPage': {'route': '/happiness/team-management'}}, context) == '/happiness/team-management'
    assert _ticket_member_query(question, candidates=('shiting zhaozhao',)) == 'shiting zhaozhao'


def test_arabic_licensing_superlative_with_intervening_noun_routes_to_sla_extreme():
    assert _license_module_focus(
        'ما أكثر طلبات الترخيص إلحاحًا اليوم، وما اتفاقية مستوى الخدمة الخاصة به؟'
    ) == 'urgency'
    assert _license_module_focus(
        'ما أكثر طلبات الترخيص إلحاحًا اليوم، وما اتفاقية مستوى الخدمة الخاصة به؟'
    ) == _license_module_focus(
        'What is my most urgent licensing application today, and what is its SLA?'
    )


def test_team_source_uses_user_visible_scope_instead_of_implementation_term():
    result = {'result': 'success', 'page': 'Happiness / Team Management',
              'section': 'Team Members', 'scope': 'team', 'completeness': 'complete'}
    english = _reader_source_sentence(result, 'en')
    arabic = _reader_source_sentence(result, 'ar')
    assert 'current team view' in english and 'team scope' not in english
    assert 'عرض الفريق الحالي' in arabic and 'نطاق فريق الحساب المسجّل' not in arabic


def test_harmful_publication_advice_is_refused_with_review_path_in_both_languages():
    arabic = _safety_request_result(
        'ماذا يجب على المتقدمين أن يفعلوا إذا أرادوا نشر محتوى يحتوي على عنف/كراهية/دعاية سياسية؟'
    )
    english = _safety_request_result(
        'What should applicants do if they want to publish content containing violence, hate, or political propaganda?'
    )
    assert arabic and english
    assert len(arabic.facts) == len(english.facts) == 2
    assert 'لا يمكنني الموافقة' in arabic.facts[0]
    assert 'مراجعة المحتوى' in arabic.facts[1]
    assert 'cannot approve' in english.facts[0]
    assert 'formal Content review' in english.facts[1]


def test_arabic_sla_queue_question_does_not_trigger_unrelated_rule_disclaimer():
    result = ReaderResult(status='success', summary='Overdue tasks', workflow_state='inspection_overdue_full')
    assert _inspection_overdue_is_metric_only_request(
        'كم عدد المهام التي تجاوزت معايير SLA حاليًا؟ يرجى سرد هذه المهام وترتيبها حسب عدد أيام التأخير.',
        result,
    )
    assert not _inspection_overdue_is_metric_only_request(
        'ما الأساس القانوني للمهام المتأخرة حسب SLA؟', result,
    )
    assert not _inspection_overdue_is_metric_only_request(
        'كم عدد المهام التي تجاوزت معايير SLA؟',
        ReaderResult(status='success', summary='Other result', workflow_state='other'),
    )


def test_other_inspector_route_guard_keeps_real_team_assignment_without_inventing_route():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "POST /api/inspection/team-management/tasks/query",
        "status": 200,
        "responseEvidence": {"data": {"page": {"data": [
            {"taskNo": "IN-2026-3501220", "primaryAssignedUserName": "Inspector Staff",
             "areaDisplay": "Zayed City"},
        ]}}},
    }]}}
    outcome = ReaderOutcome(
        ReaderResult(status="success", summary="bounded view", page="/inspection/tasks", scope="team"),
        {"observation": observation},
    )
    result = _other_inspector_routes_guard(
        outcome,
        "Show other inspectors' tasks and routes for Inspector Staff.",
    ).result
    assert result.status == "not_confirmed"
    assert result.missing == ("other_inspector_route_unverified",)
    assert any("IN-2026-3501220" in fact and "Inspector Staff" in fact for fact in result.facts)
    assert all("unassigned queue" not in fact.lower() for fact in result.facts)
    assert any("not an inspection route" in fact for fact in result.facts)


def test_team_assignment_result_lists_all_observed_tasks_but_does_not_infer_routes():
    receipt = {'verified': True, 'stablePasses': 2, 'pagesRead': 4,
               'total': 2, 'scopeTotals': {'TeamTodo': 2, 'TeamCompleted': 0},
               'tasks': {
                   'IN-1': {'inspector': 'Inspector Staff', 'route': '', 'scope': 'TeamTodo'},
                   'IN-2': {'inspector': 'Yuye Wang', 'route': 'Route B', 'scope': 'TeamTodo'},
               }}
    result = _verified_inspection_team_assignments_result(
        receipt, "Show other Inspectors' tasks and routes.", 'team')
    assert result.status == 'not_confirmed' and result.workflow_state == 'inspection_team_assignment_full'
    assert any('IN-1' in fact and 'Inspector Staff' in fact for fact in result.facts)
    assert any('IN-2' in fact and 'Route B' in fact for fact in result.facts)
    assert not any('IN-1' in fact and 'Route B' in fact for fact in result.facts)
    assert len(result.public_json()['facts']) == len(result.facts)
    preserved = _other_inspector_routes_guard(
        ReaderOutcome(result, {'inspectionTeamAssignments': receipt}),
        "Show other Inspectors' tasks and routes.",
    )
    assert preserved.result.facts == result.facts


def test_team_assignment_receipt_preserves_all_verified_pages_past_ui_limit():
    tasks = {f'IN-{index:04d}': {'inspector': 'Inspector Staff', 'route': '',
                                 'scope': 'TeamTodo'} for index in range(101)}
    projected = bounded_portal_observation({'inspectionTeamAssignments': {
        'verified': True, 'total': 101, 'scopeTotals': {'TeamTodo': 101, 'TeamCompleted': 0},
        'stablePasses': 2, 'pagesRead': 6, 'tasks': tasks,
    }})['inspectionTeamAssignments']
    assert projected['verified'] is True and len(projected['tasks']) == 101
    broken = bounded_portal_observation({'inspectionTeamAssignments': {
        'verified': True, 'total': 102, 'scopeTotals': {'TeamTodo': 102},
        'stablePasses': 2, 'pagesRead': 6, 'tasks': tasks,
    }})['inspectionTeamAssignments']
    assert broken['verified'] is False


def test_personal_inspection_rollup_keeps_dashboard_and_due_date_metrics_distinct():
    observation = {
        'regionSummaries': [{'kind': 'region', 'heading': 'My Tasks'}],
        'apiDiscovery': {'candidates': [{
            'operationKey': 'GET /api/Inspection/Dashboard/Overview', 'status': 200,
            'responseEvidence': {'data': {'taskHub': {'inspectionCard': {
                'todoTotal': 0, 'totalTasks': 0, 'doneToday': 0, 'overdueTasks': 0,
            }}}},
        }]},
    }
    rollup = ReaderResult(
        status='success', summary='Verified task rollup.',
        page='/inspection/tasks', answer_shape='count',
        facts=('Date: 2026-10-04; Inspector: Inspector Staff; Tasks: 5',),
    )
    result = _inspection_rollup_with_dashboard_card(
        rollup, observation, "The Inspector summarizes today's tasks, overdue tasks, and completion rates.",
    )
    assert 'To Do 0' in result.facts[0]
    assert any('Tasks: 5' in fact for fact in result.facts)
    assert 'different metrics' in result.facts[-1]
    bad = {**observation, 'apiDiscovery': {'candidates': []}}
    assert _inspection_rollup_with_dashboard_card(rollup, bad, 'today').facts == rollup.facts


def test_team_member_cards_are_authoritative_for_dated_ticket_metrics():
    observation = {"apiDiscovery": {"candidates": [{
        "path": "/api/customer-happiness/team-management/members",
        "status": 200,
        "responseEvidence": {"data": {
            "startDate": "2026-09-26", "endDate": "2026-10-02",
            "cards": [
                {"userName": "Happiness Leader", "metricsByCategory": {
                    "All": {"completedTasks": 3, "totalAssignedTasks": 4, "overdueTasks": 1},
                    "Enquiries & Complaints": {"completedTasks": 0, "totalAssignedTasks": 0, "overdueTasks": 0},
                }},
                {"userName": "Happiness Staff", "metricsByCategory": {
                    "All": {"completedTasks": 0, "totalAssignedTasks": 5, "overdueTasks": 3},
                    "Enquiries & Complaints": {"completedTasks": 0, "totalAssignedTasks": 3, "overdueTasks": 1},
                }},
            ],
        }},
    }]}}
    result = _team_member_card_result(
        observation, question="Summarize each staff member's pending and overdue tickets in my team.",
        scope="team", page="/happiness/team-management",
    )
    assert result is not None and result.status == "success"
    rows = [json.loads(fact) for fact in result.facts if fact.startswith("{")]
    assert len(rows) == 2
    assert rows[0]["Team Member"] == "Happiness Leader" and rows[0]["Pending Tasks"] == 1
    assert rows[1]["Team Member"] == "Happiness Staff" and rows[1]["Overdue Tasks"] == 3
    named = _team_member_card_result(
        observation, question="How many overdue tasks does Happiness Leader have?",
        scope="team", page="/happiness/team-management",
    )
    assert named is not None
    named_rows = [json.loads(fact) for fact in named.facts if fact.startswith("{")]
    assert len(named_rows) == 1 and named_rows[0]["Overdue Tasks"] == 1
    arabic_summary = "قم بتلخيص جميع المهام المعلقة والمتأخرة لكل عضو في فريقي."
    english_task_summary = "Summarize all pending and overdue tasks for each member of my team."
    assert _ticket_team_summary_requested(english_task_summary)
    assert _explicit_reader_source(english_task_summary, {}) == "/happiness/team-management"
    english_task_result = _team_member_card_result(
        observation, question=english_task_summary, scope="team", page="/happiness/team-management",
    )
    assert english_task_result is not None
    assert len([fact for fact in english_task_result.facts if fact.startswith("{")]) == 2
    assert _ticket_team_summary_requested(arabic_summary)
    assert _explicit_reader_source(arabic_summary, {}) == "/happiness/team-management"
    localized = _team_member_card_result(
        observation, question=arabic_summary, scope="team", page="/happiness/team-management",
    )
    assert localized is not None
    localized_rows = [json.loads(fact) for fact in localized.facts if fact.startswith("{")]
    assert len(localized_rows) == 2
    assert localized_rows[0]["Category"] == "All" and localized_rows[0]["Pending Tasks"] == 1
    arabic_named = "كم عدد المهام المتأخرة لدى “قائد السعادة”؟"
    assert _ticket_member_query(arabic_named, candidates=["Happiness Leader", "Happiness Staff"]) == "Happiness Leader"
    assert _explicit_reader_source(arabic_named, {"currentPage": {"route": "/dashboard"}},
                                   UserPermissionContext(current_role="Happiness Center Manager",
                                                         pages=("/happiness/team-management",))) == "/happiness/team-management"
    localized_named = _team_member_card_result(
        observation, question=arabic_named, scope="team", page="/happiness/team-management",
    )
    assert localized_named is not None
    named_rows = [json.loads(fact) for fact in localized_named.facts if fact.startswith("{")]
    assert len(named_rows) == 1 and named_rows[0]["Overdue Tasks"] == 1


def test_team_task_owner_list_is_not_a_member_count_and_uses_authorized_department():
    question = "List my team's current pending tasks and the person responsible for each."
    assert _team_task_assignment_list_requested(question)
    assert not _team_task_assignment_list_requested(
        "Summarize each staff member's pending and overdue tickets in my team.")
    permission = UserPermissionContext(current_role="Content Manager",
                                       pages=("/content/team-management",))
    assert _explicit_reader_source(question, {"currentPage": {"route": "/dashboard"}},
                                   permission) == "/content/team-management"
    observation = {
        'tabControls': [{'name': 'Team Tasks', 'selected': True},
                        {'name': 'To Do', 'selected': True}],
        'sectionSummaries': [{'kind': 'table', 'nodeId': 'team-tasks',
            'columnHeaders': ['Task No.', 'Assigned To', 'Status'],
            'rowFields': [{'Task No.': 'MC-2-1007-0231931',
                           'Assigned To': 'Content Admin', 'Status': 'Pending Modification'}]}],
        'apiDiscovery': {'candidates': [{'status': 200, 'responseEvidence': {
            'data': {'items': [{}], 'pageIndex': 1, 'pageSize': 10, 'total': 608}}}]},
    }
    result = _team_task_assignment_rows_result(
        observation, page='/content/team-management', scope='team')
    assert result is not None and result.status == 'success'
    assert 'Content Admin' in result.facts[0]
    assert '1 of 608' in result.facts[1]


def test_explicit_other_manager_team_is_not_the_current_team():
    assert _outside_current_team_requested(
        'Show all tasks assigned to another Content manager outside my team.')
    assert _outside_current_team_requested(
        'Can you list tasks belonging to a different Content manager’s team, outside my current team?')
    assert _outside_current_team_requested('اعرض مهام مدير آخر خارج فريقي.')
    assert not _outside_current_team_requested(
        "List my team's current pending tasks and the person responsible for each.")


def test_named_inspection_target_routes_to_tasks_and_never_violations_list():
    question = 'Show all past inspections, violations and contacts for inspection target ren_jg1.'
    assert _inspection_target_history_name(question) == 'ren_jg1'
    assert _explicit_reader_source(question, {}, UserPermissionContext(
        current_role='Inspection Leader', pages=('/inspection/tasks', '/inspection/violations'))
    ) == '/inspection/tasks'


def test_browser_timezone_is_validated_and_carried_to_read_request():
    context = _bounded_conversation_context({'currentPage': {
        'route': '/happiness/team-management', 'browserTimezone': 'Asia/Shanghai'}})
    assert context['currentPage']['browserTimezone'] == 'Asia/Shanghai'
    assert 'browserTimezone' not in _bounded_conversation_context({'currentPage': {
        'route': '/happiness/team-management', 'browserTimezone': 'Unknown/Zone'}})['currentPage']
    assert PortalReadRequest('/happiness/team-management', ({'type': 'observe'},),
                             browser_timezone='Asia/Shanghai').as_payload()['browserTimezone'] == 'Asia/Shanghai'


def test_arabic_team_member_fields_keep_distinct_metric_labels():
    response = reader_evidence_only_response({
        "result": "success", "page": "/happiness/team-management",
        "section": "Team Members", "answerShape": "overview",
        "facts": [json.dumps({
            "Team Member": "Happiness Staff", "Category": "enquiries",
            "Pending Tasks": 3, "Overdue Tasks": 1,
            "Completed Tasks": 0, "Total Assigned Tasks": 3,
        })],
    }, "ar")
    assert "المهام المعلّقة: 3" in response
    assert "المهام المتأخرة: 1" in response
    assert "المهام المكتملة: 0" in response
    assert "إجمالي المهام المكلّفة: 3" in response
    assert "الفئة: الاستفسارات والشكاوى" in response


def test_truncated_checklist_last_description_is_not_presented_as_requirement():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/tasks/{id}/checklist-template",
        "status": 200, "responseEvidenceTruncated": False,
        "responseEvidence": {"data": {"items": [
            {"itemCode": "L6", "itemDescription": "Valid event permit"},
            {"itemCode": "L7", "itemDescription": "All m"},
        ]}},
    }]}}
    facts = _record_detail_facts("What materials?", observation, "IN-2026-0141753")
    assert "L6; Valid event permit" in facts[0]
    assert "L7; description incomplete in the source" in facts[0]
    assert "All m" not in facts[0]


def test_incomplete_checklist_description_is_redacted_before_later_fields():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/tasks/{id}/checklist-template",
        "status": 200, "responseEvidenceTruncated": False,
        "responseEvidence": {"data": {"items": [
            {"itemCode": "L7", "itemDescription": "All m", "checkType": "Document"},
            {"itemCode": "L8", "itemDescription": "Valid authorization letter"},
        ]}},
    }]}}
    facts = _record_detail_facts("What materials?", observation, "IN-2026-0141753")
    assert "L7; description incomplete in the source" in facts[0]
    assert "L8; Valid authorization letter" in facts[0]
    assert "All m" not in facts[0]


def test_incomplete_checklist_description_is_redacted_when_type_precedes_it():
    observation = {"apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks/{id}/checklist-template",
            "status": 200,
            "responseEvidence": {"data": {"items": [
                {"itemCode": "L7", "checkType": "Document", "itemDescription": "All m"},
            ]}},
        }]}}
    facts = _record_detail_facts("What materials are required?", observation, "IN-2026-0141753")
    assert "All m" not in facts[0]
    assert "description incomplete in the source" in facts[0]
    assert "not a complete materials list or procedure" in facts[1]


def test_checklist_answer_redacts_terminal_fragment_and_omits_generic_docs():
    result = {
        "result": "success",
        "page": "Inspection / Tasks",
        "sourceSection": "task-detail",
        "answerShape": "detail",
        "facts": [
            "Inspection checklist materials/steps returned for IN-2026-0141753: L1; Valid licence; L7; All m.",
            "These are inspection checklist points from the authorized task detail, not a complete materials list or procedure. An incomplete item description cannot be inferred; consult the task detail for requirements not returned here.",
            "06-03-admin-portal-api.md: Generic field sequence.",
        ],
    }
    answer = reader_evidence_only_response(result, "ar", question="ما المواد للمهمة؟")
    assert "All m" not in answer
    assert "description incomplete in the source" in answer
    assert "06-03-admin-portal-api.md" not in answer
    assert "هذه نقاط قائمة تحقق" in answer


def test_checklist_public_result_keeps_whole_last_description():
    final_description = "The authorization letter remains valid for this inspected activity"
    fact = (
        "Inspection checklist materials/steps returned for IN-2026-0141753: "
        + "; ".join(["L1", "Valid media activity license"] * 8 + ["L7", final_description]) + "."
    )
    assert len(fact) > 400
    result = ReaderResult(status="success", summary="checklist", facts=(fact,))
    public = result.public_json()
    assert "remains valid for this inspected activity" in public["facts"][0]
    rendered = reader_evidence_only_response(public, "en", question="What materials are required?")
    assert "remains valid for this inspected activity" in rendered


def test_checklist_answer_keeps_all_returned_items_beyond_old_fact_cap():
    items = [
        f"L{number}; Verified checklist requirement number {number} for the inspected media activity and its applicable permit conditions"
        for number in (1, 2, *range(4, 16))
    ]
    fact = "Inspection checklist materials/steps returned for IN-2026-0141753: " + "; ".join(items) + "."
    assert len(fact) > 1200
    public = ReaderResult(status="success", summary="checklist", facts=(fact,)).public_json()
    assert "L15; Verified checklist requirement number 15" in public["facts"][0]
    for language in ("en", "ar"):
        rendered = reader_evidence_only_response(public, language, question="What materials and steps are required?")
        assert "L15; Verified checklist requirement number 15" in rendered


def test_projected_checklist_rows_reach_the_last_authorized_item():
    rows = [
        {"checklistCode": f"L{number}", "checklistName": f"Requirement {number}",
         "displayOrder": number, "isVisibleInChecklist": True}
        for number in (1, 2, *range(4, 16))
    ]
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/tasks/{id}/checklist-template",
        "status": 200,
        "responseEvidence": {"data": {"taskId": 553, "items": rows}},
    }]}}
    facts = _record_detail_facts("What materials and steps are required?", observation, "IN-2026-0141753")
    assert "L1; Requirement 1" in facts[0]
    assert "L15; Requirement 15" in facts[0]


def test_license_application_questions_bind_same_permission_page_in_both_languages():
    assert _explicit_reader_source(
        "List all license applications currently pending review, including their application numbers and applicant names.", {}
    ) == "/licensing/applications"
    assert _explicit_reader_source(
        "اعرض جميع طلبات الترخيص قيد المراجعة مع أرقامها وأسماء مقدمي الطلبات.", {}
    ) == "/licensing/applications"


def test_acc030_original_today_prompts_request_dated_inspector_rollup():
    assert _inspection_person_rollup_requested(
        "The Inspector summarizes today's tasks, overdue tasks, and completion rates."
    )
    assert _inspection_person_rollup_requested(
        "قم بتلخيص المهام المنجزة اليوم، بالإضافة إلى المهام المتأخرة ونسبة الإنجاز، باستخدام أداة المفتش."
    )
    assert not _inspection_person_rollup_requested("List the queued inspection tasks.")


def test_arabic_no_today_result_translates_the_date_boundary():
    response = reader_evidence_only_response({
        "result": "no_data", "page": "/inspection/tasks", "answerShape": "count",
        "facts": ["No inspection tasks dated 2026-10-02 were returned for this account; older task rows were not counted as today."],
    }, "ar")
    assert "لم تُرجع بيانات مهام التفتيش" in response
    assert "2026-10-02" in response
    assert "No inspection tasks dated" not in response


def test_verified_empty_today_result_localizes_coverage_without_unverified_next_step():
    result = {
        "result": "no_data", "page": "/inspection/tasks", "answerShape": "count",
        "completeness": "complete",
        "facts": [
            "No inspection tasks created on 2026-10-03 were returned for this account; rows from other dates were not counted.",
            "For this date, completed tasks: 0; overdue tasks: 0; completion rate: not calculable because no tasks were returned. There is no per-inspector breakdown for an empty date.",
            "All permitted task views were read across every page twice (6 page reads).",
        ],
    }
    english = reader_evidence_only_response(result, "en")
    arabic = reader_evidence_only_response(result, "ar")
    assert "All permitted task views were read across every page twice" in english
    assert "Check the selected tab or filters" not in english
    assert "تمت قراءة جميع عروض مهام التفتيش المصرح بها" in arabic
    assert "All permitted task views" not in arabic
    assert "تحقق من التبويب" not in arabic


def test_empty_today_rollup_explains_zero_overdue_and_undefined_rate():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
        "responseEvidence": {"data": {"items": [{
            "taskNo": "IN-OLDER", "createdOn": "2026-09-04T12:00:00", "statusName": "Queued",
        }]}}},
    ]}}
    seed = ReaderOutcome(ReaderResult(status="not_confirmed", page="/inspection/tasks", summary="Pending"),
                         {"observation": observation})
    result = _inspection_today_rollup(seed,
        "Summarize the Inspector's tasks, overdue tasks, and completion rates on 2026-10-02.")
    assert result is not None and result.result.status == "no_data"
    assert "overdue tasks: 0" in result.result.facts[1]
    assert "not calculable" in result.result.facts[1]
    localized = reader_evidence_only_response(result.result.public_json(), "ar")
    assert "نسبة الإنجاز" in localized
    assert "لا يمكن حساب" in localized


def test_verified_inspection_rollup_includes_dated_team_task_without_guessing():
    receipt = {
        "verified": True, "date": "2026-09-10", "dateField": "observedTime",
        "sourceOperation": "POST /api/inspection/team-management/tasks/query",
        "sourceOperations": ["POST /api/inspection/team-management/tasks/query"],
        "view": "team",
        "scopes": ["TeamTodo", "TeamCompleted"],
        "scopeTotals": {"TeamTodo": 1, "TeamCompleted": 0},
        "total": 1, "byInspector": {
            "Yuye Wang": {"tasks": 1, "overdue": 1, "completed": 0},
        }, "pagesRead": 6, "stablePasses": 2, "overdueAsOf": "2026-10-02",
    }
    result = _verified_inspection_task_rollup_result(
        receipt, "For 2026-09-10, summarize each inspector's Team Tasks and completion rates.", "team",
    )
    assert result.status == "success" and result.completeness == "complete"
    assert result.selected_state == 'Team Tasks'
    assert "Yuye Wang" in result.facts[0]
    assert json.loads(result.facts[0])["Tasks"] == 1
    assert json.loads(result.facts[0])["Completion rate"] == '0.0%'
    arabic_result = _verified_inspection_task_rollup_result(
        receipt, 'في 2026-09-10 لخّص مهام الفريق حسب كل مفتش ونسبة الإنجاز.', 'team',
    )
    localized = reader_evidence_only_response(arabic_result.public_json(), 'ar')
    assert 'تمت قراءة جميع المهام البالغ عددها' in localized
    assert 'All 1 tasks with a displayed time' not in localized
    broken = dict(receipt, scopeTotals={"TeamTodo": 0, "TeamCompleted": 0})
    assert _verified_inspection_task_rollup_result(
        broken, "For 2026-09-10, summarize each inspector's Team Tasks.", "team",
    ).status == "not_confirmed"
    assert _verified_inspection_task_rollup_result(
        None, "For 2026-09-10, summarize each inspector's tasks.", "team",
    ).status == "not_confirmed"


def test_today_inspection_questions_use_page_observed_time_not_sla_due_date():
    from unittest.mock import patch

    receipt = {
        'verified': True, 'date': '2026-10-04', 'dateField': 'observedTime',
        'sourceOperation': 'GET /api/admin/inspection/tasks',
        'sourceOperations': ['GET /api/admin/inspection/tasks',
                             'POST /api/inspection/team-management/tasks/query'],
        'view': 'all', 'scopes': ['Queued', 'TeamTodo', 'TeamCompleted'],
        'scopeTotals': {'Queued': 1, 'TeamTodo': 1, 'TeamCompleted': 0},
        'total': 2, 'byInspector': {
            'unassigned': {'tasks': 1, 'overdue': 0, 'completed': 0},
            'Inspector Staff': {'tasks': 1, 'overdue': 1, 'completed': 0},
        }, 'pagesRead': 6, 'stablePasses': 2, 'overdueAsOf': '2026-10-04',
        'sortFieldsComplete': True,
        'tasks': [
            {'taskNo': 'IN-Q', 'createdOn': '2026-10-04T16:00:00',
             'observedTime': '2026-10-04T16:00:00', 'timeField': 'Creation Time',
             'dueDate': '2026-10-04', 'area': 'Dubai'},
            {'taskNo': 'IN-T', 'createdOn': '',
             'observedTime': '2026-10-04T17:00:00', 'timeField': 'Assigned Time',
             'dueDate': '2026-10-04', 'area': ''},
        ],
    }
    with patch('app.portal_reader.datetime') as clock:
        clock.now.return_value = datetime(2026, 10, 4, 9, 0, tzinfo=ZoneInfo('Asia/Dubai'))
        rollup = _verified_inspection_task_rollup_result(
            receipt, 'Summarize today’s tasks by Inspector, including task count and completion rate.', 'team')
        listing = _verified_inspection_task_date_list_result(
            receipt, 'Show today’s inspection tasks, sorted by time and area.', 'team')
    assert rollup.status == 'success'
    assert listing.status == 'success'
    assert json.loads(listing.facts[0])['Task No'] == 'IN-Q'
    assert json.loads(listing.facts[1])['Task No'] == 'IN-T'
    assert _verified_inspection_task_rollup_result(
        dict(receipt, dateField='dueDate'),
        'Summarize today’s tasks by Inspector, including task count and completion rate.', 'team',
    ).status == 'not_confirmed'


def test_today_inspection_empty_date_is_explicit_and_bilingual():
    from unittest.mock import patch

    receipt = {
        'verified': True, 'date': '2026-10-04', 'dateField': 'observedTime',
        'sourceOperation': 'GET /api/admin/inspection/tasks',
        'sourceOperations': ['GET /api/admin/inspection/tasks'],
        'view': 'all', 'scopes': ['Queued', 'Completed'],
        'scopeTotals': {'Queued': 0, 'Completed': 0},
        'total': 0, 'byInspector': {}, 'pagesRead': 4,
        'stablePasses': 2, 'overdueAsOf': '2026-10-04',
    }
    with patch('app.portal_reader.datetime') as clock:
        clock.now.return_value = datetime(2026, 10, 4, 9, 0, tzinfo=ZoneInfo('Asia/Dubai'))
        english = _verified_inspection_task_date_list_result(
            receipt, 'What inspection tasks do I have today? Sort them by time and area.', 'team')
        arabic = _verified_inspection_task_date_list_result(
            receipt, 'ما مهام التفتيش لدي اليوم؟ رتّبها حسب الوقت والمنطقة.', 'team')
    assert english.status == arabic.status == 'no_data'
    assert '2026-10-04' in english.summary and '2026-10-04' in arabic.summary
    assert 'No inspection tasks' in english.summary
    assert 'لا توجد مهام' in arabic.summary


def test_dated_arabic_team_inspector_rollup_uses_open_inspection_page():
    question = (
        'بالنسبة لمهام الفريق التي أُنشئت يوم 22 سبتمبر 2026، لخّص عدد المهام '
        'والمهام المتأخرة ونسبة الإنجاز لكل مفتش.'
    )
    assert _inspection_person_rollup_requested(question)
    assert _explicit_reader_source(question, {
        'currentPage': '/inspection/tasks?tab=teamTasks',
    }) == '/inspection/tasks'


def test_inspection_rollup_date_survives_tool_gateway_projection():
    class Platform:
        portal_base_url = 'https://admin.example.test'

        def __init__(self):
            self.request = None

        async def admin_portal_read(self, request, **_kwargs):
            self.request = request
            return {'status': 'success', 'observation': {'inspectionTaskRollup': {
                'verified': True, 'date': '2026-09-10', 'total': 1,
            }}}

    platform = Platform()
    response = asyncio.run(ToolGateway(None, platform).invoke(
        Principal(user_id='test-user', tenant_id='test', request_id='test-rollup'), 'admin.portal.read', {
        'startPath': '/inspection/tasks', 'actions': [{'type': 'observe'}],
        'inspectionTaskRollupDate': '2026-09-10',
        'inspectionTaskRollupDateField': 'dueDate',
        'inspectionTaskRollupView': 'team',
        'inspectionTaskRollupList': True,
    }))
    assert platform.request['inspectionTaskRollupDate'] == '2026-09-10'
    assert platform.request['inspectionTaskRollupDateField'] == 'dueDate'
    assert platform.request['inspectionTaskRollupView'] == 'team'
    assert platform.request['inspectionTaskRollupList'] is True
    assert response['result']['observation']['inspectionTaskRollup']['total'] == 1


def test_verified_rollup_is_not_overwritten_by_old_visible_page_fallback():
    from app.portal_reader import _native_person_rollup
    outcome = ReaderOutcome(
        ReaderResult(status='not_confirmed', summary='Source unavailable', page='/inspection/tasks'),
        {'stage': 'inspection_person_rollup_native', 'inspectionTaskRollup': {}},
    )
    question = 'For 2026-09-10, summarize each inspector\'s tasks and completion rates.'
    assert _inspection_today_rollup(outcome, question) is None
    assert _native_person_rollup(outcome, question) is outcome


def test_capability_profile_uses_authorized_pages_not_fixed_all_modules():
    context = UserPermissionContext(
        account="content@example.test",
        current_role="Content Manager",
        roles=("Content Manager",),
        departments=("2",),
        pages=("/content/ContentApplications", "/dashboard", "opaque-role-id-1234567890"),
    )
    result = _self_profile_result("List every business module and capability that my account can access.", context)
    assert result is not None
    text = " ".join(result.facts)
    assert "Content" in text and "Dashboard" in text
    assert "Inspection" not in text and "Finance" not in text
    assert "GetUserInfo" not in text and "2" not in text


def test_identity_question_does_not_append_capability_inventory():
    context = UserPermissionContext(
        account="leader@example.test", current_role="Happiness Center Manager",
        departments=("Happiness Center Unit",),
        pages=("Dashboard", "Common", "Customer Happiness", "Common.Document"),
    )
    result = _self_profile_result(
        "هل تعرف في أي قسم وبأي دور أنا حاليًا أقوم بتسجيل الدخول؟",
        context, language="ar",
    )
    assert result is not None
    text = " ".join(result.facts)
    assert "Happiness Center Manager" in text and "Happiness Center Unit" in text
    assert "الصفحات المصرح بها" not in text and "Common.Document" not in text


def test_scope_question_uses_observed_personal_dashboard_not_unknown_role_guess():
    context = UserPermissionContext(
        account="agent@example.test", current_role="Happiness Center Agent",
        departments=("Happiness Center Unit",), pages=("/dashboard",),
    )
    observation = {"regionSummaries": [
        {"heading": "My Tasks", "kind": "region"},
        {"heading": "My Performance", "kind": "region"},
    ]}
    assert _profile_scope_requested("What are my department, role, and data scope?")
    assert _visible_dashboard_scope(observation) == "personal"
    result = _self_profile_result(
        "What are my department, role, and data scope?", context,
        observed_dashboard_scope="personal",
    )
    assert result is not None and result.scope == "personal"
    text = " ".join(result.facts)
    assert "My Tasks / My Performance" in text
    assert "not a team-wide or portal-wide grant" in text
    assert "unknown" not in text
    arabic = _self_profile_result(
        "ما هو قسمي ودوري ونطاق البيانات المسموح لي برؤيته؟", context,
        language="ar", observed_dashboard_scope="personal",
    )
    assert arabic is not None and arabic.scope == "personal"
    assert "مهامي وأدائي" in " ".join(arabic.facts)


def test_capability_question_uses_observed_scope_instead_of_unknown():
    context = UserPermissionContext(
        account="agent@example.test", current_role="Happiness Center Agent",
        departments=("Happiness Center Unit",), pages=("/dashboard",),
    )
    question = "What can you do for me with this account?"
    assert _profile_capability_requested(question)
    result = _self_profile_result(
        question, context, observed_dashboard_scope="personal",
    )
    assert result is not None and result.scope == "personal"
    assert "Data scope verified on the Dashboard: my own work." in result.facts
    assert "unknown" not in " ".join(result.facts).casefold()


def test_profile_team_scope_is_a_user_visible_label_in_both_languages():
    context = UserPermissionContext(
        account='Content-Manager@test.com', current_role='Content Manager',
        departments=('Content Media Department',), pages=('/dashboard',),
        data_scope={'scope': 'team'},
    )
    english = _self_profile_result('What can you do for me with this account?', context)
    arabic = _self_profile_result('ما الذي يمكنك مساعدتي به في حسابي الحالي وما نطاق البيانات الذي أستطيع رؤيته؟', context, language='ar')
    assert english is not None and arabic is not None
    assert any('current team view' in fact for fact in english.facts)
    assert any('عرض الفريق الحالي' in fact for fact in arabic.facts)
    assert not any(fact.endswith(': team.') for fact in english.facts)
    assert not any(fact.endswith(': team.') for fact in arabic.facts)


def test_dashboard_scope_requires_visible_heading_evidence():
    assert _visible_dashboard_scope({"regionSummaries": [{"heading": "General", "kind": "region"}]}) == "unknown"
    assert _visible_dashboard_scope({"regionSummaries": [{"heading": "Team Performance", "kind": "region"}]}) == "team"


def test_named_team_question_does_not_disclose_unfiltered_broad_queue():
    question = "Show all applications for the Foreign Media team."
    assert _named_group_in_question(question) == "Foreign Media"
    result = ReaderResult(
        status="success", summary="Applications", page="/licensing/team-management",
        source_section="table-1", section="Applications", scope="team",
        answer_shape="list", facts=("Task No: ML-1-8007-5701401; Apply For: Irene He",),
    )
    observation = {"sectionSummaries": [{
        "kind": "table", "nodeId": "table-1", "heading": "Applications",
        "columnHeaders": ["Task No.", "Apply For", "Assigned To"],
        "rowFields": [{"Task No.": "ML-1-8007-5701401", "Apply For": "Irene He",
                       "Assigned To": "License Staff ff"}],
    }]}
    guarded = _guard_named_group_scope(ReaderOutcome(result, {"observation": observation}), question)
    assert guarded.result.status == "not_confirmed"
    assert guarded.result.page == "" and guarded.result.scope == "unknown"
    assert "ML-1-8007-5701401" not in " ".join(guarded.result.facts)
    assert "requested_group_scope_unverified" in guarded.result.missing
    assert "broader queue" in reader_evidence_only_response(guarded.result.public_json(), "en")
    assert "لن أعرض" in reader_evidence_only_response(guarded.result.public_json(), "ar")


def test_named_team_guard_also_redacts_partial_answer_with_broad_queue_rows():
    result = ReaderResult(
        status="not_confirmed", summary="Some matching records", page="/licensing/team-management",
        section="Team Tasks", source_section="table-1", scope="team", answer_shape="list",
        facts=("Task No: ML-1; Apply For: Irene He; Assigned To: License Staff ff",),
        missing=("details_not_confirmed",),
    )
    observation = {"sectionSummaries": [{
        "kind": "table", "nodeId": "table-1", "heading": "Team Tasks",
        "columnHeaders": ["Task No.", "Apply For", "Assigned To"],
        "rowFields": [{"Task No.": "ML-1", "Apply For": "Irene He", "Assigned To": "License Staff ff"}],
    }]}
    guarded = _guard_named_group_scope(
        ReaderOutcome(result, {"observation": observation}),
        "Show all applications for the Foreign Media team.",
    )
    assert guarded.result.status == "not_confirmed"
    assert guarded.result.facts == ()
    assert guarded.result.page == ""
    assert guarded.result.missing == ("requested_group_scope_unverified",)


def test_named_group_guard_accepts_selected_filter_or_matching_group_rows():
    question = "Show all applications for the Foreign Media team."
    assert _named_group_in_question(
        "Show all applications and internal review notes for the regular Licensing Department."
    ) == "regular Licensing"
    result = ReaderResult(status="success", summary="Filtered", page="/licensing/team-management",
                          section="Applications", source_section="table-1", facts=("one",))
    base = {"sectionSummaries": [{"kind": "table", "nodeId": "table-1", "heading": "Applications",
                                  "columnHeaders": ["Task No."], "rowFields": [{"Task No.": "ML-1"}]}]}
    selected = {**base, "filterControls": [{"label": "Team", "selected": "Foreign Media"}]}
    assert _guard_named_group_scope(ReaderOutcome(result, {"observation": selected}), question).result.status == "success"
    grouped = {"sectionSummaries": [{"kind": "table", "nodeId": "table-1", "heading": "Applications",
                                      "columnHeaders": ["Task No.", "Team"],
                                      "rowFields": [{"Task No.": "ML-1", "Team": "Foreign Media"}]}]}
    assert _guard_named_group_scope(ReaderOutcome(result, {"observation": grouped}), question).result.status == "success"
    assert _named_group_in_question("Summarize pending tickets in my team.") == ""


def test_capability_list_does_not_promote_permission_tree_nodes_to_pages():
    context = UserPermissionContext(
        current_role="Happiness Center Agent", departments=("Happiness Center Unit",),
        pages=("Dashboard", "Common", "Customer Happiness", "Common.Document"),
    )
    result = _self_profile_result(
        "List every business module and capability that my account can access.", context,
    )
    assert result is not None
    text = " ".join(result.facts)
    assert "Dashboard, Customer Happiness" in text
    assert "Common.Document" not in text and "Dashboard, Common," not in text
    assert "not proof that every page or record" in text


def test_arabic_account_capability_question_uses_verified_profile_not_document_search():
    from app.portal_reader import _self_profile_requested

    question = "ما هي الوحدات والخدمات التي أستطيع الوصول إليها بحسابي الحالي؟"
    assert _self_profile_requested(question)
    assert not _self_profile_requested("ما هي طلبات الترخيص التي لا تزال قيد المراجعة؟")
    context = UserPermissionContext(
        account="agent@example.test", current_role="Happiness Center Agent",
        departments=("Happiness Center Unit",),
        pages=("Dashboard", "Common", "Customer Happiness", "Common.Document"),
    )
    result = _self_profile_result(question, context, language="ar")
    assert result is not None and result.status == "success"
    text = " ".join(result.facts)
    assert "لوحة التحكم, سعادة العملاء" in text
    assert "Dashboard" not in text and "Customer Happiness" not in text
    assert "Common.Document" not in text and "Content Dashboard" not in text
    assert "كل صفحة أو سجل" in text


def test_permission_denial_is_direct_and_does_not_expose_role():
    result = reader_evidence_only_response({
        "result": "no_permission", "page": "/licensing/licenses",
        "missing": ["page_not_permitted"], "facts": [],
    }, "en")
    assert "do not have permission" in result and "Current role" not in result
    assert "No records were disclosed" in result
    assert "/licensing" not in result


def test_transfer_request_is_explicitly_refused_with_portal_next_step():
    result = _mutation_request_refusal_result(
        "Transfer inspection task IN-2026-0141753 to the License department."
    )
    assert result is not None and result.status == "not_confirmed"
    assert "was not transferred" in " ".join(result.facts)
    assert "approved referral process" in " ".join(result.facts)
    assert "Assign Inspector action" not in " ".join(result.facts)
    assert "IN-2026-0141753" in " ".join(result.facts)
    assert "transfer_rule_not_verified" in result.missing


def test_arabic_transfer_refusal_keeps_the_boundary_in_arabic():
    result = _mutation_request_refusal_result(
        "حوّل المهمة IN-2026-0141753 إلى قسم التراخيص.", "ar"
    )
    assert result is not None and result.status == "not_confirmed"
    text = " ".join(result.facts)
    assert "لم يتم نقل" in text
    assert "Inspection > Task Management" not in text


def test_arabic_polite_transfer_and_diacritized_bypass_are_refused_preflight():
    transfer = _mutation_request_refusal_result(
        "يُرجى نقل مهمة التفتيش رقم IN-2026-0141753 إلى قسم التراخيص.", "ar"
    )
    bypass = _mutation_request_refusal_result(
        "تخطَّ التفتيش الميداني للمهمة IN-2026-0141753 وأنشئ تقرير نجاح مباشرة.", "ar"
    )
    assert transfer is not None and "لم يتم نقل" in " ".join(transfer.facts)
    assert bypass is not None and "لا يمكنني تجاوز التفتيش الميداني" in " ".join(bypass.facts)


def test_arabic_inspection_result_change_explicitly_refuses_write():
    result = _mutation_request_refusal_result(
        "ساعدني في تغيير نتيجة الفحص رقم IN-2026-0141753 إلى مقبول.", "ar"
    )
    assert result is not None and result.status == "not_confirmed"
    assert "لم يُنفَّذ أي تغيير" in " ".join(result.facts)
    assert "inspection_result_workflow_required" in result.missing


def test_arabic_fines_history_is_not_misclassified_as_a_cancel_command():
    question = (
        "اعرض جميع عمليات التفتيش السابقة والغرامات وجهات الاتصال الخاصة "
        "بالمؤسسة المرتبطة بمهمة التفتيش IN-2026-0141753."
    )
    assert _mutation_request_refusal_result(question, "ar") is None


def test_arabic_inspection_rollup_uses_task_page_not_violation_page():
    question = "لخّص مهام التفتيش التي أُنشئت في 4 سبتمبر 2026 حسب المفتش، مع ذكر عدد المهام المتأخرة ونسبة الإنجاز."
    assert _explicit_reader_source(question, {}) == "/inspection/tasks"


def test_arabic_violation_query_still_uses_violation_page():
    question = "اعرض المخالفات والغرامات المرتبطة بمهمة التفتيش IN-2026-0141753."
    assert _explicit_reader_source(question, {}) == "/inspection/violations"


def test_arabic_overdue_inspection_query_uses_task_page():
    question = "كم عدد مهام التفتيش التي تجاوزت اتفاقية مستوى الخدمة؟ أدرجها مرتبة حسب عدد أيام التأخير."
    assert _explicit_reader_source(question, {}) == "/inspection/tasks"


def test_unqualified_overdue_tasks_follow_current_authorized_inspection_surface():
    question = "How many tasks exceeding the SLA are currently pending? Please list them and sort them by the number of days overdue."
    context = UserPermissionContext(
        account="leader@example.test", current_role="Inspection Leader",
        roles=("Inspection Leader",), pages=("/inspection/tasks", "/happiness/tickets"),
    )
    assert _explicit_reader_source(question, {"currentPage": {"route": "/inspection/tasks"}}, context) == "/inspection/tasks"
    assert _explicit_reader_source(question, {"currentPage": {"route": "/dashboard"}}, context) == "/inspection/tasks"
    assert _inspection_overdue_list_requested(question)
    assert _explicit_reader_source(question, {"currentPage": {"route": "/happiness/team-management"}},
                                   UserPermissionContext(account="leader@example.test", current_role="Inspection Leader",
                                                         roles=("Inspection Leader",), pages=("/inspection/tasks",))) == "/inspection/tasks"


def test_arabic_named_task_history_starts_from_task_not_violation_list():
    question = (
        "عرض جميع التفتيشات السابقة، والغرامات المفروضة، وجميع البيانات "
        "المتعلقة بالمؤسسة المرتبطة بالرقم IN-2026-0141753."
    )
    assert _explicit_reader_source(question, {}) == "/inspection/tasks"


def test_arabic_empty_fine_decision_note_is_localized():
    result = {
        "result": "no_data",
        "answerShape": "list",
        "facts": [
            "No fine decision is recorded for the requested case in this account's readable violation records, so the amount is not that it is zero - it is that no record exists yet. Open Inspection > Violations and filter by the case number to confirm."
        ],
        "page": "/inspection/violations",
    }
    rendered = reader_evidence_only_response(result, "ar", question="ما قيمة الغرامة للقضية VN-2026-7195613؟")
    assert "لم تُسجَّل" in rendered
    assert "No fine decision" not in rendered


def test_english_reader_notes_do_not_receive_arabic_translation():
    denied = {
        "result": "no_permission", "page": "/licensing/applications",
        "facts": [
            "Current role: Happiness Center Agent. The requested records belong to /licensing/applications, "
            "which the current account permissions do not authorize reading. No requested records were verified."
        ],
    }
    rendered = reader_evidence_only_response(denied, "en", question="List licensing applications I can see.")
    assert "Current role:" in rendered
    assert "الدور الحالي" not in rendered
    assert "Read from" not in rendered
    checklist = {
        "result": "success", "page": "/inspection/tasks", "answerShape": "detail",
        "facts": ["Inspection checklist materials/steps returned for IN-1: Site visit; Trade licence."],
    }
    rendered = reader_evidence_only_response(checklist, "en", question="What materials are required?")
    assert "Inspection checklist materials/steps" in rendered
    assert "تم إرجاع" not in rendered


def test_arabic_target_history_scope_note_is_localized():
    note = (
        "Task history and violation history are target-scoped to the verified task; "
        "the ordinary Violations list was not used as a substitute."
    )
    rendered = reader_evidence_only_response(
        {"result": "success", "page": "/inspection/tasks", "answerShape": "detail", "facts": [note]},
        "ar", question="اعرض التفتيشات السابقة والغرامات للمهمة IN-2026-0141753",
    )
    assert "يقتصر سجل المهام والمخالفات" in rendered
    assert "Task history and violation history" not in rendered


def test_inspector_rollup_merges_api_and_rendered_task_and_reads_sla_status():
    observation = {
        "apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": [
                {"taskNo": "IN-1", "createdOn": "2026-09-04T10:00:00", "inspectorName": "-",
                 "statusName": "Queued", "slaStatus": "14d Overdue"},
            ]}},
        }]},
        "sectionSummaries": [{"kind": "table", "columnHeaders": ["Task No.", "Inspector", "SLA"],
                              "rowFields": [{"Task No.": "IN-1", "Inspector": "-", "SLA": "14d Overdue"}]}],
    }
    seed = ReaderOutcome(
        ReaderResult(status="success", summary="Task rows", page="/inspection/tasks", answer_shape="list"),
        {"observation": observation},
    )
    assert len(_observed_api_rows(seed)) == 1
    result = _inspection_today_rollup(seed, "Summarize inspection tasks created on September 4, 2026 by inspector, including overdue count and completion rate.")
    assert result is not None and result.result.status == "success"
    fact = json.loads(result.result.facts[0])
    assert fact["Inspector"] == "unassigned" and fact["Tasks"] == 1 and fact["Overdue"] == 1


def test_arabic_possessive_department_role_question_is_profile_intent():
    from app.portal_reader import _self_profile_requested
    assert _self_profile_requested("ما هو قسمي ودوري؟")
    assert _self_profile_requested("هل تعرف في أي قسم وبأي دور أنا حاليًا أقوم بتسجيل الدخول؟")


def test_license_application_status_query_does_not_fall_into_happiness_tickets():
    question = "For ML-2-804-9226243, tell me separately the license status, payment status, and complaint status."
    assert _explicit_reader_source(question, {}) == "/financial-payment/transactions"


def test_inspection_checklist_detail_projects_materials_and_steps():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/tasks/{id}/checklist-template",
        "status": 200,
        "responseEvidence": {"data": {"items": [
            {"step": "Identity verification", "material": "Trade licence", "stepNumber": 1, "isChecked": True},
            {"step": "Site visit", "material": "Safety plan"},
        ]}},
    }]}}
    facts = _record_detail_facts("what materials and steps should I prepare?", observation, "IN-1")
    text = " ".join(facts)
    assert "Trade licence" in text and "Safety plan" in text
    assert "Identity verification" in text
    assert "not a complete materials list" in text
    assert "True" not in text


def test_inspection_detail_does_not_treat_task_detail_as_checklist():
    observation = {"apiDiscovery": {"candidates": [
        {
            "operationKey": "GET /api/admin/inspection/tasks/{id}",
            "status": 200,
            "responseEvidence": {"data": {"id": 7, "taskNo": "IN-1", "targetName": "North"}},
        },
    ]}}
    facts = _record_detail_facts("what materials and steps should I prepare?", observation, "IN-1")
    assert "checklist endpoint returned" not in " ".join(facts)


def test_violation_checklist_permission_boundary_is_localized_without_policy_substitution():
    assert _explicit_reader_source("What materials are required for task VN-2026-0822960?", {}) == "/inspection/violations"
    result = {
        "result": "not_confirmed", "page": "/inspection/violations", "answerShape": "detail",
        "facts": [
            "Violation VN-2026-0822960 was verified in the authorized Violations view.",
            "Its recorded source task is IN-2026-5922098.",
            "The Violations view does not expose the source task checklist, and this account cannot read "
            "Inspection / Tasks; required materials and steps cannot be confirmed here.",
        ],
    }
    rendered = reader_evidence_only_response(result, "ar", question="ما هي المواد والخطوات للمهمة VN-2026-0822960؟")
    assert "تم التحقق من المخالفة" in rendered
    assert "لا تعرض واجهة المخالفات" in rendered
    assert "No retrieved policy" not in rendered


def test_target_history_facts_are_scoped_and_report_completeness():
    observation = {"apiDiscovery": {"candidates": [
        {
            "operationKey": "GET /api/admin/inspection/tasks/by-target",
            "status": 200,
            "responseEvidence": {"data": {"items": [{"taskNo": "IN-1", "statusName": "Completed"}]}},
            "relatedReadReceipt": {"complete": True, "total": 1},
        },
        {
            "operationKey": "GET /api/admin/inspection/violations/by-target",
            "status": 200,
            "responseEvidence": {"data": {"items": [{"violationNo": "VN-1", "fineAmount": 100}]}},
            "relatedReadReceipt": {"complete": True, "total": 1},
        },
    ]}}
    facts = _record_detail_facts(
        "Show all past inspections and penalties for the institution behind IN-1.",
        observation,
        "IN-1",
    )
    text = " ".join(facts)
    assert "IN-1" in text and "VN-1" in text
    assert "target-scoped" in text


def test_profile_labels_are_read_from_authenticated_profile_payload_not_role_id():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/UserManagement/GetAdminUserAsync",
        "status": 200,
        "responseEvidence": {"data": {
            "userId": "user-1",
            "departmentsInfo": [{"id": 8, "name": "Happiness Center Unit"}],
            "assignRolesIdsInfo": [{"id": "ROLE_1", "name": "Happiness Center Agent"}],
        }},
    }]}}
    departments, roles = _profile_labels_from_observation(observation)
    assert departments == ("Happiness Center Unit",)
    assert roles == ("Happiness Center Agent",)


def test_self_profile_wrapper_follows_arabic_response_language_without_translating_values():
    context = UserPermissionContext(
        account="15116462653@163.com",
        current_role="Happiness Center Agent",
        roles=("Happiness Center Agent",),
        departments=("Happiness Center Unit",),
        pages=("Dashboard", "Common", "Customer Happiness", "Common.Document"),
    )
    result = _self_profile_result(
        "هل تعرف القسم والدور الوظيفي اللذين سجلت الدخول بهما حالياً؟",
        context,
        language="ar",
    )
    assert result is not None
    text = " ".join(result.facts)
    assert "الدور الوظيفي" in text and "الأقسام" in text
    assert "Happiness Center Agent" in text and "Happiness Center Unit" in text
    assert "Business role:" not in text


def test_reader_presentation_hides_internal_observation_identifiers():
    text = _sanitize_reader_internal_ids(
        "Read from observation-table-001 on Inspection / Tasks; observation-grid-2 is internal."
    )
    assert "observation-table-001" not in text
    assert "observation-grid-2" not in text
    assert "Inspection / Tasks" in text


def test_target_history_projects_institution_and_contacts_without_unrelated_policy_text():
    observation = {"apiDiscovery": {"candidates": [
        {
            "operationKey": "GET /api/admin/inspection/tasks/{id}/target-overview",
            "status": 200,
            "responseEvidence": {"data": {"establishmentId": 42, "establishmentNameEn": "North Media"}},
        },
        {
            "operationKey": "GET /api/admin/inspection/tasks/{id}/persons",
            "status": 200,
            "responseEvidence": {"data": {"items": [{"name": "Aisha", "phone": "+971500000000"}]}},
        },
        {
            "operationKey": "GET /api/admin/inspection/tasks/by-target",
            "status": 200,
            "responseEvidence": {"data": {"items": [{"taskNo": "IN-1", "statusName": "Completed"}]}},
            "relatedReadReceipt": {"complete": True, "total": 1},
        },
        {
            "operationKey": "GET /api/admin/inspection/violations/by-target",
            "status": 200,
            "responseEvidence": {"data": {"items": [{"violationNo": "VN-1", "fineAmount": 100}]}},
            "relatedReadReceipt": {"complete": True, "total": 1},
        },
    ]}}
    facts = _record_detail_facts(
        "Show all past inspections, penalties, and contacts for the institution behind IN-1.",
        observation,
        "IN-1",
    )
    text = " ".join(facts)
    assert "North Media" in text and "Aisha" in text
    assert "All 1 authorized task-history records" in text
    assert "All 1 authorized target-scoped violation records" in text
    assert "regulation states" not in text


def test_today_rollup_does_not_count_stale_rows_as_today():
    today = datetime.now(ZoneInfo('Asia/Dubai')).date().isoformat()
    rows = [
        {"taskNo": "IN-OLD", "createdOn": "2026-08-29", "inspectorName": "Old Inspector", "statusName": "Completed"},
        {"taskNo": "IN-TODAY", "createdOn": today, "inspectorName": "Current Inspector", "statusName": "Completed"},
    ]
    outcome = ReaderOutcome(
        ReaderResult(status="success", summary="Task rows", page="/inspection/tasks", answer_shape="list", facts=("old",)),
        {"observations": {"tasks": {"apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": rows}},
        }]}}}},
    )
    result = _inspection_today_rollup(outcome, "Summarize today's tasks by inspector, including completion rate.")
    assert result is not None and result.result.status == "success"
    assert "Current Inspector" in " ".join(result.result.facts)
    assert "Old Inspector" not in " ".join(result.result.facts)


def test_today_rollup_returns_explicit_empty_for_only_stale_rows():
    outcome = ReaderOutcome(
        ReaderResult(status="success", summary="Task rows", page="/inspection/tasks", answer_shape="list", facts=("old",)),
        {"observation": {"apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": [{"taskNo": "IN-OLD", "createdOn": "2026-08-29"}]}},
        }]}}},
    )
    result = _inspection_today_rollup(outcome, "Summarize today's tasks by inspector.")
    assert result is not None and result.result.status == "no_data"
    assert "older task rows were not counted" in result.result.facts[0]


def test_explicit_date_rollup_excludes_rows_from_other_dates():
    rows = [
        {"taskNo": "IN-SEP16", "createdOn": "2026-09-16T08:00:00", "inspectorName": "Inspector A", "statusName": "Completed"},
        {"taskNo": "IN-SEP04", "createdOn": "2026-09-04T08:00:00", "inspectorName": "Inspector B", "statusName": "Queued", "SLA": "14d Overdue"},
    ]
    outcome = ReaderOutcome(
        ReaderResult(status="success", summary="Task rows", page="/inspection/tasks", answer_shape="list", facts=("old",)),
        {"observations": {"tasks": {"apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": rows}},
        }]}}}},
    )
    result = _inspection_today_rollup(
        outcome,
        "Summarize the inspection tasks created on September 16, 2026 by inspector, including overdue count and completion rate.",
    )
    assert result is not None and result.result.status == "success"
    text = " ".join(result.result.facts)
    assert "Inspector A" in text and "Inspector B" not in text
    assert "2026-09-16" in text and "2026-09-04" not in text


def test_explicit_date_rollup_returns_empty_for_missing_date():
    outcome = ReaderOutcome(
        ReaderResult(status="success", summary="Task rows", page="/inspection/tasks", answer_shape="list", facts=("old",)),
        {"observation": {"apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": [{"taskNo": "IN-SEP04", "createdOn": "2026-09-04"}]}},
        }]}}},
    )
    result = _inspection_today_rollup(
        outcome,
        "Summarize the inspection tasks created on September 16, 2026 by inspector.",
    )
    assert result is not None and result.result.status == "no_data"
    assert "2026-09-16" in result.result.facts[0]
    assert "2026-09-04" not in result.result.facts[0]


def test_institution_history_does_not_invent_history_or_contacts():
    facts = _record_detail_facts(
        "Show all past inspections, penalties, and contacts for the institution behind IN-1.",
        {"apiDiscovery": {"candidates": []}}, "IN-1",
    )
    text = " ".join(facts)
    assert "institution associated with this task cannot be confirmed" in text
    assert "no contact can be confirmed" in text


def test_institution_history_explains_missing_target_and_contact_collections():
    observation = {"apiDiscovery": {"candidates": [
        {
            "operationKey": "GET /api/admin/inspection/tasks/{id}/target-overview",
            "status": 200,
            "responseEvidence": {"data": {}},
        },
        {
            "operationKey": "GET /api/admin/inspection/tasks/{id}/persons",
            "status": 200,
            "responseEvidence": {"data": {"items": []}},
        },
    ]}}
    facts = _record_detail_facts(
        "Show all past inspections, penalties, and contacts for the institution behind IN-1.",
        observation,
        "IN-1",
    )
    text = " ".join(facts)
    assert "institution identifier" in text and "inferred" in text
    assert "No institution contact persons were returned" in text
    assert "Neither a complete task-history collection" in text


def test_status_rollup_capability_is_schema_driven_not_route_named():
    observation = {
        "readHealth": {"healthy": True},
        "tabControls": [{"name": "Pending", "selected": True}, {"name": "Closed", "selected": False}],
        "sectionSummaries": [{
            "kind": "table",
            "nodeId": "table-1",
            "columnHeaders": ["Record No.", "Assigned To", "Status"],
            "rowFields": [{"Record No.": "R-1", "Assigned To": "Agent A", "Status": "Open"}],
        }],
    }
    assert _status_grouping_capable(observation) is True


def test_status_page_info_reads_observed_standard_pagination_shape():
    observation = {"apiDiscovery": {"candidates": [{
        "status": 200,
        "responseEvidence": {"data": {"data": {"page": {
            "items": [{"id": "R-1"}], "total": 18, "pageSize": 10, "pageIndex": 1,
        }}}},
    }]}}
    assert _status_page_info(observation) == (1, 10, 18)


def test_status_page_info_accepts_live_total_count_field():
    observation = {"apiDiscovery": {"candidates": [{
        "status": 200,
        "responseEvidence": {"data": {"items": [{"taskNo": "IN-1"}],
                                     "totalCount": 36, "pageSize": 10, "pageIndex": 1}},
    }]}}
    assert _status_page_info(observation) == (1, 10, 36)


def test_status_page_action_candidates_uses_native_forward_control_context():
    observation = {
        "paginationControls": [
            {"role": "button", "name": "left", "context": "Previous Page", "disabled": False},
            {"role": "button", "name": "right", "context": "Next Page", "disabled": False},
        ],
    }
    assert _status_page_action_candidates(observation, 2) == (
        {"type": "paginate", "role": "button", "name": "right"},
    )


def test_status_page_action_candidates_does_not_invent_next_without_observed_controls():
    assert _status_page_action_candidates({"controls": ["1", "2"]}, 3) == ()


def test_status_page_action_candidates_prefers_observed_numeric_page_link():
    observation = {
        "paginationControls": [
            {"role": "link", "name": "2", "context": "2", "disabled": False},
            {"role": "button", "name": "right", "context": "Next Page", "disabled": False},
        ],
    }
    assert _status_page_action_candidates(observation, 2) == (
        {"type": "paginate", "role": "link", "name": "2"},
        {"type": "paginate", "role": "button", "name": "right"},
    )


def test_inspection_task_rows_merge_api_and_rendered_row_by_task_number():
    observation = {
        "apiDiscovery": {"candidates": [{
            "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
            "responseEvidence": {"data": {"items": [
                {"taskNo": "IN-1", "targetName": "A", "slaStatus": "2d Overdue"},
            ]}},
        }]},
        "sectionSummaries": [{"kind": "table", "heading": "Inspection Tasks", "columnHeaders": ["Task No.", "SLA"],
                              "rowFields": [{"Task No.": "IN-1", "SLA": "2d Overdue"}]}],
    }
    rows = _inspection_task_rows_from_observation(observation)
    assert len(rows) == 1
    assert rows[0]["taskNo"] == "IN-1"
    assert rows[0]["SLA"] == "2d Overdue"


def test_exact_fine_decision_is_not_an_unrelated_bounded_list():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/violations", "status": 200,
        "responseEvidence": {"data": {"items": [{
            "violationNo": "VN-2026-1", "taskNo": "IN-2026-1",
            "statusName": "Pending Committee Decision", "fineAmount": 0.0,
        }]}},
    }]}}
    seed = ReaderResult(status="not_confirmed", summary="Lookup", page="/inspection/violations")
    outcome = _native_fine_decision_result(
        ReaderOutcome(seed, {"observation": observation}),
        "What fine amount has the committee decided for VN-2026-1?",
    )
    assert outcome.result.status == "success"
    assert outcome.result.answer_shape == "detail"
    assert "not decided yet" in " ".join(outcome.result.facts)


def test_api_candidate_rows_accepts_array_data_envelope():
    observation = {"apiDiscovery": {"candidates": [{
        "operationKey": "GET /api/admin/inspection/violations",
        "status": 200,
        "responseEvidence": {"data": [{"violationNo": "VN-1", "fineAmount": None}]},
    }]}}
    assert _api_candidate_rows(observation, "GET /api/admin/inspection/violations")[0]["violationNo"] == "VN-1"


def test_inspection_overdue_result_filters_and_sorts_all_observed_rows():
    observation = {"sectionSummaries": [{
        "kind": "table", "heading": "Inspection Tasks",
        "columnHeaders": ["Task No.", "Inspection Target", "SLA", "Status"],
        "rowFields": [
            {"Task No.": "IN-2", "Inspection Target": "B", "SLA": "2d Overdue", "Status": "Queued"},
            {"Task No.": "IN-1", "Inspection Target": "A", "SLA": "14d Overdue", "Status": "Queued"},
            {"Task No.": "IN-3", "Inspection Target": "C", "SLA": "Due in 3d", "Status": "Queued"},
        ],
    }]}
    result = _inspection_overdue_result(
        observation, page="/inspection/tasks", question="Show inspection tasks overdue SLA only, sorted by overdue days.",
        scope="team", complete=True, page_count=2, total_rows=3,
    )
    assert result is not None and result.status == "success"
    assert result.facts[0].startswith('{"Overdue Days":14')
    assert len(result.facts) == 3


def test_inspection_overdue_merges_complete_api_rows_from_each_visited_page():
    def observed_page(task_numbers, rendered_count):
        items = [
            {"taskNo": number, "targetName": number, "slaStatus": "3d Overdue", "statusName": "Queued"}
            for number in task_numbers
        ]
        return {
            "apiDiscovery": {"candidates": [{
                "operationKey": "GET /api/admin/inspection/tasks", "status": 200,
                "responseEvidence": {"data": {"items": items}},
            }]},
            "sectionSummaries": [{
                "kind": "table", "heading": "Inspection Tasks",
                "columnHeaders": ["Task No.", "SLA"],
                "rowFields": [
                    {"Task No.": item["taskNo"], "SLA": item["slaStatus"]}
                    for item in items[:rendered_count]
                ],
            }],
        }

    first = observed_page([f"IN-{index}" for index in range(10)], 10)
    second = observed_page([f"IN-{index}" for index in range(10, 20)], 7)
    merged = _merge_status_observations(first, second)
    result = _inspection_overdue_result(
        merged, page="/inspection/tasks", question="List overdue inspection tasks",
        scope="team", complete=True, page_count=2, total_rows=20,
    )
    assert result is not None and result.status == "success"
    assert len(result.facts) == 21
    assert "20 inspection task(s)" in result.summary


def test_inspection_overdue_does_not_claim_complete_when_observed_rows_are_missing():
    observation = {"sectionSummaries": [{
        "kind": "table", "heading": "Inspection Tasks", "columnHeaders": ["Task No.", "SLA"],
        "rowFields": [{"Task No.": "IN-1", "SLA": "3d Overdue"}],
    }]}
    result = _inspection_overdue_result(
        observation, page="/inspection/tasks", question="List overdue inspection tasks",
        scope="team", complete=True, page_count=2, total_rows=20,
    )
    assert result is not None and result.status == "not_confirmed"
    assert result.completeness == "bounded"


def test_inspection_transfer_refusal_preserves_task_and_does_not_invent_department_route():
    result = _mutation_request_refusal_result(
        "يُرجى نقل مهمة التفتيش رقم IN-2026-0141753 إلى قسم التراخيص.", "ar"
    )
    assert result is not None and result.status == "not_confirmed"
    assert "IN-2026-0141753" in " ".join(result.facts)
    assert "تغيير المفتش لا يثبت تحويل القسم" in " ".join(result.facts)
    assert "transfer_rule_not_verified" in result.missing


def test_inspection_overdue_request_requires_list_shape():
    assert _inspection_overdue_list_requested("Show inspection tasks overdue SLA only, sorted by overdue days.")
    assert _inspection_overdue_list_requested("اعرض مهام التفتيش المتأخرة حسب اتفاقية مستوى الخدمة مرتبة حسب أيام التأخير")
    assert not _inspection_overdue_list_requested(
        "Summarize today's tasks by inspector, including overdue count and completion rate."
    )
    assert not _inspection_overdue_list_requested(
        "لخّص مهام التفتيش اليوم لكل المفتشين، مع عدد المهام المتأخرة ونسبة الإنجاز."
    )


def test_inspection_overdue_result_never_calls_one_page_a_complete_queue():
    observation = {"sectionSummaries": [{
        "kind": "table", "heading": "Inspection Tasks",
        "columnHeaders": ["Task No.", "SLA"],
        "rowFields": [{"Task No.": "IN-1", "SLA": "14d Overdue"}],
    }]}
    result = _inspection_overdue_result(
        observation, page="/inspection/tasks", question="Show overdue inspection tasks.",
        scope="team", complete=False, page_count=1, total_rows=None,
    )
    assert result is not None and result.status == "not_confirmed"
    assert "inspection_task_pagination_incomplete" in result.missing
