import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1005RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  resolveEstablishmentId,
  type BuildServiceRuleStrategyPayloadParams,
} from "../ruleStrategyPayloadShared";
import {
  coerceNumber,
  coerceString,
  getFirstArrayItem,
  getFirstDefined,
  resolveDateRange,
  resolveTermsAgreed,
} from "../ruleStrategyPayloadUtils";

const CINEMA_PERMIT_TYPE_ID = 1;

const resolveNationalityId = (rawValue: unknown) => {
  const normalizedValue = getFirstArrayItem(rawValue);
  if (normalizedValue === undefined || normalizedValue === null) return undefined;

  return coerceNumber(normalizedValue);
};

export const buildService1005Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1005RuleStrategyValidatePayload> => {
  const screeningPeriod = resolveDateRange(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "ScreeningPeriod"),
      ]),
    ),
  );
  const rawCinemaIds =
    (getFirstDefined(
      formValuesList.flatMap((formValues) => [get(formValues, "Cinemas")]),
    ) as unknown[] | undefined) ?? [];
  const categoryId = formValuesList
    .map((formValues) => resolveNationalityId(get(formValues, "Source")))
    .find((item): item is number => item !== undefined);
  const subCategoryId = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "subCategoryId")]),
  ) as string | number | undefined;

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      cinemaPermitTypeId: CINEMA_PERMIT_TYPE_ID,
      title: coerceString(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "Title")])),
      ),
      categoryId,
      subCategoryId,
      advertisementLink: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "AdvertisementURL"),
          ]),
        ),
      ),
      cinemaIds: rawCinemaIds,
      copyrightStartDate: screeningPeriod.startDate,
      copyrightEndDate: screeningPeriod.endDate,
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
