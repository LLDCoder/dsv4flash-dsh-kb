import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  hasValidApplicationFormDataBaseline,
  mergeApplicationFormValuesIntoFormsList,
  type MediaLicenseFormStep,
} from "../src/pages/MediaLicense/applicationFormValuesMerge.ts";

const createStep = ({
  stepNameEn,
  stepNameAr,
  properties,
  formValues,
}: {
  stepNameEn: string;
  stepNameAr: string;
  properties: Record<string, unknown>;
  formValues?: Record<string, unknown>;
}): MediaLicenseFormStep => ({
  stepNameEn,
  stepNameAr,
  formData: JSON.stringify({
    form: { layout: "vertical" },
    schema: { type: "object", properties },
    ...(formValues === undefined ? {} : { formValues }),
  }),
});

const getFormValues = (step: MediaLicenseFormStep) =>
  step.formData ? JSON.parse(step.formData).formValues : undefined;

const languageRow = {
  languageId: 2,
  language: "English",
  suggested_name: "Business Insider",
};

test("accepts only a non-empty, fully parseable application baseline", () => {
  const validStep = createStep({
    stepNameEn: "Details",
    stepNameAr: "Details AR",
    properties: { Field: { "x-component": "Input" } },
    formValues: {},
  });

  assert.equal(
    hasValidApplicationFormDataBaseline(JSON.stringify([validStep])),
    true,
  );
  assert.equal(hasValidApplicationFormDataBaseline(undefined), false);
  assert.equal(hasValidApplicationFormDataBaseline("not-json"), false);
  assert.equal(hasValidApplicationFormDataBaseline("[]"), false);
  assert.equal(
    hasValidApplicationFormDataBaseline(
      JSON.stringify([{ ...validStep, formData: "not-json" }]),
    ),
    false,
  );
  assert.equal(
    hasValidApplicationFormDataBaseline(
      JSON.stringify([
        {
          ...validStep,
          formData: JSON.stringify({ schema: {}, formValues: null }),
        },
      ]),
    ),
    false,
  );
});

test("moves a uniquely named field into its target schema step", () => {
  const sourceSteps = [
    createStep({
      stepNameEn: "Activity Details",
      stepNameAr: "Activity Details AR",
      properties: {
        dataList: { type: "array", "x-component": "DataList" },
        SubjectCategory: { type: "array", "x-component": "MultiDropdown" },
      },
      formValues: {
        dataList: [languageRow],
        SubjectCategory: [5],
      },
    }),
    createStep({
      stepNameEn: "Chief Editor Information",
      stepNameAr: "Chief Editor Information AR",
      properties: {
        PhoneNumber: { type: "string", "x-component": "Input" },
      },
      formValues: { PhoneNumber: "971500000000" },
    }),
  ];
  const targetSteps = [
    createStep({
      stepNameEn: "Establishment Information",
      stepNameAr: "Establishment Information AR",
      properties: {
        "Profile Form": { "x-component": "ProfileForm" },
      },
      formValues: {
        "Profile Form": { establishmentNameEnglish: "Existing Profile" },
      },
    }),
    createStep({
      stepNameEn: "Languages & Names ",
      stepNameAr: "Languages & Names AR",
      properties: {
        information: { "x-component": "Information" },
        dataList: { type: "array", "x-component": "DataList" },
      },
    }),
    createStep({
      stepNameEn: "Chief Editor Information",
      stepNameAr: "Chief Editor Information AR",
      properties: {
        PhoneNumber: { type: "string", "x-component": "Input" },
      },
    }),
  ];

  const result = mergeApplicationFormValuesIntoFormsList(
    targetSteps,
    JSON.stringify(sourceSteps),
  );

  assert.deepEqual(getFormValues(result[0]), {
    "Profile Form": { establishmentNameEnglish: "Existing Profile" },
  });
  assert.deepEqual(getFormValues(result[1]), { dataList: [languageRow] });
  assert.deepEqual(getFormValues(result[2]), {
    PhoneNumber: "971500000000",
  });
});

