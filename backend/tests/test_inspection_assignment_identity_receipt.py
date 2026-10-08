"""Transport-contract fixtures only; live acceptance still uses the browser."""
import asyncio
from test_platform_portal_reader import gateway


def test_team_receipt_retains_assigned_users_not_applicant_identity(monkeypatch):
    rows = [
        dict(taskNo='IN-0001', userId='applicant', assignedUsers=[
            dict(userId='owner-a', userName='Shared name'),
            dict(userId='owner-b', userName='Second owner')], primaryAssignedUserName='Shared name'),
        dict(taskNo='IN-0002', userId='applicant', primaryAssignedUserId='owner-c',
             primaryAssignedUserName='Another name'),
        dict(taskNo='IN-0003', userId='applicant', primaryAssignedUserName='Unknown owner')]
    async def read(page, url, method, parameters):
        result = rows if parameters['view'] == 'todo' else []
        return {'data':{'page':dict(data=result, total=len(result), pageIndex=1, pageSize=100)}}, 200
    monkeypatch.setattr(gateway, '_inspection_rollup_scopes', lambda *_: ('TeamTodo','TeamCompleted'))
    monkeypatch.setattr(gateway, '_page_read_target', lambda *_: 'http://portal.test/native-read')
    monkeypatch.setattr(gateway, '_reader_get_document', read)
    receipt = asyncio.run(gateway._inspection_team_assignments(None, (), 'http://portal.test'))
    assert receipt['verified'] and receipt['stablePasses'] == 2
    assert receipt['tasks']['IN-0001']['inspectorIds'] == ['owner-a','owner-b']
    assert receipt['tasks']['IN-0002']['inspectorIds'] == ['owner-c']
    assert receipt['tasks']['IN-0003']['inspectorIds'] == []
    assert 'applicant' not in str(receipt)
