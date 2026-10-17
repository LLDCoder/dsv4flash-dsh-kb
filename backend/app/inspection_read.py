"""Exact inspection read intent and narrow projection of gateway-owned evidence."""
import re
from .portal_reader import _sanitize_untrusted_text

MATERIALS=re.compile(r'materials?|documents?|checklist|prepar\w*|\bbring\b|\bsteps?\b|'
    r'المستندات|مستندات|الأوراق|اوراق|أوراق|المواد|مواد|خطوات|الخطوات|'
    r'أجهز|اجهز|أستعد|استعد|تجهيز|تحضير|قائمة\s+(?:الفحص|التفتيش|التحقق)',re.I)
STATUS=re.compile(r'\b(?:status|stage|state)\b|الحالة|حالة|مرحلة|وضع',re.I)

# App-owned labels from Admin Portal ar.json inspection.labels. A model may
# translate checklist descriptions, but cannot choose the current status label.
INSPECTION_STATUS_AR={
    'Queued':'في قائمة الانتظار','Pending Visit':'بانتظار الزيارة',
    'In Progress':'قيد التنفيذ','Access Failed':'تعذر الوصول',
    'Completed':'مكتمل','Cancelled':'ملغى',
}


def normalize_inspection_status(text, evidence, language):
    """Canonicalize only a verified exact task's status before publication.

    Idempotent on cumulative streaming text; never touch checklist lines,
    identities, permissions, or unverified/other-workflow prose.
    """
    receipt=evidence.get('inspectionStatus')
    if (language!='ar' or evidence.get('result') not in {'success','not_confirmed'} or evidence.get('workflowState')!='inspection_exact_detail'
            or not isinstance(receipt,dict) or receipt.get('verified') is not True
            or receipt.get('taskNo')!=evidence.get('recordIdentity')):return text
    status=receipt.get('statusName');label=INSPECTION_STATUS_AR.get(status)
    if not label or not any(isinstance(f,str) and f.startswith(
            f'Inspection {receipt["taskNo"]}: status: {status}.') for f in evidence.get('facts',[])):return text
    # Consume only exact portal labels or the observed wrong alias. Unknown
    # parenthetical prose/numbers must survive for the ordinary fact guard.
    aliases='|'.join(re.escape(s) for s in [*INSPECTION_STATUS_AR.values(),'قيد الزيارة'])
    pattern=re.compile(r'(?<![A-Za-z])('+re.escape(status)+r'(?:\*\*)?)(?:[ \t]*\((?:'+aliases+r')\))?(?![A-Za-z])')
    rows=[]
    for line in text.splitlines(keepends=True):
        if re.match(r'^\s*(?:[-*•]\s*)?(?:\*\*)?[LC]\d+(?:\*\*)?\s*:',line):
            rows.append(line);continue
        line=pattern.sub(lambda m:m[1]+' ('+label+')',line)
        if status=='Pending Visit' and (receipt['taskNo'] in line or re.search(r'حال(?:ة|تها|ته)|الحالة',line)):
            line=re.sub(r'(?<![\u0600-\u06ff])قيد\s+الزيارة(?![\u0600-\u06ff])',label,line)
        rows.append(line)
    return ''.join(rows)

def exact_inspection_request(question, task=None):
    ids=re.findall(r'\bIN-\d{4}-\d{1,20}\b',question,re.I)
    if len(set(x.upper() for x in ids))!=1:return None
    # Separate history/collection contracts must not be replaced by a status.
    if re.search(r'\b(?:history|historical|violations?|penalt\w*|fines?|contacts?|routes?|assign\w*)\b|سجل|مخالفات|غرام|اتصال|تعيين|مسارات',question,re.I):return None
    if task and (not task.readOnly or task.requestKind!='business_read'):return None
    kind='checklist' if MATERIALS.search(question) else 'status' if STATUS.search(question) else None
    if task and kind:
        if kind=='status' and (not task.needsLiveData or task.timeRange.strip().casefold() not in
                {'','current','now','currently','present','as of now','current time','at present','latest'}):return None
        allowed={'inspection','task','current','status','stage','state','required','materials','material',
                 'documents','document','paperwork','papers','preparation','prepare','steps','step','procedure','checklist','items','item','visit','before','the','for','to','have','ready','guidance','pre','requirements'}
        if any(set(re.findall('[a-z]+',x.casefold()))-allowed for x in task.requestedAttributes+task.requestedMeasures):return None
        if task.groupBy or task.requestedOrdering:return None
        filter_words={'inspection','visit','identifier','id','task','case','taskno','taskid','number','record','recordidentity','no','exact','equals','is','for','the'}
        for f in task.filters:
            rest=re.sub(re.escape(ids[0]),'',f,flags=re.I)
            if re.search(r'\d',rest) or set(re.findall('[a-z]+',rest.casefold()))-filter_words:return None
    return (ids[0].upper(),kind) if kind else None

