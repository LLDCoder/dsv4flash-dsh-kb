import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  findFirstFormValue,
  normalizeDateValue,
} from "./feeStrategyPayloadUtils";

export const buildService14FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService14FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService14FeeEnginePayload = async ({
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
      startingDate: normalizeDateValue(
        findFirstFormValue(formValuesList, [
          "FilmingPurpose.photographyStartingDate",
        ]),
      ),
      endingDate: normalizeDateValue(
        findFirstFormValue(formValuesList, [
          "FilmingPurpose.photographyEndingDate",
        ]),
      ),
    },
  });
};
