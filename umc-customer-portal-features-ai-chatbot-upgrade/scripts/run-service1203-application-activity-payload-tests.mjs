import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const tempDirectory = mkdtempSync(
  join(tmpdir(), "service1203-application-activity-tests-"),
);
const bundlePath = join(
  tempDirectory,
  "service1203ApplicationActivityPayload.test.mjs",
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
      "scripts/service1203ApplicationActivityPayload.test.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--alias:@=./src",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );

  const testModule = await import(pathToFileURL(bundlePath).href);
  testModule.runService1203ApplicationActivityPayloadTests();
  console.log("Service 1203 application activity payload tests passed.");
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
