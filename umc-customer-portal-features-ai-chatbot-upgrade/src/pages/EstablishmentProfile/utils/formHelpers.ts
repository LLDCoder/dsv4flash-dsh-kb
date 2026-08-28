import moment, { type Moment } from "moment";
import type { PartnerData } from "../components/modal/PartnerModal";
import type {
  PartnerParams,
  TypeDictionary,
  UserEstablishmentProfile,
} from "@/services/userProfile";
import {
  COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH,
  ESTABLISHMENT_NAME_MAX_LENGTH,
  ESTABLISHMENT_STATUS,
  LICENSE_OWNER_MAX_COUNT,
  formatPhoneNumberFromSource,
  type EstablishmentPageMode,
} from "./constants";
import {
  getExpiryStateFromIsExpiredDays,
  getIsExpiredDaysFromSource,
} from "@/utils/expiry";
import {
  findCountryDialCodeOption,
  isValidMobileNumber,
  splitInternationalMobileNumber,
} from "@/components/common/MobileNumberInput/utils";

export type LocalizedNameSource = {
  nameEn?: string | null;
  nameAr?: string | null;
};

export interface EstablishmentPhoneValue {
  phoneCountryCode: string;
  phoneLocalNumber: string;
}

export interface EstablishmentFormValues extends Record<string, unknown> {
  establishmentSubType?: number;
  licenseNumber?: string;
  licenseExpiryDate?: Moment | string | null;
  establishmentNameArabic?: string;
  establishmentNameEnglish?: string;
  tenancyContractEndDate?: Moment | string | null;
  legalPerson?: string;
  establishmentMobile?: EstablishmentPhoneValue;
  idType?: string;
  emiratesId?: string;
  dateOfBirth?: Moment | string | null;
  personalEmail?: string;
  passportNumber?: string;
  uid?: string;
  emirate?: number | string;
  licensingAuthority?: number | string;
  workEmail?: string;
  addressEmirate?: number | string;
  addressRegion?: number | string;
  addressArea?: number | string;
  street?: string;
  commercial?: {
    documents?: Record<string, unknown>;
  };
}

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const getLocalizedName = (
  item: LocalizedNameSource | undefined,
  language: string,
) => {
  if (!item) return "";
  return language.startsWith("ar")
    ? item.nameAr || item.nameEn || ""
    : item.nameEn || item.nameAr || "";
};

// Project time contract: Dubai wall-clock, NO timezone suffix. The old
// "...SSS[Z]" format stamped a fake UTC marker onto local wall-clock values,
// which the backend now interprets as real UTC (and shifts +4h). Never add [Z].
export const formatApiDate = (date?: Moment | string | null) => {
  if (!date) return null;
  const nextDate = moment.isMoment(date) ? date : moment(date);
  return nextDate.isValid()
    ? nextDate.format("YYYY-MM-DDTHH:mm:ss")
    : null;
};

export const formatApiDateEndOfDay = (date?: Moment | string | null) => {
  if (!date) return null;
  const nextDate = moment.isMoment(date) ? date : moment(date);
  if (!nextDate.isValid()) return null;
  return nextDate
    .clone()
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(0)
    .format("YYYY-MM-DDTHH:mm:ss");
};

export const getNullableString = (value: unknown) => {
  const nextValue = String(value ?? "").trim();
  return nextValue || null;
};

export const getStringValue = (value: unknown) => String(value ?? "").trim();

export const truncateFieldValue =
  (maxLength: number) =>
  (value: unknown): unknown => {
    if (value == null || value === "") return value;
    return String(value).slice(0, maxLength);
  };

export const getNumberOrNull = (value: unknown) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null;
};

export const getNumberOrZero = (value: unknown) => getNumberOrNull(value) ?? 0;

/** Backend uses {@link PartnerData.source} === 1 for verified rows; the list treats that as read-only only for roster rows loaded from the server, not modal saves this session. */
export const isPartnerSourceLocked = (partner?: PartnerData | null) =>
  Number(partner?.source) === 1 && partner?.managedInSession !== true;

/** True when this partner is the license owner (UI sets boolean; API may use 1). */
export const partnerIsLicenseOwner = (partner: { isOwner?: unknown }): boolean =>
  partner.isOwner === true || Number(partner.isOwner) === 1;

const normalizePartnerId = (value: unknown): string => String(value ?? "").trim();

export const normalizeOwnerPartnerIds = (
  ids: unknown[],
  maxCount = LICENSE_OWNER_MAX_COUNT,
): string[] => {
  const uniqueIds = new Set<string>();

  ids.forEach((id) => {
    const normalizedId = normalizePartnerId(id);
    if (!normalizedId || uniqueIds.has(normalizedId)) return;
    uniqueIds.add(normalizedId);
  });

  return Array.from(uniqueIds).slice(0, maxCount);
};

export const collectLicenseOwnerPartnerIds = (
  partners: { id?: unknown; isOwner?: unknown }[],
): string[] => {
  const ownerIds: string[] = [];

  partners.forEach((partner) => {
    if (!partnerIsLicenseOwner(partner)) return;
    const normalizedId = normalizePartnerId(partner.id);
    if (!normalizedId) return;
    ownerIds.push(normalizedId);
  });

  return normalizeOwnerPartnerIds(ownerIds, Number.POSITIVE_INFINITY);
};

/** Individual partner ID for list subtitles (Emirates ID, UID, or passport — first available). */
export const getPartnerIndividualIdentifier = (partner: PartnerData): string =>
  getStringValue(
    partner.emiratesId ||
      partner.uaeNumber ||
      partner.uidNumber ||
      partner.passportNumber,
  );

/**
 * License-owner picker card subtitle:
 * Company → `Company | {nationality}`; Individual → `Individual | {id} | {nationality}`.
 */
