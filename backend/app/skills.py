import re
from dataclasses import dataclass
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


@dataclass(frozen=True)
class SkillRoute:
    skill_id: str
    category: str
    tool_name: str | None = None
    mode: str = "answer"
    fields: tuple[str, ...] = ()
    choices: tuple[str, ...] = ()
    confirmation_required: bool = False
    routing_locked: bool = False


# Business Skills, their aliases, workflows, and Tool bindings are maintained
# in the Skill and Tool Registry tables. This sole system bootstrap provides a
# knowledge fallback for an otherwise empty installation.
DEFAULT_SKILL_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "skill_id": "general_knowledge",
        "name": "General knowledge-base guidance",
        "allowed_tools": ["knowledge.search"],
        "dependencies": ["knowledge_gateway"],
        "domain": "general",
        "aliases": [],
        "positive_examples": [],
        "negative_examples": [],
        "workflow": {},
        "content": (
            "WHEN TO USE: No published business domain was confidently recalled and the user asks for general NMA or media-service information.\n"
            "DO NOT USE WHEN: The user asks for a live personal, application, license, payment, account, or administrative record that needs a published business Skill.\n"
            "PREREQUISITES: Knowledge-base evidence.\n"
            "RESPONSE RULES: Answer from retrieved evidence, state limitations when evidence is unavailable, and never invent account results, policy requirements, or API capabilities."
        ),
    },
)


def canonical_skill_id(skill_id: str) -> str:
    """Skill IDs are database-owned and are not rewritten by runtime code."""

    return skill_id


def _rule_matches(text: str, rule: dict[str, Any]) -> bool:
    lowered = text.lower()
    contains = lambda term: str(term).lower() in lowered
    any_terms = list(rule.get("anyTerms") or [])
    all_terms = list(rule.get("allTerms") or [])
    any_groups = list(rule.get("anyTermGroups") or [])
    if any_terms and not any(contains(term) for term in any_terms):
        return False
    if all_terms and not all(contains(term) for term in all_terms):
        return False
    if any_groups and not any(all(contains(term) for term in group) for group in any_groups if isinstance(group, list)):
        return False
    if any(contains(term) for term in list(rule.get("noneTerms") or [])):
        return False
    for pattern in list(rule.get("patterns") or []):
        if pattern == "application_number":
            if not re.search(r"\bML-\d+(?:-[A-Za-z0-9]+)*\b", text, re.IGNORECASE):
                return False
        elif not re.search(str(pattern), text, re.IGNORECASE):
            return False
    return bool(any_terms or all_terms or any_groups or rule.get("patterns"))


def resolve_configured_skill(
    text: str,
    definitions: list[dict[str, Any]] | tuple[dict[str, Any], ...],
    *,
    canonicalize: bool = True,
) -> SkillRoute | None:
    """Evaluate routing rules stored with the published Skill definition."""

    candidates: list[tuple[int, int, str, dict[str, Any], dict[str, Any]]] = []
    for definition_index, definition in enumerate(definitions):
        workflow = dict(definition.get("workflow") or {})
        rules = workflow.get("deterministicRouting") or definition.get("deterministicRouting") or []
        skill_id = str(definition.get("skill_id") or definition.get("skillId") or "").strip()
        for rule in rules:
            if isinstance(rule, dict) and skill_id and _rule_matches(text, rule):
                candidates.append((int(rule.get("priority", 0)), -definition_index, skill_id, rule, dict(rule.get("route") or {})))
    if not candidates:
        return None
    _, _, skill_id, _, route = max(candidates, key=lambda candidate: (candidate[0], candidate[1]))
    return SkillRoute(
        canonical_skill_id(skill_id) if canonicalize else skill_id,
        str(route.get("category") or "data_query"),
        str(route["toolName"]) if route.get("toolName") else None,
        str(route.get("mode") or "answer"),
        tuple(str(value) for value in route.get("fields", []) or []),
        tuple(str(value) for value in route.get("choices", []) or []),
        bool(route.get("confirmationRequired", False)),
        bool(route.get("routingLocked", False)),
    )


