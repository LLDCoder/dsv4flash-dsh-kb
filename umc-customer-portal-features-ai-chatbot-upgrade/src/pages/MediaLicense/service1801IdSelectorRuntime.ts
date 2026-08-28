import type {
  IDSelectorValue,
  IdSelectorType,
} from "@/components/designable/src/components/IDSelector/idSelectorUtils";
import { normalizeIdSelectorRuntimeValue } from "@/components/designable/src/components/IDSelector/idSelectorUtils";

const SERVICE_1801_TEMPORARY_ACTIVITY_ID = "2035";
const SERVICE_1801_REGULAR_ACTIVITY_ID = "2036";

interface FormilyStep {
  formData?: string;
  [key: string]: unknown;
}

interface SelectTableSingleValue {
  selectedKey?: unknown;
  tableData?: Array<{ Id?: unknown }>;
}

interface ParsedStepFormData extends Record<string, unknown> {
  formValues?: Record<string, unknown>;
  schema?: unknown;
}

const parseStepFormData = (step: FormilyStep): ParsedStepFormData | null => {
  if (!step?.formData) return null;
  try {
    const parsed = JSON.parse(step.formData);
    return parsed && typeof parsed === "object"
      ? (parsed as ParsedStepFormData)
      : null;
  } catch {
    return null;
  }
};

const resolveSelectedActivityIds = (
  selectTableSingle: SelectTableSingleValue | undefined,
): string[] => {
  const selectedKey = selectTableSingle?.selectedKey;
  const selectedKeys = Array.isArray(selectedKey)
    ? selectedKey
    : selectedKey == null
      ? []
      : [selectedKey];
  const fallbackId = selectTableSingle?.tableData?.[0]?.Id;
  const activityIds = selectedKeys.length ? selectedKeys : [fallbackId];

  return activityIds
    .filter((activityId) => activityId != null)
    .map((activityId) => String(activityId));
};

export const resolveService1801IdSelectorRuntimeType = (
  formilyList: FormilyStep[],
): IdSelectorType | null => {
  for (const step of formilyList || []) {
    const formValues = parseStepFormData(step)?.formValues;
    const activityId = resolveSelectedActivityIds(
      formValues?.SelectTableSingle as SelectTableSingleValue | undefined,
    ).find(
      (candidate) =>
        candidate === SERVICE_1801_REGULAR_ACTIVITY_ID ||
        candidate === SERVICE_1801_TEMPORARY_ACTIVITY_ID,
    );
    if (activityId === SERVICE_1801_REGULAR_ACTIVITY_ID) return "emiratesId";
    if (activityId === SERVICE_1801_TEMPORARY_ACTIVITY_ID) return "passport";
  }

  return null;
};

const schemaContainsIdSelector = (node: unknown): boolean => {
  if (!node || typeof node !== "object") return false;
  const record = node as Record<string, unknown>;
  if (record["x-component"] === "IDSelector") return true;
  return Object.values(record).some(schemaContainsIdSelector);
};

export const normalizeService1801IdSelectorFormilyList = <T extends FormilyStep>(
  formilyList: T[],
): T[] => {
  const runtimeType = resolveService1801IdSelectorRuntimeType(formilyList);
  let changed = false;

  const nextList = (formilyList || []).map((step) => {
    const parsedFormData = parseStepFormData(step);
    if (!parsedFormData || !schemaContainsIdSelector(parsedFormData.schema)) {
      return step;
    }

    const formValues: Record<string, unknown> =
      parsedFormData.formValues && typeof parsedFormData.formValues === "object"
        ? { ...parsedFormData.formValues }
        : {};
    const currentValue = formValues.idSelector as IDSelectorValue | undefined;
    const nextValue = normalizeIdSelectorRuntimeValue(currentValue, runtimeType);

    if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) return step;

    if (nextValue === undefined) {
      delete formValues.idSelector;
    } else {
      formValues.idSelector = nextValue;
    }
    changed = true;

    return {
      ...step,
      formData: JSON.stringify({ ...parsedFormData, formValues }),
    };
  });

  return changed ? nextList : formilyList;
};
