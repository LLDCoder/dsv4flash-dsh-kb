from typing import Any

import httpx

from .config import Settings


class OCRNotConfigured(RuntimeError):
    pass


class OCRGatewayClient:
    """Client for the internal Tool Gateway's PaddleOCR-VL endpoint."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.ocr_gateway_url.rstrip("/")
        self.timeout = settings.ocr_timeout_seconds

    async def layout_parsing(self, file: str, file_type: int | None = None, options: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.base_url:
            raise OCRNotConfigured("OCR gateway is not configured")
        payload: dict[str, Any] = {"file": file}
        if file_type is not None:
            payload["fileType"] = file_type
        if options:
            payload.update(options)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/layout-parsing", json=payload)
            response.raise_for_status()
            return response.json()

