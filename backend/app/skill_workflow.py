"""Declarative Skill workflow execution helpers."""

from __future__ import annotations

import json
from datetime import date
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


def routing_contract(workflow: dict[str, Any] | None) -> dict[str, Any]:
    """Expose only the semantic routing contract to the classifier."""

    routing = (workflow or {}).get("routing")
    if not isinstance(routing, dict):
        return {}
    intents = [
        {"id": str(item.get("id") or ""), "description": str(item.get("description") or "")}
        for item in routing.get("intents", [])
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]
    filters: dict[str, dict[str, Any]] = {}
    for name, specification in dict(routing.get("filters") or {}).items():
        if not isinstance(specification, dict):
            continue
        item = {
            "type": str(specification.get("type") or "string"),
            "description": str(specification.get("description") or ""),
        }
        if item["type"] in {"enum", "enum_array"}:
            item["options"] = [
                {"id": str(option.get("id") or ""), "description": str(option.get("description") or "")}
                for option in specification.get("options", [])
                if isinstance(option, dict) and str(option.get("id") or "").strip()
            ]
        filters[str(name)] = item
    return {"intents": intents, "filters": filters}


def _normalized_filter_value(specification: dict[str, Any], value: Any) -> Any | None:
    value_type = str(specification.get("type") or "string")
    if value_type == "enum":
        option_ids = {str(item.get("id")) for item in specification.get("options", []) if isinstance(item, dict)}
        candidate = str(value or "").strip()
        return candidate if candidate in option_ids else None
    if value_type == "enum_array":
        if not isinstance(value, list):
            return None
        option_ids = {str(item.get("id")) for item in specification.get("options", []) if isinstance(item, dict)}
        normalized = [str(item).strip() for item in value if str(item).strip()]
        return normalized if normalized and all(item in option_ids for item in normalized) else None
    if value_type in {"string_array", "integer_array"}:
        if not isinstance(value, list):
            return None
        if value_type == "string_array":
            normalized = [str(item).strip()[:500] for item in value if str(item).strip()]
        else:
            try:
                normalized = [int(item) for item in value]
            except (TypeError, ValueError):
                return None
        return normalized or None
    if value_type == "string":
        candidate = str(value or "").strip()
        return candidate[:500] if candidate else None
    if value_type == "integer":
        try:
            normalized = int(value)
        except (TypeError, ValueError):
            return None
        minimum = specification.get("minimum")
        maximum = specification.get("maximum")
        if isinstance(minimum, int) and normalized < minimum:
            return None
        if isinstance(maximum, int) and normalized > maximum:
            return None
        return normalized
    if value_type == "date_range":
        if not isinstance(value, dict):
            return None
        normalized: dict[str, str] = {}
        for boundary in ("start", "end"):
            candidate = value.get(boundary)
            if candidate in (None, ""):
                continue
            try:
                normalized[boundary] = date.fromisoformat(str(candidate)).isoformat()
            except ValueError:
                return None
        return normalized or None
    if value_type == "selection":
        if not isinstance(value, dict):
            return None
        if isinstance(value.get("ordinal"), int) and value["ordinal"] > 0:
            return {"ordinal": value["ordinal"]}
        identifier = str(value.get("identifier") or "").strip()
        return {"identifier": identifier[:500]} if identifier else None
    return None


def normalize_route_directives(
    workflow: dict[str, Any] | None,
    intent_id: object,
    filters: object,
) -> tuple[str | None, dict[str, Any]]:
    """Validate LLM route details against the selected Skill's DB contract."""

    routing = (workflow or {}).get("routing")
    if not isinstance(routing, dict):
        return None, {}
    intent_ids = {
        str(item.get("id"))
        for item in routing.get("intents", [])
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    }
    candidate_intent = str(intent_id or "").strip()
    normalized_intent = candidate_intent if candidate_intent in intent_ids else str(routing.get("defaultIntentId") or "").strip()
    if normalized_intent not in intent_ids:
        normalized_intent = None
    normalized_filters: dict[str, Any] = {}
    supplied_filters = filters if isinstance(filters, dict) else {}
    for name, specification in dict(routing.get("filters") or {}).items():
        if not isinstance(specification, dict) or name not in supplied_filters:
            continue
        value = _normalized_filter_value(specification, supplied_filters[name])
        if value is not None:
            normalized_filters[str(name)] = value
    return normalized_intent, normalized_filters


def _selection_items(history: list[Any], selection: dict[str, Any]) -> list[dict[str, Any]]:
    source_tool = str(selection.get("sourceTool") or "")
    for event in reversed(history):
        payload = getattr(event, "event_json", {}) or {}
        if getattr(event, "event_type", "") != "tool.result" or payload.get("toolName") != source_tool:
            continue
        snapshot = payload.get("selectionItems")
        if isinstance(snapshot, list):
            return [item for item in snapshot if isinstance(item, dict)]
        result = _decode_result(payload.get("result"))
        items = _value_at_path(result, selection.get("itemsPath"))
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
    return []


