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

// Self-Monitor Program new application: fee action type "new".
const ACTION_TYPE_NEW = 1;

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

export const buildService2401FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService2401FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService2401FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: ACTION_TYPE_NEW,
    payload: {
      mediaLicenseId: resolveMediaLicenseId(formValuesList),
    },
  });
};
