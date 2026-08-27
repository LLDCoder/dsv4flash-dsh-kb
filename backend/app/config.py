from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DSH External Service"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://dsh:dsh@postgres:5432/dsh"
    redis_url: str = "redis://redis:6379/0"
    cors_origins: str = "*"
    runtime_profile_default: str = "default"
    runtime_idle_ttl_seconds: int = 900
    runtime_graceful_shutdown_seconds: int = 45
    warm_pool_min_idle: int = 1
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "deepseek-v4-flash"
    llm_timeout_seconds: float = 60.0
    # External tool credentials are optional. They are injected only into the
    # corresponding gateway and are never returned by the config API.
    knowledge_api_key: str = ""
    platform_api_key: str = ""
    external_tools_enabled: bool = True
    ocr_gateway_url: str = "http://ocr-gateway:8100"
    ocr_timeout_seconds: float = 300.0
    knowledge_gateway_url: str = "http://knowledge-gateway:8101"
    knowledge_timeout_seconds: float = 30.0
    knowledge_retry_attempts: int = 2
    knowledge_default_folder_id: str = ""
    knowledge_top_k: int = 32
    platform_gateway_url: str = "http://platform-gateway:8102"
    platform_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


# This catalog drives the test console. Keep secrets explicitly marked so the
# API can mask them even when operators inspect the configuration from a
# browser. Database/Redis URLs are editable for deployment hand-off but need a
# container restart before the SQLAlchemy/Redis clients can use them.
CONFIG_CATALOG: tuple[dict[str, object], ...] = (
    {"key": "llm_base_url", "label": "LLM Base URL", "env": "LLM_BASE_URL", "secret": False, "restartRequired": False, "group": "模型"},
    {"key": "llm_api_key", "label": "LLM API Key", "env": "LLM_API_KEY", "secret": True, "restartRequired": False, "group": "模型"},
    {"key": "llm_model", "label": "模型名称", "env": "LLM_MODEL", "secret": False, "restartRequired": False, "group": "模型"},
    {"key": "llm_timeout_seconds", "label": "LLM 超时（秒）", "env": "LLM_TIMEOUT_SECONDS", "secret": False, "restartRequired": False, "group": "模型"},
    {"key": "database_url", "label": "Database URL", "env": "DATABASE_URL", "secret": True, "restartRequired": True, "group": "基础设施"},
    {"key": "redis_url", "label": "Redis URL", "env": "REDIS_URL", "secret": True, "restartRequired": True, "group": "基础设施"},
    {"key": "knowledge_gateway_url", "label": "知识库 Tool URL", "env": "KNOWLEDGE_GATEWAY_URL", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "knowledge_api_key", "label": "知识库 API Key", "env": "KNOWLEDGE_API_KEY", "secret": True, "restartRequired": False, "group": "外部 Tool"},
    {"key": "knowledge_default_folder_id", "label": "知识库默认目录 ID", "env": "KNOWLEDGE_DEFAULT_FOLDER_ID", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "knowledge_top_k", "label": "知识库 top_k", "env": "KNOWLEDGE_TOP_K", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "knowledge_timeout_seconds", "label": "知识库超时（秒）", "env": "KNOWLEDGE_TIMEOUT_SECONDS", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "platform_gateway_url", "label": "Swagger Tool URL", "env": "PLATFORM_GATEWAY_URL", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "platform_api_key", "label": "Swagger/API Bearer Token", "env": "PLATFORM_API_KEY", "secret": True, "restartRequired": False, "group": "外部 Tool"},
    {"key": "platform_timeout_seconds", "label": "Swagger 超时（秒）", "env": "PLATFORM_TIMEOUT_SECONDS", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "ocr_gateway_url", "label": "OCR Tool URL", "env": "OCR_GATEWAY_URL", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "external_tools_enabled", "label": "启用外部 Tools", "env": "EXTERNAL_TOOLS_ENABLED", "secret": False, "restartRequired": False, "group": "外部 Tool"},
)


def config_catalog() -> list[dict[str, object]]:
    """Return a JSON-safe copy of the editable configuration catalog."""

    return [dict(item) for item in CONFIG_CATALOG]
