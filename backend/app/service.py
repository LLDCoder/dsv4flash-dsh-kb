import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import ConfigEntry, Conversation, MessageIdempotency, SessionEvent, SessionLocal
from .llm import LLMAdapter
from .knowledge import KnowledgeGatewayClient
from .ocr import OCRGatewayClient
from .platform import PlatformGatewayClient
from .principal import Principal
from .runtime import RuntimeManager
from .skills import build_flow_prompt, build_knowledge_query, build_system_prompt, exact_quote_source_sufficient, resolve_skill
from .tool_gateway import ToolGateway, parse_tool_request


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
        }
        bool_keys = {"external_tools_enabled"}
        for item in entries:
            key = item.key
            if key in restart_only or not hasattr(self.settings, key):
                continue
            value = self._config_value(item)
            if value is None or value == "":
                continue
            try:
                if key in numeric:
                    value = numeric[key](value)
                elif key in bool_keys and isinstance(value, str):
                    value = value.strip().lower() in {"1", "true", "yes", "on", "是"}
            except (TypeError, ValueError):
                continue
            setattr(self.settings, key, value)

        # Keep the already-instantiated gateway clients aligned with the
        # effective config. They all read these attributes for the next call.
        self.llm.settings = self.settings
        knowledge = self.tool_gateway.knowledge
        knowledge.base_url = self.settings.knowledge_gateway_url.rstrip("/")
        knowledge.timeout = self.settings.knowledge_timeout_seconds
        knowledge.retry_attempts = max(1, int(self.settings.knowledge_retry_attempts))
        knowledge.api_key = self.settings.knowledge_api_key
        platform = self.tool_gateway.platform
        platform.base_url = self.settings.platform_gateway_url.rstrip("/")
        platform.timeout = self.settings.platform_timeout_seconds
        platform.api_key = self.settings.platform_api_key
        self.ocr.base_url = self.settings.ocr_gateway_url.rstrip("/")
        self.ocr.timeout = self.settings.ocr_timeout_seconds

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
        await db.commit()
        result = {"seq": event.seq, "eventType": event.event_type, "data": event.event_json, "createdAt": datetime.now(timezone.utc).isoformat()}
        await self.broker.publish(conversation.conversation_id, result)
        return result

    async def submit_message(self, principal: Principal, conversation_id: str, content: str, client_message_id: str) -> dict[str, Any]:
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
                event = await self.append_event(db, conversation, "user.message", {"content": content, "clientMessageId": client_message_id, "requestId": principal.request_id})
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
                    route = resolve_skill(latest_content)
                    tool_request = parse_tool_request(latest_content) if latest_user else None
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
                    elif not tool_request and route.tool_name == "umc.applications":
                        tool_request = ("umc.applications", {"page_index": 1, "page_size": 100})
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
                    messages.insert(0, {"role": "system", "content": build_system_prompt(route, evidence_available=bool(tool_request))})
                    if route.category in {"data_query", "api_call"}:
                        messages.insert(1, {"role": "system", "content": "流程交互约束：" + json.dumps(build_flow_prompt(route), ensure_ascii=False)})
                    if tool_request:
                        tool_name, arguments = tool_request
                        safe_arguments = {
                            "fileType": arguments.get("fileType"),
                            "hasFile": bool(arguments.get("file")),
                            "query": str(arguments.get("query", ""))[:500] if "query" in arguments else None,
                            "folderId": arguments.get("folder_id") or arguments.get("folderId"),
                            "topK": arguments.get("top_k") or arguments.get("topK") or 32,
                            "pageIndex": arguments.get("page_index") or arguments.get("pageIndex"),
                            "pageSize": arguments.get("page_size") or arguments.get("pageSize"),
                        }
                        await self.append_event(db, conversation, "tool.call", {"toolName": tool_name, "arguments": safe_arguments, "requestId": principal.request_id})
                        if not self.settings.external_tools_enabled:
                            tool_result = {"ok": False, "code": "external_tools_disabled", "toolName": tool_name}
                        else:
                            tool_result = await self.tool_gateway.invoke(principal, tool_name, arguments)
                        result_for_event = dict(tool_result)
                        if isinstance(result_for_event.get("result"), dict):
                            result_for_event["result"] = json.dumps(result_for_event["result"], ensure_ascii=False)[:20_000]
                        await self.append_event(db, conversation, "tool.result", result_for_event)
                        messages.append({"role": "user", "content": f"Tool {tool_name} result: {json.dumps(tool_result, ensure_ascii=False)[:20_000]}"})
                    chunks: list[str] = []
                    async for token in self.llm.stream(messages):
                        chunks.append(token)
                        await self.append_event(db, conversation, "assistant.chunk", {"content": token, "requestId": principal.request_id, "runtimeId": conversation.runtime_id})
                    await self.append_event(db, conversation, "assistant.message", {"content": "".join(chunks), "requestId": principal.request_id})
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
