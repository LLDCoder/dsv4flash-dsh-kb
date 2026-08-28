import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  resolveSelectedNumberIdsFromSelectTable,
} from "./feeStrategyPayloadUtils";

export const buildService901FeePayload = async ({
  ...params
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService901FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService901FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationNo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      applicationNo: applicationNo || "",
      activityIds: resolveSelectedNumberIdsFromSelectTable(formValuesList),
    },
  });
};
