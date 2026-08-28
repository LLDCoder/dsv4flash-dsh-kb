import { formatIcpDate } from "@/components/designable/src/components/IDSelector/idSelectorUtils";
import type {
  PartnerManagementContext,
  PartnerManagementPartnerDto,
} from "@/services/myRequest";

export const PARTNER_MANAGEMENT_SERVICE_CODES = new Set(["804", "905", "1205"]);

export type PartnerManagementFormPartner = {
  id: string;
  isOwner?: boolean;
  partnerType: "individual" | "company";
  type?: "emiratesId" | "uid" | "passport";
  dateOfBirth?: string;
  emiratesId?: string;
  uid?: string;
  passportNumber?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  nationality?: number | string;
  gender?: string;
  occupation?: string;
  emiratesIdexpiryDate?: string;
  passportExpiryDate?: string;
  visaExpiryDate?: string;
  PersonalPhoto?: string;
  EmiratesID?: string;
  Passport?: string;
  Visa?: string;
  PassportScan?: string;
  establishmentNameArabic?: string;
  establishmentNameEnglish?: string;
  representativeEmiratesId?: string | null;
  representativeNameEn?: string | null;
  representativeNameAr?: string | null;
  memorandumOfAssociation?: string;
  powerOfAttorney?: string;
  statement?: string;
};

export const normalizePartnerManagementPartnerId = (value: unknown) =>
  String(value ?? "").trim();

export const isPartnerManagementOwner = (
  partner: PartnerManagementPartnerDto | Record<string, unknown> | null | undefined,
) => Boolean(partner?.isOwner);

const normalizePartnerType = (
  partner: PartnerManagementPartnerDto | Record<string, unknown> | null | undefined,
): "individual" | "company" => {
  if (!partner) {
    return "individual";
  }

  if (String(partner.partnerType || "").toLowerCase() === "company") {
    return "company";
  }

  return String(partner.partnerTypeCode || "") === "1"
    ? "company"
    : "individual";
};

type VerificationType = "emiratesId" | "uid" | "passport";

// The partner API returns empty strings rather than null for unset fields, so a
// plain `??` chain would keep "" and never reach the aliased field that holds
// the real value.
const firstFilledValue = <T,>(
  ...values: Array<T | null | undefined>
): T | undefined => {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string" && !value.trim()) {
      continue;
    }

    return value;
  }

  return undefined;
};

const normalizeVerificationType = (
  value: unknown,
): VerificationType | undefined => {
  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalizedValue === "uid" || normalizedValue === "2") {
    return "uid";
  }

  if (normalizedValue === "passport" || normalizedValue === "3") {
    return "passport";
  }

  if (normalizedValue === "emiratesid" || normalizedValue === "1") {
    return "emiratesId";
  }

  return undefined;
};

// Some partner records come back without a usable verification method (missing,
// null or an empty string), so fall back to whichever identifier actually holds
// a value instead of assuming Emirates ID.
const inferVerificationType = (
  partner: PartnerManagementPartnerDto,
): VerificationType => {
  if (String(partner.emiratesId ?? "").trim()) {
    return "emiratesId";
  }

  if (firstFilledValue(partner.uid, partner.uaeNumber)) {
    return "uid";
  }

  if (String(partner.passportNumber ?? "").trim()) {
    return "passport";
  }

  return "emiratesId";
};

const resolveVerificationType = (
  partner: PartnerManagementPartnerDto,
): VerificationType =>
  normalizeVerificationType(partner.type) ??
  normalizeVerificationType(partner.verificationMethodCode) ??
  inferVerificationType(partner);

const normalizeGender = (value: unknown): string | undefined => {
  if (value === 1 || String(value) === "1") return "male";
  if (value === 2 || String(value) === "2") return "female";
  if (typeof value === "string") return value;
  return undefined;
};

