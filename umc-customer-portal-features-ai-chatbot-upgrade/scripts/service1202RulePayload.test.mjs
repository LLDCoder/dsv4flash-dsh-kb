import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);

function loadTypeScriptModule(filePath, dependencies = {}) {
  const source = fs.readFileSync(path.resolve(filePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const testModule = { exports: {} };
  const require = (specifier) => {
    if (specifier in dependencies) {
      return dependencies[specifier];
    }

    return nodeRequire(specifier);
  };

  new Function("exports", "module", "require", compiled)(
    testModule.exports,
    testModule,
    require,
  );

  return testModule.exports;
}

function loadService1202Module() {
  const shared = loadTypeScriptModule(
    "src/pages/MediaLicense/ruleStrategyPayloadShared.ts",
  );
  const utils = loadTypeScriptModule(
    "src/pages/MediaLicense/ruleStrategyPayloadUtils.ts",
    {
      "@/services/services": { getLanguages: async () => ({ data: [] }) },
    },
  );
  const lifecycleSource = {
    sourceApplicationId: 147,
    sourceApplicationDetailId: 147,
  };

  return loadTypeScriptModule(
    "src/pages/MediaLicense/ruleStrategyPayload/buildService1202Payload.ts",
    {
      "@/utils/gstTime": {
        nowGst: () => "now",
        toApi: () => "2026-08-15T17:00:00",
      },
      "@/store/licenseLifecycleSource": {
        useLicenseLifecycleSourceStore: {
          getState: () => ({ licenseLifecycleSource: lifecycleSource }),
        },
      },
      "../ruleStrategyPayloadShared": shared,
      "../ruleStrategyPayloadUtils": utils,
    },
  );
}

test("builds service 1202 cancellation activityIds from SelectTableSingle", () => {
  const { buildService1202Payload } = loadService1202Module();
  const payload = buildService1202Payload({
    config: { serviceId: 1202, kind: "service1202" },
    formValuesList: [
      {
        SelectTableSingle: {
          prefilledSelectedKey: ["26"],
          selectedKey: [],
          tableData: [{ Id: "26" }],
        },
      },
    ],
    currentProfileId: "9337",
    userInfo: {
      userEstablishments: [{ id: 48, userProfileId: "9337" }],
    },
    serviceCode: "1202",
    submissionMode: "submit",
  });

  assert.deepEqual(payload.request.activityIds, [26]);
});
