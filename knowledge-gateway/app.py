import sys
import importlib.util as _timing_importlib
from pathlib import Path as _TimingPath
if "dsh_knowledge_timing" not in sys.modules:
    _timing_spec=_timing_importlib.spec_from_file_location("dsh_knowledge_timing",_TimingPath(__file__).with_name("timing.py"))
    _timing_module=_timing_importlib.module_from_spec(_timing_spec)
    sys.modules["dsh_knowledge_timing"]=_timing_module
    _timing_spec.loader.exec_module(_timing_module)
from dsh_knowledge_timing import install_gateway, span as timing_span, request as timed_request, backoff, CURRENT as TIMING_CURRENT, PARENT as TIMING_PARENT
import asyncio
import os
import uuid
import hashlib
import re
import stat
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

UPSTREAM_BASE_URL = os.getenv("KNOWLEDGE_BASE_URL", "http://ai-generation-service:8091").rstrip("/")
PUBLIC_KNOWLEDGE_PATH = os.getenv("KNOWLEDGE_PUBLIC_PATH", "/public/knowledge").rstrip("/")
TIMEOUT_SECONDS = float(os.getenv("KNOWLEDGE_TIMEOUT_SECONDS", "30"))
RETRY_ATTEMPTS = max(1, int(os.getenv("KNOWLEDGE_RETRY_ATTEMPTS", "2")))
UPSTREAM_MAX_TOP_K = max(1, int(os.getenv("KNOWLEDGE_UPSTREAM_MAX_TOP_K", "20")))
RETRIEVAL_MODES = tuple(x.strip().lower() for x in os.getenv("KNOWLEDGE_RETRIEVAL_MODES", "bm25,graph,vector").split(",") if x.strip())

DOCUMENT_SCOPE = os.getenv("KNOWLEDGE_DOCUMENT_FOLDER_ID", "")
DOCUMENT_ROOT = Path(os.getenv("KNOWLEDGE_DOCUMENT_OBJECT_ROOT", "/app/document_objects"))
MAX_DOCUMENT_BYTES = 1024 * 1024

app = FastAPI(title="DSH Knowledge Gateway", version="0.4.0")


install_gateway(app, "DSH.knowledge-gateway")


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2_000)
    folder_id: str = Field(min_length=1, max_length=128)
    top_k: int = Field(default=32, ge=1, le=100)


def _headers() -> dict[str, str]:
    # The 77 ``public/knowledge`` contract is anonymous. In particular, do
    # not synthesize ``Authorization: Bearer `` when no service token exists:
    # httpx rejects that malformed header before the request reaches 77 and
    # the gateway previously surfaced the client-side failure as HTTP 503.
    return {"X-Request-ID": str(uuid.uuid4())}


async def _request(method: str, path: str, *, params: dict[str, Any] | None = None, json: dict[str, Any] | None = None) -> Any:
    last_error: Exception | None = None
    for attempt in range(RETRY_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await timed_request(client, method, f"{UPSTREAM_BASE_URL}{path}", owner="KB.provider", attempt=attempt+1, params=params, json=json, headers=_headers())
            if response.status_code not in {429, 502, 503, 504} or attempt == RETRY_ATTEMPTS - 1:
                break
            await backoff(min(2 ** attempt, 2))
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt == RETRY_ATTEMPTS - 1:
                raise HTTPException(status_code=503, detail={"code": "knowledge_upstream_unavailable", "message": str(exc)[:500]}) from exc
            await backoff(min(2 ** attempt, 2))
    if response.is_error:
        try:
            body = response.json()
        except ValueError:
            body = response.text[:2000]
        raise HTTPException(status_code=502, detail={"code": "knowledge_upstream_error", "upstreamStatus": response.status_code, "body": body})
    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail={"code": "knowledge_invalid_upstream_response"}) from exc


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": "dsh-knowledge-proxy",
        "upstream": UPSTREAM_BASE_URL,
        "upstreamPath": PUBLIC_KNOWLEDGE_PATH,
        "authMode": "anonymous-public",
        "retrievalModes": list(RETRIEVAL_MODES),
        "upstreamMaxTopK": UPSTREAM_MAX_TOP_K,
    }


@app.post("/search")
async def search(request: SearchRequest) -> Any:
    top_k = min(request.top_k, UPSTREAM_MAX_TOP_K)
    body = {
        "query": request.query,
        "folder_id": request.folder_id,
        "retrieval_modes": list(RETRIEVAL_MODES),
        "candidate_k": min(max(request.top_k, 10), 200),
        "top_k": top_k,
        "rerank": {"enabled": False, "top_n": top_k},
    }
    return await _request("POST", f"{PUBLIC_KNOWLEDGE_PATH}/search", json=body)


@app.get("/folders/tree")
async def folders_tree() -> Any:
    return await _request("GET", f"{PUBLIC_KNOWLEDGE_PATH}/folders/tree")


@app.get("/files")
async def files(folder_id: str | None = Query(default=None), recursive: bool = Query(default=False)) -> Any:
    params: dict[str, Any] = {"recursive": str(recursive).lower()}
    if folder_id:
        params["folder_id"] = folder_id
    return await _request("GET", f"{PUBLIC_KNOWLEDGE_PATH}/files", params=params)


