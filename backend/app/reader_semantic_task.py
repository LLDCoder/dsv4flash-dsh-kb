"""Turn-local semantic hints for the deployed reader, never facts or authority.

Reuse V3's TaskSpec at the legacy executor boundary. Literal question parsing
remains available, but equivalent languages no longer need different routing
grammars. No model output is an executable route, filter or permission grant.
"""
from contextvars import ContextVar
from dataclasses import dataclass
import re
from typing import Literal
from pydantic import Field

from .generic_reader_contracts import Contract, TaskSpec
from .reader_request_boundary import REQUEST_BOUNDARY_POLICY


class SubjectBinding(Contract):
    semanticRole: Literal['business_target', 'responsible_person']
    name: str = Field(min_length=1, max_length=100)
    questionQuote: str = Field(min_length=1, max_length=600)


class ReaderTaskSpec(TaskSpec):
    # Literal user subjects, not page identities or permission scopes.
    requestKind: Literal['business_read', 'business_change', 'account_profile', 'assistant_capabilities'] = 'business_read'
    subjectBindings: list[SubjectBinding] = Field(default_factory=list, max_length=5)


TASK_INSTRUCTION = """Analyze the original question into the existing TaskSpec.
Return semantic requirements only: no page/endpoint guesses, answers, counts,
live values, permission decisions or executable actions. Use concise ordinary
English concepts in semantic slots in both English and Arabic. Semantic field
values MUST be English, not Arabic sentences or bilingual labels. Only evidence
quotes and literal names/identifiers retain the user's language. Keep identifiers
and named people/organizations exactly as the original question spells them.
The counted entity and grouping dimension are separate. Preserve EVERY requested
measure, property, negation, exception, date, ordering and ownership constraint.
For team workload aggregation, unqualified staff/member/employee/officer is a
person grouping term, not a formal assigned-role filter. Do not invent
'officers only' from 'each Officer'. Preserve a role restriction when the user
explicitly specifies a formal/qualified role, a role category, or says only
that role; never flatten 'Licensing Officer only' into all team members.
Do not infer team/global ownership from a role, page or department name. A user's
requestedScope never grants access. Current wording replaces incompatible history.
For an elliptical follow-up inherit only omitted compatible semantic conditions,
never prior facts or routes. For a new topic do not inherit old record/filter slots.
Profile/identity/capability requests concern the current signed-in account, not
business rows. Unknown is not zero. Mark unresolved requirements rather than guess.
Use slotUpdates with exact original quotes for current constraints; previous
updates must cite a supplied prior question, not an answer. A stored identifier
must occur literally in the current question or in a compatible bound antecedent.
recordIdentity is a SINGLE literal identifier. If several distinct identifiers
are requested, leave recordIdentity empty and preserve EACH literal in filters
or requestedAttributes; never combine identifiers into an invented scalar ID.
Additional requirements must not be dropped to fit a simpler execution shape.
slotUpdates.value MUST equal the final corresponding TaskSpec field exactly;
evidence is a separate literal quote, not the value. A requestedScope of unknown
is valid when the user did not specify ownership: the current permission policy
decides the readable scope later. For CURRENT rendered SLA/overdue values no
timestamp/timeField is required. unresolvedSlots lists only ambiguities in what
the USER means that actually prevent interpretation, not missing live page fields.
Put each explicitly named business target or responsible person into
subjectBindings, using its exact literal name (without possessive suffix), an
exact questionQuote containing that name and its semanticRole. A target's own
records are a target filter, NOT the signed-in user's personal scope. Do not
bind names only mentioned in exclusions. Never infer a subject from a page,
an answer or a role label. subjectBindings is empty when no subject is named.
Set requestKind to business_change for a direct request to execute an approval,
rejection, assignment, modification, payment, export or other business mutation.
Questions about how the authorized process works are NOT business_change.
The executor will refuse business_change; this classification never grants access.
Set requestKind to account_profile for the CURRENT SIGNED-IN ACCOUNT's role,
department, identity or data access; assistant_capabilities for what this
assistant can do; business_read otherwise. For account_profile and
assistant_capabilities recordIdentity MUST be empty: 'me', 'current user' or
translations are semantic references, not literal business record identifiers.
Evidence quotes MUST be verbatim substrings, including punctuation and spaces;
never translate, summarize, normalize or append an explanation to a quote.
In Arabic, attached prefixes change spelling: do NOT cite 'المهام' if the
question says 'للمهام'. For current slotUpdates use originalQuestion verbatim
as evidence to avoid changing such spellings.
If a shorter exact quote is uncertain, use the entire original question. Keep
slotUpdates empty rather than fabricate a citation; preserve the requirements
in the corresponding TaskSpec fields regardless.
""" + "\n" + REQUEST_BOUNDARY_POLICY


