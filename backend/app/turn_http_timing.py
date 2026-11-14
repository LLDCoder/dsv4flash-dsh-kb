"""Request-correlated HTTP client measurements, never invented upstream internals."""
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
import time
from urllib.parse import urlsplit
import httpx

_CURRENT = ContextVar('admin_turn_http_receipts', default=None)
_STAGE = ContextVar('admin_turn_http_stage', default='')
_ORIGINAL_SEND = httpx.AsyncClient.send


class _MeasuredStream(httpx.AsyncByteStream):
    def __init__(self, inner, receipt, started):
        self.inner, self.receipt, self.started = inner, receipt, started
    def finish(self):
        self.receipt.setdefault('durationMs', round((time.perf_counter()-self.started)*1000, 2))
    async def __aiter__(self):
        try:
            async for chunk in self.inner:
                yield chunk
        finally:
            self.finish()
    async def aclose(self):
        try:
            await self.inner.aclose()
        finally:
            self.finish()


async def _timed_send(client, request, *args, **kwargs):
    current = _CURRENT.get()
    if current is None:
        return await _ORIGINAL_SEND(client, request, *args, **kwargs)
    receipts, settings = current
    started = time.perf_counter()
    origin = str(request.url.copy_with(path='/', query=None, fragment=None)).rstrip('/')
    model_origin = str(settings.llm_base_url).rstrip('/')
    umc_origin = str(settings.umc_base_url).rstrip('/')
    owner = 'Model' if model_origin.startswith(origin + '/') or origin == model_origin else (
        'UMC' if umc_origin.startswith(origin + '/') or origin == umc_origin else 'DSH gateway')
    service = {'Model':'model','UMC':'umc'}.get(owner,'dsh_gateway')
    for field, label in [('knowledge_gateway_url','knowledge_gateway'),
                         ('platform_gateway_url','platform_gateway')]:
        configured=str(getattr(settings,field,'')or'').rstrip('/')
        if configured and (configured==origin or configured.startswith(origin+'/')):
            service=label
    r = {'method': request.method, 'origin': origin, 'path': request.url.path,
         'owner': owner, 'startedUtc': datetime.now(timezone.utc).isoformat(),
         'stage':_STAGE.get()or service, 'service':service,
         'measurement': 'DSH client wall time; upstream internal split unavailable'}
    receipts.append(r)
    try:
        response = await _ORIGINAL_SEND(client, request, *args, **kwargs)
        r['httpStatus'] = response.status_code
        r['responseHeadersMs'] = round((time.perf_counter()-started)*1000, 2)
        if kwargs.get('stream') and not response.is_closed:
            response.stream = _MeasuredStream(response.stream, r, started)
        else:
            r['durationMs'] = r['responseHeadersMs']
        return response
    except BaseException as exc:
        r.update(errorType=type(exc).__name__, durationMs=round((time.perf_counter()-started)*1000, 2))
        raise


# Installed once per worker. Inactive outside an explicitly scoped assistant
# turn; ContextVar separates principals and propagates to awaited child tasks.
if not getattr(httpx.AsyncClient.send, '_admin_turn_timing', False):
    _timed_send._admin_turn_timing = True
    httpx.AsyncClient.send = _timed_send


@contextmanager
def http_stage(stage):
    token=_STAGE.set(str(stage))
    try:
        yield
    finally:
        _STAGE.reset(token)


@contextmanager
def trace_http(settings):
    calls = []
    token = _CURRENT.set((calls, settings))
    try:
        yield calls
    finally:
        _CURRENT.reset(token)
