import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  coerceNumber,
  defaultNumberArrayValue,
  defaultNumberValue,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const resolveService301MaterialTypeIds = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const dataList = getFirstDefined(
    formValuesList.map((formValues) => get(formValues, "dataList")),
  );

  if (Array.isArray(dataList)) {
    const materialTypeIds = dataList
      .map((item) => coerceNumber(get(item, "materialTypeId")))
      .filter((item): item is number => item !== undefined);

    if (materialTypeIds.length > 0) {
      return materialTypeIds;
    }
  }

  return defaultNumberArrayValue(
    getFirstDefined(
      formValuesList.map((formValues) => get(formValues, "materialTypeIds")),
    ),
  );
};

const resolveService301ArrivalPortId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return defaultNumberValue(
    getFirstDefined(
      formValuesList.map((formValues) => get(formValues, "ArrivalPort")),
    ),
  );
};

export const buildService301FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService301FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService301FeeEnginePayload = async ({
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
      materialTypeIds: resolveService301MaterialTypeIds(formValuesList),
      arrivalPortId: resolveService301ArrivalPortId(formValuesList),
    },
  });
};
