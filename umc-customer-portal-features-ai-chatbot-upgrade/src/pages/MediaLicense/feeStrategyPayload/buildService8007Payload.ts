import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  resolveSelectedNumberIdsFromSelectTableSingle,
} from "./feeStrategyPayloadUtils";

export const buildService8007FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService8007FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService8007FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      activityIds: resolveSelectedNumberIdsFromSelectTableSingle(formValuesList),
    },
  });
};
