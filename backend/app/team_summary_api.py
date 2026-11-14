"""Complete caller-authorized queue and roster reads for a staff roll-up.

No browser discovery, role override, client-supplied URL, or mutation endpoint.
The roster bounds membership; a tab name never establishes a workflow status.
"""
import hashlib
import json
import httpx
from .ticket_read_api import gather_reads, queue_signature, unwrap
from .turn_http_timing import http_stage


async def read_team_summary(principal, origin, module, *, lookup, transport=None):
    if module != 'customer-happiness' or not principal.umc_token:
        raise PermissionError('team_summary_identity_unavailable')

    async def roster():
        async with httpx.AsyncClient(timeout=15, follow_redirects=False, transport=transport) as client:
            with http_stage('team_summary.roster'):
                response = await client.get(origin.rstrip('/') + f'/api/{module}/team-management/members',
                    headers={'Authorization': 'Bearer ' + principal.umc_token,
                             'X-Request-ID': principal.request_id})
            if response.status_code in {401, 403}:
                raise PermissionError('team_summary_roster_denied')
            if 300 <= response.status_code < 400:
                raise ValueError('team_summary_redirect_forbidden')
            response.raise_for_status()
            if len(response.content) > 2 * 1024 * 1024:
                raise ValueError('team_summary_roster_budget')
            data = unwrap(response.json())
        if not isinstance(data, dict):
            raise ValueError('team_summary_roster_shape')
        batch = data.get('members')
        if not isinstance(batch, list):
            raise ValueError('team_summary_roster_incomplete')
        members = []
        for row in batch:
            if not isinstance(row, dict) or not str(row.get('userName') or '').strip():
                raise ValueError('team_summary_roster_member_invalid')
            members.append({'collection': 'teamMembers', 'label': str(row['userName']).strip(),
                            'key': str(row.get('userId') or row.get('id') or row['userName'])})
        if len({m['key'] for m in members}) != len(members):
            raise ValueError('team_summary_roster_duplicate')
        return members

    async def queues():
        populations = []
        for pass_number in (1, 2):
            async def view(name):
                with http_stage(f'team_summary.{name}.pass{pass_number}'):
                    total, rows = await lookup(principal, origin, module, name, max_rows=5000)
                if total != len(rows) or any(not isinstance(row, dict) for row in rows):
                    raise ValueError('team_summary_population_incomplete')
                return name, rows
            population = dict(await gather_reads(view('todo'), view('completed')))
            populations.append(population)
        if any(queue_signature(populations[0][name]) != queue_signature(populations[1][name])
               for name in populations[0]):
            raise ValueError('team_summary_population_changed')
        return populations[-1]

    members, population = await gather_reads(roster(), queues())
    # Flatten only the typed SLA fields used by the existing verified view
    # adapter. Keep sourceType so Approved appeal/refund are not conflated.
    receipts = {}
    for name, rows in population.items():
        flattened = []
        for row in rows:
            item = dict(row)
            sla = item.get('sla')
            if isinstance(sla, dict):
                for key in ('isOverdue', 'displayText'):
                    if key in sla:
                        item['sla.' + key] = sla[key]
            flattened.append(item)
        receipts[name] = {'rows': flattened, 'total': len(rows), 'stablePasses': 2,
                          'completeness': 'complete', 'operationRef': 'authenticated-team-task-query',
                          'contextRef': name}
    fingerprint = hashlib.sha256(json.dumps({'members': members,
        'queues': {name: queue_signature(rows) for name, rows in population.items()}},
        sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return receipts, {'visibleRecords': members, 'rosterComplete': True}, fingerprint


async def read_overdue_queue(principal, origin, module, *, lookup):
    """Single requested SLA measure; never narrow the queue to a staff roster."""
    if module not in {'customer-happiness', 'content', 'licensing'} or not principal.umc_token:
        raise PermissionError('overdue_queue_identity_unavailable')
    scans = []
    for pass_number in (1, 2):
        with http_stage(f'overdue_queue.todo.pass{pass_number}'):
            total, rows = await lookup(principal, origin, module, 'todo', max_rows=5000)
        identities = [(str(r.get('sourceType') or ''), str(r.get('sourceId') or ''),
                       str(r.get('assignedToUserId') or r.get('assignedTo') or '')) for r in rows]
        if total != len(rows) or any(not r.get('taskNo') for r in rows) or len(set(identities)) != len(rows):
            raise ValueError('overdue_queue_population_incomplete_or_duplicate')
        scans.append((queue_signature(rows), rows))
    if scans[0][0] != scans[1][0]:
        raise ValueError('overdue_queue_population_changed')
    owners = {}
    overdue = missing = unassigned = 0
    for row in scans[-1][1]:
        flag = (row.get('sla') or {}).get('isOverdue')
        if type(flag) is not bool:
            missing += 1
        elif flag:
            overdue += 1
            owner = str(row.get('assignedTo') or '').strip()
            if owner:
                owners[owner] = owners.get(owner, 0) + 1
            else:
                unassigned += 1
    return {'total': total, 'overdue': overdue, 'missingSla': missing,
            'unassignedOverdue': unassigned, 'owners': owners,
            'stablePasses': 2, 'fingerprint': scans[-1][0]}
