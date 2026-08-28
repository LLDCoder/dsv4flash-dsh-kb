import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import { ModifyEnginePayloadError } from "../modifyEnginePayloadError";
import { buildService903ModifyFacts } from "../service903ModifyFacts";
import {
  coerceNumber,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";

export const buildService903FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService903FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService903FeeEnginePayload = async ({
  config,
  formValuesList,
  modifyChangeSets,
  currentProfileId,
  userInfo,
  sourceApplicationId,
  sourceApplicationDetailId,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const applicationId = coerceNumber(sourceApplicationId);
  const applicationDetailId = coerceNumber(sourceApplicationDetailId);
  if (applicationId === undefined || applicationDetailId === undefined) {
    throw new ModifyEnginePayloadError(
      "missing-context",
      "Unable to build service 903 fee payload: applicationId and applicationDetailId are required.",
    );
  }

  const facts = buildService903ModifyFacts({
    formValuesList,
    modifyChangeSets,
  });
  if (facts.modificationItems.length === 0) {
    throw new ModifyEnginePayloadError(
      "no-supported-changes",
      "Unable to build service 903 fee payload: at least one supported modification is required.",
    );
  }

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 4,
    payload: {
      applicationId,
      applicationDetailId,
      modificationItems: facts.modificationItems,
      addedEconomicActivityIds: facts.addedEconomicActivityIds,
      removedEconomicActivityIds: facts.removedEconomicActivityIds,
    },
  });
};
