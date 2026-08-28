from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ConversationCreate(APIModel):
    workspace: str = "default"
    skill_profile: str = Field(default="default", validation_alias=AliasChoices("skillProfile", "skill_profile"))
    runtime_profile: str = Field(default="default", validation_alias=AliasChoices("runtimeProfile", "runtime_profile"))


class MessageAttachment(APIModel):
    file_ref: str = Field(min_length=1, max_length=2_000, validation_alias=AliasChoices("fileRef", "file_ref"), serialization_alias="fileRef")
    file_name: str = Field(min_length=1, max_length=512, validation_alias=AliasChoices("fileName", "file_name"), serialization_alias="fileName")
    mime_type: str = Field(min_length=1, max_length=128, validation_alias=AliasChoices("mimeType", "mime_type"), serialization_alias="mimeType")
    file_type: Literal[0, 1] = Field(validation_alias=AliasChoices("fileType", "file_type"), serialization_alias="fileType")


class MessageCreate(APIModel):
    content: str = Field(default="", max_length=50_000)
    client_message_id: str = Field(min_length=1, max_length=128, validation_alias=AliasChoices("clientMessageId", "client_message_id"))
    attachment: MessageAttachment | None = None

    @model_validator(mode="after")
    def require_content_or_attachment(self):
        if not self.content.strip() and not self.attachment:
            raise ValueError("message content or attachment is required")
        return self


class ConfigPatch(APIModel):
    scope: str = "system"
    version: int | None = None
    patch: dict[str, Any]


class ConsoleLogin(APIModel):
    password: str = Field(min_length=1, max_length=256)


class TestCaseGenerateRequest(APIModel):
    languages: list[Literal["en", "ar"]] = Field(default_factory=lambda: ["en", "ar"])
    folder_id: str | None = Field(default=None, alias="folderId")
    limit: int = Field(default=40, ge=2, le=60)


class TestCaseRunRequest(APIModel):
    cases: list[dict[str, Any]] = Field(default_factory=list, min_length=1, max_length=40)
    timeout_seconds: float = Field(default=90, ge=10, le=180, validation_alias=AliasChoices("timeoutSeconds", "timeout_seconds"))


class OCRRequest(APIModel):
    file: str = Field(min_length=1, description="可访问的文件 URL 或 Base64 内容")
    file_type: int | None = Field(
        default=None,
        ge=0,
        le=1,
        validation_alias=AliasChoices("fileType", "file_type"),
    )
    options: dict[str, Any] = Field(default_factory=dict)


class SkillUpsert(APIModel):
    name: str
    version: int = 1
    source: str = "ops"
    status: Literal["DRAFT", "PUBLISHED", "DISABLED"] = "DRAFT"
    scope: str = "system"
    enabled: bool = False
    allowed_tools: list[str] = Field(default_factory=list, validation_alias=AliasChoices("allowedTools", "allowed_tools"))
    dependencies: list[str] = Field(default_factory=list)
    content: str = ""


class SkillCreate(SkillUpsert):
    skill_id: str = Field(min_length=1, max_length=128, validation_alias=AliasChoices("skillId", "skill_id"))


class WSMessage(APIModel):
    type: Literal["auth", "subscribe", "message", "resume", "ack", "cancel"]
    conversation_id: str | None = Field(default=None, validation_alias=AliasChoices("conversationId", "conversation_id"))
    content: str | None = Field(default=None, max_length=50_000)
    attachment: MessageAttachment | None = None
    client_message_id: str | None = Field(default=None, validation_alias=AliasChoices("clientMessageId", "client_message_id"))
    after_seq: int = Field(default=0, validation_alias=AliasChoices("afterSeq", "after_seq"))
    seq: int | None = None
    umc_token: str | None = Field(default=None, validation_alias=AliasChoices("umctoken", "umcToken", "umc_token"))

    @model_validator(mode="after")
    def require_message_payload(self):
        if self.type == "message" and not (self.content or "").strip() and not self.attachment:
            raise ValueError("message content or attachment is required")
        return self
