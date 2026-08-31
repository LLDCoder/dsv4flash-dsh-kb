"""Declarative Skill workflow execution helpers."""

from __future__ import annotations

import json
from typing import Any


def _matches(text: str, condition: object) -> bool:
    if not isinstance(condition, dict):
        return False
    normalized = text.casefold()
    any_terms = [str(item).casefold() for item in condition.get("anyTerms", []) if str(item).strip()]
    all_terms = [str(item).casefold() for item in condition.get("allTerms", []) if str(item).strip()]
    return (not any_terms or any(term in normalized for term in any_terms)) and all(term in normalized for term in all_terms)


def _decode_result(value: Any) -> Any:
    for _ in range(2):
        if not isinstance(value, str):
            break
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            return None
    return value


def _value_at_path(value: Any, path: object) -> Any:
    current = value
    for part in str(path or "").split("."):
        if not part:
            continue
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _selection_items(history: list[Any], selection: dict[str, Any]) -> list[dict[str, Any]]:
    source_tool = str(selection.get("sourceTool") or "")
    for event in reversed(history):
        payload = getattr(event, "event_json", {}) or {}
        if getattr(event, "event_type", "") != "tool.result" or payload.get("toolName") != source_tool:
            continue
        result = _decode_result(payload.get("result"))
        items = _value_at_path(result, selection.get("itemsPath"))
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
    return []


def _selected_item(text: str, items: list[dict[str, Any]], selection: dict[str, Any]) -> dict[str, Any] | None:
    normalized = text.casefold()
    identifier_fields = [str(field) for field in selection.get("identifierFields", []) if str(field).strip()]
    matches = [
        item for item in items
        if any(str(item.get(field)).casefold() in normalized for field in identifier_fields if item.get(field) not in (None, ""))
    ]
    if len(matches) == 1:
        return matches[0]
    for index, terms in dict(selection.get("ordinalTerms", {})).items():
        if not isinstance(terms, list) or not any(str(term).casefold() in normalized for term in terms):
            continue
        try:
            return items[int(index) - 1]
        except (IndexError, TypeError, ValueError):
            return None
    return None


def _coerce_argument_value(value: Any, value_type: object) -> Any:
    """Apply a declarative argument type without business-specific branching."""

    if value_type == "string":
        return str(value)
    if value_type == "integer":
        try:
            return int(value)
        except (TypeError, ValueError):
            return value
    return value


def build_configured_tool_request(
    workflow: dict[str, Any] | None,
    allowed_tools: list[str],
    text: str,
    history: list[Any],
) -> tuple[str, dict[str, Any]] | None:
    """Build a tool request from published Skill workflow configuration."""

    workflow = workflow or {}
    allowed = set(allowed_tools)
    for rule in workflow.get("toolRequestRules", []):
        if not isinstance(rule, dict) or not _matches(text, rule.get("when")):
            continue
        tool_name = str(rule.get("toolName") or "")
        if tool_name in allowed:
            return tool_name, dict(rule.get("arguments") or {})

    selection = workflow.get("selection")
    if isinstance(selection, dict):
        detail_request = selection.get("detailRequest")
        if isinstance(detail_request, dict) and _matches(text, detail_request.get("when")):
            item = _selected_item(text, _selection_items(history, selection), selection)
            tool_name = str(detail_request.get("toolName") or "")
            argument_name = str(detail_request.get("argumentName") or "")
            value_field = str(selection.get("valueField") or "")
            if item and tool_name in allowed and argument_name and value_field and item.get(value_field) is not None:
                return tool_name, {
                    argument_name: _coerce_argument_value(
                        item[value_field], detail_request.get("argumentValueType")
                    )
                }

    default_request = workflow.get("defaultToolRequest")
    if isinstance(default_request, dict):
        tool_name = str(default_request.get("toolName") or "")
        if tool_name in allowed:
            return tool_name, dict(default_request.get("arguments") or {})
    return None


def mask_tool_result(value: Any, policy: object, depth: int = 0) -> Any:
    """Apply a Tool-configured ``hide:fieldA,fieldB`` masking policy."""

    if depth > 8 or not isinstance(policy, str) or not policy.startswith("hide:"):
        return value
    fields = {item.strip().casefold() for item in policy.removeprefix("hide:").split(",") if item.strip()}
    if not fields:
        return value
    if isinstance(value, dict):
        return {
            str(key): "[redacted]" if str(key).casefold() in fields else mask_tool_result(item, policy, depth + 1)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [mask_tool_result(item, policy, depth + 1) for item in value]
    if isinstance(value, str):
        decoded = _decode_result(value)
        if decoded is None:
            return value
        return json.dumps(mask_tool_result(decoded, policy, depth + 1), ensure_ascii=False)
    return value