@dataclass(frozen=True)
class SemanticTask:
    original: str
    task: TaskSpec

    def text(self) -> str:
        """Only for semantic dispatch; never substitute the user's question."""
        t = self.task
        return " ".join((t.businessObject, t.businessFocus, t.requestedGrain,
                         *t.requestedMeasures, *t.requestedAttributes, *t.filters,
                         t.timeRange, t.timeField, *t.requestedOrdering,
                         *("by " + group for group in t.groupBy), t.outputShape))


current_task: ContextVar[SemanticTask | None] = ContextVar("admin_reader_semantic_task", default=None)


def semantic_context(context: dict) -> dict:
    """Only user-stated antecedents enter interpretation, not prior live facts."""
    previous = context.get("previousIntent")
    if not isinstance(previous, dict) or not isinstance(previous.get("question"), str):
        return {}
    return {"previousIntent": {"question": previous["question"][:10000]}}


def validate_task(task: TaskSpec, question: str, context: dict) -> SemanticTask:
    """Fail closed on fabricated literals and unsupported semantic inheritance."""
    prior = context.get("previousIntent") or {}
    antecedent = str(prior.get("question") or "") if isinstance(prior, dict) else ""
    if task.contextRelation not in {"continue", "refine"}:
        antecedent = ""
    for subject in getattr(task, 'subjectBindings', []):
        if (subject.questionQuote not in question and subject.questionQuote not in antecedent
                or subject.name not in subject.questionQuote):
            raise ValueError('semantic_task_subject_unbound')
    semantic_labels = [task.businessObject, task.requestedGrain,
        *task.requestedAttributes, *task.requestedMeasures, *task.requestedOrdering, *task.groupBy]
    if any(re.search(r'[\u0600-\u06ff]', label) for label in semantic_labels):
        raise ValueError("semantic_task_labels_not_canonical_english")
    for update in task.slotUpdates:
        if update.source not in {"current", "previous", "clear"}:
            raise ValueError("semantic_task_untrusted_slot_source")
        source = antecedent if update.source == "previous" else question
        if not update.evidence or update.evidence not in source:
            raise ValueError("semantic_task_quote_unbound")
        if update.source != "clear" and update.value != getattr(task, update.field):
            raise ValueError("semantic_task_slot_value_conflict")
    if task.recordIdentity and task.recordIdentity not in question and task.recordIdentity not in antecedent:
        raise ValueError("semantic_task_identity_unbound")
    # Dates/record references in semantic slots may only come from actual user
    # wording. The clock resolves 'today' later, not the intent model.
    semantics = " ".join((task.businessObject, task.businessFocus, task.recordIdentity,
                           task.timeRange, task.timeField, *task.filters,
                           *task.requestedAttributes, *task.requestedMeasures,
                           *task.requestedOrdering, *task.groupBy))
    for literal in re.findall(r"\d{4}-\d{2}-\d{2}|[A-Z]{2,}-\d[\w-]+", semantics):
        if literal not in question and literal not in antecedent:
            raise ValueError("semantic_task_literal_unbound")
    if task.unresolvedSlots or task.clarification or (
            not task.readOnly and getattr(task, 'requestKind', '') != 'business_change'):
        raise ValueError("semantic_task_not_resolved_read")
    return SemanticTask(question, task)


def bound_subject(question: str, role: str) -> str:
    task = semantic_task(question)
    subjects = [item.name for item in getattr(task, 'subjectBindings', [])
                if item.semanticRole == role]
    return subjects[0] if len(set(subjects)) == 1 else ''


def semantic_task(question: str) -> TaskSpec | None:
    current = current_task.get()
    return current.task if current and current.original == question else None


def dispatch_text(question: str) -> str:
    current = current_task.get()
    # Retain all original qualifiers (limits, exceptions, names, negation).
    # Semantic text is an interpretation aid, never a rewritten request.
    return question + " " + current.text() if current and current.original == question else question


def profile_request(question: str) -> bool:
    task = semantic_task(question)
    if task is None or task.requestedMeasures or task.groupBy or task.recordIdentity:
        return False
    if getattr(task, 'requestKind', '') in {'account_profile', 'assistant_capabilities'}:
        return True
    return bool(re.search(r"\b(?:profile|identity|account|assistant|capabilit(?:y|ies))\b",
                          task.businessObject, re.I)) and bool(re.search(
        r"\b(?:department|role|position|scope|access|permission|capabilit|help)", dispatch_text(question), re.I))
