import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const modulePath = path.resolve("src/utils/notificationProfile.ts");

const loadResolveNotificationProfileId = () => {
  if (!fs.existsSync(modulePath)) {
    return () => null;
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

  return testModule.exports.resolveNotificationProfileId;
};

test("resolves Global View profile ID zero while rejecting an unresolved profile", () => {
  const resolveNotificationProfileId = loadResolveNotificationProfileId();

  assert.equal(resolveNotificationProfileId("0"), "0");
  assert.equal(resolveNotificationProfileId("42"), "42");
  assert.equal(resolveNotificationProfileId(""), null);
  assert.equal(resolveNotificationProfileId("not-a-profile"), null);
});
