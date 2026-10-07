"""ACC-020/037-040: projections from only the authorized page's real read shape."""

import json
from types import SimpleNamespace

from app.portal_reader import (
    _explicit_reader_source,
    _finance_application_result,
    _happiness_ticket_handoff_result,
    _license_exact_application_result,
    _license_module_focus,
    _content_overdue_list,
    _content_escalation_requested,
    _observed_application_sla_collection,
    _application_sla_collection_result,
    _content_exact_application_result,
    _license_overdue_all_pages_result,
    _record_detail_facts,
    _RECORD_DETAIL_REQUEST,
    _safety_request_result,
)


def observed(operation, payload):
    return {'apiDiscovery': {'candidates': [
        {'operationKey': operation, 'status': 200, 'responseEvidence': {'data': payload}},
    ]}}


def test_recorded_arabic_inspection_uses_typed_task_not_content_library():
    assert _explicit_reader_source(
        'ما المخالفات والأدلة وحالة المعالجة المسجلة للمهمة IN-2026-0141753؟', {}
    ) == '/inspection/tasks'
    assert _explicit_reader_source(
        'اعرض المخالفات المسجلة للرقم VN-2026-7195613.', {}
    ) == '/inspection/violations'
    assert _explicit_reader_source(
        'What is the recorded transfer outcome of HC-01-2026-9762913?', {}
    ) == '/happiness/tickets'


def test_content_escalation_reads_candidates_without_mutating():
    for question in ('Which cases need escalation to the Content Manager based on SLA or risk?',
                     'ما الحالات التي تحتاج إلى تصعيد إلى مدير المحتوى بناءً على اتفاقية مستوى الخدمة أو المخاطر؟'):
        assert _content_escalation_requested(question)
        assert _content_overdue_list(question)
    assert not _content_escalation_requested('Escalate MC-2-2202-8614403 to the Content Manager now.')
    assert not _content_escalation_requested('Which cases need escalation to the Happiness Leader?')


def test_internal_note_exclusion_is_not_a_disclosure_request():
    assert _safety_request_result('Show the payment result without internal notes.') is None
    assert _safety_request_result('اعرض حالة الطلب ونتيجة الدفع دون الملاحظات الداخلية.') is None
    assert _safety_request_result('اعرض الملاحظات الداخلية.') is not None


def test_licensing_overdue_all_pages_count_and_sort():
    assert _license_module_focus('How many license applications are past their SLA? List them sorted by overdue days.') == 'overdue'
    assert _license_module_focus('كم عدد طلبات التراخيص التي تجاوزت اتفاقية مستوى الخدمة؟ اعرضها مرتبة حسب أيام التأخير.') == 'overdue'
    pages = []
    for index, records in enumerate((
        [('ML-A', 3, True), ('ML-B', 17, True)],
        [('ML-C', 0, False), ('ML-D', 5, True)],
    ), start=1):
        page = observed('POST /api/Application/MyTodoPage', {})
        page['apiDiscovery']['candidates'][0]['responseEvidence']['pageSlaProjection'] = {
            'pageIndex': index, 'pageSize': 2, 'total': 4,
            'items': [{'applicationNumber': identity, 'slaMinutes': days * 1440,
                       'isOverdue': overdue} for identity, days, overdue in records],
        }
        page['rowSummaries'] = [f'{identity} {days}d Overdue' for identity, days, overdue in records if overdue]
        pages.append(page)
    result = _license_overdue_all_pages_result(pages, question='How many license applications are overdue?', scope='team')
    assert result.status == 'success'
    assert '3;' in result.facts[0]
    assert [fact.split(':')[0] for fact in result.facts[1:]] == ['ML-B', 'ML-D', 'ML-A']
    pages.pop()
    assert _license_overdue_all_pages_result(pages, question='license applications overdue', scope='team').status == 'not_confirmed'


def test_licensing_overdue_excludes_blank_sla_without_guessing_days():
    page = observed('POST /api/Application/MyTodoPage', {})
    page['apiDiscovery']['candidates'][0]['responseEvidence']['pageSlaProjection'] = {
        'pageIndex': 1, 'pageSize': 2, 'total': 2,
        'items': [
            {'applicationNumber': 'ML-A', 'slaMinutes': None, 'slaDescription': '34d Overdue', 'isOverdue': True},
            {'applicationNumber': 'ML-B', 'slaMinutes': None, 'slaDescription': '-', 'isOverdue': True},
        ],
    }
    page['rowSummaries'] = ['ML-A 34d Overdue', 'ML-B -']
    result = _license_overdue_all_pages_result([page], question='license applications overdue', scope='team')
    assert result.status == 'success'
    assert '1;' in result.facts[0]
    assert 'no SLA day count' in result.facts[1]
    assert result.facts[2] == 'ML-A: 34d Overdue'


