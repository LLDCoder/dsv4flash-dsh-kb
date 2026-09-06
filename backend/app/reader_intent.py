"""Bounded conversational intent metadata, never a source of permissions or facts."""

from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Any


SLOT_NAMES = (
    "businessObject", "recordIdentity", "view", "dateRange", "filter",
    "requestedScope", "answerShape",
)
_RELATIONS = {"continue", "refine", "switch", "broaden", "clarify"}
_ENUMS = {
    "requestedScope": {"personal", "team", "global", "unknown"},
    "answerShape": {"overview", "count", "list", "attention", "due", "detail", "unspecified"},
}
_CREDENTIAL = re.compile(
    r"(?i)(?:\b(?:password|passwd|authorization|cookie|api[_ -]?key|access[_ -]?token|"
    r"refresh[_ -]?token|secret)\b\s*[:=]\s*\S+|\bbearer\s+\S+|"
    r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b)"
)


def _normalized(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _literal_identity_in(identity: str, text: str) -> bool:
    return re.search(r"(?<![\w-])" + re.escape(identity) + r"(?![\w-])", text) is not None


def _text(value: Any, limit: int, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError("intent text must be a bounded string")
    if value != value.strip() or (not value and not allow_empty):
        raise ValueError("intent text must be nonempty and trimmed")
    if any(unicodedata.category(char) in {"Cc", "Cf"} for char in value):
        raise ValueError("intent text contains control characters")
    if _CREDENTIAL.search(value):
        raise ValueError("intent text contains credential-like content")
    return value


def _previous_sources(context: Any) -> tuple[list[str], set[str]]:
    previous = context.get("previousIntent") if isinstance(context, dict) else None
    if not isinstance(previous, dict):
        return [], set()
    sources: list[str] = []
    identities: set[str] = set()

    def add(value: Any, limit: int, *, identity: bool = False) -> None:
        if not isinstance(value, str) or not value.strip():
            return
        # Ignore untrusted or legacy oversized metadata, never silently truncate identities.
        try:
            safe = _text(value, limit)
        except ValueError:
            return
        sources.append(_normalized(safe))
        if identity:
            identities.add(_normalized(safe))

    add(previous.get("question"), 500)
    for name in SLOT_NAMES:
        add(previous.get(name), 240, identity=name == "recordIdentity")
    intent_context = previous.get("intentContext")
    if isinstance(intent_context, dict):
        slots = intent_context.get("slots")
        if isinstance(slots, dict):
            for name in SLOT_NAMES:
                slot = slots.get(name)
                if not isinstance(slot, dict) or slot.get("source") not in {"current", "previous"}:
                    continue
                add(slot.get("value"), 240, identity=name == "recordIdentity")
                add(slot.get("evidence"), 500)
        options = intent_context.get("clarificationOptions")
        if isinstance(options, list) and len(options) == 2:
            for option in options:
                add(option, 120)
    return sources, identities


@dataclass(frozen=True)
class IntentSlot:
    source: str
    value: str
    evidence: str

    def public_json(self) -> dict[str, str]:
        return {"source": self.source, "value": self.value, "evidence": self.evidence}


@dataclass(frozen=True)
class IntentResolution:
    relation: str
    slots: tuple[tuple[str, IntentSlot], ...]
    clarification_options: tuple[str, ...] = ()

    def public_json(self) -> dict[str, Any]:
        return {
            "relation": self.relation,
            "slots": {name: slot.public_json() for name, slot in self.slots},
            "clarificationOptions": list(self.clarification_options),
        }

    def planner_context(self, previous_context: Any = None) -> dict[str, Any]:
        # Resolved slots already contain every explicitly selected inherited condition.
        # Forwarding the old page/question would reintroduce discarded restrictions.
        context = {"resolvedIntent": self.public_json()}
        previous = previous_context.get("previousIntent", {}) if isinstance(previous_context, dict) else {}
        pending = previous.get("intentContext", {}) if isinstance(previous, dict) else {}
        if isinstance(pending, dict) and pending.get("relation") == "clarify" and self.relation != "clarify":
            try:
                context["resolvedChoiceOptions"] = list(_clarification_labels(pending.get("clarificationOptions")))
            except ValueError:
                pass
        return context


def parse_intent_resolution(
    payload: Any, question: str, conversation_context: Any,
) -> IntentResolution:
    """Validate shape and textual provenance, not semantic truth or authorization."""
    if not isinstance(payload, dict) or set(payload) != {"relation", "slots", "clarificationOptions"}:
        raise ValueError("intent resolution has unexpected or missing keys")
    relation = payload["relation"]
    if not isinstance(relation, str) or relation not in _RELATIONS:
        raise ValueError("invalid intent relation")
    slots = payload["slots"]
    if not isinstance(slots, dict) or set(slots) != set(SLOT_NAMES):
        raise ValueError("intent resolution requires exactly the semantic slots")
    if not isinstance(question, str) or _CREDENTIAL.search(question):
        raise ValueError("invalid question for intent resolution")
    current_source = _normalized(question)
    previous_sources, previous_identities = _previous_sources(conversation_context)
    resolved_slots = []
    for name in SLOT_NAMES:
        slot = slots[name]
        if not isinstance(slot, dict) or set(slot) != {"source", "value", "evidence"}:
            raise ValueError("intent slot has unexpected or missing keys")
        source = slot["source"]
        if not isinstance(source, str) or source not in {"current", "previous", "clear"}:
            raise ValueError("invalid intent slot source")
        value = _text(slot["value"], 240, allow_empty=source == "clear")
        evidence = _text(slot["evidence"], 500, allow_empty=source == "clear")
        if source == "clear":
            if value or evidence:
                raise ValueError("cleared intent slot must have empty value and evidence")
        else:
            if name in _ENUMS and value not in _ENUMS[name]:
                raise ValueError("invalid intent slot enum")
            evidence_sources = [current_source] if source == "current" else previous_sources
            if not any(_normalized(evidence) in candidate for candidate in evidence_sources):
                raise ValueError("intent slot evidence is absent from its declared source")
            if name == "recordIdentity":
                identity = _normalized(value)
                if source == "current" and not _literal_identity_in(identity, current_source):
                    raise ValueError("current record identity is absent from the question")
                if source == "previous" and identity not in previous_identities:
                    raise ValueError("inherited record identity is not the previous known identity")
        resolved_slots.append((name, IntentSlot(source, value, evidence)))
    options = payload["clarificationOptions"]
    if not isinstance(options, list) or len(options) != (2 if relation == "clarify" else 0):
        raise ValueError("clarification requires exactly two options and other relations none")
    safe_options = _clarification_labels(options) if options else ()
    return IntentResolution(relation, tuple(resolved_slots), tuple(safe_options))


def _clarification_labels(options: Any) -> tuple[str, str]:
    if not isinstance(options, (list, tuple)) or len(options) != 2:
        raise ValueError("clarification requires exactly two options")
    labels = []
    for option in options:
        label = _text(option, 120)
        if re.search(r"[a-z][a-z0-9+.-]*:(?://|\S)|www\.|[<>]|```|\]\(", label, re.I):
            raise ValueError("clarification options must be plain labels")
        labels.append(label)
    if _normalized(labels[0]) == _normalized(labels[1]):
        raise ValueError("clarification options must differ")
    return labels[0], labels[1]


def format_clarification_options(options: tuple[str, ...] | list[str], language: str) -> str:
    first, second = _clarification_labels(options)
    if language == "zh":
        return f"你指的是“{first}”，还是“{second}”？"
    if language == "ar":
        return f"هل تقصد «{first}» أم «{second}»؟"
    return f'Do you mean "{first}" or "{second}"?'


def clarification_question(resolution: IntentResolution, language: str) -> str:
    if resolution.relation != "clarify":
        raise ValueError("intent resolution does not request clarification")
    return format_clarification_options(resolution.clarification_options, language)
