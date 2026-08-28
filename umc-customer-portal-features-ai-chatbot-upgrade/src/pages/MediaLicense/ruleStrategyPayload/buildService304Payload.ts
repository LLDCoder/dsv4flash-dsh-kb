import { nowGst, toApi } from "@/utils/gstTime";
import type { Service304RuleStrategyValidatePayload } from "@/services/services";
import { getNationalityList } from "@/services/userProfile";
import get from "lodash/get";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  coerceString,
  getFirstDefined,
  loadPublicationLanguageOptions,
  resolveCountryId,
  resolveOptionalStrictLanguageId,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveStrictLanguageId,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const normalizeBeneficiaryType = (value: unknown): 1 | 2 | 3 | 4 | undefined => {
  const beneficiaryType = coerceNumber(value);

  if (beneficiaryType === 5) {
    return 4;
  }

  if (
    beneficiaryType === 1 ||
    beneficiaryType === 2 ||
    beneficiaryType === 3 ||
    beneficiaryType === 4
  ) {
    return beneficiaryType;
  }

  return undefined;
};

const resolveBookList = (
  formValuesList: Array<Record<string, unknown>>,
  languages: LanguageOption[],
) => {
  const bookList = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "bookListUpload.bookList")]),
  );

  if (!Array.isArray(bookList)) return [];

  return bookList.map((item) => {
    const language2 = resolveOptionalStrictLanguageId(
      languages,
      get(item, "language2"),
      "Book language2",
    );
    return {
      isbn: coerceString(get(item, "isbn")) ?? "",
      title: coerceString(get(item, "title")) ?? "",
      authorName: coerceString(get(item, "authorName")) ?? "",
      language1: resolveStrictLanguageId(
        languages,
        get(item, "language1"),
        "Book language1",
      ),
      ...(language2 !== undefined ? { language2 } : {}),
    };
  });
};

const resolveBeneficiaryMaterials = (
  formValuesList: Array<Record<string, unknown>>,
  languages: LanguageOption[],
) => {
  const materialList =
    (getFirstDefined(
      formValuesList.flatMap((formValues) => [get(formValues, "beneficiaryType.materialList")]),
    ) as Array<Record<string, unknown>> | undefined) ?? [];

  return materialList.map((item) => ({
    materialTypeId: coerceNumber(get(item, "materialTypeId")) ?? 0,
    title: coerceString(get(item, "title")) ?? "",
    language: resolveStrictLanguageId(languages, get(item, "language"), "Material language"),
    quantity: coerceNumber(get(item, "number_of_title")) ?? 0,
  }));
};

export const buildService304Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service304RuleStrategyValidatePayload> => {
  const [nationalityResponse, languages] = await Promise.all([
    getNationalityList(),
    loadPublicationLanguageOptions(),
  ]);
  const nationalityList = nationalityResponse.data ?? [];
  const beneficiaryType = normalizeBeneficiaryType(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [get(formValues, "beneficiaryType.beneficiaryType")]),
    ),
  );
  const beneficiaryName = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [get(formValues, "beneficiaryType.beneficiaryName")]),
    ),
  );
  const mediaLicenseId = coerceNumber(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [get(formValues, "beneficiaryType.mediaLicenseId")]),
    ),
  );

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      beneficiaryType: (beneficiaryType ?? 0) as 1 | 2 | 3 | 4,
      ...(beneficiaryType === 1
        ? {
            ...(mediaLicenseId !== undefined ? { mediaLicenseId } : {}),
          }
        : beneficiaryType !== undefined
          ? {
              ...(beneficiaryName ? { beneficiaryName } : {}),
            }
          : {}),
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
      materials: resolveBeneficiaryMaterials(formValuesList, languages),
      bookList: resolveBookList(formValuesList, languages),
      newspaperList: [],
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
