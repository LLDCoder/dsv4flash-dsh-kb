import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadLifecycleActivitiesModule() {
  const source = fs.readFileSync(
    path.resolve(
      "src/pages/MediaLicense/specialServiceLogic/lifecycleActivities.ts",
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const testModule = { exports: {} };

  new Function("exports", "module", compiled)(
    testModule.exports,
    testModule,
  );

  return testModule.exports;
}

test("injects retained lifecycle activities into SelectTableSingle", () => {
  const { patchFormDataWithLifecycleActivityContext } =
    loadLifecycleActivitiesModule();
  const activity = {
    id: 26,
    code: "26",
    nameEn:
      "Issuing license to establish a television broadcasting station (encrypted)",
    nameAr: "Arabic activity name",
  };
  const parsedFormData = {
    schema: {
      type: "object",
      properties: {
        SelectTableSingle: {
          name: "SelectTableSingle",
          "x-component": "SelectTableSingle",
          "x-component-props": {},
        },
      },
    },
    formValues: {},
  };

  const result = patchFormDataWithLifecycleActivityContext({
    parsedFormData,
    lifecycleActivityContext: {
      sourceApplicationId: 147,
      sourceApplicationDetailId: 147,
      sourceMedialLicenseId: 48,
      targetServiceCode: "806",
      targetServiceType: "5",
      selectionMode: "retained",
      existingActivities: [activity],
      selectedActivityIds: [],
      selectedActivities: [],
    },
  });

  assert.deepEqual(result.formValues.SelectTableSingle, {
    prefilledSelectedKey: ["26"],
    selectedKey: [],
    tableData: [
      {
        Number: 1,
        Activity: activity.nameEn,
        money: 0,
        Id: "26",
        ActivityAr: activity.nameAr,
        ActivityEn: activity.nameEn,
      },
    ],
  });
  assert.deepEqual(
    result.schema.properties.SelectTableSingle["x-component-props"]
      .lifecycleActivityConfig,
    {
      selectionMode: "retained",
      selectedActivityIds: [],
      existingActivities: [activity],
      replaceServiceOptions: true,
    },
  );
});
