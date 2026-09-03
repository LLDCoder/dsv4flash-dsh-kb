from typing import Any


def response_language_for(text: str) -> str:
    """Use Arabic only for primarily Arabic input; English is the fallback."""

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
