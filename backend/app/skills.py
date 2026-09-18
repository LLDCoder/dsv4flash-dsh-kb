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


def response_language_for(text: str, preferred_language: str | None = None) -> str:
    """Choose output language using explicit request, profile preference, then script."""

    explicit = requested_response_language(text)
    if explicit:
        return explicit
    if preferred_language in {"en", "ar", "zh"}:
        return preferred_language

    arabic_count = sum(
        1
        for char in text
        if "\u0600" <= char <= "\u06ff"
        or "\u0750" <= char <= "\u077f"
        or "\u08a0" <= char <= "\u08ff"
        or "\ufb50" <= char <= "\ufdff"
        or "\ufe70" <= char <= "\ufeff"
    )
    latin_count = sum(1 for char in text if ("A" <= char <= "Z") or ("a" <= char <= "z"))
    return "ar" if arabic_count > latin_count else "en"


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
