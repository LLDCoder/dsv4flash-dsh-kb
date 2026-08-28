import moment from "moment";
import type { NationalityInfo } from "@/services/userProfile";
import type { VerificationMethod } from "@/utils/individualIdentity";
import {
  FULL_NAME_MAX_CHARS,
  OCCUPATION_MAX_CHARS,
} from "@/utils/individualIdentity";
import {
  formatIcpDate,
  mapIcpGender,
  mapIcpNationalityId,
  type IcpPersonProfile,
  type NationalityOption,
} from "@/components/designable/src/components/IDSelector/idSelectorUtils";

export type { VerificationMethod as IndividualIcpVerifyMethod };
export type PersonalProfileIcpVerifyMethod = VerificationMethod;

/** ICP address fragments in `personProfile.addresses` (only street is written to the form). */
type IcpDescribedEntity = {
  descriptionEnglish?: string;
  descriptionArabic?: string;
};

export type IcpPersonProfileWithAddresses = IcpPersonProfile & {
  addresses?: Array<{
    emirate?: IcpDescribedEntity;
    city?: IcpDescribedEntity;
    area?: IcpDescribedEntity;
    street?: IcpDescribedEntity | string;
    emailAddress?: string;
    mobileNo?: string;
  }>;
};

export interface IcpAddressContactInfo {
  email?: string;
  mobileNumber?: string;
}

const INDIVIDUAL_SWITCH_FALLBACK_BASE_FIELDS = [
  "dateOfBirth",
  "fullNameAr",
  "fullNameEn",
  "nationalityId",
  "gender",
  "occupation",
  "addressEmirate",
  "addressRegion",
  "addressArea",
  "addressStreet",
  "personalPhotoUrl",
] as const;

const INDIVIDUAL_SWITCH_FALLBACK_METHOD_FIELDS: Record<VerificationMethod, string[]> = {
  1: ["emiratesId", "emiratesIdExpiryDate", "emiratesIdUrl"],
  2: ["uidNumber", "passportExpiryDate", "visaExpiryDate", "passportUrl", "visaUrl"],
  3: ["passportNumber", "passportExpiryDate", "passportScanUrl"],
};

const ALL_INDIVIDUAL_SWITCH_FALLBACK_FIELDS = [
  ...new Set([
    ...INDIVIDUAL_SWITCH_FALLBACK_BASE_FIELDS,
    ...Object.values(INDIVIDUAL_SWITCH_FALLBACK_METHOD_FIELDS).reduce<string[]>(
      (acc, fields) => acc.concat(fields),
      [],
    ),
  ]),
];

const POSITIVE_NUMBER_FALLBACK_FIELDS = new Set([
  "nationalityId",
  "gender",
  "addressEmirate",
  "addressRegion",
  "addressArea",
]);

export interface IcpIndividualFormMapping {
  values: Record<string, unknown>;
  readonlyFieldNames: string[];
  addressSelection?: { emirateId?: number; regionId?: number };
}

/** @deprecated Use IcpIndividualFormMapping */
export type IcpPersonalFormMapping = IcpIndividualFormMapping;

function normalizeCompare(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function nationalityEntityToFormId(
  nationality:
    | { id?: number | string; descriptionEnglish?: string; descriptionArabic?: string }
    | undefined,
  list: NationalityInfo[],
): number | undefined {
  if (!nationality) return undefined;

  const optList = list as NationalityOption[];
  const rawId = nationality.id;
  if (rawId !== undefined && rawId !== null && rawId !== "") {
    const asNum = typeof rawId === "number" ? rawId : Number(rawId);
    if (!Number.isNaN(asNum)) {
      const viaNumeric = mapIcpNationalityId(asNum, optList);
      if (viaNumeric !== undefined && viaNumeric !== null) return viaNumeric;
      const viaPk = list.find((n) => String(n.id) === String(rawId))?.id;
      if (viaPk !== undefined) return viaPk;
    }
  }

  const en = normalizeCompare(nationality.descriptionEnglish);
  if (en) {
    const hit = list.find((n) => normalizeCompare(n.nameEn) === en);
    if (hit) return hit.id;
    const hitFull = list.find((n) => normalizeCompare(n.fullNameEn) === en);
    if (hitFull) return hitFull.id;
  }
  const ar = normalizeCompare(nationality.descriptionArabic);
  if (ar) {
    const hit = list.find((n) => normalizeCompare(n.nameAr) === ar);
    if (hit) return hit.id;
    const hitFull = list.find((n) => normalizeCompare(n.fullNameAr) === ar);
    if (hitFull) return hitFull.id;
  }
  return undefined;
}

function streetFromIcp(street: IcpDescribedEntity | string | undefined): string | undefined {
  if (street === undefined || street === null) return undefined;
  if (typeof street === "string") {
    const t = street.trim();
    return t || undefined;
  }
  const en = street.descriptionEnglish?.trim();
  const ar = street.descriptionArabic?.trim();
  return en || ar || undefined;
}

function appendFirstAddressRow(
  personProfile: IcpPersonProfileWithAddresses,
  values: Record<string, unknown>,
): void {
  const row = Array.isArray(personProfile.addresses) ? personProfile.addresses[0] : undefined;
  if (!row) return;

  const streetStr = streetFromIcp(row.street);
  if (streetStr) {
    values.addressStreet = streetStr;
  }
}

function trimToOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeOptionalPositiveNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) return undefined;
  return normalized;
}

