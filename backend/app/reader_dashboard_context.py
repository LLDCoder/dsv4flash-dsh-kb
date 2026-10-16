"""Carry applied Dashboard hints as constraints, never as observed facts."""
from urllib.parse import urlsplit


def dashboard_read_context(page, current_page, user_id):
    if (urlsplit(page).path != '/dashboard' or not current_page
            or current_page.get('route') != '/dashboard'
            or not current_page.get('routeAuthorized')):
        return None
    filters = current_page.get('filters') or []
    if not filters:
        return None
    if not isinstance(user_id, str) or not user_id.strip():
        from .generic_reader import PipelineError
        raise PipelineError('dashboard_identity_unverified', 'permission')
    # Preserve the exact hint. Strict gateway validation rejects unknown,
    # duplicate, draft/custom and mismatched values instead of dropping them.
    return {'route': current_page['route'], 'view': current_page.get('view', ''),
            'filters': filters, 'userId': user_id,
            'browserTimezone': current_page.get('browserTimezone', 'UTC')}


def verify_dashboard_context(expected, observation, user_id):
    if expected is None:
        return
    from .generic_reader import PipelineError
    from .reader_collection import projection_hash
    receipt = observation.get('dashboardContextReceipt') or {}
    timezone_receipt = receipt.get('browserTimezone') or {}
    if (receipt.get('verified') is not True or receipt.get('route') != expected['route']
            or receipt.get('view') != expected['view']
            or receipt.get('principalHash') != projection_hash(user_id)
            or receipt.get('requestedFiltersHash') != projection_hash(expected['filters'])
            or receipt.get('sameOrigin') is not True
            or timezone_receipt.get('requested') != expected['browserTimezone']
            or not timezone_receipt.get('observed')
            or timezone_receipt.get('observed') != timezone_receipt.get('resolvedRequested')):
        raise PipelineError('dashboard_page_context_unverified', 'planning')
