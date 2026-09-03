import json
from collections.abc import AsyncIterator, Awaitable, Callable

import httpx

from .config import Settings


class LLMAdapter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def plan_admin_portal_read(
        self,
        question: str,
        permission_context: dict[str, object],
        knowledge_context: dict[str, object],
    ) -> dict[str, object]:
        """Run the bounded Reader subagent planning step.

        The planner can select pages and read interactions, but it never sees
        credentials, cookies, executable business Tool schemas, or arbitrary
        network origins.
        """

        if not self.settings.llm_base_url or not self.settings.llm_api_key:
            raise RuntimeError("Reader planner is not configured")
        system = (
            "You are the read-only Admin Portal Reader subagent. GetUserInfo has already been obtained. "
            "Use the supplied permissions and knowledge to answer with exactly one closed mode. "
            "If bounded knowledge fully answers a general question, return JSON only as "
            "{mode:'knowledge_only',result:'success|no_data|not_confirmed',page:'',section:'',"
            "scope:'personal|team|global|unknown',facts:[strings],workflowState:'',missing:[strings]}. "
            "Otherwise return exactly {mode:'portal_read',portalRequest:{startPath,actions,expectedFields}}. "
            "If the request is ambiguous or the evidence cannot support either mode, return knowledge_only "
            "with result not_confirmed and a concise missing list. Do not add keys outside these schemas. "
            "Allowed action types are observe, navigate, query, filter, paginate, switch_tab, expand_details. "
            "When semantic page structure is not present in knowledgeContext, use an observe action first. "
            "After an observation is supplied, actions may use role, name, field, section, label, value, emptyState, "
            "and permissionCode. Use semantic role/name/field/section locators; never guess broad CSS. "
            "Paths must be relative paths on the Admin Portal. Never request another host. "
            "Never approve, reject, submit, modify, create, delete, assign, send, export, upload, "
            "download, pay, refund, publish, save, or perform any other mutation. "
            "Use at most 3 pages and 12 actions, and request only fields needed to answer. "
            "Do not supply POST, PUT, PATCH or DELETE methods; query means reading or filtering the loaded page UI."
        )
        payload = {
            "model": self.settings.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "question": question[:10_000],
                            "permissionContext": permission_context,
                            "knowledgeContext": knowledge_context,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
            "stream": False,
            "response_format": {"type": "json_object"},
        }
        url = self.settings.llm_base_url.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {self.settings.llm_api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
        if isinstance(content, list):
            content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Reader planner returned empty output")
        raw = content.strip()
        if raw.startswith("```"):
            raw = raw.strip("`").removeprefix("json").strip()
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ValueError("Reader planner output must be an object")
        return result

    async def stream(self, messages: list[dict[str, str]], *, on_reasoning: Callable[[str], Awaitable[None]] | None = None) -> AsyncIterator[str]:
        if not self.settings.llm_base_url or not self.settings.llm_api_key:
            language = "ar" if any("Required response language: ARABIC" in item.get("content", "") for item in messages) else "en"
            response = (
                "تعذر تأكيد النتيجة لأن نموذج الإجابة غير مهيأ."
                if language == "ar"
                else "The result could not be confirmed because the response model is not configured."
            )
            for token in response:
                yield token
            return

        url = self.settings.llm_base_url.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {self.settings.llm_api_key}", "Content-Type": "application/json"}
        payload = {"model": self.settings.llm_model, "messages": messages, "stream": True}
        async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line.removeprefix("data:").strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        reasoning = delta.get("reasoning_content") or delta.get("reasoning")
                        if reasoning and on_reasoning:
                            await on_reasoning(str(reasoning))
                        text = delta.get("content")
                        if text:
                            yield text
                    except json.JSONDecodeError:
                        continue
