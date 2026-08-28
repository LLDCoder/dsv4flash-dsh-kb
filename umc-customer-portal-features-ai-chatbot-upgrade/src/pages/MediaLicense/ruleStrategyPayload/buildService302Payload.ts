import { nowGst, toApi } from "@/utils/gstTime";
import type { Service302RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import { getNationalityList } from "@/services/userProfile";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  coerceString,
  getFirstDefined,
  loadPublicationLanguageOptions,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveCountryId,
  resolveOptionalStrictLanguageId,
  resolveStrictLanguageId,
} from "../ruleStrategyPayloadUtils";
import {
  getService302FeeMaterialTypeIds,
  resolveService302BookList,
  resolveService302DataList,
} from "../service302Utils";

export const buildService302Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service302RuleStrategyValidatePayload> => {
  const [nationalityResponse, languages] = await Promise.all([
    getNationalityList(),
    loadPublicationLanguageOptions(),
  ]);
  const nationalityList = nationalityResponse.data ?? [];
  const dataList = formValuesList.flatMap((formValues) =>
    resolveService302DataList(formValues as Record<string, unknown>),
  );
  const bookList = formValuesList.flatMap((formValues) =>
    resolveService302BookList(formValues as Record<string, unknown>),
  );
  const mergedService302Values = formValuesList.reduce<Record<string, unknown>>(
    (merged, formValues) => ({ ...merged, ...(formValues as Record<string, unknown>) }),
    {},
  );
  mergedService302Values.dataList = dataList;
  mergedService302Values.bookListUpload = { bookList };
  const selectedMaterialTypeIds = getService302FeeMaterialTypeIds(mergedService302Values);
  if (selectedMaterialTypeIds.length === 0) {
    throw new Error("At least one valid Service302 material type is required.");
  }

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      selectedMaterialTypeIds,
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
        materialTypeId: coerceNumber(get(item, "materialTypeId")) ?? 0,
        title: coerceString(get(item, "title")) ?? "",
        language: resolveStrictLanguageId(languages, get(item, "language"), "Material language"),
        quantity: coerceNumber(get(item, "number_of_title")) ?? 0,
      })),
      bookList: bookList.map((item) => {
        const language2 = resolveOptionalStrictLanguageId(
          languages,
          item.language2,
          "Book language2",
        );
        return {
          isbn: coerceString(item.isbn) ?? "",
          title: coerceString(item.title) ?? "",
          authorName: coerceString(item.authorName || item.author) ?? "",
          language1: resolveStrictLanguageId(languages, item.language1, "Book language1"),
          ...(language2 !== undefined ? { language2 } : {}),
        };
      }),
      newspaperList: [],
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
