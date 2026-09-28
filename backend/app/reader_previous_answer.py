"""A separate, source-bound presentation path for a completed prior answer.

Ordinary intent history still excludes facts. Nothing here establishes current
record values, row access, sensitive-field access or a new cross-record relation.
"""
from copy import deepcopy
from datetime import datetime
import json
import re


def completed_previous_result(history, latest_user):
    """Select only the immediately preceding completed turn of the same owner."""
    if latest_user is None:
        return {}
    try:
        end = next(i for i in range(len(history) - 1, -1, -1) if history[i] is latest_user)
    except StopIteration:
        return {}
    start = next((i for i in range(end - 1, -1, -1) if history[i].event_type == 'user.message'), None)
    if start is None:
        return {}
    owner = tuple(getattr(latest_user, k, None) for k in ('conversation_id', 'tenant_id', 'user_id'))
    if not all(owner):
        return {}
    span = history[start:end]
    if any(tuple(getattr(e, k, None) for k in ('conversation_id', 'tenant_id', 'user_id')) != owner for e in span):
        return {}
    request_id = (span[0].event_json or {}).get('requestId')
    if not request_id:
        return {}
    significant = [e for e in span[1:] if e.event_type in
                   {'reader.result', 'assistant.message', 'turn.completed', 'turn.cancelled', 'runtime.error'}]
    if ([e.event_type for e in significant] != ['reader.result', 'assistant.message', 'turn.completed']
            or any((e.event_json or {}).get('requestId') != request_id for e in significant)):
        return {}
    result = significant[0].event_json or {}
    state = result.get('intentState') or {}
    answer = (significant[1].event_json or {}).get('content')
    complete = (result.get('result') == 'success' and result.get('analysisStatus') == 'complete'
                and result.get('requirementsSatisfied') and not result.get('missing')
                and not result.get('qualityBlockers'))
    from .reader_partial_answer import partial_answer_matches
    partial = partial_answer_matches(result, answer)
    if (not (complete or partial) or state.get('requestId') != request_id or not answer
            or len(json.dumps(result, ensure_ascii=False)) > 150_000):
        return {}
    return {'schemaVersion': 'completed-prior-answer/1', 'requestId': request_id,
            'result': deepcopy(result), 'originalAnswer': answer,
            'sourceCompletion': 'partial' if partial else 'complete'}


def previous_answer_request(task, canonical_question):
    """A whole-utterance gate. Mixed live, write and new-entity requests stay live."""
    if (not task.readOnly or task.needsLiveData or task.requestBoundaries or task.responseMode != 'answer'
            or task.recordIdentity or task.requestedMeasures or task.requestedOrdering or task.groupBy
            or task.filters or task.view or task.timeField or task.timeRange not in {'', 'unknown'}
            or task.clarification or task.unresolvedSlots or task.contextRelation == 'cancel'):
        return ''
    question = re.sub(r'\s+', ' ', str(canonical_question).strip().casefold())
    question = re.sub(r'[.!?،؟]+$', '', question)
    question = re.sub(r'^(?:please |could you |can you )', '', question)
    answer = r'(?:that answer|your (?:last|previous) (?:answer|response)|the (?:last|previous) (?:answer|response))'
    navigation = r'(?: and (?:give|show|provide)(?: me)? (?:the )?(?:page navigation|navigation path|menu path))?'
    simple = [r'(?:explain|rephrase|rewrite) ' + answer + r' (?:more simply|in simpler (?:words|language)|in a simpler way|using simpler (?:words|language))' + navigation,
              r'simplify ' + answer + navigation]
    if any(re.fullmatch(pattern, question) for pattern in simple):
        return 'simplify_navigation' if re.search(r'(?:page navigation|navigation path|menu path)$', question) else 'simplify'
    scope = r'(?:the )?(?:data |query )?scope and (?:its )?limitations'
    prior = r'(?:this|the last|the previous|my last|my previous) (?:query|search)'
    if (re.fullmatch(r'(?:list|explain|describe|show)(?: me)? ' + scope + r' (?:used for|used in|of|for) ' + prior, question)
            or re.fullmatch(r'what (?:data )?scope and limitations (?:were|was) used (?:for|in) ' + prior, question)):
        return 'query_scope'
    return ''


