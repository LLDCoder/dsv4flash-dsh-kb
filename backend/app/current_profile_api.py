"""Authenticated own-profile labels. Never accepts a target user from a question."""
import httpx
from .ticket_read_api import unwrap
from .turn_http_timing import http_stage

OPERATION='GET /api/UserManagement/GetAdminUserAsync'

async def read_profile(principal,origin,language='en',*,transport=None):
    if not principal.umc_token or not principal.user_id:
        raise PermissionError('own_profile_identity_missing')
    async with httpx.AsyncClient(timeout=3,follow_redirects=False,transport=transport)as client:
        with http_stage('current_profile_api'):
            response=await client.get(origin.rstrip('/')+'/api/UserManagement/GetAdminUserAsync',
                params={'userId':principal.user_id},headers={
                    'Authorization':'Bearer '+principal.umc_token,'X-Request-ID':principal.request_id,
                    'Accept-Language':'ar'if language=='ar'else'en'})
        if response.status_code in {401,403}:
            raise PermissionError('own_profile_source_denied')
        if 300<=response.status_code<400:
            raise PermissionError('own_profile_redirect_forbidden')
        response.raise_for_status()
        if response.status_code!=200:raise ValueError('own_profile_status_not_200')
        if len(response.content)>2*1024*1024:raise ValueError('own_profile_response_budget')
        data=unwrap(response.json())
    if not isinstance(data,dict)or str(data.get('userId')or'').casefold()!=str(principal.user_id).casefold():
        raise PermissionError('own_profile_actor_mismatch')
    # Source DTOs also contain DOB, identity-document and contact fields.
    # Those are neither needed nor retained by this label-only adapter.
    labels={}
    for key in ['departmentsInfo','assignRolesIdsInfo']:
        values=data.get(key)or[]
        if not isinstance(values,list):raise ValueError('own_profile_labels_shape')
        labels[key]=[{k:v for k,v in row.items()if k in {
            'name','nameEn','nameAr','departmentName','departmentNameEn','departmentNameAr',
            'roleName','roleNameEn','roleNameAr'}and isinstance(v,str)}
            for row in values if isinstance(row,dict)]
    return {'nativeRead':{'operation':OPERATION,'actorVerified':True},
        'apiDiscovery':{'candidates':[{'operationKey':OPERATION,'status':200,
            'responseEvidence':{'data':labels}}]}}
