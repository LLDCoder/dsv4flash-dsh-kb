"""Exact institution binding through authorized task queues, then linked reads."""
import asyncio, re
import httpx
from .ticket_read_api import queue_signature,unwrap,gather_reads
from .turn_http_timing import http_stage

SOURCE_CAPABILITIES = {
    'inspection_history': 'Institution identity/name verified on matched task details, and authorized institution-linked inspection tasks, their identifiers, states and creation dates.',
    'penalty_history': 'Authorized institution-linked violations, penalties, fine amounts and recorded legal-basis fields.',
    'public_contacts': 'Public business contact people and their contact name, position, business email and phone; excludes private identity documents or secrets.',
}

async def read_target(principal,origin,name,*,lookup,read_violations=False,read_contacts=False,number='',transport=None):
    if not principal.umc_token:raise PermissionError('inspection_identity_unavailable')
    scans=[]
    for pass_number in (1,2):
        async def queue(view):
            with http_stage(f'inspection_target.lookup.{view}.pass{pass_number}'):
                total,rows=await lookup(principal,origin,'inspection',view,max_rows=5000)
            if total!=len(rows):raise ValueError('inspection_target_population_incomplete')
            return rows
        todo,completed=await gather_reads(queue('todo'),queue('completed'))
        rows=todo+completed;scans.append((queue_signature(rows),rows))
    if scans[0][0]!=scans[1][0]:raise ValueError('inspection_target_population_changed')
    if number:
        anchors = [r for r in scans[-1][1] if r.get('sourceType') == 'inspectionTask'
                   and str(r.get('taskNo') or '').casefold() == number.casefold()]
        names = {str(r.get('applyFor') or '').strip() for r in anchors}
        if not anchors:
            return {'bound':False, 'stablePasses':2, 'fingerprint':scans[-1][0]}
        if len(names) != 1 or not next(iter(names)):
            raise ValueError('inspection_task_target_binding_invalid')
        derived_name = next(iter(names))
        if name and name.casefold() != derived_name.casefold():
            raise ValueError('inspection_task_target_name_conflict')
        name = derived_name
    matches={str(r.get('sourceId')):r for r in scans[-1][1]
        if r.get('sourceType')=='inspectionTask'and str(r.get('applyFor')or'').strip().casefold()==name.strip().casefold()}
    if not matches:return {'bound':False,'stablePasses':2,'fingerprint':scans[-1][0]}
    if len(matches)>10 or any(not re.fullmatch(r'[1-9]\d*',k)for k in matches):
        raise ValueError('inspection_target_binding_budget_or_identity')
    headers={'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id}
    async with httpx.AsyncClient(timeout=15,follow_redirects=False,transport=transport)as client:
        async def get(path,params=None):
            with http_stage('inspection_target.'+path.rsplit('/',1)[-1]):
                response=await client.get(origin.rstrip('/')+path,headers=headers,params=params)
            if response.status_code in {401,403}:raise PermissionError('inspection_target_read_denied')
            if 300<=response.status_code<400:raise ValueError('inspection_target_redirect_forbidden')
            response.raise_for_status()
            if len(response.content)>2*1024*1024:raise ValueError('inspection_target_response_budget')
            return unwrap(response.json())
        details=await gather_reads(*(get('/api/admin/inspection/tasks/'+source)for source in matches))
        target_keys=set()
        for detail in details:
            if not isinstance(detail,dict)or str(detail.get('targetName')or detail.get('establishmentName')or'').strip().casefold()!=name.strip().casefold():
                raise ValueError('inspection_target_detail_mismatch')
            source=str(detail.get('id')or'')
            if source not in matches or detail.get('taskNo')!=matches[source].get('taskNo'):
                raise ValueError('inspection_target_task_mismatch')
            key=(detail.get('establishmentId'),detail.get('individualId'))
            if not any(key):raise ValueError('inspection_target_entity_missing')
            target_keys.add(key)
        if len(target_keys)!=1:raise ValueError('inspection_target_name_ambiguous')
        anchor=details[0];source=str(anchor['id'])
        async def collection(path):
            params={'taskId':source,'pageIndex':1,'pageSize':100}
            result=await get(path,params)
            if not isinstance(result,dict)or not isinstance(result.get('items'),list):
                raise ValueError('inspection_target_collection_shape')
            total=result.get('totalCount',result.get('total'))
            if type(total)is not int or total>1000:raise ValueError('inspection_target_collection_total')
            items=list(result['items'])
            for page in range(2,(total+99)//100+1):
                other=await get(path,{**params,'pageIndex':page})
                if other.get('totalCount',other.get('total'))!=total:
                    raise ValueError('inspection_target_collection_changed')
                items.extend(other.get('items')or[])
            if len(items)!=total:raise ValueError('inspection_target_collection_incomplete')
            return items
        history=await collection('/api/admin/inspection/tasks/by-target')
        person_batches=await gather_reads(*(get(f'/api/admin/inspection/tasks/{d["id"]}/persons')for d in details))if read_contacts else []
        persons=[];seen_persons=set()
        for batch in person_batches:
            if not isinstance(batch,list):raise ValueError('inspection_target_persons_shape')
            for person in batch:
                if not isinstance(person,dict):raise ValueError('inspection_target_person_shape')
                key=str(person.get('personId')or person.get('name')or '')
                if key not in seen_persons:seen_persons.add(key);persons.append(person)
        violations=await collection('/api/admin/inspection/violations/by-target')if read_violations else None
    return {'bound':True,'anchor':anchor,'matchedDetails':details,'history':history,
        'persons':persons,'violations':violations,'targetName':name,'stablePasses':2,'fingerprint':scans[-1][0]}
