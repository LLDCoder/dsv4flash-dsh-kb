import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1006RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  resolveEstablishmentId,
  type BuildServiceRuleStrategyPayloadParams,
} from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceString,
  getFirstDefined,
  resolveDateRange,
  resolveTermsAgreed,
  resolveUrlListItems,
} from "../ruleStrategyPayloadUtils";

const CINEMA_PERMIT_TYPE_ID = 3;

export const buildService1006Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service1006RuleStrategyValidatePayload => {
  const screeningPeriod = resolveDateRange(
    getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "ScreeningPeriod")])),
  );
  const isTicketedRaw = getFirstDefined(
    formValuesList.flatMap((formValues) => [get(formValues, "Will the screening be free or ticketed"), get(formValues, "isTicketed")]),
  );

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      cinemaPermitTypeId: CINEMA_PERMIT_TYPE_ID,
      titleUrlItems: resolveUrlListItems(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "urlList")])),
      ),
      startDate: screeningPeriod.startDate,
      endDate: screeningPeriod.endDate,
      isTicketed:
        coerceBoolean(isTicketedRaw) ??
        (coerceString(isTicketedRaw)?.toLowerCase() === "option 2"),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
