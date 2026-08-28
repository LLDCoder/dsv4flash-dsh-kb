import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultNumberValue,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";
import { getService302FeeMaterialTypeIds } from "../service302Utils";

const resolveService302MaterialTypeIds = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const currentFormValues = getFirstDefined(formValuesList) as
    | Record<string, unknown>
    | undefined;
  return getService302FeeMaterialTypeIds(currentFormValues);
};

const resolveService302ArrivalPortId = (
  formValuesList: Array<Record<string, unknown>>,
) =>
  defaultNumberValue(
    getFirstDefined(
      formValuesList.map((formValues) => get(formValues, "ArrivalPort")),
    ),
  );

export const buildService302FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService302FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService302FeeEnginePayload = async ({
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
      materialTypeIds: resolveService302MaterialTypeIds(formValuesList),
      arrivalPortId: resolveService302ArrivalPortId(formValuesList),
    },
  });
};