function hasUsableSwitchFallbackValue(field: string, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (moment.isMoment(value)) return value.isValid();
  if (POSITIVE_NUMBER_FALLBACK_FIELDS.has(field)) {
    return normalizeOptionalPositiveNumber(value) !== undefined;
  }
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function cloneSwitchFallbackValue(value: unknown): unknown {
  if (moment.isMoment(value)) {
    return value.clone();
  }
  return value;
}

function buildAddressSelectionFromValues(
  values: Record<string, unknown>,
): { emirateId?: number; regionId?: number } | undefined {
  const emirateId = normalizeOptionalPositiveNumber(values.addressEmirate);
  const regionId = normalizeOptionalPositiveNumber(values.addressRegion);
  if (emirateId === undefined && regionId === undefined) {
    return undefined;
  }
  return { emirateId, regionId };
}

function genderToFormId(personProfile: IcpPersonProfile): number | undefined {
  const g = personProfile.gender as
    | { id?: number; descriptionEnglish?: string }
    | undefined;
  const gid = g?.id;
  if (gid === 1 || gid === 2) return gid;
  const mapped = mapIcpGender(personProfile.gender?.descriptionEnglish);
  if (mapped === "male") return 1;
  if (mapped === "female") return 2;
  return undefined;
}

function pushStringField(
  target: Record<string, unknown>,
  locks: string[],
  field: string,
  value: string | undefined | null,
  maxLength?: number,
) {
  let v = typeof value === "string" ? value.trim() : "";
  if (!v) return;
  if (maxLength != null) {
    v = v.slice(0, maxLength);
  }
  target[field] = v;
  locks.push(field);
}

function resolveIcpFullNames(personProfile: IcpPersonProfile): {
  fullNameAr?: string | null | undefined;
  fullNameEn?: string | null | undefined;
} {
  const pn = personProfile.personName;
  const alt = personProfile as IcpPersonProfile & {
    name?: { fullNameArabic?: string; fullNameEnglish?: string };
  };
  return {
    fullNameAr: pn?.fullNameArabic ?? alt.name?.fullNameArabic,
    fullNameEn: pn?.fullNameEnglish ?? alt.name?.fullNameEnglish,
  };
}

/**
 * Maps ICP `personProfile` into unified individual identity form values.
 */
export function mapIcpPersonToIndividualFormFields(
  personProfile: IcpPersonProfileWithAddresses,
  verificationMethod: VerificationMethod,
  nationalityList: NationalityInfo[],
  options: { isAddMode: boolean },
): IcpIndividualFormMapping {
  const values: Record<string, unknown> = {};
  const readonlyFieldNames: string[] = [];
  const skipLookupIdentityInAddMode =
    options.isAddMode && (verificationMethod === 1 || verificationMethod === 2);
  const icpNames = resolveIcpFullNames(personProfile);

  pushStringField(
    values,
    readonlyFieldNames,
    "fullNameAr",
    icpNames.fullNameAr,
    FULL_NAME_MAX_CHARS,
  );
  pushStringField(
    values,
    readonlyFieldNames,
    "fullNameEn",
    icpNames.fullNameEn,
    FULL_NAME_MAX_CHARS,
  );

  const nat = nationalityEntityToFormId(personProfile.nationality, nationalityList);
  if (nat !== undefined && nat !== null) {
    values.nationalityId = nat;
    readonlyFieldNames.push("nationalityId");
  }

  const genderId = genderToFormId(personProfile);
  if (genderId !== undefined) {
    values.gender = genderId;
    readonlyFieldNames.push("gender");
  }

  const occEn = personProfile.occupation?.descriptionEnglish?.trim();
  const occAr = (
    personProfile.occupation as { descriptionArabic?: string } | undefined
  )?.descriptionArabic?.trim();
  const occupation = occEn || occAr;
  if (occupation) {
    values.occupation = occupation.slice(0, OCCUPATION_MAX_CHARS);
    readonlyFieldNames.push("occupation");
  }

  const dobStr = formatIcpDate(personProfile.birthDate);
  if (dobStr && !skipLookupIdentityInAddMode) {
    values.dateOfBirth = moment(dobStr);
    readonlyFieldNames.push("dateOfBirth");
  }

  const rawEid = personProfile.identityCard?.emiratesId;
  const eidDigits = rawEid ? String(rawEid).replace(/\D/g, "") : "";
  if (eidDigits && verificationMethod === 1 && !skipLookupIdentityInAddMode) {
    values.emiratesId = eidDigits;
    readonlyFieldNames.push("emiratesId");
  }

  const uidDigits = personProfile.unifiedNumber
    ? String(personProfile.unifiedNumber).replace(/\D/g, "")
    : "";
  const uidForForm =
    verificationMethod === 2 ? uidDigits || eidDigits : "";
  if (uidForForm && verificationMethod === 2 && !skipLookupIdentityInAddMode) {
    values.uidNumber = uidForForm;
    readonlyFieldNames.push("uidNumber");
  }

  const passportNo = personProfile.passport?.passportNo?.trim();
  if (passportNo && verificationMethod !== 1) {
    values.passportNumber = passportNo;
    readonlyFieldNames.push("passportNumber");
  }

  const eidExpiry = formatIcpDate(personProfile.identityCard?.expiryDate);
  if (eidExpiry && verificationMethod === 1) {
    values.emiratesIdExpiryDate = moment(eidExpiry);
    readonlyFieldNames.push("emiratesIdExpiryDate");
  }
  if (eidExpiry && verificationMethod === 2) {
    values.visaExpiryDate = moment(eidExpiry);
    readonlyFieldNames.push("visaExpiryDate");
  }

  const passportExpiry = formatIcpDate(personProfile.passport?.expiryDate);
  if (passportExpiry && (verificationMethod === 2 || verificationMethod === 3)) {
    values.passportExpiryDate = moment(passportExpiry);
    readonlyFieldNames.push("passportExpiryDate");
  }

  appendFirstAddressRow(personProfile, values);

  return {
    values,
    readonlyFieldNames: [...new Set(readonlyFieldNames)],
    addressSelection: undefined,
  };
}

/** @deprecated Use mapIcpPersonToIndividualFormFields */
export function mapIcpPersonToPersonalProfileFormFields(
  personProfile: IcpPersonProfileWithAddresses,
  verifyMethod: VerificationMethod,
  nationalityList: NationalityInfo[],
  options: { isAddMode: boolean },
): IcpIndividualFormMapping {
  return mapIcpPersonToIndividualFormFields(
    personProfile,
    verifyMethod,
    nationalityList,
    options,
  );
}

export function extractIcpPersonProfile(apiBody: unknown): IcpPersonProfileWithAddresses | undefined {
  const nested = apiBody as { data?: { personProfile?: IcpPersonProfileWithAddresses } & IcpPersonProfileWithAddresses } | undefined;
  const d = nested?.data;
  const pp = d?.personProfile ?? (d && typeof d === "object" && ("personName" in d || "birthDate" in d) ? d : undefined);
  return pp && typeof pp === "object" ? pp : undefined;
}

export function extractPrimaryIcpAddressContact(
  personProfile: IcpPersonProfileWithAddresses | undefined,
): IcpAddressContactInfo {
  const row = Array.isArray(personProfile?.addresses) ? personProfile?.addresses[0] : undefined;
  return {
    email: trimToOptionalString(row?.emailAddress),
    mobileNumber: trimToOptionalString(row?.mobileNo),
  };
}

const DIGIT_ID_FIELDS = new Set(["emiratesId", "uidNumber"]);

function isEffectivelyEmptyFormValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (moment.isMoment(value)) return !value.isValid();
  return false;
}