def selection_snapshot_for_tool_result(
    workflow: dict[str, Any] | None,
    tool_name: str,
    result: Any,
) -> list[dict[str, Any]] | None:
    """Keep only configured selection identifiers when a Tool result is large.

    Session events cap serialized Tool evidence. A separately persisted minimal
    snapshot keeps ordinal and identifier follow-ups usable without retaining
    complete account records solely for selection.
    """

    selection = (workflow or {}).get("selection")
    if not isinstance(selection, dict) or str(selection.get("sourceTool") or "") != tool_name:
        return None
    payload = result.get("result") if isinstance(result, dict) else result
    decoded = _decode_result(payload)
    items = _value_at_path(decoded, selection.get("itemsPath"))
    if not isinstance(items, list):
        return None
    fields = {
        str(field)
        for field in [*selection.get("identifierFields", []), selection.get("valueField")]
        if str(field).strip()
    }
    if not fields:
        return None
    snapshot = [
        {field: item[field] for field in fields if item.get(field) is not None}
        for item in items
        if isinstance(item, dict)
    ]
    return snapshot or None


def _selected_item(selector: object, items: list[dict[str, Any]], selection: dict[str, Any]) -> dict[str, Any] | None:
    if isinstance(selector, dict):
        ordinal = selector.get("ordinal")
        if isinstance(ordinal, int):
            return items[ordinal - 1] if ordinal <= len(items) else None
        selector = str(selector.get("identifier") or "")
    normalized = str(selector or "").casefold()
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


def _bound_filter_value(workflow: dict[str, Any], filters: dict[str, Any], source: object) -> Any:
    source_path = str(source or "")
    root, _, _ = source_path.partition(".")
    value = _value_at_path(filters, source_path)
    specification = dict((workflow.get("routing") or {}).get("filters") or {}).get(root)
    if not isinstance(specification, dict) or value is None:
        return value
    if specification.get("type") not in {"enum", "enum_array"} or "." in source_path:
        return value
    options = {
        str(item.get("id")): item.get("value", item.get("id"))
        for item in specification.get("options", [])
        if isinstance(item, dict)
    }
    if specification.get("type") == "enum_array":
        return [options.get(str(item), item) for item in value]
    return options.get(str(value), value)


def _request_from_definition(
    workflow: dict[str, Any],
    definition: dict[str, Any],
    allowed: set[str],
    filters: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    tool_name = str(definition.get("toolName") or "")
    if tool_name not in allowed:
        return None
    arguments = dict(definition.get("arguments") or {})
    for binding in definition.get("bindings", []):
        if not isinstance(binding, dict):
            continue
        argument = str(binding.get("argument") or "")
        value = _bound_filter_value(workflow, filters, binding.get("filter"))
        if argument and value is not None:
            arguments[argument] = value
    return tool_name, arguments


def matches_configured_selection_follow_up(
    workflow: dict[str, Any] | None,
    text: str,
    history: list[Any],
) -> bool:
    """Whether a published selection workflow claims this follow-up turn."""

    selection = (workflow or {}).get("selection")
    if not isinstance(selection, dict) or not _selection_items(history, selection):
        return False
    request = selection.get("toolRequest") or selection.get("detailRequest")
    return isinstance(request, dict) and _matches(text, request.get("when"))


def build_configured_tool_request(
    workflow: dict[str, Any] | None,
    allowed_tools: list[str],
    text: str,
    history: list[Any],
    *,
    intent_id: str | None = None,
    filters: dict[str, Any] | None = None,
) -> tuple[str, dict[str, Any]] | None:
    """Build a tool request from published Skill workflow configuration."""

    workflow = workflow or {}
    allowed = set(allowed_tools)
    filters = filters or {}
    selection = workflow.get("selection")
    if isinstance(selection, dict):
        selection_request = selection.get("toolRequest") or selection.get("detailRequest")
        selection_filter = str(selection.get("filter") or "")
        matches_intent = intent_id and intent_id == selection.get("intentId")
        matches_legacy_text = isinstance(selection_request, dict) and _matches(text, selection_request.get("when"))
        if isinstance(selection_request, dict) and (matches_intent or matches_legacy_text):
            selector = filters.get(selection_filter) if selection_filter else None
            if selector is None:
                selector = text
            item = _selected_item(selector, _selection_items(history, selection), selection)
            tool_name = str(selection_request.get("toolName") or "")
            argument_name = str(selection_request.get("argumentName") or "")
            value_field = str(selection.get("valueField") or "")
            if item and tool_name in allowed and argument_name and value_field and item.get(value_field) is not None:
                return tool_name, {
                    argument_name: _coerce_argument_value(
                        item[value_field], selection_request.get("argumentValueType")
                    )
                }

    for definition in workflow.get("requests", []):
        if isinstance(definition, dict) and definition.get("intentId") == intent_id:
            request = _request_from_definition(workflow, definition, allowed, filters)
            if request:
                return request

    for rule in workflow.get("toolRequestRules", []):
        if not isinstance(rule, dict) or not _matches(text, rule.get("when")):
            continue
        tool_name = str(rule.get("toolName") or "")
        if tool_name in allowed:
            return tool_name, dict(rule.get("arguments") or {})

    default_request = workflow.get("defaultToolRequest")
    if isinstance(default_request, dict):
        return _request_from_definition(workflow, default_request, allowed, filters)
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
