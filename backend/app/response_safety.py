"""Safety checks for model text that is about to become a public response."""

import json
import re


def is_internal_tool_protocol(content: str) -> bool:
    """Detect a model draft that exposes a tool invocation instead of an answer."""
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
        payload = json.loads(candidate)
    except json.JSONDecodeError:
        return False
    if not isinstance(payload, dict):
        return False
    return bool({"tool", "toolName", "name"} & set(payload)) and bool({"args", "arguments", "parameters"} & set(payload))
