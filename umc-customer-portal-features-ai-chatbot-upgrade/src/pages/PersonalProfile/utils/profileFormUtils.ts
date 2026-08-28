import moment, { type Moment } from "moment";
import type {
  AddUserProfileIndividualParams,
  UpdateUserProfileIndividualParams,
} from "@/services/userProfile";
import {
  getIndividualRequiredFields,
  normalizeVerificationMethod,
  type VerificationMethod,
} from "@/utils/individualIdentity";
import type { IcpAddressContactInfo } from "./icpPersonToForm";
import { buildCoordinateParams } from "@/utils/addressCoordinates";
import { combineInternationalMobileNumber } from "@/components/common/MobileNumberInput";
export interface PersonalProfileMobileNumberValue {
  mobileCountryCode: string;
  mobileLocalNumber: string;
  mobileFullNumber?: string;
}

export interface PersonalProfileFormValues {
  verificationMethod?: VerificationMethod;
  dateOfBirth?: Moment | string | null;
  emiratesId?: string;
  uidNumber?: string;
  passportNumber?: string;
  fullNameAr?: string;
  fullNameEn?: string;
  nationalityId?: number;
  gender?: number;
  occupation?: string;
  emiratesIdExpiryDate?: Moment | string | null;
  passportExpiryDate?: Moment | string | null;
  visaExpiryDate?: Moment | string | null;
  personalPhotoUrl?: string;
  emiratesIdUrl?: string;
  passportUrl?: string;
  visaUrl?: string;
  passportScanUrl?: string;
  eidDocumentOrPassPortSacnUrl?: string;
  addressEmirate?: number | string;
  addressRegion?: number | string;
  addressArea?: number | string;
  addressStreet?: string;
  addressLatitude?: number;
  addressLongitude?: number;
  mobileNumber?: PersonalProfileMobileNumberValue;
}

export type PersonalProfileDetail = Record<string, any>;

export type PersonalProfileSubmitPayload =
  AddUserProfileIndividualParams & Record<string, unknown>;

export interface PersonalProfileSubmitOptions {
  isGethirdPartyApi?: boolean;
  icpAddressContact?: IcpAddressContactInfo;
}

/**
 * Returns the list of required form field names for the given verification method.
 */
export function getRequiredFields(verificationMethod: number): string[] {
  return getIndividualRequiredFields(normalizeVerificationMethod(verificationMethod), {
    includeAddress: true,
  });
}

function formatDateForApi(value: Moment | string | null | undefined): string {
  if (!value) return "";
  if (moment.isMoment(value)) {
    return value.isValid() ? value.format("YYYY-MM-DD") : "";
  }
  return String(value);
}