def inspection_public(receipt, number, kind):
    payload={'result':'not_confirmed','page':'/inspection/tasks','recordIdentity':number,
             'answerShape':'detail','completeness':'bounded','scope':'unknown','facts':[],
             'workflowState':'inspection_exact_detail','presentationMode':'llm_localized','missing':[]}
    if not isinstance(receipt,dict) or receipt.get('taskNo')!=number:
        payload['missing']=['inspection_receipt_missing_or_identity_mismatch'];return payload
    if not receipt.get('verified'):
        payload['missing']=[receipt.get('reason') or 'inspection_identity_unverified'];return payload
    detail=receipt.get('detail')
    if not isinstance(detail,dict) or detail.get('taskNo')!=number or not receipt.get('taskId'):
        payload['missing']=['inspection_detail_identity_unverified'];return payload
    payload['scope']='team' if any(s.startswith('Team') for s in receipt.get('bindingScopes',[])) else 'unknown'
    status=detail.get('statusName')
    if isinstance(status,str) and status.strip():
        payload['facts'].append(f'Inspection {number}: status: '+_sanitize_untrusted_text(status,max_length=200)+'.')
        payload['inspectionStatus']={'verified':True,'taskNo':number,'statusName':status}
    else:payload['missing'].append('inspection_status_not_exposed')
    if kind=='checklist':
        checklist=receipt.get('checklist')
        if not isinstance(checklist,dict) or checklist.get('verified') is not True or not isinstance(checklist.get('items'),list):
            payload['missing'].append(receipt.get('reason') or 'inspection_checklist_not_verified')
        else:
            items=checklist['items']
            payload['inspectionCoverage']={'verified':True,'taskNo':number,'statusName':status,
                'codes':[item.get('code') for item in items if isinstance(item,dict)]}
            payload['facts'].append(f'Inspection checklist points for {number}: {len(items)} visible active points were returned.')
            for item in items:
                if not isinstance(item,dict) or not isinstance(item.get('code'),str) or not isinstance(item.get('name'),str):
                    payload['facts']=[];payload['missing']=['inspection_checklist_row_invalid'];return payload
                payload['facts'].append(_sanitize_untrusted_text(item['code']+': '+item['name'],max_length=1200))
            payload['facts'].append('These are the visible active checklist catalog points returned through this verified task. The source catalog does not establish that every point applies to this particular visit. A separate formal materials/documents list and a complete visit procedure were not provided; the checklist alone does not establish either.')
            payload['missing'].extend(['formal_materials_list_not_provided_by_source','complete_visit_procedure_not_provided_by_source'])
    payload['result']='success' if not payload['missing'] else 'not_confirmed'
    return payload


def complete_verified_checklist_tail(evidence, published, language):
    """Replace only an unpublished rejected tail after every source code survived.

    Already published blocks passed the normal guards and are immutable. This
    cannot fill a missing item, repair a failed read, translate new facts, or
    accept any of the rejected model prose. The close is an app-owned projection
    of the source gap and account scope, not a second model attempt.
    """
    coverage=evidence.get('inspectionCoverage')
    if (evidence.get('workflowState')!='inspection_exact_detail' or language not in {'en','ar'}
            or not isinstance(coverage,dict) or coverage.get('verified') is not True
            or not published or evidence.get('result')!='not_confirmed'
            or set(evidence.get('missing') or [])!={'formal_materials_list_not_provided_by_source',
                'complete_visit_procedure_not_provided_by_source'}):return None
    number=coverage.get('taskNo');status=coverage.get('statusName');codes=coverage.get('codes')
    if (not isinstance(number,str) or number!=evidence.get('recordIdentity') or number not in published
            or not isinstance(status,str) or not status.strip() or status not in published
            or not isinstance(codes,list) or not 0<len(codes)<=200
            or not all(isinstance(c,str) and re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,39}',c) for c in codes)
            or len(set(codes))!=len(codes)):return None
    facts=evidence.get('facts') or []
    for code in codes:
        if (not any(isinstance(f,str) and f.startswith(code+': ') for f in facts)
                or not re.search(r'(?m)^\s*(?:[-*•]\s*)?(?:\*\*)?'+re.escape(code)+r'(?:\*\*)?\s*:',published)):
            return None
    scope=evidence.get('scope')
    if scope not in {'team','unknown'}:return None
    if language=='ar':
        close=('هذه نقاط قائمة التحقق الظاهرة التي أعادتها المهمة في صفحة التفتيش / المهام، '
            'ولا يعني عرضها أن جميعها تنطبق على هذه الزيارة. ليست هذه قائمة مستندات رسمية أو إجراء زيارة كاملاً؛ '
            'لم يوفّر المصدر قائمة المستندات الرسمية ولا خطوات الزيارة الكاملة.')
        close+=(' القراءة ضمن عرض الفريق الحالي.' if scope=='team' else ' نطاق القراءة هو ما أتاحه الحساب الحالي، ولم يتأكد نطاق الفريق.')
    else:
        close=('These are the visible checklist catalog points returned through the task on Inspection / Tasks; '
            'their presence does not establish that every point applies to this visit. The source did not provide '
            'a formal documents list or a complete visit procedure, so neither can be confirmed.')
        close+=(' This read covers the current team view.' if scope=='team' else ' This read is limited to what the current account returned; team scope is unconfirmed.')
    return published+('' if published.endswith('\n\n') else '\n\n')+close