const mapPartnerToFormValue = (
  partner: PartnerManagementPartnerDto,
): PartnerManagementFormPartner | null => {
  const id = normalizePartnerManagementPartnerId(partner.id);

  if (!id) {
    return null;
  }

  const partnerType = normalizePartnerType(partner);

  if (partnerType === "company") {
    return {
      id,
      isOwner: Boolean(partner.isOwner),
      partnerType,
      nationality: firstFilledValue(partner.nationality, partner.nationalityId),
      establishmentNameArabic: firstFilledValue(
        partner.establishmentNameArabic,
        partner.fullNameAr,
      ),
      establishmentNameEnglish: firstFilledValue(
        partner.establishmentNameEnglish,
        partner.fullNameEn,
      ),
      representativeEmiratesId: firstFilledValue(partner.representativeEmiratesId),
      representativeNameEn: firstFilledValue(partner.representativeNameEn),
      representativeNameAr: firstFilledValue(partner.representativeNameAr),
      memorandumOfAssociation: firstFilledValue(
        partner.memorandumOfAssociation,
        partner.memorandumOfAssociationUrl,
      ),
      powerOfAttorney: firstFilledValue(
        partner.powerOfAttorney,
        partner.powerOfAttorneyUrl,
      ),
      statement: firstFilledValue(partner.statement, partner.statementUrl),
    };
  }

  return {
    id,
    isOwner: Boolean(partner.isOwner),
    partnerType,
    type: resolveVerificationType(partner),
    dateOfBirth: formatIcpDate(
      firstFilledValue(partner.dateOfBirth, partner.dateBirth),
    ),
    emiratesId: firstFilledValue(partner.emiratesId),
    uid: firstFilledValue(partner.uid, partner.uaeNumber),
    passportNumber: firstFilledValue(partner.passportNumber),
    fullNameArabic: firstFilledValue(partner.fullNameArabic, partner.fullNameAr),
    fullNameEnglish: firstFilledValue(partner.fullNameEnglish, partner.fullNameEn),
    nationality: firstFilledValue(partner.nationality, partner.nationalityId),
    gender:
      typeof partner.gender === "string"
        ? partner.gender
        : partner.genderId != null
          ? normalizeGender(partner.genderId)
          : undefined,
    occupation: firstFilledValue(partner.occupation),
    emiratesIdexpiryDate: formatIcpDate(
      firstFilledValue(
        partner.emiratesIdexpiryDate,
        partner.emiratesIdExpiryDate,
        partner.expiryDate,
      ),
    ),
    passportExpiryDate: formatIcpDate(
      firstFilledValue(partner.passportExpiryDate),
    ),
    visaExpiryDate: formatIcpDate(firstFilledValue(partner.visaExpiryDate)),
    PersonalPhoto: firstFilledValue(partner.personalPhoto, partner.personalPhotoUrl),
    EmiratesID: firstFilledValue(
      partner.emiratesIdFile,
      partner.emiratesIdUrl,
      partner.emiratesIdurl,
    ),
    Passport: firstFilledValue(partner.passport, partner.passportUrl),
    Visa: firstFilledValue(partner.visaUrl),
    PassportScan: firstFilledValue(partner.passportScan, partner.passportScanUrl),
  };
};

export const resolvePartnerManagementContextValues = (
  partnerManagementContext: PartnerManagementContext | null | undefined,
) => {
  if (!partnerManagementContext) {
    return {
      editablePartners: [] as PartnerManagementFormPartner[],
      initialPartnerIds: [] as string[],
      ownerPartners: [] as PartnerManagementFormPartner[],
    };
  }

  const existingPartners = Array.isArray(partnerManagementContext.existingPartners)
    ? partnerManagementContext.existingPartners
    : [];
  const ownerPartners = existingPartners
    .filter((partner) => isPartnerManagementOwner(partner))
    .map(mapPartnerToFormValue)
    .filter(
      (partner): partner is PartnerManagementFormPartner => partner != null,
    );
  const editableSource = partnerManagementContext.hasDraft
    ? partnerManagementContext.draftPartners
    : existingPartners;
  const editablePartners = (Array.isArray(editableSource) ? editableSource : [])
    .filter((partner) => !isPartnerManagementOwner(partner))
    .map(mapPartnerToFormValue)
    .filter(
      (partner): partner is PartnerManagementFormPartner => partner != null,
    );
  const explicitInitialPartnerIds = Array.isArray(
    partnerManagementContext.initialPartnerIds,
  )
    ? partnerManagementContext.initialPartnerIds
        .map((id) => normalizePartnerManagementPartnerId(id))
        .filter(Boolean)
    : [];
  const fallbackInitialPartnerIds = existingPartners
    .filter((partner) => !isPartnerManagementOwner(partner))
    .map((partner) => normalizePartnerManagementPartnerId(partner.id))
    .filter(Boolean);

  return {
    editablePartners,
    initialPartnerIds:
      explicitInitialPartnerIds.length > 0
        ? explicitInitialPartnerIds
        : fallbackInitialPartnerIds,
    ownerPartners,
  };
};
