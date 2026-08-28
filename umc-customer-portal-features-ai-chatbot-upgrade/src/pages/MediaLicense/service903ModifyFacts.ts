import {
  coerceNumber,
  coerceString,
  resolveSelectTableValue,
} from "./ruleStrategyPayloadUtils";
import { ModifyEnginePayloadError } from "./modifyEnginePayloadError";

export interface Service903ModifyFacts {
  modificationItems: string[];
  establishmentFields: string[];
  tradeLicenseNumber?: string;
  addedEconomicActivityIds: number[];
  removedEconomicActivityIds: number[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const normalizeNumberIds = (values: Array<number | string>): number[] =>
  Array.from(
    new Set(
      values
        .map((value) => coerceNumber(value))
        .filter((value): value is number => value !== undefined),
    ),
  );

const resolveSelectTableIds = (
  value:
    | {
        selectedKey?: string | number | Array<string | number>;
        tableData?: Array<{ Id?: unknown }>;
      }
    | undefined,
): number[] => {
  if (Array.isArray(value?.selectedKey)) {
    return normalizeNumberIds(value.selectedKey);
  }
  if (value?.selectedKey !== undefined && value.selectedKey !== null) {
    return normalizeNumberIds([value.selectedKey]);
  }
  return normalizeNumberIds(
    (value?.tableData ?? [])
      .map((item) => item.Id)
      .filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      ),
  );
};

const collectChangeItems = (changeSets: unknown[] | undefined) =>
  (changeSets ?? []).flatMap((changeSet) => {
    if (!isRecord(changeSet) || !Array.isArray(changeSet.changes)) return [];
    return changeSet.changes.filter(isRecord);
  });

const normalizeFieldKey = (value: unknown): string =>
  String(value ?? "").trim();

const isTradeLicenseNumberChange = (change: Record<string, unknown>) => {
  const fieldKey = normalizeFieldKey(change.fieldKey);
  const leafKey = fieldKey.split(".").pop()?.toLowerCase();
  return ["commerciallicensenumber", "tradelicensenumber"].includes(
    leafKey ?? "",
  );
};

const isProfileChange = (change: Record<string, unknown>) => {
  return (
    change.component === "ProfileForm" ||
    change.ownerComponent === "ProfileForm"
  );
};

const resolveActivityChanges = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  const selectedIds = resolveSelectTableIds(selectTableValue);
  const prefilledIds = resolveSelectTableIds({
      selectedKey: selectTableValue?.prefilledSelectedKey,
      tableData: [],
    });
  const selectedIdSet = new Set(selectedIds);
  const prefilledIdSet = new Set(prefilledIds);

  return {
    addedEconomicActivityIds: selectedIds.filter(
      (id) => !prefilledIdSet.has(id),
    ),
    removedEconomicActivityIds: prefilledIds.filter(
      (id) => !selectedIdSet.has(id),
    ),
  };
};

export const buildService903ModifyFacts = ({
  formValuesList,
  modifyChangeSets,
}: {
  formValuesList: Array<Record<string, unknown>>;
  modifyChangeSets?: unknown[];
}): Service903ModifyFacts => {
  const changeItems = collectChangeItems(modifyChangeSets);
  const tradeLicenseChange = changeItems.find(isTradeLicenseNumberChange);
  const establishmentFields = Array.from(
    new Set(
      changeItems
        .filter(
          (change) =>
            isProfileChange(change) && !isTradeLicenseNumberChange(change),
        )
        .map((change) => normalizeFieldKey(change.fieldKey))
        .filter(Boolean),
    ),
  );
  const tradeLicenseNumber = tradeLicenseChange
    ? coerceString(tradeLicenseChange.afterValue)
    : undefined;
  const {
    addedEconomicActivityIds,
    removedEconomicActivityIds,
  } = resolveActivityChanges(formValuesList);

  if (removedEconomicActivityIds.length > 0) {
    throw new ModifyEnginePayloadError(
      "no-supported-changes",
      "Unable to build service 903 engine payload: removing existing Media Activities is not allowed.",
    );
  }

  const modificationItems: string[] = [];
  if (establishmentFields.length > 0) {
    modificationItems.push("ESTABLISHMENT_INFORMATION");
  }
  if (tradeLicenseChange) {
    modificationItems.push("TRADE_LICENSE_NUMBER");
  }
  if (addedEconomicActivityIds.length > 0) {
    modificationItems.push("MEDIA_ACTIVITY_ADD");
  }
  return {
    modificationItems,
    establishmentFields,
    ...(tradeLicenseNumber ? { tradeLicenseNumber } : {}),
    addedEconomicActivityIds,
    removedEconomicActivityIds,
  };
};