export const formatPartnerLicenseOwnerListSubtitle = (
  partner: PartnerData,
  labels: { company: string; individual: string },
): string => {
  const nationality = (partner.nationalityName ?? "").trim() || "-";
  const code = String(partner.partnerTypeCode ?? "");

  if (code === "1") {
    return [labels.company, nationality].join(" | ");
  }

  if (code === "2") {
    const id = getPartnerIndividualIdentifier(partner) || "-";
    return [labels.individual, id, nationality].join(" | ");
  }

  return partner.partnerTypeName ?? "";
};

/**
 * Shapes rows from GetUserEstablishmentByID (`partnersInfo`, legacy `partners`) into
 * {@link PartnerData} fields used by Partner List / modals (`partnerTypeCode`,
 * full names, avatar URL aliases).
 *
 * Prefer merging with `partnersInfo` spread last so it wins over sparse `partners`,
 * then run this mapper on the merged object.
 */
export const normalizeEstablishmentPartnersApiRow = (
  row: Record<string, unknown>,
): PartnerData => {
  const id =
    row.id !== undefined && row.id !== null ? String(row.id) : undefined;
  const fromCode = getStringValue(row.partnerTypeCode);
  const fromLegacyType =
    row.partnerType !== undefined && row.partnerType !== null && String(row.partnerType) !== ""
      ? String(row.partnerType)
      : "";
  const partnerTypeCode = fromCode || fromLegacyType || "";
  const nameFallback = getStringValue(row.partnerName ?? row.name);
  const fullNameEn =
    getStringValue(row.fullNameEn) ||
    nameFallback ||
    "";
  const fullNameAr =
    getStringValue(row.fullNameAr) ||
    nameFallback ||
    "";
  const personalPhotoMerged = getStringValue(
    row.personalPhotoUrl ?? row.partnerPhotoUrl,
  );
  const verificationMethodRaw =
    row.verificationMethodCode ?? row.verificationMethod;

  return {
    ...(row as unknown as PartnerData),
    id,
    partnerTypeCode,
    fullNameEn,
    fullNameAr,
    representativeNameEn: getNullableString(row.representativeNameEn),
    representativeNameAr: getNullableString(row.representativeNameAr),
    representativeEmiratesId: getNullableString(row.representativeEmiratesId),
    personalPhotoUrl: personalPhotoMerged || undefined,
    verificationMethodCode: verificationMethodRaw
      ? String(verificationMethodRaw)
      : undefined,
    verificationMethod: verificationMethodRaw
      ? String(verificationMethodRaw)
      : undefined,
  };
};

const moePartnerArrayAliases = [
  "partners",
  "partnersInfo",
  "partnerList",
  "partnerInfoList",
  "shareholders",
  "owners",
];

const buildPartnerMergeKey = (partner: PartnerData): string => {
  const id = getStringValue(partner.id);
  if (id) return `id:${id}`;

  const identifier = getStringValue(
    partner.emiratesId ||
      partner.uaeNumber ||
      partner.uidNumber ||
      partner.passportNumber,
  ).toLowerCase();
  const fullName = getStringValue(
    partner.fullNameEn || partner.fullNameAr,
  ).toLowerCase();
  const partnerTypeCode = getStringValue(partner.partnerTypeCode).toLowerCase();

  if (identifier) {
    return `identifier:${partnerTypeCode}|${identifier}`;
  }
  if (fullName) {
    return `name:${partnerTypeCode}|${fullName}`;
  }
  return "";
};

/**
 * Extracts partner-like arrays from MOE GetLicenseDetails payloads. The upstream schema
 * is inconsistent, so scan likely containers and aliases rather than assuming one shape.
 */
export function extractMoePartnerRows(responseBody: unknown): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const visited = new Set<unknown>();
  const queue: unknown[] = [];

  const pushCandidate = (candidate: unknown) => {
    if (!candidate || visited.has(candidate)) return;
    visited.add(candidate);
    queue.push(candidate);
  };

  pushCandidate(responseBody);
  if (isPlainObject(responseBody) && isPlainObject(responseBody.data)) {
    pushCandidate(responseBody.data);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!isPlainObject(current)) continue;

    for (const alias of moePartnerArrayAliases) {
      const value = current[alias];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (isPlainObject(item)) {
            rows.push(item);
          }
        });
      }
    }

    Object.values(current).forEach((value) => {
      if (isPlainObject(value)) {
        pushCandidate(value);
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (isPlainObject(item)) {
            pushCandidate(item);
          }
        });
      }
    });
  }

  return rows;
}

/**
 * Appends new partner rows while avoiding duplicates across repeated MOE lookups
 * or existing locally-added partners.
 */
export function mergePartnerLists(
  currentPartners: PartnerData[],
  incomingPartners: PartnerData[],
): PartnerData[] {
  if (incomingPartners.length === 0) return currentPartners;

  const merged = [...currentPartners];
  const knownKeys = new Set(
    currentPartners
      .map(buildPartnerMergeKey)
      .filter((key) => key.length > 0),
  );

  incomingPartners.forEach((partner) => {
    const key = buildPartnerMergeKey(partner);
    if (key && knownKeys.has(key)) {
      return;
    }
    merged.push(partner);
    if (key) {
      knownKeys.add(key);
    }
  });

  return merged;
}

/** Unwraps a partner entity from AddPatner / UpdatePatner–style API payloads. */
export const pickPartnerRecordFromMutationResponse = (
  payload: unknown,
): Record<string, unknown> | null => {
  if (!payload || typeof payload !== "object") return null;
  const top = payload as Record<string, unknown>;
  const nested = top.data;
  if (isPlainObject(nested)) {
    if (
      nested.id !== undefined ||
      nested.partnerTypeCode !== undefined ||
      nested.fullNameEn !== undefined
    ) {
      return nested;
    }
  }
  if (
    top.id !== undefined ||
    top.partnerTypeCode !== undefined ||
    top.fullNameEn !== undefined
  ) {
    return top;
  }
  return null;
};

