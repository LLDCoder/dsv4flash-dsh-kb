import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(
  join(resolve("node_modules/.cache"), "address-picker-validation-tests-"),
);
const bundlePath = join(tempDirectory, "addressPickerValidation.test.mjs");
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

try {
  execFileSync(
    esbuildPath,
    [
      "scripts/addressPickerValidation.test.tsx",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--external:jsdom",
      "--banner:js=import.meta.glob ??= () => ({}); globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };",
      "--alias:@=./src",
      "--alias:@/services/address=./scripts/stubs/addressServiceStub.mjs",
      "--alias:@/localization/config=./scripts/stubs/i18nConfigStub.mjs",
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

  const result = spawnSync(
    process.execPath,
    ["--test", "--test-force-exit", bundlePath],
    {
      stdio: "inherit",
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
