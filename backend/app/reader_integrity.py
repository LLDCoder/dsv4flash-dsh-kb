import re
"""Pure, source-bound presentation and vocabulary normalization.

No account, record, question fixture, business count or permission is stored here.
"""
import json
import re
import unicodedata
from collections import Counter


def concept_text(value):
    text = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', str(value or ''))
    return re.sub(r'[_-]+', ' ', text).casefold().strip()


def identity_key(value):
    """Normalize names without erasing Arabic, Chinese or other letters."""
    return ''.join(char for char in unicodedata.normalize('NFC', str(value or '')).casefold()
                   if char.isalnum())


# Page chrome: the view's own controls, not a constraint on records. A time
# window or a section tab does not narrow a roster read, and treating it as a
# filter forced a page-scraping fallback that never converged.
_CHROME_FILTER = re.compile(r'^(?:time|date|period|range|window)\s*(?:filter|range|period)?$'
                            r'|^(?:department|section|tab|tabs|role|roleVariant|view)$', re.I)


def effective_page_filters(page):
    """Separate the publisher's empty table envelope from real constraints.

    This is a hint, never permission or proof of a population. Ignore only the
    known envelope with a literal empty filter mapping. Unknown, malformed,
    nonempty or typed values (including false/zero) must still block an
    unfiltered native read. Do not test truthiness of individual field values.
    """
    hints = page.get('filters') if isinstance(page, dict) else None
    if not isinstance(hints, list):
        return hints or []
    active = []
    for hint in hints:
        empty = False
        if isinstance(hint, dict) and hint.get('name') == 'tableFilters':
            try:
                envelope = json.loads(hint.get('value'))
            except (ValueError, TypeError):
                envelope = None
            empty = (isinstance(envelope, dict)
                     and set(envelope) == {'contextVersion', 'filters'}
                     and isinstance(envelope.get('contextVersion'), str)
                     and bool(envelope['contextVersion'].strip())
                     and type(envelope.get('filters')) is dict
                     and not envelope['filters'])
        if not empty and not (isinstance(hint, dict)
                              and _CHROME_FILTER.match(str(hint.get('name') or ''))):
            active.append(hint)
    return active


def previous_summary_facts(snapshot, task, language='en'):
    """Summarize an exhaustive prior answer without inventing a new aggregate.

    Existing aggregate/missing-data statements remain verbatim. Detailed rows
    may be omitted from the summary, never described as absent from history.
    Field/rank/time projections still use their existing validated executors.
    """
    facts = snapshot.get('sourceFacts')
    if (getattr(task, 'presentationMode', '') != 'summary'
            or getattr(task, 'outputLimit', None) is not None
            or not isinstance(facts, list) or not facts
            or snapshot.get('sourceFactsComplete') is not True
            or snapshot.get('sourceFactCount') != len(facts)):
        return None
    parsed = []
    for fact in facts:
        try:
            value = json.loads(fact)
        except (TypeError, ValueError):
            value = None
        parsed.append(value)
    schemas = Counter(tuple(sorted(row)) for row in parsed if isinstance(row, dict) and row)
    # Only compact a long repeated table. Keep scalar/member/category totals
    # and short verified tables verbatim rather than generating new aggregates.
    tables = {schema for schema, count in schemas.items() if count > 64}
    from .inspection_sla_api import verified_summary_facts
    aggregates=list(verified_summary_facts(snapshot))
    if not tables:
        return tuple([*aggregates,*facts])
    rows, statements = [], aggregates
    for fact, value in zip(facts, parsed):
        (rows if isinstance(value, dict) and tuple(sorted(value)) in tables else statements).append(fact)
    # Count the records in the preceding displayed answer, not an upstream
    # population or an inferred calendar/status grouping.
    row_note = (f'عدد السجلات المفصلة المعروضة في الإجابة السابقة: {len(rows)}.'
                if language == 'ar' else
                f'Detailed records displayed in the preceding answer: {len(rows)}.')
    boundary = ('هذا ملخص لنفس القراءة السابقة وفي نطاقها؛ لم تُحدّث السجلات، '
                'ولا يؤكد حقولاً أو سجلات لم تتضمنها تلك القراءة.' if language == 'ar' else
                'This summarizes the same preceding read and its scope; records were not refreshed. '
                'It does not verify fields or records outside that read.')
    return tuple([*statements, row_note, boundary])