export const mapPartnerToApiPartner = (partner: PartnerData): PartnerParams => ({
  source: getNumberOrZero(partner.source),
  isOwner: partnerIsLicenseOwner(partner),
  partnerTypeCode: getStringValue(partner.partnerTypeCode),
  dateBirth: formatApiDate(partner.dateBirth || partner.dateOfBirth),
  emiratesId: getStringValue(partner.emiratesId),
  fullNameAr: getStringValue(partner.fullNameAr),
  fullNameEn: getStringValue(partner.fullNameEn),
  nationalityId: getNumberOrZero(partner.nationalityId),
  genderId: getNumberOrZero(partner.genderId || partner.gender),
  expiryDate: formatApiDate(partner.expiryDate),
  occupation: getStringValue(partner.occupation),
  personalPhotoUrl: getStringValue(partner.personalPhotoUrl),
  passportUrl: getStringValue(partner.passportUrl),
  visaUrl: getStringValue(partner.visaUrl),
  emiratesIdUrl: getStringValue(partner.emiratesIdUrl || partner.emiratesIdurl),
  verificationMethodCode: getStringValue(
    partner.verificationMethodCode || partner.verificationMethod,
  ),
  uaeNumber: getStringValue(partner.uaeNumber || partner.uidNumber),
  passportExpiryDate: formatApiDate(partner.passportExpiryDate),
  visaExpiryDate: formatApiDate(partner.visaExpiryDate),
  passportNumber: getNullableString(partner.passportNumber),
  passportScanUrl: getStringValue(partner.passportScanUrl),
  memorandumOfAssociationUrl: getStringValue(partner.memorandumOfAssociationUrl),
  powerOfAttorneyUrl: getStringValue(partner.powerOfAttorneyUrl),
  statementUrl: getStringValue(partner.statementUrl),
  representativeNameEn:
    partner.partnerTypeCode === "1" ? getNullableString(partner.representativeNameEn) : null,
  representativeNameAr:
    partner.partnerTypeCode === "1" ? getNullableString(partner.representativeNameAr) : null,
  representativeEmiratesId:
    partner.partnerTypeCode === "1" ? getNullableString(partner.representativeEmiratesId) : null,
});

export const normalizeUserTypeOption = (item: Partial<TypeDictionary>) => {
  const rawId = item.id ?? Number(item.code);
  return {
    ...item,
    id: Number.isFinite(Number(rawId)) ? Number(rawId) : 0,
    code: String(item.code ?? rawId ?? ""),
    scope: item.scope ?? "",
    nameEn: item.nameEn ?? "",
    nameAr: item.nameAr ?? "",
    isShown: item.isShown ?? true,
    descAr: item.descAr ?? null,
    descEn: item.descEn ?? null,
  };
};

export const coalesceEstablishmentAddressId = (
  legalRaw: string | number | null | undefined,
  establishmentRaw: string | number | null | undefined,
): number | undefined => {
  const parse = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const n =
      typeof v === "string" ? parseInt(v.trim(), 10) : Number(v);
    if (!Number.isFinite(n) || Number.isNaN(n)) return undefined;
    return n;
  };
  return parse(legalRaw) ?? parse(establishmentRaw);
};

export const pickEstablishmentWorkEmail = (
  data: Record<string, unknown>,
): string | undefined => {
  const direct = data.workEmail ?? data.email;
  if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
    return String(direct).trim();
  }
  const emails = data.emails;
  if (typeof emails === "string" && emails.trim() !== "") return emails.trim();
  if (Array.isArray(emails) && emails.length > 0) {
    const first = emails[0] as unknown;
    if (typeof first === "string" && first.trim() !== "") return first.trim();
    if (
      isPlainObject(first) &&
      first.email != null &&
      String(first.email).trim() !== ""
    ) {
      return String(first.email).trim();
    }
  }
  return undefined;
};

export const disableTodayAndPastDate = (current?: Moment) =>
  current && current < moment().endOf("day");

export const pickEstablishmentProfileId = (
  data: Record<string, unknown>,
): number | null => {
  const raw =
    data.userProfileId ??
    data.userProfileID ??
    data.proFileId ??
    data.profielId ??
    data.id;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "string" ? parseInt(raw.trim(), 10) : Number(raw);
  return Number.isFinite(n) ? n : null;
};

/**
 * Declarative API-key-to-form-field mapping.
 * Each entry: [formFieldName, [...apiKeysByPriority]]
 * The first matching api key with a non-null/undefined value wins.
 * Special fields (workEmail, address ids, documents) are handled separately
 * by their own helpers (pickEstablishmentWorkEmail, coalesceEstablishmentAddressId, etc.).
 */
export const ESTABLISHMENT_FIELD_MAP: [string, string[]][] = [
  ["establishmentSubType",     ["establishmentTypeId"]],
  ["licenseNumber",            ["licenseNumber", "commerceLicenseNumber"]],
  ["licenseExpiryDate",        ["licenseExpiryDate"]],
  ["establishmentNameArabic",  ["nameAr", "establishmentNameAr"]],
  ["establishmentNameEnglish", ["nameEn", "establishmentNameEn"]],
  ["tenancyContractEndDate",   ["tenancyContractEndDate"]],
  ["legalPerson",              ["name"]],
  ["contactNumber",            ["personalMobile"]],
  ["idType",                   ["idTypeCode", "idType"]],
  ["emiratesId",               ["emiratesId"]],
  ["dateOfBirth",              ["dateBirth"]],
  ["personalEmail",            ["personalEmail"]],
  ["passportNumber",           ["passportNumber"]],
  ["uid",                      ["uid"]],
  ["emirate",                  ["establishmentEmirateId"]],
  ["phoneNumber",              ["establishmentMobile", "phoneNumber"]],
  ["licensingAuthority",       ["authorityId", "licensingAuthorityId"]],
  ["street",                   ["street"]],
];

/**
 * Maps raw API data to flat form field values using ESTABLISHMENT_FIELD_MAP.
 * Date fields (licenseExpiryDate, tenancyContractEndDate, dateOfBirth) are
 * returned as raw strings — the caller is responsible for converting to moment.
 * workEmail, address ids, and document URLs have dedicated helpers.
 */
