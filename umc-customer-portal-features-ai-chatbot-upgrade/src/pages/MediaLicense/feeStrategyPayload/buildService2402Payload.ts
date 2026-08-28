import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

// Self-Monitor Program renewal: fee action type "renew".
const ACTION_TYPE_RENEW = 2;

const resolveMediaLicenseId = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
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
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
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

export const buildService2402FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService2402FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService2402FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: ACTION_TYPE_RENEW,
    payload: {
      mediaLicenseId: resolveMediaLicenseId(formValuesList),
      selfMonitorCertificateNumber:
        resolveSelfMonitorCertificateNumber(formValuesList),
    },
  });
};
