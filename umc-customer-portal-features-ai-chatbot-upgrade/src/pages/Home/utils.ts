import type { LicensePermitDocumentType } from "@/services/permitsLicense";
import type { CanMergeResponse, MergeAccountResponse } from "@/services/user";

export function normalizeHomeRenewalDocumentType(
  documentType?: LicensePermitDocumentType,
): LicensePermitDocumentType {
  return documentType ?? "LICENSE";
}

export function buildHomeRequestDetailSearch(
  applicationId: string | number,
  action?: string,
): string {
  const params = new URLSearchParams({ id: String(applicationId) });
  if (action) {
    params.set("action", action);
  }
  return `?${params.toString()}`;
}

/** Fields returned directly from POST /api/User/MergeAccount. */
export type MergeAccountSuccessData = MergeAccountResponse;

export type AccountMergeEligibility =
  | { mode: "none" }
  | { mode: "optional" }
  | {
      mode: "forced";
      matchedAccountEmail: string;
      targetUserId: string;
    };

export type AccountMergeStatus =
  | "SOURCE_NOT_ELIGIBLE"
  | "SOURCE_ELIGIBLE"
  | "FORCE_MERGE_REQUIRED"
  | "TARGET_ELIGIBLE"
  | "TARGET_IDENTITY_MISMATCH"
  | "TARGET_HAS_BUSINESS_DATA"
  | "TARGET_ALREADY_LINKED"
  | "TARGET_ALREADY_MERGED"
  | "TARGET_NOT_ELIGIBLE"
  | "ALREADY_LINKED";

const ACCOUNT_MERGE_STATUSES = new Set<AccountMergeStatus>([
  "SOURCE_NOT_ELIGIBLE",
  "SOURCE_ELIGIBLE",
  "FORCE_MERGE_REQUIRED",
  "TARGET_ELIGIBLE",
  "TARGET_IDENTITY_MISMATCH",
  "TARGET_HAS_BUSINESS_DATA",
  "TARGET_ALREADY_LINKED",
  "TARGET_ALREADY_MERGED",
  "TARGET_NOT_ELIGIBLE",
  "ALREADY_LINKED",
]);

export function normalizeAccountMergeStatus(
  value: unknown,
): AccountMergeStatus | "" {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toUpperCase();
  return ACCOUNT_MERGE_STATUSES.has(normalized as AccountMergeStatus)
    ? (normalized as AccountMergeStatus)
    : "";
}

export function getAccountMergeErrorStatus(error: unknown): AccountMergeStatus | "" {
  if (!error || typeof error !== "object") return "";

  const source = error as Record<string, unknown>;
  const response = source.response;
  const responseData =
    response && typeof response === "object"
      ? (response as Record<string, unknown>).data
      : undefined;
  const candidates = [
    source.status,
    source.businessCode,
    source.errorCode,
    responseData && typeof responseData === "object"
      ? (responseData as Record<string, unknown>).status
      : undefined,
    responseData && typeof responseData === "object"
      ? (responseData as Record<string, unknown>).businessCode
      : undefined,
    responseData && typeof responseData === "object"
      ? (responseData as Record<string, unknown>).errorCode
      : undefined,
  ];

  for (const candidate of candidates) {
    const code = normalizeAccountMergeStatus(candidate);
    if (code) return code;
  }
  return "";
}

export function isTargetBlockedStatus(
  status: AccountMergeStatus | "",
): boolean {
  return [
    "TARGET_IDENTITY_MISMATCH",
    "TARGET_HAS_BUSINESS_DATA",
    "TARGET_ALREADY_LINKED",
    "TARGET_ALREADY_MERGED",
    "TARGET_NOT_ELIGIBLE",
  ].includes(status);
}

export function interpretCanMergeResponse(
  response: CanMergeResponse,
  fallbackMatchedEmail = "",
): AccountMergeEligibility {
  if (response.canMerge !== true) {
    return { mode: "none" };
  }
  if (response.forceMerge !== true) {
    return { mode: "optional" };
  }
  return {
    mode: "forced",
    matchedAccountEmail:
      String(response.targetEmail ?? "").trim() || fallbackMatchedEmail.trim(),
    targetUserId: String(response.targetUserId ?? "").trim(),
  };
}

/** Masks the email local part for UI: first + *... + last; 2 chars → first + *; 1 char → * */
export function maskEmailLocalForDisplay(email: string): string {
  const s = email.trim();
  if (!s) return "";
  const at = s.indexOf("@");
  if (at <= 0) return s;

  const local = s.slice(0, at);
  const domain = s.slice(at);

  if (local.length === 0) return s;
  if (local.length === 1) {
    return `*${domain}`;
  }
  if (local.length === 2) {
    return `${local[0]}*${domain}`;
  }
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}${domain}`;
}
