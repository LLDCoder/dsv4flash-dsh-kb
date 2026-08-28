import type { VerificationMethod } from "./types";
import { VERIFICATION_METHOD } from "./types";

const BASE_FIELDS = [
  "dateOfBirth",
  "fullNameAr",
  "fullNameEn",
  "nationalityId",
  "gender",
  "occupation",
  "personalPhotoUrl",
];

/** Required individual identity fields for a given verification method (excludes address). */
export function getIndividualRequiredFields(
  verificationMethod: VerificationMethod,
  options?: { includeAddress?: boolean },
): string[] {
  const base = options?.includeAddress
    ? [
        ...BASE_FIELDS,
        "addressEmirate",
        "addressRegion",
        "addressArea",
        "addressStreet",
      ]
    : [...BASE_FIELDS];

  if (verificationMethod === VERIFICATION_METHOD.EMIRATES_ID) {
    return [...base, "emiratesIdUrl", "emiratesIdExpiryDate"];
  }
  if (verificationMethod === VERIFICATION_METHOD.UID) {
    return [
      ...base,
      "uidNumber",
      "passportExpiryDate",
      "visaExpiryDate",
      "passportUrl",
      "visaUrl",
    ];
  }
  return [...base, "passportNumber", "passportScanUrl", "passportExpiryDate"];
}

/** Partner modal: individual fields including verificationMethod. */
export function getPartnerIndividualRequiredFields(
  verificationMethod: VerificationMethod,
): string[] {
  return ["verificationMethod", ...getIndividualRequiredFields(verificationMethod)];
}
