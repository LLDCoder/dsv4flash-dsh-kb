import asyncio
import hashlib
import importlib.util
from pathlib import Path
import pytest
import httpx

spec = importlib.util.spec_from_file_location('knowledge_fulltext_gateway', Path(__file__).parents[2]/'knowledge-gateway/app.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


@pytest.fixture
def document(tmp_path, monkeypatch):
    raw = 'Inspection دليل\nCheckout before submit-report.\n'.encode()
    digest = hashlib.sha256(raw).hexdigest()
    p = tmp_path/digest[:2]/digest; p.parent.mkdir(); p.write_bytes(raw)
    manifest = dict(id='abc123', folder_id='child', name='guide.md', extension='.md',
                    size=len(raw), sha256=digest, status='done', updated_at='123')
    monkeypatch.setattr(g, 'DOCUMENT_ROOT', tmp_path)
    monkeypatch.setattr(g, 'DOCUMENT_SCOPE', 'root')
    calls = []
    async def upstream(method, path, **kwargs):
        calls.append((method,path,kwargs))
        return {'items':[dict(manifest)]}
    monkeypatch.setattr(g, '_request', upstream)
    return raw, p, manifest, calls


def get(file='abc123', folder='root'):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=g.app), base_url='http://test') as c:
            return await c.get(f'/files/{file}/content',params={'folder_id':folder})
    return asyncio.run(run())


def test_full_text_matches_exact_bytes_and_scoped_manifests(document):
    raw,p,m,calls = document; r=get(); assert r.status_code==200
    assert r.json()['content'].encode()==raw and r.json()['content_hash']==m['sha256']
    assert len(calls)==2 and all(c[0]=='GET' and c[2]['params']=={'folder_id':'root','recursive':'true'} for c in calls)
    assert 'storage_path' not in r.text and 'source_ref' not in r.text


@pytest.mark.parametrize('scope',['other','child',''])
def test_wrong_scope_never_touches_upstream_or_storage(document,scope):
    assert get(folder=scope).status_code in {403,422}; assert not document[3]


def test_disabled_scope_fails_closed(document,monkeypatch):
    monkeypatch.setattr(g,'DOCUMENT_SCOPE',''); assert get().status_code==503; assert not document[3]


def test_missing_file_and_ambiguous_manifest_fail_closed(document,monkeypatch):
    assert get(file='missing').status_code==404
    async def duplicate(*a,**kw):return {'items':[document[2],document[2]]}
    monkeypatch.setattr(g,'_request',duplicate); assert get().status_code==404


def test_changed_manifest_does_not_publish_text(document,monkeypatch):
    n=0
    async def change(*a,**kw):
        nonlocal n; n+=1
        return {'items':[{**document[2],'updated_at':str(n)}]}
    monkeypatch.setattr(g,'_request',change); r=get(); assert r.status_code==409
    assert document[0].decode() not in r.text


@pytest.mark.parametrize('change',[{'sha256':'../escape'},{'size':1048577},{'size':True},
                                  {'status':'processing'},{'extension':'.pdf'}])
def test_invalid_metadata_never_reads_object(document,change):
    document[2].update(change); assert get().status_code==422


def test_missing_mount_has_explicit_503_not_404(document):
    document[1].unlink(); r=get(); assert r.status_code==503 and 'document_object_not_mounted' in r.text


def test_wrong_bytes_fail_integrity(document):
    document[1].write_bytes(b'corrupt'); assert get().status_code==502


def test_symlink_not_followed(document,tmp_path):
    p=document[1];p.unlink();target=tmp_path/'other';target.write_bytes(document[0]);p.symlink_to(target)
    assert get().status_code==502


def test_non_utf8_is_not_silently_decoded(document):
    raw=b'\xff';digest=hashlib.sha256(raw).hexdigest();p=document[1].parent.parent/digest[:2]/digest
    p.parent.mkdir(exist_ok=True);p.write_bytes(raw);document[2].update(size=1,sha256=digest)
    assert get().status_code==422


def test_openapi_documents_contract(document):
    op=g.app.openapi()['paths']['/files/{file_id}/content']['get']
    assert set(op['responses'])>={'200','403','404','409','422','502','503'}
    assert g.app.openapi()['info']['version']=='0.4.0'


def test_exact_inspection_identifier_case_alias_does_not_disable_native_lookup():
    from types import SimpleNamespace
    from app.inspection_read import exact_inspection_request
    task=SimpleNamespace(readOnly=True,requestKind='business_read',
        requestedAttributes=['required materials','preparation steps'],requestedMeasures=[],
        groupBy=[],requestedOrdering=[],filters=['inspection case identifier IN-2026-0141753'])
    q='For IN-2026-0141753, what materials and steps should I prepare for the inspection?'
    assert exact_inspection_request(q,task)==('IN-2026-0141753','checklist')
    task.filters=['inspection case identifier IN-2026-0141753 emirate Dubai']
    assert exact_inspection_request(q,task) is None