def query_receipt(payload, audit):
    """Persist the actual observed read envelope, independently of user intent."""
    from .reader_partial_answer import observed_partial_result
    if not (payload.get('result') == 'success' and payload.get('requirementsSatisfied')
            or observed_partial_result(payload)):
        return None
    pages = {e.get('page') for output in payload.get('outputs', []) for e in output.get('evidence', [])}
    captures = [c for c in audit.get('captures', []) if c.get('bindingVerification') == 'observed_current_session' and c.get('page') in pages]
    if not captures:
        return None
    return {'schemaVersion': 'observed-query-receipt/1',
            'captures': [{k: c[k] for k in ('page', 'capturedAt', 'appliedFilters') if k in c} for c in captures],
            'sourceRefs': [{k: e[k] for k in ('page', 'capturedAt', 'observationRef', 'sourceId',
                                            'principalScopeRef', 'completeness') if k in e}
                           for output in payload.get('outputs', []) for e in output.get('evidence', [])]}


def _aware_time(value):
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).tzinfo is not None
    except (ValueError, TypeError, AttributeError):
        return False


def _public_value(value):
    # Refuse, rather than strip a fact and silently claim an unchanged rewrite.
    from .generic_reader import SENSITIVE_FIELD, TRUNCATION
    if isinstance(value, dict):
        return all(not SENSITIVE_FIELD.search(str(k)) and _public_value(v) for k, v in value.items())
    if isinstance(value, list):
        return len(value) <= 1000 and all(_public_value(v) for v in value)
    if isinstance(value, str):
        return (not any(marker in value for marker in TRUNCATION)
                and not re.search(r'(?:/api/|https?://|\bBearer\s|[\w.+-]+@[\w.-]+\.[a-z]{2,})', value, re.I))
    return value is None or isinstance(value, (int, float, bool))