export const mapEstablishmentDataToForm = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [formKey, apiKeys] of ESTABLISHMENT_FIELD_MAP) {
    for (const apiKey of apiKeys) {
      if (data[apiKey] !== undefined && data[apiKey] !== null) {
        result[formKey] = data[apiKey];
        break;
      }
    }
  }

  if (result.licenseNumber != null && result.licenseNumber !== "") {
    result.licenseNumber = String(result.licenseNumber).slice(
      0,
      COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH,
    );
  }
  if (
    result.establishmentNameArabic != null &&
    result.establishmentNameArabic !== ""
  ) {
    result.establishmentNameArabic = String(result.establishmentNameArabic).slice(
      0,
      ESTABLISHMENT_NAME_MAX_LENGTH,
    );
  }
  if (
    result.establishmentNameEnglish != null &&
    result.establishmentNameEnglish !== ""
  ) {
    result.establishmentNameEnglish = String(
      result.establishmentNameEnglish,
    ).slice(0, ESTABLISHMENT_NAME_MAX_LENGTH);
  }

  return result;
};

const resolveLegacyPhoneParts = (
  countryCode: unknown,
  localNumber: unknown,
  legacyNumber: unknown,
) => {
  const normalizedCountryCode = String(countryCode ?? "").trim();
  const normalizedLocalNumber = String(localNumber ?? "").trim();
  const normalizedLegacyNumber = String(legacyNumber ?? "").trim();

  return {
    countryCode: normalizedCountryCode,
    phoneNumber: normalizedLocalNumber || normalizedLegacyNumber,
  };
};

export const toForm = (
  data: UserEstablishmentProfile,
): EstablishmentFormValues => {
  const { phoneNumber, phoneCountryCode, phoneLocalNumber } = data;
  const establishmentMobileParts = resolveLegacyPhoneParts(
    phoneCountryCode,
    phoneLocalNumber,
    data.establishmentMobile || phoneNumber,
  );

  return {
    ...mapEstablishmentDataToForm(data),
    establishmentMobile: {
      phoneCountryCode: establishmentMobileParts.countryCode,
      phoneLocalNumber: establishmentMobileParts.phoneNumber,
    },
  };
};

/**
 * Merges data from multiple sources into a single record.
 * Lower priority number = higher precedence (its values win).
 * Sources are sorted by priority ascending, then merged left-to-right
 * so the lowest-priority-number source wins on conflict.
 */
export const mergeEstablishmentDataSources = (
  sources: { priority: number; data: Record<string, unknown> | null }[],
): Record<string, unknown> => {
  const sorted = [...sources].sort((a, b) => a.priority - b.priority);
  const merged: Record<string, unknown> = {};
  for (const source of sorted) {
    if (!source.data) continue;
    for (const [key, value] of Object.entries(source.data)) {
      if (value !== undefined && value !== null && !(key in merged)) {
        merged[key] = value;
      }
    }
  }
  return merged;
};

const normalizeEstablishmentStatusName = (raw: string) =>
  raw.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Reads `status` / optional nested status object only (no top-level `statusCode`).
 * @internal — use `pickEstablishmentApiStatusFields` for full resolution.
 */
function pickEstablishmentStatusFromStatusProperty(
  payload: Record<string, unknown>,
): { statusCode: string | null; statusName: string | null } {
  const raw = payload.status;

  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return { statusCode: null, statusName: null };
    if (/^[0-9]+$/.test(t)) return { statusCode: t, statusName: null };
    return { statusCode: null, statusName: t };
  }

  if (isPlainObject(raw)) {
    const codeRaw = raw.code;
    const codeStr =
      codeRaw !== undefined && codeRaw !== null && String(codeRaw).trim() !== ""
        ? String(codeRaw).trim()
        : null;
    const nameCandidate =
      (typeof raw.name === "string" && raw.name.trim()) ||
      (typeof raw.nameEn === "string" && raw.nameEn.trim()) ||
      (typeof raw.nameAr === "string" && raw.nameAr.trim()) ||
      null;
    return { statusCode: codeStr, statusName: nameCandidate };
  }

  for (const key of ["establishmentStatus", "profileStatus", "establishmentProfileStatus"]) {
    const v = payload[key];
    if (typeof v === "string" && v.trim()) {
      return { statusCode: null, statusName: v.trim() };
    }
  }

  return { statusCode: null, statusName: null };
}

/**
 * Normalizes establishment `status` from GetUserEstablishmentByID payloads:
 * - `status` may be a plain string (e.g. `"Expired"`, `"Under Review"`)
 * - or an object `{ code, name?, nameEn?, nameAr? }`
 * - List/grid items may also expose a top-level `statusCode` — it wins over `status` when both exist.
 */
export function pickEstablishmentApiStatusFields(
  payload: Record<string, unknown> | null | undefined,
): { statusCode: string | null; statusName: string | null } {
  if (!payload || typeof payload !== "object") {
    return { statusCode: null, statusName: null };
  }

  const topLevelRaw = payload.statusCode;
  const topLevelCode =
    topLevelRaw !== undefined &&
    topLevelRaw !== null &&
    String(topLevelRaw).trim() !== ""
      ? String(topLevelRaw).trim()
      : null;

  const inner = pickEstablishmentStatusFromStatusProperty(payload);
  return { statusCode: topLevelCode ?? inner.statusCode, statusName: inner.statusName };
}

/**
 * Maps API establishment `status` to UI page mode.
 * Matches English labels and common variants (see `normalizeEstablishmentStatusName`).
 * (Exact `IsExpiredDays`-based `expiringSoon` / `expired` refinement for **`approved`**
 * lives in **`getEstablishmentPageMode`** + **`refineEstablishmentApprovedPageModeByIsExpiredDays`**.)
 */
