import asyncio
import base64
import hmac
import json
import logging
from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import parse_qs
from uuid import uuid4

import httpx

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import String, cast, delete, func, not_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from .config import config_catalog, get_settings
from .console_auth import CONSOLE_PASSWORD_CONFIG_KEY, CONSOLE_SESSION_COOKIE, CONSOLE_SESSION_MAX_AGE_SECONDS, issue_session, verify_session
from .customer_documents import CustomerDocumentNotConfigured
from .db import AuditRecord, ConfigEntry, Conversation, MessageIdempotency, SessionEvent, Skill, Tool, get_db
from .principal import Principal, _bearer_token, _token_reference, get_principal
from .profile_scope import normalize_profile_scope
from .schemas import ConfigPatch, ConsoleLogin, ConversationCreate, MessageCreate, SkillCreate, SkillUpsert, SwaggerImportRequest, TestCaseGenerateRequest, TestCaseRunRequest, ToolCreate, ToolUpsert, WSMessage
from .service import DSHService
from .testcases import generate_test_cases, run_test_cases
from .tool_registry import SYSTEM_DEFAULT_TOOL_NAMES, extract_operations, interface_key, is_system_default_tool, system_default_tool_definitions
from .umc_auth import UMCAuthError

# Uvicorn configures this logger at INFO for container output. Using it keeps
# correlation records visible without changing the global logging policy.
logger = logging.getLogger("uvicorn.error")


