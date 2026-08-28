import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = new URL("../src/utils/myRequestApproval.ts", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const module = { exports: {} };

vm.runInNewContext(outputText, {
  exports: module.exports,
  module,
});

const {
  getMyRequestDetailActions,
  getMyRequestTimelineStages,
  isDetailServiceDepartmentResolved,
  resolveDetailContentService,
} = module.exports;

test("uses the detail department before a stale content-service fallback", () => {
  const isContentService = resolveDetailContentService(1, true);

  assert.equal(isContentService, false);
  assert.deepEqual(
    Array.from(
      getMyRequestDetailActions({ statusId: 102, isContentService }),
      ({ key }) => key,
    ),
    ["cancel", "duplicate"],
  );
  assert.deepEqual(
    Array.from(
      getMyRequestTimelineStages({ statusId: 102, isContentService }),
      ({ key }) => key,
    ),
    ["submitted", "underReview", "approvalGranted", "pendingPayment", "documentIssuance"],
  );
});

test("uses the content-service detail department for actions and timeline", () => {
  const isContentService = resolveDetailContentService(2, false);

  assert.equal(isContentService, true);
  assert.deepEqual(
    Array.from(
      getMyRequestDetailActions({ statusId: 102, isContentService }),
      ({ key }) => key,
    ),
    ["downloadReceipt", "duplicate"],
  );
  assert.deepEqual(
    Array.from(
      getMyRequestTimelineStages({ statusId: 102, isContentService }),
      ({ key }) => key,
    ),
    ["submitted", "pendingPayment", "underReview", "approvalGranted", "documentIssuance"],
  );
});

test("falls back only when the detail department is absent", () => {
  assert.equal(resolveDetailContentService(undefined, true), true);
  assert.equal(resolveDetailContentService(null, false), false);
  assert.equal(resolveDetailContentService(0, true), true);
  assert.equal(isDetailServiceDepartmentResolved(0), false);
  assert.equal(isDetailServiceDepartmentResolved(2), true);
});
