"""Fixed-origin, fixed-schema Admin staff read adapter. No arbitrary tool URLs."""
import asyncio
from contextlib import asynccontextmanager
import json
from pathlib import Path
import re
from urllib.parse import quote, urlsplit

import httpx
from pydantic import BaseModel, ConfigDict, Field

from .portal_reader import PortalReadRequest, ReadOnlyPortalPolicy
from .timing import request as timed_request, span

ROOT = Path(__file__).parent / "business_skills"


def skill_catalog():
    return [json.loads(p.read_text()) for p in sorted(ROOT.glob("*/manifest.json"))]


CATALOG = skill_catalog()
OPERATIONS = {o['id']: o for s in CATALOG for o in s['operations']}
SKILLS = {s['skillId']: s for s in CATALOG}


class ReadParameters(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    Keyword: str = Field(default="", max_length=150)
    PageIndex: int = Field(default=1, ge=1, le=3)
    PageSize: int = Field(default=20, ge=1, le=20)
    StartTime: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?$")
    EndTime: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?$")


class MemberParameters(BaseModel):
    model_config=ConfigDict(extra="forbid",strict=True)
    Keyword: str=Field(default="",max_length=150)
    MemberId: str | None=Field(default=None,pattern=r"^[A-Za-z0-9_-]{1,128}$")
    StartTime: str | None=Field(default=None,pattern=r"^\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?$")
    EndTime: str | None=Field(default=None,pattern=r"^\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?$")


# Allowlist, not redact-after-copy. Raw DTOs/FormData never reach agent prompts.
SAFE_FIELDS = frozenset('applicationNumber status taskId taskStatus taskCreatedTime taskDueTime taskApprovalAt submissionTime sla slaDescription aiStatus assignedTo serviceNameEn serviceNameAr serviceCategoryNameEn serviceCategoryNameAr serviceTypeNameEn serviceTypeNameAr isOverdue isUrgent userId userName totalTaskCount completedTaskCount overdueCount'.split())


def lower_first(value):
    return value[:1].lower() + value[1:]


def project(row):
    if not isinstance(row, dict):
        return {}
    return {lower_first(k): v for k, v in row.items() if lower_first(k) in SAFE_FIELDS
            and (v is None or type(v) in (str, int, float, bool))
            and (not isinstance(v, str) or len(v) <= 300)}


def unwrap(body):
    if not isinstance(body, dict):
        raise ValueError('unexpected_api_envelope')
    if body.get('success') is False or body.get('isSuccess') is False:
        raise ValueError('upstream_business_error')
    # UMC ApiResponse's data is the only business payload, even when null.
    if 'data' in body:
        return body['data']
    raise ValueError('api_response_data_missing')


def page_data(data):
    if not isinstance(data, dict):
        raise ValueError('page_contract_missing')
    page = data.get('page')
    if not isinstance(page, dict) or type(page.get('total')) is not int or not isinstance(page.get('items'), list):
        raise ValueError('page_contract_missing')
    return page


class ReadonlyAPI:
    def __init__(self, base_url, permission, principal, *, timeout=15, transport=None):
        parts = urlsplit(base_url)
        if parts.scheme not in {'http', 'https'} or not parts.netloc or parts.username or parts.query or parts.fragment:
            raise ValueError('invalid_configured_origin')
        self.base_url, self.permission, self.principal = base_url.rstrip('/'), permission, principal
        self.policy = ReadOnlyPortalPolicy(base_url)
        self.timeout, self.transport = timeout, transport
        self.semaphore = asyncio.Semaphore(2)
        self.leaders, self.calls = {}, {}

    def authorized(self, module, team=False):
        if not self.principal.umc_token or self.permission.user_id != self.principal.user_id:
            return False
        path = '/licensing/team-management' if team and module == 'licensing' else (
            '/content/team-management' if team else '/licensing/applications' if module == 'licensing' else '/content/ContentApplications')
        return not self.policy.validate(PortalReadRequest(path, ({'type': 'observe'},)), self.permission)

    async def invoke(self, skill_id, operation_id, *, parameters=None, task_id=None, module=None):
        skill, operation = SKILLS.get(skill_id), OPERATIONS.get(operation_id)
        if not skill or not operation or not any(x['id'] == operation_id for x in skill['operations']):
            raise PermissionError('operation_not_in_loaded_skill')
        if not operation['enabled']:
            raise PermissionError(operation['missingReason'])
        module = operation['module'] if operation['module'] != 'team' else module
        if module not in {'licensing', 'content'} or not self.authorized(module, team=operation['leaderRequired']):
            raise PermissionError('module_page_permission_missing')
        if operation['leaderRequired'] and not await self.is_leader(module):
            raise PermissionError('current_module_leader_required')
        path = operation['path']
        payload = None
        if '{taskId}' in path:
            if not isinstance(task_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', task_id):
                raise ValueError('invalid_bound_task_id')
            path = path.replace('{taskId}', quote(task_id, safe=''))
        elif operation['method'] == 'POST':
            contract=MemberParameters if operation_id in {'TL3','TC3'} else ReadParameters
            payload=contract.model_validate(parameters or {}).model_dump(exclude_none=True)
        elif parameters:
            raise ValueError('unexpected_parameters')
        params = {'isLeave': 'false'} if operation_id == 'TEAM01' else None
        cache_key = (operation_id, path, json.dumps(payload, sort_keys=True), module)
        if cache_key not in self.calls:
            self.calls[cache_key] = asyncio.create_task(self._request(operation, path, payload, params))
        # Whole-turn single flight. The owner cancels all in-flight tasks on exit.
        return await asyncio.shield(self.calls[cache_key])

    async def is_leader(self, module):
        if module not in self.leaders:
            sid = 'umc.admin-licensing-work.read' if module == 'licensing' else 'umc.admin-content-work.read'
            op = 'ADM04' if module == 'licensing' else 'CON04'
            self.leaders[module] = asyncio.create_task(self.invoke(sid, op))
        value = await asyncio.shield(self.leaders[module])
        return value is True

    async def _request(self, operation, path, payload, params):
        with span('api.queue'):
            await self.semaphore.acquire()
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False, transport=self.transport) as client:
                response = await timed_request(client, operation['method'], self.base_url+path, owner='UMC',
                    json=payload, params=params, headers={'Authorization': 'Bearer '+self.principal.umc_token})
                response.raise_for_status()
                if 300 <= response.status_code < 400:
                    raise ValueError('redirect_not_allowed')
                if len(response.content) > 2*1024*1024:
                    raise ValueError('api_response_too_large')
                with span('api.decode_project'):
                    data = unwrap(response.json())
                    if operation['id'] in {'ADM04','CON04'}:
                        if type(data) is not bool:
                            raise ValueError('leader_contract_missing')
                        return data
                    if operation['id'] in {'ADM05','CON05'}:
                        if type(data) is not int or data < 0:
                            raise ValueError('urgent_count_contract_missing')
                        return data
                    if operation['id'] in {'TL3','TC3'}:
                        if not isinstance(data,list):raise ValueError('member_task_contract_missing')
                        rows=[{k:v for k,v in project(x).items() if k in {'userId','userName','totalTaskCount','completedTaskCount','overdueCount'}} for x in data if isinstance(x,dict)]
                        # Nonzero module task rows establish membership in that
                        # module's task population. Zero rows from other led
                        # departments do not establish complete module staffing.
                        rows=[x for x in rows if type(x.get('totalTaskCount')) is int and x['totalTaskCount']>0]
                        if payload and payload.get('MemberId'):
                            rows=[x for x in rows if x.get('userId')==payload['MemberId']]
                        return {'members':rows[:100],'populationComplete':False,
                            'missing':['zero_task_module_membership_unverified','sla_formula_not_authoritative']}
                    if operation['id'] == 'TEAM01':
                        if not isinstance(data, list): raise ValueError('members_contract_missing')
                        return [project(x) for x in data[:100]]
                    if '{taskId}' in operation['path']:
                        if not isinstance(data, dict): raise ValueError('detail_contract_missing')
                        return {'detail': project(data.get('detail'))}
                    page = page_data(data)
                    return {'page': {**{k:v for k,v in page.items() if k in {'total','pageIndex','pageSize'}},
                                     'items': [project(x) for x in page['items'][:20]]}}
        finally:
            self.semaphore.release()

    async def close(self):
        tasks = set(self.calls.values()) | set(self.leaders.values())
        for task in tasks:
            if not task.done(): task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
