import {
  getExpiryAlertDaysFromIsExpiredDays,
  getExpiryStateFromIsExpiredDays,
  getIsExpiredDaysFromSource,
} from "@/utils/expiry";

/**
 * add         → no profile yet (only used as fallback, navigation normally uses mode=add)
 * expiringSoon → Approved + document expiring within 30 days
 * approved     → Approved, no imminent expiry
 * underReview  → Under Review (code 2)
 * rejected     → Rejected (code 4)
 * expired      → Expired (code 5)
 * pendingCompletion → Pending Completion (code 1)
 * suspended    → Suspended (code 6)
 */
export type PersonalProfilePageMode =
  | "add"
  | "expiringSoon"
  | "approved"
  | "underReview"
  | "rejected"
  | "expired"
  | "pendingCompletion"
  | "suspended";

/**
 * Page modes that show the personal profile submit (ActionFooter):
 * add, rejected, expired, pending completion, expiring soon (document renewal).
 */
export const PERSONAL_PROFILE_SUBMIT_FOOTER_PAGE_MODES = [
  "add",
  "rejected",
  "expired",
  "pendingCompletion",
  "expiringSoon",
] as const satisfies readonly PersonalProfilePageMode[];

export function shouldShowPersonalProfileSubmitFooter(
  pageMode: PersonalProfilePageMode,
): boolean {
  return (PERSONAL_PROFILE_SUBMIT_FOOTER_PAGE_MODES as readonly string[]).includes(pageMode);
}

/**
 * Highest-priority lock: profile is view-only (no field edits, documents browse-only).
 * Applies to Under Review and Suspended.
 */
export const PERSONAL_PROFILE_READ_ONLY_PAGE_MODES = [
  "underReview",
  "suspended",
] as const satisfies readonly PersonalProfilePageMode[];

export function isPersonalProfileFormReadOnly(
  pageMode: PersonalProfilePageMode,
): boolean {
  return (PERSONAL_PROFILE_READ_ONLY_PAGE_MODES as readonly string[]).includes(pageMode);
}

export interface PersonalProfileEditPolicy {
  pageMode: PersonalProfilePageMode;
  isAddMode: boolean;
  isDetailMode: boolean;
  isReadOnly: boolean;
  showFooter: boolean;
  showSections: boolean;
  requiresIcpBeforeContinue: boolean;
  allowReadonlyIdentityVerification: boolean;
  addressInlineEditEnabled: boolean;
  addressEditableWithFooter: boolean;
  canEditAddress: boolean;
  documentsBrowsingOnly: boolean;
  canEditMainForm: boolean;
}

/**
 * When the profile is approved and stable, the page-level submit footer is hidden.
 * The address block then uses its own Edit / Save for partial updates instead of footer submit.
 */
export const PERSONAL_PROFILE_ADDRESS_INLINE_EDIT_PAGE_MODES = [
  "approved",
] as const satisfies readonly PersonalProfilePageMode[];

export function shouldShowPersonalProfileAddressInlineEdit(
  pageMode: PersonalProfilePageMode,
): boolean {
  return (PERSONAL_PROFILE_ADDRESS_INLINE_EDIT_PAGE_MODES as readonly string[]).includes(pageMode);
}

/** Detail-entry third-party ICP auto-sync is blocked for stable/read-only lifecycle states. */
export const PERSONAL_PROFILE_THIRD_PARTY_ICP_BLOCKED_PAGE_MODES = [
  "underReview",
  "suspended",
] as const satisfies readonly PersonalProfilePageMode[];

export function isPersonalProfileThirdPartyIcpBlockedPageMode(
  pageMode: PersonalProfilePageMode,
): boolean {
  return (
    PERSONAL_PROFILE_THIRD_PARTY_ICP_BLOCKED_PAGE_MODES as readonly string[]
  ).includes(pageMode);
}

/**
 * Non-photo identity documents: view + download only (no replace / delete).
 * Applies only when the profile is approved and stable: not expiring soon (`expiringSoon`)
 * and not pending review (`underReview`).
 */
export function isPersonalProfileDocumentsBrowsingOnly(
  pageMode: PersonalProfilePageMode,
): boolean {
  return pageMode === "approved";
}

/**
 * Personal Documents row: expired UX is view + delete (no download).
 * Profile status expired or the row-specific expiry flag applies.
 */
export function isPersonalProfileDocumentExpiredRow(
  pageMode: PersonalProfilePageMode,
  rowIsExpiry: boolean,
): boolean {
  return pageMode === "expired" || rowIsExpiry;
}

/**
 * Address fields are part of the full form (footer submit / add flow); no separate address Save.
 */
export function isPersonalProfileAddressAlwaysEditableInForm(
  pageMode: PersonalProfilePageMode,
  isAddMode: boolean,
): boolean {
  if (isAddMode) return true;
  if (isPersonalProfileFormReadOnly(pageMode)) return false;
  if (shouldShowPersonalProfileSubmitFooter(pageMode)) return true;
  return false;
}

