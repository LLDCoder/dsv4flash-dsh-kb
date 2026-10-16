"""Preserve trusted HTTP failure kinds without exposing upstream bodies."""


def upstream_failure(status, *, details=None):
    from .generic_reader import PipelineError
    if type(status) is not int:
        return None
    definitions = {
        401: ('upstream_session_expired', 'permission'),
        403: ('upstream_access_denied', 'permission'),
        404: ('upstream_source_not_found', 'runtime'),
    }
    code = definitions.get(status)
    if code is None and (status in {408, 429} or 500 <= status <= 599):
        code = ('source_response_unavailable', 'runtime')
    return PipelineError(*code, details={**(details or {}), 'upstreamStatus': status}) if code else None


def public_upstream_failure(evidence, language):
    if evidence.get('outputs') or evidence.get('knowledgeAnswer'):
        return None
    messages = {
        'upstream_session_expired': {
            'en': 'Your Admin Portal session has expired. Sign in again, then retry this query. The requested data could not be verified.',
            'ar': 'انتهت صلاحية جلسة بوابة الإدارة. سجّل الدخول مجدداً ثم أعد هذا الاستعلام. لم يتم التحقق من البيانات المطلوبة.',
        },
        'upstream_access_denied': {
            'en': 'Your signed-in account cannot access the requested information. Open a page available to your account or contact your administrator. This is an access failure, not an empty result.',
            'ar': 'لا يستطيع حسابك المسجّل دخوله الوصول إلى المعلومات المطلوبة. افتح صفحة متاحة لحسابك أو تواصل مع مسؤول النظام. هذا رفض للوصول وليس نتيجة فارغة.',
        },
        'upstream_source_not_found': {
            'en': 'The requested page or data source was not found (404). Refresh the page or reopen the record from an authorized list. This does not prove that the business record is absent.',
            'ar': 'لم يتم العثور على الصفحة أو مصدر البيانات المطلوب (404). حدّث الصفحة أو أعد فتح السجل من قائمة مصرح بها. هذا لا يثبت عدم وجود سجل الأعمال.',
        },
        'source_response_unavailable': {
            'en': 'The Admin Portal service is temporarily unavailable. Retry after the service recovers. The requested data could not be verified.',
            'ar': 'خدمة بوابة الإدارة غير متاحة مؤقتاً. أعد المحاولة بعد عودة الخدمة. لم يتم التحقق من البيانات المطلوبة.',
        },
    }
    for code in evidence.get('missing', []):
        if code in messages:
            return messages[code].get(language, messages[code]['en'])
    return None
