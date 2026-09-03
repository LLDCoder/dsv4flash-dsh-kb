import asyncio
import hmac
import json
import logging
from typing import Any
from urllib.parse import parse_qs
from uuid import uuid4

import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import String, cast, delete, func, not_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import config_catalog, get_settings
from .console_auth import CONSOLE_PASSWORD_CONFIG_KEY, CONSOLE_SESSION_COOKIE, CONSOLE_SESSION_MAX_AGE_SECONDS, issue_session, verify_session
from .db import AuditRecord, ConfigEntry, Conversation, MessageIdempotency, SessionEvent, Skill, get_db
from .principal import Principal, _bearer_token, _token_reference, get_principal
from .schemas import ConfigPatch, ConsoleLogin, ConversationCreate, MessageCreate, TestCaseGenerateRequest, TestCaseRunRequest, WSMessage
from .service import DSHService
from .testcases import generate_test_cases, run_test_cases

# Uvicorn configures this logger at INFO for container output. Using it keeps
# correlation records visible without changing the global logging policy.
logger = logging.getLogger("uvicorn.error")


def make_router(service: DSHService) -> APIRouter:
    router = APIRouter(prefix="/api/v1")

    def raw_config_value(item: ConfigEntry) -> object:
        value = item.value
        if isinstance(value, dict) and "value" in value and len(value) == 1:
            return value["value"]
        return value

    async def stored_console_password(db: AsyncSession) -> str:
        result = await db.execute(
            select(ConfigEntry).where(
                ConfigEntry.scope == "system",
                ConfigEntry.key == CONSOLE_PASSWORD_CONFIG_KEY,
            )
        )
        entry = result.scalar_one_or_none()
        if entry:
            value = raw_config_value(entry)
            if isinstance(value, str) and value:
                service.console_password = value
        return service.console_password

    async def require_console_session(
        request: Request,
        db: AsyncSession = Depends(get_db),
    ) -> None:
        """Authorize operator-only console actions from the signed cookie."""

        password = await stored_console_password(db)
        if not verify_session(request.cookies.get(CONSOLE_SESSION_COOKIE), password):
            raise HTTPException(status_code=401, detail="console authentication required")

    @router.post("/console/login", tags=["Test console"])
    async def console_login(payload: ConsoleLogin, request: Request, db: AsyncSession = Depends(get_db)):
        """Unlock the Docker test console and issue an HttpOnly session cookie."""

        password = await stored_console_password(db)
        if not hmac.compare_digest(payload.password, password):
            # Do not disclose whether the password is missing, changed, or
            # otherwise invalid. The fixed credential remains DB-recoverable.
            raise HTTPException(status_code=401, detail="invalid console password")
        response = JSONResponse({"authenticated": True, "expiresInSeconds": CONSOLE_SESSION_MAX_AGE_SECONDS})
        response.set_cookie(
            key=CONSOLE_SESSION_COOKIE,
            value=issue_session(password),
            max_age=CONSOLE_SESSION_MAX_AGE_SECONDS,
            httponly=True,
            secure=request.url.scheme == "https",
            samesite="strict",
            path="/",
        )
        return response

    @router.get("/console/session", tags=["Test console"])
    async def console_session(request: Request):
        authenticated = verify_session(request.cookies.get(CONSOLE_SESSION_COOKIE), service.console_password)
        return {"authenticated": authenticated, "expiresInSeconds": CONSOLE_SESSION_MAX_AGE_SECONDS if authenticated else 0}

    @router.post("/console/logout", tags=["Test console"])
    async def console_logout():
        response = JSONResponse({"authenticated": False})
        response.delete_cookie(key=CONSOLE_SESSION_COOKIE, path="/")
        return response

    @router.post("/conversations")
    async def create_conversation(payload: ConversationCreate, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        conversation = await service.create_conversation(db, principal, payload.workspace)
        return service.conversation_json(conversation)

    def pagination_json(total: int, page: int, page_size: int) -> dict[str, int]:
        return {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": max(1, (total + page_size - 1) // page_size),
        }

    async def paged_items(db: AsyncSession, query, *, page: int, page_size: int):
        total = int((await db.execute(select(func.count()).select_from(query.order_by(None).subquery()))).scalar_one())
        result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
        return list(result.scalars().all()), total

    def text_match(term: str | None, *fields):
        value = (term or "").strip()
        if not value:
            return None
        pattern = f"%{value}%"
        return or_(*(field.ilike(pattern) for field in fields))

    def session_event_category_filter(category: str | None):
        normalized = (category or "").strip().lower()
        if not normalized:
            return None
        if normalized == "llm":
            return SessionEvent.event_type.like("llm.%")
        if normalized == "conversation":
            return or_(SessionEvent.event_type.like("user.%"), SessionEvent.event_type.like("assistant.%"))
        if normalized == "dsh":
            return SessionEvent.event_type.in_(("skill.route", "skill.route.shadow", "tool.call", "tool.result", "turn.started", "turn.completed", "runtime.error", "turn.cancelled"))
        if normalized == "runtime":
            return not_(or_(
                SessionEvent.event_type.like("llm.%"),
                SessionEvent.event_type.like("user.%"),
                SessionEvent.event_type.like("assistant.%"),
                SessionEvent.event_type.in_(("skill.route", "skill.route.shadow", "tool.call", "tool.result", "turn.started", "turn.completed", "runtime.error", "turn.cancelled")),
            ))
        return SessionEvent.event_type == normalized

    async def audit_conversation_list(
        db: AsyncSession,
        conversations: list[Conversation],
        *,
        is_admin: bool,
        total: int,
        page: int,
        page_size: int,
    ) -> dict[str, object]:
        conversation_ids = [conversation.conversation_id for conversation in conversations]
        title_by_conversation: dict[str, str] = {}
        if conversation_ids:
            ranked_events = (
                select(
                    SessionEvent.conversation_id.label("conversation_id"),
                    SessionEvent.event_json.label("event_json"),
                    func.row_number().over(
                        partition_by=SessionEvent.conversation_id,
                        order_by=(SessionEvent.created_at.asc(), SessionEvent.id.asc()),
                    ).label("row_number"),
                )
                .where(
                    SessionEvent.conversation_id.in_(conversation_ids),
                    SessionEvent.event_type == "user.message",
                )
                .subquery()
            )
            title_result = await db.execute(
                select(ranked_events.c.conversation_id, ranked_events.c.event_json).where(ranked_events.c.row_number == 1)
            )
            title_by_conversation = {
                str(conversation_id): str((event_json or {}).get("content", "")).strip()[:160]
                for conversation_id, event_json in title_result.all()
            }
        items: list[dict] = []
        for conversation in conversations:
            item = {**service.conversation_json(conversation), "title": title_by_conversation.get(conversation.conversation_id, "")}
            if is_admin:
                item["ownerUserId"] = conversation.user_id
                item["ownerTenantId"] = conversation.tenant_id
            items.append(item)
        return {"conversations": items, "scope": "admin" if is_admin else "owner", **pagination_json(total, page, page_size)}

    async def audit_conversation_detail(
        db: AsyncSession,
        conversation: Conversation,
        *,
        category: str | None,
        search: str | None,
        page: int,
        page_size: int,
        is_admin: bool,
        principal: Principal | None = None,
    ) -> dict[str, object]:
        base_conditions = [AuditRecord.conversation_id == conversation.conversation_id]
        if not is_admin and principal:
            base_conditions.extend((
                AuditRecord.tenant_id == principal.tenant_id,
                AuditRecord.user_id == principal.user_id,
            ))
        has_audit_records = (await db.execute(select(AuditRecord.id).where(*base_conditions).limit(1))).scalar_one_or_none() is not None
        query = select(AuditRecord).where(*base_conditions)
        if category:
            query = query.where(AuditRecord.category == category.strip().lower())
        record_match = text_match(search, AuditRecord.record_type, cast(AuditRecord.payload, String))
        if record_match is not None:
            query = query.where(record_match)
        query = query.order_by(AuditRecord.created_at.asc(), AuditRecord.id.asc())

        def record_json(record: AuditRecord) -> dict[str, object]:
            return {
                "id": record.id,
                "category": record.category,
                "recordType": record.record_type,
                "requestId": record.request_id,
                "runtimeId": record.runtime_id,
                "payload": record.payload or {},
                "createdAt": record.created_at.isoformat() if record.created_at else None,
            }

        audit_records, total = await paged_items(db, query, page=page, page_size=page_size)
        items = [record_json(record) for record in audit_records]
        source = "audit_record"
        # Conversations created before chain-audit was enabled have no rows in
        # audit_record. Reuse their immutable session events so operators can
        # still inspect the historical dialogue and execution flow.
        if not has_audit_records:
            event_query = select(SessionEvent).where(
                SessionEvent.conversation_id == conversation.conversation_id,
            )
            if not is_admin and principal:
                event_query = event_query.where(
                    SessionEvent.tenant_id == principal.tenant_id,
                    SessionEvent.user_id == principal.user_id,
                )
            event_category_filter = session_event_category_filter(category)
            if event_category_filter is not None:
                event_query = event_query.where(event_category_filter)
            event_match = text_match(search, SessionEvent.event_type, cast(SessionEvent.event_json, String))
            if event_match is not None:
                event_query = event_query.where(event_match)
            event_query = event_query.order_by(SessionEvent.created_at.asc(), SessionEvent.id.asc())
            events, total = await paged_items(db, event_query, page=page, page_size=page_size)
            for event in events:
                event_category = service.audit_category(event.event_type)
                payload = event.event_json or {}
                items.append(
                    {
                        "id": f"event:{event.id}",
                        "category": event_category,
                        "recordType": event.event_type,
                        "requestId": payload.get("requestId"),
                        "runtimeId": payload.get("runtimeId"),
                        "payload": payload,
                        "createdAt": event.created_at.isoformat() if event.created_at else None,
                    }
                )
            source = "session_event_history"
        conversation_json = service.conversation_json(conversation)
        if is_admin:
            conversation_json["owner"] = {
                "userId": conversation.user_id,
                "tenantId": conversation.tenant_id,
            }
        return {
            "conversation": conversation_json,
            "conversationId": conversation.conversation_id,
            "items": items,
            "count": len(items),
            "category": category.strip().lower() if category else None,
            "search": (search or "").strip() or None,
            "source": source,
            "scope": "admin" if is_admin else "owner",
            **pagination_json(total, page, page_size),
        }

    @router.get("/conversations")
    async def list_conversations(
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=25, ge=1, le=100, alias="pageSize"),
        search: str | None = Query(default=None, max_length=160),
        db: AsyncSession = Depends(get_db),
        principal: Principal = Depends(get_principal),
    ):
        is_admin = service.can_view_all_audit(principal)
        query = select(Conversation)
        if not is_admin:
            query = query.where(Conversation.tenant_id == principal.tenant_id, Conversation.user_id == principal.user_id)
        conversation_match = text_match(search, Conversation.conversation_id, Conversation.user_id, Conversation.tenant_id)
        if conversation_match is not None:
            title_match = select(SessionEvent.id).where(
                SessionEvent.conversation_id == Conversation.conversation_id,
                SessionEvent.event_type == "user.message",
                cast(SessionEvent.event_json, String).ilike(f"%{search.strip()}%"),
            ).exists()
            query = query.where(or_(conversation_match, title_match))
        query = query.order_by(Conversation.last_activity_at.desc(), Conversation.id.desc())
        conversations, total = await paged_items(db, query, page=page, page_size=page_size)
        return await audit_conversation_list(db, conversations, is_admin=is_admin, total=total, page=page, page_size=page_size)

    @router.get("/console/audit/conversations", tags=["Test console"])
    async def list_console_audit_conversations(
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=25, ge=1, le=100, alias="pageSize"),
        search: str | None = Query(default=None, max_length=160),
        db: AsyncSession = Depends(get_db),
        _: None = Depends(require_console_session),
    ):
        query = select(Conversation)
        conversation_match = text_match(search, Conversation.conversation_id, Conversation.user_id, Conversation.tenant_id)
        if conversation_match is not None:
            title_match = select(SessionEvent.id).where(
                SessionEvent.conversation_id == Conversation.conversation_id,
                SessionEvent.event_type == "user.message",
                cast(SessionEvent.event_json, String).ilike(f"%{search.strip()}%"),
            ).exists()
            query = query.where(or_(conversation_match, title_match))
        query = query.order_by(Conversation.last_activity_at.desc(), Conversation.id.desc())
        conversations, total = await paged_items(db, query, page=page, page_size=page_size)
        return await audit_conversation_list(db, conversations, is_admin=True, total=total, page=page, page_size=page_size)

    @router.get("/console/audit/conversations/{conversation_id}", tags=["Test console"])
    async def get_console_audit_conversation(
        conversation_id: str,
        category: str | None = Query(default=None),
        search: str | None = Query(default=None, max_length=160),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=50, ge=1, le=100, alias="pageSize"),
        db: AsyncSession = Depends(get_db),
        _: None = Depends(require_console_session),
    ):
        result = await db.execute(select(Conversation).where(Conversation.conversation_id == conversation_id))
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="conversation not found")
        return await audit_conversation_detail(
            db,
            conversation,
            category=category,
            search=search,
            page=page,
            page_size=page_size,
            is_admin=True,
        )

    @router.get("/conversations/{conversation_id}")
    async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        try:
            conversation = await service.get_owned_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        lease = service.runtime_manager.get(conversation_id)
        return service.conversation_json(conversation, lease.state if lease else None)

    @router.delete("/conversations/{conversation_id}")
    async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        try:
            await service.delete_owned_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return {"deleted": True, "conversationId": conversation_id}

    @router.post("/conversations/{conversation_id}/messages")
    async def post_message(conversation_id: str, payload: MessageCreate, principal: Principal = Depends(get_principal)):
        try:
            return await service.submit_message(
                principal,
                conversation_id,
                payload.content,
                payload.client_message_id,
            )
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.get("/conversations/{conversation_id}/history")
    async def get_conversation_history(conversation_id: str, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        try:
            conversation = await service.get_owned_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        events = await service.list_events(db, conversation)
        return {
            "conversationId": conversation_id,
            "events": [
                {"seq": event.seq, "eventType": event.event_type, "data": event.event_json}
                for event in events
            ],
        }

    @router.get("/conversations/{conversation_id}/audit", tags=["Audit"])
    async def get_conversation_audit(
        conversation_id: str,
        category: str | None = Query(default=None),
        search: str | None = Query(default=None, max_length=160),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=50, ge=1, le=100, alias="pageSize"),
        db: AsyncSession = Depends(get_db),
        principal: Principal = Depends(get_principal),
    ):
        """Return the persisted execution trail for an owned or admin-scoped conversation."""

        try:
            conversation, is_admin = await service.get_audit_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        return await audit_conversation_detail(
            db,
            conversation,
            category=category,
            search=search,
            page=page,
            page_size=page_size,
            is_admin=is_admin,
            principal=principal,
        )

    @router.get("/conversations/{conversation_id}/events")
    async def sse_events(conversation_id: str, after_seq: int = Query(default=0, alias="afterSeq"), event_type: str | None = Query(default=None, alias="eventType"), db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        try:
            conversation = await service.get_owned_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        async def stream() -> AsyncIterator[str]:
            queue = service.broker.subscribe(conversation_id)
            cursor = after_seq
            try:
                # Subscribe before replay so events arriving during the DB read are
                # queued and cannot be lost at the reconnect boundary.
                replay = await service.list_events(db, conversation, after_seq=after_seq, event_type=event_type)
                for event in replay:
                    if event.seq <= cursor:
                        continue
                    payload = {"seq": event.seq, "eventType": event.event_type, "data": event.event_json}
                    cursor = event.seq
                    yield f"id: {event.seq}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
                while True:
                    event = await queue.get()
                    if event["seq"] <= cursor or (event_type and event["eventType"] != event_type):
                        continue
                    cursor = event["seq"]
                    yield f"id: {event['seq']}\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"
            finally:
                service.broker.unsubscribe(conversation_id, queue)

        return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @router.get("/config")
    async def get_config(scope: str = "system", db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        result = await db.execute(select(ConfigEntry).where(ConfigEntry.scope == scope))
        entries = {item.key: item for item in result.scalars().all()}
        settings = get_settings()
        items: list[dict[str, object]] = []
        for spec in config_catalog():
            key = str(spec["key"])
            item = entries.get(key)
            raw = raw_config_value(item) if item else getattr(settings, key, None)
            configured = raw not in (None, "")
            secret = bool(spec.get("secret"))
            items.append(
                {
                    "key": key,
                    "label": spec.get("label"),
                    "group": spec.get("group"),
                    "env": spec.get("env"),
                    "secret": secret,
                    "multiline": bool(spec.get("multiline")),
                    "options": list(spec.get("options", [])),
                    "description": spec.get("description"),
                    "restartRequired": bool(spec.get("restartRequired")),
                    "configured": configured,
                    "source": "database" if item else "environment/default",
                    "version": item.version if item else 0,
                    "value": "••••••••" if secret and configured else ("" if secret else raw),
                    "updatedBy": item.updated_by if item else None,
                }
            )
        return {"scope": scope, "items": items}

    @router.patch("/config")
    async def patch_config(payload: ConfigPatch, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        allowed = {str(spec["key"]) for spec in config_catalog()}
        for key, value in payload.patch.items():
            if key not in allowed:
                raise HTTPException(status_code=400, detail=f"unsupported config key: {key}")
            if key.startswith("audit_admin_") and not service.can_view_all_audit(principal):
                raise HTTPException(
                    status_code=403,
                    detail="audit administrator scope can only be changed by an existing audit administrator",
                )
            spec = next(item for item in config_catalog() if item["key"] == key)
            # A blank secret or the display mask means “leave the existing
            # credential unchanged”; operators can replace it by entering a
            # new value. This prevents an innocent form save from erasing keys.
            if bool(spec.get("secret")) and value in (None, "", "••••••••"):
                continue
            result = await db.execute(select(ConfigEntry).where(ConfigEntry.scope == payload.scope, ConfigEntry.key == key))
            entry = result.scalar_one_or_none()
            if entry:
                if payload.version is not None and entry.version != payload.version:
                    raise HTTPException(status_code=409, detail=f"config version conflict for {key}")
                entry.version += 1
                entry.value = value if isinstance(value, dict) else {"value": value}
                entry.updated_by = principal.user_id
            else:
                db.add(ConfigEntry(scope=payload.scope, key=key, version=1, value=value if isinstance(value, dict) else {"value": value}, updated_by=principal.user_id))
        await db.commit()
        effective = await db.execute(select(ConfigEntry).where(ConfigEntry.scope == payload.scope))
        await service.apply_config_entries(list(effective.scalars().all()))
        return await get_config(payload.scope, db, principal)

    @router.post("/test-cases/generate")
    async def generate_test_cases_endpoint(payload: TestCaseGenerateRequest, principal: Principal = Depends(get_principal)):
        return await generate_test_cases(service, list(payload.languages), payload.folder_id, payload.limit, umc_token=principal.umc_token)

    @router.post("/test-cases/run")
    async def run_test_cases_endpoint(payload: TestCaseRunRequest, principal: Principal = Depends(get_principal)):
        return await run_test_cases(service, principal, list(payload.cases), payload.timeout_seconds)

    @router.get("/skills")
    async def list_skills(
        scope: str | None = None,
        search: str | None = Query(default=None, max_length=160),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=25, ge=1, le=100, alias="pageSize"),
        db: AsyncSession = Depends(get_db),
        principal: Principal = Depends(get_principal),
    ):
        query = select(Skill).order_by(Skill.skill_id, Skill.version.desc())
        if scope:
            query = query.where(Skill.scope == scope)
        skill_match = text_match(search, Skill.skill_id, Skill.name, Skill.source, Skill.status, Skill.scope, Skill.content)
        if skill_match is not None:
            query = query.where(skill_match)
        items, total = await paged_items(db, query, page=page, page_size=page_size)
        return {
            "items": [{"skillId": item.skill_id, "name": item.name, "version": item.version, "source": item.source, "status": item.status, "scope": item.scope, "enabled": item.enabled, "allowedTools": item.allowed_tools, "dependencies": item.dependencies, "content": item.content, "updatedBy": item.updated_by} for item in items],
            "search": (search or "").strip() or None,
            **pagination_json(total, page, page_size),
        }


    @router.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        # Browser WebSockets cannot set the trusted identity headers used by
        # REST requests.  The local test console therefore sends the same
        # values in the query string.  Keep the query fallback aligned with
        # the REST principal so a conversation created with e.g.
        # ``tenantId=demo-tenant`` can be subscribed to on the socket.
        query = parse_qs(websocket.scope.get("query_string", b"").decode("utf-8", "ignore"))
        query_user_id = (query.get("userId") or [""])[0].strip()
        query_tenant_id = (query.get("tenantId") or [""])[0].strip()
        user_id = websocket.headers.get("x-user-id") or query_user_id
        # Browser WebSockets cannot set trusted identity headers. Keep a
        # provisional principal until the UMC token is validated server-side.
        principal = Principal(
            user_id=user_id or "",
            tenant_id=websocket.headers.get("x-tenant-id") or query_tenant_id or "default",
            request_id=websocket.headers.get("x-request-id") or str(uuid4()),
            token_ref=None,
            umc_token=_bearer_token(websocket.headers.get("authorization")),
        )
        subscriptions: dict[str, asyncio.Queue[dict]] = {}
        forwarders: dict[str, asyncio.Task[None]] = {}
        send_lock = asyncio.Lock()

        async def send(payload: dict) -> None:
            async with send_lock:
                await websocket.send_json(payload)

        async def forward_events(conversation_id: str, queue: asyncio.Queue[dict]) -> None:
            while True:
                event = await queue.get()
                await send({"type": "event", **event})

        try:
            while True:
                raw = await websocket.receive_json()
                message = WSMessage.model_validate(raw)
                if message.type == "auth":
                    # Browser WebSocket clients cannot set an Authorization
                    # header, so they send the UMC token once as the first
                    # application frame. Keep the raw token only in memory;
                    # all persisted events use token_ref instead.
                    token = (message.umc_token or "").strip()
                    if not token:
                        await send({"type": "error", "code": "umc_token_required"})
                        continue
                    claims_user_id = None
                    settings = get_settings()
                    try:
                        async with httpx.AsyncClient(timeout=settings.platform_timeout_seconds) as client:
                            response = await client.post(
                                settings.umc_user_info_endpoint,
                                headers={"Authorization": f"Bearer {token}"},
                                json={},
                            )
                        payload = response.json()
                        data = payload.get("data") if isinstance(payload, dict) else None
                        candidate = data.get("id") if isinstance(data, dict) else None
                        claims_user_id = str(candidate).strip() if isinstance(candidate, (str, int)) else None
                    except (httpx.HTTPError, ValueError, TypeError):
                        claims_user_id = None
                    if not claims_user_id:
                        await send({"type": "error", "code": "missing_user_identity"})
                        continue
                    if principal.user_id and str(claims_user_id) != str(principal.user_id):
                        await send({"type": "error", "code": "identity_mismatch"})
                        continue
                    principal = Principal(
                        user_id=str(claims_user_id),
                        # Preserve the tenant selected by the trusted gateway
                        # or local console.  REST conversation creation uses
                        # this same tenant value; replacing it with a global
                        # UMC tenant made every browser subscription fail with
                        # ``conversation_not_found``.
                        tenant_id=principal.tenant_id or f"umc:global:{claims_user_id}",
                        request_id=principal.request_id,
                        token_ref=_token_reference(f"Bearer {token}"),
                        umc_token=token,
                    )
                    logger.info(
                        "umc_ws_authenticated request_id=%s token_ref=%s",
                        principal.request_id,
                        principal.token_ref,
                    )
                    await send({"type": "authenticated", "token": "umctoken"})
                elif message.type == "subscribe" or message.type == "resume":
                    if not message.conversation_id:
                        continue
                    conversation_id = message.conversation_id
                    async with service_runtime_db() as db:
                        try:
                            conversation = await service.get_owned_conversation(db, principal, conversation_id)
                        except LookupError:
                            await send({"type": "error", "code": "conversation_not_found"})
                            continue
                        if conversation_id not in subscriptions:
                            subscriptions[conversation_id] = service.broker.subscribe(conversation_id)
                            forwarders[conversation_id] = asyncio.create_task(forward_events(conversation_id, subscriptions[conversation_id]))
                        for event in await service.list_events(db, conversation, after_seq=message.after_seq):
                            await send({"type": "event", "seq": event.seq, "eventType": event.event_type, "data": event.event_json})
                        await send({"type": "subscribed", "conversationId": conversation_id, "afterSeq": message.after_seq})
                elif message.type == "message" and message.conversation_id and message.client_message_id:
                    try:
                        result = await service.submit_message(
                            principal,
                            message.conversation_id,
                            message.content or "",
                            message.client_message_id,
                        )
                    except LookupError:
                        await send({"type": "error", "code": "conversation_not_found"})
                    else:
                        await send({"type": "accepted", **result})
                elif message.type == "cancel" and message.conversation_id:
                    await service.cancel(principal, message.conversation_id)
                elif message.type == "ack":
                    await send({"type": "ack", "seq": message.seq})
        except WebSocketDisconnect:
            pass
        finally:
            for conversation_id, queue in subscriptions.items():
                service.broker.unsubscribe(conversation_id, queue)
            for task in forwarders.values():
                task.cancel()

    return router


class service_runtime_db:
    """Tiny async context wrapper kept local to avoid exposing session internals in WS code."""

    async def __aenter__(self):
        from .db import SessionLocal

        self.session = SessionLocal()
        return await self.session.__aenter__()

    async def __aexit__(self, *args):
        return await self.session.__aexit__(*args)
