import asyncio
import httpx
import json
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import AuditRecord, ConfigEntry, Conversation, MessageIdempotency, SessionEvent, SessionLocal, Skill
from .customer_documents import CustomerDocumentClient
from .llm import LLMAdapter
from .knowledge import KnowledgeGatewayClient
from .ocr import OCRGatewayClient
from .platform import PlatformGatewayClient
from .principal import Principal
from .runtime import RuntimeManager
from .skills import (
    build_flow_prompt,
    build_knowledge_query,
    build_system_prompt,
    exact_quote_source_sufficient,
    resolve_skill,
    response_language_for,
)
from .tool_gateway import ToolGateway, parse_tool_request
from .umc_auth import UMCAuthClient


WELCOME_MESSAGE = """Hello! 👋 I’m your AI assistant for the National Media Authority (NMA). Tell me about your work or publishing needs, and I’ll help you find the right services.

مرحباً! 👋 أنا مساعدك الذكي من الهيئة الوطنية للإعلام (NMA). أخبرني عن عملك أو احتياجاتك للنشر، وسأساعدك في اختيار الخدمات المناسبة."""


class EventBroker:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)

    def subscribe(self, conversation_id: str) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=500)
        self._subscribers[conversation_id].add(queue)
        return queue

    def unsubscribe(self, conversation_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers[conversation_id].discard(queue)

    async def publish(self, conversation_id: str, event: dict[str, Any]) -> None:
        for queue in list(self._subscribers.get(conversation_id, ())):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Slow clients can resume from PostgreSQL using afterSeq.
                pass


class DSHService:
    def __init__(self, runtime_manager: RuntimeManager, llm: LLMAdapter, broker: EventBroker, ocr: OCRGatewayClient, knowledge: KnowledgeGatewayClient, platform: PlatformGatewayClient) -> None:
        self.runtime_manager = runtime_manager
        self.llm = llm
        self.broker = broker
        self.ocr = ocr
        self.tool_gateway = ToolGateway(ocr, knowledge, platform)
        from .config import get_settings
        self.settings = get_settings()
        self.documents = CustomerDocumentClient(self.settings)
        self.umc_auth = UMCAuthClient(self.settings)
        self._turn_tasks: dict[str, asyncio.Task[None]] = {}
        self._writer_locks: dict[str, asyncio.Lock] = {}

    @staticmethod
    def _config_value(item: ConfigEntry) -> Any:
        value = item.value
        if isinstance(value, dict) and "value" in value and len(value) == 1:
            return value["value"]
        return value

    async def apply_config_entries(self, entries: list[ConfigEntry]) -> None:
        """Apply safe, live-editable config values to the running clients.

        Database/Redis URLs are intentionally not hot-swapped: SQLAlchemy and
        Redis pools are created at process start and require a container
        restart. All other fields in the console can be used immediately for
        subsequent turns and tool calls.
        """

        restart_only = {"database_url", "redis_url"}
        numeric = {
            "llm_timeout_seconds": float,
            "knowledge_timeout_seconds": float,
            "knowledge_retry_attempts": int,
            "knowledge_top_k": int,
            "platform_timeout_seconds": float,
            "ocr_timeout_seconds": float,
            "umc_document_timeout_seconds": float,
            "audit_retention_days": int,
            "audit_cleanup_interval_seconds": int,
        }
        bool_keys = {"external_tools_enabled"}
        umc_auth_keys = {
            "umc_portal",
            "umc_customer_base_url",
            "umc_admin_base_url",
            "umc_public_base_url",
            "umc_login_url",
            "umc_login_email",
            "umc_login_password",
        }
        umc_auth_changed = False
        for item in entries:
            key = item.key
            if key in restart_only or not hasattr(self.settings, key):
                continue
            value = self._config_value(item)
            if value is None or (value == "" and key != "system_prompt"):
                continue
            try:
                if key in numeric:
                    value = numeric[key](value)
                elif key in bool_keys and isinstance(value, str):
                    value = value.strip().lower() in {"1", "true", "yes", "on", "是"}
                elif key == "umc_portal":
                    value = str(value).strip().lower()
                    if value not in {"customer", "admin", "public"}:
                        continue
            except (TypeError, ValueError):
                continue
            if key in umc_auth_keys and getattr(self.settings, key) != value:
                umc_auth_changed = True
            setattr(self.settings, key, value)

        # Keep the already-instantiated gateway clients aligned with the
        # effective config. They all read these attributes for the next call.
        self.llm.settings = self.settings
        knowledge = self.tool_gateway.knowledge
        knowledge.base_url = self.settings.knowledge_gateway_url.rstrip("/")
        knowledge.timeout = self.settings.knowledge_timeout_seconds
        knowledge.retry_attempts = max(1, int(self.settings.knowledge_retry_attempts))
        platform = self.tool_gateway.platform
        platform.base_url = self.settings.platform_gateway_url.rstrip("/")
        platform.timeout = self.settings.platform_timeout_seconds
        self.ocr.base_url = self.settings.ocr_gateway_url.rstrip("/")
        self.ocr.timeout = self.settings.ocr_timeout_seconds
        self.documents.base_url = self.settings.umc_document_service_base_url.rstrip("/")
        self.documents.timeout = self.settings.umc_document_timeout_seconds
        if umc_auth_changed:
            self.umc_auth.invalidate()

    async def parse_document(self, file: str, file_type: int | None, options: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self.ocr.layout_parsing(file, file_type=file_type, options=options)

    def writer_lock_for(self, conversation_id: str) -> asyncio.Lock:
        return self._writer_locks.setdefault(conversation_id, asyncio.Lock())

    async def create_conversation(self, db: AsyncSession, principal: Principal, workspace: str, skill_profile: str, runtime_profile: str) -> Conversation:
        conversation = Conversation(
            conversation_id=f"conv_{uuid4().hex[:20]}",
            tenant_id=principal.tenant_id,
            user_id=principal.user_id,
            dsh_session_id=f"dsh_{uuid4().hex[:20]}",
            runtime_profile=runtime_profile,
            workspace=workspace,
            skill_profile=skill_profile,
            status="READY",
            last_seq=0,
            last_activity_at=datetime.now(timezone.utc),
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        await self.append_event(
            db,
            conversation,
            "assistant.welcome",
            {"content": WELCOME_MESSAGE, "source": "conversation.initialization"},
        )
        return conversation

    async def get_owned_conversation(self, db: AsyncSession, principal: Principal, conversation_id: str) -> Conversation:
        result = await db.execute(
            select(Conversation).where(
                Conversation.conversation_id == conversation_id,
                Conversation.tenant_id == principal.tenant_id,
                Conversation.user_id == principal.user_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise LookupError("conversation not found")
        return conversation

    async def list_owned_conversations(self, db: AsyncSession, principal: Principal) -> list[Conversation]:
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.tenant_id == principal.tenant_id,
                Conversation.user_id == principal.user_id,
            )
            .order_by(Conversation.last_activity_at.desc(), Conversation.id.desc())
        )
        return list(result.scalars().all())

    async def delete_owned_conversation(
        self,
        db: AsyncSession,
        principal: Principal,
        conversation_id: str,
    ) -> None:
        conversation = await self.get_owned_conversation(db, principal, conversation_id)
        task = self._turn_tasks.pop(conversation_id, None)
        if task and not task.done():
            task.cancel()
        await self.runtime_manager.release(conversation_id)
        await db.execute(
            delete(MessageIdempotency).where(
                MessageIdempotency.conversation_id == conversation_id,
            )
        )
        await db.execute(delete(SessionEvent).where(SessionEvent.conversation_id == conversation_id))
        await db.execute(delete(AuditRecord).where(AuditRecord.conversation_id == conversation_id))
        await db.delete(conversation)
        await db.commit()

    @staticmethod
    def conversation_json(conversation: Conversation, runtime_state: str | None = None) -> dict[str, Any]:
        return {
            "conversationId": conversation.conversation_id,
            "dshSessionId": conversation.dsh_session_id,
            "workspace": conversation.workspace,
            "skillProfile": conversation.skill_profile,
            "runtimeProfile": conversation.runtime_profile,
            "runtimeId": conversation.runtime_id,
            "runtimeState": runtime_state or conversation.status,
            "status": conversation.status,
            "lastSeq": conversation.last_seq,
            "lastActivityAt": conversation.last_activity_at.isoformat() if conversation.last_activity_at else None,
            "createdAt": conversation.created_at.isoformat() if conversation.created_at else None,
            "lastError": conversation.last_error,
        }

    async def list_events(self, db: AsyncSession, conversation: Conversation, after_seq: int = 0, event_type: str | None = None) -> list[SessionEvent]:
        query = select(SessionEvent).where(SessionEvent.conversation_id == conversation.conversation_id, SessionEvent.seq > after_seq).order_by(SessionEvent.seq)
        if event_type:
            query = query.where(SessionEvent.event_type == event_type)
        return list((await db.execute(query)).scalars().all())

    async def append_event(self, db: AsyncSession, conversation: Conversation, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        conversation.last_seq += 1
        conversation.last_activity_at = datetime.now(timezone.utc)
        event = SessionEvent(
            tenant_id=conversation.tenant_id,
            user_id=conversation.user_id,
            conversation_id=conversation.conversation_id,
            dsh_session_id=conversation.dsh_session_id,
            seq=conversation.last_seq,
            event_type=event_type,
            event_json=payload,
        )
        db.add(event)
        request_id = str(payload.get("requestId") or "")[:128] or None
        runtime_id = str(payload.get("runtimeId") or "")[:128] or None
        db.add(
            AuditRecord(
                tenant_id=conversation.tenant_id,
                user_id=conversation.user_id,
                conversation_id=conversation.conversation_id,
                dsh_session_id=conversation.dsh_session_id,
                request_id=request_id,
                runtime_id=runtime_id,
                category=self.audit_category(event_type),
                record_type=event_type,
                payload=self.audit_payload(payload),
            )
        )
        await db.commit()
        result = {"seq": event.seq, "eventType": event.event_type, "data": event.event_json, "createdAt": datetime.now(timezone.utc).isoformat()}
        await self.broker.publish(conversation.conversation_id, result)
        return result

    @staticmethod
    def status_phase_for_tool(tool_name: str) -> str:
        """Map an internal tool to a safe, customer-facing progress phase."""

        if tool_name == "ocr.layout_parsing":
            return "document"
        if tool_name == "knowledge.search":
            return "knowledge"
        if tool_name.startswith("umc."):
            return "umc"
        return "service"

    @staticmethod
    def status_message(language: str, phase: str) -> str:
        """Return a short progress message without exposing prompts or reasoning."""

        messages = {
            "en": {
                "routing": "I’m reviewing your request and selecting the right NMA service…",
                "knowledge": "I’m checking the relevant NMA guidance…",
                "document": "I’m analyzing the attached document…",
                "umc": "I’m checking your NMA service information…",
                "service": "I’m checking the requested NMA service…",
                "preparing": "I’m organizing the results into a clear answer…",
                "drafting": "I’m drafting your answer…",
                "fallback": "I’m preparing a response with the information currently available…",
            },
            "ar": {
                "routing": "أراجع طلبك وأحدد خدمة الهيئة الوطنية للإعلام المناسبة…",
                "knowledge": "أتحقق من إرشادات الهيئة الوطنية للإعلام ذات الصلة…",
                "document": "أحلل المستند المرفق…",
                "umc": "أتحقق من معلومات خدمة الهيئة الوطنية للإعلام الخاصة بك…",
                "service": "أتحقق من خدمة الهيئة المطلوبة…",
                "preparing": "أنظم النتائج في إجابة واضحة…",
                "drafting": "أصيغ إجابتك الآن…",
                "fallback": "أُعد إجابة بالمعلومات المتاحة حالياً…",
            },
        }
        language_messages = messages.get(language, messages["en"])
        return language_messages.get(phase, language_messages["preparing"])

    async def append_status(
        self,
        db: AsyncSession,
        conversation: Conversation,
        phase: str,
        language: str,
        *,
        request_id: str,
    ) -> None:
        """Publish a safe progress update; never include model reasoning or prompts."""

        await self.append_event(
            db,
            conversation,
            "assistant.status",
            {
                "phase": phase,
                "state": "running",
                "message": self.status_message(language, phase),
                "requestId": request_id,
                "runtimeId": conversation.runtime_id,
            },
        )

    @staticmethod
    def audit_category(record_type: str) -> str:
        if record_type.startswith("llm."):
            return "llm"
        if record_type in {"skill.route", "tool.call", "tool.result", "turn.started", "turn.completed", "runtime.error", "turn.cancelled"}:
            return "dsh"
        if record_type.startswith("user.") or record_type.startswith("assistant."):
            return "conversation"
        return "runtime"

    @classmethod
    def audit_payload(cls, value: Any, depth: int = 0) -> Any:
        """Redact credential-shaped fields while keeping content auditable."""

        if depth > 8:
            return "[max-depth]"
        if isinstance(value, dict):
            sensitive = {"token", "access_token", "umc_token", "authorization", "password", "api_key", "providerkey", "provider_key"}
            return {
                str(key): "[redacted]" if str(key).lower() in sensitive else cls.audit_payload(item, depth + 1)
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [cls.audit_payload(item, depth + 1) for item in value]
        return value

    async def append_audit(
        self,
        db: AsyncSession,
        conversation: Conversation,
        record_type: str,
        payload: dict[str, Any],
        *,
        request_id: str | None = None,
        runtime_id: str | None = None,
    ) -> None:
        db.add(
            AuditRecord(
                tenant_id=conversation.tenant_id,
                user_id=conversation.user_id,
                conversation_id=conversation.conversation_id,
                dsh_session_id=conversation.dsh_session_id,
                request_id=(request_id or str(payload.get("requestId") or ""))[:128] or None,
                runtime_id=(runtime_id or str(payload.get("runtimeId") or ""))[:128] or None,
                category=self.audit_category(record_type),
                record_type=record_type,
                payload=self.audit_payload(payload),
            )
        )
        await db.commit()

    async def purge_expired_audit(self) -> int:
        retention_days = max(1, int(self.settings.audit_retention_days))
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        async with SessionLocal() as db:
            result = await db.execute(delete(AuditRecord).where(AuditRecord.created_at < cutoff))
            await db.commit()
            return int(result.rowcount or 0)

    async def submit_message(
        self,
        principal: Principal,
        conversation_id: str,
        content: str,
        client_message_id: str,
        attachment: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        async with self.writer_lock_for(conversation_id):
            async with SessionLocal() as db:
                conversation = await self.get_owned_conversation(db, principal, conversation_id)
                existing = await db.execute(select(MessageIdempotency).where(MessageIdempotency.conversation_id == conversation_id, MessageIdempotency.client_message_id == client_message_id))
                idem = existing.scalar_one_or_none()
                if idem:
                    return {"accepted": False, "duplicate": True, "conversationId": conversation_id, "seq": idem.user_event_seq, "requestId": principal.request_id}
                active_task = self._turn_tasks.get(conversation_id)
                if active_task and not active_task.done():
                    return {"accepted": False, "duplicate": False, "busy": True, "code": "conversation_busy", "conversationId": conversation_id, "requestId": principal.request_id}
                lease = await self.runtime_manager.ensure_runtime(conversation_id, conversation.runtime_profile)
                conversation.runtime_id = lease.runtime_id
                conversation.status = "BUSY"
                event_payload: dict[str, Any] = {
                    "content": content,
                    "clientMessageId": client_message_id,
                    "requestId": principal.request_id,
                }
                if attachment:
                    event_payload["attachment"] = attachment
                event = await self.append_event(db, conversation, "user.message", event_payload)
                db.add(MessageIdempotency(conversation_id=conversation_id, client_message_id=client_message_id, user_event_seq=event["seq"]))
                await db.commit()
                await self.runtime_manager.mark_busy(conversation_id)
                self._turn_tasks[conversation_id] = asyncio.create_task(self._run_turn(principal, conversation_id))
                return {"accepted": True, "duplicate": False, "conversationId": conversation_id, "seq": event["seq"], "requestId": principal.request_id, "runtimeId": lease.runtime_id}

    async def _run_turn(self, principal: Principal, conversation_id: str) -> None:
        async with self.writer_lock_for(conversation_id):
            try:
                async with SessionLocal() as db:
                    conversation = await self.get_owned_conversation(db, principal, conversation_id)
                    history = await self.list_events(db, conversation, after_seq=0)
                    messages = [{"role": "user" if event.event_type == "user.message" else "assistant", "content": event.event_json.get("content", "")} for event in history if event.event_type in {"user.message", "assistant.message"}]
                    await self.append_event(db, conversation, "turn.started", {"requestId": principal.request_id, "runtimeId": conversation.runtime_id})
                    latest_user = next((event for event in reversed(history) if event.event_type == "user.message"), None)
                    latest_content = latest_user.event_json.get("content", "") if latest_user else ""
                    raw_attachment = latest_user.event_json.get("attachment") if latest_user else None
                    latest_attachment = raw_attachment if isinstance(raw_attachment, dict) else None
                    response_language = response_language_for(latest_content)
                    # Send a first visible update before deterministic routing,
                    # external calls, or the LLM request can spend time waiting.
                    await self.append_status(
                        db,
                        conversation,
                        "routing",
                        response_language,
                        request_id=principal.request_id,
                    )
                    route = resolve_skill(latest_content)
                    tool_request = (
                        ("ocr.layout_parsing", {
                            "attachment": latest_attachment,
                            "fileType": latest_attachment.get("fileType"),
                        })
                        if latest_attachment
                        else parse_tool_request(latest_content) if latest_user else None
                    )
                    if not tool_request and route.category == "knowledge" and route.mode == "exact_quote" and not exact_quote_source_sufficient(latest_content):
                        # Do not retrieve and let ranking choose a random law for
                        # an unqualified exact-quotation request.
                        tool_request = None
                    elif not tool_request and route.category == "knowledge" and self.settings.knowledge_default_folder_id:
                        tool_request = (
                            "knowledge.search",
                            {
                                "query": build_knowledge_query(route, latest_content),
                                "folder_id": self.settings.knowledge_default_folder_id,
                                "top_k": self.settings.knowledge_top_k,
                            },
                        )
                    elif not tool_request and route.tool_name == "umc.application_detail":
                        match = re.search(r"(?:application\s*(?:id|number)?|申请(?:详情|ID)?)[\s:#-]*(\d{1,12})\b", latest_content, re.IGNORECASE)
                        if match:
                            tool_request = ("umc.application_detail", {"applicationId": int(match.group(1))})
                    elif not tool_request and route.tool_name == "umc.book_by_isbn":
                        match = re.search(r"\b(?:97[89][\d\s-]{9,20}|\d[\d\s-]{9,20})\b", latest_content)
                        if match:
                            isbn = re.sub(r"[\s-]", "", match.group(0))
                            if len(isbn) >= 10:
                                tool_request = ("umc.book_by_isbn", {"isbn": isbn})
                    elif tool_request and tool_request[0] == "knowledge.search":
                        tool_name, arguments = tool_request
                        arguments = dict(arguments)
                        arguments["query"] = build_knowledge_query(route, str(arguments.get("query", latest_content)))
                        tool_request = (tool_name, arguments)
                    await self.append_event(
                        db,
                        conversation,
                        "skill.route",
                        {
                            "skillId": route.skill_id,
                            "category": route.category,
                            "toolName": route.tool_name or (tool_request[0] if tool_request else None),
                            "mode": route.mode,
                            "fields": list(route.fields),
                            "requestId": principal.request_id,
                        },
                    )
                    if tool_request:
                        await self.append_status(
                            db,
                            conversation,
                            self.status_phase_for_tool(tool_request[0]),
                            response_language,
                            request_id=principal.request_id,
                        )
                    else:
                        await self.append_status(
                            db,
                            conversation,
                            "preparing",
                            response_language,
                            request_id=principal.request_id,
                        )
                    selected_skill_result = await db.execute(
                        select(Skill)
                        .where(
                            Skill.skill_id == route.skill_id,
                            Skill.scope == "system",
                            Skill.enabled.is_(True),
                            Skill.status == "PUBLISHED",
                        )
                        .order_by(Skill.version.desc())
                    )
                    selected_skill = selected_skill_result.scalars().first()
                    messages.insert(
                        0,
                        {
                            "role": "system",
                            "content": build_system_prompt(
                                route,
                                evidence_available=bool(tool_request),
                                response_language=response_language,
                                operator_prompt=str(getattr(self.settings, "system_prompt", "") or ""),
                                skill_content=selected_skill.content if selected_skill else "",
                            ),
                        },
                    )
                    if route.category in {"data_query", "api_call"}:
                        messages.insert(1, {"role": "system", "content": "FLOW INTERACTION CONSTRAINTS: " + json.dumps(build_flow_prompt(route), ensure_ascii=False)})
                    document_failure_message: str | None = None
                    if tool_request:
                        tool_name, arguments = tool_request
                        attachment_argument = arguments.get("attachment")
                        safe_arguments = {
                            "fileType": arguments.get("fileType"),
                            "hasFile": bool(arguments.get("file") or attachment_argument),
                            "attachment": {
                                "fileName": attachment_argument.get("fileName"),
                                "mimeType": attachment_argument.get("mimeType"),
                                "fileType": attachment_argument.get("fileType"),
                            } if isinstance(attachment_argument, dict) else None,
                            "query": str(arguments.get("query", ""))[:500] if "query" in arguments else None,
                            "folderId": arguments.get("folder_id") or arguments.get("folderId"),
                            "topK": arguments.get("top_k") or arguments.get("topK") or 32,
                            "pageIndex": arguments.get("page_index") or arguments.get("pageIndex"),
                            "pageSize": arguments.get("page_size") or arguments.get("pageSize"),
                            "applicationId": arguments.get("applicationId") or arguments.get("application_id"),
                            "isbn": str(arguments.get("isbn", ""))[:32] if "isbn" in arguments else None,
                            "parameterKeys": sorted(arguments.get("parameters", {}).keys()) if isinstance(arguments.get("parameters"), dict) else None,
                        }
                        await self.append_event(db, conversation, "tool.call", {"toolName": tool_name, "arguments": safe_arguments, "requestId": principal.request_id})
                        if not self.settings.external_tools_enabled:
                            tool_result = {"ok": False, "code": "external_tools_disabled", "toolName": tool_name}
                        elif isinstance(attachment_argument, dict):
                            try:
                                document_base64 = await self.documents.as_base64(
                                    str(attachment_argument.get("fileRef", "")),
                                    mime_type=str(attachment_argument.get("mimeType", "")),
                                    umc_token=principal.umc_token,
                                )
                                tool_result = await self.tool_gateway.invoke(
                                    principal,
                                    tool_name,
                                    {
                                        "file": document_base64,
                                        "fileType": attachment_argument.get("fileType"),
                                    },
                                )
                            except (httpx.HTTPError, PermissionError, RuntimeError, ValueError) as exc:
                                tool_result = {
                                    "ok": False,
                                    "code": "tool_unavailable",
                                    "toolName": tool_name,
                                    "error": str(exc)[:500],
                                }
                        else:
                            tool_result = await self.tool_gateway.invoke(principal, tool_name, arguments)
                        result_for_event = dict(tool_result)
                        if isinstance(result_for_event.get("result"), dict):
                            result_for_event["result"] = json.dumps(result_for_event["result"], ensure_ascii=False)[:20_000]
                        await self.append_event(db, conversation, "tool.result", result_for_event)
                        await self.append_status(
                            db,
                            conversation,
                            "fallback" if not tool_result.get("ok") else "preparing",
                            response_language,
                            request_id=principal.request_id,
                        )
                        if latest_attachment and not tool_result.get("ok"):
                            document_failure_message = (
                                "تعذر علي قراءة الملف المرفق لأن خدمة تحليل المستندات غير متاحة حالياً. "
                                "يرجى المحاولة مرة أخرى بعد توفر خدمة OCR."
                                if response_language == "ar"
                                else "I could not read the attached file because document analysis is unavailable right now. Please try again after the OCR service is available."
                            )
                        elif latest_attachment and not latest_content.strip():
                            messages.append({
                                "role": "user",
                                "content": "The user uploaded a document without a written question. Extract the relevant information from the OCR result and give a concise, NMA-focused summary.",
                            })
                        if not document_failure_message:
                            messages.append({"role": "user", "content": f"Tool {tool_name} result: {json.dumps(tool_result, ensure_ascii=False)[:20_000]}"})
                    if document_failure_message:
                        await self.append_event(db, conversation, "assistant.message", {"content": document_failure_message, "requestId": principal.request_id})
                    else:
                        await self.append_status(
                            db,
                            conversation,
                            "drafting",
                            response_language,
                            request_id=principal.request_id,
                        )
                        llm_started = time.perf_counter()
                        await self.append_audit(
                            db,
                            conversation,
                            "llm.request",
                            {
                                "requestId": principal.request_id,
                                "runtimeId": conversation.runtime_id,
                                "model": self.settings.llm_model,
                                "baseUrl": self.settings.llm_base_url,
                                "stream": True,
                                "messages": messages,
                            },
                            request_id=principal.request_id,
                            runtime_id=conversation.runtime_id,
                        )
                        chunks: list[str] = []
                        reasoning_chunks: list[str] = []

                        async def capture_reasoning(value: str) -> None:
                            reasoning_chunks.append(value)

                        try:
                            async for token in self.llm.stream(messages, on_reasoning=capture_reasoning):
                                chunks.append(token)
                                await self.append_event(db, conversation, "assistant.chunk", {"content": token, "requestId": principal.request_id, "runtimeId": conversation.runtime_id})
                        except Exception as exc:
                            await self.append_audit(
                                db,
                                conversation,
                                "llm.error",
                                {
                                    "requestId": principal.request_id,
                                    "runtimeId": conversation.runtime_id,
                                    "error": str(exc)[:500],
                                    "durationMs": round((time.perf_counter() - llm_started) * 1000, 1),
                                },
                                request_id=principal.request_id,
                                runtime_id=conversation.runtime_id,
                            )
                            raise
                        content = "".join(chunks)
                        reasoning = "".join(reasoning_chunks)
                        await self.append_audit(
                            db,
                            conversation,
                            "llm.response",
                            {
                                "requestId": principal.request_id,
                                "runtimeId": conversation.runtime_id,
                                "model": self.settings.llm_model,
                                "content": content,
                                "reasoning": reasoning,
                                "durationMs": round((time.perf_counter() - llm_started) * 1000, 1),
                            },
                            request_id=principal.request_id,
                            runtime_id=conversation.runtime_id,
                        )
                        if reasoning:
                            await self.append_audit(
                                db,
                                conversation,
                                "llm.thought",
                                {"requestId": principal.request_id, "runtimeId": conversation.runtime_id, "content": reasoning},
                                request_id=principal.request_id,
                                runtime_id=conversation.runtime_id,
                            )
                        await self.append_event(db, conversation, "assistant.message", {"content": content, "requestId": principal.request_id})
                    await self.append_event(db, conversation, "turn.completed", {"requestId": principal.request_id, "runtimeId": conversation.runtime_id})
                    conversation.status = "READY"
                    conversation.last_activity_at = datetime.now(timezone.utc)
                    await db.commit()
                lease = self.runtime_manager.get(conversation_id)
                if lease:
                    lease.state = "READY"
            except Exception as exc:
                async with SessionLocal() as db:
                    try:
                        conversation = await self.get_owned_conversation(db, principal, conversation_id)
                        conversation.status = "DEAD"
                        conversation.last_error = str(exc)[:1_000]
                        await self.append_event(db, conversation, "runtime.error", {"requestId": principal.request_id, "error": str(exc)[:500]})
                        await db.commit()
                    except Exception:
                        pass

    async def cancel(self, principal: Principal, conversation_id: str) -> None:
        task = self._turn_tasks.get(conversation_id)
        if task and not task.done():
            task.cancel()
        async with self.writer_lock_for(conversation_id):
            async with SessionLocal() as db:
                conversation = await self.get_owned_conversation(db, principal, conversation_id)
                conversation.status = "READY"
                await self.append_event(db, conversation, "turn.cancelled", {"requestId": principal.request_id})
                await db.commit()
