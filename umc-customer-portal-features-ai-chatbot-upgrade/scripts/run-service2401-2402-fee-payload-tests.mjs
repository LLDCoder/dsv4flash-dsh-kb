import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(
  join(tmpdir(), "service2401-2402-fee-tests-"),
);
const bundlePath = join(
  tempDirectory,
  "service2401-2402FeePayload.test.mjs",
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
      "scripts/service2401-2402FeePayload.test.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--alias:@=./src",
      "--alias:@/services/services=./scripts/stubs/servicesStub.mjs",
      '--banner:js=globalThis.__RULE_TEST_CONTEXT__={apiBaseUrl:"http://localhost"};',
      "--loader:.less=empty",
      "--loader:.css=empty",
      "--loader:.svg=text",
      "--loader:.png=dataurl",
      "--loader:.jpg=dataurl",
      "--loader:.jpeg=dataurl",
      "--loader:.gif=dataurl",
      "--loader:.webp=dataurl",
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
