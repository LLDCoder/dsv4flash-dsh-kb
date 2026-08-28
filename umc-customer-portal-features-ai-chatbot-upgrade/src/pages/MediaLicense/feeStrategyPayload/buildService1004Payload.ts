import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";

export const buildService1004FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1004FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1004FeeEnginePayload = async ({
  config,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      mediaMaterialTypeCode: "03",
      flag: 3,
    },
  });
};
