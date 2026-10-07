from app.portal_reader import (
    _bounded_conversation_context,
    _team_task_assignment_list_requested,
    _explicit_record_identity,
    _explicit_reader_source,
    _named_group_in_question,
    _member_metric_followup_question,
    _ticket_team_summary_requested,
    UserPermissionContext,
    _inspection_person_rollup_requested,
)


def test_followup_context_retains_current_browser_context_at_every_boundary():
    source = {
        'currentPage': {'route': '/happiness/team-management',
                        'browserTimezone': 'Asia/Shanghai', 'view': 'Team Members'},
        'previousIntent': {'question': 'Summarize my team', 'page': '/happiness/team-management'},
    }
    bounded = _bounded_conversation_context(source)
    assert bounded['currentPage'] == source['currentPage']
    assert 'currentPage' not in bounded['previousIntent']
    assert _bounded_conversation_context(bounded) == bounded


def test_owner_names_do_not_replace_the_requested_count_with_task_rows():
    for question in (
        'How many overdue tasks are in my team? Give the count and the names of the people responsible.',
        'كم عدد المهام المتأخرة في فريقي؟ اذكر العدد وأسماء المسؤولين عنها.',
    ):
        assert not _team_task_assignment_list_requested(question)
    assert _team_task_assignment_list_requested(
        'List my team tasks and the person responsible for each.')


def test_formatted_ticket_number_keeps_its_object_route():
    question = ('What is the current status and formal transfer outcome of '
                'HC-01- 2026-9762913, transferred to Content? '
                "Do not disclose the Content department's internal review notes.")
    assert _explicit_record_identity(question) == 'HC-01-2026-9762913'
    assert _explicit_reader_source(question, {}) == '/happiness/tickets'
    assert _explicit_record_identity('Compare HC-01-2026-1 and HC-01-2026-2') == ''


def test_generic_arabic_work_team_is_not_a_named_department():
    assert _named_group_in_question('لخص المهام لكل عضو من أعضاء فريق العمل.') == ''
    assert _named_group_in_question('Show tasks for the Content team.') == 'Content'


def test_short_overdue_followup_requires_verified_member_context():
    context = {'previousIntent': {'resultStatus': 'success', 'sourceSection': 'Team Members'}}
    assert _ticket_team_summary_requested(_member_metric_followup_question('How many are overdue?', context))
    assert _member_metric_followup_question('How many are overdue?', {}) == 'How many are overdue?'
    assert _member_metric_followup_question('كم عدد الحالات التي تأخر في سدادها؟', context) == 'كم عدد الحالات التي تأخر في سدادها؟'


def test_member_summary_uses_inspection_actual_task_surface_and_authorization():
    question = "Summarize each staff member's pending, overdue, and closed tickets in my team."
    permission = UserPermissionContext(current_role='Inspection Leader',
        pages=('/inspection/tasks', '/happiness/team-management'))
    assert _explicit_reader_source(question, {}, permission) == '/inspection/tasks'
    assert _explicit_reader_source(question, {'currentPage': {'route': '/inspection/tasks?tab=teamMembers'}}, permission) == '/inspection/tasks'
    unauthorized = UserPermissionContext(current_role='Inspection Leader', pages=('/inspection/violations',))
    assert _explicit_reader_source(question, {}, unauthorized) == ''


def test_undated_member_summary_does_not_silently_become_today_inspection_rollup():
    for question in (
        "Summarize each staff member's pending, overdue, and closed tickets in my team.",
        'لخص المهام، والمتأخرة، وأوامر العمل المغلقة لكل عضو من أعضاء فريق العمل.',
    ):
        assert not _inspection_person_rollup_requested(question)
    assert _inspection_person_rollup_requested("Summarize today's inspections by inspector, with completed and overdue tasks.")
    assert _inspection_person_rollup_requested('لخص مهام التفتيش بتاريخ 2026-09-28 لكل مفتش، مع المهام المنجزة والمتأخرة.')


def test_arabic_work_order_wording_keeps_named_member_metric_intent():
    question = 'كم عدد أوامر العمل المعلقة لدى عضو الفريق example-member حاليًا؟ يرجى تحديد العدد لهذا العضو.'
    assert _ticket_team_summary_requested(question)
    permission = UserPermissionContext(current_role='License Admin', pages=('/licensing/team-management',))
    assert _explicit_reader_source(question, {}, permission) == '/licensing/team-management'
