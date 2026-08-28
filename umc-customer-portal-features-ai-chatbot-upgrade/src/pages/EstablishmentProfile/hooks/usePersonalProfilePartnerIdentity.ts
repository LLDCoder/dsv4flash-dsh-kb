import { useEffect, useMemo, useRef, useState } from "react";
import type { Moment } from "moment";
import { getUserIndividual } from "@/services/userProfile";
import { personalProfileApiToFormValues } from "@/utils/individualIdentity";
import type { VerificationMethod } from "@/utils/individualIdentity";

type PersonalProfileIdentityDocumentField =
  | "personalPhotoUrl"
  | "emiratesIdUrl"
  | "passportUrl"
  | "visaUrl"
  | "passportScanUrl";

export interface PersonalProfilePartnerMappedValues {
  verificationMethod: VerificationMethod;
  dateOfBirth?: Moment | null;
  emiratesId?: string;
  uidNumber?: string;
  passportNumber?: string;
  fullNameAr?: string;
  fullNameEn?: string;
  nationalityId?: number;
  gender?: number;
  occupation?: string;
  emiratesIdExpiryDate?: Moment | null;
  passportExpiryDate?: Moment | null;
  visaExpiryDate?: Moment | null;
  personalPhotoUrl?: string;
  emiratesIdUrl?: string;
  passportUrl?: string;
  visaUrl?: string;
  passportScanUrl?: string;
}

export interface PersonalProfilePartnerIdentity {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  available: boolean;
  actualMethod: VerificationMethod | null;
  rawData: Record<string, unknown> | null;
  mappedFormValues: PersonalProfilePartnerMappedValues | null;
  documentFileNames: Partial<
    Record<PersonalProfileIdentityDocumentField, string>
  >;
}

const FILE_NAME_FIELD_CANDIDATES: Record<
  PersonalProfileIdentityDocumentField,
  string[]
