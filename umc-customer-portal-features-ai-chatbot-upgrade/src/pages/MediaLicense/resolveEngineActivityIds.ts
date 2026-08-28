import { getEconomicActivitys } from "@/services/services";
import { coerceNumber } from "./ruleStrategyPayloadUtils";

type EconomicActivity = {
  id?: unknown;
  code?: unknown;
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

export const resolveEngineActivityIds = async (
  serviceCode: string,
  selectedActivityIds: number[],
): Promise<number[]> => {
  if (selectedActivityIds.length === 0) {
    return [];
  }

  const response = await getEconomicActivitys(serviceCode);
  const activities = flattenEconomicActivities(
    Array.isArray(response.data) ? response.data : [],
  );
  const engineActivityIds = new Set<number>();
  const engineActivityIdByEconomicActivityId = new Map<number, number>();

  activities.forEach((activity) => {
    const engineActivityId = coerceNumber(activity.code);
    if (engineActivityId === undefined) {
      return;
    }

    engineActivityIds.add(engineActivityId);

    const economicActivityId = coerceNumber(activity.id);
    if (economicActivityId !== undefined) {
      engineActivityIdByEconomicActivityId.set(
        economicActivityId,
        engineActivityId,
      );
    }
  });

  return selectedActivityIds.map((selectedActivityId) => {
    if (engineActivityIds.has(selectedActivityId)) {
      return selectedActivityId;
    }

    const engineActivityId = engineActivityIdByEconomicActivityId.get(
      selectedActivityId,
    );
    if (engineActivityId !== undefined) {
      return engineActivityId;
    }

    throw new Error(
      `Unable to resolve engine activity ID for selected economic activity ${selectedActivityId}.`,
    );
  });
};
