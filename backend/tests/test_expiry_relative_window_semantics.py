"""Relative-window contracts; fixture data are not business acceptance proof."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import pytest

from app.portal_reader import _license_expiry_window, _license_expiry_window_result


@pytest.mark.parametrize('question,days', [
    ('Which licences expire within the next 30 days?', 30),
    ('Show licenses expiring in the coming 14 days.', 14),
    ('List permits that expire in the next 60 days.', 60),
    ('ما التراخيص التي تنتهي خلال ٣٠ يومًا القادمة؟', 30),
    ('未来7天到期的许可证有哪些？', 7),
    ('List licences marked Expire Soon.', None),
    ('Show licences that expired in the last 30 days.', None),
])
def test_user_duration_is_not_replaced_by_expire_soon(question, days):
    assert _license_expiry_window(question) == days


def test_exact_window_preserves_displayed_holder_and_boundary():
    today = datetime.now(ZoneInfo('Asia/Dubai')).date()
    rows = [{'License No.':f'L-{days}', 'Application No.':f'A-{days}',
             'Applicant':'Displayed holder', 'Status':'Active',
             'Expiry Date':(today + timedelta(days=days)).strftime('%d/%m/%Y')}
            for days in (-1, 0, 14, 15)]
    observation = {'sectionSummaries':[{'nodeId':'license-list', 'kind':'table', 'columnHeaders':['License No.', 'Expiry Date'], 'rowFields':rows}]}
    result = _license_expiry_window_result([observation], question='Which licences expire within the next 14 days?',
                                          page_count=1, total_rows=4, complete=True, scope='team')
    assert len(result.facts) == 3
    assert '"Applicant":"Displayed holder"' in result.facts[0]
    assert 'A-15' not in ' '.join(result.facts)
    assert f'{today.isoformat()} through {(today + timedelta(days=14)).isoformat()}' in result.facts[-1]
