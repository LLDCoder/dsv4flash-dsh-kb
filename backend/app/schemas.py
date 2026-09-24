from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator

from .audit_auth import validate_password_policy


# Keep browser, REST, and WebSocket callers on one user-visible input bound.
MAX_CHAT_MESSAGE_CHARS = 10_000


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ConversationCreate(APIModel):
    workspace: str = "default"


class PageContext(APIModel):
    """Bounded, non-authoritative hints about the Admin UI currently visible to the user."""

    current_page: str = Field(default="", max_length=300, validation_alias=AliasChoices("currentPage", "current_page"))
    selected_tab_path: list[str] = Field(
        default_factory=list,
        max_length=8,
        validation_alias=AliasChoices("selectedTabPath", "selected_tab_path"),
    )
    visible_fields: list[str] = Field(
        default_factory=list,
        max_length=40,
        validation_alias=AliasChoices("visibleFields", "visible_fields"),
    )
    filters: dict[str, Any] = Field(default_factory=dict)
    pagination: dict[str, Any] = Field(default_factory=dict)


class MessageCreate(APIModel):
    content: str = Field(default="", max_length=MAX_CHAT_MESSAGE_CHARS)
    client_message_id: str = Field(min_length=1, max_length=128, validation_alias=AliasChoices("clientMessageId", "client_message_id"))
    response_language: Literal["en", "ar", "zh"] | None = Field(
        default=None,
        validation_alias=AliasChoices("responseLanguage", "response_language"),
    )
    page_context: PageContext | None = Field(
        default=None,
        validation_alias=AliasChoices("pageContext", "page_context"),
    )

    @model_validator(mode="after")
    def require_content(self):
        if not self.content.strip():
            raise ValueError("message content is required")
        return self
class MessageFeedbackCreate(APIModel):
    rating: Literal["up", "down"] | None
    reason: str | None = Field(default=None, max_length=64)


class ConfigPatch(APIModel):
    scope: str = "system"
    version: int | None = None
    patch: dict[str, Any]


class ConsoleLogin(APIModel):
    password: str = Field(min_length=1, max_length=256)


class AuditLogin(APIModel):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class AuditOperatorCreate(APIModel):
    username: str = Field(min_length=3, max_length=254)
    display_name: str = Field(min_length=1, max_length=120, validation_alias=AliasChoices("displayName", "display_name"))
    role: Literal["Administrator", "Auditor"] = "Auditor"
    password: str = Field(min_length=8, max_length=256)

    @field_validator("password")
    @classmethod
    def enforce_password_policy(cls, value: str) -> str:
        return validate_password_policy(value)


class AuditOperatorUpdate(APIModel):
    role: Literal["Administrator", "Auditor"] | None = None
    disabled: bool | None = None


class AuditPasswordReset(APIModel):
    password: str = Field(min_length=8, max_length=256)

    @field_validator("password")
    @classmethod
    def enforce_password_policy(cls, value: str) -> str:
        return validate_password_policy(value)


class TestCaseGenerateRequest(APIModel):
    languages: list[Literal["en", "ar"]] = Field(default_factory=lambda: ["en", "ar"])
    folder_id: str | None = Field(default=None, alias="folderId")
    limit: int = Field(default=40, ge=2, le=60)


class TestCaseRunRequest(APIModel):
    cases: list[dict[str, Any]] = Field(default_factory=list, min_length=1, max_length=40)
    timeout_seconds: float = Field(default=90, ge=10, le=180, validation_alias=AliasChoices("timeoutSeconds", "timeout_seconds"))


class WSMessage(APIModel):
    type: Literal["auth", "subscribe", "message", "resume", "ack", "cancel"]
    conversation_id: str | None = Field(default=None, validation_alias=AliasChoices("conversationId", "conversation_id"))
    content: str | None = Field(default=None, max_length=MAX_CHAT_MESSAGE_CHARS)
    client_message_id: str | None = Field(default=None, validation_alias=AliasChoices("clientMessageId", "client_message_id"))
    after_seq: int = Field(default=0, validation_alias=AliasChoices("afterSeq", "after_seq"))
    seq: int | None = None
    umc_token: str | None = Field(default=None, validation_alias=AliasChoices("umctoken", "umcToken", "umc_token"))
    response_language: Literal["en", "ar", "zh"] | None = Field(
        default=None,
        validation_alias=AliasChoices("responseLanguage", "response_language"),
    )
    page_context: PageContext | None = Field(
        default=None,
        validation_alias=AliasChoices("pageContext", "page_context"),
    )

    @model_validator(mode="after")
    def require_message_payload(self):
        if self.type == "message" and not (self.content or "").strip():
            raise ValueError("message content is required")
        return self
