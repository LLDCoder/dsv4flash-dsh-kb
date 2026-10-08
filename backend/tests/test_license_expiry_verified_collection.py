"""Collection policy fixtures only; live screenshots remain acceptance proof."""
import hashlib
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.portal_reader import (_observed_license_expiry_collection,
    _license_collection_status_labels, _license_expiry_collection_result)
from app.service import reader_evidence_only_response


def observation(rows=()):
    null = hashlib.sha256(b'null').hexdigest()
    return {'sectionSummaries':[{'nodeId':'license-list','kind':'table',
                'columnHeaders':['License No.','Expiry Date','Status'], 'rowFields':list(rows)}],
        'rowSummaries':['Total 2','1/1','10 / page'],
        'apiDiscovery':{'candidates':[{'operationKey':'POST /api/LicenseManagement/list','status':200,
            'responseEvidence':{'data':{'pageIndex':1,'pageSize':10,'total':2,'items':[]}},
            'collectionContext':{'contextRef':'a'*64,
                'requestFields':['pageIndex','pageSize','department','issuanceDateStart','issuanceDateEnd'],
                'parameterHashes':{'issuanceDateStart':null,'issuanceDateEnd':null},
                'rowSchemas':[{'path':'/data/items','fields':['id','applicationNumber','showLicenseNumber',
                    'licenseNumber','expirationTime','status','applicant','certificateUrl']}]
            }}]}}


def receipt():
    date = (datetime.now(ZoneInfo('Asia/Dubai')).date()+timedelta(days=7)).isoformat()
    return {'operationRef':'POST /api/LicenseManagement/list','completeness':'complete','stablePasses':2,'total':2,
        'rows':[{'id':'a','applicationNumber':'A-a','showLicenseNumber':'L-a','status':812,'expirationTime':date,'applicant':'Native Holder'},
                {'id':'b','applicationNumber':'A-b','showLicenseNumber':'L-b','status':813,'expirationTime':date,'applicant':'Other Holder'}]}


def test_spec_preserves_captured_context_and_never_selects_certificate_path():
    obs = observation()
    spec = _observed_license_expiry_collection(obs)
    assert spec is not None and spec['contextRef'] == 'a'*64
    assert 'certificateUrl' not in spec['fields']
    obs['apiDiscovery']['candidates'][0]['collectionContext']['requestFields'].append('keyword')
    assert _observed_license_expiry_collection(obs) is None


def test_numeric_states_require_native_labels_joined_to_exact_identity():
    r = receipt()
    native = observation([{'License No.':'L-a','Status':'Active','Expiry Date':r['rows'][0]['expirationTime']}])
    labels = _license_collection_status_labels(r, [native])
    assert labels == {'812':'Active'}
    unverified = _license_expiry_collection_result(r,native,labels,question='Which licenses expire within 30 days?',scope='team')
    assert unverified is not None and unverified.status == 'not_confirmed'
    assert '813' not in ' '.join(unverified.facts)


def test_complete_receipt_excludes_cancelled_licence_without_enum_assumption():
    r = receipt()
    native = observation([{'License No.':'L-a','Status':'Active','Expiry Date':r['rows'][0]['expirationTime']},
                          {'License No.':'L-b','Status':'Cancelled','Expiry Date':r['rows'][1]['expirationTime']}])
    labels = _license_collection_status_labels(r, [native])
    result = _license_expiry_collection_result(r,native,labels,question='Which licenses expire within 30 days?',scope='team')
    assert result is not None and result.status == 'success'
    assert len(result.facts) == 2
    assert 'Native Holder' in result.facts[0]
    rendered = reader_evidence_only_response(result.public_json(), 'ar',
        question='أي التراخيص ستنتهي صلاحيتها خلال 30 يومًا؟')
    assert 'مقدم الطلب: Native Holder' in rendered
    assert 'Applicant' not in rendered
    assert 'Licenses list' not in rendered
    assert 'التراخيص / التراخيص' in rendered
    assert 'A-b' not in ' '.join(result.facts)
    assert '812' not in ' '.join(result.facts)


def test_incomplete_or_unstable_receipt_is_not_a_full_count():
    r = receipt(); r['stablePasses'] = 1
    assert _license_expiry_collection_result(r, observation(), {},question='Which licenses expire within 30 days?',scope='team') is None


def test_shared_display_number_does_not_merge_different_applications_or_statuses():
    r = receipt()
    for row in r['rows']:
        row['showLicenseNumber'] = 'shared-display-number'
    native = observation([{'License No.':'shared-display-number','Application No.':'A-a','Status':'Active','Expiry Date':r['rows'][0]['expirationTime']},
                          {'License No.':'shared-display-number','Application No.':'A-b','Status':'Expire Soon','Expiry Date':r['rows'][1]['expirationTime']}])
    labels = _license_collection_status_labels(r, [native])
    assert labels == {'812':'Active', '813':'Expire Soon'}
    result = _license_expiry_collection_result(r,native,labels,question='Which licenses expire within 30 days?',scope='team')
    assert result is not None and result.status == 'success'
    assert len(result.facts) == 3
    assert 'A-a' in ' '.join(result.facts) and 'A-b' in ' '.join(result.facts)


def test_duplicate_or_missing_native_identity_and_invalid_page_size_are_rejected():
    r = receipt(); r['rows'][1]['id'] = r['rows'][0]['id']
    assert _license_expiry_collection_result(r, observation(), {},question='Which licenses expire within 30 days?',scope='team') is None
    r = receipt(); r['rows'][1].pop('id')
    assert _license_expiry_collection_result(r, observation(), {},question='Which licenses expire within 30 days?',scope='team') is None
    obs = observation(); obs['apiDiscovery']['candidates'][0]['responseEvidence']['data']['pageSize'] = 0
    assert _license_expiry_collection_result(receipt(), obs, {},question='Which licenses expire within 30 days?',scope='team') is None


def test_complete_collection_is_not_truncated_by_bounded_semantic_node_budget():
    r = receipt()
    template = r['rows'][0]
    r['rows'] = [{**template,'id':str(index),'applicationNumber':f'A-{index}',
                 'showLicenseNumber':f'L-{index}'} for index in range(95)]
    r['total'] = 95
    native = observation()
    native['apiDiscovery']['candidates'][0]['responseEvidence']['data']['total'] = 95
    result = _license_expiry_collection_result(r, native, {'812':'Active'}, question='Which licenses expire within 30 days?',scope='team')
    assert result is not None and result.status == 'success'
    assert len(result.facts) == 96
    assert 'A-94' in ' '.join(result.facts)
    assert 'two stable passes covering 95' in result.facts[-1]
    assert '0 page' not in result.facts[-1]


def test_arabic_type_uses_native_value_not_internal_field_name_or_translated_name():
    r = receipt()
    for row in r['rows']:
        row.update(licenseType='Native English Type',licenseTypeAr='نوع الترخيص الأصلي')
    result = _license_expiry_collection_result(r, observation(), {'812':'Active','813':'Cancelled'},
        question='أي التراخيص ستنتهي صلاحيتها خلال 30 يومًا؟',scope='team')
    assert result is not None and result.status == 'success'
    assert 'نوع الترخيص الأصلي' in result.facts[0]
    assert 'Native English Type' not in ' '.join(result.facts)
    assert 'licenseTypeAr' not in ' '.join(result.facts)
    assert 'Native Holder' in result.facts[0]
