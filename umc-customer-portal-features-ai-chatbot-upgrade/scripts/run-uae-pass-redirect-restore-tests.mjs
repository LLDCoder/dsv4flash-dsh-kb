import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(
  join(tmpdir(), "uae-pass-redirect-restore-tests-"),
);
const bundlePath = join(tempDirectory, "uaePassRedirectRestore.test.cjs");
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

try {
  execFileSync(
    esbuildPath,
    [
      "scripts/uaePassRedirectRestore.test.ts",
      "--bundle",
      "--platform=node",
      "--format=cjs",
      "--packages=external",
      "--alias:@=./src",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );

  const result = spawnSync(process.execPath, ["--test", bundlePath], {
    env: {
      ...process.env,
      NODE_PATH: resolve("node_modules"),
    },
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