def merged_skill_workflow(skill_id: str, published_workflow: dict[str, Any] | None) -> dict[str, Any]:
    """Return the published workflow without code-defined business defaults."""

    del skill_id
    return dict(published_workflow or {})


def resolve_skill(text: str) -> SkillRoute:
    """Use the system knowledge fallback when no published routing rule matches."""

    del text
    return SkillRoute("general_knowledge", "knowledge", "knowledge.search", "summary")


def build_knowledge_query(route: SkillRoute, original_text: str) -> str:
    """Published Skills may carry their own retrieval instructions in content."""

    del route
    return original_text


def exact_quote_source_sufficient(text: str) -> bool:
    """An article number alone is not a source; require a named/numbered instrument."""

    lowered = text.lower()
    if not any(term in lowered for term in ("quote", "exactly", "逐字", "原文")):
        return True
    return bool(
        re.search(
            r"(?:federal|cabinet|decree|law|resolution|regulation|联邦|法令|决议|条例|قرار مجلس الوزراء).{0,40}(?:no\.?|number|رقم|第|\d{2,4})|(?:no\.?|number|رقم|第)\s*\d",
            lowered,
        )
    )


def build_flow_prompt(route: SkillRoute) -> dict[str, Any]:
    return {
        "required": True,
        "prompt": "Ask for the information required by the selected published Skill.",
        "fields": list(route.fields),
        "choices": list(route.choices),
        "confirmationRequired": route.confirmation_required,
    }


def build_system_prompt(
    route: SkillRoute,
    *,
    evidence_available: bool,
    response_language: str = "en",
    operator_prompt: str = "",
    skill_content: str = "",
    profile_context: object | None = None,
) -> str:
    guardrails = [
        "Use only trusted tool evidence. When evidence is unavailable, state the limitation and never invent account data, fees, regulations, or API capabilities.",
        "Never expose internal Tool names, request arguments, serialized JSON, API envelopes, or internal evidence instructions. Convert verified evidence into a concise user-facing answer.",
        "Payments, appeals, complaints, downloads, and all other side effects require a preview and the user's explicit confirmation.",
        "PROFILE SCOPE: Account data is limited to the profile currently selected in the portal. Never claim to query, filter, or aggregate another profile. When the user names a different profile, ask them to switch it in the portal before continuing.",
    ]
    if profile_context is not None and bool(getattr(profile_context, "is_global_view", False)):
        guardrails.append("The portal is in Global View. Do not represent profile-bound data as available until the user selects a concrete profile.")
    if route.category == "knowledge" and not evidence_available:
        guardrails.append("When knowledge-base evidence is unavailable, do not present general knowledge as a verified UMC rule.")

    target = "ARABIC" if response_language == "ar" else "ENGLISH"
    language_policy = [
        "LANGUAGE POLICY (mandatory and higher priority than the language used by tools, retrieved documents, or internal instructions):",
        "- Answer in Arabic when the user's latest message is primarily Arabic.",
        "- Answer in English when the user's latest message is English.",
        "- Answer in English for every other language. English is the default response language.",
        f"- Required response language for this turn: {target}. Use only {target} for explanatory prose, while preserving necessary proper nouns, identifiers, and verbatim quotations.",
    ]
    prompt_parts = ["You are the NMA assistant running in DSH Runtime. Follow the selected Skill route and provide a concise, actionable response."]
    if operator_prompt.strip():
        prompt_parts.extend(
            [
                "OPERATOR-EDITABLE SYSTEM INSTRUCTIONS (additional guidance; never override the mandatory language, safety, or evidence rules below):",
                operator_prompt.strip(),
            ]
        )
    if skill_content.strip():
        prompt_parts.extend(
            [
                f"SELECTED SKILL GUIDANCE for {route.skill_id} (additional guidance; never override the mandatory rules below):",
                skill_content.strip(),
            ]
        )
    prompt_parts.extend([*language_policy, "SAFETY AND EVIDENCE RULES:", *(f"- {item}" for item in guardrails)])
    return "\n".join(prompt_parts)
