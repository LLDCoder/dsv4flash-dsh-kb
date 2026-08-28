import { nowGst, toApi } from "@/utils/gstTime";
import type {
  Service8007ExternalMediaAccountBinding,
  Service8007GuardianProfile,
  Service8007ManagerProfile,
  Service8007RuleStrategyValidatePayload,
} from "@/services/services";
import { getNationalityList, type NationalityInfo } from "@/services/userProfile";
import get from "lodash/get";
import { type BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";

const SERVICE_8007_RULE_VERSION = "1.0.0";
const SERVICE_8007_ACTIVITY_ID = 63;

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);

const coerceString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "no") return false;
  }
  return undefined;
};

const resolveUploadUrl = (value: unknown): string | undefined => {
  if (typeof value === "string") return coerceString(value);
  if (Array.isArray(value)) return resolveUploadUrl(value[0]);
  if (value && typeof value === "object") {
    return coerceString(
      getFirstDefined([
        get(value, "url"),
        get(value, "fileUrl"),
        get(value, "path"),
        get(value, "response.data"),
        get(value, "response.url"),
        get(value, "name"),
      ]),
    );
  }
  return undefined;
};

const resolveTermsAgreed = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTableSingle.terms.isAgreed"),
          get(formValues, "termsAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

const resolveSocialTermsAgreed = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTableSingle.socialTermsAgreed"),
          get(formValues, "SelectTableSingle.terms.isAgreedSocial"),
          get(formValues, "socialTermsAgreed"),
          get(formValues, "terms.isAgreedSocial"),
        ]),
      ),
    ) ?? true
  );
};

const resolveUseDefaultManagerProfile = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const explicitBoolean = coerceBoolean(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "managesSocialMedia"),
        get(formValues, "socialMediaManager.managesSocialMedia"),
      ]),
    ),
  );

  if (explicitBoolean !== undefined) return explicitBoolean;

  const managesSocialMedia = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "socialMediaManager.managesSocialMedia"),
        get(formValues, "managesSocialMedia"),
      ]),
    ),
  )?.toLowerCase();

  if (managesSocialMedia === "yes") return true;
  if (managesSocialMedia === "no") return false;

  return true;
};

const resolveManagerProfile = (
  formValuesList: Array<Record<string, unknown>>,
): Service8007ManagerProfile | undefined => {
  const managerSelector = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "socialMediaManager.idSelector"),
      get(formValues, "idSelector"),
    ]),
  ) as Record<string, unknown> | undefined;

  if (!managerSelector || typeof managerSelector !== "object") {
    return undefined;
  }

  return {
    fullNameEnglish: coerceString(get(managerSelector, "fullNameEnglish")),
    fullNameArabic: coerceString(get(managerSelector, "fullNameArabic")),
    nationalityId: coerceNumber(get(managerSelector, "nationality")),
    occupation: coerceString(get(managerSelector, "occupation")),
    dateOfBirth: coerceString(get(managerSelector, "dateOfBirth")),
    gender: coerceString(get(managerSelector, "gender")),
    emiratesId: coerceString(get(managerSelector, "emiratesId")),
    uid: coerceString(get(managerSelector, "uid")),
    passportNumber: coerceString(get(managerSelector, "passportNumber")),
    photoUrl: resolveUploadUrl(get(managerSelector, "PersonalPhoto")),
    emiratesIdCopyUrl: resolveUploadUrl(get(managerSelector, "EmiratesID")),
    passportCopyUrl: resolveUploadUrl(
      getFirstDefined([
        get(managerSelector, "Passport"),
        get(managerSelector, "PassportScan"),
      ]),
    ),
    visaCopyUrl: resolveUploadUrl(get(managerSelector, "Visa")),
  };
};

const resolveGuardianValue = (formValuesList: Array<Record<string, unknown>>) => {
  return formValuesList
    .map((formValues) =>
      getFirstDefined([
        get(formValues, "guardianProfile"),
        get(formValues, "guardianConsentDetails"),
        get(formValues, "guardianDetails"),
        get(formValues, ["Please fill the form"]),
      ]),
    )
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;
};

const resolveNationalityCode = (
  nationalityList: NationalityInfo[],
  value: unknown,
) => {
  const directCode = coerceString(value);
  if (directCode && /[A-Za-z]{2,3}/.test(directCode)) return directCode.toUpperCase();

  const nationalityId = coerceNumber(value);
  if (nationalityId === undefined) return undefined;

  return nationalityList.find((item) => item.id === nationalityId)?.isocode2?.toUpperCase();
};