> = {
  personalPhotoUrl: [
    "personalPhotoFileName",
    "photoFileName",
    "photoName",
    "personalPhotoName",
  ],
  emiratesIdUrl: [
    "emiratesIdCopyFileName",
    "emiratesIdFileName",
    "eidDocumentFileName",
  ],
  passportUrl: [
    "passportCopyFileName",
    "passportFileName",
  ],
  visaUrl: [
    "visaCopyFileName",
    "visaFileName",
  ],
  passportScanUrl: [
    "passportScanFileName",
    "passportCopyFileName",
    "passportFileName",
  ],
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseVerificationMethod(value: unknown): VerificationMethod | null {
  const normalized = Number(value);
  if (normalized === 1 || normalized === 2 || normalized === 3) {
    return normalized as VerificationMethod;
  }
  return null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = Number(value);
  return Number.isNaN(normalized) ? undefined : normalized;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return true;
}

function pickFileNameFromRawData(
  rawData: Record<string, unknown>,
  fieldName: PersonalProfileIdentityDocumentField,
  fallbackUrl?: string,
): string | undefined {
  const candidates = FILE_NAME_FIELD_CANDIDATES[fieldName];
  for (const key of candidates) {
    const fileName = normalizeOptionalString(rawData[key]);
    if (fileName) {
      return fileName;
    }
  }
  return fallbackUrl;
}

function buildMappedValues(
  rawData: Record<string, unknown>,
  actualMethod: VerificationMethod,
): PersonalProfilePartnerMappedValues {
  const values = personalProfileApiToFormValues(rawData);

  return {
    verificationMethod: actualMethod,
    dateOfBirth:
      values.dateOfBirth && "isValid" in values.dateOfBirth
        ? (values.dateOfBirth as Moment)
        : null,
    emiratesId: normalizeOptionalString(values.emiratesId),
    uidNumber: normalizeOptionalString(values.uidNumber),
    passportNumber: normalizeOptionalString(values.passportNumber),
    fullNameAr: normalizeOptionalString(values.fullNameAr),
    fullNameEn: normalizeOptionalString(values.fullNameEn),
    nationalityId: normalizeOptionalNumber(values.nationalityId),
    gender: normalizeOptionalNumber(values.gender),
    occupation: normalizeOptionalString(values.occupation),
    emiratesIdExpiryDate:
      values.emiratesIdExpiryDate && "isValid" in values.emiratesIdExpiryDate
        ? (values.emiratesIdExpiryDate as Moment)
        : null,
    passportExpiryDate:
      values.passportExpiryDate && "isValid" in values.passportExpiryDate
        ? (values.passportExpiryDate as Moment)
        : null,
    visaExpiryDate:
      values.visaExpiryDate && "isValid" in values.visaExpiryDate
        ? (values.visaExpiryDate as Moment)
        : null,
    personalPhotoUrl: normalizeOptionalString(values.personalPhotoUrl),
    emiratesIdUrl: normalizeOptionalString(values.emiratesIdUrl),
    passportUrl: normalizeOptionalString(values.passportUrl),
    visaUrl: normalizeOptionalString(values.visaUrl),
    passportScanUrl: normalizeOptionalString(values.passportScanUrl),
  };
}

function hasAvailableIdentityData(
  actualMethod: VerificationMethod,
  mappedValues: PersonalProfilePartnerMappedValues,
): boolean {
  const commonFields = [
    mappedValues.dateOfBirth,
    mappedValues.fullNameAr,
    mappedValues.fullNameEn,
    mappedValues.nationalityId,
    mappedValues.gender,
    mappedValues.occupation,
    mappedValues.personalPhotoUrl,
  ];

  if (actualMethod === 1) {
    return [
      mappedValues.emiratesId,
      mappedValues.emiratesIdUrl,
      mappedValues.emiratesIdExpiryDate,
      ...commonFields,
    ].some(hasMeaningfulValue);
  }

  if (actualMethod === 2) {
    return [
      mappedValues.uidNumber,
      mappedValues.passportUrl,
      mappedValues.visaUrl,
      mappedValues.passportExpiryDate,
      mappedValues.visaExpiryDate,
      ...commonFields,
    ].some(hasMeaningfulValue);
  }

  return [
    mappedValues.passportNumber,
    mappedValues.passportScanUrl,
    mappedValues.passportExpiryDate,
    ...commonFields,
  ].some(hasMeaningfulValue);
}

export function usePersonalProfilePartnerIdentity(
  userId: string | undefined,
): PersonalProfilePartnerIdentity {
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [actualMethod, setActualMethod] = useState<VerificationMethod | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null);
  const [mappedFormValues, setMappedFormValues] =
    useState<PersonalProfilePartnerMappedValues | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      if (!mountedRef.current) return;
      setLoading(false);
      setLoaded(true);
      setError(null);
      setAvailable(false);
      setActualMethod(null);
      setRawData(null);
      setMappedFormValues(null);
      return;
    }

    let cancelled = false;

    const loadIdentity = async () => {
      setLoading(true);
      setLoaded(false);
      setError(null);

      try {
        const response = await getUserIndividual(userId);
        if (cancelled || !mountedRef.current) return;

        const nextRawData = isPlainRecord(response?.data) ? response.data : null;
        const nextActualMethod = parseVerificationMethod(nextRawData?.type);
        const nextMappedValues =
          nextRawData && nextActualMethod
            ? buildMappedValues(nextRawData, nextActualMethod)
            : null;
        const nextAvailable =
          !!nextActualMethod &&
          !!nextMappedValues &&
          hasAvailableIdentityData(nextActualMethod, nextMappedValues);

        setAvailable(nextAvailable);
        setActualMethod(nextActualMethod);
        setRawData(nextRawData);
        setMappedFormValues(nextAvailable ? nextMappedValues : null);
      } catch (requestError) {
        if (cancelled || !mountedRef.current) return;

        const nextError =
          requestError instanceof Error && requestError.message.trim()
            ? requestError.message.trim()
            : "Failed to load personal profile partner identity.";

        setError(nextError);
        setAvailable(false);
        setActualMethod(null);
        setRawData(null);
        setMappedFormValues(null);
      } finally {
        if (cancelled || !mountedRef.current) return;
        setLoading(false);
        setLoaded(true);
      }
    };

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const documentFileNames = useMemo(() => {
    if (!rawData || !mappedFormValues) {
      return {};
    }

    return {
      personalPhotoUrl: pickFileNameFromRawData(
        rawData,
        "personalPhotoUrl",
        mappedFormValues.personalPhotoUrl,
      ),
      emiratesIdUrl: pickFileNameFromRawData(
        rawData,
        "emiratesIdUrl",
        mappedFormValues.emiratesIdUrl,
      ),
      passportUrl: pickFileNameFromRawData(
        rawData,
        "passportUrl",
        mappedFormValues.passportUrl,
      ),
      visaUrl: pickFileNameFromRawData(
        rawData,
        "visaUrl",
        mappedFormValues.visaUrl,
      ),
      passportScanUrl: pickFileNameFromRawData(
        rawData,
        "passportScanUrl",
        mappedFormValues.passportScanUrl,
      ),
    };
  }, [mappedFormValues, rawData]);

  return {
    loading,
    loaded,
    error,
    available,
    actualMethod,
    rawData,
    mappedFormValues,
    documentFileNames,
  };
}

export default usePersonalProfilePartnerIdentity;
