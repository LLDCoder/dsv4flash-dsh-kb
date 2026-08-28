import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const logoutNoticeModulePath = path.resolve("src/utils/logoutNotice.ts");
const logoutNoticeSource = fs.readFileSync(logoutNoticeModulePath, "utf8");
const compiledLogoutNotice = ts.transpileModule(logoutNoticeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const logoutNoticeTestModule = { exports: {} };

new Function("exports", "module", compiledLogoutNotice)(
  logoutNoticeTestModule.exports,
  logoutNoticeTestModule,
);

const {
  consumeLogoutNotice,
  storeLogoutNotice,
} = logoutNoticeTestModule.exports;

test("keeps the logout notice while authenticated logout is in progress", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  storeLogoutNotice(storage, "Session expired");

  assert.equal(consumeLogoutNotice(storage, true), null);
  assert.equal(consumeLogoutNotice(storage, false), "Session expired");
  assert.equal(consumeLogoutNotice(storage, false), null);
});
