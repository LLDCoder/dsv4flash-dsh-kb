"""Safety checks for model text that is about to become a public response."""

import json
import re


def _is_tool_invocation(payload: object) -> bool:
    return isinstance(payload, dict) and bool({"tool", "toolName", "name"} & set(payload)) and bool(
        {"args", "arguments", "parameters"} & set(payload)
    )


def _is_tool_invocation(payload: object) -> bool:
    return isinstance(payload, dict) and bool({"tool", "toolName", "name"} & set(payload)) and bool(
        {"args", "arguments", "parameters"} & set(payload)
    )


def is_internal_tool_protocol(content: str) -> bool:
    """Detect a model draft that exposes an internal tool invocation.

    A draft may contain a natural-language prefix followed by JSON.  That is
    still an internal protocol leak and must never become a public answer.
    """
    candidate = content.strip()
    lowered = candidate.casefold()
    # Some compatible model endpoints emit their native DSML/XML tool-call
    # serialization as content. It may be prefixed by ordinary prose, so it
    # cannot be detected by parsing the whole response as JSON.
    if "dsml" in lowered and any(marker in lowered for marker in ("tool_calls", "invoke name=", "parameter name=")):
        return True
    if re.search(r"<\s*(?:tool_calls?|function_calls?)\b", lowered) and re.search(r"<\s*(?:invoke|function)\b", lowered):
        return True
    if candidate.startswith("JSON\n"):
        candidate = candidate[5:].strip()
    if candidate.startswith("```json") and candidate.endswith("```"):
        candidate = candidate[7:-3].strip()
    try:
        if _is_tool_invocation(json.loads(candidate)):
            return True
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for offset, character in enumerate(candidate):
        if character != "{":
            continue
        try:
            payload, _ = decoder.raw_decode(candidate[offset:])
        except json.JSONDecodeError:
            continue
        if _is_tool_invocation(payload):
            return True
    return False
