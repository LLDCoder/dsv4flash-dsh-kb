import json
from collections.abc import AsyncIterator

import httpx

from .config import Settings


class LLMAdapter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
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
                        text = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                        if text:
                            yield text
                    except json.JSONDecodeError:
                        continue

