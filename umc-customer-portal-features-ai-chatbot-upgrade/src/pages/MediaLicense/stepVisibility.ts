interface SkipWhen {
  stepIndex: number;
  field: string;
  equals: string | number | (string | number)[];
  arrayField?: string;
  arrayItemField?: string;
  matchMode?: "every" | "some";
}

function parseStepFormData(step: any): Record<string, any> {
  try {
    return typeof step?.formData === "string"
      ? JSON.parse(step.formData)
      : step?.formData || {};
  } catch {
    return {};
  }
}

function getFormValues(step: any): Record<string, any> {
  const parsed = parseStepFormData(step);
  return parsed?.formValues || {};
}

function getSkipWhen(step: any): SkipWhen | undefined {
  const parsed = parseStepFormData(step);
  return parsed?.skipWhen || step?.skipWhen;
}

function matchesEquals(
  fieldValue: unknown,
  equals: SkipWhen["equals"],
): boolean {
  if (Array.isArray(equals)) {
    return equals.some((v) => String(v) === String(fieldValue));
  }
  return String(fieldValue) === String(equals);
}

function evaluateRule(
  rule: SkipWhen,
  depValues: Record<string, any>,
): boolean {
  const fieldValue = depValues[rule.field];

  if (!rule.arrayField) {
    return matchesEquals(fieldValue, rule.equals);
  }

  const arr = fieldValue?.[rule.arrayField];
  if (!Array.isArray(arr) || arr.length === 0) return false;

  const itemValues = rule.arrayItemField
    ? arr.map((item: any) => item?.[rule.arrayItemField!])
    : arr;
  const equalsArr = Array.isArray(rule.equals)
    ? rule.equals
    : [rule.equals];

  if (rule.matchMode === "every") {
    return itemValues.every((v: unknown) =>
      equalsArr.some((e) => String(e) === String(v)),
    );
  }
  return itemValues.some((v: unknown) =>
    equalsArr.some((e) => String(e) === String(v)),
  );
}

function isStepSkipped(step: any, fullList: any[]): boolean {
  const rule = getSkipWhen(step);
  if (!rule) return false;
  const depValues = getFormValues(fullList[rule.stepIndex]);
  return evaluateRule(rule, depValues);
}

export function getVisibleFormilyList(fullList: any[]): any[] {
  return fullList.filter((step) => !isStepSkipped(step, fullList));
}

export function getVisibleFormilyListWithLiveValues(
  fullList: any[],
  liveOriginalIndex: number,
  liveValues: Record<string, any>,
): any[] {
  return fullList.filter((step) => {
    const rule = getSkipWhen(step);
    if (!rule) return true;
    const depValues =
      rule.stepIndex === liveOriginalIndex
        ? liveValues
        : getFormValues(fullList[rule.stepIndex]);
    return !evaluateRule(rule, depValues);
  });
}
