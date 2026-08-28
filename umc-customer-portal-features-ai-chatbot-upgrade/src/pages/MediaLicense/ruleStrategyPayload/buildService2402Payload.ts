import { nowGst, toApi } from "@/utils/gstTime";
import type { Service2402RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import type { BuildServiceRuleStrategyPayloadParams } from "../ruleStrategyPayloadShared";
import { resolveEstablishmentId } from "../ruleStrategyPayloadShared";
import { coerceNumber, coerceString, getFirstDefined } from "../ruleStrategyPayloadUtils";

// Self-Monitor Program renewal: rule action type "renew".
//
// Value confirmed by the backend for the rule engine. Sending "new" (1) makes
// the engine reject 2402 with BRV_ACTION_NOT_SUPPORTED ("Supported actions:
// Renew").
const ACTION_TYPE_RENEW = 2;

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

const resolveSelfMonitorCertificateNumber = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const raw = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelfMonitorForm.selfMonitorCertificateNumber"),
      get(formValues, "SelfMonitorForm.certificateNumber"),
      get(formValues, "SelfMonitorForm.selectedCertificateNumber"),
      get(formValues, "selfMonitorCertificateNumber"),
      get(formValues, "certificateNumber"),
    ]),
  );

  return coerceString(raw);
};

export const buildService2402Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service2402RuleStrategyValidatePayload> => {
  return {
    actionType: ACTION_TYPE_RENEW,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      mediaLicenseInternalId: resolveMediaLicenseInternalId(formValuesList),
      selfMonitorCertificateNumber:
        resolveSelfMonitorCertificateNumber(formValuesList),
    },
  };
};
