"""Safety checks for model text that is about to become a public response."""

import json


def is_internal_tool_protocol(content: str) -> bool:
    """Detect a model draft that exposes a tool invocation instead of an answer."""
    candidate = content.strip()
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
