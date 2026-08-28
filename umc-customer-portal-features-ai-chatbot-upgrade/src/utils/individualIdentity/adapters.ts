import moment from "moment";
import type { IndividualIdentityFormValues } from "./types";
import { normalizeVerificationMethod } from "./types";
import { OCCUPATION_MAX_CHARS } from "./validation";

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const normalized = Number(value);
  return Number.isNaN(normalized) ? undefined : normalized;
}

function normalizePositiveOptionalNumber(value: unknown): number | undefined {
  const normalized = normalizeOptionalNumber(value);
  if (normalized === undefined || normalized <= 0) {
    return undefined;
  }
  return normalized;
}

function pickFirstNonEmptyString(
  data: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

function formatOptionalDateEndOfDay(
  value: unknown,
): string | null {
  if (!value) return null;
  const nextValue = moment.isMoment(value) ? value.clone() : moment(value);
  if (!nextValue.isValid()) return null;
  return nextValue
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(0)
    .format("YYYY-MM-DDTHH:mm:ss");
}

/** Maps Personal Profile API response into unified form values. */
export function personalProfileApiToFormValues(
  data: Record<string, unknown>,
): Partial<IndividualIdentityFormValues> & Record<string, unknown> {
  const verificationMethod = normalizeVerificationMethod(data.type);
  const sharedIdentityDocumentUrl = pickFirstNonEmptyString(data, [
    "eidDocumentOrPassPortSacnUrl",
  ]);
  const personalPhotoUrl = pickFirstNonEmptyString(data, [
    "personalPhotoUrl",
    "photoUrl",
  ]);
  const emiratesIdCopyUrl = pickFirstNonEmptyString(data, [
    "emiratesIdCopyUrl",
    ...(verificationMethod === 1 ? ["eidDocumentOrPassPortSacnUrl"] : []),
  ]);
  const passportCopyUrl = pickFirstNonEmptyString(data, [
    "passportCopyUrl",
    ...(verificationMethod === 2 || verificationMethod === 3
      ? ["eidDocumentOrPassPortSacnUrl"]
      : []),
  ]);
  const visaCopyUrl = pickFirstNonEmptyString(data, ["visaCopyUrl"]);

  return {
    verificationMethod,
    emiratesId: String(data.emiratesId ?? ""),
    passportNumber: String(data.passportNumber ?? ""),
    fullNameEn: String(data.fullNameEn ?? ""),
    fullNameAr: String(data.fullNameAr ?? ""),
    nationalityId: normalizePositiveOptionalNumber(data.nationalityId),
    gender: normalizePositiveOptionalNumber(data.genderId),
    dateOfBirth: data.dateOfBirth ? moment(String(data.dateOfBirth)) : null,
    occupation: String(data.occupation ?? "").slice(0, OCCUPATION_MAX_CHARS),
    emiratesIdExpiryDate: data.emiratesIdexpiryDate
      ? moment(String(data.emiratesIdexpiryDate))
      : null,
    uidNumber: String(data.uid ?? ""),
    visaExpiryDate: data.visaExpiryDate
      ? moment(String(data.visaExpiryDate))
      : null,
    passportExpiryDate: data.passportExpiryDate
      ? moment(String(data.passportExpiryDate))
      : null,
    personalPhotoUrl,
    emiratesIdUrl: emiratesIdCopyUrl,
    passportUrl:
      verificationMethod === 2 ? passportCopyUrl : undefined,
    visaUrl: visaCopyUrl,
    passportScanUrl:
      verificationMethod === 3 ? passportCopyUrl : undefined,
    eidDocumentOrPassPortSacnUrl: sharedIdentityDocumentUrl,
    addressEmirate: normalizeOptionalNumber(data.emirateId),
    addressRegion: normalizeOptionalNumber(data.regionId),
    addressArea: normalizeOptionalNumber(data.areaId),
    addressStreet: data.street || "",
    // Carries a previously dropped pin back into form state so the map can restore
    // it and a later save can send it back unchanged.
    addressLatitude: normalizeOptionalNumber(data.latitude),
    addressLongitude: normalizeOptionalNumber(data.longitude),
  };
}

/** Maps unified form values to Personal Profile submit API params. */
export function personalProfileFormToSubmitParams(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const verificationMethod = normalizeVerificationMethod(values.verificationMethod);
  const passportUrl = String(values.passportUrl ?? "");
  const passportScanUrl = String(values.passportScanUrl ?? "");

  return {
    ...values,
    userTypeId: verificationMethod,
    verifyMethod: verificationMethod,
    dateOfBirth: values.dateOfBirth
      ? moment.isMoment(values.dateOfBirth)
        ? values.dateOfBirth.format("YYYY-MM-DD")
        : values.dateOfBirth
      : "",
    emiratesId: String(values.emiratesId || "").replace(/\D/g, ""),
    uid: values.uidNumber || "",
    fullNameAr: values.fullNameAr || "",
    fullNameEn: values.fullNameEn || "",
    fullNameArabic: values.fullNameAr || "",
    fullNameEnglish: values.fullNameEn || "",
    nationalityId: values.nationalityId || 1023,
    nationality: values.nationalityId || 1023,
    genderId: Number(values.gender) === 1 ? 1 : 2,
    emiratesIdexpiryDate: formatOptionalDateEndOfDay(
      values.emiratesIdExpiryDate,
    ),
    passportExpiryDate: formatOptionalDateEndOfDay(values.passportExpiryDate),
    visaExpiryDate: formatOptionalDateEndOfDay(values.visaExpiryDate),
    emiratesIdCopyUrl: values.emiratesIdUrl || "",
    passportCopyUrl:
      verificationMethod === 3 ? passportScanUrl : passportUrl,
    visaCopyUrl: values.visaUrl || "",
  };
}

/** Maps partner modal form values to PartnerData shape. */
export function partnerFormToPartnerData(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const verificationMethod = normalizeVerificationMethod(values.verificationMethod);

  return {
    ...values,
    verificationMethodCode: String(verificationMethod),
    verificationMethod: String(verificationMethod),
    dateBirth: values.dateOfBirth
      ? moment.isMoment(values.dateOfBirth)
        ? values.dateOfBirth.format("YYYY-MM-DDTHH:mm:ss") // contract: wall-clock, no offset
        : values.dateOfBirth
      : undefined,
    uaeNumber: values.uidNumber,
    uidNumber: values.uidNumber,
    genderId: values.gender,
    expiryDate: values.emiratesIdExpiryDate,
  };
}
