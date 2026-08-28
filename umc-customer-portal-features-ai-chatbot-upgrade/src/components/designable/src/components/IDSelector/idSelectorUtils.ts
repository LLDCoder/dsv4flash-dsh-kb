import moment from "moment";
import i18n from "@/localization/config";
import {
  DEFAULT_COUNTRY_DIAL_CODE,
  validateMobileNumber,
} from "@/components/common/MobileNumberInput";
export {
  QUERY_FIELD_BY_TYPE,
  getQuerySignature,
  hasStoredIcpLookup,
  isLookupFresh,
  isQuerySignatureCurrent,
} from "./querySignature";
import {
  getQuerySignature,
  isLookupFresh,
  QUERY_FIELD_BY_TYPE,
} from "./querySignature";

export type IdSelectorType = "emiratesId" | "uid" | "passport";

export interface IDSelectorFieldProps {
  showEmiratesId?: boolean;
  showUID?: boolean;
  showPassport?: boolean;
  enablePassportExtendedFields?: boolean;
  useAllEmirates?: boolean;
  onIcpLoadedChange?: (loaded: boolean) => void;
  onValueChange?: (value: IDSelectorValue | undefined) => void;
  disabled?: boolean;
  editableFieldKeys?: Array<keyof IDSelectorValue>;
  autoRefreshEmiratesIdExpiry?: boolean;
  runtimeType?: IdSelectorType | null;
}

export interface IDSelectorOption {
  label: string;
  value: IdSelectorType;
}

export interface NationalityOption {
  id: number;
  nameEn: string;
  nameAr?: string;
  numericCode?: string | number | null;
}

export interface IcpPersonProfile {
  birthDate?: string;
  unifiedNumber?: string;
  identityCard?: { emiratesId?: string; expiryDate?: string };
  nationality?: { id?: number };
  gender?: { descriptionEnglish?: string };
  occupation?: { descriptionEnglish?: string };
  passport?: { passportNo?: string; expiryDate?: string };
  personName?: {
    fullNameArabic?: string;
    fullNameEnglish?: string;
  };
}

export interface IDSelectorValue {
  type?: IdSelectorType;
  _icpLookupType?: IdSelectorType;
  _icpLookupSignature?: string;
  dateOfBirth?: string;
  emiratesId?: string;
  uid?: string;
  passportNumber?: string;
  passportType?: string;
  placeOfIssueEn?: string;
  placeOfIssueAr?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  nationality?: number | string;
  gender?: string;
  occupation?: string;
  emiratesIdexpiryDate?: string;
  passportExpiryDate?: string;
  visaExpiryDate?: string;
  emirateId?: number;
  regionId?: number;
  areaId?: number;
  street?: string;
  mobileNo?: string;
  mobileNoCountryCode?: string;
  mobileNoLocalNumber?: string;
  telephoneNo?: string;
  fax?: string;
  workNo?: string;
  areaCode?: string;
  emailAddress?: string;
  PersonalPhoto?: string;
  EmiratesID?: string;
  Passport?: string;
  Visa?: string;
  PassportScan?: string;
}

export type QueryStatus = "idle" | "loading" | "success" | "error";
export type IdSelectorRuleMap = Partial<
  Record<keyof IDSelectorValue, (value: unknown) => string>
>;

export interface LookupState {
  status: QueryStatus;
  signature?: string;
  message?: string;
}

export type LookupStateMap = Record<IdSelectorType, LookupState>;

export interface SectionCommonProps {
  current: IDSelectorValue;
  showList: boolean;
  enablePassportExtendedFields: boolean;
  useAllEmirates: boolean;
  showQueryButton: boolean;
  isFieldEditable: (key: keyof IDSelectorValue) => boolean;
  nationalityList: NationalityOption[];
  onFieldChange: <K extends keyof IDSelectorValue>(
    key: K,
    value: IDSelectorValue[K],
  ) => void;
  onFieldsChange: (value: Partial<IDSelectorValue>) => void;
  onQuery: () => void;
  onOpenOcr?: () => void;
  queryLoading: boolean;
  isQuerySuccess: boolean;
}

