"""Application-object routing must beat generic task words and old context."""

import pytest

from app.portal_reader import (_explicit_reader_source, _application_review_list_requested,
    _observed_application_review_collection, _application_review_collection_result)

ARABIC_REVIEW_VARIANTS = [
    'أرجو سرد قائمة بطلبات المحتوى التي لا تزال قيد المراجعة، مع ذكر أرقام هذه الطلبات.',
    'أدرج طلبات المحتوى التي أراها والتي لا تزال قيد المراجعة، بما في ذلك أرقام الطلبات الخاصة بها.',
    'ارجو سرد طلبات الترخيص قيد المراجعة مع ارقام الطلبات.',
    'ادرج قائمة طلبات المحتوى قيد المراجعة.',
]


@pytest.mark.parametrize('previous_page', [
    '/licensing/licenses', '/happiness/team-management', '/content/team-management',
])
@pytest.mark.parametrize('question', [
    'List the Content applications I can see that are pending review, including their application numbers.',
    'اعرض طلبات قسم المحتوى التي يمكنني الاطلاع عليها والتي لا تزال قيد المراجعة، مع أرقام الطلبات.',
    'Show pending applications in Content.',
    '列出内容部门的待审核申请。',
])
def test_current_application_department_overrides_previous_module(question, previous_page):
    assert _explicit_reader_source(question, {
        'currentPage': '/dashboard', 'previousIntent': {'page': previous_page},
    }) == '/content/ContentApplications'


@pytest.mark.parametrize('question, expected', [
    ('Summarize Content review tasks by status and priority.', '/content/team-management'),
    ('List all license applications currently pending review.', '/licensing/applications'),
    ('قم بسرد طلبات الترخيص التي لا تزال قيد المراجعة.', '/licensing/applications'),
    ('Show books in the Content Library.', '/content/ContentLibrary'),
    ('Show the recorded violations for IN-2026-1234567 in Content.', '/inspection/tasks'),
])
def test_distinct_objects_do_not_change_source(question, expected):
    assert _explicit_reader_source(question, {}) == expected


def review_fixture():
    import hashlib
    operation = 'POST /api/Content/MyTodoPage'
    rows = [dict(taskId='t1', applicationNumber='APP-A', status='Final Approval'),
            dict(taskId='t2', applicationNumber='APP-B', status='Pending Modification'),
            dict(taskId='t3', applicationNumber='APP-C', status='External Approval'),
            dict(taskId='t4', applicationNumber='APP-A', status='Disposition Verification')]
    context = dict(contextRef='a'*64, requestFields=['pageIndex','pageSize','approvalStatus','startTime','endTime'],
        parameterHashes={key: hashlib.sha256(b'null').hexdigest() for key in ('approvalStatus','startTime','endTime')},
        rowSchemas=[dict(path='/data/page/items',fields=['taskId','applicationNumber','status'])])
    observation = {'apiDiscovery': {'candidates': [dict(operationKey=operation, status=200,
        collectionContext=context, responseEvidence={'data': {'statusCount': dict(todoCount=4,
            pendingReviewCount=2, pendingModificationCount=1, externalApproveCount=1)}})]}}
    receipt = dict(completeness='complete', stablePasses=2, operationRef=operation, contextRef='a'*64, total=4, rows=rows)
    return observation, receipt


@pytest.mark.parametrize('question', [
    'List the Content applications I can see that are pending review, including their application numbers.',
    'اعرض طلبات قسم المحتوى التي يمكنني الاطلاع عليها والتي لا تزال قيد المراجعة، مع أرقام الطلبات.',
])
def test_review_aggregate_uses_full_scan_and_distinguishes_tasks_from_applications(question):
    observation, receipt = review_fixture()
    assert _application_review_list_requested(question)
    spec = _observed_application_review_collection(observation, '/content/ContentApplications')
    assert spec['identityFields'] == ['taskId']
    result = _application_review_collection_result(receipt, observation, question=question, page='/content/ContentApplications')
    assert result.status == 'success' and result.completeness == 'complete'
    assert '2' in result.facts[0] and '1' in result.facts[0]
    assert result.facts[-1] == 'APP-A'
    assert 'APP-B' not in str(result.facts) and 'APP-C' not in str(result.facts)


