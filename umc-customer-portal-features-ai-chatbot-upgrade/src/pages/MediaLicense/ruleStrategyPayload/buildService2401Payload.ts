import { nowGst, toApi } from "@/utils/gstTime";
import type { Service2401RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import { resolveEstablishmentId } from "../ruleStrategyPayloadShared";
import { coerceNumber, coerceString, getFirstDefined } from "../ruleStrategyPayloadUtils";

const resolveMediaLicenseInternalId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const raw = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelfMonitorForm.mediaLicenseInternalId"),
      get(formValues, "SelfMonitorForm.mediaLicenseId"),
      get(formValues, "SelfMonitorForm.selectedMediaLicenseId"),
      get(formValues, "mediaLicenseInternalId"),
      get(formValues, "mediaLicenseId"),
    ]),
  );

  return coerceNumber(raw) ?? coerceString(raw);
};

export const buildService2401Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service2401RuleStrategyValidatePayload> => {
  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      mediaLicenseInternalId: resolveMediaLicenseInternalId(formValuesList),
    },
  };
};