export const ID_OPTIONS: IDSelectorOption[] = [
  { label: "Emirates ID", value: "emiratesId" },
  { label: "UAE Unified Number (UID)", value: "uid" },
  { label: "Passport", value: "passport" },
];

export const EMIRATES_ID_REGEX = /^784\d{4}\d{7}\d$/;
export const UID_MAX_LENGTH = 15;
export const EMIRATES_ID_MAX_LENGTH = 18;
export const PASSPORT_NUMBER_MAX_LENGTH = 12;
export const FULL_NAME_MAX_LENGTH = 100;
export const OCCUPATION_MAX_LENGTH = 100;
export const PASSPORT_TYPE_MAX_LENGTH = 100;
export const PLACE_OF_ISSUE_MAX_LENGTH = 100;
export const CONTACT_TEXT_MAX_LENGTH = 100;
export const CONTACT_NUMBER_MAX_LENGTH = 15;
export const STREET_MAX_LENGTH = 1000;

const ASCII_PUNCTUATION_PATTERN = "!-/:-@\\[-`{-~";
const ARABIC_TEXT_REGEX =
  /^(?=.*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/;
const ARABIC_LETTERS_REGEX =
  /^(?=.*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/;
const ENGLISH_LETTERS_REGEX = /^[A-Za-z\s]+$/;
const ENGLISH_FULL_NAME_REGEX = new RegExp(
  `^[A-Za-z0-9\\s${ASCII_PUNCTUATION_PATTERN}]+$`,
);
const ENGLISH_FULL_NAME_ALLOWED_REGEX = new RegExp(
  `[^A-Za-z0-9\\s${ASCII_PUNCTUATION_PATTERN}]`,
  "g",
);
const PASSPORT_NUMBER_REGEX = /^[A-Za-z0-9]+$/;
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DETAIL_FIELDS_BY_TYPE: Record<
  IdSelectorType,
  Array<keyof IDSelectorValue>
> = {
  emiratesId: [
    "fullNameArabic",
    "fullNameEnglish",
    "nationality",
    "gender",
    "occupation",
    "emiratesIdexpiryDate",
    "PersonalPhoto",
    "EmiratesID",
  ],
  uid: [
    "fullNameArabic",
    "fullNameEnglish",
    "nationality",
    "gender",
    "occupation",
    "passportExpiryDate",
    "visaExpiryDate",
    "PersonalPhoto",
    "Passport",
    "Visa",
  ],
  passport: [
    "passportType",
    "placeOfIssueEn",
    "placeOfIssueAr",
    "fullNameArabic",
    "fullNameEnglish",
    "nationality",
    "gender",
    "occupation",
    "passportExpiryDate",
    "emirateId",
    "regionId",
    "areaId",
    "street",
    "mobileNo",
    "mobileNoCountryCode",
    "mobileNoLocalNumber",
    "telephoneNo",
    "fax",
    "workNo",
    "areaCode",
    "emailAddress",
    "PersonalPhoto",
    "PassportScan",
  ],
};

export const buildIdSelectorTypeChangeValue = (
  type: IdSelectorType,
  initialValue?: IDSelectorValue,
): IDSelectorValue => {
  const nextValue: IDSelectorValue = { type };

  if (!initialValue) return nextValue;

  DETAIL_FIELDS_BY_TYPE[type].forEach((fieldName) => {
    const value = initialValue[fieldName];
    if (value !== undefined) {
      nextValue[fieldName] = value as never;
    }
  });

  return nextValue;
};

const RUNTIME_FIELDS_BY_TYPE: Record<
  IdSelectorType,
  Array<keyof IDSelectorValue>
> = {
  emiratesId: ["dateOfBirth", "emiratesId", ...DETAIL_FIELDS_BY_TYPE.emiratesId],
  uid: ["dateOfBirth", "uid", ...DETAIL_FIELDS_BY_TYPE.uid],
  passport: ["dateOfBirth", "passportNumber", ...DETAIL_FIELDS_BY_TYPE.passport],
};

export const normalizeIdSelectorRuntimeValue = (
  value: IDSelectorValue | undefined,
  runtimeType: IdSelectorType | null | undefined,
): IDSelectorValue | undefined => {
  if (runtimeType === undefined) return value;
  if (runtimeType === null) return undefined;

  const source = value || {};
  const nextValue: IDSelectorValue = { type: runtimeType };

  RUNTIME_FIELDS_BY_TYPE[runtimeType].forEach((fieldName) => {
    const fieldValue = source[fieldName];
    if (fieldValue !== undefined) {
      nextValue[fieldName] = fieldValue as never;
    }
  });

  if (source.type === runtimeType) {
    if (source._icpLookupType === runtimeType) {
      nextValue._icpLookupType = source._icpLookupType;
    }
    if (source._icpLookupSignature !== undefined) {
      nextValue._icpLookupSignature = source._icpLookupSignature;
    }
  }

  return nextValue;
};

export const ICP_LOCKED_DETAIL_FIELDS_BY_TYPE: Record<
  IdSelectorType,
  Array<keyof IDSelectorValue>
> = {
  emiratesId: [
    "fullNameArabic",
    "fullNameEnglish",
    "nationality",
    "gender",
    "occupation",
    "emiratesIdexpiryDate",
  ],
  uid: [
    "fullNameArabic",
    "fullNameEnglish",
    "nationality",
    "gender",
    "occupation",
    "passportExpiryDate",
    "visaExpiryDate",
  ],
  passport: [],
};

export const SUB_FIELD_NAMES: Array<keyof IDSelectorValue> = [
  "dateOfBirth",
  "emiratesId",
  "uid",
  "passportNumber",
  "passportType",
  "placeOfIssueEn",
  "placeOfIssueAr",
  "fullNameArabic",
  "fullNameEnglish",
  "nationality",
  "gender",
  "occupation",
  "emiratesIdexpiryDate",
  "passportExpiryDate",
  "visaExpiryDate",
  "emirateId",
  "regionId",
  "areaId",
  "street",
  "mobileNo",
  "mobileNoCountryCode",
  "mobileNoLocalNumber",
  "telephoneNo",
  "fax",
  "workNo",
  "areaCode",
  "emailAddress",
  "PersonalPhoto",
  "EmiratesID",
  "Passport",
  "Visa",
  "PassportScan",
];

export const INITIAL_LOOKUP_STATE_MAP: LookupStateMap = {
  emiratesId: { status: "idle" },
  uid: { status: "idle" },
  passport: { status: "idle" },
};

export const formatUidInput = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, UID_MAX_LENGTH);
};

