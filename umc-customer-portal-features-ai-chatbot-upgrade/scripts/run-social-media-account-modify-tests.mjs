import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const tempDirectory = mkdtempSync(
  join(tmpdir(), "social-media-account-modify-tests-"),
);
const bundlePath = join(tempDirectory, "socialMediaAccountModify.test.mjs");
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

try {
  execFileSync(
    esbuildPath,
    [
      "scripts/socialMediaAccountModify.test.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--alias:@=./src",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );

  const testModule = await import(pathToFileURL(bundlePath).href);
  testModule.runSocialMediaAccountModifyTests();
  console.log("Social media account Modify tests passed.");
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