function normalizeIcpCompareToken(field: string, value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (moment.isMoment(value)) return value.isValid() ? value.format("YYYY-MM-DD") : null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    if (DIGIT_ID_FIELDS.has(field)) {
      const digits = s.replace(/\D/g, "");
      return digits || null;
    }
    if (field === "passportNumber") return s.toLowerCase();
    return s.toLowerCase();
  }
  return null;
}

function icpFieldMatchesExistingProfile(
  field: string,
  incoming: unknown,
  current: unknown,
): boolean {
  if (incoming === undefined || incoming === null) return false;
  if (moment.isMoment(incoming) && !incoming.isValid()) return false;
  const inc = normalizeIcpCompareToken(field, incoming);
  if (inc === null) return false;
  if (isEffectivelyEmptyFormValue(current)) return true;
  const cur = normalizeIcpCompareToken(field, current);
  return cur !== null && cur === inc;
}

export function filterIcpMappingToProfileMatchedFields(
  mapping: IcpIndividualFormMapping,
  currentFormValues: Record<string, unknown>,
): IcpIndividualFormMapping {
  const filteredValues: Record<string, unknown> = {};
  const filteredReadonly: string[] = [];
  const readonlySet = new Set(mapping.readonlyFieldNames);

  for (const field of Object.keys(mapping.values)) {
    if (!readonlySet.has(field)) continue;
    const incoming = mapping.values[field];
    if (icpFieldMatchesExistingProfile(field, incoming, currentFormValues[field])) {
      filteredValues[field] = incoming;
      filteredReadonly.push(field);
    }
  }

  if (readonlySet.has("occupation")) {
    const incomingOccupation = mapping.values.occupation;
    const occupationFromIcp =
      typeof incomingOccupation === "string" ? incomingOccupation.trim() : "";
    if (occupationFromIcp && !filteredReadonly.includes("occupation")) {
      filteredValues.occupation = incomingOccupation;
      filteredReadonly.push("occupation");
    }
  }

  const emirateRaw = filteredValues.addressEmirate;
  const regionRaw = filteredValues.addressRegion;
  const emirateId = typeof emirateRaw === "number" ? emirateRaw : undefined;
  const regionId = typeof regionRaw === "number" ? regionRaw : undefined;
  const addressSelection =
    emirateId !== undefined || regionId !== undefined
      ? { emirateId, regionId }
      : undefined;

  return {
    values: filteredValues,
    readonlyFieldNames: [...new Set(filteredReadonly)],
    addressSelection,
  };
}

