"""One population for a task query's rows, totals and owner breakdown.

This small compiler only accepts predicates its verified queue schema can
execute. Other requirements remain on the general reader, never discarded.
No identities, sample totals, test questions or account roles live here.
"""
import re

CLOSED=re.compile(r'\b(?:cancelled|canceled|completed|closed|resolved|rejected|withdrawn)\b',re.I)

def select_rows(task, rows):
    if (task is None or task.requestKind!='business_read' or not task.readOnly
            or not re.search(r'\b(?:tasks?|tickets?|work\s+items?|work\s+orders?)\b',getattr(task,'businessObject',''),re.I)
            or task.recordIdentity or task.requestedOrdering
            or task.timeRange.casefold() not in {'','current','unknown','unspecified','currently','now'}
            or task.timeField or task.timeMeaning not in {'unknown'}):
        return None
    owners=[s.name for s in task.subjectBindings if s.semanticRole=='responsible_person']
    if len(owners)>1 or any(s.semanticRole!='responsible_person'for s in task.subjectBindings):return None
    owner=owners[0]if owners else ''
    # The executor cannot silently drop a requested field or aggregate.
    fields=' '.join((*task.requestedAttributes,*task.groupBy,*task.requestedMeasures))
    if re.search(r'\b(?:average|percent|rate|sum|date|time|duration|email|phone|address|route|category|priority|overdue|completed|closed|returned|cancelled|canceled)\b',fields,re.I):
        return None
    conditions=getattr(task,'rowConditions',[])
    if conditions:
        indices=[c.filterIndex for c in conditions if c.filterIndex is not None]
        if sorted(indices)!=list(range(len(task.filters))):return None
        state_conditions=[]
        for c in conditions:
            if c.operator not in {'eq','ne'}:return None
            if c.property=='scope':
                if c.operator!='eq'or c.value!='current_team'or task.requestedScope!='team':return None
            elif c.property=='owner':
                if not owner or c.value.casefold()!=owner.casefold()or c.operator!='eq':return None
            elif c.property=='workflow_state':
                # This capability reports the open queue, not arbitrary
                # states under a misleading Pending label. Other semantic
                # conditions stay with the general filtered reader.
                if c.operator!='eq'or c.value!='open':return None
                state_conditions.append(c)
            else:return None
        if not state_conditions:return None
        selected=[]
        for row in rows:
            status=str(row.get('status')or'').strip()if isinstance(row,dict)else''
            if not status:raise ValueError('team_work_status_unavailable')
            if owner and str(row.get('assignedTo')or'').strip().casefold()!=owner.casefold():continue
            matches=True
            for c in state_conditions:
                value=c.value.casefold()
                match=(not CLOSED.search(status))if value=='open'else bool(CLOSED.search(status))if value=='closed'else True if value=='all'else status.casefold()==value
                if c.operator=='ne':match=not match
                matches=matches and match
            if matches:selected.append(row)
        return selected,owner
    pending=False
    for condition in [task.view,*task.filters]:
        text=str(condition).casefold()
        if owner:text=text.replace(owner.casefold(),' ')
        words=set(re.findall(r'[a-z]+',text))
        if words & {'not','exclude','excluding','except','before','after','more','less'}:return None
        if not words <= {'pending','open','unfinished','outstanding','current','currently','status','is','state',
                'assigned','to','responsible','for','owner','assignee','person','team','scope',
                'my','our','the','all','tasks','task','tickets','ticket','work','items','todo','do'}:
            return None
        pending=pending or bool(words & {'pending','open','unfinished','outstanding','todo'})
    pending=pending or bool(re.search(r'\b(?:pending|open|unfinished|outstanding)\b',
        ' '.join(task.requestedMeasures),re.I))
    if not pending:return None
    selected=[]
    for row in rows:
        if not isinstance(row,dict)or not str(row.get('status')or'').strip():
            raise ValueError('team_work_status_unavailable')
        if CLOSED.search(row['status']):continue
        if owner and str(row.get('assignedTo')or'').strip().casefold()!=owner.strip().casefold():continue
        selected.append(row)
    return selected,owner
