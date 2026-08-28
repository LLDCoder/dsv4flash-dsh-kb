const normalizeActivityId = (value: unknown): number | null => {
  const normalizedValue =
    typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isInteger(normalizedValue) && normalizedValue > 0
    ? normalizedValue
    : null;
};

export const resolveModifyLifecycleActivityIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map(normalizeActivityId)
        .filter((item): item is number => item !== null),
    ),
  );
};

export const resolveModifySourceApplicationActivityIds = (
  sourceFormData: unknown,
): number[] => {
  if (typeof sourceFormData !== "string" || !sourceFormData.trim()) {
    return [];
  }

  try {
    const steps = JSON.parse(sourceFormData);
    if (!Array.isArray(steps)) return [];

    for (const step of steps) {
      if (!step || typeof step !== "object") continue;
      const stepFormData = (step as { formData?: unknown }).formData;
      if (typeof stepFormData !== "string") continue;

      let parsedStep: {
        formValues?: {
          SelectTable?: { selectedKey?: unknown };
          SelectTableSingle?: { selectedKey?: unknown };
        };
      };

      try {
        parsedStep = JSON.parse(stepFormData);
      } catch {
        continue;
      }
      const selectedKey =
        parsedStep.formValues?.SelectTable?.selectedKey ??
        parsedStep.formValues?.SelectTableSingle?.selectedKey;
      const activityIds = resolveModifyLifecycleActivityIds(selectedKey);

      if (activityIds.length > 0) return activityIds;
    }
  } catch {
    return [];
  }

  return [];
};

export const buildModifyLifecycleActivityPayload = (value: unknown) => {
  const activityIds = resolveModifyLifecycleActivityIds(value);
  if (activityIds.length === 0) {
    throw new Error(
      "Unable to build modify application payload: at least one lifecycle activity is required.",
    );
  }
  return { activityIds };
};
