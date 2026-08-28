import { normalizeFeeAmount } from "@/utils/activityFee";

type SelectTableOptionRecord = {
  id: string;
  label: string;
  value: string;
  price?: number;
  category: string;
  nameAr?: string;
  nameEn?: string;
};

type PatchFormDataWithSelectTableOptionsParams = {
  serviceCode?: string | number | null;
  parsedFormData: Record<string, any>;
  selectTableOptions: any[];
};

const flattenSelectTableOptions = (
  serviceOptions: any[],
): SelectTableOptionRecord[] => {
  const flat: SelectTableOptionRecord[] = [];

  (serviceOptions || []).forEach((parent: any) => {
    if (!parent?.childData?.length) {
      flat.push({
        id: String(parent.id ?? parent.key ?? parent.value),
        label: String(parent.nameEn ?? parent.value),
        value: String(parent.id ?? parent.key ?? parent.value),
        nameAr: parent.nameAr,
        nameEn: parent.nameEn,
        price: normalizeFeeAmount(parent.fee),
        category: String(parent.nameEn ?? parent.value ?? ""),
      });
      return;
    }

    parent.childData.forEach((child: any) => {
      flat.push({
        id: String(child.id ?? child.key ?? child.value),
        label: String(child.nameEn ?? child.value),
        value: String(child.id ?? child.value),
        price: normalizeFeeAmount(child.fee),
        category: String(parent.nameEn ?? parent.value ?? ""),
        nameAr: child.nameAr,
        nameEn: child.nameEn,
      });
    });
  });

  return flat;
};

const buildSelectTableTableData = (
  values: Array<string | number>,
  optionList: SelectTableOptionRecord[],
) => {
  const optionMap = new Map<string, SelectTableOptionRecord>();
  optionList.forEach((option) => {
    optionMap.set(String(option.value), option);
  });

  return values
    .map((value) => optionMap.get(String(value)))
    .filter(Boolean)
    .map((option, idx) => ({
      Number: idx + 1,
      Activity: option!.label,
      money: option!.price,
      Id: option!.id,
      ActivityAr: option!.nameAr,
      ActivityEn: option!.nameEn,
    }));
};

const collectSchemaComponentPaths = (
  schemaNode: any,
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

    const nextNode = value as Record<string, any>;
    const nextPath = [...parentPath, key];
    const matchedPaths =
      nextNode["x-component"] === componentName ? [nextPath] : [];

    return [
      ...matchedPaths,
      ...collectSchemaComponentPaths(nextNode, componentName, nextPath),
    ];
  });
};

const getValueByPath = (source: Record<string, any>, path: string[]) => {
  return path.reduce<any>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return current[key];
  }, source);
};

const setValueByPath = (
  target: Record<string, any>,
  path: string[],
  value: any,
) => {
  if (path.length === 0) {
    return;
  }

  let current = target;
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

const normalizeSelectedKeyValues = (selectedKey: unknown): string[] => {
  if (Array.isArray(selectedKey)) {
    return selectedKey.map((item) => String(item));
  }

  if (selectedKey === undefined || selectedKey === null || selectedKey === "") {
    return [];
  }

  return [String(selectedKey)];
};

const assignOptionsByComponent = (
  targetObj: Record<string, any>,
  componentName: string,
  newOptions: any[],
  isRecursive = true,
) => {
  if (!targetObj || typeof targetObj !== "object") {
    return targetObj;
  }

  Object.entries(targetObj).forEach(([, value]) => {
    if (value?.["x-component"] === componentName && value["x-component-props"]) {
      value["x-component-props"].options = [...newOptions];
    }

    if (
      isRecursive &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      assignOptionsByComponent(value, componentName, newOptions, isRecursive);
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "object") {
          assignOptionsByComponent(item, componentName, newOptions, isRecursive);
        }
      });
    }
  });

  return targetObj;
};

const syncService901SelectTableData = ({
  schema,
  formValues,
  selectTableOptions,
}: {
  schema: Record<string, any> | undefined;
  formValues: Record<string, any>;
  selectTableOptions: any[];
}) => {
  if (!schema) {
    return formValues;
  }

  const flatSelectTableOptions = flattenSelectTableOptions(selectTableOptions);
  const selectTablePaths = collectSchemaComponentPaths(schema, "SelectTable");

  if (flatSelectTableOptions.length === 0 || selectTablePaths.length === 0) {
    return formValues;
  }

  selectTablePaths.forEach((path) => {
    const currentFieldValue = getValueByPath(formValues, path);
    const currentSelectedKey = normalizeSelectedKeyValues(
      currentFieldValue?.selectedKey,
    );

    if (currentSelectedKey.length === 0) {
      return;
    }

    const nextTableData = buildSelectTableTableData(
      currentSelectedKey,
      flatSelectTableOptions,
    );
    if (nextTableData.length === 0) {
      return;
    }

    const nextFieldValue =
      currentFieldValue &&
      typeof currentFieldValue === "object" &&
      !Array.isArray(currentFieldValue)
        ? { ...currentFieldValue }
        : {};

    setValueByPath(formValues, path, {
      ...nextFieldValue,
      selectedKey: currentSelectedKey,
      tableData: nextTableData,
    });
  });

  return formValues;
};

export const patchFormDataWithSelectTableOptions = ({
  serviceCode,
  parsedFormData,
  selectTableOptions,
}: PatchFormDataWithSelectTableOptionsParams) => {
  const nextFormValues = { ...(parsedFormData.formValues || {}) };
  const nextSchema = parsedFormData.schema
    ? assignOptionsByComponent(
        { ...(parsedFormData.schema as Record<string, any>) },
        "SelectTable",
        selectTableOptions,
      )
    : parsedFormData.schema;

  if (String(serviceCode) === "901") {
    syncService901SelectTableData({
      schema: parsedFormData.schema,
      formValues: nextFormValues,
      selectTableOptions,
    });
  }

  return {
    ...parsedFormData,
    formValues: nextFormValues,
    schema: nextSchema,
  };
};
