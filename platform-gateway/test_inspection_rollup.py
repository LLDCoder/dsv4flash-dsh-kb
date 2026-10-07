import asyncio
from datetime import date
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import app


def test_inspection_rollup_reads_all_permitted_scopes_twice(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', (
        {'method': 'GET', 'path': '/api/admin/inspection/tasks'},
        {'method': 'POST', 'path': '/api/inspection/team-management/tasks/query'},
    ))
    calls = []

    async def read_page(_page, url, **_kwargs):
        query = parse_qs(urlsplit(url).query)
        calls.append(query)
        assert query["createAtFrom"] == ["2026-09-10T00:00:00"]
        assert query["createAtTo"] == ["2026-09-10T23:59:59"]
        scope = query["scope"][0]
        return {"data": {"items": [], "totalCount": 0,
                         "pageIndex": 1, "pageSize": 25}}, 200

    async def read_page_with_team(_page, url, **kwargs):
        if kwargs.get('method') == 'POST':
            params = kwargs['parameters']
            calls.append(params)
            assert params['createdOnFrom'] == '2026-09-10T00:00:00'
            assert params['taskMode'] == 'inspectionTasks'
            rows = ([{'taskNo': 'IN-2026-2202528', 'primaryAssignedUserName': 'Yuye Wang',
                      'statusCode': 'PENDING_VISIT', 'dueDate': '2026-09-28',
                      'createdOn': '2026-09-10T17:47:43'}]
                    if params['view'] == 'todo' else [])
            return {'data': {'page': {'data': rows, 'total': len(rows),
                                     'pageIndex': 1, 'pageSize': 25}}}, 200
        return await read_page(_page, url, **kwargs)

    monkeypatch.setattr(app, "_reader_get_document", read_page_with_team)
    receipt = asyncio.run(app._inspection_task_rollup(
        SimpleNamespace(), date(2026, 9, 10),
        ("Inspection.TaskManagement.Queued", "Inspection.TaskManagement.TeamTasks"),
        "http://portal.test",
    ))
    assert receipt["verified"] is True
    assert receipt["total"] == 1
    assert receipt["byInspector"]["Yuye Wang"]["tasks"] == 1
    assert receipt["pagesRead"] == 6
    assert len(calls) == 6


def test_inspection_rollup_rejects_ignored_date_filter(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', ({'method': 'GET', 'path': '/api/admin/inspection/tasks'},))
    async def read_page(_page, _url, **_kwargs):
        return {"data": {"items": [{
            "taskNo": "IN-OLDER", "createdOn": "2026-09-09T12:00:00",
            "statusName": "Queued",
        }], "totalCount": 1, "pageIndex": 1, "pageSize": 25}}, 200

    monkeypatch.setattr(app, "_reader_get_document", read_page)
    try:
        asyncio.run(app._inspection_task_rollup(
            SimpleNamespace(), date(2026, 9, 10),
            ("Inspection.TaskManagement.Queued",), "http://portal.test",
        ))
    except ValueError as exc:
        assert str(exc).startswith("inspection_rollup_filter_not_applied:Queued:createdOn:")
    else:
        raise AssertionError("ignored creation-date filter was accepted")


def test_team_rollup_excludes_queued_scope(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', (
        {'method': 'GET', 'path': '/api/admin/inspection/tasks'},
        {'method': 'POST', 'path': '/api/inspection/team-management/tasks/query'},
    ))
    observed_scopes = []

    async def read_page(_page, _url, **kwargs):
        assert kwargs['method'] == 'POST'
        observed_scopes.append(kwargs['parameters']['view'])
        return {'data': {'page': {'data': [], 'total': 0,
                                 'pageIndex': 1, 'pageSize': 25}}}, 200

    monkeypatch.setattr(app, '_reader_get_document', read_page)
    receipt = asyncio.run(app._inspection_task_rollup(
        SimpleNamespace(), date(2026, 9, 10),
        ('Inspection.TaskManagement.Queued', 'Inspection.TaskManagement.TeamTasks'),
        'http://portal.test', 'team',
    ))
    assert receipt['verified'] is True and receipt['view'] == 'team'
    assert receipt['sourceOperation'] == 'POST /api/inspection/team-management/tasks/query'
    assert observed_scopes == ['todo', 'completed', 'todo', 'completed']