export const validateEmiratesId = (val: string): string => {
  const msg = i18n.t("IDSelector.validation.validEmiratesId");
  if (!val || !val.trim()) return msg;
  const trimmedValue = val.trim();
  if (trimmedValue.length > EMIRATES_ID_MAX_LENGTH) return msg;
  const digitsOnly = trimmedValue.replace(/\D/g, "");
  return EMIRATES_ID_REGEX.test(digitsOnly) ? "" : msg;
};

export const validateUid = (val: string): string => {
  if (!val || !val.trim()) return i18n.t("IDSelector.validation.enterUid");
  const digitsOnly = val.replace(/\D/g, "");
  if (digitsOnly.length === 0) return i18n.t("IDSelector.validation.uidDigits", { max: UID_MAX_LENGTH });
  if (digitsOnly.length > UID_MAX_LENGTH) return i18n.t("IDSelector.validation.uidDigits", { max: UID_MAX_LENGTH });
  return "";
};

export const validatePassportNumber = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.enterPassportNumber");
  if (trimmed.length > PASSPORT_NUMBER_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.passportMaxChars", { max: PASSPORT_NUMBER_MAX_LENGTH });
  }
  if (!PASSPORT_NUMBER_REGEX.test(trimmed)) {
    return i18n.t("IDSelector.validation.passportAlphaNumeric");
  }
  return "";
};

export const validateArabicFullName = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.fullNameArabicRequired");
  if (trimmed.length > FULL_NAME_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.fullNameArabicMaxChars", { max: FULL_NAME_MAX_LENGTH });
  }
  return ARABIC_TEXT_REGEX.test(trimmed) ? "" : i18n.t("IDSelector.validation.arabicOnly");
};