@app.get("/files/page")
async def files_page(folder_id: str | None = Query(default=None), recursive: bool = Query(default=False), page: int = Query(default=1, ge=1), page_size: int = Query(default=20, ge=10, le=100)) -> Any:
    params: dict[str, Any] = {
        "recursive": str(recursive).lower(),
        "page": page,
        "page_size": page_size,
    }
    if folder_id:
        params["folder_id"] = folder_id
    return await _request("GET", f"{PUBLIC_KNOWLEDGE_PATH}/files/page", params=params)


class DocumentContent(BaseModel):
    manifest: dict[str, Any]
    content: str
    content_hash: str
    verification: str


def _document_version(item):
    return tuple(item.get(k) for k in ("id", "updated_at", "size", "status", "name", "folder_id", "sha256"))


async def _document_manifest(file_id, folder_id):
    payload = await _request("GET", f"{PUBLIC_KNOWLEDGE_PATH}/files",
                             params={"folder_id": folder_id, "recursive": "true"})
    matches = [x for x in payload.get("items", []) if isinstance(x, dict) and x.get("id") == file_id]
    if len(matches) != 1:
        raise HTTPException(404, detail={"code": "document_not_in_authorized_manifest"})
    return matches[0]


def _read_document_object(manifest):
    digest = manifest.get("sha256", "")
    size = manifest.get("size")
    if (not re.fullmatch(r"[0-9a-f]{64}", str(digest)) or type(size) is not int
            or not 0 < size <= MAX_DOCUMENT_BYTES or manifest.get("status") != "done"
            or manifest.get("extension") not in {".md", ".txt", ".json"}):
        raise HTTPException(422, detail={"code": "document_not_ready_or_supported"})
    # No storage_path/source_ref/URL from upstream is ever followed. Only
    # operator-mounted objects addressed by a verified SHA-256 can be read.
    path = DOCUMENT_ROOT / digest[:2] / digest
    try:
        with timing_span("knowledge.document_object_open_read", owner="DSH.knowledge-gateway", sourceOwner="KB.object-store"):
            root = DOCUMENT_ROOT.resolve(strict=True)
            if not path.resolve(strict=True).is_relative_to(root) or path.is_symlink():
                raise HTTPException(502, detail={"code": "document_unsafe_object"})
            with path.open("rb") as stream:
                if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                    raise HTTPException(502, detail={"code": "document_unsafe_object"})
                raw = stream.read(MAX_DOCUMENT_BYTES + 1)
    except (FileNotFoundError, PermissionError):
        raise HTTPException(503, detail={"code": "document_object_not_mounted"})
    with timing_span("knowledge.document_size_sha256_verify", owner="DSH.knowledge-gateway"):
        if len(raw) != size or hashlib.sha256(raw).hexdigest() != digest:
            raise HTTPException(502, detail={"code": "document_integrity_mismatch"})
    try:
        with timing_span("knowledge.document_utf8_decode", owner="DSH.knowledge-gateway"):
            return raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        raise HTTPException(422, detail={"code": "document_not_utf8"})


@app.get("/files/{file_id}/content", response_model=DocumentContent,
         summary="Read a complete, hash-verified text knowledge document",
         description="Internal DSH capability. Requires the exact operator-configured knowledge root. "
                     "Fresh upstream scoped manifests before and after reading must agree. Only read-only "
                     "mounted UTF-8 objects up to 1 MiB are supported. No arbitrary path/URL or original-file "
                     "download proxy. This does not grant business permissions or establish live task data.",
         responses={403: {"description": "Folder is outside configured scope"},
                    404: {"description": "File not uniquely present in scoped manifest"},
                    409: {"description": "Manifest changed during read"},
                    422: {"description": "Invalid ID, unsupported/not-ready/non-UTF-8 document"},
                    502: {"description": "Upstream failure or size/hash integrity failure"},
                    503: {"description": "Full-text capability or specific read-only object not mounted"}})
async def document_content(file_id: str, folder_id: str = Query(min_length=1, max_length=128)):
    if not re.fullmatch(r"[A-Za-z0-9]{1,128}", file_id):
        raise HTTPException(422, detail={"code": "invalid_document_id"})
    if not DOCUMENT_SCOPE:
        raise HTTPException(503, detail={"code": "document_scope_not_configured"})
    if folder_id != DOCUMENT_SCOPE:
        raise HTTPException(403, detail={"code": "document_folder_out_of_scope"})
    with timing_span("knowledge.document_manifest_before", owner="DSH.knowledge-gateway"):
        before = await _document_manifest(file_id, folder_id)
    with timing_span("knowledge.document_object_read_verify", owner="DSH.knowledge-gateway"):
        content = await asyncio.to_thread(_read_document_object, before)
    with timing_span("knowledge.document_manifest_after", owner="DSH.knowledge-gateway"):
        after = await _document_manifest(file_id, folder_id)
    if _document_version(before) != _document_version(after):
        raise HTTPException(409, detail={"code": "document_manifest_changed"})
    safe_keys = ("id", "folder_id", "name", "extension", "mime_type", "size", "status", "updated_at", "sha256")
    return DocumentContent(manifest={k: before[k] for k in safe_keys if k in before}, content=content,
                           content_hash=before["sha256"], verification="scoped_manifest_before_after_sha256")
