import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1007RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
  resolveSelectTableSingleValue,
} from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceString,
  getFirstDefined,
  resolveDateRange,
  resolveTermsAgreed,
  resolveUploadUrl,
  resolveUrlListItems,
} from "../ruleStrategyPayloadUtils";

const CINEMA_PERMIT_TYPE_ID = 4;

export const buildService1007Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service1007RuleStrategyValidatePayload => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
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
      nocFileUrl: resolveUploadUrl(
        getFirstDefined(formValuesList.flatMap((formValues) => [get(formValues, "ProducerNocAuthorizationLetter")])),
      ),
      termsAgreed: resolveTermsAgreed(formValuesList),
      activityId: selectTableSingle?.tableData?.[0]?.Id,
    },
  };
};
