"""Exact personal-queue application reads inside the existing Reader.

The application number binds a caller-authorized task, which binds the detail
and its fee. This adapter never uses a team task to expand personal access.
"""
import re
from urllib.parse import quote
import httpx
from .ticket_read_api import gather_reads,unwrap
from .turn_http_timing import http_stage

_FIELDS=set('current license licence licensing application workflow request processing lifecycle decision approval final review outcome result status state stage fee fees service payment paid amount actual settled complete completion handler assignee assigned responsible person sla agreement level number identifier id details the of and for to be'.split())
_IDENTITY_FILTER=set('application license licensing number identifier id exact equals is for the matching'.split())

def candidate(task,question):
    if (task is None or not task.readOnly or not task.needsLiveData
            or task.requestKind!='business_read' or task.presentationMode!='none'
            or task.requestedScope not in {'unknown','personal'}
            or task.groupBy or task.requestedOrdering or task.timeField
            or task.outputLimit is not None or task.subjectBindings
            or task.timeRange.casefold()not in {'','current','now','unknown','unspecified'}):return ''
    number=str(task.recordIdentity or '')
    if not re.fullmatch(r'ML-\d+-\d+-\d+',number,re.I):return ''
    identities=set(re.findall(r'\b[A-Z]{2,}-\d[\w-]*',question,re.I))
    if len(identities)!=1 or number.casefold()not in {v.casefold()for v in identities}:return ''
    fields=[*task.requestedAttributes,*task.requestedMeasures]
    if not fields or any(set(re.findall(r'[a-z]+',field.casefold()))-_FIELDS for field in fields):return ''
    for predicate in task.filters:
        rest=re.sub(re.escape(number),'',predicate,flags=re.I)
        if re.search(r'\d',rest)or set(re.findall(r'[a-z]+',rest.casefold()))-_IDENTITY_FILTER:return ''
    return number

async def read_exact(principal,origin,number,*,transport=None):
    if not principal.umc_token or not re.fullmatch(r'ML-\d+-\d+-\d+',number,re.I):
        raise PermissionError('license_detail_bound_identity_required')
    base=origin.rstrip('/');headers={'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id}
    async with httpx.AsyncClient(timeout=15,follow_redirects=False,transport=transport)as client:
        async def read(method,path,stage,body=None):
            with http_stage(stage):
                response=await client.request(method,base+path,headers=headers,**({'json':body}if body is not None else{}))
            if response.status_code in {401,403}:raise PermissionError('license_detail_source_denied')
            if 300<=response.status_code<400:raise ValueError('license_detail_redirect_forbidden')
            response.raise_for_status()
            if len(response.content)>2*1024*1024:raise ValueError('license_detail_response_budget')
            return unwrap(response.json())
        async def queue(path):
            rows=[];total=None
            for index in range(1,4):
                data=await read('POST',path,'license_detail.exact_queue',{'Keyword':number,'PageIndex':index,'PageSize':20})
                page=data.get('page')if isinstance(data,dict)else None
                if not isinstance(page,dict)or type(page.get('total'))is not int or page['total']<0 or not isinstance(page.get('items'),list):
                    raise ValueError('license_detail_queue_contract_invalid')
                batch=page['items']
                if any(not isinstance(r,dict)for r in batch)or len(batch)>20 or page.get('pageIndex',index)!=index or page.get('pageSize',20)!=20:
                    raise ValueError('license_detail_queue_page_invalid')
                if total is not None and total!=page['total']:raise ValueError('license_detail_queue_changed')
                total=page['total'];rows.extend(batch)
                if len(rows)>=total:break
            if len(rows)!=total:raise ValueError('license_detail_queue_incomplete')
            return [r for r in rows if str(r.get('applicationNumber')or'').casefold()==number.casefold()]
        matches=await gather_reads(queue('/api/Application/MyTodoPage'),queue('/api/Application/MyComplatedPage'))
        refs={str(r.get('taskId')or'')for batch in matches for r in batch}
        if len(refs)!=1 or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}',next(iter(refs),'')):
            return {'bound':False,'reason':'personal_application_identity_unverified','portalReadCount':0}
        task_id=next(iter(refs));data=await read('GET','/api/Application/MyReviewDetail/'+quote(task_id,safe=''),'license_detail.bound_detail')
        detail=data.get('detail')if isinstance(data,dict)else None
        if (not isinstance(detail,dict)or detail.get('taskId')!=task_id
                or str(detail.get('applicationNumber')or'').casefold()!=number.casefold()):
            raise ValueError('license_detail_identity_mismatch')
        app_id=detail.get('id')
        if type(app_id)not in {int,str}or not re.fullmatch(r'[1-9]\d{0,11}',str(app_id)):
            raise ValueError('license_detail_application_reference_missing')
        projected={'detail':{k:detail[k]for k in ['id','taskId','applicationNumber','status','taskStatus','assignedTo','slaDescription']if k in detail},
            'applicationTimeline':[{k:row.get(k)for k in ['nodeType','title','approvalResult']}for row in data.get('applicationTimeline',[])if isinstance(row,dict)]}
        candidates=[{'operationKey':'GET /api/Application/MyReviewDetail/{taskId}','status':200,'responseEvidence':{'data':projected}}]
        missing=[]
        try:
            fee=await read('GET','/api/admin/application/'+str(app_id),'license_detail.bound_service_fee')
            if not isinstance(fee,dict)or str(fee.get('applicationId'))!=str(app_id):raise ValueError('license_detail_fee_identity_mismatch')
            fee={k:fee[k]for k in ['applicationId','amount','currencyCode']if k in fee}
            candidates.append({'operationKey':'GET /api/admin/application/{applicationId}','status':200,'responseEvidence':{'data':fee}})
        except (PermissionError,httpx.HTTPError,ValueError):
            missing.append('bound_service_fee_not_verified')
        return {'bound':True,'number':number,'scope':'personal','portalReadCount':0,
            'observation':{'apiDiscovery':{'candidates':candidates},'controls':[]},'missing':missing}
