import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";

const FLAG = 5;
const PACKAGE_TYPE_ID = 9;
const MEDIA_MATERIAL_TYPE_CODE = "04";
const REQUESTED_PACKAGE_ITEMS = ["POSTER", "TRAILER"];

export const buildService1010FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1010FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1010FeeEnginePayload = async ({
  config,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      flag: FLAG,
      packageTypeId: PACKAGE_TYPE_ID,
      mediaMaterialTypeCode: MEDIA_MATERIAL_TYPE_CODE,
      requestedPackageItems: REQUESTED_PACKAGE_ITEMS,
    },
  });
};
