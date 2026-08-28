import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultBooleanValue,
  defaultNumberValue,
  findFirstFormValue,
  resolveDateRangeValue,
} from "./feeStrategyPayloadUtils";

export const buildService1006FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1006FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1006FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const dateRange = resolveDateRangeValue(
    findFirstFormValue(formValuesList, ["ScreeningPeriod"]),
  );

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      cinemaPermitTypeId: 3,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      isTicketed: defaultBooleanValue(
        findFirstFormValue(formValuesList, ["isTicketed"]),
      ),
    },
  });
};
