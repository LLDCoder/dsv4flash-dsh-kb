import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1802RuleStrategyValidatePayload } from "@/services/services";
import { getNationalityList, type NationalityInfo } from "@/services/userProfile";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveApplicantUserTypeCode,
  resolveSelectTableSingleValue,
} from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceNumber,
  coerceString,
  getFirstDefined,
  resolveTermsAgreed,
  resolveUploadUrl,
} from "../ruleStrategyPayloadUtils";
import { useUpdateFormStore } from "@/store/update-form";

const SERVICE_1802_RULE_VERSION = "1.0.0";
const TEMPORARY_PRESS_CARD_ACTIVITY_ID = 2035;
const REGULAR_PRESS_CARD_ACTIVITY_ID = 2036;

const ASSIGNMENT_LETTER_PATHS = [
  "assignmentLetterUrl",
  "foreignEntity.assignmentLetterUrl",
  "EntityRequestLetter",
  "ToWhomConcernCertificate",
  "UploadMaterial",
  "uploadMaterial",
];

const resolveCountryNumericCode = (
  raw: unknown,
  list: NationalityInfo[],
): number | string | undefined => {
  if (raw === undefined || raw === null) return undefined;

  const asNum = coerceNumber(raw);
  if (asNum !== undefined) {
    if (list.some((item) => item.numericCode === asNum)) return asNum;

    const byInternalId = list.find((item) => item.id === asNum);
    if (byInternalId) return byInternalId.numericCode;

    return asNum;
  }

  const normalized = coerceString(raw)?.toUpperCase();
  if (!normalized) return undefined;

  const byIso2 = list.find((item) => item.isocode2?.toUpperCase() === normalized);
  if (byIso2) return byIso2.phoneCode;

  const byIso3 = list.find((item) => item.isocode3?.toUpperCase() === normalized);
  if (byIso3) return byIso3.phoneCode;

  return undefined;
};


const resolveIsTemporaryPressCard = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const activityId = coerceNumber(
    getFirstDefined([
      get(selectTableSingle, "selectedKey.0"),
      get(selectTableSingle, "selectedKey"),
      get(selectTableSingle, "tableData.0.Id"),
      ...formValuesList.flatMap((formValues) => [
        get(formValues, "isTemporaryPressCard"),
        get(formValues, "payload.isTemporaryPressCard"),
      ]),
    ]),
  );

  if (activityId === TEMPORARY_PRESS_CARD_ACTIVITY_ID) return true;
  if (activityId === REGULAR_PRESS_CARD_ACTIVITY_ID) return false;

  return coerceBoolean(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "isTemporaryPressCard"),
        get(formValues, "payload.isTemporaryPressCard"),
      ]),
    ),
  );
};

const resolveAssignmentLetterUrl = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return resolveUploadUrl(
    getFirstDefined(
      formValuesList.flatMap((formValues) =>
        ASSIGNMENT_LETTER_PATHS.map((path) => get(formValues, path)),
      ),
    ),
  );
};

const resolveForeignEntity = (
  formValuesList: Array<Record<string, unknown>>,
  nationalityList: NationalityInfo[],
) => {
  const foreignEntity = {
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
    headquarterCountryId: resolveCountryNumericCode(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "foreignEntity.headquarterCountryId"),
          get(formValues, "foreignEntity.EntityHQCountry"),
          get(formValues, "foreignEntity.countryId"),
          get(formValues, "EntityHQCountry"),
          get(formValues, "entityHQCountry"),
          get(formValues, "Port.id"),
        ]),
      ),
      nationalityList,
    ),
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
          get(formValues, "foreignEntity.PhoneNumber"),
          get(formValues, "PhoneNumber"),
          get(formValues, "phoneNumber"),
          get(formValues, "PhoneNo"),
          get(formValues, "phoneNo"),
        ]),
      ),
    ),
  };

  const hasForeignEntityData = Object.values(foreignEntity).some(
    (value) => value !== undefined,
  );

  if (!hasForeignEntityData) {
    return undefined;
  }

  return foreignEntity;
};

const resolveTermsAccepted = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "termsAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "terms.isAgreed"),
          get(formValues, "SelectTable.termsAgreed"),
          get(formValues, "SelectTable.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.termsAccepted"),
        ]),
      ),
    ) ?? resolveTermsAgreed(formValuesList)
  );
};

export const buildService1802Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1802RuleStrategyValidatePayload> => {
  const nationalityResponse = await getNationalityList();
  const nationalityList = nationalityResponse.data ?? [];
   const applicationId = useUpdateFormStore.getState().applicationId;

  return {
    actionType: 2,
    expectedRuleVersion: SERVICE_1802_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      applicantUserTypeId: coerceNumber(
        resolveApplicantUserTypeCode(userInfo, currentProfileId),
      ),
      applicationId: applicationId,
      applicationDetailId: 1802101,
      isTemporaryPressCard: resolveIsTemporaryPressCard(formValuesList),
      assignmentLetterUrl: resolveAssignmentLetterUrl(formValuesList),
      foreignEntity: resolveForeignEntity(formValuesList, nationalityList),
      submissionMode,
      requestTime: toApi(nowGst()),
      termsAgreed: resolveTermsAccepted(formValuesList),
    },
  };
};