function formatOptionalDateEndOfDayForApi(
  value: Moment | string | null | undefined,
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

function valueOrEmpty(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}


function getPassportCopyUrl(
  values: PersonalProfileFormValues,
  verificationMethod: VerificationMethod,
): string {
  if (verificationMethod === 3) return valueOrEmpty(values.passportScanUrl);
  return valueOrEmpty(values.passportUrl);
}

export function buildSubmitParams(
  values: PersonalProfileFormValues,
  userInfo: any,
  options?: PersonalProfileSubmitOptions,
): PersonalProfileSubmitPayload {
  const verificationMethod = normalizeVerificationMethod(values.verificationMethod);
  const dateOfBirth = formatDateForApi(values.dateOfBirth);
  const emiratesIdExpiryDate = formatOptionalDateEndOfDayForApi(
    values.emiratesIdExpiryDate,
  );
  const passportExpiryDate = formatOptionalDateEndOfDayForApi(
    values.passportExpiryDate,
  );
  const visaExpiryDate = formatOptionalDateEndOfDayForApi(
    values.visaExpiryDate,
  );
  const emirateId = valueOrEmpty(values.addressEmirate);
  const regionId = valueOrEmpty(values.addressRegion);
  const areaId = valueOrEmpty(values.addressArea);
  const passportCopyUrl = getPassportCopyUrl(values, verificationMethod);
  const email = options?.icpAddressContact?.email || userInfo?.email || "";
  const fallbackMobileNumber = String(
    options?.icpAddressContact?.mobileNumber || userInfo?.phoneNumber || "",
  ).trim();
  const formMobileNumber = values.mobileNumber;
  const isFormMobileNumberObject = Boolean(
    formMobileNumber &&
      typeof formMobileNumber === "object" &&
      !Array.isArray(formMobileNumber),
  );
  const formMobileCountryCode = String(
    isFormMobileNumberObject ? formMobileNumber?.mobileCountryCode : "",
  ).trim();
  const formMobileLocalNumber = String(
    isFormMobileNumberObject ? formMobileNumber?.mobileLocalNumber : "",
  ).trim();
  const formMobileFullNumber = String(
    isFormMobileNumberObject ? formMobileNumber?.mobileFullNumber : "",
  );
  const serializedMobileNumber = (() => {
    if (!isFormMobileNumberObject) {
      return {
        fullNumber: fallbackMobileNumber,
        countryCode: "",
        localNumber: "",
      };
    }

    if (!formMobileLocalNumber) {
      return { fullNumber: "", countryCode: "", localNumber: "" };
    }

    if (!formMobileCountryCode) {
      return {
        fullNumber: formMobileFullNumber || formMobileLocalNumber,
        countryCode: "",
        localNumber: "",
      };
    }

    const fullNumber = combineInternationalMobileNumber(
      formMobileCountryCode,
      formMobileLocalNumber,
    );
    return {
      fullNumber,
      countryCode: `+${formMobileCountryCode.replace(/\D/g, "")}`,
      localNumber: formMobileLocalNumber.replace(/\D/g, ""),
    };
  })();

  return {
    userId: userInfo?.id || "",
    userTypeId: verificationMethod,
    verifyMethod: verificationMethod,
    dataOfBirth: dateOfBirth,
    dateOfBirth,
    passportNumber: valueOrEmpty(values.passportNumber),
    email,
    mobileNumber: serializedMobileNumber.fullNumber,
    mobileCountryCode: serializedMobileNumber.countryCode,
    mobileLocalNumber: serializedMobileNumber.localNumber,
    emiratesId: valueOrEmpty(values.emiratesId),
    uid: valueOrEmpty(values.uidNumber),
    fullNameAr: valueOrEmpty(values.fullNameAr),
    fullNameEn: valueOrEmpty(values.fullNameEn),
    fullNameArabic: valueOrEmpty(values.fullNameAr),
    fullNameEnglish: valueOrEmpty(values.fullNameEn),
    nationalityId: values.nationalityId || 1023,
    nationality: values.nationalityId || 1023,
    genderId: Number(values.gender) === 1 ? 1 : 2,
    occupation: valueOrEmpty(values.occupation),
    personalPhotoUrl: valueOrEmpty(values.personalPhotoUrl),
    emiratesIdexpiryDate: emiratesIdExpiryDate,
    passportExpiryDate,
    visaExpiryDate,
    emiratesIdCopyUrl: valueOrEmpty(values.emiratesIdUrl),
    passportCopyUrl,
    visaCopyUrl: valueOrEmpty(values.visaUrl),
    eidDocumentOrPassPortSacnUrl:
      valueOrEmpty(values.eidDocumentOrPassPortSacnUrl) ||
      (verificationMethod === 1
        ? valueOrEmpty(values.emiratesIdUrl)
        : passportCopyUrl),
    emirateId,
    regionId,
    areaId,
    emirateID: emirateId,
    regionID: regionId,
    areaID: areaId,
    street: valueOrEmpty(values.addressStreet),
    ...buildCoordinateParams(values),
    licenseExpiryDate: "",
    ...(options?.isGethirdPartyApi !== undefined
      ? { isGethirdPartyApi: options.isGethirdPartyApi }
      : {}),
  } as unknown as PersonalProfileSubmitPayload;
}

export function buildUpdateSubmitParams(
  values: PersonalProfileFormValues,
  userInfo: any,
  profileData: PersonalProfileDetail,
  options?: PersonalProfileSubmitOptions,
): UpdateUserProfileIndividualParams & Record<string, unknown> {
  return {
    ...buildSubmitParams(values, userInfo, options),
    proFileId: profileData.proFileId,
  } as unknown as UpdateUserProfileIndividualParams & Record<string, unknown>;
}

export function buildAddressUpdateParams(
  profileData: PersonalProfileDetail,
  values: Pick<
    PersonalProfileFormValues,
    | "addressEmirate"
    | "addressRegion"
    | "addressArea"
    | "addressStreet"
    | "addressLatitude"
    | "addressLongitude"
  >,
): UpdateUserProfileIndividualParams & Record<string, unknown> {
  const verificationMethod = normalizeVerificationMethod(profileData.type);
  const emirateId = Number(values.addressEmirate) || 0;
  const regionId = Number(values.addressRegion) || 0;
  const areaId = Number(values.addressArea) || 0;

  return {
    ...profileData,
    proFileId: profileData.proFileId,
    userId: profileData.userId || "",
    userTypeId: profileData.userTypeId || verificationMethod,
    verifyMethod: profileData.verifyMethod || verificationMethod,
    type: String(verificationMethod),
    emirateId,
    regionId,
    areaId,
    emirateID: emirateId,
    regionID: regionId,
    areaID: areaId,
    street: values.addressStreet || "",
    // Overrides any pin spread in from profileData: the form is the newer truth,
    // including when the user has just cleared it.
    ...buildCoordinateParams(values),
  } as unknown as UpdateUserProfileIndividualParams & Record<string, unknown>;
}

/** @deprecated Use verificationMethod. */
export { normalizeVerificationMethod as normalizeVerifyMethod };
