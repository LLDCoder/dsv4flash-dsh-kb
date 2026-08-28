export type MediaLicenseFormStep = {
  stepNameEn?: string;
  stepNameAr?: string;
  formData?: string;
} & Record<string, unknown>;

export const parseMediaLicenseStepFormData = (
  step: MediaLicenseFormStep,
) => {
  try {
    return step?.formData ? JSON.parse(step.formData) : {};
  } catch {
    return {};
  }
};

type FormValuesRecord = Record<string, unknown>;

type MergeApplicationFormValuesOptions = {
  transformFormValues?: (formValues: FormValuesRecord) => unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const hasValidApplicationFormDataBaseline = (
  savedFormData: string | null | undefined,
): boolean => {
  if (!savedFormData) return false;

  try {
    const steps = JSON.parse(savedFormData);
    if (!Array.isArray(steps) || steps.length === 0) return false;

    return steps.every((step) => {
      if (!isRecord(step) || typeof step.formData !== "string") return false;
      try {
        const parsedFormData = JSON.parse(step.formData);
        return isRecord(parsedFormData) && isRecord(parsedFormData.formValues);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};

const normalizeStepName = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const hasMatchingStepNames = (
  currentStep: MediaLicenseFormStep,
  savedStep: MediaLicenseFormStep,
) => {
  const currentStepNameEn = normalizeStepName(currentStep?.stepNameEn);
  const currentStepNameAr = normalizeStepName(currentStep?.stepNameAr);
  const savedStepNameEn = normalizeStepName(savedStep?.stepNameEn);
  const savedStepNameAr = normalizeStepName(savedStep?.stepNameAr);

  // Some localized API responses collapse a step's English and Arabic names to
  // the same value (a known Arabic-request duplication artifact). Relax matching
  // whenever EITHER side collapses En === Ar so the duplicated-name step still
  // maps to its counterpart regardless of which side the API duplicated into.
  if (
    currentStepNameEn &&
    currentStepNameEn === currentStepNameAr
  ) {
    return (
      currentStepNameEn === savedStepNameEn ||
      currentStepNameEn === savedStepNameAr
    );
  }

  if (
    savedStepNameEn &&
    savedStepNameEn === savedStepNameAr
  ) {
    return (
      savedStepNameEn === currentStepNameEn ||
      savedStepNameEn === currentStepNameAr
    );
  }

  return (
    Boolean(currentStepNameEn || currentStepNameAr) &&
    currentStepNameEn === savedStepNameEn &&
    currentStepNameAr === savedStepNameAr
  );
};

const collectSchemaFormValueKeys = (
  schemaNode: unknown,
  result = new Set<string>(),
) => {
  if (!isRecord(schemaNode) || !isRecord(schemaNode.properties)) {
    return result;
  }

  Object.entries(schemaNode.properties).forEach(([fieldKey, fieldNode]) => {
    if (!isRecord(fieldNode)) {
      return;
    }

    if (fieldNode.type === "void") {
      collectSchemaFormValueKeys(fieldNode, result);
      return;
    }

    result.add(fieldKey);
  });

  return result;
};

const hasOwn = (record: FormValuesRecord, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key);

export const mergeApplicationFormValuesIntoFormsList = (
  formsList: MediaLicenseFormStep[],
  savedFormData: string | null | undefined,
  options: MergeApplicationFormValuesOptions = {},
) => {
  if (!savedFormData) {
    return formsList;
  }

  let savedSteps: MediaLicenseFormStep[] = [];
  try {
    const parsedSavedSteps = JSON.parse(savedFormData);
    savedSteps = Array.isArray(parsedSavedSteps) ? parsedSavedSteps : [];
  } catch {
    return formsList;
  }

  if (savedSteps.length === 0) {
    return formsList;
  }

  const savedStepFormData = savedSteps.map((step) =>
    parseMediaLicenseStepFormData(step),
  );
  const savedStepValues = savedStepFormData.map((parsedFormData) => {
    return isRecord(parsedFormData?.formValues)
      ? parsedFormData.formValues
      : undefined;
  });
  const savedStepOriginalValues = savedStepFormData.map((parsedFormData) => {
    return isRecord(parsedFormData?.modifyOriginalFormValues)
      ? parsedFormData.modifyOriginalFormValues
      : undefined;
  });

  return formsList.map((currentStep) => {
    const currentParsedFormData = parseMediaLicenseStepFormData(currentStep);
    if (!isRecord(currentParsedFormData)) {
      return currentStep;
    }

    const exactMatches = savedSteps
      .map((savedStep, index) => ({ savedStep, index }))
      .filter(({ savedStep }) =>
        hasMatchingStepNames(currentStep, savedStep),
      );
    const exactMatchIndex =
      exactMatches.length === 1 ? exactMatches[0].index : undefined;
    const exactMatchValues =
      exactMatchIndex === undefined
        ? undefined
        : savedStepValues[exactMatchIndex];
    const currentFormValues = isRecord(currentParsedFormData.formValues)
      ? currentParsedFormData.formValues
      : {};

    if (exactMatchIndex !== undefined) {
      if (!exactMatchValues) {
        return currentStep;
      }

      const transformedFormValues = options.transformFormValues
        ? options.transformFormValues(exactMatchValues)
        : exactMatchValues;

      return {
        ...currentStep,
        formData: JSON.stringify({
          ...currentParsedFormData,
          ...(isRecord(
            savedStepFormData[exactMatchIndex]?.modifyOriginalFormValues,
          )
            ? {
                modifyOriginalFormValues:
                  savedStepFormData[exactMatchIndex].modifyOriginalFormValues,
              }
            : {}),
          formValues: transformedFormValues,
        }),
      };
    }

    const nextFormValues: FormValuesRecord = {
      ...currentFormValues,
    };
    const nextOriginalFormValues: FormValuesRecord = {};
    let hasAppliedSavedValues = false;
    let hasAppliedOriginalValues = false;
    const targetFieldKeys = collectSchemaFormValueKeys(
      currentParsedFormData.schema,
    );

    targetFieldKeys.forEach((fieldKey) => {
      const candidates = savedStepValues.filter(
        (formValues): formValues is FormValuesRecord =>
          Boolean(formValues && hasOwn(formValues, fieldKey)),
      );

      if (candidates.length === 1) {
        nextFormValues[fieldKey] = candidates[0][fieldKey];
        hasAppliedSavedValues = true;
      }

      const originalCandidates = savedStepOriginalValues.filter(
        (formValues): formValues is FormValuesRecord =>
          Boolean(formValues && hasOwn(formValues, fieldKey)),
      );
      if (originalCandidates.length === 1) {
        nextOriginalFormValues[fieldKey] = originalCandidates[0][fieldKey];
        hasAppliedOriginalValues = true;
      }
    });

    if (!hasAppliedSavedValues) {
      return currentStep;
    }

    const transformedFormValues = options.transformFormValues
      ? options.transformFormValues(nextFormValues)
      : nextFormValues;

    return {
      ...currentStep,
      formData: JSON.stringify({
        ...currentParsedFormData,
        ...(hasAppliedOriginalValues
          ? { modifyOriginalFormValues: nextOriginalFormValues }
          : {}),
        formValues: transformedFormValues,
      }),
    };
  });
};
