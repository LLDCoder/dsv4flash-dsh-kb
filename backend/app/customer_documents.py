import base64
from urllib.parse import parse_qs, urlparse

import httpx

from .config import Settings


class CustomerDocumentNotConfigured(RuntimeError):
    pass


class CustomerDocumentClient:
    """Reads a customer-uploaded document with the request-scoped UMC token."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.umc_document_base_url.rstrip("/")
        self.timeout = settings.umc_document_timeout_seconds

    @staticmethod
    def _file_name(file_ref: str) -> str:
        parsed = urlparse(file_ref)
        file_name = parse_qs(parsed.query).get("fileName", [""])[0]
        if file_name:
            return file_name
        if parsed.scheme or parsed.netloc:
            raise ValueError("uploaded document URL does not contain fileName")
        return file_ref.strip().lstrip("/")

    async def as_data_url(self, file_ref: str, *, mime_type: str, umc_token: str | None) -> str:
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
        return f"data:{safe_content_type};base64,{encoded}"
