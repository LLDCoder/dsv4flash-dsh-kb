"""Exact-reference Finance reads, bounded to the authenticated collection.

The source may ignore a keyword filter. Collect and verify every page, then
match references locally. Only payment fields survive the projection. No
applicant account/contact data, dynamic URL or write operation is accepted.
"""
import hashlib,json,re
import httpx
from .ticket_read_api import unwrap,gather_reads
from .turn_http_timing import http_stage

PAGE_SIZE=100
MAX_ROWS=2000
FIELDS=('transactionNo','referenceNumber','amount','currency','statusObj','status',
        'transactionTypeObj','transactionType')

def candidate(task, identities):
    return bool(task and task.readOnly and task.needsLiveData
                and task.requestKind=='business_read' and not task.requestBoundaries
                and 1<=len(identities)<=5 and not task.filters and not task.rowConditions
                and not task.timeField and task.timeRange in {'','current'}
                and not task.requestedOrdering and task.outputLimit is None
                and not task.groupBy and not task.requestedMeasures)

def project(row):
    if not isinstance(row,dict):raise ValueError('finance_row_invalid')
    number=row.get('transactionNo');reference=row.get('referenceNumber')
    if (not isinstance(number,str)or not re.fullmatch(r'[A-Za-z0-9_-]{1,120}',number)
            or not isinstance(reference,str)or len(reference)>120):
        raise ValueError('finance_identity_invalid')
    result={key:row[key]for key in FIELDS if key in row}
    for key in ('statusObj','transactionTypeObj'):
        if isinstance(result.get(key),dict):
            result[key]={k:v for k,v in result[key].items()if k in {'name','nameEn','nameAr','code'}and isinstance(v,(str,type(None)))}
    return result

async def read_exact(principal,origin,identities,*,include_lifecycle=False,transport=None):
    if not principal.umc_token:raise PermissionError('finance_identity_unavailable')
    if (not 1<=len(identities)<=5 or len(set(identities))!=len(identities)
            or any(not re.fullmatch(r'[A-Za-z]{2,3}-\d+(?:-\d+)+',x)for x in identities)):
        raise ValueError('finance_requested_reference_invalid')
    headers={'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id}
    receipts=[]
    async with httpx.AsyncClient(timeout=12,follow_redirects=False,transport=transport)as client:
        async def get(path,params,stage):
            with http_stage(stage):response=await client.get(origin.rstrip('/')+path,params=params,headers=headers)
            if response.status_code in {401,403}:raise PermissionError('finance_read_denied')
            if 300<=response.status_code<400:raise ValueError('finance_redirect_forbidden')
            response.raise_for_status()
            if len(response.content)>2*1024*1024:raise ValueError('finance_response_budget')
            return unwrap(response.json())
        async def scan(pass_no):
            rows=[];total=None;index=1
            while total is None or len(rows)<total:
                page=await get('/api/admin/finance/transactions',{'pageIndex':index,'pageSize':PAGE_SIZE},f'finance_api.pass{pass_no}.page{index}')
                if not isinstance(page,dict):raise ValueError('finance_page_invalid')
                batch=page.get('items');count=page.get('totalCount')
                if (not isinstance(batch,list)or type(count)is not int or not 0<=count<=MAX_ROWS
                        or page.get('pageIndex')!=index or page.get('pageSize')!=PAGE_SIZE
                        or total is not None and total!=count
                        or len(batch)!=min(PAGE_SIZE,max(0,count-(index-1)*PAGE_SIZE))):
                    raise ValueError('finance_population_incomplete')
                total=count;rows.extend(project(row)for row in batch)
                receipts.append({'pass':pass_no,'pageIndex':index,'rows':len(batch),'total':total})
                index+=1
            numbers=[row['transactionNo']for row in rows]
            if len(numbers)!=len(set(numbers)):raise ValueError('finance_duplicate_transaction')
            return sorted(rows,key=lambda row:row['transactionNo'])
        first=await scan(1);second=await scan(2)
        if first!=second:raise ValueError('finance_population_changed')
        found={identity:tuple(row for row in second if row['referenceNumber'].casefold()==identity.casefold())for identity in identities}
        details={}
        if include_lifecycle:
            async def detail(identity,row):
                number=row['transactionNo'];value=await get('/api/admin/finance/transactions/'+number,None,'finance_api.transaction_detail')
                transaction=value.get('transaction')if isinstance(value,dict)else None
                linked=value.get('applicationItems')if isinstance(value,dict)else None
                if not isinstance(transaction,dict)or transaction.get('transactionNo')!=number or not isinstance(linked,list):
                    raise ValueError('finance_detail_binding_invalid')
                matches=[v for v in linked if isinstance(v,dict)and str(v.get('applicationNumber')or'').casefold()==identity.casefold()]
                if len(matches)==1:
                    details[number]={'directFinanceDetail':{'applicationItems':[{'applicationNumber':identity,'applicationStatusObj':matches[0].get('applicationStatusObj')}]}}
            # At most two dependent details are in flight; failures remain
            # explicit rather than silently inventing an application state.
            pending=[(identity,row)for identity,rows in found.items()for row in rows]
            for index in range(0,len(pending),2):
                await gather_reads(*(detail(identity,row)for identity,row in pending[index:index+2]))
    fingerprint=hashlib.sha256(json.dumps(second,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return found,details,{'stablePasses':2,'fingerprint':fingerprint,'total':len(second),'pages':receipts,'exactReferences':list(identities)}
