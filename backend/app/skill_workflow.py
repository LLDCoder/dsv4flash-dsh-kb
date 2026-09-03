"""Declarative Skill workflow execution helpers."""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
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


def deterministic_route_directives(
    workflow: dict[str, Any] | None,
    text: str,
    *,
    today: date | None = None,
) -> tuple[str | None, dict[str, Any]]:
    """Extract only generic, declared filters for a locked database route.

    This keeps fallback execution useful when the LLM router is unavailable
    without embedding domain statuses, labels, or Tool parameters in code.
    """

    routing = (workflow or {}).get("routing")
    if not isinstance(routing, dict):
        return None, {}
    filters = dict(routing.get("filters") or {})
    lowered = text.casefold()
    supplied: dict[str, Any] = {}
    reference_day = today or date.today()
    intent_id = str(routing.get("defaultIntentId") or "").strip() or None
    for rule in (workflow or {}).get("deterministicIntentRules", []):
        if not isinstance(rule, dict) or not _matches(text, rule.get("when")):
            continue
        candidate = str(rule.get("intentId") or "").strip()
        if candidate:
            intent_id = candidate
            break

    date_filter = next(
        (
            name
            for name, specification in filters.items()
            if isinstance(specification, dict) and specification.get("type") == "date_range"
        ),
        None,
    )
    if date_filter:
        explicit_range = re.search(
            r"\bfrom\s+(\d{4}-\d{2}-\d{2})\s+(?:to|until|through)\s+(\d{4}-\d{2}-\d{2})\b",
            lowered,
        )
        relative_days = re.search(r"\b(?:last|past)\s+(\d{1,3})\s+days?\b", lowered)
        if explicit_range:
            supplied[date_filter] = {"start": explicit_range.group(1), "end": explicit_range.group(2)}
        elif relative_days:
            days = int(relative_days.group(1))
            if days > 0:
                supplied[date_filter] = {
                    "start": (reference_day - timedelta(days=days - 1)).isoformat(),
                    "end": reference_day.isoformat(),
                }
        elif re.search(r"\b(?:last|past)\s+week\b", lowered):
            supplied[date_filter] = {
                "start": (reference_day - timedelta(days=6)).isoformat(),
                "end": reference_day.isoformat(),
            }
        elif re.search(r"\btoday\b", lowered):
            supplied[date_filter] = {"start": reference_day.isoformat(), "end": reference_day.isoformat()}
        elif re.search(r"\byesterday\b", lowered):
            yesterday = (reference_day - timedelta(days=1)).isoformat()
            supplied[date_filter] = {"start": yesterday, "end": yesterday}

    limit_filter = next(
        (
            name
            for name, specification in filters.items()
            if isinstance(specification, dict) and specification.get("type") == "integer"
            and name.casefold() in {"limit", "topn", "page_size", "pagesize"}
        ),
        None,
    )
    if limit_filter:
        match = re.search(r"\b(?:top|first|latest|recent)\s+(\d{1,3})\b", lowered)
        if match:
            supplied[limit_filter] = int(match.group(1))

    # Enum labels belong to the published Skill contract. Matching them here
    # keeps deterministic routing useful during router outages without adding
    # business statuses or categories to platform code.
    for name, specification in filters.items():
        if not isinstance(specification, dict) or specification.get("type") not in {"enum", "enum_array"}:
            continue
        matches: list[str] = []
        for option in specification.get("options", []):
            if not isinstance(option, dict):
                continue
            option_id = str(option.get("id") or "").strip()
            labels = [option.get(key) for key in ("value", "label", "name", "id")]
            if option_id and any(
                isinstance(label, str) and label.strip() and label.strip().casefold() in lowered
                for label in labels
            ):
                matches.append(option_id)
        if matches:
            supplied[str(name)] = matches if specification.get("type") == "enum_array" else matches[0]

    return normalize_route_directives(workflow, intent_id, supplied)


def matches_configured_follow_up_route(workflow: dict[str, Any] | None, text: str) -> bool:
    """Whether an active Skill claims a configured non-selection follow-up."""

    return any(
        isinstance(rule, dict) and _matches(text, rule.get("when"))
        for rule in (workflow or {}).get("followUpRouting", [])
    )


