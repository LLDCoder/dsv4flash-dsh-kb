import asyncio
import base64
import json
from collections.abc import AsyncIterator
from uuid import uuid4

import httpx

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import config_catalog, get_settings
from .customer_documents import CustomerDocumentNotConfigured
from .db import AuditRecord, ConfigEntry, Conversation, MessageIdempotency, SessionEvent, Skill, get_db
from .principal import Principal, _bearer_token, _token_reference, get_principal
from .schemas import ConfigPatch, ConversationCreate, MessageCreate, SkillUpsert, TestCaseGenerateRequest, TestCaseRunRequest, WSMessage
from .service import DSHService
from .testcases import generate_test_cases, run_test_cases
from .umc_auth import UMCAuthError


def make_router(service: DSHService) -> APIRouter:
    router = APIRouter(prefix="/api/v1")

    def raw_config_value(item: ConfigEntry) -> object:
        value = item.value
        if isinstance(value, dict) and "value" in value and len(value) == 1:
            return value["value"]
        return value

    async def chat_principal(
        request: Request,
        x_user_id: str | None = Header(default=None),
        x_tenant_id: str | None = Header(default=None),
        x_request_id: str | None = Header(default=None),
        authorization: str | None = Header(default=None),
    ) -> Principal:
        """Compatibility identity for the 18085 customer chatbot contract.

        The gateway normally injects X-User-Id.  The browser chatbot only has
        the UMC bearer token, so derive a stable user id from its JWT claims
        when the trusted header is absent.  The token itself is still kept
        request-scoped and forwarded to UMC tools by DSHService.
        """
        user_id = x_user_id
        raw = _bearer_token(authorization)
        if not user_id and raw:
            try:
                part = raw.split(".")[1]
                part += "=" * (-len(part) % 4)
                claims = json.loads(base64.urlsafe_b64decode(part).decode("utf-8"))
                user_id = claims.get("umc_user_id") or claims.get("user_id") or claims.get("UserID") or claims.get("sub")
            except (ValueError, KeyError, IndexError, UnicodeDecodeError, json.JSONDecodeError):
                user_id = None
        if not user_id:
            raise HTTPException(status_code=401, detail="missing chatbot session token")
        return Principal(
            user_id=str(user_id),
            tenant_id=x_tenant_id or f"umc:global:{user_id}",
            request_id=x_request_id or str(uuid4()),
            token_ref=_token_reference(authorization),
            umc_token=raw,
        )

    @router.get("/ai-chat/config", tags=["Chatbot compatibility"])
    async def ai_chat_config(principal: Principal = Depends(chat_principal)):
        return {
            "enabled": True,
            "streaming": True,
            "name": "NMA Assistant",
            "description": "National Media Authority assistant",
            "suggested_questions": [],
        }

    @router.get("/ai-chat/conversations", tags=["Chatbot compatibility"])
    async def ai_chat_conversations(db: AsyncSession = Depends(get_db), principal: Principal = Depends(chat_principal)):
        result = await db.execute(select(Conversation).where(Conversation.tenant_id == principal.tenant_id, Conversation.user_id == principal.user_id).order_by(Conversation.last_activity_at.desc()))
        return {"conversations": [service.conversation_json(item) for item in result.scalars().all()]}

    @router.get("/ai-chat/conversations/{conversation_id}/messages", tags=["Chatbot compatibility"])
    async def ai_chat_messages(conversation_id: str, db: AsyncSession = Depends(get_db), principal: Principal = Depends(chat_principal)):
        try:
            conversation = await service.get_owned_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        events = await service.list_events(db, conversation, after_seq=0)
        messages = []
        for event in events:
            if event.event_type not in {"user.message", "assistant.message"}:
                continue
            messages.append({"id": f"{conversation_id}:{event.seq}", "role": "user" if event.event_type == "user.message" else "assistant", "content": event.event_json.get("content", ""), "created_at": event.created_at.isoformat() if event.created_at else None})
        return {"conversation_id": conversation_id, "messages": messages}

    @router.delete("/ai-chat/conversations/{conversation_id}", tags=["Chatbot compatibility"])
    async def ai_chat_delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db), principal: Principal = Depends(chat_principal)):
        try:
            conversation = await service.get_owned_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        await db.execute(delete(SessionEvent).where(SessionEvent.conversation_id == conversation_id))
        await db.execute(delete(AuditRecord).where(AuditRecord.conversation_id == conversation_id))
        await db.execute(delete(MessageIdempotency).where(MessageIdempotency.conversation_id == conversation_id))
        await db.delete(conversation)
        await db.commit()
        return {"deleted": True, "conversation_id": conversation_id}

    @router.post("/ai-chat/messages/stream", tags=["Chatbot compatibility"])
    async def ai_chat_stream(request: Request, db: AsyncSession = Depends(get_db), principal: Principal = Depends(chat_principal)):
        payload = await request.json()
        content = str(payload.get("message") or "").strip()
        if not content:
            raise HTTPException(status_code=422, detail="message is required")
        conversation_id = request.headers.get("X-FF-Conversation-ID") or payload.get("conversation_id")
        if conversation_id:
            try:
                conversation = await service.get_owned_conversation(db, principal, str(conversation_id))
            except LookupError as exc:
                raise HTTPException(status_code=404, detail=str(exc)) from exc
        else:
            conversation = await service.create_conversation(db, principal, "default", "default", "default")
            conversation_id = conversation.conversation_id
        client_message_id = str(payload.get("request_id") or uuid4())
        queue = service.broker.subscribe(str(conversation_id))
        try:
            accepted = await service.submit_message(principal, str(conversation_id), content, client_message_id)
        except LookupError as exc:
            service.broker.unsubscribe(str(conversation_id), queue)
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        async def stream() -> AsyncIterator[str]:
            yield f"event: accepted\ndata: {json.dumps(accepted, ensure_ascii=False)}\n\n"
            try:
                while True:
                    event = await asyncio.wait_for(queue.get(), timeout=max(120.0, service.settings.llm_timeout_seconds + 30.0))
                    event_type = event.get("eventType")
                    data = event.get("data") or {}
                    if event_type == "assistant.chunk":
                        yield f"event: token\ndata: {data.get('content', '')}\n\n"
                    elif event_type == "runtime.error":
                        yield f"event: error\ndata: {json.dumps({'detail': data.get('error', 'runtime error')}, ensure_ascii=False)}\n\n"
                        yield "event: end\ndata: [DONE]\n\n"
                        break
                    elif event_type in {"turn.completed", "turn.cancelled"}:
                        yield "event: end\ndata: [DONE]\n\n"
                        break
            except asyncio.TimeoutError:
                yield "event: error\ndata: {\"detail\":\"chat response timed out\"}\n\n"
                yield "event: end\ndata: [DONE]\n\n"
            finally:
                service.broker.unsubscribe(str(conversation_id), queue)

        return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "X-FF-Conversation-ID": str(conversation_id)})

    @router.post("/conversations")
    async def create_conversation(payload: ConversationCreate, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        conversation = await service.create_conversation(db, principal, payload.workspace, payload.skill_profile, payload.runtime_profile)
        return service.conversation_json(conversation)

    @router.post("/umc/session")
    async def get_umc_session(refresh: bool = Query(default=False), principal: Principal = Depends(get_principal)):
        """Return a cached UMC token for the configured service account.

        The raw token is necessary for the browser WebSocket and upload proxy,
        but it is held only in the page and backend memory; it is not stored in
        conversation events or returned by the configuration API.
        """
        try:
            return await service.umc_auth.get_session(force_refresh=refresh)
        except UMCAuthError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @router.post("/umc/documents/upload")
    async def upload_umc_document(file: UploadFile = File(...), principal: Principal = Depends(get_principal)):
        """Proxy attachment uploads through the selected UMC portal backend."""

        if not principal.umc_token:
            raise HTTPException(status_code=401, detail="UMC authentication is required to upload a document")
        try:
            content = await file.read()
            status_code, payload = await service.documents.upload(
                file.filename or "attachment",
                content,
                mime_type=file.content_type,
                umc_token=principal.umc_token,
            )
        except CustomerDocumentNotConfigured as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except PermissionError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"UMC upload failed: {exc.__class__.__name__}") from exc
        if status_code >= 400:
            detail = payload if isinstance(payload, (dict, list, str)) else "UMC upload failed"
            raise HTTPException(status_code=status_code, detail=detail)
        return payload if isinstance(payload, (dict, list)) else {"data": payload}

    @router.get("/conversations")
    async def list_conversations(db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        conversations = await service.list_owned_conversations(db, principal)
        items: list[dict] = []
        for conversation in conversations:
            events = await service.list_events(db, conversation, event_type="user.message")
            title = ""
            if events:
                title = str(events[0].event_json.get("content", "")).strip()[:160]
            items.append({**service.conversation_json(conversation), "title": title})
        return {"conversations": items}

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
                payload.attachment.model_dump(by_alias=True) if payload.attachment else None,
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
        limit: int = Query(default=500, ge=1, le=2000),
        db: AsyncSession = Depends(get_db),
        principal: Principal = Depends(get_principal),
    ):
        """Return the persisted execution trail for one owned conversation."""

        try:
            conversation = await service.get_owned_conversation(db, principal, conversation_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        query = select(AuditRecord).where(
            AuditRecord.conversation_id == conversation_id,
            AuditRecord.tenant_id == principal.tenant_id,
            AuditRecord.user_id == principal.user_id,
        )
        if category:
            query = query.where(AuditRecord.category == category.strip().lower())
        query = query.order_by(AuditRecord.created_at.asc(), AuditRecord.id.asc()).limit(limit)
        result = await db.execute(query)

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

        items = [record_json(record) for record in result.scalars().all()]
        source = "audit_record"
        # Conversations created before chain-audit was enabled have no rows in
        # audit_record. Reuse their immutable session events so operators can
        # still inspect the historical dialogue and execution flow.
        if not items:
            event_query = select(SessionEvent).where(
                SessionEvent.conversation_id == conversation_id,
                SessionEvent.tenant_id == principal.tenant_id,
                SessionEvent.user_id == principal.user_id,
            ).order_by(SessionEvent.created_at.asc(), SessionEvent.id.asc())
            event_result = await db.execute(event_query)
            for event in event_result.scalars().all():
                event_category = service.audit_category(event.event_type)
                if category and event_category != category.strip().lower():
                    continue
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
            items = items[:limit]
            source = "session_event_history"
        return {
            "conversation": service.conversation_json(conversation),
            "conversationId": conversation_id,
            "items": items,
            "count": len(items),
            "limit": limit,
            "category": category.strip().lower() if category else None,
            "source": source,
        }

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
    async def list_skills(scope: str | None = None, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        query = select(Skill).order_by(Skill.skill_id, Skill.version.desc())
        if scope:
            query = query.where(Skill.scope == scope)
        result = await db.execute(query)
        return {"items": [{"skillId": item.skill_id, "name": item.name, "version": item.version, "source": item.source, "status": item.status, "scope": item.scope, "enabled": item.enabled, "allowedTools": item.allowed_tools, "dependencies": item.dependencies, "content": item.content, "updatedBy": item.updated_by} for item in result.scalars().all()]}

    @router.put("/skills/{skill_id}")
    async def upsert_skill(skill_id: str, payload: SkillUpsert, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        result = await db.execute(select(Skill).where(Skill.skill_id == skill_id, Skill.version == payload.version))
        item = result.scalar_one_or_none()
        values = payload.model_dump()
        if item:
            for key, value in values.items():
                setattr(item, key, value)
            item.updated_by = principal.user_id
        else:
            item = Skill(skill_id=skill_id, updated_by=principal.user_id, **values)
            db.add(item)
        await db.commit()
        return {"skillId": item.skill_id, "version": item.version, "status": item.status, "enabled": item.enabled}

    @router.delete("/skills/{skill_id}")
    async def delete_skill(skill_id: str, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        result = await db.execute(delete(Skill).where(Skill.skill_id == skill_id))
        await db.commit()
        return {"deleted": result.rowcount > 0, "skillId": skill_id}

    @router.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        user_id = websocket.headers.get("x-user-id") or ""
        # Browser WebSockets cannot set trusted identity headers. Keep a
        # provisional principal until the UMC token is validated server-side.
        principal = Principal(
            user_id=user_id or "",
            tenant_id=websocket.headers.get("x-tenant-id") or "default",
            request_id=websocket.headers.get("x-request-id", "ws"),
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
                    if not claims_user_id:
                        settings = get_settings()
                        base_url = (settings.umc_document_base_url or settings.umc_login_url.rsplit("/api/", 1)[0]).rstrip("/")
                        try:
                            async with httpx.AsyncClient(timeout=settings.umc_login_timeout_seconds) as client:
                                response = await client.post(f"{base_url}/api/User/GetUserInfo", headers={"Authorization": f"Bearer {token}"}, json={})
                            payload = response.json()
                            def find_user_id(value):
                                if isinstance(value, dict):
                                    for key in ("UserID", "UserId", "userId", "userID", "id"):
                                        candidate = value.get(key)
                                        if isinstance(candidate, (str, int)) and str(candidate).strip():
                                            return str(candidate)
                                    for child in value.values():
                                        found = find_user_id(child)
                                        if found: return found
                                elif isinstance(value, list):
                                    for child in value:
                                        found = find_user_id(child)
                                        if found: return found
                                return None
                            claims_user_id = find_user_id(payload)
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
                        tenant_id=f"umc:global:{claims_user_id}",
                        request_id=principal.request_id,
                        token_ref=_token_reference(f"Bearer {token}"),
                        umc_token=token,
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
                            message.attachment.model_dump(by_alias=True) if message.attachment else None,
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
