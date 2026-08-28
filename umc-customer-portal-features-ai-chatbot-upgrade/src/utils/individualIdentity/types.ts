import type { Moment } from "moment";

export type VerificationMethod = 1 | 2 | 3;

export const VERIFICATION_METHOD = {
  EMIRATES_ID: 1 as VerificationMethod,
  UID: 2 as VerificationMethod,
  PASSPORT: 3 as VerificationMethod,
};

export interface IndividualIdentityFormValues {
  verificationMethod?: VerificationMethod;
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

export type IndividualIdentityFieldName = keyof IndividualIdentityFormValues;

export const INDIVIDUAL_IDENTITY_FIELD_KEYS: IndividualIdentityFieldName[] = [
  "verificationMethod",
  "dateOfBirth",
  "emiratesId",
  "uidNumber",
  "passportNumber",
  "fullNameAr",
  "fullNameEn",
  "nationalityId",
  "gender",
  "occupation",
  "emiratesIdExpiryDate",
  "passportExpiryDate",
  "visaExpiryDate",
  "personalPhotoUrl",
  "emiratesIdUrl",
  "passportUrl",
  "visaUrl",
  "passportScanUrl",
];

export function getIdFieldForVerificationMethod(
  method: VerificationMethod,
): IndividualIdentityFieldName {
  if (method === VERIFICATION_METHOD.UID) return "uidNumber";
  if (method === VERIFICATION_METHOD.PASSPORT) return "passportNumber";
  return "emiratesId";
}

export function normalizeVerificationMethod(value: unknown): VerificationMethod {
  const n = Number(value);
  if (n === 2) return VERIFICATION_METHOD.UID;
  if (n === 3) return VERIFICATION_METHOD.PASSPORT;
  return VERIFICATION_METHOD.EMIRATES_ID;
}
