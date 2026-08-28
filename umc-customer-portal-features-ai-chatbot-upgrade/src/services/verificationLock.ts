export type VerificationLockType = "verify" | "resend";

export interface VerificationLockState {
  locked: true;
  lockType?: VerificationLockType;
  lockUntil: number | null;
  message?: string;
  remainingSec: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getPayload(value: unknown): unknown {
  if (
    isRecord(value) &&
    "response" in value &&
    isRecord(value.response) &&
    "data" in value.response
  ) {
    return value.response.data;
  }

  return value;
}

function getMessage(value: unknown): string {
  if (!isRecord(value)) {
    return value instanceof Error ? value.message.trim() : "";
  }

  const message = value.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  const nestedData = value.data;
  if (isRecord(nestedData)) {
    const nestedMessage = nestedData.message;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }

  return value instanceof Error ? value.message.trim() : "";
}

function isLockMessage(message: string): boolean {
  const normalized = message.toLowerCase().replace(/\s+/g, " ").trim();

  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("access has been restricted") ||
    normalized.includes("too many code requests") ||
    normalized.includes("failed verification attempts") ||
    normalized.includes("try again later") ||
    normalized.includes("try again in")
  );
}

export function resolveVerificationLockState(
  value: unknown,
  fallbackLockType?: VerificationLockType,
): VerificationLockState | null {
  const payload = getPayload(value);
  const source =
    isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  const message =
    getMessage(source) || getMessage(payload) || getMessage(value) || "";

  const explicitLockType =
    isRecord(source) &&
    (source.lockType === "verify" || source.lockType === "resend")
      ? source.lockType
      : undefined;

  const lockType = explicitLockType ?? fallbackLockType;
  const lockedByFlag = Boolean(
    isRecord(source) && (source.locked ?? source.isLocked),
  );
  const lockedByCode =
    isRecord(source) &&
    typeof source.code === "string" &&
    source.code.toUpperCase() === "OTP_LOCKED";
  const lockUntil =
    isRecord(source) &&
    typeof source.lockUntil === "number" &&
    Number.isFinite(source.lockUntil)
      ? source.lockUntil
      : null;
  const remainingSec =
    lockUntil !== null
      ? Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000))
      : null;
  const lockedByMessage = isLockMessage(message);
  const isLocked =
    lockedByFlag || lockedByCode || lockedByMessage || remainingSec !== null;

  if (!isLocked) {
    return null;
  }

  return {
    locked: true,
    lockType,
    lockUntil,
    message: message || undefined,
    remainingSec: remainingSec && remainingSec > 0 ? remainingSec : null,
  };
}