function mapEstablishmentPageModeFromApiStatusName(
  raw?: string | null,
): EstablishmentPageMode | null {
  if (raw == null || String(raw).trim() === "") return null;
  const nameStr = String(raw).trim();

  const n = normalizeEstablishmentStatusName(nameStr);
  if (n.includes("pending completion")) return "pendingCompletion";
  if (n.includes("under review") || n === "pending") return "underReview";
  if (n.includes("suspend")) return "suspended";
  if (n.includes("reject")) return "rejected";
  if (
    n.includes("expiring soon") ||
    n.includes("expire soon") ||
    n.includes("expire-soon") ||
    n.includes("expiringsoon")
  ) {
    return "expiringSoon";
  }
  if (n.includes("inactive")) return null;
  if (n === "expired" || n.startsWith("expired ") || /\bexpired\b/.test(n)) return "expired";
  if (n.includes("approved") || n === "active") return "approved";
  return null;
}

/**
 * Establishment profile is read-only for **Pending review**, **Approved**, and
 * **Suspended** page modes. Rejected, expired, expiring-soon, and pending-completion
 * flows stay editable (subject to `canEditField` rules).
 */
export function isEstablishmentProfileLocked(params: {
  mode: string | null;
  pageMode: EstablishmentPageMode;
}): boolean {
  if (params.mode === "add") return false;
  return (
    params.pageMode === "underReview" ||
    params.pageMode === "approved" ||
    params.pageMode === "suspended"
  );
}

/**
 * Partner list — Set/Change License Owner actions (product rules).
 * License owner may only be set or changed in **Draft (add)** and **Rejected** page modes.
 * Hidden for **Under review**, **Approved**, **Expired**, and **Expiring soon**.
 */
export function shouldShowLicenseOwnerActions(params: {
  partnersLength: number;
  pageMode: EstablishmentPageMode;
  isLicenseOwnerApplicableSubType: boolean;
}): boolean {
  if (!params.isLicenseOwnerApplicableSubType) return false;
  if (params.partnersLength === 0) return false;
  const { pageMode } = params;
  return (
    pageMode === "add" ||
    pageMode === "rejected" ||
    pageMode === "pendingCompletion"
  );
}

/**
 * Partner list card actions: **Delete + Edit** only while creating (`add`) or fixing a **rejected** profile.
 * Other page modes (under review, approved, expired, expiring soon) and pulled/API partners show **Details** only.
 */
export function partnerListShowsDeleteAndEdit(params: {
  pageMode: EstablishmentPageMode;
  isEstablishmentReadOnly: boolean;
}): boolean {
  if (params.isEstablishmentReadOnly) return false;
  return (
    params.pageMode === "add" ||
    params.pageMode === "rejected" ||
    params.pageMode === "pendingCompletion"
  );
}

export const countLicenseOwners = (
  partners: { isOwner?: unknown }[],
): number => partners.filter(partnerIsLicenseOwner).length;

/** Reads establishment expiry-state days directly from API `IsExpiredDays`. */
export function establishmentProfileIsExpiredDays(
  establishment:
    | {
        IsExpiredDays?: string | number | null;
        isExpiredDays?: string | number | null;
      }
    | null
    | undefined,
): number | null {
  return getIsExpiredDaysFromSource(establishment);
}

/**
 * For API states that normalize to **`approved`**, refine using `IsExpiredDays`:
 * negative ⇒ `expired`; `0..30` ⇒ `expiringSoon`.
 */
export function refineEstablishmentApprovedPageModeByIsExpiredDays(
  pageMode: EstablishmentPageMode,
  establishment:
    | {
        IsExpiredDays?: string | number | null;
        isExpiredDays?: string | number | null;
      }
    | null
    | undefined,
  options?: {
    allowExpired?: boolean;
  },
): EstablishmentPageMode {
  if (pageMode !== "approved") return pageMode;

  const expiryState = getExpiryStateFromIsExpiredDays(
    establishmentProfileIsExpiredDays(establishment),
  );
  if (expiryState === null) return pageMode;
  if (expiryState === "expired") {
    return options?.allowExpired === false ? "approved" : "expired";
  }
  if (expiryState === "expiringSoon") return "expiringSoon";
  return "approved";
}

/** `pageMode` query values permitted when linking from My Account Details (`add` is invalid here). */
export const ESTABLISHMENT_PROFILE_DETAIL_URL_PAGE_MODES: Exclude<
  EstablishmentPageMode,
  "add"
>[] = [
  "pendingCompletion",
  "underReview",
  "rejected",
  "expired",
  "expiringSoon",
  "suspended",
  "approved",
];

/**
 * Deep-link query `isGethirdPartyApi` from My Account → Establishment Profile Details.
 * Uses `URLSearchParams.has` so `?isGethirdPartyApi=null` is distinct from omitting the param.
 */
export function parseIsGethirdPartyApiQueryParam(
  searchParams: URLSearchParams,
): boolean | null | undefined {
  if (!searchParams.has("isGethirdPartyApi")) return undefined;
  const raw = searchParams.get("isGethirdPartyApi");
  const s =
    raw === null || raw === undefined ? "" : String(raw).trim().toLowerCase();
  if (s === "" || s === "null") return null;
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return undefined;
}

/**
 * Serialize list/card `isGethirdPartyApi` for URL.
 * `null` becomes the literal `null` in the query string; omit the param when unknown.
 */
export function formatIsGethirdPartyApiQueryParam(value: unknown): string | undefined {
  if (value === true) return "true";
  if (value === false) return "false";
  if (value === null) return "null";
  return undefined;
}


export function parseEstablishmentProfileDetailUrlPageMode(
  raw: string | null | undefined,
): EstablishmentPageMode | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().replace(/-/g, "").toLowerCase();
  const alias: Record<string, EstablishmentPageMode> = {
    pendingcompletion: "pendingCompletion",
    underreview: "underReview",
    rejected: "rejected",
    expired: "expired",
    expiringsoon: "expiringSoon",
    suspended: "suspended",
    approved: "approved",
  };
  const v = alias[key];
  if (
    !v ||
    !ESTABLISHMENT_PROFILE_DETAIL_URL_PAGE_MODES.includes(
      v as (typeof ESTABLISHMENT_PROFILE_DETAIL_URL_PAGE_MODES)[number],
    )
  ) {
    return null;
  }
  return v;
}

