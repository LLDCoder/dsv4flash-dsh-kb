import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import get from "lodash/get";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  resolveSelectedIds,
  resolveSelectTableValue,
} from "../ruleStrategyPayloadUtils";
import {
  coerceNumber,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
} from "./feeStrategyPayloadUtils";

const SERVICE_80042_APPLICATION_DETAIL_ID = 802002;

const resolveActivitySelectionValue = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  if (selectTableValue) return selectTableValue;

  for (const formValues of formValuesList) {
    const selectTableSingleValue = get(formValues, "SelectTableSingle");
    if (selectTableSingleValue) {
      return selectTableSingleValue as {
        selectedKey?: string | number | Array<string | number>;
        prefilledSelectedKey?: string | number | Array<string | number>;
        tableData?: Array<{ Id?: unknown }>;
      };
    }
  }

  return undefined;
};

const resolveActivityIds = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const selectTableValue = resolveActivitySelectionValue(formValuesList);

  return resolveSelectedIds(selectTableValue)
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

export const buildService80042FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService80042FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService80042FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationId,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const activityIds = resolveActivityIds(formValuesList);

  if (activityIds.length === 0) {
    throw new Error(
      "Unable to build service 80042 fee payload: at least one activityId is required.",
    );
  }

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 3,
    payload: {
      applicationId,
      applicationDetailId: SERVICE_80042_APPLICATION_DETAIL_ID,
      activityIds,
    },
  });
};