test("keeps the existing saved-only behavior for a trimmed exact step match", () => {
  const sourceSteps = [
    createStep({
      stepNameEn: "Languages & Names",
      stepNameAr: "Languages & Names AR",
      properties: {
        dataList: { type: "array", "x-component": "DataList" },
      },
      formValues: {
        dataList: [languageRow],
        preservedMetadata: "source metadata",
      },
    }),
    createStep({
      stepNameEn: "Another Step",
      stepNameAr: "Another Step AR",
      properties: {},
      formValues: {
        dataList: [{ languageId: 1, language: "Arabic" }],
        unrelatedField: "do not import",
      },
    }),
  ];
  const targetStep = createStep({
    stepNameEn: " Languages & Names ",
    stepNameAr: " Languages & Names AR ",
    properties: {
      dataList: { type: "array", "x-component": "DataList" },
      unrelatedField: { type: "string", "x-component": "Input" },
    },
    formValues: { targetDefault: "keep" },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify(sourceSteps),
  );

  assert.deepEqual(getFormValues(result), {
    dataList: [languageRow],
    preservedMetadata: "source metadata",
  });
});

test("keeps an exact match for legacy steps that only define an English name", () => {
  const sourceStep = createStep({
    stepNameEn: "Legacy Details",
    properties: { Field: { "x-component": "Input" } },
    formValues: { Field: "Saved value", SavedOnly: "keep me" },
  });
  const targetStep = createStep({
    stepNameEn: "Legacy Details",
    properties: { Field: { "x-component": "Input" } },
    formValues: { Field: "Target default" },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify([sourceStep]),
  );

  assert.deepEqual(getFormValues(result), {
    Field: "Saved value",
    SavedOnly: "keep me",
  });
});

test("restores the unique localized exact step without remapping saved field keys", () => {
  const sourceSteps = [
    createStep({
      stepNameEn: "Activity Details",
      stepNameAr: "تفاصيل النشاط",
      properties: {
        addressPicker: { "x-component": "AddressPicker" },
      },
      formValues: {
        addressPicker: {
          emirateId: 8,
          areaId: 129,
          street: "Activity address",
        },
      },
    }),
    createStep({
      stepNameEn: "Chief Editor Information",
      stepNameAr: "معلومات رئيس التحرير",
      properties: {},
      formValues: {
        PhoneNumber: "971500000000",
        WorkPhone: "971511111111",
        QualificationCopy: "chief-editor-qualification.pdf",
        YearsofExperience: "8",
        addressPicker: {
          emirateId: 1,
          regionId: 2,
          areaId: 2,
          street: "Chief editor address",
        },
      },
    }),
  ];
  const targetStep = createStep({
    // The service API currently duplicates the localized Arabic name into both
    // properties when the request language is Arabic.
    stepNameEn: "معلومات رئيس التحرير",
    stepNameAr: "معلومات رئيس التحرير",
    properties: {
      card: {
        type: "void",
        "x-component": "Card",
        properties: {
          PhoneNumber: { type: "string", "x-component": "Input" },
          "Work Phone": { type: "string", "x-component": "Input" },
          "Qualification  Copy": { "x-component": "Upload" },
          "Years of Experience": { type: "string", "x-component": "Input" },
          addressPicker: { "x-component": "AddressPicker" },
        },
      },
    },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify(sourceSteps),
  );

  assert.deepEqual(getFormValues(result), {
    PhoneNumber: "971500000000",
    WorkPhone: "971511111111",
    QualificationCopy: "chief-editor-qualification.pdf",
    YearsofExperience: "8",
    addressPicker: {
      emirateId: 1,
      regionId: 2,
      areaId: 2,
      street: "Chief editor address",
    },
  });
});

test("restores the exact step when the SAVED side collapsed its localized name", () => {
  // Mirror of the previous case: here the duplication artifact landed on the
  // saved application (Chief Editor step has En === Ar) while the freshly
  // fetched schema is properly bilingual. addressPicker exists in two saved
  // steps, so the field-key fallback would drop it; only the symmetric
  // exact-step match can restore the whole Chief Editor step.
  const sourceSteps = [
    createStep({
      stepNameEn: "Activity Details",
      stepNameAr: "تفاصيل النشاط",
      properties: {
        addressPicker: { "x-component": "AddressPicker" },
      },
      formValues: {
        addressPicker: {
          emirateId: 8,
          areaId: 129,
          street: "Activity address",
        },
      },
    }),
    createStep({
      // The saved application was submitted in Arabic, so the API duplicated the
      // localized name into both properties.
      stepNameEn: "Chief Editor Information",
      stepNameAr: "Chief Editor Information",
      properties: {},
      formValues: {
        PhoneNumber: "971500000000",
        addressPicker: {
          emirateId: 1,
          regionId: 2,
          areaId: 2,
          street: "Chief editor address",
        },
      },
    }),
  ];
  const targetStep = createStep({
    stepNameEn: "Chief Editor Information",
    stepNameAr: "معلومات رئيس التحرير",
    properties: {
      card: {
        type: "void",
        "x-component": "Card",
        properties: {
          PhoneNumber: { type: "string", "x-component": "Input" },
          addressPicker: { "x-component": "AddressPicker" },
        },
      },
    },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify(sourceSteps),
  );

  assert.deepEqual(getFormValues(result), {
    PhoneNumber: "971500000000",
    addressPicker: {
      emirateId: 1,
      regionId: 2,
      areaId: 2,
      street: "Chief editor address",
    },
  });
});

test("does not treat a partial bilingual step-name match as exact", () => {
  const sourceStep = createStep({
    stepNameEn: "Languages & Names",
    stepNameAr: "Languages & Names AR",
    properties: {},
    formValues: {
      dataList: [languageRow],
      unrelatedField: "do not import",
    },
  });
  const targetStep = createStep({
    stepNameEn: "Languages & Names",
    stepNameAr: "",
    properties: {
      dataList: { type: "array", "x-component": "DataList" },
    },
    formValues: { targetDefault: "keep" },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify([sourceStep]),
  );

  assert.deepEqual(getFormValues(result), {
    targetDefault: "keep",
    dataList: [languageRow],
  });
});

test("finds fields nested below void layout nodes", () => {
  const sourceStep = createStep({
    stepNameEn: "Source",
    stepNameAr: "Source AR",
    properties: {
      dataList: { type: "array", "x-component": "DataList" },
    },
    formValues: { dataList: [languageRow] },
  });
  const targetStep = createStep({
    stepNameEn: "Target",
    stepNameAr: "Target AR",
    properties: {
      card: {
        type: "void",
        "x-component": "Card",
        properties: {
          grid: {
            type: "void",
            "x-component": "FormGrid",
            properties: {
              dataList: { type: "array", "x-component": "DataList" },
            },
          },
        },
      },
    },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify([sourceStep]),
  );

  assert.deepEqual(getFormValues(result), { dataList: [languageRow] });
});

test("does not guess when multiple source steps contain the same field", () => {
  const sourceSteps = [
    createStep({
      stepNameEn: "Source One",
      stepNameAr: "Source One AR",
      properties: {},
      formValues: { dataList: [{ language: "English" }] },
    }),
    createStep({
      stepNameEn: "Source Two",
      stepNameAr: "Source Two AR",
      properties: {},
      formValues: { dataList: [{ language: "Arabic" }] },
    }),
  ];
  const targetStep = createStep({
    stepNameEn: "Target",
    stepNameAr: "Target AR",
    properties: {
      dataList: { type: "array", "x-component": "DataList" },
    },
    formValues: { targetDefault: "keep" },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify(sourceSteps),
  );

  assert.deepEqual(getFormValues(result), { targetDefault: "keep" });
});

test("preserves empty arrays as explicit saved values", () => {
  const sourceStep = createStep({
    stepNameEn: "Source",
    stepNameAr: "Source AR",
    properties: {},
    formValues: { dataList: [] },
  });
  const targetStep = createStep({
    stepNameEn: "Target",
    stepNameAr: "Target AR",
    properties: {
      dataList: { type: "array", "x-component": "DataList" },
    },
    formValues: { dataList: [languageRow] },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify([sourceStep]),
  );

  assert.deepEqual(getFormValues(result), { dataList: [] });
});

test("preserves an explicit Modify original-value snapshot from a saved draft", () => {
  const savedStep = createStep({
    stepNameEn: "Details",
    stepNameAr: "Details AR",
    properties: { Field: { "x-component": "Input" } },
    formValues: { Field: "Draft after" },
  });
  const savedFormData = JSON.parse(savedStep.formData || "{}");
  savedStep.formData = JSON.stringify({
    ...savedFormData,
    modifyOriginalFormValues: { Field: "Original before" },
  });
  const targetStep = createStep({
    stepNameEn: "Details",
    stepNameAr: "Details AR",
    properties: { Field: { "x-component": "Input" } },
    formValues: { Field: "Target default" },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify([savedStep]),
  );
  const parsedResult = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsedResult.formValues, { Field: "Draft after" });
  assert.deepEqual(parsedResult.modifyOriginalFormValues, {
    Field: "Original before",
  });
});

test("moves a unique Modify original-value snapshot with a renamed target step", () => {
  const savedStep = createStep({
    stepNameEn: "Activity Details",
    stepNameAr: "Activity Details AR",
    properties: { dataList: { type: "array", "x-component": "DataList" } },
    formValues: { dataList: [{ language: "English", suggested_name: "Draft" }] },
  });
  const savedFormData = JSON.parse(savedStep.formData || "{}");
  savedStep.formData = JSON.stringify({
    ...savedFormData,
    modifyOriginalFormValues: {
      dataList: [{ language: "English", suggested_name: "Original" }],
    },
  });
  const targetStep = createStep({
    stepNameEn: "Languages & Names",
    stepNameAr: "Languages & Names AR",
    properties: { dataList: { type: "array", "x-component": "DataList" } },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify([savedStep]),
  );
  const parsedResult = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsedResult.formValues, {
    dataList: [{ language: "English", suggested_name: "Draft" }],
  });
  assert.deepEqual(parsedResult.modifyOriginalFormValues, {
    dataList: [{ language: "English", suggested_name: "Original" }],
  });
});

test("leaves target forms unchanged for missing or malformed saved data", () => {
  const targetStep = createStep({
    stepNameEn: "Target",
    stepNameAr: "Target AR",
    properties: {
      dataList: { type: "array", "x-component": "DataList" },
    },
  });

  assert.deepEqual(
    mergeApplicationFormValuesIntoFormsList([targetStep], undefined),
    [targetStep],
  );
  assert.deepEqual(
    mergeApplicationFormValuesIntoFormsList([targetStep], "not-json"),
    [targetStep],
  );
});

test("skips a malformed source step while using another unique source", () => {
  const malformedStep: MediaLicenseFormStep = {
    stepNameEn: "Malformed",
    stepNameAr: "Malformed AR",
    formData: "not-json",
  };
  const sourceStep = createStep({
    stepNameEn: "Source",
    stepNameAr: "Source AR",
    properties: {},
    formValues: { dataList: [languageRow] },
  });
  const targetStep = createStep({
    stepNameEn: "Target",
    stepNameAr: "Target AR",
    properties: {
      dataList: { type: "array", "x-component": "DataList" },
    },
  });

  const [result] = mergeApplicationFormValuesIntoFormsList(
    [targetStep],
    JSON.stringify([null, malformedStep, sourceStep]),
  );

  assert.deepEqual(getFormValues(result), { dataList: [languageRow] });
});

test("runs rule strategy validation only when a strategy is configured", () => {
  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );

  assert.match(
    mediaLicenseSource,
    /if \(activeRuleStrategyConfig\) \{\s*const validationFormilyList = attachCurrentModifyReviewMetadata\([\s\S]*?const isValidationPassed = await runRuleStrategyValidation\(/,
  );
  assert.equal(
    mediaLicenseSource.match(/runRuleStrategyValidation\(/g)?.length,
    1,
  );
});

test("attaches the current Modify change set on live and review fee paths", () => {
  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );

  assert.match(
    mediaLicenseSource,
    /requestFeeQuote\(\s*attachCurrentModifyReviewMetadata\(nextFormilyList\)/,
  );
  assert.match(
    mediaLicenseSource,
    /requestFeeQuote\(\s*attachCurrentModifyReviewMetadata\(FormilyList\)/,
  );
  assert.match(
    mediaLicenseSource,
    /const engineFormilyList = attachCurrentModifyReviewMetadata\(\s*targetFormilyList/,
  );
});
