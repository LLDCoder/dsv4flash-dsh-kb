import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {

  coerceNumber,
  getFirstDefined,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  resolveSelectTableSingleValue,
} from "./feeStrategyPayloadUtils";
import { get } from "lodash";


const DAILY = 1;
const WEEKLY = 2;

const SERVICE_1101_ACTIVITY_RULES: Record<number, Service1101ActivityRule> = {
  2071: { periodicalTypeId: DAILY },
  2072: { periodicalTypeId: WEEKLY },
};

const resolvePeriodicalTypeId = (
  activityId: number | undefined,
) => {
  const activityRule = activityId ? SERVICE_1101_ACTIVITY_RULES[activityId] : undefined;
  if (activityRule) return activityRule.periodicalTypeId;

};

const resolveActivityId = (
  selectTableSingle?: {
    selectedKey?: string | number | Array<string | number>;
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedKey = selectTableSingle?.selectedKey;
  const firstSelectedKey = Array.isArray(selectedKey) ? selectedKey[0] : selectedKey;

  return coerceNumber(
    getFirstDefined([firstSelectedKey, get(selectTableSingle, "tableData.0.Id")]),
  );
};


export const buildService1101FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1101FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1101FeeEnginePayload = async ({
  config,
  currentProfileId,
  userInfo,
  formValuesList
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
    const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
    const activityId = resolveActivityId(selectTableSingle);
    const periodicalTypeId = resolvePeriodicalTypeId(activityId);

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      periodicalTypeId,
    },
  });
};
