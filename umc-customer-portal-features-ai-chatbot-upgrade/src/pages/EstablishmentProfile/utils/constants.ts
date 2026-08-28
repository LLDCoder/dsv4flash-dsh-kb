import type { EmirateItem } from "@/services/userProfile";

export const COMMERCIAL_SUB_TYPE_ID = 2;

export const ESTABLISHMENT_STATUS = {
  PENDING_COMPLETION: "1",
  UNDER_REVIEW: "2",
  APPROVED: "3",
  REJECTED: "4",
  EXPIRED: "5",
  SUSPENDED: "6",
} as const;

/**
 * add → Create-new flow (no card status)
 * pendingCompletion → Pending Completion
 * underReview → Under Review
 * rejected → Rejected
 * expired → Expired
 * expiringSoon → Expiring soon
 * suspended → Suspended
 * Approved → Approved
 */
export type EstablishmentPageMode =
  | "add"
  | "pendingCompletion"
  | "underReview"
  | "rejected"
  | "expired"
  | "expiringSoon"
  | "suspended"
  | "approved";

export const GOVERNMENT_PERMANENT_LICENSE_EXPIRY_DATE = "2999-12-31T00:00:00.000Z";

export const OFFICIAL_LETTER_TEMPLATE_URL =
  "https://example.com/official-letter-template.pdf";

/** Commercial Entity, Free Zone, Shipping company / Clearing Agency, Advertising/Talent Management Agency */
export const commercialGroupSubTypeIds = new Set([2, 5, 20, 27]);
export const commercialGroupSubTypeCodes = new Set(["2", "5", "7", "12"]);

/**
 * License-owner rules apply to Commercial, Free Zone, and Advertising/Talent Agency.
 */
export const licenseOwnerApplicableSubTypeIds = new Set([2, 5, 27]);
export const licenseOwnerApplicableSubTypeCodes = new Set(["2", "5", "12"]);
/** Government Entity, Non-Profit Organization, Embassy, Consulate, Cultural Club */
export const governmentGroupSubTypeIds = new Set([3, 4, 31, 32, 33]);
export const governmentGroupSubTypeCodes = new Set(["3", "4", "13", "14", "15"]);
/** Only Government Entity requires a `.gov.ae` work email domain. */
export const governmentEntitySubTypeIds = new Set([3]);
export const governmentEntitySubTypeCodes = new Set(["3"]);

export const commercialLicenseDigitsPattern = /^\d+$/;
export const commercialLicenseAbuDhabiPattern = /^CN-\d+$/;
export const COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH = 50;
export const ESTABLISHMENT_NAME_MAX_LENGTH = 200;
export const LICENSE_OWNER_MAX_COUNT = 2;

export const PHONE_NUMBER_MAX_LENGTH = 20;

/** Optional leading "+", then digits; total length ≤ {@link PHONE_NUMBER_MAX_LENGTH}. */
export const phoneNumberPattern = /^(?:\+\d{1,19}|\d{1,20})$/;

/** Strips invalid characters and enforces max length; does not fix "+" placement. */
export const filterPhoneNumberInput = (value: unknown): unknown => {
  if (value == null || value === "") return value;
  return String(value).replace(/[^\d+]/g, "").slice(0, PHONE_NUMBER_MAX_LENGTH);
};

export const isValidEstablishmentPhoneNumber = (value: unknown): boolean => {
  const v = String(value ?? "").trim();
  if (!v) return false;
  return phoneNumberPattern.test(v);
};

/** Normalizes external/API phone values into a valid form value when possible. */
export const formatPhoneNumberFromSource = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const leadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\+/g, "").replace(/\D/g, "");
  if (!digits) return "";
  const combined = leadingPlus ? `+${digits}` : digits;
  const filtered = String(filterPhoneNumberInput(combined));
  return isValidEstablishmentPhoneNumber(filtered) ? filtered : "";
};
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const governmentEmailPattern = /^[^\s@]+@(?:[a-z0-9-]+\.)*gov\.ae$/i;

const ABU_DHABI_EMIRATE_CODE_TOKENS = new Set(["abudhabi", "auh", "ad"]);
const ABU_DHABI_EMIRATE_NAME_TOKENS = new Set([
  "abudhabi",
  "ابوظبي",
  "أبوظبي",
]);

const normalizeLookupToken = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const resolveSelectedEmirate = (
  emirateId: unknown,
  emirateList: EmirateItem[],
): EmirateItem | undefined => {
  if (emirateId === undefined || emirateId === null || emirateId === "") {
    return undefined;
  }

  const numericId =
    typeof emirateId === "number" ? emirateId : Number(String(emirateId).trim());
  if (!Number.isFinite(numericId) || Number.isNaN(numericId)) {
    return undefined;
  }

  return emirateList.find((item) => Number(item?.id) === numericId);
};

const resolveAbuDhabiEmirate = (
  emirateId: unknown,
  emirateList: EmirateItem[],
): boolean | undefined => {
  const selectedEmirate = resolveSelectedEmirate(emirateId, emirateList);
  if (!selectedEmirate) {
    return undefined;
  }

  const codeToken = normalizeLookupToken(selectedEmirate.code);
  if (codeToken && ABU_DHABI_EMIRATE_CODE_TOKENS.has(codeToken)) {
    return true;
  }

  const nameEnToken = normalizeLookupToken(selectedEmirate.nameEn);
  if (nameEnToken && ABU_DHABI_EMIRATE_NAME_TOKENS.has(nameEnToken)) {
    return true;
  }

  const nameArToken = normalizeLookupToken(selectedEmirate.nameAr);
  if (nameArToken && ABU_DHABI_EMIRATE_NAME_TOKENS.has(nameArToken)) {
    return true;
  }

  if (codeToken || nameEnToken || nameArToken) {
    return false;
  }

  return undefined;
};

export interface CommercialLicenseValidationParams {
  licenseNumber?: unknown;
  emirateId?: unknown;
  emirateList?: EmirateItem[] | null;
}

export const isValidCommercialLicenseNumber = ({
  licenseNumber,
  emirateId,
  emirateList,
}: CommercialLicenseValidationParams): boolean => {
  const normalizedLicenseNumber = String(licenseNumber ?? "").trim();
  if (!normalizedLicenseNumber) {
    return false;
  }

  const matchesDigitsOnly =
    commercialLicenseDigitsPattern.test(normalizedLicenseNumber);
  const matchesAbuDhabiFormat =
    commercialLicenseAbuDhabiPattern.test(normalizedLicenseNumber);

  if (emirateId === undefined || emirateId === null || emirateId === "") {
    return matchesDigitsOnly || matchesAbuDhabiFormat;
  }

  const abuDhabiMatch = resolveAbuDhabiEmirate(
    emirateId,
    Array.isArray(emirateList) ? emirateList : [],
  );

  if (abuDhabiMatch === undefined) {
    return matchesDigitsOnly || matchesAbuDhabiFormat;
  }

  return abuDhabiMatch ? matchesAbuDhabiFormat : matchesDigitsOnly;
};
