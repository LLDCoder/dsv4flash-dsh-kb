import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceBoolean,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultBooleanValue,
  findFirstFormValue,
  resolveSelectedNumberIdsFromSelectTableSingle,
} from "./feeStrategyPayloadUtils";

const TEMPORARY_PRESS_CARD_ACTIVITY_ID = 2035;
const REGULAR_PRESS_CARD_ACTIVITY_ID = 2036;

const resolveIsTemporaryPressCard = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const activityIds = resolveSelectedNumberIdsFromSelectTableSingle(formValuesList);
  const activityId =
    activityIds.find(
      (candidate) =>
        candidate === TEMPORARY_PRESS_CARD_ACTIVITY_ID ||
        candidate === REGULAR_PRESS_CARD_ACTIVITY_ID,
    ) ?? activityIds[0];

  if (activityId === TEMPORARY_PRESS_CARD_ACTIVITY_ID) return true;
  if (activityId === REGULAR_PRESS_CARD_ACTIVITY_ID) return false;

  return coerceBoolean(findFirstFormValue(formValuesList, ["isTemporaryPressCard"]));
};

export const buildService1801FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1801FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1801FeeEnginePayload = async ({
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
      isTemporaryPressCard: defaultBooleanValue(
        resolveIsTemporaryPressCard(formValuesList),
      ),
    },
  });
};
