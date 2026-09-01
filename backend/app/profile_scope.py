"""Profile-aware controls shared by Tool Registry and the runtime."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


PROFILE_SCOPE_MODES = frozenset({"token_scoped", "bind_parameter", "not_applicable"})
PROFILE_PARAMETER_NAMES = frozenset({"profileid", "userprofileid"})


def _compact(value: object) -> str:
    return re.sub(r"[^\w]+", "", str(value or "").casefold(), flags=re.UNICODE)


def _profile_parameter(parameters: dict[str, Any] | None) -> str | None:
    properties = (parameters or {}).get("properties") if isinstance(parameters, dict) else None
    if not isinstance(properties, dict):
        return None
    for name in properties:
        if _compact(name) in PROFILE_PARAMETER_NAMES:
            return str(name)
    return None


def infer_profile_scope(parameters: dict[str, Any] | None, http_path: str = "") -> dict[str, str]:
    """Infer a safe OpenAPI default without an LLM."""

    if str(http_path).casefold().startswith("/api/internal/"):
        return {"mode": "not_applicable"}
    parameter = _profile_parameter(parameters)
    if parameter:
        return {"mode": "bind_parameter", "parameter": parameter}
    return {"mode": "token_scoped"}


def normalize_profile_scope(value: object, *, parameters: dict[str, Any] | None, http_path: str = "") -> dict[str, str]:
    """Keep persisted scope metadata valid, falling back to deterministic inference."""

    inferred = infer_profile_scope(parameters, http_path)
    if not isinstance(value, dict):
        return inferred
    mode = str(value.get("mode") or "").strip()
    if mode not in PROFILE_SCOPE_MODES:
        return inferred
    if mode != "bind_parameter":
        return {"mode": mode}
    parameter = str(value.get("parameter") or _profile_parameter(parameters) or "").strip()
    return {"mode": mode, "parameter": parameter} if parameter else inferred


def profile_scope_for_definition(definition: dict[str, Any]) -> dict[str, str]:
    return normalize_profile_scope(
        definition.get("profileScope", definition.get("profile_scope")),
        parameters=definition.get("parameters") if isinstance(definition.get("parameters"), dict) else {},
        http_path=str(definition.get("httpPath", definition.get("http_path", ""))),
    )


@dataclass(frozen=True)
class ProfileReference:
    profile_id: str
    name: str


@dataclass(frozen=True)
class ProfileContext:
    active_profile_id: str
    active_profile_name: str
    is_global_view: bool
    profiles: tuple[ProfileReference, ...]


def profile_context_from_payload(value: object, *, trusted_profile_id: str | None = None) -> ProfileContext | None:
    if not isinstance(value, dict):
        return None
    client_profile_id = str(value.get("activeProfileId") or "").strip()
    active_profile_id = client_profile_id
    if trusted_profile_id is not None:
        active_profile_id = str(trusted_profile_id).strip()
    is_global_view = active_profile_id == "0" if trusted_profile_id is not None else bool(value.get("isGlobalView")) or active_profile_id == "0"
    active_profile_name = str(value.get("activeProfileName") or "").strip()[:256]
    profiles: list[ProfileReference] = []
    for item in value.get("profiles", [])[:50] if isinstance(value.get("profiles"), list) else []:
        if isinstance(item, dict):
            profile_id = str(item.get("id") or "").strip()
            name = str(item.get("name") or "").strip()[:256]
            if profile_id and name:
                profiles.append(ProfileReference(profile_id, name))
    if active_profile_id and active_profile_name and (trusted_profile_id is None or client_profile_id == active_profile_id) and all(item.profile_id != active_profile_id for item in profiles):
        profiles.append(ProfileReference(active_profile_id, active_profile_name))
    active_profile_name = next((item.name for item in profiles if item.profile_id == active_profile_id), active_profile_name)
    if not active_profile_id and not is_global_view:
        return None
    return ProfileContext(active_profile_id, active_profile_name, is_global_view, tuple(profiles))


def _profile_aliases(name: str) -> set[str]:
    compact = _compact(name)
    aliases = {compact} if compact else set()
    simplified = re.sub(r"(?:profile|umc)$", "", compact)
    if len(simplified) >= 4:
        aliases.add(simplified)
    return aliases


def requested_profile(text: str, context: ProfileContext | None) -> ProfileReference | None:
    """Resolve only an unambiguous profile already known to the portal."""

    if not context or not text.strip():
        return None
    haystack = _compact(text)
    words = re.findall(r"[\w]+", text.casefold(), flags=re.UNICODE)
    profile_word_indexes = [index for index, word in enumerate(words) if word == "profile"]
    matches: dict[str, ProfileReference] = {}
    for profile in context.profiles:
        aliases = _profile_aliases(profile.name)
        exact_match = any(len(alias) >= 4 and alias in haystack for alias in aliases if alias == _compact(profile.name))
        contextual_match = False
        for index in profile_word_indexes:
            if index == 0:
                continue
            typed = _compact(words[index - 1])
            if len(typed) >= 4 and any(alias.startswith(typed) for alias in aliases):
                contextual_match = True
                break
        if exact_match or contextual_match:
            matches[profile.profile_id] = profile
    return next(iter(matches.values())) if len(matches) == 1 else None


def requires_profile_switch(definition: dict[str, Any], context: ProfileContext | None, user_text: str) -> ProfileReference | None:
    if profile_scope_for_definition(definition).get("mode") == "not_applicable":
        return None
    target = requested_profile(user_text, context)
    if target and context and (context.is_global_view or target.profile_id != context.active_profile_id):
        return target
    return None


def bind_active_profile(definition: dict[str, Any], arguments: dict[str, Any], context: ProfileContext | None) -> tuple[dict[str, Any] | None, str | None]:
    """Apply the portal's active profile at the gateway trust boundary."""

    scope = profile_scope_for_definition(definition)
    if scope.get("mode") != "bind_parameter":
        return dict(arguments), None
    if not context or context.is_global_view or not context.active_profile_id:
        return None, "profile_selection_required"
    bound = dict(arguments)
    parameter = str(scope["parameter"])
    properties = definition.get("parameters", {}).get("properties", {}) if isinstance(definition.get("parameters"), dict) else {}
    specification = properties.get(parameter) if isinstance(properties, dict) else None
    if isinstance(specification, dict) and specification.get("type") == "integer" and context.active_profile_id.isdigit():
        bound[parameter] = int(context.active_profile_id)
    else:
        bound[parameter] = context.active_profile_id
    return bound, None
