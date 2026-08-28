import { nowGst, toApi } from "@/utils/gstTime";
import { getLanguages, type Service205RuleStrategyValidatePayload } from "@/services/services";
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
  unwrapResponseRows,
  type LanguageOption,
} from "../ruleStrategyPayloadUtils";

const PUBLICATION_TYPE_ID = 3;
const PRINTED_TYPE_ID_BY_VALUE: Record<string, number> = {
  "3": 3,
  mv: 3,
  movie: 3,
  "14": 14,
  tl: 14,
  theatrical: 14,
};

export const buildService205Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service205RuleStrategyValidatePayload> => {
  const scriptFormValue = formValuesList
    .map((formValues) => getFirstDefined([get(formValues, "ScriptPublicationForm")]))
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;
  const publicationType = coerceString(get(scriptFormValue, "typeOfPublication"))?.toLowerCase();
  const publicationTypeId =
    coerceNumber(get(scriptFormValue, "typeOfPublication")) ??
    coerceNumber(get(scriptFormValue, "publicationTypeId")) ??
    PUBLICATION_TYPE_ID;
  const printedTypeId =
    coerceNumber(get(scriptFormValue, "printedTypeId")) ??
    PRINTED_TYPE_ID_BY_VALUE[publicationType || ""] ??
    publicationTypeId;
  const rawLanguages = get(scriptFormValue, "languages");
  const languageOptions = unwrapResponseRows(await getLanguages()) as LanguageOption[];

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      publicationTypeId,
      printedTypeId,
      title: coerceString(get(scriptFormValue, "publicationTitle")),
      authorName: coerceString(get(scriptFormValue, "authorName")),
      languages: resolveLanguageIds(languageOptions, rawLanguages),
      materialUrl: coerceString(get(scriptFormValue, "uploadMaterial")),
      termsAccepted: resolveTermsAccepted(formValuesList),
      isLocalFilm:
        coerceString(get(scriptFormValue, "applyingLocalMaterial"))?.toLowerCase() === "yes",
      directorName: coerceString(get(scriptFormValue, "filmDirector")),
      authorNationality: coerceString(get(scriptFormValue, "writerNationality")),
      authorIdentityNumber: coerceString(get(scriptFormValue, "writerEmiratesId")),
    },
  };
};
