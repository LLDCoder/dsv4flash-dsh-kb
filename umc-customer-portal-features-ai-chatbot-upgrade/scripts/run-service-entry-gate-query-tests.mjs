import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirectory = mkdtempSync(
  join(tmpdir(), "service-entry-gate-query-tests-"),
);
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);
const configurations = [
  { name: "enabled", defaultEnabled: true },
  { name: "disabled", defaultEnabled: false },
];

try {
  for (const configuration of configurations) {
    const bundlePath = join(
      tempDirectory,
      `serviceEntryGateQuery.${configuration.name}.test.mjs`,
    );

    execFileSync(
      esbuildPath,
      [
        "scripts/serviceEntryGateQuery.test.ts",
        "--bundle",
        "--platform=node",
        "--format=esm",
        `--define:import.meta.env.VITE_SERVICE_ENTRY_GATE_DEFAULT_ENABLED=${JSON.stringify(String(configuration.defaultEnabled))}`,
        `--banner:js=globalThis.__serviceEntryGateDefaultEnabled = ${configuration.defaultEnabled};`,
        `--outfile=${bundlePath}`,
      ],
      { stdio: "inherit" },
    );

    const result = spawnSync(process.execPath, ["--test", bundlePath], {
      stdio: "inherit",
    });

    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
  }
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
