"""Request-scoped, payload-free timing. UTC labels + monotonic durations.

Parents are inclusive, never sum them with children. Remote durations use the
remote monotonic clock; cross-process critical paths use UTC only as correlation.
"""
import asyncio
import base64
import contextvars
from contextlib import contextmanager
from datetime import datetime, timezone
import functools
import json
import hashlib
from pathlib import Path
import logging
import re
import time
import uuid
import zlib

CURRENT = contextvars.ContextVar("dsh_timing_trace", default=None)
PARENT = contextvars.ContextVar("dsh_timing_parent", default=None)
AGENT = contextvars.ContextVar("dsh_timing_agent", default="orchestrator")
LOGGER = logging.getLogger("uvicorn.error")
VERSION = "admin-parallel-v1.20261016"

def component_revision():
    root=Path(__file__).resolve().parent
    files=sorted([*root.glob('*.py'),*root.glob('business_skills/*/manifest.json'),*root.glob('business_skills/*/SKILL.md')])
    value=hashlib.sha256()
    for path in files:
        value.update(str(path.relative_to(root)).encode());value.update(path.read_bytes())
    return value.hexdigest()

COMPONENT_REVISION=component_revision()


def utc():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def route_template(path):
    # No query strings, record IDs or business input in timing logs.
    path = str(path).split("?", 1)[0][:200]
    return re.sub(r"/(?=[^/]*[0-9])[^/]{8,}", "/{id}", path)


class Trace:
    def __init__(self, request_id, *, trace_id=None, parent_id=None, owner="DSH.backend"):
        self.request_id = str(request_id)[:128]
        self.trace_id = str(trace_id or uuid.uuid4().hex)[:64]
        self.parent_id, self.owner = parent_id, owner
        self.received_monotonic, self.received_utc = time.monotonic(), utc()
        self.spans, self.dropped = [], 0

    def begin(self, name, *, owner=None, parent_id=None, **fields):
        return Span(self, name, owner or self.owner, parent_id or PARENT.get() or self.parent_id, fields)

    def append(self, row):
        if len(self.spans) < 2000:
            self.spans.append(row)
        else:
            self.dropped += 1
        LOGGER.info("dsh_timing %s", json.dumps(row, separators=(",", ":"), ensure_ascii=True))

    def export(self):
        return {"version": VERSION, "componentRevision": COMPONENT_REVISION, "requestId": self.request_id, "traceId": self.trace_id,
                "spans": list(self.spans), "droppedSpans": self.dropped,
                "measurement": "inclusive_monotonic_ms", "upstreamInternals": {
                    "UMC.databaseMs": None, "UMC.domainMs": None,
                    "reason": "UMC_server_internal_spans_not_instrumented"}}


class Span:
    def __init__(self, trace, name, owner, parent_id, fields):
        self.trace, self.started, self.ended = trace, time.monotonic(), False
        self.row = {"version": VERSION, "componentRevision": COMPONENT_REVISION, "requestId": trace.request_id, "traceId": trace.trace_id,
                    "spanId": uuid.uuid4().hex[:16], "parentSpanId": parent_id,
                    "agent": AGENT.get(), "owner": owner, "stage": str(name)[:120],
                    "startUtc": utc(), "status": "running"}
        # Callers may only supply engineering metadata, never payloads/URLs.
        allowed = {"method", "route", "attempt", "statusCode", "purpose", "measurement",
                   "sourceOwner", "upstreamInternalMs", "missingReason", "actionIndex",
                   "actionType", "cache", "inputUnits", "outputUnits", "model"}
        self.row.update({k: v for k, v in fields.items() if k in allowed})

    def finish(self, status="completed", **fields):
        if self.ended:
            return
        self.ended = True
        self.row.update({"endUtc": utc(), "durationMs": round((time.monotonic()-self.started)*1000, 3),
                         "status": status})
        self.row.update({k: v for k, v in fields.items() if k in {
            "statusCode", "errorType", "missingReason", "firstByteMs", "inputUnits", "outputUnits"}})
        self.trace.append(self.row)

    def __enter__(self):
        self.token = PARENT.set(self.row["spanId"])
        return self

    def __exit__(self, typ, value, tb):
        PARENT.reset(self.token)
        self.finish("cancelled" if typ and issubclass(typ, asyncio.CancelledError) else
                    "failed" if typ else "completed", **({"errorType": typ.__name__} if typ else {}))


@contextmanager
def span(name, **fields):
    trace = CURRENT.get()
    if trace is None:
        yield None
    else:
        with trace.begin(name, **fields) as item:
            yield item


@contextmanager
def agent_scope(name):
    token = AGENT.set(name)
    try:
        with span("agent." + name):
            yield
    finally:
        AGENT.reset(token)


def timed(name, owner=None):
    def decorate(fn):
        @functools.wraps(fn)
        async def wrapped(*args, **kwargs):
            with span(name, **({"owner": owner} if owner else {})):
                return await fn(*args, **kwargs)
        return wrapped
    return decorate


def headers():
    trace = CURRENT.get()
    if trace is None:
        return {}
    return {"X-Request-ID": trace.request_id, "X-DSH-Trace-ID": trace.trace_id,
            "X-DSH-Parent-Span": PARENT.get() or "", "X-DSH-Agent": AGENT.get()}