export function getIndividualSwitchFallbackFieldKeys(
  verificationMethod: VerificationMethod,
): string[] {
  return [
    ...INDIVIDUAL_SWITCH_FALLBACK_BASE_FIELDS,
    ...(INDIVIDUAL_SWITCH_FALLBACK_METHOD_FIELDS[verificationMethod] ?? []),
  ];
}

export function getIndividualSwitchFallbackResetValues(): Record<string, undefined> {
  return ALL_INDIVIDUAL_SWITCH_FALLBACK_FIELDS.reduce(
    (acc, key) => {
      acc[key] = undefined;
      return acc;
    },
    {} as Record<string, undefined>,
  );
}

export function mergeIndividualSwitchFallbackHistory(
  existingHistory: Record<string, unknown> | undefined,
  snapshotValues: Record<string, unknown> | undefined,
  verificationMethod: VerificationMethod,
): Record<string, unknown> {
  const history = {
    ...(existingHistory && typeof existingHistory === "object" ? existingHistory : {}),
  };
  if (!snapshotValues || typeof snapshotValues !== "object") {
    return history;
  }

  getIndividualSwitchFallbackFieldKeys(verificationMethod).forEach((field) => {
    const nextValue = snapshotValues[field];
    if (!hasUsableSwitchFallbackValue(field, nextValue)) return;
    history[field] = cloneSwitchFallbackValue(nextValue);
  });

  return history;
}

export function getIndividualSwitchFallbackValues(
  fallbackValues: Record<string, unknown> | undefined,
  verificationMethod: VerificationMethod,
): Record<string, unknown> {
  if (!fallbackValues || typeof fallbackValues !== "object") {
    return {};
  }

  return getIndividualSwitchFallbackFieldKeys(verificationMethod).reduce(
    (acc, field) => {
      const fallbackValue = fallbackValues[field];
      if (!hasUsableSwitchFallbackValue(field, fallbackValue)) return acc;
      acc[field] = cloneSwitchFallbackValue(fallbackValue);
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

export function mergeSwitchFallbackValuesIntoIcpMapping(
  mapping: IcpIndividualFormMapping,
  fallbackValues: Record<string, unknown> | undefined,
  verificationMethod: VerificationMethod,
): IcpIndividualFormMapping {
  const mergedValues = { ...mapping.values };
  const switchFallbackValues = getIndividualSwitchFallbackValues(
    fallbackValues,
    verificationMethod,
  );

  Object.keys(switchFallbackValues).forEach((field) => {
    if (hasUsableSwitchFallbackValue(field, mergedValues[field])) return;
    mergedValues[field] = switchFallbackValues[field];
  });

  const addressSelection =
    buildAddressSelectionFromValues(mergedValues) ?? mapping.addressSelection;

  return {
    values: mergedValues,
    readonlyFieldNames: [...mapping.readonlyFieldNames],
    addressSelection,
  };
}

export const ICP_MAPPED_INDIVIDUAL_FIELDS = [
  "fullNameAr",
  "fullNameEn",
  "nationalityId",
  "gender",
  "occupation",
  "emiratesIdExpiryDate",
  "passportExpiryDate",
  "visaExpiryDate",
] as const;

export function getIcpMappedIndividualFieldValues(): Record<string, undefined> {
  return ICP_MAPPED_INDIVIDUAL_FIELDS.reduce(
    (acc, key) => {
      acc[key] = undefined;
      return acc;
    },
    {} as Record<string, undefined>,
  );
}
