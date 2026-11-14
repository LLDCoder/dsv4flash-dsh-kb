"""Authenticated enquiry detail reads, bound through the caller's task queues.

No browser, user-supplied URL, role override or mutation endpoint. Record numbers
are matched locally to server-returned source IDs before either detail GET.
"""
import asyncio
import hashlib
import json
import re
import httpx
from .turn_http_timing import http_stage

async def gather_reads(*operations):
    """No sibling HTTP read survives a failed or cancelled parent stage."""
    tasks=[asyncio.create_task(operation)for operation in operations]
    try:
        return await asyncio.gather(*tasks)
    finally:
        for task in tasks:
            if not task.done():task.cancel()
        await asyncio.gather(*tasks,return_exceptions=True)


def queue_signature(rows):
    # Remaining minutes change while a read is in flight. Use source identity,
    # ownership, status and update version, not a wall-clock countdown.
    fields=('sourceType','sourceId','taskNo','assignedToUserId','assignedTo',
            'statusCode','status','lastUpdatedOn','applyFor','assignedUsers')
    projected=[{k:r.get(k)for k in fields}for r in rows]
    projected.sort(key=lambda r:(str(r['sourceType']),str(r['sourceId'])))
    return hashlib.sha256(json.dumps(projected,sort_keys=True,ensure_ascii=False).encode()).hexdigest()


def bind_enquiry(rows, number):
    matches={}
    for row in rows:
        if str(row.get('taskNo')or'').casefold()!=number.casefold():continue
        if row.get('sourceType')!='enquiry':
            raise ValueError('ticket_source_type_conflict')
        source=str(row.get('sourceId')or'')
        if not re.fullmatch(r'[1-9]\d*',source):
            raise ValueError('ticket_source_id_invalid')
        matches[source]=row
    if len(matches)>1:raise ValueError('ticket_identity_ambiguous')
    return next(iter(matches),None)


def unwrap(body):
    if (not isinstance(body,dict)or body.get('isSuccess')is False
            or body.get('success')is False or 'data'not in body):
        raise ValueError('ticket_response_envelope_invalid')
    return body['data']


async def read_ticket(principal, origin, number, *, lookup, transport=None):
    if not principal.umc_token:raise PermissionError('ticket_identity_unavailable')
    counts={};populations=[]
    # Two genuinely executed scans, never a hard-coded stablePasses claim.
    for pass_number in (1,2):
        async def view(name):
            with http_stage(f'ticket_api.lookup.{name}.pass{pass_number}'):
                total,rows=await lookup(principal,origin,'customer-happiness',name,max_rows=2000)
            if total!=len(rows):raise ValueError('ticket_lookup_incomplete')
            return name,total,rows
        result=await gather_reads(view('todo'),view('completed'))
        rows=[row for _,_,batch in result for row in batch]
        counts={name:total for name,total,_ in result}
        populations.append((counts,queue_signature(rows),rows))
    if populations[0][:2]!=populations[1][:2]:
        raise ValueError('ticket_lookup_changed')
    source=bind_enquiry(populations[-1][2],number)
    audit={'source':'authenticated_team_task_queues','counts':counts,
           'stablePasses':2,'fingerprint':populations[-1][1],'matched':bool(source)}
    if source is None:return None,None,audit
    headers={'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id}
    async with httpx.AsyncClient(timeout=15,follow_redirects=False,transport=transport)as client:
        async def get(resource):
            path=f'/api/Enquiry/Management/{source}/{resource}'
            with http_stage('ticket_api.'+resource.casefold()):
                response=await client.get(origin.rstrip('/')+path,headers=headers)
            if response.status_code in {401,403}:raise PermissionError('ticket_detail_not_authorized')
            if 300<=response.status_code<400:raise ValueError('ticket_redirect_forbidden')
            response.raise_for_status()
            if len(response.content)>2*1024*1024:raise ValueError('ticket_response_budget_exceeded')
            return unwrap(response.json())
        info,timeline=await gather_reads(get('EnquiryInfo'),get('Timeline'))
    if (not isinstance(info,dict)or str(info.get('enquiryNumber')or'').casefold()!=number.casefold()
            or not isinstance(timeline,list)or any(not isinstance(x,dict)for x in timeline)):
        raise ValueError('ticket_detail_binding_invalid')
    audit['sourceId']=source
    return info,timeline,audit
