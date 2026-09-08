"""Bounded conversational intent metadata, never a source of permissions or facts."""

from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Any


SLOT_NAMES = (
    "businessObject", "businessFocus", "recordIdentity", "view", "dateRange", "filter",
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


def _human_section(value: Any) -> str:
    try:
        safe = _text(value, 240)
    except ValueError:
        return ""
    if safe.startswith("/") or re.match(r"(?i)^(?:observation|snapshot|section|table)[-_]\d|^observation[-_]", safe):
        return ""
    return safe


def semantic_source_hint(context: Any) -> dict[str, str]:
    """An optional navigation clue, never a route constraint or authorization."""
    previous = context.get("previousIntent") if isinstance(context, dict) else None
    if not isinstance(previous, dict):
        return {}
    source = previous.get("sourceHint")
    if not isinstance(source, dict):
        source = previous
    hint = {}
    try:
        page = _text(source.get("page"), 240)
        if page.startswith("/") and not page.startswith("//") and not any(char in page for char in "?#\\"):
            hint["page"] = page
    except ValueError:
        pass
    section = _human_section(source.get("section")) or _human_section(source.get("sourceSection"))
    if section:
        hint["section"] = section
    return hint


def _previous_slots(context: Any) -> dict[str, str]:
    previous = context.get("previousIntent") if isinstance(context, dict) else None
    if not isinstance(previous, dict):
        return {}
    values = {}
    for name in SLOT_NAMES:
        try:
            value = _text(previous.get(name), 240)
        except ValueError:
            continue
        if name not in _ENUMS or value in _ENUMS[name]:
            values[name] = value
    focus = (
        _human_section(previous.get("section"))
        or _human_section(previous.get("sourceSection"))
        or semantic_source_hint(context).get("section", "")
    )
    if focus:
        values.setdefault("businessFocus", focus)
    selected_view = _human_section(previous.get("selectedState"))
    if selected_view:
        values.setdefault("view", selected_view)
    prior_intent = previous.get("intentContext")
    slots = prior_intent.get("slots") if isinstance(prior_intent, dict) else None
    if isinstance(slots, dict):
        for name in SLOT_NAMES:
            slot = slots.get(name)
            if not isinstance(slot, dict):
                continue
            if slot.get("source") == "clear" and slot.get("evidence"):
                values.pop(name, None)
                continue
            if slot.get("source") not in {"current", "previous"}:
                continue
            try:
                value = _text(slot.get("value"), 240)
            except ValueError:
                continue
            if name not in _ENUMS or value in _ENUMS[name]:
                values[name] = value
    return values


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
    for name, value in _previous_slots(context).items():
        add(value, 240, identity=name == "recordIdentity")
    for name in ("section", "sourceSection"):
        add(_human_section(previous.get(name)), 240)
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
        context = {"resolvedIntent": self.public_json()}
        slots = dict(self.slots)
        focus = slots.get("businessFocus")
        prior_focus = _previous_slots(previous_context).get("businessFocus")
        compatible_focus = focus is not None and not (focus.source == "clear" and focus.evidence)
        if focus and focus.source == "current" and prior_focus:
            compatible_focus = _normalized(focus.value) == _normalized(prior_focus)
        if self.relation in {"continue", "refine"} and compatible_focus:
            hint = semantic_source_hint(previous_context)
            # A previously cleared focus must not return indirectly as a source label.
            if hint and (prior_focus or not hint.get("section") or (focus and focus.value)):
                context["sourceHint"] = hint
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
    if not isinstance(slots, dict) or set(slots) not in (set(SLOT_NAMES), set(SLOT_NAMES) - {"businessFocus"}):
        raise ValueError("intent resolution requires exactly the semantic slots")
    slots = dict(slots)
    slots.setdefault("businessFocus", {"source": "unspecified", "value": "", "evidence": ""})
    if not isinstance(question, str) or _CREDENTIAL.search(question):
        raise ValueError("invalid question for intent resolution")
    current_source = _normalized(question)
    previous_sources, previous_identities = _previous_sources(conversation_context)
    prior_slots = _previous_slots(conversation_context)
    resolved_slots = []
    for name in SLOT_NAMES:
        slot = slots[name]
        if not isinstance(slot, dict) or set(slot) != {"source", "value", "evidence"}:
            raise ValueError("intent slot has unexpected or missing keys")
        source = slot["source"]
        if not isinstance(source, str) or source not in {"current", "previous", "clear", "unspecified"}:
            raise ValueError("invalid intent slot source")
        value = _text(slot["value"], 240, allow_empty=source in {"clear", "unspecified"})
        evidence = _text(slot["evidence"], 500, allow_empty=source in {"clear", "unspecified"})
        if source in {"clear", "unspecified"}:
            if value or (source == "unspecified" and evidence):
                raise ValueError("omitted intent slot must have empty value and unspecified evidence")
            if source == "clear" and evidence and _normalized(evidence) not in current_source:
                raise ValueError("cleared intent slot requires evidence from the current question")
        else:
            if name in _ENUMS and value not in _ENUMS[name]:
                raise ValueError("invalid intent slot enum")
            evidence_sources = [current_source] if source == "current" else previous_sources
            if not any(_normalized(evidence) in candidate for candidate in evidence_sources):
                raise ValueError(f"intent slot evidence is absent from its declared source (slot={name}, source={source})")
            if name == "recordIdentity":
                identity = _normalized(value)
                if source == "current" and not _literal_identity_in(identity, current_source):
                    raise ValueError("current record identity is absent from the question")
                if source == "previous" and identity not in previous_identities:
                    raise ValueError("inherited record identity is not the previous known identity")
        # An omitted condition is not a user-requested reset. Apply the semantic
        # delta only within a continuing topic, never across a switch or expansion.
        omitted = source == "unspecified" or (source == "clear" and not evidence)
        if omitted and relation in {"continue", "refine"} and name in prior_slots:
            source, value, evidence = "previous", prior_slots[name], prior_slots[name]
        elif name == "businessFocus" and relation in {"switch", "broaden"} and source == "previous":
            source, value, evidence = "unspecified", "", ""
        resolved_slots.append((name, IntentSlot(source, value, evidence)))
    options = payload["clarificationOptions"]
    if not isinstance(options, list) or len(options) != (2 if relation == "clarify" else 0):
        raise ValueError("clarification requires exactly two options and other relations none")
    safe_options = _clarification_labels(options) if options else ()
    if safe_options and _splits_requested_conjunction(question, safe_options):
        raise ValueError("clarification splits explicitly requested conjuncts; preserve both requested criteria")
    return IntentResolution(relation, tuple(resolved_slots), tuple(safe_options))


def _splits_requested_conjunction(question: str, options: tuple[str, str]) -> bool:
    """Reject a literal X-and-Y request being restated as an X-or-Y choice."""
    words = [set(re.findall(r"\w+", _normalized(option))) for option in options]
    distinct = [words[0] - words[1], words[1] - words[0]]
    if not all(distinct):
        return False
    for conjunction in re.finditer(r"\band\b", _normalized(question)):
        before = set(re.findall(r"\w+", _normalized(question)[:conjunction.start()]))
        after = set(re.findall(r"\w+", _normalized(question)[conjunction.end():]))
        if any(left <= before and right <= after for left, right in (distinct, distinct[::-1])):
            return True
    return False


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
