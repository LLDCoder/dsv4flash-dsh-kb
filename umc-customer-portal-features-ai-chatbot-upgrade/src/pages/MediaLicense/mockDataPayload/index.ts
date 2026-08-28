type FormStep = {
  stepNameEn?: string;
  stepNameAr?: string;
  formData?: string;
} & Record<string, unknown>;

type ParsedFormData = {
  formValues?: unknown;
  fileList?: unknown[];
} & Record<string, unknown>;

const mockJsonModules = import.meta.glob("../mockData/*mock.json", {
  eager: true,
  import: "default",
}) as Record<string, FormStep[]>;

const serviceMockDataMap: Record<number, FormStep[]> = Object.entries(
  mockJsonModules,
).reduce(
  (acc, [filePath, mockData]) => {
    const matchedServiceCode = filePath.match(/\/(\d+)mock\.json$/);

    if (!matchedServiceCode) {
      return acc;
    }

    const servicesCode = Number(matchedServiceCode[1]);

    if (!Number.isNaN(servicesCode) && Array.isArray(mockData)) {
      acc[servicesCode] = mockData;
    }

    return acc;
  },
  {} as Record<number, FormStep[]>,
);

const parseStepFormData = (step: FormStep): ParsedFormData => {
  try {
    return step?.formData ? (JSON.parse(step.formData) as ParsedFormData) : {};
  } catch {
    return {};
  }
};

export const mergeSavedFormilyList = (
  formsList: FormStep[],
  savedFormilyList: FormStep[],
) => {
  if (!Array.isArray(formsList) || !Array.isArray(savedFormilyList)) {
    return formsList;
  }

  return formsList.map((currentStep, index) => {
    const matchedSavedStep =
      savedFormilyList.find(
        (savedStep) =>
          savedStep?.stepNameEn === currentStep?.stepNameEn &&
          savedStep?.stepNameAr === currentStep?.stepNameAr,
      ) || savedFormilyList[index];

    if (!matchedSavedStep) {
      return currentStep;
    }

    const currentFormData = parseStepFormData(currentStep);
    const savedFormData = parseStepFormData(matchedSavedStep);

    if (!savedFormData?.formValues) {
      return currentStep;
    }

    return {
      ...currentStep,
      formData: JSON.stringify({
        ...currentFormData,
        formValues: savedFormData.formValues,
        fileList: savedFormData.fileList ?? currentFormData.fileList ?? [],
      }),
    };
  });
};

export const getMockFormsListByServicesCode = (
  servicesCode: number | null | undefined,
) => {
  const normalizedServicesCode = Number(servicesCode || 0);
  return serviceMockDataMap[normalizedServicesCode] || null;
};

export const applyMockFormsListByServicesCode = ({
  formsList,
  servicesCode,
}: {
  formsList: FormStep[];
  servicesCode: number | null | undefined;
}) => {
  const targetMockFormilyList = getMockFormsListByServicesCode(servicesCode);

  if (!targetMockFormilyList) {
    return formsList;
  }

  return mergeSavedFormilyList(formsList, targetMockFormilyList);
};

interface ResolveMockFormsListParams {
  formsList: FormStep[];
  servicesCode: number | null | undefined;
  applicationId: number | null;
  isDev: boolean;
}

export const resolveMockFormsListByServicesCode = ({
  formsList,
  servicesCode,
  applicationId,
  isDev,
}: ResolveMockFormsListParams) => {
  // Formily mock JSON merge is opt-in via VITE_MOCK; leave API formsList unchanged otherwise.
  if (import.meta.env.VITE_MOCK !== "true") {
    return formsList;
  }

  if (!isDev || !!applicationId) {
    return formsList;
  }

  return applyMockFormsListByServicesCode({
    formsList,
    servicesCode,
  });
};
