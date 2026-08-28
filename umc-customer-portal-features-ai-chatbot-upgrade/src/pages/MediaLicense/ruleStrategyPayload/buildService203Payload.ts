import { nowGst, toApi } from "@/utils/gstTime";
import { getLanguages, type Service203RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  resolveEstablishmentId,
  type BuildServiceRuleStrategyPayloadParams,
} from "../ruleStrategyPayloadShared";
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

const PUBLICATION_TYPE_ID = 1;

const PRINTED_TYPE_ID_BY_VALUE: Record<string, number | string> = {
  "1": 1,
  bk: 1,
  book: 1,
  "2": 2,
  mp: 2,
  map: 2,
  "3": 3,
  mv: 3,
  movie: 3,
  "4": 4,
  sr: 4,
  series: 4,
  "5": 5,
  ad: 5,
  advertisment: 5,
  advertisement: 5,
  "6": 6,
  ot: 6,
  other: 6,
  brochure: 6,
  brochures: 6,
  poster: 6,
  posters: 6,
  "14": 14,
  tl: 14,
  theatrical: 14,
};

const stringifyValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceString(item))
      .filter((item): item is string => !!item)
      .join(", ");
  }

  return coerceString(value);
};

export const buildService203Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service203RuleStrategyValidatePayload> => {
  const printingPermit = formValuesList
    .map((formValues) =>
      getFirstDefined([get(formValues, "PrintingPermit"), get(formValues, "Printing Permit")]),
    )
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;

  const rawPrintedType = getFirstDefined([
    get(printingPermit, "TypeOfPublication"),
    get(printingPermit, "printedTypeId"),
    get(printingPermit, "printedType"),
  ]);

  const normalizedPrintedType = coerceString(rawPrintedType)?.toLowerCase();
  const printedTypeId =
    (normalizedPrintedType ? PRINTED_TYPE_ID_BY_VALUE[normalizedPrintedType] : undefined) ??
    coerceNumber(rawPrintedType) ??
    coerceString(rawPrintedType);

  const rawLanguage = getFirstDefined([
    get(printingPermit, "Language"),
    get(printingPermit, "Languages"),
    get(printingPermit, "language"),
    get(printingPermit, "languages"),
  ]);

  const languageOptions = unwrapResponseRows(await getLanguages()) as LanguageOption[];
  const languages = resolveLanguageIds(languageOptions, rawLanguage);

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      publicationTypeId: PUBLICATION_TYPE_ID,
      printedTypeId,
      title: coerceString(
        getFirstDefined([
          get(printingPermit, "PublicationTitle"),
          get(printingPermit, "publicationTitle"),
          get(printingPermit, "Title"),
          get(printingPermit, "title"),
        ]),
      ),
      authorName: coerceString(
        getFirstDefined([get(printingPermit, "AuthorName"), get(printingPermit, "authorName")]),
      ),
      languages,
      materialUrl: resolveUploadUrl(
        getFirstDefined([
          get(printingPermit, "AIMaterialRecognition"),
          get(printingPermit, "materialUrl"),
          get(printingPermit, "UploadMaterial"),
        ]),
      ),
      termsAccepted: resolveTermsAccepted(formValuesList),
      isbn: coerceString(
        getFirstDefined([
          get(printingPermit, "ISBN"),
          get(printingPermit, "isbn"),
          get(printingPermit, "IssueNumbe"),
        ]),
      ),
      edition: coerceString(getFirstDefined([get(printingPermit, "Edition"), get(printingPermit, "edition")])),
      publishMethod: stringifyValue(
        getFirstDefined([get(printingPermit, "PublishMethod"), get(printingPermit, "publishMethod")]),
      ),
      coverType: stringifyValue(
        getFirstDefined([
          get(printingPermit, "CoverTypes"),
          get(printingPermit, "CoverType"),
          get(printingPermit, "ArticleType"),
        ]),
      ),
      subject: stringifyValue(
        getFirstDefined([
          get(printingPermit, "Subject"),
          get(printingPermit, "SubjectCategory"),
          get(printingPermit, "SubjectSubCategory"),
        ]),
      ),
    },
  };
};
