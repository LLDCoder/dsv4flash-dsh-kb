import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Adds a separator between the calling code and national number when an
 * unformatted international phone number can be parsed safely.
 */
export const formatInternationalMobileNumberForDisplay = (
  value: string | null | undefined,
) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue || /\s/.test(normalizedValue)) {
    return normalizedValue;
  }

  if (!normalizedValue.startsWith("+")) {
    return normalizedValue;
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(normalizedValue);
    const countryCallingCode = String(
      phoneNumber?.countryCallingCode ?? "",
    ).trim();
    const nationalNumber = String(phoneNumber?.nationalNumber ?? "").trim();

    return countryCallingCode && nationalNumber
      ? `+${countryCallingCode} ${nationalNumber}`
      : normalizedValue;
  } catch {
    return normalizedValue;
  }
};
