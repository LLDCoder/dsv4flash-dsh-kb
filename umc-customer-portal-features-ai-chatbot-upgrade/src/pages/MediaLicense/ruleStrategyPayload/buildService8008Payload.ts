import { nowGst, toApi } from "@/utils/gstTime";
import type {
  Service8008AccountHolderProfile,
  Service8008ExternalMediaAccountBinding,
  Service8008GuardianProfile,
  Service8008ManagerProfile,
  Service8008RuleStrategyValidatePayload,
} from "@/services/services";
import { getNationalityList, type NationalityInfo } from "@/services/userProfile";
import get from "lodash/get";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceString,
  getFirstDefined,
  resolveTermsAgreed,
} from "../ruleStrategyPayloadUtils";

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const resolveSocialTermsAgreed = (formValuesList: Array<Record<string, unknown>>) => {
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

const resolveMobileNumber = (value: unknown) => {
  const normalized = coerceString(value);
  if (!normalized) return undefined;
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
};

const resolveNationalityCode = (nationalityList: NationalityInfo[], value: unknown) => {
  const directCode = coerceString(value);
  if (directCode && /[A-Za-z]{2,3}/.test(directCode)) return directCode.toUpperCase();

  const nationalityId = coerceNumber(value);
  if (nationalityId === undefined) return undefined;

  return nationalityList.find((item) => item.id === nationalityId)?.isocode2?.toUpperCase();
};

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const rawSelectedKeys = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "activityIds"),
      get(formValues, "SelectTableSingle.activityIds"),
      get(formValues, "SelectTableSingle.selectedKey"),
      get(formValues, "selectedKey"),
    ]),
  );

  const normalizedIds = (Array.isArray(rawSelectedKeys) ? rawSelectedKeys : [rawSelectedKeys])
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);

  if (normalizedIds.length > 0) {
    return normalizedIds;
  }

  return formValuesList
    .flatMap((formValues) => {
      const tableData = get(formValues, "SelectTableSingle.tableData");
      return Array.isArray(tableData) ? tableData : [];
    })
    .map((item) => coerceNumber(get(item, "Id")))
    .filter((item): item is number => item !== undefined);
};

const resolveAccountHolderProfile = (
  formValuesList: Array<Record<string, unknown>>,
  nationalityList: NationalityInfo[],
): Service8008AccountHolderProfile | undefined => {
  const profile: Service8008AccountHolderProfile = {
    fullName: coerceString(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "FullName"),
          get(formValues, "fullName"),
        ]),
      ),
    ),
    identityNumber: coerceString(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "Passport"),
          get(formValues, "passportNumber"),
          get(formValues, "identityNumber"),
        ]),
      ),
    ),
    nationality: resolveNationalityCode(
      nationalityList,
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "Nationality"),
          get(formValues, "nationality"),
        ]),
      ),
    ),
    mobileNumber: resolveMobileNumber(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "PhoneNumber"),
          get(formValues, "phoneNumber"),
          get(formValues, "mobileNumber"),
        ]),
      ),
    ),
    emailAddress: coerceString(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "Email"),
          get(formValues, "email"),
          get(formValues, "emailAddress"),
        ]),
      ),
    ),
  };

  return Object.values(profile).some((value) => isFilledValue(value)) ? profile : undefined;
};

const resolveManagerProfile = (
  formValuesList: Array<Record<string, unknown>>,
): Service8008ManagerProfile | undefined => {
  const useDefaultManager = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "socialMediaManager.managesSocialMedia"),
        get(formValues, "managesSocialMedia"),
      ]),
    ),
  )?.toLowerCase();

  if (useDefaultManager !== "no") return undefined;

  const managerSelector = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "socialMediaManager.idSelector")]),
  ) as Record<string, unknown> | undefined;

  if (!managerSelector || typeof managerSelector !== "object") return undefined;

  const profile: Service8008ManagerProfile = {
    fullName: coerceString(
      getFirstDefined([
        get(managerSelector, "fullNameEnglish"),
        get(managerSelector, "fullNameArabic"),
        get(managerSelector, "name"),
      ]),
    ),
    identityNumber: coerceString(
      getFirstDefined([
        get(managerSelector, "emiratesId"),
        get(managerSelector, "passportNumber"),
        get(managerSelector, "uid"),
      ]),
    ),
    mobileNumber: resolveMobileNumber(
      getFirstDefined([
        get(managerSelector, "phoneNumber"),
        get(managerSelector, "mobileNumber"),
      ]),
    ),
    emailAddress: coerceString(
      getFirstDefined([
        get(managerSelector, "email"),
        get(managerSelector, "emailAddress"),
      ]),
    ),
  };

  return Object.values(profile).some((value) => isFilledValue(value)) ? profile : undefined;
};

const resolveGuardianProfile = (
  formValuesList: Array<Record<string, unknown>>,
): Service8008GuardianProfile | undefined => {
  const guardianValue = formValuesList
    .map((formValues) => getFirstDefined([get(formValues, "guardianProfile")]))
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;

  if (!guardianValue) return undefined;

  const profile: Service8008GuardianProfile = {
    fullName: coerceString(get(guardianValue, "fullName")),
    identityNumber: coerceString(
      getFirstDefined([get(guardianValue, "identityNumber"), get(guardianValue, "passportNumber")]),
    ),
    relationship: coerceString(get(guardianValue, "relationship")),
    mobileNumber: resolveMobileNumber(
      getFirstDefined([get(guardianValue, "mobileNumber"), get(guardianValue, "phoneNumber")]),
    ),
    emailAddress: coerceString(
      getFirstDefined([get(guardianValue, "emailAddress"), get(guardianValue, "email")]),
    ),
  };

  return Object.values(profile).some((value) => isFilledValue(value)) ? profile : undefined;
};

const resolveExternalMediaAccounts = (
  formValuesList: Array<Record<string, unknown>>,
  activityIds: number[],
): Service8008ExternalMediaAccountBinding[] => {
  const rawAccounts = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "socialMediaAccounts"),
      get(formValues, "externalMediaAccounts"),
    ]),
  );

  if (!Array.isArray(rawAccounts)) return [];

  const primaryActivityId = activityIds[0];
  if (primaryActivityId === undefined) return [];

  return rawAccounts.map((item) => ({
    activityId: primaryActivityId,
    platform: coerceString(
      getFirstDefined([get(item, "platform"), get(item, "accountType"), get(item, "mediaCategory")]),
    ),
    accountHandle: coerceString(
      getFirstDefined([get(item, "accountHandle"), get(item, "accountTitle"), get(item, "accountName")]),
    ),
    accountUrl: coerceString(getFirstDefined([get(item, "accountUrl"), get(item, "url")])),
  }));
};

export const buildService8008Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service8008RuleStrategyValidatePayload> => {
  const nationalityResponse = await getNationalityList();
  const nationalityList = nationalityResponse?.data ?? [];
  const activityIds = resolveActivityIds(formValuesList);

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds,
      accountHolderProfile: resolveAccountHolderProfile(formValuesList, nationalityList),
      managerProfile: resolveManagerProfile(formValuesList),
      guardianProfile: resolveGuardianProfile(formValuesList),
      externalMediaAccounts: resolveExternalMediaAccounts(formValuesList, activityIds),
      termsAgreed: resolveTermsAgreed(formValuesList),
      socialTermsAgreed: resolveSocialTermsAgreed(formValuesList),
    },
  };
};