export const validateEnglishFullName = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.fullNameEnglishRequired");
  if (trimmed.length > FULL_NAME_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.fullNameEnglishMaxChars", { max: FULL_NAME_MAX_LENGTH });
  }
  return ENGLISH_FULL_NAME_REGEX.test(trimmed)
    ? ""
    : i18n.t("IDSelector.validation.englishOnly");
};

export const validateOccupation = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.enterOccupation");
  if (trimmed.length > OCCUPATION_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.occupationMaxChars", { max: OCCUPATION_MAX_LENGTH });
  }
  return "";
};

export const normalizeEnglishFullNameInput = (value: string): string => {
  return String(value || "")
    .replace(ENGLISH_FULL_NAME_ALLOWED_REGEX, "")
    .slice(0, FULL_NAME_MAX_LENGTH);
};

export const normalizeArabicFullNameInput = (value: string): string => {
  return String(value || "")
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "")
    .slice(0, FULL_NAME_MAX_LENGTH);
};

export const normalizeEnglishLettersInput = (value: string): string => {
  return String(value || "")
    .replace(/[^A-Za-z\s]/g, "")
    .slice(0, PLACE_OF_ISSUE_MAX_LENGTH);
};

export const normalizePassportNumberInput = (value: string): string => {
  return String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, PASSPORT_NUMBER_MAX_LENGTH);
};

export const normalizeArabicLettersInput = (value: string): string => {
  return String(value || "")
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "")
    .slice(0, PLACE_OF_ISSUE_MAX_LENGTH);
};

export const normalizeDigitsInput = (
  value: string,
  maxLength = CONTACT_NUMBER_MAX_LENGTH,
): string => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
};

export const validatePassportType = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.passportTypeRequired");
  if (trimmed.length > PASSPORT_TYPE_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.passportTypeMaxChars", {
      max: PASSPORT_TYPE_MAX_LENGTH,
    });
  }
  return "";
};

export const validatePlaceOfIssueEn = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.placeOfIssueEnRequired");
  if (trimmed.length > PLACE_OF_ISSUE_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.placeOfIssueEnMaxChars", {
      max: PLACE_OF_ISSUE_MAX_LENGTH,
    });
  }
  return ENGLISH_LETTERS_REGEX.test(trimmed)
    ? ""
    : i18n.t("IDSelector.validation.placeOfIssueEnEnglishOnly");
};

export const validatePlaceOfIssueAr = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.placeOfIssueArRequired");
  if (trimmed.length > PLACE_OF_ISSUE_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.placeOfIssueArMaxChars", {
      max: PLACE_OF_ISSUE_MAX_LENGTH,
    });
  }
  return ARABIC_LETTERS_REGEX.test(trimmed)
    ? ""
    : i18n.t("IDSelector.validation.placeOfIssueArArabicOnly");
};

export const validateStreet = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.enterStreet");
  if (trimmed.length > STREET_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.streetMaxChars", {
      max: STREET_MAX_LENGTH,
    });
  }
  return "";
};

const validateNumericContactField = (
  val: string,
  requiredKey: string,
): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t(requiredKey);
  if (!/^\d+$/.test(trimmed) || trimmed.length > CONTACT_NUMBER_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.contactDigits", {
      max: CONTACT_NUMBER_MAX_LENGTH,
    });
  }
  return "";
};

export const validateTelephoneNo = (val: string): string =>
  validateNumericContactField(val, "IDSelector.validation.enterTelephoneNo");

export const validateFax = (val: string): string =>
  validateNumericContactField(val, "IDSelector.validation.enterFax");

export const validateWorkNo = (val: string): string =>
  validateNumericContactField(val, "IDSelector.validation.enterWorkNo");

export const validateAreaCode = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.areaCodeRequired");
  if (trimmed.length > CONTACT_TEXT_MAX_LENGTH) {
    return i18n.t("IDSelector.validation.areaCodeMaxChars", {
      max: CONTACT_TEXT_MAX_LENGTH,
    });
  }
  return "";
};

export const validateEmailAddress = (val: string): string => {
  const trimmed = String(val || "").trim();
  if (!trimmed) return i18n.t("IDSelector.validation.emailAddressRequired");
  return EMAIL_ADDRESS_REGEX.test(trimmed)
    ? ""
    : i18n.t("IDSelector.validation.invalidEmailAddress");
};