def project_previous_answer(envelope, kind, fingerprint, catalog_version, catalog, authorized):
    """Reauthorize navigation; prior facts remain explicitly historical."""
    blocked = lambda code: {'kind': kind, 'verified': False, 'reason': code,
                            'liveDataRead': False, 'rowScopeVerified': False}
    if envelope.get('schemaVersion') != 'completed-prior-answer/1':
        return blocked('previous_completed_answer_unavailable')
    previous = envelope.get('result') or {}
    from .reader_partial_answer import observed_partial_result, partial_answer_matches, partial_uncertainty, confirmed_context_only
    partial = observed_partial_result(previous)
    if (partial and not partial_answer_matches(previous, envelope.get('originalAnswer'))
            or not partial and (previous.get('result') != 'success' or previous.get('analysisStatus') != 'complete'
                                or not previous.get('requirementsSatisfied') or previous.get('missing')
                                or previous.get('qualityBlockers'))):
        return blocked('previous_completed_answer_unavailable')
    state = previous.get('intentState') or {}
    if (not fingerprint or state.get('principalFingerprint') != fingerprint
            or not catalog_version or state.get('catalogVersion') != catalog_version):
        return blocked('previous_answer_identity_or_authorization_changed')
    outputs = previous.get('outputs') or []
    if not outputs:
        return blocked('previous_answer_has_no_verified_outputs')
    from .generic_reader import SENSITIVE_FIELD
    refs = [ref for item in outputs for ref in item.get('evidence', [])]
    if any(SENSITIVE_FIELD.search(json.dumps(ref.get('fieldBinding') or {}, ensure_ascii=False)) for ref in refs):
        return blocked('previous_answer_fields_require_fresh_verification')
    if any(item.get(key) for item in outputs for key in ('verifiedInterpretations', 'verifiedAbsences', 'unknownCount')):
        return blocked('previous_answer_qualified_facts_require_fresh_verification')
    if (any(not item.get('evidence') or not _public_value({k: item[k] for k in
            ('label', 'value', 'displayRows', 'fieldLabels') if k in item}) for item in outputs)
            or any(not ref.get('sourceId') or not ref.get('observationRef')
                   or not _aware_time(ref.get('capturedAt')) or ref.get('principalScopeRef') != fingerprint for ref in refs)):
        return blocked('previous_answer_fields_require_fresh_verification')
    pages = list(dict.fromkeys(ref.get('page') for ref in refs))
    if (not pages or any(not page or not authorized(page) or not any(page in entry['routes'] for entry in catalog)
                         for page in pages)):
        return blocked('previous_answer_page_access_changed')
    context = previous.get('context') or {}
    semantic_context = {k: context[k] for k in ('scope', 'grain', 'population', 'filterScope', 'time', 'caveats') if k in context}
    # Source IDs remain provenance, never presentation text or an authorization grant.
    public_context = {}
    for key, value in semantic_context.items():
        if isinstance(value, dict):
            public_context[key] = value.get('value')
        elif isinstance(value, list):
            public_context[key] = [x.get('value') if isinstance(x, dict) else x for x in value]
        else:
            public_context[key] = value
    if not _public_value(public_context):
        return blocked('previous_answer_scope_requires_fresh_verification')
    uncertainty = {}
    if partial:
        if not _public_value(envelope['originalAnswer']):
            return blocked('previous_answer_fields_require_fresh_verification')
        uncertainty = partial_uncertainty(previous, envelope['originalAnswer'])
        if not _public_value(uncertainty['unconfirmedRequirements']):
            return blocked('previous_answer_fields_require_fresh_verification')
        public_context = confirmed_context_only(public_context, previous)
    receipt = previous.get('queryReceipt') or {}
    if kind == 'query_scope':
        if (receipt.get('schemaVersion') != 'observed-query-receipt/1'
                or not receipt.get('captures') or not receipt.get('sourceRefs')
                or not public_context.get('filterScope')):
            return blocked('previous_query_receipt_unavailable')
        expected_refs = [{k: e[k] for k in ('page', 'capturedAt', 'observationRef', 'sourceId', 'principalScopeRef', 'completeness') if k in e} for e in refs]
        if receipt['sourceRefs'] != expected_refs:
            return blocked('previous_query_receipt_unverified')
        for capture in receipt['captures']:
            if (not any(capture.get('page') == ref.get('page') and capture.get('capturedAt') == ref.get('capturedAt') for ref in refs) or not _aware_time(capture.get('capturedAt'))
                    or 'appliedFilters' not in capture or not _public_value(capture['appliedFilters'])):
                return blocked('previous_query_receipt_unverified')
    navigation = []
    for entry in catalog:
        for nav in entry.get('businessNavigation', []):
            if nav.get('route') in pages and authorized(nav['route']) and nav not in navigation:
                navigation.append({'route': nav['route'], 'label': nav['label']})
    if kind == 'simplify_navigation' and len({x['route'] for x in navigation}) != len(pages):
        return blocked('previous_answer_navigation_unavailable')
    return {'kind': kind, 'verified': True, 'sourceRequestId': envelope['requestId'], **uncertainty,
            'principalScopeRef': fingerprint, 'catalogVersion': catalog_version,
            'observedAt': list(dict.fromkeys(ref['capturedAt'] for ref in refs)),
            'outputs': deepcopy(outputs) if kind.startswith('simplify') else [],
            'context': public_context, 'completeness': previous.get('completeness', 'unknown'),
            'observedFilters': [f for capture in receipt.get('captures', []) for f in capture.get('appliedFilters', [])],
            'navigation': navigation, 'liveDataRead': False, 'rowScopeVerified': False,
            'sensitiveFieldAuthorityEstablished': False, 'currentStatusClaimed': False}


