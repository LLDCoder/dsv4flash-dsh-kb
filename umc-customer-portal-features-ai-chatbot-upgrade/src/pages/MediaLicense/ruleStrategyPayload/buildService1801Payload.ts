import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1801RuleStrategyValidatePayload } from "@/services/services";
import type { NationalityInfo } from "@/services/userProfile";
import { getNationalityList } from "@/services/userProfile";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveApplicantUserTypeCode,
  resolveIdSelectorValue,
  resolveSelectTableSingleValue,
} from "../ruleStrategyPayloadShared";

const DEFAULT_BUSINESS_TYPE_ID = 1041;
const TEMPORARY_PRESS_CARD_ACTIVITY_ID = 2035;
const REGULAR_PRESS_CARD_ACTIVITY_ID = 2036;

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
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    if (normalized.includes("temporary")) return true;
    if (normalized.includes("regular") || normalized.includes("permanent")) {
      return false;
    }
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
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.terms.isAgreed"),
          get(formValues, "SelectTable.termsAccepted"),
          get(formValues, "SelectTable.termsAgreed"),
          get(formValues, "SelectTable.terms.isAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

const resolveActivityId = (
  selectTableSingle?: {
    selectedKey?: string | number | Array<string | number>;
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedKey = selectTableSingle?.selectedKey;
  const selectedKeys = Array.isArray(selectedKey)
    ? selectedKey
    : selectedKey == null
      ? []
      : [selectedKey];
  const activityIds = [
    ...selectedKeys,
    get(selectTableSingle, "tableData.0.Id"),
  ]
    .map(coerceNumber)
    .filter((activityId): activityId is number => activityId !== undefined);

  return (
    activityIds.find(
      (activityId) =>
        activityId === TEMPORARY_PRESS_CARD_ACTIVITY_ID ||
        activityId === REGULAR_PRESS_CARD_ACTIVITY_ID,
    ) ?? activityIds[0]
  );
};

const resolveIsTemporaryPressCard = (
  activityId?: number,
) => {
  if (activityId === TEMPORARY_PRESS_CARD_ACTIVITY_ID) return true;
  if (activityId === REGULAR_PRESS_CARD_ACTIVITY_ID) return false;

  return undefined;
};

// get country code from nationality list
const normalizePhoneCodeDigits = (value: string): string =>
  value.replace(/\D/g, "");

const resolveCountryNumericCode = (
  raw: unknown,
  list: NationalityInfo[],
): number | undefined => {
  if (raw === undefined || raw === null) return undefined;

  const asNum = coerceNumber(raw);
  if (asNum !== undefined) {
    if (list.some((n) => n.numericCode === asNum)) return asNum;
    const byInternalId = list.find((n) => n.id === asNum);
    if (byInternalId) return byInternalId.numericCode;
    return asNum;
  }

  const s = coerceString(raw);
  if (!s) return undefined;
  const upper = s.trim().toUpperCase();

  const byIso2 = list.find((n) => n.isocode2?.toUpperCase() === upper);
  if (byIso2) return byIso2.numericCode;

  const byIso3 = list.find((n) => n.isocode3?.toUpperCase() === upper);
  if (byIso3) return byIso3.numericCode;

  const digitsOnly = normalizePhoneCodeDigits(upper);
  if (digitsOnly) {
    const byNumericString = coerceNumber(digitsOnly);
    if (byNumericString !== undefined && list.some((n) => n.numericCode === byNumericString)) {
      return byNumericString;
    }
    const byPhone = list.find(
      (n) => normalizePhoneCodeDigits(n.phoneCode || "") === digitsOnly,
    );
    if (byPhone) return byPhone.numericCode;
  }

  return undefined;
};

export const buildService1801Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1801RuleStrategyValidatePayload> => {
  const nationalityResponse = await getNationalityList();
  const nationalityList = nationalityResponse.data ?? [];

  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const idSelector = resolveIdSelectorValue(formValuesList);
  const activityId = resolveActivityId(selectTableSingle);
  const isPassportActivity = activityId === TEMPORARY_PRESS_CARD_ACTIVITY_ID;
  const isEmiratesIdActivity = activityId === REGULAR_PRESS_CARD_ACTIVITY_ID;
  const applicantUserTypeId = coerceNumber(
    resolveApplicantUserTypeCode(userInfo, currentProfileId),
  );

  const headquarterCountryRaw = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "foreignEntity.headquarterCountryId"),
      get(formValues, "foreignEntity.countryId"),
      get(formValues, "EntityHQCountry"),
      get(formValues, "entityHQCountry"),
    ]),
  );

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      applicantUserTypeId,
      isTemporaryPressCard: resolveIsTemporaryPressCard(activityId),
      
      businessTypeId:
        coerceNumber(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "businessTypeId"),
              get(formValues, "BusinessTypeId"),
              get(formValues, "economicActivityId"),
              get(formValues, "EconomicActivityId"),
            ]),
          ),
        ) ?? DEFAULT_BUSINESS_TYPE_ID,
      assignmentLetterUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "assignmentLetterUrl"),
            get(formValues, "ToWhomConcernCertificate"),
            get(formValues, "UploadMaterial"),
            get(formValues, "uploadMaterial"),
          ]),
        ),
      ),
      foreignEntity: {
        nameEnglish: coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "foreignEntity.nameEnglish"),
              get(formValues, "foreignEntity.nameEn"),
              get(formValues, "EstablishmentNameEnglish"),
              get(formValues, "establishmentNameEnglish"),
            ]),
          ),
        ),
        nameArabic: coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "foreignEntity.nameArabic"),
              get(formValues, "foreignEntity.nameAr"),
              get(formValues, "EstablishmentNameArabic"),
              get(formValues, "establishmentNameArabic"),
            ]),
          ),
        ),
        headquarterCountryId: resolveCountryNumericCode(headquarterCountryRaw, nationalityList),
        websiteUrl: coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "foreignEntity.websiteUrl"),
              get(formValues, "Website"),
              get(formValues, "website"),
            ]),
          ),
        ),
        email: coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "foreignEntity.email"),
              get(formValues, "Email"),
              get(formValues, "email"),
            ]),
          ),
        ),
        phoneNumber: coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "foreignEntity.phoneNumber"),
              get(formValues, "PhoneNumber"),
              get(formValues, "phoneNumber"),
            ]),
          ),
        ),
      },
      journalist: {
        fullNameEnglish: coerceString(idSelector?.fullNameEnglish),
        fullNameArabic: coerceString(idSelector?.fullNameArabic),
        passportNumber:
          isPassportActivity
            ? coerceString(idSelector?.passportNumber)
            : undefined,
        passportCountryId: resolveCountryNumericCode(
          idSelector?.nationality,
          nationalityList,
        ),
        passportCopyUrl:
          isPassportActivity
            ? resolveUploadUrl(idSelector?.PassportScan)
            : undefined,
        personalPhotoUrl: resolveUploadUrl(idSelector?.PersonalPhoto),
        emiratesId:
          isEmiratesIdActivity
            ? coerceString(idSelector?.emiratesId)
            : undefined,
      },
      submissionMode,
      requestTime: toApi(nowGst()),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
