"""Exact inspection read intent and narrow projection of gateway-owned evidence."""
import re
from .portal_reader import _sanitize_untrusted_text

MATERIALS=re.compile(r'materials?|documents?|checklist|prepar\w*|\bbring\b|\bsteps?\b|'
    r'المستندات|مستندات|الأوراق|اوراق|أوراق|المواد|مواد|خطوات|الخطوات|'
    r'أجهز|اجهز|أستعد|استعد|تجهيز|تحضير|قائمة\s+(?:الفحص|التفتيش|التحقق)',re.I)
STATUS=re.compile(r'\b(?:status|stage|state)\b|الحالة|حالة|مرحلة|وضع',re.I)

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
        filter_words={'inspection','visit','identifier','id','task','taskno','taskid','number','record','recordidentity','no','exact','equals','is','for','the'}
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
    else:payload['missing'].append('inspection_status_not_exposed')
    if kind=='checklist':
        checklist=receipt.get('checklist')
        if not isinstance(checklist,dict) or checklist.get('verified') is not True or not isinstance(checklist.get('items'),list):
            payload['missing'].append(receipt.get('reason') or 'inspection_checklist_not_verified')
        else:
            items=checklist['items']
            payload['facts'].append(f'Inspection checklist points for {number}: {len(items)} visible active points were returned.')
            for item in items:
                if not isinstance(item,dict) or not isinstance(item.get('code'),str) or not isinstance(item.get('name'),str):
                    payload['facts']=[];payload['missing']=['inspection_checklist_row_invalid'];return payload
                payload['facts'].append(_sanitize_untrusted_text(item['code']+': '+item['name'],max_length=1200))
            payload['facts'].append('These are the task-specific inspection checklist points to prepare against. A separate formal materials/documents list and a complete visit procedure were not provided; the checklist alone does not establish either.')
            payload['missing'].extend(['formal_materials_list_not_provided_by_source','complete_visit_procedure_not_provided_by_source'])
    payload['result']='success' if not payload['missing'] else 'not_confirmed'
    return payload