function resolveEstablishmentCardStatusKey(
  establishment: Record<string, unknown>,
): "underReview" | "pending" | "pendingCompletion" | "rejected" | "expired" | "suspended" | "approved" | null {
  const rawStatus = establishment.status;
  const topLevelCode =
    establishment.statusCode !== undefined &&
    establishment.statusCode !== null &&
    String(establishment.statusCode).trim() !== ""
      ? String(establishment.statusCode).trim()
      : "";
  const topLevelNameEn = String(
    establishment.statusNameEn ?? establishment.statusName ?? "",
  ).trim();
  const topLevelNameAr = String(establishment.statusNameAr ?? "").trim();
  const fallbackName = String(
    establishment.establishmentStatus ??
      establishment.profileStatus ??
      establishment.establishmentProfileStatus ??
      "",
  ).trim();

  let code = topLevelCode;
  let rawName = fallbackName;
  let nameEn = topLevelNameEn;
  let nameAr = topLevelNameAr;

  if (isPlainObject(rawStatus)) {
    code = String(rawStatus.code ?? topLevelCode).trim();
    nameEn = String(rawStatus.nameEn ?? rawStatus.name ?? topLevelNameEn).trim();
    nameAr = String(rawStatus.nameAr ?? topLevelNameAr).trim();
    rawName = String(
      rawStatus.name ?? rawStatus.nameEn ?? rawStatus.nameAr ?? fallbackName,
    ).trim();
  } else if (rawStatus !== undefined && rawStatus !== null) {
    const normalizedStatus = String(rawStatus).trim();
    if (normalizedStatus) {
      if (/^\d+$/.test(normalizedStatus)) {
        code = normalizedStatus;
      } else {
        rawName = normalizedStatus;
        nameEn = topLevelNameEn || normalizedStatus;
      }
    }
  }

  const normalizedCandidates = new Set(
    [nameEn, nameAr, rawName]
      .map((item) => normalizeEstablishmentStatusName(String(item ?? "")))
      .filter(Boolean),
  );
  const matches = (value: string) =>
    normalizedCandidates.has(normalizeEstablishmentStatusName(value));

  if (code === "1") return "pendingCompletion";
  if (code === "2") return "underReview";
  if (code === "3") return "approved";
  if (code === "4") return "rejected";
  if (code === "5") return "expired";
  if (code === "6") return "suspended";

  if (matches("Pending Completion")) return "pendingCompletion";
  if (matches("Under Review")) return "underReview";
  if (matches("Pending")) return "pending";
  if (matches("Rejected")) return "rejected";
  if (matches("Expired")) return "expired";
  if (matches("Suspended")) return "suspended";
  if (matches("Approved") || matches("Active")) return "approved";

  return null;
}

export function getEstablishmentCardDetailsPageMode(
  establishment: Record<string, unknown>,
): EstablishmentPageMode {
  const { statusCode, statusName } = pickEstablishmentApiStatusFields(establishment);
  const cardStatusKey = resolveEstablishmentCardStatusKey(establishment);

  if (cardStatusKey === "approved") {
    return refineEstablishmentApprovedPageModeByIsExpiredDays("approved", establishment, {
      allowExpired: false,
    });
  }

  const pageMode = getEstablishmentPageMode({
    mode: "edit",
    statusCode,
    statusName,
    establishment,
  });

  return refineEstablishmentApprovedPageModeByIsExpiredDays(pageMode, establishment, {
    allowExpired: false,
  });
}

export const getEstablishmentPageMode = (params: {
  mode: string | null;
  statusCode?: string | null;
  statusName?: string | null;
  establishment?:
    | {
        IsExpiredDays?: string | number | null;
        isExpiredDays?: string | number | null;
      }
    | null
    | undefined;
}): EstablishmentPageMode => {
  if (params.mode === "add") return "add";

  const code = (params.statusCode ?? "").trim();

  if (code === ESTABLISHMENT_STATUS.PENDING_COMPLETION) {
    return "pendingCompletion";
  }
  if (code === ESTABLISHMENT_STATUS.UNDER_REVIEW) return "underReview";
  if (code === ESTABLISHMENT_STATUS.APPROVED) {
    return refineEstablishmentApprovedPageModeByIsExpiredDays(
      "approved",
      params.establishment,
    );
  }
  if (code === ESTABLISHMENT_STATUS.REJECTED) return "rejected";
  if (code === ESTABLISHMENT_STATUS.EXPIRED) return "expired";
  if (code === ESTABLISHMENT_STATUS.SUSPENDED) return "suspended";

  const fromName = mapEstablishmentPageModeFromApiStatusName(params.statusName);
  if (fromName) {
    return refineEstablishmentApprovedPageModeByIsExpiredDays(
      fromName,
      params.establishment,
    );
  }

  return "underReview";
};

export function resolveEstablishmentProfilePageMode(params: {
  mode: string | null;
  establishmentId: string | null;
  pageModeSearchParam: string | null | undefined;
  statusCode: string | null;
  statusName: string | null;
  establishment?:
    | {
        IsExpiredDays?: string | number | null;
        isExpiredDays?: string | number | null;
      }
    | null
    | undefined;
}): EstablishmentPageMode {
  const resolved = getEstablishmentPageMode({
    mode: params.mode,
    statusCode: params.statusCode,
    statusName: params.statusName,
    establishment: params.establishment,
  });
  const fromLink = parseEstablishmentProfileDetailUrlPageMode(
    params.pageModeSearchParam ?? null,
  );
  const hasLoadedStatus =
    String(params.statusCode ?? "").trim() !== "" ||
    String(params.statusName ?? "").trim() !== "";

  if (!hasLoadedStatus) {
    return fromLink && params.mode !== "add" && params.establishmentId
      ? fromLink
      : resolved;
  }

  return resolved;
}

