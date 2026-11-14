"""Inspection deadline contract shared by aggregate and exact-record reads.

UMC offset-less DateTime values are Dubai wall-clock values. Configured SLA
budgets and last-update timestamps are not measurements of remaining time.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import math
import re

CONTRACT = 'inspection-deadline/1'
BUSINESS_ZONE = ZoneInfo('Asia/Dubai')
ACTIVE = {'PENDING_VISIT', 'IN_PROGRESS'}
TERMINAL = {'COMPLETED', 'CANCELLED', 'CANCELED', 'ACCESS_FAILED'}
STATUS_CODES = {'0':'QUEUED','1':'PENDING_VISIT','2':'IN_PROGRESS','3':'ACCESS_FAILED','4':'COMPLETED','5':'CANCELLED'}

def canonical_state(value):
    text = str(value if value is not None else '').strip()
    return STATUS_CODES.get(text, re.sub(r'[\s-]+', '_', re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', text)).upper())

def parse_wire_time(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace('Z', '+00:00'))
    except (ValueError, OverflowError):
        return None
    return (parsed.replace(tzinfo=BUSINESS_ZONE) if parsed.tzinfo is None else parsed).astimezone(timezone.utc)

def deadline_value(row):
    sla = row.get('sla') if isinstance(row.get('sla'), dict) else {}
    config = row.get('inspectionConfig') if isinstance(row.get('inspectionConfig'), dict) else {}
    return sla.get('dueOn') or row.get('dueDate') or config.get('dueDate') or row.get('slaDeadlineAt')

def project_task_deadline(row, reference_utc):
    if reference_utc.tzinfo is None:
        raise ValueError('inspection_reference_clock_requires_timezone')
    reference_utc = reference_utc.astimezone(timezone.utc)
    sla = row.get('sla') if isinstance(row.get('sla'), dict) else {}
    raw_due = deadline_value(row)
    due = parse_wire_time(raw_due)
    state = canonical_state(row.get('statusCode', row.get('statusName', row.get('status'))))
    out = {'contract': CONTRACT, 'referenceUtc': reference_utc.isoformat(), 'businessTimeZone': str(BUSINESS_ZONE),
           'sourceDeadline': raw_due, 'deadlineUtc': due.isoformat() if due else None,
           'deadlineDubai': due.astimezone(BUSINESS_ZONE).isoformat() if due else None,
           'slaState': 'unavailable', 'isOverdue': None, 'overdueDays': None, 'basis': 'unavailable'}
    if state in TERMINAL:
        code = canonical_state(sla.get('statusCode') or sla.get('displayText') or row.get('slaLabel'))
        late = True if code == 'EXCEEDED' else False if code in {'ON_TIME', 'ONTIME'} else None
        completed = parse_wire_time(sla.get('completedOn') or row.get('completedOn'))
        if late is None and due and completed:
            late = completed > due
        if late is not None:
            out.update(slaState='exceeded' if late else 'on_time', isOverdue=late, basis='recorded_completion')
        return out
    if state in ACTIVE and due:
        elapsed = (reference_utc - due).total_seconds()
        overdue = elapsed > 0
        out.update(slaState='overdue' if overdue else 'due_today' if due.astimezone(BUSINESS_ZONE).date()==reference_utc.astimezone(BUSINESS_ZONE).date() else 'remaining',
                   isOverdue=overdue, overdueDays=math.ceil(elapsed / 86400) if overdue else 0,
                   elapsedSeconds=elapsed, basis='deadline')
    elif state in ACTIVE and raw_due:
        out['basis'] = 'invalid_deadline'
    return out