def render_previous_answer(projection, language):
    if isinstance(projection.get('currentIdentity'), dict):
        from .reader_query_identity import render_query_identity
        historical = {key: value for key, value in projection.items() if key != 'currentIdentity'}
        return render_query_identity(projection['currentIdentity'], language) + '\n\n' + render_previous_answer(historical, language)
    from .generic_reader import safe_text
    ar = language == 'ar'
    def literal(value):
        return re.sub(r'([\\`*_{}\[\]()<>!|])', r'\\\1', safe_text(value))
    if not projection.get('verified'):
        return ('لا أستطيع التحقق من أن الإجابة السابقة مكتملة ومسموح بعرضها لهذا الحساب. أعد الاستعلام الأصلي للتحقق من المعلومات؛ لن أقدّم بيانات قديمة باعتبارها حالية.' if ar else
                'I cannot verify that the previous answer is complete and available to this account. Repeat the original query to verify the information; I will not present old data as current.')
    lines = [('هذا شرح للإجابة السابقة، وليس استعلاماً جديداً. وقت المعلومات: ' if ar else
              'This explains the previous answer; it is not a new query. The information was observed at: ')
             + ', '.join(literal(t) for t in projection['observedAt']) + '.']
    if projection.get('businessResultComplete') is False:
        lines.append('كانت الإجابة السابقة مؤكدة جزئيًا فقط. الملاحظات أدناه لا تثبت الأجزاء التي بقيت غير مؤكدة.' if ar else
                     'The earlier answer was only partly confirmed. These observations do not verify the parts that remained unconfirmed.')
    if projection['kind'].startswith('simplify'):
        for item in projection['outputs']:
            value = item.get('displayRows', item['value'])
            lines.append(literal(item['label']) + ':')
            if isinstance(value, list):
                if not value:
                    if item.get('dataCompleteness') == 'complete':
                        lines.append('لم توجد صفوف مطابقة في تلك النتيجة.' if ar else 'That result contained no matching rows.')
                    else:
                        lines.append('لم تُعرض صفوف، ولم يتم التحقق من اكتمال النتيجة.' if ar else 'No rows were displayed; completeness was not verified.')
                for row in value:
                    labels = item.get('fieldLabels') or {}
                    lines.append('- ' + ('؛ ' if ar else '; ').join(
                        literal(labels.get(k, k)) + ': ' + literal(v) for k, v in row.items()) if isinstance(row, dict)
                        else '- ' + literal(row))
            else:
                lines.append(literal(value))
    labels = {'scope': ('النطاق', 'Scope'), 'grain': ('الوحدة', 'Unit'),
              'population': ('السجلات المشمولة', 'Records covered'), 'filterScope': ('نطاق التصفية', 'Filter scope'),
              'time': ('الفترة', 'Period'), 'caveats': ('القيود', 'Limitations')}
    for key, value in projection['context'].items():
        if value not in (None, '', []):
            rendered = ('؛ ' if ar else '; ').join(literal(x) for x in value) if isinstance(value, list) else literal(value)
            lines.append(labels[key][0 if ar else 1] + ': ' + rendered)
    if projection.get('businessResultComplete') is False:
        kinds = {'grain': ('وحدة السجلات', 'record unit'), 'detail': ('تفاصيل النتيجة المطلوبة', 'requested result details'),
                 'object': ('نوع السجلات', 'record type'), 'scope': ('النطاق', 'scope'),
                 'population': ('السجلات المشمولة', 'records covered'), 'filter': ('التصفية', 'filter'),
                 'time': ('الفترة', 'time period'), 'attribute': ('الحقل المطلوب', 'requested field'),
                 'measure': ('المقياس المطلوب', 'requested measure'), 'ordering': ('الترتيب', 'ordering'),
                 'group': ('التجميع', 'grouping'), 'record': ('السجل المطلوب', 'requested record'),
                 'view': ('العرض المطلوب', 'requested view')}
        points = [kinds.get(item.get('kind'), ('معلومة مطلوبة', 'requested information'))[0 if ar else 1]
                  + ': ' + literal(item.get('value', '')) for item in projection.get('unconfirmedRequirements', [])]
        lines.append(('ما زال غير مؤكد: ' if ar else 'Still unconfirmed: ') + ('؛ ' if ar else '; ').join(points) + '.')
    if projection['kind'] == 'query_scope':
        filters = projection['observedFilters']
        lines.append(('عوامل التصفية الظاهرة: ' if ar else 'Observed filters: ') +
                     (('; '.join(literal(f) for f in filters)) if filters else
                      ('لم يُرجع المصدر أي عوامل تصفية ظاهرة إضافية؛ يبقى نطاق السجلات أعلاه هو المعتمد.' if ar else
                       'No additional visible filter labels were returned; the verified record scope above still applies.')))
    if projection.get('completeness') != 'complete':
        lines.append('النتيجة السابقة محدودة؛ ولا تثبت اكتمال جميع السجلات.' if ar else
                     'The earlier result was bounded; it does not establish a complete record population.')
    if projection['navigation']:
        lines.append('التنقل إلى الصفحة:' if ar else 'Page navigation:')
        lines.extend('- [' + literal(x['label']) + '](' + x['route'] + ')' for x in projection['navigation'])
    lines.append('لا تثبت هذه المعلومات السابقة الحالة الحالية أو إمكانية الوصول إلى سجلات إضافية.' if ar else
                 'This earlier information does not establish the current status or access to additional records.')
    return '\n\n'.join(lines)