const requiredMessage =
  (messageKey: string) =>
  (value: unknown): string =>
    !value ? i18n.t(messageKey) : "";

export const getIdSelectorValidatorRules = (
  type: IdSelectorType,
  hasDetails: boolean,
  currentValue?: IDSelectorValue,
  enablePassportExtendedFields = false,
): IdSelectorRuleMap => {
  const requiredDate = requiredMessage("IDSelector.common.datePlaceholder");
  const requiredDateOfBirth = requiredMessage("IDSelector.validation.required");
  const requiredNationality = requiredMessage("IDSelector.validation.selectNationality");
  const requiredGender = requiredMessage("IDSelector.validation.selectGender");
  const requiredFile = requiredMessage("IDSelector.validation.required");

  const baseRules: Record<IdSelectorType, IdSelectorRuleMap> = {
    emiratesId: {
      dateOfBirth: requiredDateOfBirth,
      emiratesId: (value) => validateEmiratesId(String(value || "")),
    },
    uid: {
      dateOfBirth: requiredDateOfBirth,
      uid: (value) => validateUid(String(value || "")),
    },
    passport: {
      dateOfBirth: requiredDateOfBirth,
      passportNumber: (value) => validatePassportNumber(String(value || "")),
    },
  };

  if (!hasDetails) return baseRules[type];

  const detailRules: Record<IdSelectorType, IdSelectorRuleMap> = {
    emiratesId: {
      fullNameArabic: (value) => validateArabicFullName(String(value || "")),
      fullNameEnglish: (value) => validateEnglishFullName(String(value || "")),
      nationality: requiredNationality,
      gender: requiredGender,
      occupation: (value) => validateOccupation(String(value || "")),
      emiratesIdexpiryDate: requiredDate,
      PersonalPhoto: requiredFile,
      EmiratesID: requiredFile,
    },
    uid: {
      fullNameArabic: (value) => validateArabicFullName(String(value || "")),
      fullNameEnglish: (value) => validateEnglishFullName(String(value || "")),
      nationality: requiredNationality,
      gender: requiredGender,
      occupation: (value) => validateOccupation(String(value || "")),
      passportExpiryDate: requiredDate,
      visaExpiryDate: requiredDate,
      PersonalPhoto: requiredFile,
      Passport: requiredFile,
      Visa: requiredFile,
    },
    passport: {
      fullNameArabic: (value) => validateArabicFullName(String(value || "")),
      fullNameEnglish: (value) => validateEnglishFullName(String(value || "")),
      nationality: requiredNationality,
      gender: requiredGender,
      occupation: (value) => validateOccupation(String(value || "")),
      passportExpiryDate: requiredDate,
      PersonalPhoto: requiredFile,
      PassportScan: requiredFile,
    },
  };

  if (enablePassportExtendedFields) {
    detailRules.passport = {
      ...detailRules.passport,
      passportType: (value) => validatePassportType(String(value || "")),
      placeOfIssueEn: (value) => validatePlaceOfIssueEn(String(value || "")),
      placeOfIssueAr: (value) => validatePlaceOfIssueAr(String(value || "")),
      emirateId: requiredMessage("IDSelector.validation.selectEmirate"),
      regionId: (value) =>
        Number(currentValue?.emirateId) === 1
          ? requiredMessage("IDSelector.validation.selectRegion")(value)
          : "",
      areaId: requiredMessage("IDSelector.validation.selectArea"),
      street: (value) => validateStreet(String(value || "")),
      mobileNo: (value) => {
        if (!currentValue?.mobileNoLocalNumber && value) return "";
        const validation = validateMobileNumber({
          countryCode: String(
            currentValue?.mobileNoCountryCode || DEFAULT_COUNTRY_DIAL_CODE,
          ),
          phoneNumber: String(currentValue?.mobileNoLocalNumber || value || ""),
        });
        if (validation.isValid) return "";
        return validation.errorCode === "REQUIRED"
          ? i18n.t("IDSelector.validation.enterMobileNo")
          : validation.message;
      },
      telephoneNo: (value) => validateTelephoneNo(String(value || "")),
      fax: (value) => validateFax(String(value || "")),
      workNo: (value) => validateWorkNo(String(value || "")),
      areaCode: (value) => validateAreaCode(String(value || "")),
      emailAddress: (value) => validateEmailAddress(String(value || "")),
    };
  }

  return {
    ...baseRules[type],
    ...detailRules[type],
  };
};