def test_team_completed_tab_does_not_count_cancelled_as_completed(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', (
        {'method': 'POST', 'path': '/api/inspection/team-management/tasks/query'},
    ))

    async def read_page(_page, _url, **kwargs):
        rows = ([{'taskNo': 'IN-CANCELLED', 'primaryAssignedUserName': 'Inspector Staff',
                 'statusCode': 'CANCELLED', 'dueDate': '2026-09-01',
                 'createdOn': '2026-09-10T09:00:00'},
                {'taskNo': 'IN-COMPLETED', 'primaryAssignedUserName': 'Inspector Staff',
                 'statusCode': 'COMPLETED', 'dueDate': '2026-09-01',
                 'createdOn': '2026-09-10T09:00:00'}]
                if kwargs['parameters']['view'] == 'completed' else [])
        return {'data': {'page': {'data': rows, 'total': len(rows),
                                 'pageIndex': 1, 'pageSize': 25}}}, 200

    monkeypatch.setattr(app, '_reader_get_document', read_page)
    receipt = asyncio.run(app._inspection_task_rollup(
        SimpleNamespace(), date(2026, 9, 10),
        ('Inspection.TaskManagement.TeamTasks',), 'http://portal.test', 'team',
    ))
    assert receipt['total'] == 2
    assert receipt['byInspector']['Inspector Staff'] == {
        'tasks': 2, 'overdue': 0, 'completed': 1,
    }


def test_inspection_date_list_returns_only_stable_observed_sort_fields(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', ({'method': 'GET', 'path': '/api/admin/inspection/tasks'},))

    async def read_page(_page, _url, **_kwargs):
        rows = [
            {'taskNo': 'IN-2', 'createdOn': '2026-08-29T14:15:21', 'areaName': 'FELEYYAH',
             'statusName': 'Queued'},
            {'taskNo': 'IN-1', 'createdOn': '2026-08-29T14:15:18', 'areaName': 'Helio 1',
             'statusName': 'Queued'},
        ]
        return {'data': {'items': rows, 'totalCount': 2,
                         'pageIndex': 1, 'pageSize': 25}}, 200

    monkeypatch.setattr(app, '_reader_get_document', read_page)
    receipt = asyncio.run(app._inspection_task_rollup(
        SimpleNamespace(), date(2026, 8, 29),
        ('Inspection.TaskManagement.Queued',), 'http://portal.test', 'all', True,
    ))
    assert receipt['sortFieldsComplete'] is True
    assert [item['taskNo'] for item in receipt['tasks']] == ['IN-1', 'IN-2']
    assert [item['area'] for item in receipt['tasks']] == ['Helio 1', 'FELEYYAH']


def test_today_due_date_uses_native_due_filter_and_keeps_real_rows(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', (
        {'method': 'GET', 'path': '/api/admin/inspection/tasks'},
        {'method': 'POST', 'path': '/api/inspection/team-management/tasks/query'},
    ))
    calls = []

    async def read_page(_page, url, **kwargs):
        if kwargs.get('method') == 'POST':
            params = kwargs['parameters']
            calls.append(params)
            assert params['dueDateFrom'] == '2026-10-04T00:00:00'
            assert 'createdOnFrom' not in params
            rows = ([{'taskNo': 'IN-TEAM',
                      'primaryAssignedUserName': 'Inspector Staff', 'statusCode': 'PENDING_VISIT',
                      'dueDate': '2026-10-04', 'assignedTime': '2026-09-04T17:00:00'}]
                    if params['view'] == 'todo' else [])
            return {'data': {'page': {'data': rows, 'total': len(rows),
                                     'pageIndex': 1, 'pageSize': 25}}}, 200
        query = parse_qs(urlsplit(url).query)
        calls.append(query)
        assert query['dueDateFrom'] == ['2026-10-04T00:00:00']
        assert 'createAtFrom' not in query
        rows = [{'taskNo': 'IN-QUEUE', 'createdOn': '2026-09-04T16:00:00',
                 'statusName': 'Queued', 'dueDate': '2026-10-04', 'areaName': 'Dubai'}]
        return {'data': {'items': rows, 'totalCount': 1,
                         'pageIndex': 1, 'pageSize': 25}}, 200

    monkeypatch.setattr(app, '_reader_get_document', read_page)
    receipt = asyncio.run(app._inspection_task_rollup(
        SimpleNamespace(), date(2026, 10, 4),
        ('Inspection.TaskManagement.Queued', 'Inspection.TaskManagement.TeamTasks'),
        'http://portal.test', 'all', True, 'dueDate',
    ))
    assert receipt['dateField'] == 'dueDate'
    assert receipt['sortFieldsComplete'] is True
    assert next(row for row in receipt['tasks'] if row['taskNo'] == 'IN-TEAM')['timeField'] == 'Assigned Time'
    assert receipt['total'] == 2 and receipt['stablePasses'] == 2
    assert [item['taskNo'] for item in receipt['tasks']] == ['IN-QUEUE', 'IN-TEAM']
    assert len(calls) == 6


