import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(
  join(tmpdir(), "service-entry-gate-requirement-missing-tests-"),
);
const bundlePath = join(
  tempDirectory,
  "serviceEntryGateRequirementMissing.test.mjs",
);
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

try {
  execFileSync(
    esbuildPath,
    [
      "scripts/serviceEntryGateRequirementMissing.test.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--alias:@/components/common=./scripts/stubs/commonStub.mjs",
      "--alias:@/localization/config=./scripts/stubs/i18nConfigStub.mjs",
      "--alias:@/utils/history=./scripts/stubs/historyStub.mjs",
      "--alias:@/utils/request=./scripts/stubs/requestStub.mjs",
      "--alias:@/store/update-form=./scripts/stubs/updateFormStub.mjs",
      "--alias:@=./src",
      "--banner:js=globalThis.__serviceEntryGateStorage = new Map(); globalThis.__serviceEntryGateRequests = []; globalThis.__serviceEntryGateRedirects = []; globalThis.localStorage ??= { getItem: (key) => globalThis.__serviceEntryGateStorage.get(key) ?? null, setItem: (key, value) => globalThis.__serviceEntryGateStorage.set(key, value), removeItem: (key) => globalThis.__serviceEntryGateStorage.delete(key), clear: () => globalThis.__serviceEntryGateStorage.clear() }; globalThis.sessionStorage ??= globalThis.localStorage; globalThis.window ??= { location: { assign: (url) => globalThis.__serviceEntryGateRedirects.push(url) } };",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );

  const result = spawnSync(process.execPath, ["--test", bundlePath], {
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