def inherit_declared_filters(
    workflow: dict[str, Any] | None,
    filters: dict[str, Any] | None,
    text: str,
    history: list[Any],
    *,
    skill_id: str,
) -> dict[str, Any]:
    """Reuse a prior date window for an explicit relative follow-up.

    The behavior is intentionally structural: it applies only to a published
    Skill's declared ``date_range`` filter, only for a same-window reference,
    and only from a prior route for that exact Skill.
    """

    merged = dict(filters or {})
    if not re.search(r"\b(?:same|that)\s+(?:period|range|timeframe|window)\b", text.casefold()):
        return merged
    routing = (workflow or {}).get("routing")
    if not isinstance(routing, dict):
        return merged
    date_filters = {
        str(name): specification
        for name, specification in dict(routing.get("filters") or {}).items()
        if isinstance(specification, dict) and specification.get("type") == "date_range" and str(name) not in merged
    }
    if not date_filters:
        return merged
    for event in reversed(history):
        if getattr(event, "event_type", "") != "skill.route":
            continue
        payload = getattr(event, "event_json", {}) or {}
        if payload.get("skillId") != skill_id or not isinstance(payload.get("filters"), dict):
            continue
        for name, specification in date_filters.items():
            value = _normalized_filter_value(specification, payload["filters"].get(name))
            if value is not None:
                merged[name] = value
        return merged
    return merged


def _selection_sources(selection: dict[str, Any]) -> list[dict[str, Any]]:
    sources = selection.get("sources")
    if isinstance(sources, list):
        configured = [item for item in sources if isinstance(item, dict) and str(item.get("sourceTool") or "").strip()]
        if configured:
            return configured
    return [selection] if str(selection.get("sourceTool") or "").strip() else []


def _selection_value(selection: dict[str, Any], source: dict[str, Any], name: str) -> Any:
    return source.get(name, selection.get(name))


def _selection_items(history: list[Any], selection: dict[str, Any], source: dict[str, Any]) -> list[dict[str, Any]]:
    source_tool = str(source.get("sourceTool") or "")
    for event in reversed(history):
        payload = getattr(event, "event_json", {}) or {}
        if getattr(event, "event_type", "") != "tool.result" or payload.get("toolName") != source_tool:
            continue
        snapshot = payload.get("selectionItems")
        if isinstance(snapshot, list):
            return [item for item in snapshot if isinstance(item, dict)]
        result = _decode_result(payload.get("result"))
        items = _value_at_path(result, _selection_value(selection, source, "itemsPath"))
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
    return []


