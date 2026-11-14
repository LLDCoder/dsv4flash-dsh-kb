"""Pure requirement checks for normalized queries, never records or authority.

These checks decide which existing projection can satisfy a query. They contain
no account, record, date, result count, route or language-specific test fixture.
Unknown row predicates stay on the generic path instead of being discarded.
"""
import re


def fact_output_limit(completeness, workflow):
    # Exhaustive, authorized projections must not silently become first-page
    # samples at serialization or rendering. The same finite output budget is
    # used at both boundaries; this does not authorize additional source reads.
    return 2000 if workflow in {'team_work_query','inspection_team_assignment_full',
        'previous_answer_presentation', 'previous_answer_fields_verified'} else 500 if completeness == 'complete' or workflow in {
        'inspection_overdue_full', 'inspection_sla_api_verified', 'inspection_date_list_full',
        'inspection_team_assignment_full', 'inspection_detail_full', 'team_member_cards_full',
    } else 20


def _has(pattern, value):
    from .reader_integrity import concept_text
    return bool(re.search(pattern, concept_text(value), re.I))


def _concept_terms(value):
    return {word[:-1] if word.endswith('s') and not word.endswith(('ss','us','is')) else word
            for word in re.findall(r'[a-z]+|\d+|[^\w\s]',str(value).casefold())}


def _same_application_object_label(predicate, business_object):
    # Remove a duplicated object selector, never a property/operator/value.
    # Qualified objects and arbitrary tokens are not treated as redundant.
    allowed={'license','licence','licensing','application','request'}
    obj=_concept_terms(business_object);pred=_concept_terms(predicate)
    return bool(obj and obj <= allowed and pred and pred <= allowed
                and obj & {'license','licence','licensing'}
                and obj & {'application','request'} and pred & {'application','request'})


def _application_sla_filter_compatible(predicate,business_object):
    if _same_application_object_label(predicate,business_object):
        return True
    terms=_concept_terms(predicate)
    allowed={'license','licence','licensing','application','request','pending','unfinished',
             'to','do','status','state','is','equal','only','all','the','and',
             'overdue','late','past','due','sla','deadline','breach','breached','delay','delayed'}
    if not terms or not terms <= allowed:
        return False
    # Positive conjunctions over the supported pending queue/deadline state
    # are independent of word order and noun inflection. Unknown operators,
    # values, negatives and qualified approval stages are never discarded.
    return (bool(terms & {'pending','unfinished','overdue','late','breach','breached','delayed'})
            or {'to','do'} <= terms
            or ('past' in terms and bool(terms & {'due','deadline','sla'})))


def profile_access_requested(task):
    if task is None or task.requestKind not in {'account_profile', 'assistant_capabilities'}:
        return False
    return task.requestKind == 'assistant_capabilities' or any(
        _has(r'\b(?:scope|range|permissions?|capabilit\w*|readable|viewable|accessible|access)\b', field)
        or (_has(r'\b(?:records?|modules?|pages?|areas?)\b', field)
            and _has(r'\b(?:read|view|allowed|authorized|permitted)\b', field))
        for field in (*task.requestedAttributes, task.businessFocus))


def application_lifecycle_requested(task):
    if task is None:
        return True
    for field in task.requestedAttributes:
        if _has(r'^(?:status|state|decision|outcome)$', field.strip()):
            # Unqualified status belongs to the requested record, unless the
            # semantic object explicitly identifies a payment or complaint.
            if not _has(r'\b(?:payment|transaction|complaint)\b', task.businessObject):
                return True
        if (_has(r'\b(?:application|licen[cs]e|licensing|record|workflow|approval|rejection)\b', field)
                and _has(r'\b(?:status|state|decision|outcome)\b', field)
                and not _has(r'\b(?:payment|transaction|complaint)\b', field)):
            return True
    return False


