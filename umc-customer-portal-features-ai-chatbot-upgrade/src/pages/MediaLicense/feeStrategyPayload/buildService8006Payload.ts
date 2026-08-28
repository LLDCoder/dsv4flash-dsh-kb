import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import { getEconomicActivitys } from "@/services/services";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceNumber,
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  getFirstDefined,
  resolveSelectTableSingleValue,
} from "./feeStrategyPayloadUtils";

type EconomicActivity = {
  id?: number | string;
  code?: string;
  childData?: EconomicActivity[] | null;
};

const flattenEconomicActivities = (
  activities: EconomicActivity[] = [],
): EconomicActivity[] => {
  return activities.flatMap((activity) => [
    activity,
    ...flattenEconomicActivities(activity.childData || []),
  ]);
};

const resolveSelectedActivityValues = (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
) => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const selectedKey = selectTableSingle?.selectedKey;
  const normalizedSelectedKey = Array.isArray(selectedKey)
    ? selectedKey
    : selectedKey !== undefined && selectedKey !== null
      ? [selectedKey]
      : [];

  if (normalizedSelectedKey.length > 0) {
    return normalizedSelectedKey;
  }

  return (selectTableSingle?.tableData || [])
    .map((item) => getFirstDefined([item?.Code, item?.code, item?.Id]))
    .filter((item) => item !== undefined && item !== null);
};

const resolveActivityIds = async (
  formValuesList: BuildServiceFeeStrategyPayloadParams["formValuesList"],
): Promise<number[]> => {
  const selectedValues = resolveSelectedActivityValues(formValuesList)
    .map((item) => coerceString(item))
    .filter((item): item is string => !!item);

  if (selectedValues.length === 0) {
    throw new Error("Unable to resolve service 8006 fee activity code: no activity selected.");
  }

  const response = await getEconomicActivitys("8006");
  const activities = flattenEconomicActivities(response.data || []);
  const validCodes = new Set(
    activities
      .map((activity) => coerceString(activity.code))
      .filter((code): code is string => !!code),
  );
  const codeById = new Map(
    activities
      .map((activity) => {
        const id = coerceString(activity.id);
        const code = coerceString(activity.code);
        return id && code ? ([id, code] as const) : undefined;
      })
      .filter((entry): entry is readonly [string, string] => !!entry),
  );

  return selectedValues.map((value) => {
    const resolvedCode = validCodes.has(value) ? value : codeById.get(value);
    if (resolvedCode) {
      const activityId = coerceNumber(resolvedCode);
      if (activityId !== undefined) return activityId;

      throw new Error(
        `Unable to resolve service 8006 fee activity id: activity code "${resolvedCode}" is not a valid number.`,
      );
    }

    throw new Error(
      `Unable to resolve service 8006 fee activity code for selected activity "${value}".`,
    );
  });
};

export const buildService8006FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService8006FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService8006FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const activityIds = await resolveActivityIds(formValuesList);

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    payload: {
      activityIds,
    },
  });
};
