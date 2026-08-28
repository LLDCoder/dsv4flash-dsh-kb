export type ModifyEnginePayloadErrorCode =
  | "missing-context"
  | "no-supported-changes"
  | "configuration-incomplete";

const USER_MESSAGE_KEY_BY_CODE: Record<
  ModifyEnginePayloadErrorCode,
  string
> = {
  "missing-context": "mediaLicensePage.modifyEngineErrors.contextUnavailable",
  "no-supported-changes":
    "mediaLicensePage.modifyEngineErrors.noSupportedChanges",
  "configuration-incomplete":
    "mediaLicensePage.modifyEngineErrors.configurationIncomplete",
};

export class ModifyEnginePayloadError extends Error {
  readonly code: ModifyEnginePayloadErrorCode;

  constructor(code: ModifyEnginePayloadErrorCode, technicalMessage: string) {
    super(technicalMessage);
    this.name = "ModifyEnginePayloadError";
    this.code = code;
  }
}

export const getModifyEnginePayloadErrorMessageKey = (
  error: unknown,
): string | null =>
  error instanceof ModifyEnginePayloadError
    ? USER_MESSAGE_KEY_BY_CODE[error.code]
    : null;
