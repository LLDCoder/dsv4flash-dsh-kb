import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(
  join(tmpdir(), "delivery-information-initialization-tests-"),
);
const bundlePath = join(
  tempDirectory,
  "deliveryInformationInitialization.test.mjs",
);
const esbuildPath = resolve("node_modules", ".bin", "esbuild");

try {
  execFileSync(
    esbuildPath,
    [
      "scripts/deliveryInformationInitialization.test.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--alias:@/localization/config=./scripts/stubs/i18nConfigStub.mjs",
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