def application_sla_order_compatible(task):
    """An ordering is itself a query requirement, even without an urgency ask.

    Only the queue-wide pending state is supported here. A particular approval
    stage, person, date, threshold, negated lateness or another order remains
    on the generic filtered path instead of silently losing its predicates.
    """
    mode=getattr(task,'rowSelection','unspecified')if task is not None else'unspecified'
    selection=mode in {'maximum','minimum'}and getattr(task,'deadlineState','')=='overdue'
    def selection_expression(value):
        terms=_concept_terms(value)
        words={'sla','overdue','delay','duration','day','lateness','at','the','all','tied','tie','with','maximum','minimum','max','min',
            'longest','shortest','greatest','least','highest','lowest','most','fewest','descending','ascending','only'}
        return bool(selection and terms and terms<=words and terms&{'sla','overdue','delay','lateness'})
    if (task is None or not task.readOnly or not task.needsLiveData
            or task.requestKind != 'business_read' or task.recordIdentity or task.subjectBindings
            or task.requestedScope not in {'personal','team','unknown'} or task.groupBy
            or task.timeRange.casefold() not in {'','unknown','current','currently','now','today'}
            or task.timeField or task.deadlineState in {'not_overdue','mixed'}
            or not _has(r'\blicen[cs](?:e|ing)?\b',task.businessObject)
            or not _has(r'\b(?:applications?|requests?)\b',task.businessObject)
            or not(task.requestedOrdering or selection)):
        return False
    if any(not (_has(r'\b(?:sla|overdue|delay\w*|lateness)\b',order)
                    and (_has(r'\bdescend',order) or _has(r'\b(?:longest|highest|greatest)\b.*\b(?:shortest|lowest|smallest)\b',order)))
               and not selection_expression(order)
           for order in task.requestedOrdering):
        return False
    return all(_application_sla_filter_compatible(f,task.businessObject)or selection_expression(f)for f in task.filters)


def team_overdue_count_compatible(task):
    if (task is None or not task.readOnly or not task.needsLiveData
            or task.requestKind != 'business_read'
            or task.requestedScope not in {'team', 'unknown'}
            or task.recordIdentity or task.subjectBindings or task.requestedOrdering
            or task.timeField or task.outputLimit is not None
            or task.deadlineState in {'not_overdue', 'mixed'}
            or task.timeRange not in {'', 'current', 'unknown', 'unspecified'}
            or not _has(r'\b(?:tickets?|tasks?|jobs?|work\s+(?:orders?|items?))\b', task.businessObject)):
        return False
    # This executor answers one overdue count, never an independent state breakdown.
    if any(_has(r'\b(?:pending|open|unresolved|unfinished|closed|completed|resolved)\b', f) for f in task.requestedMeasures):
        return False
    if not (task.deadlineState == 'overdue' or any(
            _has(r'\boverdue\b|\bpast\s+(?:due|deadline)\b', f) for f in task.filters)):
        return False
    if not any(_has(r'\b(?:count|how many|number|total)\b', f) for f in task.requestedMeasures):
        return False
    if any(_has(r'\b(?:average|sum|rate|percent|duration|days|completion)\b', f)
           or not _has(r'\b(?:count|how many|number|total)\b', f) for f in task.requestedMeasures):
        return False
    owner = r'\b(?:responsible|owner|assignee|assigned|person|people|staff|employee|individual)\b'
    if any(not _has(owner, f) for f in task.groupBy):
        return False
    for field in task.requestedAttributes:
        if _has(owner, field) and not _has(r'\b(?:contact|phone|email|salary|private|notes?)\b', field):
            continue
        if _has(r'^(?:overdue|late|deadline|sla)(?:\s+(?:status|state|marker|flag))?$', field.strip()):
            continue
        return False
    for predicate in task.filters:
        text = predicate.strip()
        # Excluding the all-work TOTAL changes the requested output measure;
        # it is not a negated row predicate. Other exclusions remain generic.
        words = re.findall(r'[a-z]+', text.casefold())
        metric_words = {'the', 'total', 'count', 'counts', 'of', 'all', 'work', 'workload',
                        'item', 'items', 'task', 'tasks', 'ticket', 'tickets'}
        if (words and words[0] in {'exclude', 'excluding', 'omit', 'not'}
                and {'total', 'count', 'counts'}.intersection(words[1:])
                and set(words[1:]) <= metric_words):
            continue
        if not re.fullmatch(
                r'(?:(?:only|my|our|current|authorized|team|work|workload|items?|tasks?|tickets?|jobs?|'
                r'are|is|with|in|within|their|the|sla|deadline|time|state|status|marker|past|due|overdue|late|delayed|delay|scope)\s*)+', text, re.I):
            return False
    return True


def rank_requested_rows(rows, task, *, extreme_only=False):
    """A requested ordering and extremum are additive; explicit limits win."""
    if not rows:
        return []
    mode=getattr(task,'rowSelection','unspecified')if task is not None else'unspecified'
    if mode in {'maximum','minimum'}:
        extreme=(max if mode=='maximum'else min)(row[0]for row in rows)
        rows=[row for row in rows if row[0]==extreme]
    if task is not None and task.outputLimit is not None:
        return rows[:task.outputLimit]
    if mode=='unspecified'and extreme_only and not (task is not None and task.requestedOrdering):
        return [row for row in rows if row[0] == rows[0][0]]
    return rows