/** `/api/Moe/GetLicenseDetails` — `licenseInfo.licenseDetails` (names vary by MOE schema). */
export type MoeLicenseDetails = {
  licenseERN?: string | null;
  licenseURN?: string | null;
  bnRegNameAr?: string | null;
  bnRegNameEn?: string | null;
  licenseNameAR?: string | null;
  licenseNameEN?: string | null;
  licenseExpirationDate?: string | null;
  licenseExpiryDate?: string | null;
  licenseOfficialEmail?: string | null;
  countryCode?: string | null;
  licenseMobPhoneNo?: string | null;
  licensePhoneNo?: string | null;
  licenseMobileNo?: string | null;
  licenseAddrEmirate?: string | number | null;
  licenseAddrStreet?: string | null;
  tenancyContractEndDate?: string | null;
  licenseTenancyEndDate?: string | null;
};

/**
 * Reads `licenseDetails` from an unwrapped axios body (see `request` interceptor)
 * or from a nested `{ data: { ... } }` envelope.
 */
export function extractMoeLicenseDetails(
  responseBody: unknown,
): Record<string, unknown> | null {
  const roots: unknown[] = [];
  if (isPlainObject(responseBody)) roots.push(responseBody);
  if (isPlainObject(responseBody) && isPlainObject(responseBody.data)) {
    roots.push(responseBody.data);
  }

  for (const root of roots) {
    if (!isPlainObject(root)) continue;
    const block = root.getLicenseDetails_Response;
    if (!isPlainObject(block)) continue;
    const licenseInfo = block.licenseInfo;
    if (!isPlainObject(licenseInfo)) continue;
    const details = licenseInfo.licenseDetails;
    if (isPlainObject(details)) return details;
  }
  return null;
}

const hasNonEmptyString = (v: unknown): boolean =>
  v != null && String(v).trim() !== "";

const normalizeDetailKey = (k: string) => k.replace(/_/g, "").toLowerCase();
const UAE_PHONE_COUNTRY_CODE = "+971";
const UAE_PHONE_COUNTRY_CODE_ALIASES = new Set([
  UAE_PHONE_COUNTRY_CODE,
  "971",
  "0971",
  "00971",
]);
const UAE_PHONE_PREFIX_PATTERN = /^(?:00971|0971|971)/;

const normalizeMoePhoneParts = (
  phoneNumber: string,
  countryCode: unknown,
): EstablishmentPhoneValue | null => {
  const formattedPhoneNumber = formatPhoneNumberFromSource(phoneNumber);
  if (!formattedPhoneNumber) return null;

  const phoneNumberDigits = formattedPhoneNumber.replace(/\D/g, "");
  const rawCountryCode = String(countryCode ?? "").trim();
  const normalizedRawCountryCode = UAE_PHONE_COUNTRY_CODE_ALIASES.has(
    rawCountryCode,
  )
    ? UAE_PHONE_COUNTRY_CODE
    : rawCountryCode;
  const hasSupportedExplicitCountryCode = Boolean(
    findCountryDialCodeOption(normalizedRawCountryCode),
  );
  const explicitCountryCode = hasSupportedExplicitCountryCode
    ? normalizedRawCountryCode
    : UAE_PHONE_COUNTRY_CODE;
  const internationalParts = formattedPhoneNumber.startsWith("+")
    ? splitInternationalMobileNumber(formattedPhoneNumber, "")
    : null;
  const internationalCountryCode = internationalParts?.countryCode || "";
  const hasLegacyUaePrefix =
    !internationalCountryCode &&
    !formattedPhoneNumber.startsWith("+") &&
    UAE_PHONE_PREFIX_PATTERN.test(phoneNumberDigits);

  let phoneCountryCode = explicitCountryCode;
  let phoneLocalNumber = formattedPhoneNumber;

  if (internationalCountryCode) {
    if (
      !rawCountryCode ||
      explicitCountryCode === internationalCountryCode
    ) {
      phoneCountryCode = internationalCountryCode;
      phoneLocalNumber = internationalParts?.phoneNumber ?? "";
    }
  } else if (
    hasLegacyUaePrefix &&
    (!hasSupportedExplicitCountryCode ||
      explicitCountryCode === UAE_PHONE_COUNTRY_CODE)
  ) {
    phoneCountryCode = UAE_PHONE_COUNTRY_CODE;
    phoneLocalNumber = phoneNumberDigits.replace(UAE_PHONE_PREFIX_PATTERN, "");
  }

  if (phoneCountryCode === UAE_PHONE_COUNTRY_CODE) {
    phoneLocalNumber = phoneLocalNumber.replace(/^0/, "");
  }

  if (!phoneLocalNumber) return null;

  return {
    phoneCountryCode,
    phoneLocalNumber,
  };
};

/**
 * Resolves MOE/API fields whether JSON uses camelCase, PascalCase, or snake_case keys.
 */
function pickMoeLicenseScalar(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  const wanted = new Set(aliases.map((a) => normalizeDetailKey(a)));
  for (const [key, val] of Object.entries(row)) {
    if (wanted.has(normalizeDetailKey(key))) return val;
  }
  return undefined;
}

/** Some payloads nest the scalar fields under `licenseDetails` twice; merge for lookups. */
function flattenMoeLicenseDetailsRow(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const inner =
    (isPlainObject(details.licenseDetails) && details.licenseDetails) ||
    (isPlainObject(details.LicenseDetails) && details.LicenseDetails) ||
    null;
  if (inner && isPlainObject(inner)) {
    return { ...details, ...inner };
  }
  return details;
}

/**
 * Maps MOE `licenseDetails` into Establishment Profile field keys and records which
 * API-backed values should become read-only.
 * Does **not** map commercial license number (user-entered / lookup trigger).
 * Maps `licenseExpirationDate` (and aliases) to `licenseExpiryDate` when present (user can still edit in add mode).
 * Maps `tenancyContractEndDate` (and aliases) when present; field becomes read-only in the form.
 * Does **not** map `licenseAddrEmirate` to **Address Information** `addressEmirate` — emirate must be chosen manually.
 * Maps `licenseAddrStreet` to `street` when present; the field remains editable.
 */
