import json
from collections.abc import AsyncIterator, Awaitable, Callable

import httpx

from .config import Settings


class LLMAdapter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def route_skill(
        self,
        question: str,
        catalog: list[dict[str, object]],
        context: dict[str, object] | None = None,
    ) -> dict[str, object]:
        """Ask the configured model for a classification-only Skill choice.

        This endpoint is classification-only. It receives bounded recent
        context and a recalled candidate set, never executable tool schemas.
        """

        if not self.settings.llm_base_url or not self.settings.llm_api_key:
            raise RuntimeError("LLM Router is not configured")
        system = (
            "You are a strict intent classifier for the NMA DSH assistant. "
            "Choose exactly one skillId from the supplied candidate catalog. "
            "Prefer the latest user message; use recent context only to resolve references. "
            "If the user clearly changes topic, ignore the previous active domain. "
            "Do not call tools, do not answer the user, and do not invent a skill. "
            "Return JSON only with keys skillId, confidence, needsClarification, clarifyingQuestion. "
            "Use needsClarification=true when the scope or intent is ambiguous."
        )
        payload = {
            "model": self.settings.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps({"question": question, "context": context or {}, "candidates": catalog}, ensure_ascii=False)},
            ],
            "stream": False,
            "response_format": {"type": "json_object"},
        }
        timeout = max(1.0, float(getattr(self.settings, "skill_router_timeout_seconds", 10.0)))
        url = self.settings.llm_base_url.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {self.settings.llm_api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
        if isinstance(content, list):
            content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
        if not isinstance(content, str) or not content.strip():
            raise ValueError("LLM Router returned empty output")
        raw = content.strip()
        if raw.startswith("```"):
            raw = raw.strip("`").removeprefix("json").strip()
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ValueError("LLM Router output must be a JSON object")
        skill_id = result.get("skillId") or result.get("skill_id")
        confidence = float(result.get("confidence", 0.0))
        if not isinstance(skill_id, str) or not skill_id.strip() or not 0 <= confidence <= 1:
            raise ValueError("LLM Router output has invalid skillId or confidence")
        return {
            "skillId": skill_id.strip(),
            "confidence": confidence,
            "needsClarification": bool(result.get("needsClarification", False)),
            "clarifyingQuestion": str(result.get("clarifyingQuestion", "")).strip() or None,
        }

    async def stream(self, messages: list[dict[str, str]], *, on_reasoning: Callable[[str], Awaitable[None]] | None = None) -> AsyncIterator[str]:
        if not self.settings.llm_base_url or not self.settings.llm_api_key:
            latest = messages[-1]["content"] if messages else ""
            response = f"收到你的消息：{latest}\n\n当前为 Docker MVP。已完成事件持久化，并会按 conversation 维度维护运行租约。"
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
