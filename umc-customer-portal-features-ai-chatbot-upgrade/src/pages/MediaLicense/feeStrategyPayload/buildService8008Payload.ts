import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  getFirstDefined,
} from "./feeStrategyPayloadUtils";

const resolveActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const rawSelectedKeys = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "activityIds"),
      get(formValues, "SelectTableSingle.activityIds"),
      get(formValues, "SelectTableSingle.selectedKey"),
      get(formValues, "selectedKey"),
    ]),
  );

  const normalizedIds = (Array.isArray(rawSelectedKeys) ? rawSelectedKeys : [rawSelectedKeys])
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);

  if (normalizedIds.length > 0) {
    return normalizedIds;
  }

  return formValuesList
    .flatMap((formValues) => {
      const tableData = get(formValues, "SelectTableSingle.tableData");
      return Array.isArray(tableData) ? tableData : [];
    })
    .map((item) => coerceNumber(get(item, "Id")))
    .filter((item): item is number => item !== undefined);
};

export const buildService8008FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService8008FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService8008FeeEnginePayload = async ({
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
      activityIds: resolveActivityIds(formValuesList),
    },
  });
};
