"""Customer adapter: preserve scope/evidence upstream, validate public blocks."""

from __future__ import annotations

import re
from typing import Callable

from .answer_stream import AnswerStream, incomplete_stream_notice
from .response_safety import contains_unexpected_response_script, is_internal_tool_protocol


async def customer_generated_answer(
    stream: AnswerStream, llm, messages: list[dict], language: str,
    *, sanitize: Callable[[str], str] = lambda text: text,
) -> tuple[str, str, str]:
    """No token escapes before validation; no retry can rewrite a public prefix."""
    reasoning: list[str] = []

    async def capture_reasoning(value: str) -> None:
        reasoning.append(value)

    def safe(text: str) -> bool:
        if is_internal_tool_protocol(text) or contains_unexpected_response_script(text, language):
            return False
        if language == "ar" and re.search(r"[A-Za-z]", text) and not re.search(r"[\u0600-\u06ff]", text):
            return False
        return True

    def public_projection(text: str) -> str:
        # Preserve paragraph whitespace so concatenation and persistence are
        # lossless even when the legacy customer sanitizer trims its output.
        suffix = re.search(r"\s*$", text).group()
        return sanitize(text).rstrip() + suffix

    for attempt in range(2):
        prompt = [*messages, {"role": "system", "content": (
            "Separate complete answer paragraphs with a blank line. Use only the "
            "verified evidence and authorized profile scope already provided. "
            "Reply entirely in the required language. Do not output internal tool "
            "protocols, credentials, or unverified business facts."
            + (" The previous private draft failed validation; correct it." if attempt else "")
        )}]
        try:
            content = await stream.generate(
                llm.stream(prompt, on_reasoning=capture_reasoning),
                validate=safe, sanitize=public_projection,
            )
            return content, "".join(reasoning), "complete"
        except Exception:
            if stream.content:
                stream.status = "partial"
                await stream.verified(stream.content + incomplete_stream_notice(language))
                return stream.content, "".join(reasoning), "partial"
            if attempt:
                stream.status = "failed"
                failure = (
                    "تعذر علي إعداد رد تم التحقق منه باللغة المطلوبة. يرجى المحاولة مرة أخرى."
                    if language == "ar"
                    else "I could not prepare a validated response in the requested language. Please retry."
                )
                await stream.verified(failure)
                return stream.content, "".join(reasoning), "failed"
    raise AssertionError("unreachable")
