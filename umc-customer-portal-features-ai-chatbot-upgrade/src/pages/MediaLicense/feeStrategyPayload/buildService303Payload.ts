import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";

import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultNumberArrayValue,
  defaultNumberValue,
  findFirstFormValue,
  getFirstDefined,
  coerceNumber
} from "./feeStrategyPayloadUtils";

export const buildService303FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService303FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

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

export const buildService303FeeEnginePayload = async ({
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

      arrivalPortId: defaultNumberValue(
        findFirstFormValue(formValuesList, ["ArrivalPort"]),
      ),
    },
  });
};
