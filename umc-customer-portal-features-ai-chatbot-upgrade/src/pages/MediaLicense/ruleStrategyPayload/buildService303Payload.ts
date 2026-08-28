import { nowGst, toApi } from "@/utils/gstTime";
import type { Service303RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import { getNationalityList } from "@/services/userProfile";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  coerceString,
  getFirstDefined,
  loadPublicationLanguageOptions,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveCountryId,
  resolveStrictLanguageId,
} from "../ruleStrategyPayloadUtils";

const PERSONAL_NEWSPAPER_MATERIAL_TYPE_ID = 28;

export const buildService303Payload = async ({
  config,
  formValuesList,
  submissionMode = "submit",
  currentProfileId,
}: BuildServiceRuleStrategyPayloadParams): Promise<Service303RuleStrategyValidatePayload> => {
  const [nationalityResponse, languages] = await Promise.all([
    getNationalityList(),
    loadPublicationLanguageOptions(),
  ]);
  const nationalityList = nationalityResponse.data ?? [];
  const dataList =
    (getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "dataList")])) as
      | Array<Record<string, unknown>>
      | undefined) ?? [];

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      submissionMode,
      requestTime: toApi(nowGst()),
      policyNumber: coerceString(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "AwbDecNumber")])),
      ),
      policyDate: coerceString(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "AwbDecDate")])),
      ),
      arrivalCountryId: resolveCountryId(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "CountryOrigin")])),
        nationalityList,
      ),
      portId: coerceNumber(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "ArrivalPort")])),
      ),
      customDeclarationFileUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [get(formValues, "UploadCustomDeclaration")]),
        ),
      ),
      policyFileUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [get(formValues, "AirWayBillOfLanding")]),
        ),
      ),
      purchaseInvoicesFileUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [get(formValues, "UploadPurchaseInvoices")]),
        ),
      ),
      materials: dataList.map((item) => ({
        materialTypeId:
          coerceNumber(get(item, "materialTypeId")) ?? PERSONAL_NEWSPAPER_MATERIAL_TYPE_ID,
        title: coerceString(get(item, "title")) ?? "",
        language: resolveStrictLanguageId(languages, get(item, "language"), "Material language"),
        quantity: coerceNumber(get(item, "number_of_title")) ?? 0,
      })),
      newspaperList: dataList.map((item) => ({
        title: coerceString(get(item, "title")) ?? "",
        quantity: coerceNumber(get(item, "number_of_title")) ?? 0,
      })),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