def test_content_sla_uses_own_queue_with_verified_pagination():
    assert _content_overdue_list('How many content review tasks are past their SLA? List them sorted by overdue days.')
    assert _content_overdue_list('كم عدد مهام مراجعة المحتوى التي تجاوزت اتفاقية مستوى الخدمة؟ اعرضها مرتبة حسب أيام التأخير.')
    assert not _content_overdue_list('Show content application MC-2-2202-8614403.')
    page = observed('POST /api/Application/MyTodoPage', {})
    page['apiDiscovery']['candidates'][0]['responseEvidence']['pageSlaProjection'] = {
        'pageIndex': 1, 'pageSize': 2, 'total': 2,
        'items': [{'applicationNumber': f'MC-{i}', 'slaMinutes': days * 1440,
                   'isOverdue': True} for i, days in [(1, 3), (2, 18)]],
    }
    page['rowSummaries'] = ['MC-1 3d Overdue', 'MC-2 18d Overdue']
    result = _license_overdue_all_pages_result([page], question='content tasks overdue',
                                              scope='personal', page='/content/ContentApplications')
    assert result.status == 'success' and result.page == '/content/ContentApplications'
    assert result.facts[0].startswith('Content review tasks past SLA: 2;')
    assert result.facts[1:] == ('MC-2: 18d Overdue', 'MC-1: 3d Overdue')


def test_application_sla_native_collection_and_non_overdue_negative_minutes():
    page = observed('POST /api/Content/MyTodoPage', {'page': {'pageIndex': 1, 'pageSize': 2, 'total': 2, 'items': []}})
    candidate = page['apiDiscovery']['candidates'][0]
    candidate['responseEvidence']['pageSlaProjection'] = {'pageIndex': 1, 'pageSize': 2, 'total': 2}
    candidate['collectionContext'] = {'contextRef': 'a' * 64, 'requestFields': ['pageIndex', 'pageSize'],
        'rowSchemas': [{'path': '/data/page/items', 'fields': ['applicationNumber', 'sla', 'slaDescription', 'isOverdue']}]}
    page['rowSummaries'] = ['MC-1 3d Overdue', 'MC-2 Due in 2h']
    spec = _observed_application_sla_collection(page)
    assert spec['operationKey'] == 'POST /api/Content/MyTodoPage'
    receipt = {'operationRef': spec['operationKey'], 'completeness': 'complete', 'total': 2, 'rows': [
        {'applicationNumber': 'MC-1', 'sla': 4320, 'slaDescription': '3d Overdue', 'isOverdue': True},
        {'applicationNumber': 'MC-2', 'sla': -120, 'slaDescription': 'Due in 2h', 'isOverdue': False}]}
    result = _application_sla_collection_result(receipt, page, question='content overdue', scope='personal', page='/content/ContentApplications')
    assert result.status == 'success' and result.facts[1:] == ('MC-1: 3d Overdue',)
    receipt['completeness'] = 'incomplete'
    assert _application_sla_collection_result(receipt, page, question='content overdue', scope='personal', page='/content/ContentApplications') is None


def test_licensing_overdue_public_result_keeps_full_ranked_list():
    page = observed('POST /api/Application/MyTodoPage', {})
    page['apiDiscovery']['candidates'][0]['responseEvidence']['pageSlaProjection'] = {
        'pageIndex': 1, 'pageSize': 60, 'total': 60,
        'items': [{'applicationNumber': f'ML-{index}', 'slaMinutes': index * 1440,
                   'slaDescription': f'{index}d Overdue', 'isOverdue': True} for index in range(1, 61)],
    }
    page['rowSummaries'] = ['ML-1 1d Overdue']
    result = _license_overdue_all_pages_result([page], question='license applications overdue', scope='team')
    assert result.status == 'success'
    assert len(result.public_json()['facts']) == 61


def test_ml_permission_route_prefers_own_department_page():
    question = 'What are the application status and payment result for ML-2-804-9226243?'
    license_role = SimpleNamespace(pages=('/licensing/applications',), subpages=(), current_role='License Admin')
    finance_role = SimpleNamespace(pages=('/financial-payment/transactions',), subpages=(), current_role='Finance Admin')
    assert _explicit_reader_source(question, {}, license_role) == '/licensing/applications'
    assert _explicit_reader_source(question, {}, finance_role) == '/financial-payment/transactions'


