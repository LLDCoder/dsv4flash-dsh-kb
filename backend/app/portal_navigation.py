"""Render navigation supplied by a published, tool-free Skill."""

import re

from .skills import SkillRoute
from .skill_workflow import _matches


def continuation_route(question, initial_route, active_skill):
    if initial_route.routing_locked or initial_route.skill_id not in {"general", "general_knowledge"}:
        return None
    if not active_skill or active_skill.allowed_tools:
        return None
    navigation = (active_skill.workflow or {}).get("navigation")
    if not isinstance(navigation, dict) or not _matches(question, navigation.get("followUp")):
        return None
    return SkillRoute(active_skill.skill_id, "portal_navigation", mode="portal_navigation", routing_locked=True)


def navigation_answer(skill, language):
    if not skill or skill.allowed_tools:
        return None
    navigation = (skill.workflow or {}).get("navigation")
    if not isinstance(navigation, dict):
        return None
    path = navigation.get("path")
    labels = navigation.get("labels")
    if not isinstance(path, str) or not re.fullmatch(r"/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*", path):
        return None
    label = (labels.get(language) or labels.get("en")) if isinstance(labels, dict) else None
    if not isinstance(label, str) or not re.fullmatch(r"[^\[\]\\\n\r<>]{1,80}", label):
        return None
    return f"[{label}]({path})"
