import { nowGst, toApi } from "@/utils/gstTime";
import type { Service301RuleStrategyValidatePayload } from "@/services/services";
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
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const GOVERNMENT_BOOK_MATERIAL_TYPE_ID = 17;
const GOVERNMENT_NEWSPAPER_MATERIAL_TYPE_ID = 21;
const GOVERNMENT_BROCHURE_MATERIAL_TYPE_ID = 23;

const GOVERNMENT_MATERIAL_TYPE_ID_BY_CODE: Record<string, number> = {
  BK: GOVERNMENT_BOOK_MATERIAL_TYPE_ID,
  MG: GOVERNMENT_NEWSPAPER_MATERIAL_TYPE_ID,
  BR: GOVERNMENT_BROCHURE_MATERIAL_TYPE_ID,
};

const resolveGovernmentMaterialTypeId = (item: Record<string, unknown>) => {
  const explicitMaterialTypeId = coerceNumber(get(item, "materialTypeId"));
  if (
    explicitMaterialTypeId === GOVERNMENT_BOOK_MATERIAL_TYPE_ID ||
    explicitMaterialTypeId === GOVERNMENT_NEWSPAPER_MATERIAL_TYPE_ID ||
    explicitMaterialTypeId === GOVERNMENT_BROCHURE_MATERIAL_TYPE_ID
  ) {
    return explicitMaterialTypeId;
  }

  const materialTypeCode = coerceString(
    getFirstDefined([get(item, "materialTypeCode"), get(item, "material_type"), get(item, "code")]),
  )?.toUpperCase();

  if (materialTypeCode && GOVERNMENT_MATERIAL_TYPE_ID_BY_CODE[materialTypeCode]) {
    return GOVERNMENT_MATERIAL_TYPE_ID_BY_CODE[materialTypeCode];
  }

  return explicitMaterialTypeId ?? GOVERNMENT_BOOK_MATERIAL_TYPE_ID;
};

const resolveBookList = (
  formValuesList: Array<Record<string, unknown>>,
  languages: LanguageOption[],
) => {
  const rawBookList = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "bookListUpload.bookList"),
      get(formValues, "bookList.bookList"),
      get(formValues, "bookListUpload"),
      get(formValues, "bookList"),
    ]),
  );

  if (!Array.isArray(rawBookList)) return [];

  return rawBookList
    .map((item) => {
      const language2 = resolveOptionalStrictLanguageId(
        languages,
        get(item, "language2"),
        "Book language2",
      );
      return {
        isbn: coerceString(get(item, "isbn")) ?? "",
        title: coerceString(get(item, "title")) ?? "",
        authorName:
          coerceString(
            getFirstDefined([
              get(item, "authorName"),
              get(item, "author"),
              get(item, "author_name"),
            ]),
          ) ?? "",
        language1: resolveStrictLanguageId(
          languages,
          get(item, "language1"),
          "Book language1",
        ),
        ...(language2 !== undefined ? { language2 } : {}),
      };
    })
    .filter((item) => item.isbn || item.title || item.authorName);
};

const resolveNewspaperList = (
  formValuesList: Array<Record<string, unknown>>,
  dataList: Array<Record<string, unknown>>,
) => {
  const rawNewspaperList = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "newspaperListUpload.newspaperList"),
      get(formValues, "newspaperList.newspaperList"),
      get(formValues, "newspaperListUpload"),
      get(formValues, "newspaperList"),
    ]),
  );

  if (Array.isArray(rawNewspaperList)) {
    return rawNewspaperList
      .map((item) => ({
        title: coerceString(get(item, "title")) ?? "",
        quantity:
          coerceNumber(
            getFirstDefined([get(item, "quantity"), get(item, "number_of_title"), get(item, "count")]),
          ) ?? 0,
      }))
      .filter((item) => item.title || item.quantity > 0);
  }

  return dataList
    .filter((item) => resolveGovernmentMaterialTypeId(item) === GOVERNMENT_NEWSPAPER_MATERIAL_TYPE_ID)
    .map((item) => ({
      title: coerceString(get(item, "title")) ?? "",
      quantity: coerceNumber(get(item, "number_of_title")) ?? 0,
    }))
    .filter((item) => item.title || item.quantity > 0);
};

export const buildService301Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service301RuleStrategyValidatePayload> => {
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
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
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
        materialTypeId: resolveGovernmentMaterialTypeId(item),
        title: coerceString(get(item, "title")) ?? "",
        language: resolveStrictLanguageId(languages, get(item, "language"), "Material language"),
        quantity: coerceNumber(get(item, "number_of_title")) ?? 0,
      })),
      bookList: resolveBookList(formValuesList, languages),
      newspaperList: resolveNewspaperList(formValuesList, dataList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
