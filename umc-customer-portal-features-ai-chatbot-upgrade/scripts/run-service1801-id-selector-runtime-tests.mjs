import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(join(tmpdir(), "service1801-id-selector-tests-"));
const bundlePath = join(tempDirectory, "service1801IdSelectorRuntime.test.mjs");
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

try {
  execFileSync(
    esbuildPath,
    [
      "scripts/service1801IdSelectorRuntime.test.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--tsconfig=tsconfig.app.json",
      "--alias:@/localization/config=./scripts/idSelectorUtilsTestStubs.ts",
      "--alias:@/components/common/MobileNumberInput=./scripts/idSelectorUtilsTestStubs.ts",
      "--alias:@=./src",
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