def test_today_observed_time_uses_creation_and_assignment_filters(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', (
        {'method': 'GET', 'path': '/api/admin/inspection/tasks'},
        {'method': 'POST', 'path': '/api/inspection/team-management/tasks/query'},
    ))

    async def read_page(_page, url, **kwargs):
        if kwargs.get('method') == 'POST':
            params = kwargs['parameters']
            assert params['assignedTimeFrom'] == '2026-09-04T00:00:00'
            assert 'createdOnFrom' not in params
            rows = ([{'taskNo': 'IN-TEAM', 'primaryAssignedUserName': 'Inspector Staff',
                      'statusCode': 'PENDING_VISIT', 'assignedTime': '2026-09-04T17:00:00',
                      'areaDisplay': 'Zayed City'}] if params['view'] == 'todo' else [])
            return {'data': {'page': {'data': rows, 'total': len(rows),
                                     'pageIndex': 1, 'pageSize': 25}}}, 200
        query = parse_qs(urlsplit(url).query)
        assert query['createAtFrom'] == ['2026-09-04T00:00:00']
        rows = [{'taskNo': 'IN-QUEUE', 'createdOn': '2026-09-04T16:00:00',
                 'statusName': 'Queued', 'areaName': 'Dubai'}]
        return {'data': {'items': rows, 'totalCount': 1,
                         'pageIndex': 1, 'pageSize': 25}}, 200

    monkeypatch.setattr(app, '_reader_get_document', read_page)
    receipt = asyncio.run(app._inspection_task_rollup(
        SimpleNamespace(), date(2026, 9, 4),
        ('Inspection.TaskManagement.Queued', 'Inspection.TaskManagement.TeamTasks'),
        'http://portal.test', 'all', True, 'observedTime',
    ))
    assert receipt['verified'] is True and receipt['dateField'] == 'observedTime'
    assert receipt['total'] == 2 and receipt['stablePasses'] == 2
    assert [item['timeField'] for item in receipt['tasks']] == ['Creation Time', 'Assigned Time']


def test_team_assignments_read_all_pages_without_inventing_routes(monkeypatch):
    monkeypatch.setattr(app, 'READER_OPERATION_CATALOG', (
        {'method': 'POST', 'path': '/api/inspection/team-management/tasks/query'},
    ))
    calls = []

    async def read_page(_page, _url, **kwargs):
        params = kwargs['parameters']
        assert kwargs['method'] == 'POST' and 'dueDateFrom' not in params
        calls.append((params['view'], params['pageIndex']))
        if params['view'] == 'todo' and params['pageIndex'] == 1:
            rows = [{'taskNo': f'IN-{index}', 'primaryAssignedUserName': 'Inspector Staff',
                     'areaDisplay': 'Area A'} for index in range(100)]
            total = 101
        elif params['view'] == 'todo':
            rows, total = [{'taskNo': 'IN-100', 'primaryAssignedUserName': 'Yuye Wang',
                            'routeName': 'Verified Route'}], 101
        else:
            rows, total = [], 0
        return {'data': {'page': {'data': rows, 'total': total,
                                 'pageIndex': params['pageIndex'], 'pageSize': 100}}}, 200

    monkeypatch.setattr(app, '_reader_get_document', read_page)
    receipt = asyncio.run(app._inspection_team_assignments(
        SimpleNamespace(), ('Inspection.TaskManagement.TeamTasks',), 'http://portal.test'))
    assert receipt['verified'] is True and receipt['total'] == 101
    assert receipt['tasks']['IN-0']['route'] == ''  # Area must not become a route.
    assert receipt['tasks']['IN-100']['route'] == 'Verified Route'
    assert receipt['pagesRead'] == 6
    assert calls == [('todo', 1), ('todo', 2), ('completed', 1)] * 2
