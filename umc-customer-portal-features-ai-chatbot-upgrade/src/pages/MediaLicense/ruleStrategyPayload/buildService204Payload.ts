import { nowGst, toApi } from "@/utils/gstTime";
import { getLanguages, type Service204RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import { resolveBookCollectTypeKindById } from "@/utils/bookCollectTypeKind";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import { resolveEstablishmentId } from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  coerceString,
  getFirstDefined,
  resolveLanguageIds,
  resolveTermsAccepted,
  resolveUploadUrl,
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const SERVICE_204_RULE_VERSION = "1.0.0";
const PUBLICATION_TYPE_ID = 2;

const normalizeLookupName = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getBookTradingValue = (
  formValuesList: Array<Record<string, unknown>>,
  path: string,
) => {
  return getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, `BookTrading.${path}`),
      get(formValues, path),
    ]),
  );
};

const resolveBookCollectTypeId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const rawBookCollectTypeId = getBookTradingValue(
    formValuesList,
    "HowDidYouGetTheBook",
  );

  return coerceNumber(rawBookCollectTypeId) ?? coerceString(rawBookCollectTypeId);
};

const resolveQtyBookFair = async ({
  formValuesList,
  numberOfItems,
}: {
  formValuesList: Array<Record<string, unknown>>;
  numberOfItems?: number;
}) => {
  if (numberOfItems === undefined) return undefined;

  const bookCollectTypeId = resolveBookCollectTypeId(formValuesList);
  if (bookCollectTypeId === undefined) return undefined;

  const kind = resolveBookCollectTypeKindById(bookCollectTypeId);
  if (kind === "BookFair" || kind === "LocalDistributor") {
    return numberOfItems;
  }

  return undefined;
};

export const buildService204Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service204RuleStrategyValidatePayload> => {
  const numberOfItems = coerceNumber(
    getBookTradingValue(formValuesList, "NumberOfCopies"),
  );
  const qtyBookFair = await resolveQtyBookFair({
    formValuesList,
    numberOfItems,
  });
  const rawBookType = getBookTradingValue(formValuesList, "BookType");
  const materialUrl = resolveUploadUrl(
    getBookTradingValue(formValuesList, "UploadMaterial"),
  );
  const languageOptions = unwrapResponseRows(await getLanguages()) as LanguageOption[];

  return {
    actionType: 1,
    expectedRuleVersion: SERVICE_204_RULE_VERSION,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      publicationTypeId: PUBLICATION_TYPE_ID,
      bookCollectTypeId: resolveBookCollectTypeId(formValuesList),
      printingPermitId: coerceString(
        getBookTradingValue(formValuesList, "PublicationsPrintingPermit"),
      ),
      regulateEntryId: coerceString(
        getBookTradingValue(formValuesList, "RegulateEntryMediaMaterial"),
      ),
      numberOfItems,
      qtyBookFair,
      isElectronicBookType:
        normalizeLookupName(rawBookType) === normalizeLookupName("Electronic"),
      purchaseInvoiceUrl: resolveUploadUrl(
        getBookTradingValue(formValuesList, "UploadPurchaseInvoice"),
      ),
      title: coerceString(getBookTradingValue(formValuesList, "BookTitle")),
      authorName: coerceString(getBookTradingValue(formValuesList, "AuthorName")),
      isbn: coerceString(getBookTradingValue(formValuesList, "ISBN")),
      nationalDepositoryNo: coerceString(
        getBookTradingValue(formValuesList, "NationalDepositoryNo"),
      ),
      printYear: coerceString(getBookTradingValue(formValuesList, "PrintYear")),
      versionNumber: coerceString(
        getBookTradingValue(formValuesList, "VersionNumber"),
      ),
      languages: resolveLanguageIds(
        languageOptions,
        getBookTradingValue(formValuesList, "Language"),
      ),
      subjectCategory: coerceNumber(
        getBookTradingValue(formValuesList, "SubjectCategory"),
      ),
      subjectSubCategory: coerceNumber(
        getBookTradingValue(formValuesList, "SubjectSubCategory"),
      ),
      distributorAgency: coerceString(
        getBookTradingValue(formValuesList, "DistributorAgency"),
      ),
      materialUrl,
      termsAccepted: resolveTermsAccepted(formValuesList),
      // Self-Monitor auto-approval linkage (FE-3, additive)
      bookLanguageIds: resolveLanguageIds(
        languageOptions,
        getBookTradingValue(formValuesList, "Language"),
      ),
      subjectSubCategoryId: coerceNumber(
        getFirstDefined([
          getBookTradingValue(formValuesList, "SubjectSubCategoryId"),
          getBookTradingValue(formValuesList, "SubjectSubCategory"),
        ]),
      ),
      ageClassificationId: coerceNumber(
        getFirstDefined([
          getBookTradingValue(formValuesList, "AgeClassificationId"),
          getBookTradingValue(formValuesList, "AgeClassification"),
        ]),
      ),
    },
  };
};
