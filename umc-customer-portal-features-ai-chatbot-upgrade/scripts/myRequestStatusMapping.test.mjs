import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const workspaceRoot = new URL("../", import.meta.url);
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
  getMyRequestListActions,
  getMyRequestStatusLabel,
  resolveMyRequestStatus,
} = module.exports;
const expectedStatusLabels = new Map([
  [100, "All Statuses"],
  [101, "Draft"],
  [102, "Under Review"],
  [103, "Pending Payment"],
  [104, "Pending Modification"],
  [105, "Completed"],
  [106, "Rejected"],
  [107, "Cancelled"],
  [108, "Pending Disposition"],
  [109, "Disposition Verification"],
]);

test(
  "maps application status ids 100 through 109 to the authoritative labels",
  () => {
    expectedStatusLabels.forEach((expectedLabel, statusId) => {
      const statusKey = resolveMyRequestStatus({ statusId });

      assert.equal(getMyRequestStatusLabel(statusKey), expectedLabel);
    });
  },
);

test("keeps supported verification names on the disposition verification label", () => {
  ["Disposition Verification", "Under Verification", "Pending Verification"].forEach(
    (statusName) => {
      const statusKey = resolveMyRequestStatus({ statusName });

      assert.equal(statusKey, "underVerification");
      assert.equal(getMyRequestStatusLabel(statusKey), "Disposition Verification");
    },
  );
});

test("omits cancellation from content-service pending modification actions", () => {
  assert.deepEqual(
    Array.from(
      getMyRequestListActions({ statusId: 104, isContentService: true }),
      ({ key }) => key,
    ),
    ["edit", "duplicate"],
  );
  assert.deepEqual(
    Array.from(
      getMyRequestDetailActions({ statusId: 104, isContentService: true }),
      ({ key }) => key,
    ),
    ["duplicate", "edit"],
  );
});

test("keeps cancellation available for license pending modification actions", () => {
  assert.deepEqual(
    Array.from(
      getMyRequestListActions({ statusId: 104, isContentService: false }),
      ({ key }) => key,
    ),
    ["edit", "cancel", "duplicate"],
  );
  assert.deepEqual(
    Array.from(
      getMyRequestDetailActions({ statusId: 104, isContentService: false }),
      ({ key }) => key,
    ),
    ["cancel", "duplicate", "edit"],
  );
});

test("keeps cancellation available for pending payment actions", () => {
  assert.deepEqual(
    Array.from(getMyRequestListActions({ statusId: 103 }), ({ key }) => key),
    ["payNow", "cancel", "duplicate"],
  );
  assert.deepEqual(
    Array.from(getMyRequestDetailActions({ statusId: 103 }), ({ key }) => key),
    ["cancel", "duplicate", "payNow"],
  );
});

test("keeps English and Arabic status resources aligned", () => {
  const resourceDirectory = new URL(
    "src/localization/components/common/CustomStatusTag/",
    workspaceRoot,
  );
  const english = JSON.parse(
    fs.readFileSync(new URL("en.json", resourceDirectory), "utf8"),
  ).myRequest;
  const arabic = JSON.parse(
    fs.readFileSync(new URL("ar.json", resourceDirectory), "utf8"),
  ).myRequest;

  assert.deepEqual(Object.keys(english), Object.keys(arabic));
  expectedStatusLabels.forEach((expectedLabel, statusId) => {
    assert.equal(english[String(statusId)], expectedLabel);
  });
  assert.equal(english.allStatuses, "All Statuses");
  assert.equal(english.underVerification, "Disposition Verification");
  assert.equal(arabic["100"], "جميع الحالات");
  assert.equal(arabic["109"], "التحقق من التصرف");
  assert.equal(arabic.allStatuses, "جميع الحالات");
  assert.equal(arabic.underVerification, "التحقق من التصرف");
});
