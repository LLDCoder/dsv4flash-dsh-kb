import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const modulePath = new URL(
  "../src/pages/Home/components/loginAsEntry.ts",
  import.meta.url,
);

async function loadModule() {
  assert.equal(existsSync(modulePath), true, "login-as entry helper must exist");

  const source = await readFile(modulePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: modulePath.pathname,
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;

  return import(dataUrl);
}

test("keeps the profile selector hidden until approved profiles are loaded", async () => {
  const { resolveLoginAsEntry } = await loadModule();

  assert.deepEqual(
    resolveLoginAsEntry({
      gateVisible: true,
      profilesStatus: "idle",
      profilesUserId: "user-1",
      currentUserId: "user-1",
      hasProfiles: false,
    }),
    { visible: false, enterGlobalView: false },
  );
});

test("enters Global View without showing the selector when no profile is returned", async () => {
  const { resolveLoginAsEntry } = await loadModule();

  assert.deepEqual(
    resolveLoginAsEntry({
      gateVisible: true,
      profilesStatus: "loaded",
      profilesUserId: "user-1",
      currentUserId: "user-1",
      hasProfiles: false,
    }),
    { visible: false, enterGlobalView: true },
  );
});

test("shows the selector after at least one approved profile is loaded", async () => {
  const { resolveLoginAsEntry } = await loadModule();

  assert.deepEqual(
    resolveLoginAsEntry({
      gateVisible: true,
      profilesStatus: "loaded",
      profilesUserId: "user-1",
      currentUserId: "user-1",
      hasProfiles: true,
    }),
    { visible: true, enterGlobalView: false },
  );
});

test("does not change identity after the login-as gate has been dismissed", async () => {
  const { resolveLoginAsEntry } = await loadModule();

  assert.deepEqual(
    resolveLoginAsEntry({
      gateVisible: false,
      profilesStatus: "loaded",
      profilesUserId: "user-1",
      currentUserId: "user-1",
      hasProfiles: false,
    }),
    { visible: false, enterGlobalView: false },
  );
});

test("keeps profiles from the login response available when refresh fails", async () => {
  const { resolveLoginAsEntry } = await loadModule();

  assert.deepEqual(
    resolveLoginAsEntry({
      gateVisible: true,
      profilesStatus: "failed",
      profilesUserId: "user-1",
      currentUserId: "user-1",
      hasProfiles: true,
    }),
    { visible: true, enterGlobalView: false },
  );
});

test("ignores a completed profile request from a different user", async () => {
  const { resolveLoginAsEntry } = await loadModule();

  assert.deepEqual(
    resolveLoginAsEntry({
      gateVisible: true,
      profilesStatus: "loaded",
      profilesUserId: "previous-user",
      currentUserId: "current-user",
      hasProfiles: false,
    }),
    { visible: false, enterGlobalView: false },
  );
});
