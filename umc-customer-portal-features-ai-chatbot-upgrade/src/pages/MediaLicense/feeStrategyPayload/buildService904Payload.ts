import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";
import {
  coerceNumber,
  resolveSelectedIds,
  resolveSelectTableValue,
} from "../ruleStrategyPayloadUtils";

const resolveActivityIds = (
  formValuesList: Array<Record<string, unknown>>,
): number[] => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  const selectedIds = resolveSelectedIds(selectTableValue);

  return selectedIds
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService904FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService904FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService904FeeEnginePayload = async ({
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
    actionType: 3,
    payload: {
      applicationNo: applicationNo || "",
      activityIds: resolveActivityIds(formValuesList),
    },
  });
};
