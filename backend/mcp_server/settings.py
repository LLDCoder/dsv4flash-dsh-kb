"""MCP Server settings — self-contained, no dependency on backend.app."""

import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class MCPServerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    ocr_gateway_url: str = "http://ocr-gateway:8100"
    ocr_timeout_seconds: float = 300.0
    knowledge_gateway_url: str = "http://knowledge-gateway:8101"
    knowledge_timeout_seconds: float = 30.0
    knowledge_retry_attempts: int = 2
    platform_gateway_url: str = "http://platform-gateway:8102"
    platform_timeout_seconds: float = 30.0


def publish_gateway_settings(settings):
    """Publish only gateway URLs and timeouts from the trusted runtime settings."""
    filename = os.environ.get("DSH_MCP_GATEWAY_CONFIG")
    if not filename:
        return
    path = Path(filename)
    snapshot = MCPServerSettings.model_validate({
        field: getattr(settings, field) for field in MCPServerSettings.model_fields
    }).model_dump_json()
    with NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as tmp:
        tmp.write(snapshot)
    try:
        os.replace(tmp.name, path)
    finally:
        Path(tmp.name).unlink(missing_ok=True)


@lru_cache(maxsize=1)
def _read_settings(snapshot):
    if snapshot is not None:
        return MCPServerSettings.model_validate_json(snapshot)
    return MCPServerSettings(_env_file=os.environ.get("DSH_LOCAL_ENV_FILE", ".env"))


def get_mcp_settings() -> MCPServerSettings:
    filename = os.environ.get("DSH_MCP_GATEWAY_CONFIG")
    return _read_settings(Path(filename).read_text() if filename else None)
