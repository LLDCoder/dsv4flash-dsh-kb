"""Caller-authorized Content application lookup -> bound task detail.

No Content Library search or other module is used as a substitute. Raw forms,
analysis, private notes, attachments and business mutation controls are dropped.
"""
import re
from urllib.parse import quote
import httpx
from .ticket_read_api import gather_reads,unwrap
from .turn_http_timing import http_stage

CAPABILITIES={
 'application_reference':'The exact Content application number already bound to the source detail.',
 'application_state':'Current application workflow state returned by the exact Content detail.',
 'submitter':'The person recorded by the Application Submitted timeline event, never the Apply For applicant or current handler.',
 'beneficiary_entity':'The specifically requested beneficiary/business entity (institution/company/establishment) named by Apply For. Only select this for an explicit entity/beneficiary qualification in the original question. A generic applicant/requester/party role without such a qualification belongs to application_party, not to this capability. This entity is not proof of who submitted the application.',
 'application_party':'An ambiguous application-party identity with no distinction between the applicant/beneficiary entity and the person who actually submitted. Resolve neither silently: return BOTH separately labelled applicant and recorded submitter from their independent source fields. Use this for generic party/applicant wording without an entity/beneficiary qualifier; a request explicitly about who performed submission is submitter, and one explicitly about the business entity/beneficiary is applicant. This ambiguity contract applies in every language.',
 'current_handler':'The currently assigned handler display name, not proof of a previous handler.',
 'history':'Recorded application timeline events with the supplied handler names and approval times only.',
 'sla':'The exact application detail SLA display; no unrelated task or computed deadline.',
 'next_action':'A next workflow action only if verified by rendered controls; native detail alone cannot establish it.'}
CAPABILITIES['source_verification']='Provenance that this exact application and returned history were bound to authorized source data. Not a separate business approval, review or audit status.'

def candidate(task,question):
    if (task is None or not task.readOnly or not task.needsLiveData or task.requestKind!='business_read'
            or task.presentationMode!='none' or task.requestBoundaries
            or task.groupBy or task.requestedOrdering or task.timeField or task.outputLimit is not None
            or task.subjectBindings or task.requestedMeasures
            or task.timeRange.casefold()not in {'','current','now','unknown','unspecified'}):return ''
    number=str(task.recordIdentity or'')
    if not re.fullmatch(r'MC-\d+(?:-\d+)+',number,re.I):return ''
    identities=set(re.findall(r'(?<![A-Za-z0-9_-])[A-Z]{2,3}-\d+(?:-\d+)+',question,re.I))
    if identities:
        if {x.casefold()for x in identities}!={number.casefold()}:return ''
    elif getattr(task,'contextRelation','new') not in {'continue','refine'}:
        return ''
    for condition in task.filters:
        rest=re.sub(re.escape(number),'',condition,flags=re.I)
        if re.search(r'\d',rest)or set(re.findall(r'[a-z]+',rest.casefold()))-set('content application applications request requests number numbers identifier identifiers id exact equals is for the matching'.split()):return ''
    return number

async def read_exact(principal,origin,number,*,transport=None):
    if not principal.umc_token:raise PermissionError('content_identity_unavailable')
    if not re.fullmatch(r'MC-\d+(?:-\d+)+',number,re.I):raise ValueError('content_reference_invalid')
    headers={'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id}
    async with httpx.AsyncClient(timeout=12,follow_redirects=False,transport=transport)as client:
        async def read(method,path,body=None):
            with http_stage('content_api.'+('bound_detail'if method=='GET'else'exact_queue')):
                response=await client.request(method,origin.rstrip('/')+path,headers=headers,**({'json':body}if body is not None else{}))
            if response.status_code in {401,403}:raise PermissionError('content_read_denied')
            if 300<=response.status_code<400:raise ValueError('content_redirect_forbidden')
            response.raise_for_status()
            if len(response.content)>2*1024*1024:raise ValueError('content_response_budget')
            return unwrap(response.json())
        async def queue(path):
            rows=[];total=None
            for index in range(1,4):
                data=await read('POST',path,{'Keyword':number,'PageIndex':index,'PageSize':20})
                page=data.get('page')if isinstance(data,dict)else None
                if (not isinstance(page,dict)or type(page.get('total'))is not int or not 0<=page['total']<=60
                        or not isinstance(page.get('items'),list)or page.get('pageIndex',index)!=index
                        or page.get('pageSize',20)!=20 or total is not None and page['total']!=total):
                    raise ValueError('content_queue_incomplete')
                total=page['total'];rows.extend(page['items'])
                if len(rows)>=total:break
            if len(rows)!=total or any(not isinstance(row,dict)for row in rows):raise ValueError('content_queue_incomplete')
            return [row for row in rows if str(row.get('applicationNumber')or'').casefold()==number.casefold()]
        batches=await gather_reads(queue('/api/Content/MyTodoPage'),queue('/api/Content/MyComplatedPage'))
        ids={str(row.get('taskId')or'')for batch in batches for row in batch}
        if len(ids)!=1:return {'bound':False,'reason':'content_reference_not_uniquely_bound'}
        task_id=next(iter(ids))
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}',task_id):raise ValueError('content_task_identity_invalid')
        data=await read('GET','/api/Content/MyReviewDetail/'+quote(task_id,safe=''))
        detail=data.get('detail')if isinstance(data,dict)else None
        if (not isinstance(detail,dict)or detail.get('taskId')!=task_id
                or str(detail.get('applicationNumber')or'').casefold()!=number.casefold()):
            raise ValueError('content_detail_identity_mismatch')
        safe={'detail':{k:detail[k]for k in ['taskId','applicationNumber','status','taskStatus','assignedTo','applyForEn','applyForAr','slaDescription']if k in detail}}
        if isinstance(data.get('applicationTimeline'),list):
            safe['applicationTimeline']=[{k:row[k]for k in ['nodeType','title','userName','approvalTime','approvalResult']if k in row}
                for row in data['applicationTimeline']if isinstance(row,dict)]
        observation={'controls':[],'apiDiscovery':{'candidates':[{'operationKey':'GET /api/Content/MyReviewDetail/{taskId}',
            'status':200,'responseEvidence':{'data':safe}}]}}
        return {'bound':True,'scope':'personal','portalReadCount':0,'observation':observation}