def _selection_context(history: list[Any], selection: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]] | None:
    for event in reversed(history):
        payload = getattr(event, "event_json", {}) or {}
        if getattr(event, "event_type", "") != "tool.result":
            continue
        for source in _selection_sources(selection):
            if payload.get("toolName") != source.get("sourceTool"):
                continue
            items = _selection_items([event], selection, source)
            if items:
                return source, items
    return None


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
    if not isinstance(selection, dict):
        return None
    source = next((item for item in _selection_sources(selection) if str(item.get("sourceTool") or "") == tool_name), None)
    if source is None:
        return None
    payload = result.get("result") if isinstance(result, dict) else result
    decoded = _decode_result(payload)
    items = _value_at_path(decoded, _selection_value(selection, source, "itemsPath"))
    if not isinstance(items, list):
        return None
    fields = {
        str(field)
        for field in [*(_selection_value(selection, source, "identifierFields") or []), _selection_value(selection, source, "valueField")]
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


def _selected_item(selector: object, items: list[dict[str, Any]], selection: dict[str, Any], source: dict[str, Any]) -> dict[str, Any] | None:
    if isinstance(selector, dict):
        ordinal = selector.get("ordinal")
        if isinstance(ordinal, int):
            return items[ordinal - 1] if ordinal <= len(items) else None
        selector = str(selector.get("identifier") or "")
    normalized = str(selector or "").casefold()
    ordinal_matches: list[tuple[int, str]] = []
    for index, terms in dict(_selection_value(selection, source, "ordinalTerms") or {}).items():
        if not isinstance(terms, list):
            continue
        for term in terms:
            candidate = str(term).strip().casefold()
            if candidate and re.search(r"(?<!\w)" + re.escape(candidate) + r"(?!\w)", normalized):
                ordinal_matches.append((int(index), candidate))
    for index, _ in sorted(ordinal_matches, key=lambda match: len(match[1]), reverse=True):
        try:
            return items[index - 1]
        except (IndexError, TypeError, ValueError):
            return None
    identifier_fields = [str(field) for field in _selection_value(selection, source, "identifierFields") or [] if str(field).strip()]
    matches = [
        item for item in items
        if any(str(item.get(field)).casefold() in normalized for field in identifier_fields if item.get(field) not in (None, ""))
    ]
    if len(matches) == 1:
        return matches[0]
    return None


def _prior_selected_item(
    history: list[Any],
    items: list[dict[str, Any]],
    selection: dict[str, Any],
    source: dict[str, Any],
) -> dict[str, Any] | None:
    """Find the latest explicit selection in the same Skill's conversation."""

    for event in reversed(history):
        if getattr(event, "event_type", "") != "user.message":
            continue
        content = (getattr(event, "event_json", {}) or {}).get("content")
        item = _selected_item(content, items, selection, source)
        if item is not None:
            return item
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
    if not isinstance(selection, dict):
        return False
    context = _selection_context(history, selection)
    if context is None:
        return False
    source, _ = context
    request = _selection_value(selection, source, "toolRequest") or _selection_value(selection, source, "detailRequest")
    if isinstance(request, dict) and _matches(text, request.get("when")):
        return True
    return any(
        isinstance(rule, dict) and _matches(text, rule.get("when"))
        for rule in _selection_value(selection, source, "toolRequestRules") or []
    )


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
    for rule in workflow.get("noToolRequestRules", []):
        if isinstance(rule, dict) and _matches(text, rule.get("when")):
            return None
    selection = workflow.get("selection")
    if isinstance(selection, dict):
        context = _selection_context(history, selection)
        source, items = context if context else ({}, [])
        selection_request = _selection_value(selection, source, "toolRequest") or _selection_value(selection, source, "detailRequest")
        selection_filter = str(selection.get("filter") or "")
        matches_intent = intent_id and intent_id == _selection_value(selection, source, "intentId")
        matches_legacy_text = isinstance(selection_request, dict) and _matches(text, selection_request.get("when"))
        selected_request = next(
            (
                rule
                for rule in _selection_value(selection, source, "toolRequestRules") or []
                if isinstance(rule, dict) and _matches(text, rule.get("when"))
            ),
            None,
        )
        if selected_request is None and isinstance(selection_request, dict) and (matches_intent or matches_legacy_text):
            selected_request = selection_request
        if isinstance(selected_request, dict):
            selector = filters.get(selection_filter) if selection_filter else None
            if selector is None:
                selector = text
            item = _selected_item(selector, items, selection, source)
            if item is None and re.search(r"\b(?:it|its|this|that|the\s+selected)\b", text.casefold()):
                item = _prior_selected_item(history, items, selection, source)
            tool_name = str(selected_request.get("toolName") or "")
            argument_name = str(selected_request.get("argumentName") or "")
            value_field = str(_selection_value(selection, source, "valueField") or "")
            if item and tool_name in allowed and argument_name and value_field and item.get(value_field) is not None:
                arguments = dict(selected_request.get("arguments") or {})
                arguments[argument_name] = _coerce_argument_value(
                    item[value_field], selected_request.get("argumentValueType")
                )
                return tool_name, arguments

    # A published explicit text rule is more specific than the router's
    # default intent. This lets a declared follow-up such as "blocked items"
    # replace an overview request without adding module-specific code.
    for rule in workflow.get("toolRequestRules", []):
        if not isinstance(rule, dict) or not _matches(text, rule.get("when")):
            continue
        tool_name = str(rule.get("toolName") or "")
        if tool_name in allowed:
            return tool_name, dict(rule.get("arguments") or {})

    for definition in workflow.get("requests", []):
        if isinstance(definition, dict) and definition.get("intentId") == intent_id:
            request = _request_from_definition(workflow, definition, allowed, filters)
            if request:
                return request

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
