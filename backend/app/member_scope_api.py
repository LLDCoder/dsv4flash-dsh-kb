"""Read the selected member-card period without inferring pending from subtraction."""
from datetime import date
import httpx
from .ticket_read_api import unwrap
from .turn_http_timing import http_stage

async def member_exists(principal,origin,module,name,transport=None):
    if module not in {'customer-happiness','licensing','content'}or not principal.umc_token:
        raise PermissionError('member_identity_unavailable')
    async with httpx.AsyncClient(timeout=15,follow_redirects=False,transport=transport)as client:
        with http_stage('team_work.zero_owner_roster'):
            response=await client.get(origin.rstrip('/')+f'/api/{module}/team-management/members',
                headers={'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id})
        if response.status_code in {401,403}:raise PermissionError('member_roster_denied')
        if 300<=response.status_code<400:raise ValueError('member_roster_redirect_forbidden')
        response.raise_for_status()
        if len(response.content)>2*1024*1024:raise ValueError('member_roster_budget')
        data=unwrap(response.json())
    if not isinstance(data,dict):raise ValueError('member_roster_shape')
    members=[]
    for key in ('members','cards'):
        batch=data.get(key)or[]
        if not isinstance(batch,list):raise ValueError('member_roster_items_shape')
        members.extend(x for x in batch if isinstance(x,dict))
    return any(str(x.get('userName')or'').strip().casefold()==name.strip().casefold()for x in members)

async def read_member_scope(principal,origin,module,hints,transport=None):
    if module not in {'customer-happiness','licensing','content'}:
        raise ValueError('member_scope_module_invalid')
    if not principal.umc_token:raise PermissionError('member_scope_identity_unavailable')
    values={}
    for item in hints:
        key=item.get('name','')
        if key in {'teamMembers.startDate','teamMembers.endDate'}:
            if key in values:raise ValueError('member_scope_duplicate_date')
            value=item['value'];date.fromisoformat(value[:10]);values[key]=value
    if len(values)!=2:raise ValueError('member_scope_date_missing')
    params={k.split('.',1)[1]:v for k,v in values.items()}
    if params['startDate'][:10]>params['endDate'][:10]:raise ValueError('member_scope_date_order')
    async with httpx.AsyncClient(timeout=15,follow_redirects=False,transport=transport)as client:
        with http_stage('member_scope.selected_period'):
            response=await client.get(origin.rstrip('/')+f'/api/{module}/team-management/members',params=params,
                headers={'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id})
        if response.status_code in {401,403}:raise PermissionError('member_scope_denied')
        if 300<=response.status_code<400:raise ValueError('member_scope_redirect_forbidden')
        response.raise_for_status()
        if len(response.content)>2*1024*1024:raise ValueError('member_scope_response_budget')
        data=unwrap(response.json())
    if (not isinstance(data,dict)or not isinstance(data.get('cards'),list)
            or any(str(data.get(key)or'')[:10]!=value[:10]for key,value in params.items())):
        raise ValueError('member_scope_period_not_echoed')
    return data
