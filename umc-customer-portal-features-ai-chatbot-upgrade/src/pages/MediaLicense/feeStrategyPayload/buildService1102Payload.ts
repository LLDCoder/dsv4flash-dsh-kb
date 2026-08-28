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
import get from "lodash/get";

const DAILY = 1;
const WEEKLY = 2;
const BIWEEKLY = 3;
const MONTHLY = 4;
const QUARTERLY = 5;
const YEARLY = 6;

const SERVICE_1102_ACTIVITY_RULES: Record<number, Service1102ActivityRule> = {
  2074: { periodicalTypeId: WEEKLY },
  2075: { periodicalTypeId: BIWEEKLY },
  2076: { periodicalTypeId: MONTHLY },
  2077: { periodicalTypeId: QUARTERLY },
  2078: { periodicalTypeId: YEARLY },
};

const resolvePeriodicalTypeId = (
  activityId: number | undefined,
) => {
  const activityRule = activityId ? SERVICE_1102_ACTIVITY_RULES[activityId] : undefined;
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


export const buildService1102FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1102FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1102FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {

  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const activityId = resolveActivityId(selectTableSingle);
  const periodicalTypeId = resolvePeriodicalTypeId(activityId);

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      periodicalTypeId: periodicalTypeId,
    },
  });
};
