import type {
  LifecycleActivityContext,
  LifecycleActivityItem,
} from "@/services/myRequest";

type PatchFormDataWithLifecycleActivityContextParams = {
  parsedFormData: Record<string, unknown>;
  lifecycleActivityContext: LifecycleActivityContext;
};

export type LifecycleSelectTableConfig = {
  selectionMode: LifecycleActivityContext["selectionMode"];
  selectedActivityIds: string[];
  existingActivities: LifecycleActivityItem[];
  replaceServiceOptions: boolean;
};

type SelectTableOptionRecord = {
  id: string;
  label: string;
  value: string;
  price: number;
  category: string;
  hasHierarchy: false;
  nameAr?: string;
  nameEn?: string;
};

const DEFAULT_OPTION_CATEGORY = "Activities";

const collectSchemaComponentPaths = (
  schemaNode: unknown,
  componentName: string,
  parentPath: string[] = [],
): string[][] => {
  if (!schemaNode || typeof schemaNode !== "object") {
    return [];
  }

  const properties = schemaNode.properties;
  if (!properties || typeof properties !== "object") {
    return [];
  }

  return Object.entries(properties).flatMap(([key, value]) => {
    if (!value || typeof value !== "object") {
      return [];
    }

    const nextNode = value as Record<string, unknown>;
    const nextPath = [...parentPath, key];
    const matchedPaths =
      nextNode["x-component"] === componentName ? [nextPath] : [];

    return [
      ...matchedPaths,
      ...collectSchemaComponentPaths(nextNode, componentName, nextPath),
    ];
  });
};

const getValueByPath = (source: Record<string, unknown>, path: string[]) =>
  path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, source);

const getSchemaNodeByPath = (
  schema: Record<string, unknown>,
  path: string[],
) =>
  path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    const properties = (current as Record<string, unknown>).properties;
    if (!properties || typeof properties !== "object") {
      return undefined;
    }

    return (properties as Record<string, unknown>)[key];
  }, schema);

const setValueByPath = (
  target: Record<string, unknown>,
  path: string[],
  value: unknown,
) => {
  if (!path.length) {
    return;
  }

  let current: Record<string, unknown> = target;
  path.forEach((segment, idx) => {
    if (idx === path.length - 1) {
      current[segment] = value;
      return;
    }

    const nextValue = current[segment];
    current[segment] =
      nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)
        ? { ...nextValue }
        : {};
    current = current[segment];
  });
};

const buildSelectTableOptions = (
  activities: LifecycleActivityItem[],
): SelectTableOptionRecord[] =>
  activities.map((activity) => ({
    id: String(activity.id),
    value: String(activity.id),
    label: activity.nameEn || String(activity.id),
    nameAr: activity.nameAr,
    nameEn: activity.nameEn,
    price: 0,
    category: DEFAULT_OPTION_CATEGORY,
    hasHierarchy: false,
  }));

const buildSelectTableTableData = (activities: LifecycleActivityItem[]) =>
  activities.map((activity, idx) => ({
    Number: idx + 1,
    Activity: activity.nameEn || String(activity.id),
    money: 0,
    Id: String(activity.id),
    ActivityAr: activity.nameAr,
    ActivityEn: activity.nameEn,
  }));

const buildLifecycleSelectTableConfig = (
  lifecycleActivityContext: LifecycleActivityContext,
): LifecycleSelectTableConfig => ({
  selectionMode: lifecycleActivityContext.selectionMode,
  selectedActivityIds: lifecycleActivityContext.selectedActivityIds.map((id) =>
    String(id),
  ),
  existingActivities: lifecycleActivityContext.existingActivities,
  replaceServiceOptions: lifecycleActivityContext.selectionMode !== "modify-final",
});

const resolveSelectedActivities = (
  lifecycleActivityContext: LifecycleActivityContext,
) => {
  if (lifecycleActivityContext.selectedActivities.length > 0) {
    return lifecycleActivityContext.selectedActivities;
  }

  const selectedIdSet = new Set(
    lifecycleActivityContext.selectedActivityIds.map((id) => String(id)),
  );

  return lifecycleActivityContext.existingActivities.filter((activity) =>
    selectedIdSet.has(String(activity.id)),
  );
};

export const patchFormDataWithLifecycleActivityContext = ({
  parsedFormData,
  lifecycleActivityContext,
}: PatchFormDataWithLifecycleActivityContextParams) => {
  const selectTablePaths = [
    ...collectSchemaComponentPaths(parsedFormData.schema, "SelectTable"),
    ...collectSchemaComponentPaths(parsedFormData.schema, "SelectTableSingle"),
  ];
  const selectTablePath = selectTablePaths[0];

  if (!selectTablePath) {
    return parsedFormData;
  }

  const nextSchema = parsedFormData.schema
    ? JSON.parse(JSON.stringify(parsedFormData.schema))
    : parsedFormData.schema;
  const nextFormValues = { ...(parsedFormData.formValues || {}) };
  const selectionMode = lifecycleActivityContext.selectionMode;
  const selectedActivityIds = lifecycleActivityContext.selectedActivityIds.map(
    (id) => String(id),
  );
  const existingActivityIds = lifecycleActivityContext.existingActivities.map(
    (activity) => String(activity.id),
  );
  const selectedActivities = resolveSelectedActivities(lifecycleActivityContext);
  const selectedTableActivities =
    selectionMode === "retained"
      ? lifecycleActivityContext.existingActivities
      : selectedActivities;
  const currentFieldValue = getValueByPath(nextFormValues, selectTablePath);
  const nextFieldValue =
    currentFieldValue &&
    typeof currentFieldValue === "object" &&
    !Array.isArray(currentFieldValue)
      ? { ...currentFieldValue }
      : {};
  const lifecycleActivityConfig =
    buildLifecycleSelectTableConfig(lifecycleActivityContext);
  const nextSelectedKey =
    selectionMode === "retained" ? selectedActivityIds : selectedActivityIds;
  const nextPrefilledSelectedKey =
    selectionMode === "retained" ? existingActivityIds : selectedActivityIds;

  const nextSchemaFieldNode = getSchemaNodeByPath(nextSchema, selectTablePath);
  if (nextSchemaFieldNode && typeof nextSchemaFieldNode === "object") {
    const nextComponentProps = {
      ...(nextSchemaFieldNode["x-component-props"] || {}),
      lifecycleActivityConfig,
    };

    if (lifecycleActivityConfig.replaceServiceOptions) {
      nextComponentProps.options = buildSelectTableOptions(
        lifecycleActivityContext.existingActivities,
      );
    }

    nextSchemaFieldNode["x-component-props"] = nextComponentProps;
  }

  setValueByPath(nextFormValues, selectTablePath, {
    ...nextFieldValue,
    prefilledSelectedKey: nextPrefilledSelectedKey,
    selectedKey: nextSelectedKey,
    tableData: buildSelectTableTableData(selectedTableActivities),
  });

  return {
    ...parsedFormData,
    formValues: nextFormValues,
    schema: nextSchema,
  };
};
