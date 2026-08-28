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
    # Operator-editable instructions are added to each generated system
    # prompt. Built-in language, safety, and evidence rules remain enforced.
    system_prompt: str = ""
    # UMC access is request-scoped: the frontend supplies the caller's
    # umctoken in Authorization and DSH forwards it to the anonymous proxies.
    # It is deliberately not a persisted configuration value.
    external_tools_enabled: bool = True
    ocr_gateway_url: str = "http://ocr-gateway:8100"
    ocr_timeout_seconds: float = 300.0
    # UMC ships separate customer, public and admin portals. Keep the selected
    # portal in one environment switch so every backend call uses the same
    # upstream base URL. A base URL may include the customer portal's `/login`
    # frontend route; the helper below strips that route before appending API
    # paths.
    umc_portal: str = "customer"
    umc_customer_base_url: str = "https://umc-customerportal.sol.daypop.ai"
    umc_admin_base_url: str = "https://umc-adminportal.sol.daypop.ai"
    # Optional legacy overrides. Leave blank to derive the endpoints from the
    # selected portal base URL.
    umc_document_base_url: str = ""
    umc_document_timeout_seconds: float = 60.0
    # The local test console obtains a short-lived UMC customer token through
    # the real portal login endpoint. Credentials are injected by Docker env
    # and never sent to the browser or persisted in the database.
    umc_login_url: str = ""
    umc_login_email: str = ""
    umc_login_password: str = ""
    umc_login_timeout_seconds: float = 30.0
    # Audit records are retained independently from user-visible conversation
    # history. The sweeper runs periodically and removes expired audit rows.
    audit_retention_days: int = 30
    audit_cleanup_interval_seconds: int = 3600
    knowledge_gateway_url: str = "http://knowledge-gateway:8101"
    knowledge_timeout_seconds: float = 30.0
    knowledge_retry_attempts: int = 2
    knowledge_default_folder_id: str = ""
    knowledge_top_k: int = 32
    platform_gateway_url: str = "http://platform-gateway:8102"
    platform_timeout_seconds: float = 30.0

    @staticmethod
    def _portal_base(value: str) -> str:
        base = (value or "").strip().rstrip("/")
        if base.lower().endswith("/login"):
            base = base[:-len("/login")].rstrip("/")
        return base

    @property
    def umc_base_url(self) -> str:
        portal = (self.umc_portal or "customer").strip().lower()
        if portal not in {"customer", "admin", "public"}:
            portal = "customer"
        selected = self.umc_admin_base_url if portal == "admin" else self.umc_customer_base_url
        return self._portal_base(selected)

    @property
    def umc_login_endpoint(self) -> str:
        override = (self.umc_login_url or "").strip().rstrip("/")
        return override or f"{self.umc_base_url}/api/User/Login"

    @property
    def umc_document_service_base_url(self) -> str:
        override = (self.umc_document_base_url or "").strip().rstrip("/")
        return override or self.umc_base_url

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
    {"key": "system_prompt", "label": "系统提示词（可编辑）", "env": "SYSTEM_PROMPT", "secret": False, "restartRequired": False, "multiline": True, "description": "作为全局追加指令注入每轮系统提示词；内置语言、安全和证据规则仍然优先。", "group": "DSH 行为"},
    {"key": "database_url", "label": "Database URL", "env": "DATABASE_URL", "secret": True, "restartRequired": True, "group": "基础设施"},
    {"key": "redis_url", "label": "Redis URL", "env": "REDIS_URL", "secret": True, "restartRequired": True, "group": "基础设施"},
    {"key": "knowledge_gateway_url", "label": "知识库 Tool URL", "env": "KNOWLEDGE_GATEWAY_URL", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "knowledge_default_folder_id", "label": "知识库默认目录 ID", "env": "KNOWLEDGE_DEFAULT_FOLDER_ID", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "knowledge_top_k", "label": "知识库 top_k", "env": "KNOWLEDGE_TOP_K", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "knowledge_timeout_seconds", "label": "知识库超时（秒）", "env": "KNOWLEDGE_TIMEOUT_SECONDS", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "platform_gateway_url", "label": "Swagger Tool URL", "env": "PLATFORM_GATEWAY_URL", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "platform_timeout_seconds", "label": "Swagger 超时（秒）", "env": "PLATFORM_TIMEOUT_SECONDS", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "ocr_gateway_url", "label": "OCR Tool URL", "env": "OCR_GATEWAY_URL", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "umc_portal", "label": "UMC Portal 环境", "env": "UMC_PORTAL", "secret": False, "restartRequired": False, "options": ["customer", "admin", "public"], "description": "customer、admin 或 public；public 复用 Customer Portal 地址。切换后新的登录、上传和下载请求使用对应 Portal。", "group": "UMC Portal"},
    {"key": "umc_customer_base_url", "label": "Customer Portal Base URL", "env": "UMC_CUSTOMER_BASE_URL", "secret": False, "restartRequired": False, "group": "UMC Portal"},
    {"key": "umc_admin_base_url", "label": "Admin Portal Base URL", "env": "UMC_ADMIN_BASE_URL", "secret": False, "restartRequired": False, "group": "UMC Portal"},
    {"key": "umc_document_base_url", "label": "UMC Document URL", "env": "UMC_DOCUMENT_BASE_URL", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "external_tools_enabled", "label": "启用外部 Tools", "env": "EXTERNAL_TOOLS_ENABLED", "secret": False, "restartRequired": False, "group": "外部 Tool"},
    {"key": "audit_retention_days", "label": "链路审计留存天数", "env": "AUDIT_RETENTION_DAYS", "secret": False, "restartRequired": False, "description": "审计表保留最近 N 天；会话历史不受此项影响。", "group": "链路审计"},
    {"key": "audit_cleanup_interval_seconds", "label": "审计清理周期（秒）", "env": "AUDIT_CLEANUP_INTERVAL_SECONDS", "secret": False, "restartRequired": False, "description": "后台周期清理审计过期记录，最短按 60 秒执行。", "group": "链路审计"},
)


def config_catalog() -> list[dict[str, object]]:
    """Return a JSON-safe copy of the editable configuration catalog."""

    return [dict(item) for item in CONFIG_CATALOG]
