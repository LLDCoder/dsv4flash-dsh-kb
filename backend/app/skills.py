import re
from typing import Any


def requested_response_language(text: str) -> str | None:
    """Return an explicitly requested output language, when one is present.

    Explicit requests must win over script heuristics: Arabic users may ask for
    English and English users may ask for Arabic in the same turn.
    """
    value = str(text or "")
    if re.search(r"\b(?:in|answer|respond|reply|write)\s+(?:in\s+)?english\b|بال(?:لغة\s+)?الإنجليزية|بالإنجليزية", value, re.I):
        return "en"
    if re.search(r"\b(?:in|answer|respond|reply|write)\s+(?:in\s+)?arabic\b|بال(?:لغة\s+)?العربية|بالعربية", value, re.I):
        return "ar"
    if re.search(r"\b(?:in|answer|respond|reply|write)\s+(?:in\s+)?chinese\b|用中文|中文回答|中文回复", value, re.I):
        return "zh"
    return None


def _message_language_counts(text: str) -> dict[str, int]:
    """Count the letters of each supported script; digits and emoji are ignored."""

    value = str(text or "")
    return {
        "ar": sum(
            1
            for char in value
            if "\u0600" <= char <= "\u06ff"
            or "\u0750" <= char <= "\u077f"
            or "\u08a0" <= char <= "\u08ff"
            or "\ufb50" <= char <= "\ufdff"
            or "\ufe70" <= char <= "\ufeff"
        ),
        "en": sum(1 for char in value if ("A" <= char <= "Z") or ("a" <= char <= "z")),
        "zh": sum(1 for char in value if "\u3400" <= char <= "\u4dbf" or "\u4e00" <= char <= "\u9fff"),
    }


# A script needs at least this many letters before it can decide the reply
# language.  Bare identifiers such as "HC-02-2026-5239576" carry two Latin
# letters and are not evidence that the user wrote English.
_MIN_LANGUAGE_LETTERS = 3


def detect_message_language(text: str) -> str:
    """Return the message's own language when one script clearly dominates, else ""."""

    counts = _message_language_counts(text)
    eligible = {code: count for code, count in counts.items() if count >= _MIN_LANGUAGE_LETTERS}
    if not eligible:
        return ""
    top = max(eligible.values())
    winners = [code for code, count in eligible.items() if count == top]
    return winners[0] if len(winners) == 1 else ""


def response_language_for(text: str, preferred_language: str | None = None) -> str:
    """Choose the output language.

    Order: an explicit request inside the message, then the language the message
    itself is written in, then the portal language the caller selected.  The
    portal language is a fallback only: it decides when the message carries no
    decidable language (identifiers, digits, symbols or emoji only) or when two
    scripts are equally represented.
    """

    explicit = requested_response_language(text)
    if explicit:
        return explicit

    detected = detect_message_language(text)
    if detected:
        return detected

    counts = _message_language_counts(text)
    eligible = {code: count for code, count in counts.items() if count >= _MIN_LANGUAGE_LETTERS}
    if eligible:
        top = max(eligible.values())
        winners = [code for code, count in eligible.items() if count == top]
        if preferred_language in winners:
            return preferred_language
        return "ar" if "ar" in winners else winners[0]

    if preferred_language in {"en", "ar", "zh"}:
        return preferred_language
    return "en"


# Runtime selection is fixed to these two generic capabilities.
DEFAULT_SKILL_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "skill_id": "admin_portal_reader",
        "name": "Admin Portal reader",
        "allowed_tools": ["knowledge.search", "admin.portal.read"],
        "dependencies": ["knowledge_gateway", "admin_portal_reader"],
        "content": (
            "Read the current Admin Portal state using the caller's verified GetUserInfo permissions. "
            "Use only knowledge.search and admin.portal.read. Visit only pages needed for the question, "
            "never perform a mutation, and distinguish success, no_data, no_permission, load_failed, and not_confirmed."
        ),
    },
    {
        "skill_id": "general_knowledge",
        "name": "General knowledge-base guidance",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "content": (
            "WHEN TO USE: General knowledge-base questions outside an Admin deployment.\n"
            "DO NOT USE WHEN: The user asks for current Admin Portal page state; use admin_portal_reader.\n"
            "PREREQUISITES: Knowledge-base evidence.\n"
            "RESPONSE RULES: Answer from retrieved evidence, state limitations when evidence is unavailable, and never invent account results, policy requirements, or API capabilities."
        ),
    },
)
