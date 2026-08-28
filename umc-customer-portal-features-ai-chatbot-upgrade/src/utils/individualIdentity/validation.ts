import moment, { type Moment } from "moment";
import i18n from "@/localization/config";
import type { VerificationMethod } from "./types";
import { VERIFICATION_METHOD } from "./types";

export const UID_PATTERN = /^\d{1,15}$/;
export const PASSPORT_NUMBER_PATTERN = /^[A-Za-z0-9]{6,9}$/;
export const FULL_NAME_MAX_CHARS = 200;
export const OCCUPATION_MIN_CHARS = 2;
export const OCCUPATION_MAX_CHARS = 100;
const ASCII_PUNCTUATION_PATTERN = "!-/:-@\\[-`{-~";
const ARABIC_NAME_ALLOWED_PATTERN =
  new RegExp(
    `[^0-9\\u0660-\\u0669\\u06F0-\\u06F9\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF\\s${ASCII_PUNCTUATION_PATTERN}]`,
    "g",
  );
const ENGLISH_NAME_ALLOWED_PATTERN = new RegExp(
  `[^A-Za-z0-9\\s${ASCII_PUNCTUATION_PATTERN}]`,
  "g",
);
const ARABIC_NAME_PATTERN =
  new RegExp(
    `^[0-9\\u0660-\\u0669\\u06F0-\\u06F9\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF\\s${ASCII_PUNCTUATION_PATTERN}]+$`,
  );
const ENGLISH_NAME_PATTERN = new RegExp(
  `^[A-Za-z0-9\\s${ASCII_PUNCTUATION_PATTERN}]+$`,
);

export const truncateFieldValue =
  (maxLength: number) =>
  (value: unknown): unknown => {
    if (value == null || value === "") return value;
    return String(value).slice(0, maxLength);
  };

const normalizeNameInput = (value: unknown, pattern: RegExp): string => {
  if (value === undefined || value === null || value === "") return "";
  return String(value).replace(pattern, "").slice(0, FULL_NAME_MAX_CHARS);
};

export const normalizeArabicFullName = (value: unknown): string => {
  return normalizeNameInput(value, ARABIC_NAME_ALLOWED_PATTERN);
};

export const normalizeEnglishFullName = (value: unknown): string => {
  return normalizeNameInput(value, ENGLISH_NAME_ALLOWED_PATTERN);
};

export const validateArabicFullName = (value: unknown): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return i18n.t("individualIdentity.validation.nameArabicRequired");
  if (trimmed.length > FULL_NAME_MAX_CHARS) {
    return i18n.t("individualIdentity.validation.nameTooLong", {
      max: FULL_NAME_MAX_CHARS,
    });
  }
  return ARABIC_NAME_PATTERN.test(trimmed)
    ? ""
    : i18n.t("individualIdentity.validation.arabicOnly");
};

export const validateEnglishFullName = (value: unknown): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return i18n.t("individualIdentity.validation.nameEnglishRequired");
  if (trimmed.length > FULL_NAME_MAX_CHARS) {
    return i18n.t("individualIdentity.validation.nameTooLong", {
      max: FULL_NAME_MAX_CHARS,
    });
  }
  return ENGLISH_NAME_PATTERN.test(trimmed)
    ? ""
    : i18n.t("individualIdentity.validation.englishOnly");
};

/** Whitelist check used to block illegal characters at input/paste time. */
export const isArabicNameInputAllowed = (value: unknown): boolean => {
  const str = String(value ?? "");
  if (str === "") return true;
  return ARABIC_NAME_PATTERN.test(str);
};
export const isStrictArabicNameInputAllowed = (value: unknown): boolean => {
  const str = String(value ?? "");
  return (
    isArabicNameInputAllowed(str) &&
    !/[0-9\u0660-\u0669\u06F0-\u06F9]/.test(str)
  );
};

export const isEnglishNameInputAllowed = (value: unknown): boolean => {
  const str = String(value ?? "");
  if (str === "") return true;
  return ENGLISH_NAME_PATTERN.test(str);
};

export function stripEmiratesIdDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidEmiratesId(value: unknown): boolean {
  const digits = stripEmiratesIdDigits(value);
  return digits.startsWith("784") && digits.length === 15;
}

export function isValidUid(value: unknown): boolean {
  return UID_PATTERN.test(String(value ?? ""));
}

export function isValidPassportNumber(value: unknown): boolean {
  return PASSPORT_NUMBER_PATTERN.test(String(value ?? ""));
}

export function isCommittedValidDateOfBirth(value: unknown): boolean {
  return moment.isMoment(value) && value.isValid();
}

export function disabledDateBeforeToday(current?: Moment): boolean {
  return Boolean(current && current >= moment().startOf("day"));
}

export function disabledDateAfterToday(current?: Moment): boolean {
  return Boolean(current && !current.isAfter(moment(), "day"));
}

export function isVerificationInputReady(
  verificationMethod: VerificationMethod,
  dateOfBirth: unknown,
  values: {
    emiratesId?: unknown;
    uidNumber?: unknown;
    passportNumber?: unknown;
  },
): boolean {
  if (!isCommittedValidDateOfBirth(dateOfBirth)) return false;

  if (verificationMethod === VERIFICATION_METHOD.EMIRATES_ID) {
    return isValidEmiratesId(values.emiratesId);
  }
  if (verificationMethod === VERIFICATION_METHOD.UID) {
    return isValidUid(values.uidNumber);
  }
  return isValidPassportNumber(values.passportNumber);
}

export function isOccupationLengthValid(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  const len = String(value).length;
  return len >= OCCUPATION_MIN_CHARS && len <= OCCUPATION_MAX_CHARS;
}