export function createPersonalProfileEditPolicy(params: {
  mode: string | null;
  pageMode: PersonalProfilePageMode;
  initialVerificationComplete: boolean;
  detailThirdPartyIcpEnabled: boolean;
  profileVerificationMethod: number;
}): PersonalProfileEditPolicy {
  const isAddMode = params.mode === "add";
  const isDetailMode = params.mode === "edit";
  const requiresIcpBeforeContinue =
    isDetailMode &&
    params.pageMode === "pendingCompletion" &&
    params.detailThirdPartyIcpEnabled &&
    params.profileVerificationMethod === 1;

  const addressInlineEditEnabled = shouldShowPersonalProfileAddressInlineEdit(
    params.pageMode,
  );
  const addressEditableWithFooter = isPersonalProfileAddressAlwaysEditableInForm(
    params.pageMode,
    isAddMode,
  );
  const isReadOnly = isPersonalProfileFormReadOnly(params.pageMode);

  return {
    pageMode: params.pageMode,
    isAddMode,
    isDetailMode,
    isReadOnly,
    showFooter: shouldShowPersonalProfileSubmitFooter(params.pageMode),
    requiresIcpBeforeContinue,
    allowReadonlyIdentityVerification: requiresIcpBeforeContinue,
    showSections:
      params.pageMode === "pendingCompletion" ||
      (requiresIcpBeforeContinue
        ? params.initialVerificationComplete
        : !isAddMode || params.initialVerificationComplete),
    addressInlineEditEnabled,
    addressEditableWithFooter,
    canEditAddress: !isReadOnly && (addressEditableWithFooter || addressInlineEditEnabled),
    documentsBrowsingOnly: isPersonalProfileDocumentsBrowsingOnly(params.pageMode),
    canEditMainForm:
      isAddMode ||
      params.pageMode === "pendingCompletion" ||
      params.pageMode === "rejected",
  };
}

/** Valid `pageMode` query strings when linking from My Account (hyphen-insensitive aliases). */
const PERSONAL_PROFILE_URL_PAGE_MODE_ALIASES: Record<string, PersonalProfilePageMode> =
  Object.freeze({
    add: "add",
    expiringsoon: "expiringSoon",
    approved: "approved",
    underreview: "underReview",
    rejected: "rejected",
    expired: "expired",
    pendingcompletion: "pendingCompletion",
    suspended: "suspended",
  });

export function parsePersonalProfileUrlPageMode(
  raw: string | null | undefined,
): PersonalProfilePageMode | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().replace(/-/g, "").toLowerCase();
  return PERSONAL_PROFILE_URL_PAGE_MODE_ALIASES[key] ?? null;
}

/**
 * Resolved lifecycle mode for Personal Profile UI.
 * Before detail data loads, a valid URL `pageMode` is used; once loaded, API state wins.
 */
export function resolvePersonalProfilePageMode(params: {
  mode: string | null;
  pageModeSearchParam: string | null | undefined;
  profileData: any;
}): PersonalProfilePageMode {
  const derived = getPersonalProfilePageMode(params.profileData);

  if (params.mode !== "edit") {
    return params.mode === "add" ? "add" : derived;
  }

  const fromUrl = parsePersonalProfileUrlPageMode(params.pageModeSearchParam ?? null);
  const hasLoadedStatus =
    String(params.profileData?.proFileStatus?.code ?? "").trim() !== "";

  // Before detail data loads, keep the URL lifecycle; once loaded, API state wins.
  if (!hasLoadedStatus) {
    return fromUrl ?? derived;
  }
  return derived;
}

/** Shared AlertBanner countdown sourced from API `IsExpiredDays`. */
export function getPersonalAlertExpiryDays(
  pageMode: PersonalProfilePageMode | string,
  profileData: any,
): number {
  if (pageMode !== "expiringSoon" && pageMode !== "expired") {
    return 1;
  }
  return (
    getExpiryAlertDaysFromIsExpiredDays(
      getIsExpiredDaysFromSource(profileData),
    ) ?? 1
  );
}

/**
 * Derives a PersonalProfilePageMode from a raw personal-profile API object.
 * Used when navigating from My Account and as a fallback when the URL has no valid `pageMode`.
 */
export function getPersonalProfilePageMode(
  personalProfile: any,
): PersonalProfilePageMode {
  if (!personalProfile?.proFileStatus) return "add";
  const statusCode = String(personalProfile.proFileStatus?.code ?? "").trim();

  if (statusCode === "3") {
    const expiryState = getExpiryStateFromIsExpiredDays(
      getIsExpiredDaysFromSource(personalProfile),
    );
    if (expiryState === "expired" || expiryState === "expiringSoon") {
      return expiryState;
    }
    return "approved";
  }
  if (statusCode === "2") return "underReview";
  if (statusCode === "4") return "rejected";
  if (statusCode === "5") return "expired";
  if (statusCode === "1") return "pendingCompletion";
  if (statusCode === "6") return "suspended";
  return "approved";
}