export function mapMoeLicenseDetailsToFormValues(
  details: Record<string, unknown>,
): {
  values: Record<string, unknown>;
  readOnlyFields: string[];
} {
  const values: Record<string, unknown> = {};
  const readOnlyFields: string[] = [];

  const row = flattenMoeLicenseDetailsRow(details);

  const nameAr = pickMoeLicenseScalar(row, [
    "bnRegNameAr",
    "BnRegNameAr",
    "licenseNameAR",
    "LicenseNameAR",
    "licenseNameAr",
    "establishmentNameArabic",
  ]);
  if (hasNonEmptyString(nameAr)) {
    values.establishmentNameArabic = String(nameAr)
      .trim()
      .slice(0, ESTABLISHMENT_NAME_MAX_LENGTH);
    readOnlyFields.push("establishmentNameArabic");
  }

  const nameEn = pickMoeLicenseScalar(row, [
    "bnRegNameEn",
    "BnRegNameEn",
    "licenseNameEN",
    "LicenseNameEN",
    "licenseNameEn",
    "establishmentNameEnglish",
  ]);
  if (hasNonEmptyString(nameEn)) {
    values.establishmentNameEnglish = String(nameEn)
      .trim()
      .slice(0, ESTABLISHMENT_NAME_MAX_LENGTH);
    readOnlyFields.push("establishmentNameEnglish");
  }

  const email = pickMoeLicenseScalar(row, [
    "licenseOfficialEmail",
    "LicenseOfficialEmail",
    "officialEmail",
    "OfficialEmail",
  ]);
  if (hasNonEmptyString(email)) {
    values.workEmail = String(email).trim();
    readOnlyFields.push("workEmail");
  }

  const phoneCandidates = [
    pickMoeLicenseScalar(row, [
      "licenseMobPhoneNo",
      "LicenseMobPhoneNo",
    ]),
    pickMoeLicenseScalar(row, ["licensePhoneNo", "LicensePhoneNo"]),
    pickMoeLicenseScalar(row, [
      "licenseMobileNo",
      "LicenseMobileNo",
      "mobileNo",
      "MobileNo",
      "establishmentMobile",
    ]),
  ];
  const hasMoePhoneSource = phoneCandidates.some(
    (candidate) => candidate !== undefined,
  );
  const phoneRaw = phoneCandidates.find(hasNonEmptyString);
  if (hasNonEmptyString(phoneRaw)) {
    const countryCode = pickMoeLicenseScalar(row, [
      "countryCode",
      "CountryCode",
      "phoneCountryCode",
      "PhoneCountryCode",
    ]);
    const rawPhoneNumber = String(phoneRaw);
    const phoneParts = normalizeMoePhoneParts(rawPhoneNumber, countryCode);
    if (phoneParts) {
      values.phoneNumber = formatPhoneNumberFromSource(rawPhoneNumber);
      values.establishmentMobile = {
        phoneCountryCode: phoneParts.phoneCountryCode,
        phoneLocalNumber: phoneParts.phoneLocalNumber,
      };
      if (
        isValidMobileNumber(
          phoneParts.phoneCountryCode,
          phoneParts.phoneLocalNumber,
        )
      ) {
        readOnlyFields.push("phoneNumber", "establishmentMobile");
      }
    }
  }

  const streetRaw = pickMoeLicenseScalar(row, [
    "licenseAddrStreet",
    "LicenseAddrStreet",
  ]);
  if (hasNonEmptyString(streetRaw)) {
    values.street = String(streetRaw).trim();
  }

  const licenseExpiryRaw = pickMoeLicenseScalar(row, [
    "licenseExpirationDate",
    "LicenseExpirationDate",
    "licenseExpiryDate",
    "LicenseExpiryDate",
    "licenseExpiry",
    "LicenseExpiry",
  ]);
  if (hasNonEmptyString(licenseExpiryRaw)) {
    const licenseExpiryMoment = moment(String(licenseExpiryRaw).trim());
    if (licenseExpiryMoment.isValid()) {
      values.licenseExpiryDate = licenseExpiryMoment.clone().startOf("day");
    }
  }

  const tenancyEndRaw = pickMoeLicenseScalar(row, [
    "tenancyContractEndDate",
    "TenancyContractEndDate",
    "licenseTenancyEndDate",
    "LicenseTenancyEndDate",
    "tenancyEndDate",
    "TenancyEndDate",
    "tenancyContractExpiryDate",
    "TenancyContractExpiryDate",
    "leaseContractEndDate",
    "LeaseContractEndDate",
  ]);
  if (hasNonEmptyString(tenancyEndRaw)) {
    const tenancyEndMoment = moment(String(tenancyEndRaw).trim());
    if (tenancyEndMoment.isValid()) {
      values.tenancyContractEndDate = tenancyEndMoment.clone().startOf("day");
      readOnlyFields.push("tenancyContractEndDate");
    }
  }

  if (
    !Object.prototype.hasOwnProperty.call(values, "establishmentMobile") &&
    (hasMoePhoneSource || Object.keys(values).length > 0)
  ) {
    values.phoneNumber = "";
    values.establishmentMobile = {
      phoneCountryCode: UAE_PHONE_COUNTRY_CODE,
      phoneLocalNumber: "",
    };
  }

  return { values, readOnlyFields };
}

/** True when MOE mapped a valid `tenancyContractEndDate` into the form. */
export function isMoeTenancyContractEndDateMapped(
  values: Record<string, unknown>,
  readOnlyFields: string[],
): boolean {
  return (
    readOnlyFields.includes("tenancyContractEndDate") &&
    hasValidTenancyContractEndDateValue(values.tenancyContractEndDate)
  );
}

/** Whether a raw or Moment tenancy end date from API/MOE/form is non-empty and parseable. */
export function hasValidTenancyContractEndDateValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (moment.isMoment(value)) return value.isValid();
  if (typeof value === "object" && (value as { _isAMomentObject?: boolean })._isAMomentObject) {
    return moment(value as moment.MomentInput).isValid();
  }
  return moment(String(value).trim()).isValid();
}