def generic_queue_source(task, context, eligible):
    """Prefer a permitted current/unique queue to unrelated retrieved manuals.

    ``eligible`` is computed from fresh server permissions by the caller.
    This selects a candidate only; the normal read policy still authorizes it.
    """
    if (task is None or not task.needsLiveData or not task.readOnly
            or task.requestKind != 'business_read' or task.recordIdentity
            or not re.fullmatch(r'(?:(?:team|staff|employee|current|assigned)\s+)*'
                                r'(?:tasks?|tickets?|work items?|work orders?|queues?|cases?)',
                                concept_text(task.businessObject))):
        return ''
    current = context.get('currentPage') or {}
    route = current.get('route') or current.get('currentPage') or '' if isinstance(current, dict) else current
    route = str(route).split('?', 1)[0].rstrip('/')
    if route in eligible:
        return route
    return eligible[0] if len(eligible) == 1 else ''


def closed_ticket_status(status, source_type=''):
    """Terminal workflow labels; being in a Completed tab is not a status.

    Appeal approval closes the appeal; refund approval may still await payment.
    The source type must come from the authorized query DTO, never an ID prefix.
    """
    return (concept_text(source_type) == 'appeal' and concept_text(status) == 'approved') or concept_text(status) in {
        'closed', 'completed', 'resolved', 'cancelled', 'canceled',
        'rejected', 'withdrawn', 'refunded',
    }


def open_ticket_status(status):
    label = concept_text(status)
    return label in {'open', 'in progress', 'assigned', 'department processing', 'department processed'} or bool(
        re.match(r'^(?:pending|awaiting)\b', label))


def team_summary_compatible(task):
    """Never bypass a date, category, threshold or negated predicate."""
    if task.timeField or task.outputLimit is not None or task.requestedOrdering:
        return False
    for predicate in task.filters:
        terms = set(re.findall(r'[a-z]+', concept_text(predicate)))
        allowed = {'pending', 'open', 'unresolved', 'unfinished', 'overdue', 'late', 'delayed', 'closed', 'completed',
                   'tickets', 'ticket', 'tasks', 'task', 'count', 'counts', 'my',
                   'our', 'team', 'scope', 'current', 'employee', 'staff', 'per',
                   'each', 'member', 'members', 'and', 'the', 'of', 'in', 'status', 'deadline', 'state'}
        if not terms or not terms <= allowed:
            return False
    for c in task.rowConditions:
        if c.property == 'unsupported':
            # A fixed source-backed status/SLA concept can be executed even
            # when the interpretation conservatively marked its operator
            # unsupported. Thresholds, negation and qualifiers remain barred
            # by the complete predicate vocabulary check above.
            value=concept_text(c.value)
            state_words={'pending','open','unresolved','unfinished','overdue','late','delayed','closed','completed'}
            qualifiers={'ticket','tickets','task','tasks','deadline','state','status','count','counts'}
            # These are a finite status-concept vocabulary, not phrase patterns.
            # Word order and optional field qualifiers do not change the predicate.
            # Reject numbers, operators, negation and unknown qualifiers as a whole.
            terms=set(value.split())
            if (c.operator not in {'eq','unsupported'} or not re.fullmatch(r'[a-z]+(?: [a-z]+)*',value)
                    or not terms & state_words or not terms <= state_words | qualifiers):
                return False
        elif not (c.operator == 'eq' and (
                c.property == 'scope' and c.value == 'current_team'
                or c.property == 'workflow_state' and c.value in {'open', 'closed', 'all'})):
            return False
    return True