export const disableFutureDate = (currentDate: moment.Moment | null) => {
  if (!currentDate) return false;
  return currentDate.isAfter(moment().endOf("day"));
};

export const disablePastDate = (currentDate: moment.Moment | null) => {
  if (!currentDate) return false;
  return currentDate.isBefore(moment().startOf("day"));
};

export const getErrorMessage = (
  error: unknown,
  fallback = i18n.t("IDSelector.validation.loadFailed"),
) => {
  const rawMessage = (error as { message?: unknown })?.message;
  if (typeof rawMessage === "string") {
    const normalizedMessage = rawMessage.trim();
    if (
      normalizedMessage &&
      normalizedMessage.toLowerCase() !== "true" &&
      normalizedMessage.toLowerCase() !== "false"
    ) {
      return normalizedMessage;
    }
  }
  const responseMessage = (
    error as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage.trim();
  }
  return fallback;
};

export const getAvailableOptions = ({
  showEmiratesId = true,
  showUID = false,
  showPassport = false,
}: Pick<
  IDSelectorFieldProps,
  "showEmiratesId" | "showUID" | "showPassport"
>): IDSelectorOption[] => {
  return ID_OPTIONS.filter((opt) => {
    if (opt.value === "emiratesId") return showEmiratesId !== false;
    if (opt.value === "uid") return showUID === true;
    if (opt.value === "passport") return showPassport === true;
    return true;
  });
};

export const resolveCurrentType = (
  value: IDSelectorValue,
  options: IDSelectorOption[],
): IdSelectorType => {
  const type = value.type;
  if (type && options.some((option) => option.value === type)) {
    return type;
  }
  return options[0]?.value ?? "emiratesId";
};

export const hasIcpLockedDetails = (
  type: IdSelectorType,
  value: IDSelectorValue,
) => {
  if (type === "passport") return false;
  if (!value.dateOfBirth || !value[QUERY_FIELD_BY_TYPE[type]]) return false;
  return ICP_LOCKED_DETAIL_FIELDS_BY_TYPE[type].some(
    (fieldName) => !!value[fieldName],
  );
};

export const attachIcpLookupMetadata = (
  type: IdSelectorType,
  value: IDSelectorValue,
): IDSelectorValue => {
  if (!hasIcpLockedDetails(type, value)) return value;
  return {
    ...value,
    _icpLookupType: type,
    _icpLookupSignature: getQuerySignature(type, value),
  };
};

export const restoreIcpLookupMetadata = (
  value: IDSelectorValue,
): IDSelectorValue => {
  const type = value.type;
  if (type !== "emiratesId" && type !== "uid") return value;
  return attachIcpLookupMetadata(type, value);
};

export const stripIcpLookupMetadata = <T extends IDSelectorValue>(value: T): T => {
  const nextValue = { ...value };
  delete nextValue._icpLookupType;
  delete nextValue._icpLookupSignature;
  return nextValue as T;
};

export const getShowList = (
  type: IdSelectorType,
  lookupState: LookupState,
  value: IDSelectorValue,
) => {
  const hasIdentifier = !!value[QUERY_FIELD_BY_TYPE[type]];

  if (type === "passport") {
    return hasIdentifier;
  }
  return hasIdentifier && isLookupFresh(type, lookupState, value);
};

export const mapIcpGender = (descriptionEnglish?: string) => {
  const genderEnglish = String(descriptionEnglish || "").toLowerCase();
  if (genderEnglish === "male") return "male";
  if (genderEnglish === "female") return "female";
  return undefined;
};

export const mapIcpNationalityId = (
  nationalityId: number | undefined,
  nationalityList: NationalityOption[],
) => {
  return nationalityList.find(
    (nationality) =>
      String(nationality.numericCode) === String(nationalityId ?? ""),
  )?.id;
};

