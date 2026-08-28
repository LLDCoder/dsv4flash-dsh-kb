import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const modulePath = path.resolve(
  "src/pages/Notifications/notificationApplicationNavigation.ts",
);

const loadNotificationApplicationNavigation = () => {
  if (!fs.existsSync(modulePath)) {
    return {};
  }

  const source = fs.readFileSync(modulePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const testModule = { exports: {} };

  new Function("exports", "module", compiled)(
    testModule.exports,
    testModule,
  );

  return testModule.exports;
};

test("resolves the exact notification application number to its detail path", () => {
  const { resolveNotificationApplicationDetailPath } =
    loadNotificationApplicationNavigation();

  const pathResult = resolveNotificationApplicationDetailPath(
    "MC-2-203-6211350",
    [
      { id: 9999, applicationNumber: "MC-2-203-6211351" },
      { id: 1112, applicationNumber: "MC-2-203-6211350" },
    ],
  );

  assert.equal(pathResult, "/my-requests/detail?id=1112");
});

test("does not build a detail path from an application number prefix", () => {
  const { resolveNotificationApplicationDetailPath } =
    loadNotificationApplicationNavigation();

  const pathResult = resolveNotificationApplicationDetailPath(
    "MC-2-203-6211350",
    [{ id: 9999, applicationNumber: "MC-2-203-6211350-1" }],
  );

  assert.equal(pathResult, "");
});

test("resolves the exact notification appeal number to its appeal detail path", () => {
  const { resolveNotificationAppealDetailPath } =
    loadNotificationApplicationNavigation();

  const pathResult = resolveNotificationAppealDetailPath(
    "HC-03-2026-9186043",
    [
      { id: 85, appealNo: "HC-03-2026-9186044" },
      { id: 86, appealNo: "HC-03-2026-9186043" },
    ],
  );

  assert.equal(pathResult, "/violations-fines/appeals/86");
});

test("does not build an appeal detail path from an appeal number prefix", () => {
  const { resolveNotificationAppealDetailPath } =
    loadNotificationApplicationNavigation();

  const pathResult = resolveNotificationAppealDetailPath(
    "HC-03-2026-9186043",
    [{ id: 86, appealNo: "HC-03-2026-9186043-1" }],
  );

  assert.equal(pathResult, "");
});

test("classifies only HC-03 references as appeal notifications", () => {
  const { isNotificationAppealReference } =
    loadNotificationApplicationNavigation();

  assert.equal(isNotificationAppealReference("HC-03-2026-9186043"), true);
  assert.equal(isNotificationAppealReference("HC-01-2026-9186043"), false);
  assert.equal(isNotificationAppealReference("MC-2-203-6211350"), false);
});

test("only the latest live notification navigation request can navigate", () => {
  const { createNotificationNavigationGuard } =
    loadNotificationApplicationNavigation();
  assert.equal(typeof createNotificationNavigationGuard, "function");
  const guard = createNotificationNavigationGuard();

  const firstRequest = guard.begin();
  const secondRequest = guard.begin();

  assert.equal(guard.isCurrent(firstRequest), false);
  assert.equal(guard.isCurrent(secondRequest), true);

  guard.invalidate();

  assert.equal(guard.isCurrent(secondRequest), false);
});