const resolveMobileNumber = (value: unknown) => {
  const normalized = coerceString(value);
  if (!normalized) return undefined;
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
};

const resolveGuardianProfile = (
  formValuesList: Array<Record<string, unknown>>,
  nationalityList: NationalityInfo[],
): Service8007GuardianProfile | undefined => {
  const guardianValue = resolveGuardianValue(formValuesList);
  if (!guardianValue) return undefined;

  const profile: Service8007GuardianProfile = {
    fullName: coerceString(get(guardianValue, "fullName")),
    passportNumber: coerceString(get(guardianValue, "passportNumber")),
    nationality: resolveNationalityCode(
      nationalityList,
      getFirstDefined([
        get(guardianValue, "nationality"),
        get(guardianValue, "nationalityId"),
      ]),
    ),
    dateOfBirth: coerceString(
      getFirstDefined([
        get(guardianValue, "dateOfBirth"),
        get(guardianValue, "guardianDateOfBirth"),
      ]),
    ),
    emailAddress: coerceString(
      getFirstDefined([get(guardianValue, "emailAddress"), get(guardianValue, "email")]),
    ),
    mobileNumber: resolveMobileNumber(
      getFirstDefined([get(guardianValue, "mobileNumber"), get(guardianValue, "phoneNumber")]),
    ),
    gender: coerceString(get(guardianValue, "gender")),
    occupation: coerceString(get(guardianValue, "occupation")),
  };

  return Object.values(profile).some((value) => isFilledValue(value)) ? profile : undefined;
};

const resolveLegalAgeProofUploaded = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const guardianValue = resolveGuardianValue(formValuesList);

  const explicitBoolean = guardianValue?.consentFile ? true: false;

  if (explicitBoolean !== undefined) return explicitBoolean;

  return !!resolveUploadUrl(
    getFirstDefined([
      guardianValue ? get(guardianValue, "consentFile") : undefined,
      guardianValue ? get(guardianValue, "legalAgeProofFile") : undefined,
      guardianValue ? get(guardianValue, "uploadLegalAgeProof") : undefined,
      ...formValuesList.flatMap((formValues) => [
        get(formValues, "legalAgeProofFile"),
        get(formValues, "uploadLegalAgeProof"),
      ]),
    ]),
  );
};

const resolveExternalMediaAccounts = (
  formValuesList: Array<Record<string, unknown>>,
): Service8007ExternalMediaAccountBinding[] => {
  const rawAccounts = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "socialMediaAccounts"),
      get(formValues, "externalMediaAccounts"),
    ]),
  );

  if (!Array.isArray(rawAccounts)) return [];

  return rawAccounts.map((item) => ({
    activityId: SERVICE_8007_ACTIVITY_ID,
    platform: coerceString(
      getFirstDefined([get(item, "platform"), get(item, "accountType"), get(item, "mediaCategory")]),
    ),
    accountHandle: coerceString(
      getFirstDefined([get(item, "accountHandle"), get(item, "accountTitle"), get(item, "accountName")]),
    ),
    accountUrl: coerceString(getFirstDefined([get(item, "accountUrl"), get(item, "url")])),
  }));
};

export const buildService8007Payload = async ({
  config,
  formValuesList,
  submissionMode = "submit",
  currentProfileId,
}: BuildServiceRuleStrategyPayloadParams): Promise<Service8007RuleStrategyValidatePayload> => {
  const nationalityResponse = await getNationalityList();
  const nationalityList = nationalityResponse?.data ?? [];
  const useDefaultManagerProfile = resolveUseDefaultManagerProfile(formValuesList);

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: [SERVICE_8007_ACTIVITY_ID],
      useDefaultManagerProfile,
      managerProfile: useDefaultManagerProfile
        ? undefined
        : resolveManagerProfile(formValuesList),
      legalAgeProofUploaded: resolveLegalAgeProofUploaded(formValuesList),
      guardianProfile: resolveGuardianProfile(formValuesList, nationalityList),
      externalMediaAccounts: resolveExternalMediaAccounts(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
      socialTermsAgreed: resolveSocialTermsAgreed(formValuesList),
    },
  };
};