export const formatIcpDate = (value?: string) => {
  return value ? moment(value).format("YYYY-MM-DD") : undefined;
};

export const mergeIcpProfileIntoValue = (
  type: IdSelectorType,
  currentValue: IDSelectorValue,
  personProfile: IcpPersonProfile,
  nationalityList: NationalityOption[],
): IDSelectorValue => {
  const mappedGender = mapIcpGender(personProfile.gender?.descriptionEnglish);
  const mappedNationalityId = mapIcpNationalityId(
    personProfile.nationality?.id,
    nationalityList,
  );

  if (type === "emiratesId") {
    return attachIcpLookupMetadata(type, {
      ...currentValue,
      type,
      dateOfBirth: formatIcpDate(personProfile.birthDate) || currentValue.dateOfBirth,
      fullNameArabic:
        personProfile.personName?.fullNameArabic || currentValue.fullNameArabic,
      fullNameEnglish:
        personProfile.personName?.fullNameEnglish || currentValue.fullNameEnglish,
      nationality: mappedNationalityId ?? currentValue.nationality ?? undefined,
      gender: mappedGender || currentValue.gender,
      occupation:
        personProfile.occupation?.descriptionEnglish || currentValue.occupation,
      emiratesIdexpiryDate:
        formatIcpDate(personProfile.identityCard?.expiryDate) ||
        currentValue.emiratesIdexpiryDate,
    });
  }

  if (type === "uid") {
    return attachIcpLookupMetadata(type, {
      ...currentValue,
      type,
      uid: personProfile.unifiedNumber || currentValue.uid,
      dateOfBirth: formatIcpDate(personProfile.birthDate) || currentValue.dateOfBirth,
      emiratesId: personProfile.identityCard?.emiratesId || currentValue.emiratesId,
      fullNameArabic:
        personProfile.personName?.fullNameArabic || currentValue.fullNameArabic,
      fullNameEnglish:
        personProfile.personName?.fullNameEnglish || currentValue.fullNameEnglish,
      nationality: mappedNationalityId ?? currentValue.nationality ?? undefined,
      gender: mappedGender || currentValue.gender,
      occupation:
        personProfile.occupation?.descriptionEnglish || currentValue.occupation,
      passportNumber:
        personProfile.passport?.passportNo || currentValue.passportNumber,
      passportExpiryDate:
        formatIcpDate(personProfile.passport?.expiryDate) ||
        currentValue.passportExpiryDate,
      visaExpiryDate:
        formatIcpDate(personProfile.identityCard?.expiryDate) ||
        currentValue.visaExpiryDate,
    });
  }

  return {
    ...currentValue,
    type,
    passportNumber:
      personProfile.passport?.passportNo || currentValue.passportNumber,
    dateOfBirth: formatIcpDate(personProfile.birthDate) || currentValue.dateOfBirth,
    fullNameArabic:
      personProfile.personName?.fullNameArabic || currentValue.fullNameArabic,
    fullNameEnglish:
      personProfile.personName?.fullNameEnglish || currentValue.fullNameEnglish,
    nationality: mappedNationalityId ?? currentValue.nationality ?? undefined,
    gender: mappedGender || currentValue.gender,
    occupation:
      personProfile.occupation?.descriptionEnglish || currentValue.occupation,
    passportExpiryDate:
      formatIcpDate(personProfile.passport?.expiryDate) ||
      currentValue.passportExpiryDate,
  };
};

export const getQueryValidationErrors = (
  type: IdSelectorType,
  value: IDSelectorValue,
) => {
  const errors: Partial<Record<keyof IDSelectorValue, string>> = {};

  if (!value.dateOfBirth) {
    errors.dateOfBirth = i18n.t("IDSelector.validation.required");
  }

  if (type === "emiratesId") {
    const message = validateEmiratesId(String(value.emiratesId || ""));
    if (message) errors.emiratesId = message;
  } else if (type === "uid") {
    const message = validateUid(String(value.uid || ""));
    if (message) errors.uid = message;
  } else if (type === "passport") {
    const message = validatePassportNumber(String(value.passportNumber || ""));
    if (message) errors.passportNumber = message;
  }

  return errors;
};