@pytest.mark.parametrize('mutation', ['incomplete','changed_count','wrong_source','missing_state','duplicate_task'])
def test_review_list_does_not_guess_when_scan_or_category_is_unverified(mutation):
    observation, receipt = review_fixture()
    if mutation == 'incomplete': receipt['completeness'] = 'incomplete'
    if mutation == 'changed_count': observation['apiDiscovery']['candidates'][0]['responseEvidence']['data']['statusCount']['pendingReviewCount'] = 3
    if mutation == 'wrong_source': receipt['operationRef'] = 'POST /api/Application/MyTodoPage'
    if mutation == 'missing_state': receipt['rows'][0]['status'] = ''
    if mutation == 'duplicate_task': receipt['rows'][1]['taskId'] = 't1'
    result = _application_review_collection_result(receipt, observation, question='List pending review applications', page='/content/ContentApplications')
    assert result.status == 'not_confirmed' and not result.facts


@pytest.mark.parametrize('extra', ['keyword','processInstanceStatus','serviceCodes'])
def test_default_review_category_never_discards_captured_filters(extra):
    observation, _ = review_fixture()
    observation['apiDiscovery']['candidates'][0]['collectionContext']['requestFields'].append(extra)
    assert _observed_application_review_collection(observation, '/content/ContentApplications') is None


@pytest.mark.parametrize('question', [
    'List pending review applications submitted today.',
    'List pending review applications in my team, with applicant names.',
    'اعرض طلبات قيد المراجعة اليوم.',
    'List Content applications pending review for Alice.',
    'List Content applications pending review with their fee amounts.',
    'List Content applications not pending review.',
    'اعرض طلبات قسم المحتوى قيد المراجعة الخاصة بالموظف عمر.',
])
def test_additional_requirements_are_not_lost_to_simple_category_projection(question):
    assert not _application_review_list_requested(question)


@pytest.mark.parametrize('question', [
    'List the Content applications I can see that are pending review, including their application numbers.',
    'اعرض طلبات قسم المحتوى التي يمكنني الاطلاع عليها والتي لا تزال قيد المراجعة، مع أرقام الطلبات.',
])
def test_runtime_reauthorizes_current_module_and_executes_collection(question):
    from test_admin_portal_reader import Gateway, Planner, run_reader, user_info_for_paths
    observation, receipt = review_fixture()
    class QueueGateway(Gateway):
        async def invoke(self, principal, name, arguments, *, allowed_tools=None):
            if name != 'admin.portal.read':
                return await super().invoke(principal, name, arguments, allowed_tools=allowed_tools)
            self.events.append(name)
            self.calls.append((name, arguments, allowed_tools))
            return {'ok': True, 'result': {'observation':
                {'collections': [receipt]} if arguments.get('collections') else observation}}
    gateway = QueueGateway(info={'ok': True, 'result': user_info_for_paths('/content/ContentApplications')})
    result = run_reader(gateway, Planner(), question=question,
        conversation_context={'previousIntent': {'page': '/licensing/licenses', 'resultStatus': 'no_permission'}})
    assert result.result.status == 'success'
    assert result.result.page == '/content/ContentApplications'
    assert gateway.events[0] == 'GetUserInfo'
    reads = [arguments for name, arguments, _ in gateway.calls if name == 'admin.portal.read']
    assert len(reads) == 2 and reads[-1]['collections'][0]['identityFields'] == ['taskId']
    assert all(read['startPath'] == '/content/ContentApplications' for read in reads)


def test_current_module_permission_is_not_inherited_from_old_success():
    from test_admin_portal_reader import Gateway, Planner, run_reader, user_info_for_paths
    gateway = Gateway(info={'ok': True, 'result': user_info_for_paths('/dashboard')})
    result = run_reader(gateway, Planner(), question='List Content applications pending review.',
        conversation_context={'previousIntent': {'page': '/content/ContentApplications', 'resultStatus': 'success'}})
    assert result.result.status == 'no_permission'
    assert not any(name == 'admin.portal.read' for name, _, _ in gateway.calls)


@pytest.mark.parametrize('question', ARABIC_REVIEW_VARIANTS)
def test_arabic_request_and_possessive_variants_share_verified_collection(question):
    assert _application_review_list_requested(question)
    test_review_aggregate_uses_full_scan_and_distinguishes_tasks_from_applications(question)
    if 'المحتوى' in question:
        test_runtime_reauthorizes_current_module_and_executes_collection(question)


@pytest.mark.parametrize('suffix', [' اليوم', ' للموظف عمر', ' مع أسماء المتقدمين',
    ' مع رسوم الطلبات', ' باستثناء الطلبات الملغاة', ' بتاريخ 2026-10-07'])
@pytest.mark.parametrize('question', ARABIC_REVIEW_VARIANTS[:2])
def test_arabic_variants_preserve_additional_predicates(question, suffix):
    assert not _application_review_list_requested(question + suffix)
