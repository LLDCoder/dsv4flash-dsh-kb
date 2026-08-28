import { nowGst, toApi } from "@/utils/gstTime";
import type {
  Service8006ExternalMediaAccountBinding,
  Service8006ManagerProfile,
  Service8006RuleStrategyValidatePayload,
} from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

const SERVICE_8006_RULE_VERSION = "1.0.0";
const SERVICE_8006_ACTIVITY_BUNDLE = [66, 68];
const SERVICE_8006_EXTERNAL_ACCOUNT_ACTIVITY_ID = 66;

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

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const explicitActivityIds = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "activityIds"),
      get(formValues, "SelectTableSingle.activityIds"),
    ]),
  );

  if (Array.isArray(explicitActivityIds)) {
    const normalized = explicitActivityIds
      .map((item) => coerceNumber(item))
      .filter((item): item is number => item !== undefined);

    if (normalized.length > 0) return normalized;
  }

  const selectedKeys = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelectTableSingle.selectedKey"),
      get(formValues, "selectedKey"),
    ]),
  );

  const normalizedSelectedIds = (Array.isArray(selectedKeys) ? selectedKeys : [selectedKeys])
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);

  const matchedBusinessIds = normalizedSelectedIds.filter((item) =>
    SERVICE_8006_ACTIVITY_BUNDLE.includes(item),
  );

  if (matchedBusinessIds.length > 0) return matchedBusinessIds;
  if (normalizedSelectedIds.length > 0) return SERVICE_8006_ACTIVITY_BUNDLE;

  return SERVICE_8006_ACTIVITY_BUNDLE;
};

const resolveUseDefaultManagerProfile = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const explicitBoolean = coerceBoolean(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "useDefaultManagerProfile"),
        get(formValues, "socialMediaManager.useDefaultManagerProfile"),
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
  );

  if (managesSocialMedia?.toLowerCase() === "yes") return true;
  if (managesSocialMedia?.toLowerCase() === "no") return false;

  return true;
};

const resolveManagerProfile = (
  formValuesList: Array<Record<string, unknown>>,
): Service8006ManagerProfile | undefined => {
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

const resolveExternalMediaAccounts = (
  formValuesList: Array<Record<string, unknown>>,
  activityIds: number[],
): Service8006ExternalMediaAccountBinding[] => {
  const rawAccounts = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "socialMediaAccounts"),
      get(formValues, "externalMediaAccounts"),
    ]),
  );

  if (!Array.isArray(rawAccounts)) return [];

  const bindingActivityId = activityIds.includes(
    SERVICE_8006_EXTERNAL_ACCOUNT_ACTIVITY_ID,
  )
    ? SERVICE_8006_EXTERNAL_ACCOUNT_ACTIVITY_ID
    : (activityIds[0] ?? SERVICE_8006_EXTERNAL_ACCOUNT_ACTIVITY_ID);

  return rawAccounts.map((item) => ({
    activityId: bindingActivityId,
    platform: coerceString(
      getFirstDefined([get(item, "platform"), get(item, "accountType"), get(item, "mediaCategory")]),
    ),
    accountHandle: coerceString(
      getFirstDefined([get(item, "accountHandle"), get(item, "accountTitle"), get(item, "accountName")]),
    ),
    accountUrl: coerceString(getFirstDefined([get(item, "accountUrl"), get(item, "url")])),
  }));
};

export const buildService8006Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service8006RuleStrategyValidatePayload => {
  const activityIds = resolveActivityIds(formValuesList);
  const useDefaultManagerProfile = resolveUseDefaultManagerProfile(formValuesList);
  const managerProfile = useDefaultManagerProfile
    ? undefined
    : resolveManagerProfile(formValuesList);

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds,
      useDefaultManagerProfile,
      managerProfile,
      externalMediaAccounts: resolveExternalMediaAccounts(formValuesList, activityIds),
      termsAgreed: resolveTermsAgreed(formValuesList),
      socialTermsAgreed: resolveSocialTermsAgreed(formValuesList),
    },
  };
};