def make_router(service: DSHService) -> APIRouter:
    router = APIRouter(prefix="/api/v1")

    def token_profile_id(token: str | None) -> str | None:
        if not token:
            return None
        try:
            part = token.split(".")[1]
            part += "=" * (-len(part) % 4)
            claims = json.loads(base64.urlsafe_b64decode(part).decode("utf-8"))
            value = claims.get("UserProFileId")
            return str(value).strip() if isinstance(value, (str, int)) and str(value).strip() else None
        except (ValueError, KeyError, IndexError, UnicodeDecodeError, json.JSONDecodeError):
            return None

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
            profile_id=token_profile_id(raw),
        )

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
        """Stream a customer-chat turn.

        A clearly linked application follow-up after a Refund or Complaints
        detail may be handed off to the read-only My Requests application
        Skill.  The service uses only an application identifier present in the
        prior verified detail result; it never guesses or performs a write.
        """
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
                    elif event_type == "assistant.status":
                        # Additive, safe progress event for SSE clients. It
                        # contains no prompts, tool arguments, or raw reasoning.
                        yield f"event: status\ndata: {json.dumps({'phase': data.get('phase'), 'state': data.get('state'), 'message': data.get('message')}, ensure_ascii=False)}\n\n"
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
            session = await service.umc_auth.get_session(force_refresh=refresh)
            token = session.get("token") if isinstance(session, dict) else None
            logger.info(
                "umc_session_issued request_id=%s token_ref=%s refresh=%s",
                principal.request_id,
                _token_reference(f"Bearer {token}") if isinstance(token, str) else None,
                refresh,
            )
            return session
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
        """Submit a conversation turn with read-only cross-Skill handoff support.

        When a Refund or Complaints detail has a verified related application,
        a follow-up explicitly asking for that application's status or details
        is routed to the existing My Requests Skill.  If the identifier is not
        present, the response asks for an application number instead of
        querying unrelated records.

        """
        try:
            return await service.submit_message(
                principal,
                conversation_id,
                payload.content,
                payload.client_message_id,
                payload.attachment.model_dump(by_alias=True) if payload.attachment else None,
                payload.profile_context,
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
        fallback_options = await knowledge_fallback_options(db)
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
                    "options": fallback_options if spec.get("dynamicOptions") == "knowledge_fallback_skills" else list(spec.get("options", [])),
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
            if key == "skill_router_fallback_skill_id":
                valid_ids = {item["value"] for item in await knowledge_fallback_options(db)}
                if not isinstance(value, str) or value not in valid_ids:
                    raise HTTPException(status_code=422, detail={"code": "invalid_knowledge_fallback", "message": "fallback Skill must be published, enabled, and only bind knowledge.search"})
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
        skill_match = text_match(search, Skill.skill_id, Skill.name, Skill.source, Skill.status, Skill.scope, Skill.domain, Skill.content, cast(Skill.aliases, String))
        if skill_match is not None:
            query = query.where(skill_match)
        items, total = await paged_items(db, query, page=page, page_size=page_size)
        return {
            "items": [{"skillId": item.skill_id, "name": item.name, "version": item.version, "source": item.source, "status": item.status, "scope": item.scope, "enabled": item.enabled, "allowedTools": item.allowed_tools, "dependencies": item.dependencies, "domain": item.domain, "aliases": item.aliases, "positiveExamples": item.positive_examples, "negativeExamples": item.negative_examples, "workflow": item.workflow, "content": item.content, "updatedBy": item.updated_by} for item in items],
            "search": (search or "").strip() or None,
            **pagination_json(total, page, page_size),
        }

    def tool_json(item: Tool) -> dict[str, Any]:
        return {
            "toolName": item.tool_name,
            "displayName": item.display_name,
            "description": item.description,
            "operationId": item.operation_id,
            "httpMethod": item.http_method,
            "httpPath": item.http_path,
            "interfaceKey": item.interface_key,
            "parameters": item.parameters,
            "responseSchema": item.response_schema,
            "authStrategy": item.auth_strategy,
            "sideEffect": item.side_effect,
            "confirmationRequired": item.confirmation_required,
            "rbacPolicy": item.rbac_policy,
            "maskingPolicy": item.masking_policy,
            "profileScope": item.profile_scope,
            "swaggerSource": item.swagger_source,
            "source": item.source,
            "version": item.version,
            "enabled": item.enabled,
            "published": item.published,
            "updatedBy": item.updated_by,
            "toolType": "business",
            "mutable": True,
        }

    def system_tool_json(item: dict[str, Any]) -> dict[str, Any]:
        return dict(item)

    async def available_published_tools(db: AsyncSession) -> set[str]:
        result = await db.execute(
            select(Tool.tool_name).where(
                ~Tool.tool_name.in_(SYSTEM_DEFAULT_TOOL_NAMES),
                Tool.enabled.is_(True),
                Tool.published.is_(True),
            )
        )
        available = set(result.scalars().all())
        available.update(
            item["toolName"]
            for item in system_default_tool_definitions(service.settings)
            if item.get("enabled") and item.get("published")
        )
        return available

    async def knowledge_fallback_options(db: AsyncSession) -> list[dict[str, str]]:
        result = await db.execute(
            select(Skill)
            .where(Skill.scope == "system", Skill.status == "PUBLISHED", Skill.enabled.is_(True))
            .order_by(Skill.name, Skill.skill_id)
        )
        return [
            {"value": item.skill_id, "label": f"{item.name} ({item.skill_id})"}
            for item in result.scalars().all()
            if set(item.allowed_tools or []) == {"knowledge.search"}
        ]

    async def fetch_swagger(swagger_url: str) -> dict[str, Any]:
        if not swagger_url.lower().startswith(("http://", "https://")):
            raise HTTPException(status_code=422, detail="swaggerUrl must use http:// or https://")
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                response = await client.get(swagger_url, headers={"Accept": "application/json"})
                response.raise_for_status()
                document = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise HTTPException(status_code=502, detail=f"unable to read Swagger document: {exc}") from exc
        if not isinstance(document, dict) or not isinstance(document.get("paths"), dict):
            raise HTTPException(status_code=422, detail="Swagger document must contain an OpenAPI paths object")
        return document

    @router.get("/tools")
    async def list_tools(
        search: str | None = Query(default=None, max_length=160),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=25, ge=1, le=100, alias="pageSize"),
        db: AsyncSession = Depends(get_db),
        _: None = Depends(require_console_session),
    ):
        term = (search or "").strip().lower()
        system_items = [system_tool_json(item) for item in system_default_tool_definitions(service.settings)]
        if term:
            system_items = [
                item for item in system_items
                if term in " ".join(str(item.get(key, "")) for key in ("toolName", "displayName", "description", "httpMethod", "httpPath", "operationId")).lower()
            ]
        system_items.sort(key=lambda item: str(item.get("toolName", "")))
        query = (
            select(Tool)
            .where(~Tool.tool_name.in_(SYSTEM_DEFAULT_TOOL_NAMES))
            .order_by(Tool.tool_name, Tool.version.desc())
        )
        tool_match = text_match(search, Tool.tool_name, Tool.display_name, Tool.description, Tool.operation_id, Tool.http_method, Tool.http_path)
        if tool_match is not None:
            query = query.where(tool_match)
        business_total = int((await db.execute(select(func.count()).select_from(query.order_by(None).subquery()))).scalar_one())
        offset = (page - 1) * page_size
        items = system_items[offset:offset + page_size]
        remaining = page_size - len(items)
        if remaining:
            business_offset = max(0, offset - len(system_items))
            result = await db.execute(query.offset(business_offset).limit(remaining))
            items.extend(tool_json(item) for item in result.scalars().all())
        total = len(system_items) + business_total
        return {"items": items, "search": (search or "").strip() or None, **pagination_json(total, page, page_size)}

    @router.get("/tools/swagger")
    async def inspect_swagger(swagger_url: str = Query(alias="swaggerUrl"), _: None = Depends(require_console_session)):
        document = await fetch_swagger(swagger_url)
        return {"swaggerUrl": swagger_url, "items": extract_operations(document, swagger_url)}

    @router.post("/tools", status_code=201)
    async def create_tool(payload: ToolCreate, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal), _: None = Depends(require_console_session)):
        if is_system_default_tool(payload.tool_name):
            raise HTTPException(status_code=422, detail="system default capabilities are managed by runtime configuration")
        key = payload.interface_key or interface_key(payload.http_method, payload.http_path)
        if (await db.execute(select(Tool).where((Tool.tool_name == payload.tool_name) | (Tool.interface_key == key)))).scalars().first():
            raise HTTPException(status_code=409, detail="tool name or HTTP interface already exists")
        values = payload.model_dump(exclude={"tool_name", "interface_key"})
        values["profile_scope"] = normalize_profile_scope(values.get("profile_scope"), parameters=values.get("parameters"), http_path=str(values.get("http_path") or ""))
        item = Tool(tool_name=payload.tool_name, updated_by=principal.user_id, interface_key=key, **values)
        db.add(item)
        await db.commit()
        return tool_json(item)

    @router.post("/tools/import", status_code=201)
    async def import_tool(payload: SwaggerImportRequest, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal), _: None = Depends(require_console_session)):
        document = await fetch_swagger(payload.swagger_url)
        operations = extract_operations(document, payload.swagger_url)
        operation = next((item for item in operations if item["operationId"] == payload.operation_id), None)
        if not operation:
            raise HTTPException(status_code=404, detail=f"operationId {payload.operation_id} not found in Swagger document")
        tool_name = payload.tool_name or f"swagger.{operation['operationId']}"
        if is_system_default_tool(tool_name):
            raise HTTPException(status_code=422, detail="system default capabilities cannot be imported into the business Tool Registry")
        result = await db.execute(select(Tool).where((Tool.tool_name == tool_name) | (Tool.interface_key == operation["interfaceKey"])))
        if result.scalars().first():
            raise HTTPException(status_code=409, detail="this HTTP interface or tool name is already registered")
        item = Tool(
            tool_name=tool_name,
            display_name=payload.display_name or operation["displayName"],
            description=payload.description or operation["description"],
            operation_id=operation["operationId"],
            http_method=operation["httpMethod"],
            http_path=operation["httpPath"],
            interface_key=operation["interfaceKey"],
            parameters=operation["parameters"],
            response_schema=operation["responseSchema"],
            profile_scope=operation["profileScope"],
            side_effect=payload.side_effect,
            confirmation_required=payload.confirmation_required,
            swagger_source=payload.swagger_url,
            enabled=payload.enabled,
            published=payload.published,
            updated_by=principal.user_id,
        )
        db.add(item)
        await db.commit()
        return tool_json(item)

    @router.put("/tools/{tool_name:path}")
    async def update_tool(tool_name: str, payload: ToolUpsert, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal), _: None = Depends(require_console_session)):
        if is_system_default_tool(tool_name):
            raise HTTPException(status_code=422, detail="system default capabilities are managed by runtime configuration")
        result = await db.execute(select(Tool).where(Tool.tool_name == tool_name))
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="tool not found")
        key = payload.interface_key or interface_key(payload.http_method, payload.http_path)
        duplicate = await db.execute(select(Tool).where(Tool.interface_key == key, Tool.tool_name != tool_name))
        if duplicate.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="this HTTP interface is already registered by another tool")
        values = payload.model_dump(exclude={"interface_key"})
        values["profile_scope"] = normalize_profile_scope(values.get("profile_scope"), parameters=values.get("parameters"), http_path=str(values.get("http_path") or ""))
        for field, value in values.items():
            setattr(item, field, value)
        item.interface_key = key
        item.updated_by = principal.user_id
        await db.commit()
        return tool_json(item)

    @router.post("/skills", status_code=201)
    async def create_skill(payload: SkillCreate, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        if payload.status == "PUBLISHED" and payload.allowed_tools:
            available = await available_published_tools(db)
            missing = sorted(set(payload.allowed_tools) - available)
            if missing:
                raise HTTPException(status_code=422, detail={"code": "unpublished_tools", "tools": missing})
        result = await db.execute(select(Skill).where(Skill.skill_id == payload.skill_id, Skill.version == payload.version))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"skill {payload.skill_id} v{payload.version} already exists")
        values = payload.model_dump(exclude={"skill_id"})
        item = Skill(skill_id=payload.skill_id, updated_by=principal.user_id, **values)
        db.add(item)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(status_code=409, detail=f"skill {payload.skill_id} v{payload.version} already exists") from exc
        await service.skill_catalog.invalidate()
        return {"skillId": item.skill_id, "version": item.version, "status": item.status, "enabled": item.enabled}

    @router.put("/skills/{skill_id}")
    async def upsert_skill(skill_id: str, payload: SkillUpsert, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        if payload.status == "PUBLISHED" and payload.allowed_tools:
            available = await available_published_tools(db)
            missing = sorted(set(payload.allowed_tools) - available)
            if missing:
                raise HTTPException(status_code=422, detail={"code": "unpublished_tools", "tools": missing})
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
        await service.skill_catalog.invalidate()
        return {"skillId": item.skill_id, "version": item.version, "status": item.status, "enabled": item.enabled}

    @router.delete("/skills/{skill_id}")
    async def delete_skill(skill_id: str, db: AsyncSession = Depends(get_db), principal: Principal = Depends(get_principal)):
        result = await db.execute(delete(Skill).where(Skill.skill_id == skill_id))
        await db.commit()
        await service.skill_catalog.invalidate()
        return {"deleted": result.rowcount > 0, "skillId": skill_id}

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
                    if not claims_user_id:
                        settings = get_settings()
                        # Use the portal-aware derived URL. It honors an explicit
                        # document-service override and otherwise falls back to
                        # the selected customer/admin portal base URL.
                        base_url = settings.umc_document_service_base_url.rstrip("/")
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
                        # Preserve the tenant selected by the trusted gateway
                        # or local console.  REST conversation creation uses
                        # this same tenant value; replacing it with a global
                        # UMC tenant made every browser subscription fail with
                        # ``conversation_not_found``.
                        tenant_id=principal.tenant_id or f"umc:global:{claims_user_id}",
                        request_id=principal.request_id,
                        token_ref=_token_reference(f"Bearer {token}"),
                        umc_token=token,
                        profile_id=token_profile_id(token),
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
                            message.attachment.model_dump(by_alias=True) if message.attachment else None,
                            message.profile_context,
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