def timing_header(trace):
    raw = json.dumps(trace.export(), separators=(",", ":")).encode()
    packed = base64.urlsafe_b64encode(zlib.compress(raw)).decode()
    return packed if len(packed) <= 48000 else ""


def ingest(response):
    trace = CURRENT.get()
    packed = response.headers.get("X-DSH-Timing")
    if not trace or not packed or len(packed) > 48000:
        return
    try:
        dec = zlib.decompressobj()
        raw = dec.decompress(base64.urlsafe_b64decode(packed), 1024*1024)
        if dec.unconsumed_tail:
            return
        remote = json.loads(raw)
        if remote.get("traceId") != trace.trace_id:
            return
        for row in remote.get("spans", [])[:1000]:
            if isinstance(row, dict) and row.get("traceId") == trace.trace_id:
                trace.append(row)
    except (ValueError, TypeError, zlib.error):
        LOGGER.warning("dsh_timing remote_receipt_invalid")


async def request(client, method, url, *, owner, attempt=1, **kwargs):
    from urllib.parse import urlsplit
    h = dict(kwargs.pop("headers", None) or {})
    with span("http.request", owner=owner, sourceOwner=owner, method=method.upper(),
              route=route_template(urlsplit(url).path), attempt=attempt,
              measurement="client_round_trip_including_body",
              upstreamInternalMs=None, missingReason="upstream_internal_spans_not_exposed") as item:
        h.update(headers())
        active = {}
        async def transport_event(name, info):
            if not item or not re.fullmatch(r"[a-z0-9_.]+", name):
                return
            phase, _, event = name.rpartition('.')
            if event == 'started':
                active[phase] = item.trace.begin('transport.'+phase, owner=owner,
                    parent_id=item.row['spanId'], measurement='httpcore_transport_phase')
            elif event in {'complete','failed'} and phase in active:
                active.pop(phase).finish('failed' if event == 'failed' else 'completed')
        extensions = dict(kwargs.pop('extensions', None) or {})
        extensions['trace'] = transport_event
        try:
            response = await client.request(method, url, headers=h, extensions=extensions, **kwargs)
        finally:
            for pending in active.values():
                pending.finish('interrupted')
        if item:
            item.row["statusCode"] = response.status_code
            if response.is_error:
                item.finish("http_error", statusCode=response.status_code)
        ingest(response)
        return response


async def backoff(seconds):
    with span("http.retry_backoff"):
        await asyncio.sleep(seconds)


def install_gateway(app, owner):
    @app.middleware("http")
    async def collect(request, call_next):
        trace = Trace(request.headers.get("X-Request-ID") or uuid.uuid4().hex,
                      trace_id=request.headers.get("X-DSH-Trace-ID"),
                      parent_id=request.headers.get("X-DSH-Parent-Span"), owner=owner)
        token = CURRENT.set(trace)
        parent = PARENT.set(None)
        agent = AGENT.set(request.headers.get("X-DSH-Agent", "orchestrator" if owner == "DSH.backend" else "knowledge" if owner == "DSH.knowledge-gateway" else "page"))
        try:
            with span("gateway.request", method=request.method, route=route_template(request.url.path)) as item:
                response = await call_next(request)
                item.row["statusCode"] = response.status_code
            packed = timing_header(trace)
            if packed:
                response.headers["X-DSH-Timing"] = packed
            return response
        finally:
            CURRENT.reset(token)
            PARENT.reset(parent)
            AGENT.reset(agent)


async def timed_await(name, operation, **fields):
    with span(name, **fields):
        return await operation


class TimedLock:
    def __init__(self, lock, name="session.writer_lock_queue"):
        self.lock, self.name = lock, name
    async def __aenter__(self):
        with span(self.name):
            await self.lock.acquire()
        return self
    async def __aexit__(self, *args):
        self.lock.release()


def install_sql_timing(engine):
    from sqlalchemy import event
    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def before(conn, cursor, statement, parameters, context, executemany):
        trace = CURRENT.get()
        context._dsh_span = trace.begin("database.execute", owner="DSH.database",
            purpose="statement_payload_not_logged") if trace else None
    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def after(conn, cursor, statement, parameters, context, executemany):
        item = getattr(context, "_dsh_span", None)
        if item: item.finish()
    @event.listens_for(engine.sync_engine, "handle_error")
    def failed(context):
        item = getattr(context.execution_context, "_dsh_span", None)
        if item: item.finish("failed", errorType=type(context.original_exception).__name__)


def trace_submission(fn):
    @functools.wraps(fn)
    async def wrapped(self, principal, *args, **kwargs):
        old = CURRENT.get()
        token = CURRENT.set(old if old and old.request_id == principal.request_id else Trace(principal.request_id))
        try:
            return await fn(self, principal, *args, **kwargs)
        finally:
            CURRENT.reset(token)
    return wrapped


# No SQL text or arguments in these spans. execute includes connection-pool
# checkout; database.execute measures only the driver round trip.
def timing_session_class(base):
    class TimingSession(base):
        async def execute(self, *args, **kwargs):
            with span("database.session_execute", owner="DSH.database"):
                return await super().execute(*args, **kwargs)
        async def commit(self):
            with span("database.commit", owner="DSH.database"):
                return await super().commit()
    return TimingSession
