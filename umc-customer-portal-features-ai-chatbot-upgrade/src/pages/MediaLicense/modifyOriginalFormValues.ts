import {
  buildModifyChangeSummary,
  type ModifyChangeSection,
  type ModifyFormStep,
} from "./modifyChangeSummary";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const parseFormData = (step: ModifyFormStep | undefined) => {
  if (!step?.formData) return null;
  try {
    const parsed = JSON.parse(step.formData);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeStepName = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

const stepIdentity = (step: ModifyFormStep) =>
  `${normalizeStepName(step.stepNameEn)}|${normalizeStepName(
    step.stepNameAr ?? step.stepNameEn,
  )}`;

const findComponentPropertyKey = (
  node: unknown,
  component: string,
): string | null => {
  if (!isRecord(node) || !isRecord(node.properties)) return null;
  for (const [key, child] of Object.entries(node.properties)) {
    if (!isRecord(child)) continue;
    if (child["x-component"] === component) return key;
    const nestedKey = findComponentPropertyKey(child, component);
    if (nestedKey) return nestedKey;
  }
  return null;
};

const clearSocialMediaAccountOperations = (
  value: unknown,
  propertyKey: string,
) => {
  if (!isRecord(value) || !Array.isArray(value[propertyKey])) {
    return value;
  }

  return {
    ...value,
    [propertyKey]: value[propertyKey].map((item) => {
      if (!isRecord(item)) return item;
      const nextItem = { ...item };
      delete nextItem.operation;
      return nextItem;
    }),
  };
};

export const attachModifyOriginalFormValues = <T extends ModifyFormStep>(
  current: T[],
  original: ModifyFormStep[],
  profileBefore?: Record<string, unknown>,
): T[] => {
  const originalByIdentity = new Map(
    original.map((step) => [stepIdentity(step), step]),
  );

  return current.map((step, index) => {
    const parsed = parseFormData(step);
    if (!parsed) return step;
    if (isRecord(parsed.modifyOriginalFormValues)) return step;

    const originalStep = originalByIdentity.get(stepIdentity(step)) ?? original[index];
    const originalParsed = parseFormData(originalStep);
    const originalFormValues = isRecord(originalParsed?.formValues)
      ? { ...originalParsed.formValues }
      : {};
    const profileFieldKey = findComponentPropertyKey(
      parsed.schema,
      "ProfileForm",
    );
    if (profileFieldKey && profileBefore) {
      originalFormValues[profileFieldKey] = profileBefore;
    }

    return {
      ...step,
      formData: JSON.stringify({
        ...parsed,
        modifyOriginalFormValues: originalFormValues,
      }),
    };
  });
};

export const attachModifyChangeSet = <T extends ModifyFormStep>(
  forms: T[],
  sections: ModifyChangeSection[],
): T[] => {
  const sectionByIdentity = new Map(
    sections.map((section) => [
      `${normalizeStepName(section.sectionNameEn)}|${normalizeStepName(section.sectionNameAr)}`,
      section,
    ]),
  );

  return forms.map((step) => {
    const parsed = parseFormData(step);
    if (!parsed) return step;
    const nextParsed = { ...parsed };
    const section = sectionByIdentity.get(stepIdentity(step));
    if (section) {
      nextParsed.modifyChangeSet = section;
    } else {
      delete nextParsed.modifyChangeSet;
    }
    return {
      ...step,
      formData: JSON.stringify(nextParsed),
    };
  });
};

export const attachModifyReviewMetadata = <T extends ModifyFormStep>(
  current: T[],
  original: ModifyFormStep[],
  profileBefore?: Record<string, unknown>,
): T[] => {
  const formsWithOriginalValues = attachModifyOriginalFormValues(
    current,
    original,
    profileBefore,
  );
  const sections = buildModifyChangeSummary({
    before: original,
    after: formsWithOriginalValues,
    profileBefore,
  });
  return attachModifyChangeSet(formsWithOriginalValues, sections);
};

export const resolveModifyOriginalForms = (
  formsList: ModifyFormStep[],
): ModifyFormStep[] =>
  formsList.map((step) => {
    const parsed = parseFormData(step);
    if (!parsed || !isRecord(parsed.modifyOriginalFormValues)) return step;
    return {
      ...step,
      formData: JSON.stringify({
        ...parsed,
        formValues: parsed.modifyOriginalFormValues,
      }),
    };
  });

export const hasEmbeddedModifyOriginalValues = (
  forms: ModifyFormStep[],
): boolean => {
  const parsedForms = forms
    .map((step) => parseFormData(step))
    .filter((parsed): parsed is Record<string, unknown> => Boolean(parsed));

  return (
    parsedForms.length > 0 &&
    parsedForms.length === forms.length &&
    parsedForms.every((parsed) => isRecord(parsed.modifyOriginalFormValues)) &&
    parsedForms.some(
      (parsed) =>
        isRecord(parsed.modifyOriginalFormValues) &&
        Object.keys(parsed.modifyOriginalFormValues).length > 0,
    )
  );
};

export const clearModifyReviewMetadata = <T extends ModifyFormStep>(
  forms: T[],
): T[] =>
  forms.map((step) => {
    const parsed = parseFormData(step);
    if (!parsed) return step;

    const formData = { ...parsed };
    delete formData.modifyOriginalFormValues;
    delete formData.modifyChangeSet;
    const socialMediaAccountKey = findComponentPropertyKey(
      formData.schema,
      "SocialMediaAccount",
    );
    if (socialMediaAccountKey) {
      formData.formValues = clearSocialMediaAccountOperations(
        formData.formValues,
        socialMediaAccountKey,
      );
    }

    return {
      ...step,
      formData: JSON.stringify(formData),
    };
  });