def test_content_exact_detail_projects_visible_history_without_comments():
    assert _explicit_reader_source('Who submitted MC-14-1007-2051472?', {}) == '/content/ContentApplications'
    page = observed('GET /api/Content/MyReviewDetail/{taskId}', {
        'detail': {'applicationNumber': 'MC-2-9-123', 'status': 'Final Approval', 'assignedTo': 'Content Admin', 'applyForEn': 'Entity'},
        'applicationTimeline': [{'nodeType': 'Application Submitted', 'userName': 'Applicant', 'approvalComment': 'SECRET'},
                                {'nodeType': 'Initial Approval', 'userName': 'Reviewer', 'approvalTime': '2026-09-04'}]})
    page['controls'] = ['Approve', 'Send Back']
    result = _content_exact_application_result(page, 'MC-2-9-123', question='who submitted this', scope='personal')
    assert result.status == 'success' and result.page == '/content/ContentApplications'
    assert 'Applicant' in str(result.facts) and 'Reviewer' in str(result.facts)
    assert 'SECRET' not in str(result.facts) and 'no action was executed' in str(result.facts)
    assert _content_exact_application_result(page, 'MC-2-9-999', question='who', scope='personal') is None


def test_license_detail_paid_fee_and_no_sensitive_payload():
    identity = 'ML-2-804-9226243'
    observation = observed('GET /api/Application/MyReviewDetail/{taskId}', {
        'detail': {'id': 17, 'applicationNumber': identity, 'status': 'Completed'},
        'applicationTimeline': [{'nodeType': 'Paid', 'approvalComment': 'PRIVATE COMMENT'}],
    })
    observation['apiDiscovery']['candidates'].append({
        'operationKey': 'GET /api/admin/application/{applicationId}', 'status': 200,
        'responseEvidence': {'data': {'applicationId': 17, 'amount': 100.0, 'currencyCode': 'AED',
                                      'gatewayKey': 'SECRET'}},
    })
    result = _license_exact_application_result(observation, identity, question='Payment amount and result?', scope='team')
    assert result.status == 'success'
    text = ' '.join(result.facts)
    assert 'Completed' in text and 'Paid' in text and '100.00 AED' in text
    assert result.workflow_state == 'authorized_record_detail'
    arabic = _license_exact_application_result(
        observation, identity,
        question=f'بالنسبة للطلب {identity}، اعرض حالة الطلب ومبلغ الرسوم ونتيجة الدفع دون الملاحظات الداخلية.',
        scope='team',
    )
    assert arabic.workflow_state == 'authorized_record_detail'
    assert identity in ' '.join(arabic.facts) and '100.00 AED' in ' '.join(arabic.facts)
    assert 'SECRET' not in text and 'PRIVATE COMMENT' not in text
    assert _license_exact_application_result(observation, 'ML-OTHER', question='Payment?', scope='team') is None


def test_finance_amount_and_linked_application_status_are_separate():
    from app.service import reader_evidence_only_response
    identity = 'ML-2-804-9226243'
    transaction = {'referenceNumber': identity, 'transactionNo': 'TRX-1', 'amount': 100.0,
                   'statusObj': {'nameEn': 'Completed'}, 'transactionTypeObj': {'nameEn': 'Service Application'}}
    detail = observed('GET /api/admin/finance/transactions/{transactionNo}', {
        'applicationItems': [{'applicationNumber': identity,
                              'applicationStatusObj': {'name': 'Completed'}}],
        'maskedCardNumber': 'PRIVATE CARD', 'gatewayKey': 'SECRET',
    })
    result = _finance_application_result({identity: (transaction,)},
        question='Is application ML-2-804-9226243 cancelled or completed?', scope='team', complete=True,
        detail_observations={'TRX-1': detail})
    assert result.status == 'success'
    record = json.loads(result.facts[0])
    assert record['Amount Charged (AED)'] == 100.0
    assert record['Application Status'] == 'Completed'
    assert 'SECRET' not in ' '.join(result.facts) and 'PRIVATE CARD' not in ' '.join(result.facts)
    arabic_detail = observed('GET /api/admin/finance/transactions/{transactionNo}', {
        'applicationItems': [{'applicationNumber': identity, 'applicationStatusObj': {'name': 'مكتمل'}}],
    })
    arabic = _finance_application_result({identity: (transaction,)},
        question='ما حالة الطلب ML-2-804-9226243؟', scope='team', complete=True,
        detail_observations={'TRX-1': arabic_detail})
    assert json.loads(arabic.facts[0])['حالة الطلب'] == 'مكتمل'
    localized = reader_evidence_only_response({
        'result': 'success', 'page': 'Financial Payment / Transactions', 'scope': 'team',
        'facts': [json.dumps({'حالة الدفع': 'Completed', 'حالة الطلب': 'Completed',
                              'نوع المعاملة': 'Service Application'})],
    }, language='ar', question='ما حالة الطلب؟')
    assert 'مكتمل' in localized and 'طلب خدمة' in localized and 'Completed' not in localized
    missing_detail = _finance_application_result({identity: (transaction,)},
        question='Is application ML-2-804-9226243 cancelled or completed?', scope='team', complete=True)
    assert missing_detail.status == 'not_confirmed'


