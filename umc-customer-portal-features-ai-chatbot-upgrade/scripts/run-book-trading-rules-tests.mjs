import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(join(tmpdir(), "book-trading-rules-"));
const bundlePath = join(tempDirectory, "bookTradingRules.test.mjs");
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

try {
  execFileSync(
    esbuildPath,
    [
      "scripts/bookTradingRules.test.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );
  execFileSync(process.execPath, ["--test", bundlePath], { stdio: "inherit" });
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
