import { nowGst, toApi } from "@/utils/gstTime";
import { getLanguages, type Service201RuleStrategyValidatePayload } from "@/services/services";
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

const PUBLICATION_TYPE_ID = 3;
const PRINTED_TYPE_ID = 4;

export const buildService201Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service201RuleStrategyValidatePayload> => {
  const rawLanguages = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "Languages"),
      get(formValues, "languages"),
      get(formValues, "Language"),
      get(formValues, "language"),
    ]),
  );
  const languageOptions = unwrapResponseRows(await getLanguages()) as LanguageOption[];

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      publicationTypeId: PUBLICATION_TYPE_ID,
      printedTypeId: PRINTED_TYPE_ID,
      title: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "PublicationTitle"),
            get(formValues, "publicationTitle"),
            get(formValues, "title"),
          ]),
        ),
      ),
      authorName: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "AuthorName"),
            get(formValues, "authorName"),
          ]),
        ),
      ),
      languages: resolveLanguageIds(languageOptions, rawLanguages),
      numberOfEpisodes: coerceNumber(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "NumberOfEpisodes"),
            get(formValues, "numberOfEpisodes"),
          ]),
        ),
      ),
      materialUrl: resolveUploadUrl(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "UploadMaterial"),
            get(formValues, "uploadMaterial"),
          ]),
        ),
      ),
      termsAccepted: resolveTermsAccepted(formValuesList),
    },
  };
};