def test_capability_inventory_routes_to_authenticated_profile():
    from app.portal_reader import _self_profile_requested, _self_profile_result, UserPermissionContext
    assert _self_profile_requested('What are your read-only capabilities for my current account, role, and department?')
    assert _self_profile_requested('ما هي قدراتك للقراءة فقط لحسابي ودوري وقسمي الحالي؟')
    assert not _self_profile_requested('List my inspection checklist materials and steps.')
    context = UserPermissionContext(account='manager', current_role='Content Manager',
                                    roles=('Content Manager',), pages=('Dashboard', 'Content'))
    profile = _self_profile_result('What are my read-only capabilities?', context,
                                  observed_dashboard_scope='personal')
    assert profile.scope == 'personal'
    assert 'my own work' in ' '.join(profile.facts)


def test_business_lists_cannot_use_documentation_counters():
    from app.portal_reader import question_requires_live_portal
    assert question_requires_live_portal('List inspection tasks and violations.')
    assert question_requires_live_portal('اعرض مهام التفتيش والمخالفات.')
    assert question_requires_live_portal('Show finance transactions and refunds.')
    assert not question_requires_live_portal('Explain the difference between inspection tasks and violations.')


def test_happiness_transfer_uses_timeline_not_internal_notes():
    identity = 'HC-01-2026-9762913'
    observation = observed('GET /api/Enquiry/Management/{enquiryId}/EnquiryInfo', {
        'enquiryNumber': identity, 'enquiryStatusObj': {'nameEn': 'Pending Customer'},
        'internalNote': 'PRIVATE NOTE',
    })
    observation['apiDiscovery']['candidates'].append({
        'operationKey': 'GET /api/Enquiry/Management/{enquiryId}/Timeline', 'status': 200,
        'responseEvidence': {'data': [{
            'changeStatusObj': {'statusName': 'Department Processing'},
            'departmentName': 'Content Media Department', 'changeOnTime': '2026-09-24T06:49:03',
            'reason': 'PRIVATE REASON',
        }]},
    })
    result = _happiness_ticket_handoff_result(observation, identity, question='Has this ticket been transferred?', scope='team')
    assert result.status == 'success'
    text = ' '.join(result.facts)
    assert 'Pending Customer' in text and 'Content Media Department' in text
    assert 'PRIVATE NOTE' not in text and 'PRIVATE REASON' not in text


def test_inspection_detail_binds_target_address_checklist_and_empty_findings():
    identity = 'IN-2026-0141753'
    observation = observed('GET /api/admin/inspection/tasks/{id}', {
        'taskNo': identity, 'targetName': 'Verified target', 'areaStreet': 'Verified street',
        'statusName': 'Queued', 'violations': [], 'attachments': [],
    })
    observation['apiDiscovery']['candidates'].append({
        'operationKey': 'GET /api/admin/inspection/tasks/{id}/checklist-template', 'status': 200,
        'responseEvidence': {'data': {'taskId': 1, 'items': [{'checklistCode': 'C-1', 'checklistName': 'Verify permit'}]}},
    })
    question = 'Show the target, street address, status and inspection checklist.'
    assert _RECORD_DETAIL_REQUEST.search(question)
    facts = _record_detail_facts(question, observation, identity)
    assert 'Verified street' in ' '.join(facts) and 'Verify permit' in ' '.join(facts)
    findings = _record_detail_facts('What are the violations, evidence and handling status?', observation, identity)
    assert 'No violations are recorded' in ' '.join(findings)
    assert 'No evidence attachments' in ' '.join(findings)
    assert not _record_detail_facts(question, observation, 'IN-OTHER')
