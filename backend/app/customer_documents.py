import base64
from urllib.parse import parse_qs, unquote, urlparse
from typing import Any

import httpx

from .config import Settings


class CustomerDocumentNotConfigured(RuntimeError):
    pass


class CustomerDocumentClient:
    """Reads a customer-uploaded document with the request-scoped UMC token."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.umc_document_service_base_url.rstrip("/")
        self.timeout = settings.umc_document_timeout_seconds

    @staticmethod
    def _upload_reference(value: Any, depth: int = 0) -> str:
        if depth > 6 or value is None:
            return ""
        if isinstance(value, (str, int, float)):
            return str(value).strip()
        if isinstance(value, list):
            for item in value:
                reference = CustomerDocumentClient._upload_reference(item, depth + 1)
                if reference:
                    return reference
            return ""
        if isinstance(value, dict):
            for key in ("url", "fileUrl", "filePath", "fileRef", "key", "objectKey", "objectName", "path", "data"):
                reference = CustomerDocumentClient._upload_reference(value.get(key), depth + 1)
                if reference:
                    return reference
        return ""

    @staticmethod
    def _response_payload(response: httpx.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return response.text

    async def upload(self, file_name: str, content: bytes, *, mime_type: str | None, umc_token: str | None) -> tuple[int, Any]:
        """Upload a browser attachment through the selected UMC portal."""

        if not self.base_url:
            raise CustomerDocumentNotConfigured("UMC document service is not configured")
        if not umc_token:
            raise PermissionError("UMC authentication is required to upload a document")
        safe_name = (file_name or "attachment").strip() or "attachment"
        content_type = mime_type or "application/octet-stream"
        headers = {"Authorization": f"Bearer {umc_token}"}
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            response = await client.post(
                f"{self.base_url}/api/Document/Upload",
                files={"file": (safe_name, content, content_type)},
                headers=headers,
            )
            payload = self._response_payload(response)
            # Keep compatibility with the historical 77 portal build, which
            # accepted `file` but only returned an object reference for `files`.
            if response.ok and not self._upload_reference(payload):
                response = await client.post(
                    f"{self.base_url}/api/Document/Upload",
                    files={"files": (safe_name, content, content_type)},
                    headers=headers,
                )
                payload = self._response_payload(response)
        return response.status_code, payload

    @staticmethod
    def _file_name(file_ref: str) -> str:
        parsed = urlparse(file_ref)
        file_name = parse_qs(parsed.query).get("fileName", [""])[0]
        if file_name:
            return file_name
        if parsed.scheme or parsed.netloc:
            # UMC may return a URL rather than an object key. Preserve the
            # path as the download key when the URL has no fileName query.
            path = unquote(parsed.path).strip("/")
            if path:
                return path
            raise ValueError("uploaded document URL does not contain a file key")
        return file_ref.strip().lstrip("/")

    async def as_base64(self, file_ref: str, *, mime_type: str, umc_token: str | None) -> str:
        """Download the UMC object and return raw Base64 for PaddleOCR-VL.

        PaddleOCR-VL's serving API decodes any non-URL ``file`` value with
        ``base64.b64decode``.  A ``data:<mime>;base64,`` prefix therefore
        corrupts the bytes instead of being treated as a data URL.
        """
        if not self.base_url:
            raise CustomerDocumentNotConfigured("UMC document service is not configured")
        if not umc_token:
            raise PermissionError("UMC authentication is required to read an uploaded document")
        file_name = self._file_name(file_ref)
        if not file_name:
            raise ValueError("uploaded document reference is empty")
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            response = await client.get(
                f"{self.base_url}/api/Document/Dowload",
                params={"fileName": file_name},
                headers={"Authorization": f"Bearer {umc_token}"},
            )
            response.raise_for_status()
        content_type = response.headers.get("content-type", "").split(";", 1)[0].strip()
        safe_content_type = content_type or mime_type or "application/octet-stream"
        encoded = base64.b64encode(response.content).decode("ascii")
        return encoded

    async def as_data_url(self, file_ref: str, *, mime_type: str, umc_token: str | None) -> str:
        """Backward-compatible alias returning the OCR-compatible Base64."""

        return await self.as_base64(file_ref, mime_type=mime_type, umc_token=umc_token)
