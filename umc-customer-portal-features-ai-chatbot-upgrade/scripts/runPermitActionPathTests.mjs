import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const tempDirectory = mkdtempSync(join(tmpdir(), "permit-action-path-tests-"));
const bundlePath = join(tempDirectory, "permitActionPath.mjs");
const esbuildPath = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

const run = async () => {
  execFileSync(
    esbuildPath,
    [
      "src/utils/permitActionPath.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--alias:@=./src",
      "--define:import.meta.env.VITE_SERVICE_ENTRY_GATE_DEFAULT_ENABLED=undefined",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );

  const {
    createPermitActionPath,
    createServiceApplicationActionPath,
    resolvePermitActionApplicationId,
  } = await import(pathToFileURL(bundlePath).href);

  assert.equal(
    resolvePermitActionApplicationId?.({
      applicationId: 2765,
      sourceApplicationId: 2698,
    }),
    2765,
    "lifecycle actions must load the latest approved application",
  );

  assert.equal(
    resolvePermitActionApplicationId?.({
      applicationId: null,
      sourceApplicationId: 2698,
    }),
    2698,
    "legacy permit records must fall back to the issuing source application",
  );

  assert.equal(
    resolvePermitActionApplicationId?.({
      applicationId: 1388,
      sourceApplicationId: null,
    }),
    1388,
    "legacy permit records must keep their available application ID",
  );

  assert.equal(
    resolvePermitActionApplicationId?.({
      applicationId: 1388,
      sourceApplicationId: 0,
    }),
    1388,
    "invalid source IDs must not hide a valid application ID",
  );

  assert.equal(
    createPermitActionPath({
      serviceId: 3217,
      action: "MODIFY",
      serviceCode: "80012",
      applicationId: 1388,
      requestType: 1,
    }),
    "/services/media-license?serviceId=3217&actions=MODIFY&serviceCode=80012&applicationId=1388&type=1",
  );

  assert.equal(
    createPermitActionPath({
      serviceId: 3217,
      action: "MODIFY",
      serviceCode: "80012",
      applicationId: 1388,
      includeServiceEntryGate: true,
      sourceSearch: "?serviceEntryGate=1",
    }),
    "/services/media-license?serviceId=3217&actions=MODIFY&serviceCode=80012&applicationId=1388&serviceEntryGate=1",
  );

  assert.equal(
    createServiceApplicationActionPath({
      serviceId: 3170,
      action: "Duplicate",
      serviceCode: "901",
      applicationId: 2350,
      applicationStatusId: 102,
      includeServiceEntryGate: true,
      sourceSearch: "?serviceEntryGate=enabled",
    }),
    "/services/media-license?serviceId=3170&actions=Duplicate&serviceCode=901&applicationId=2350&status=102&serviceEntryGate=1",
  );

  assert.equal(
    createServiceApplicationActionPath({
      serviceId: 3170,
      action: "Duplicate",
      includeServiceEntryGate: true,
    }),
    "/services/media-license?serviceId=3170&actions=Duplicate",
  );

  assert.equal(
    createServiceApplicationActionPath({
      serviceId: 3170,
      action: "edit",
      includeServiceEntryGate: true,
      sourceSearch: "?serviceEntryGate=disabled",
    }),
    "/services/media-license?serviceId=3170&actions=edit&serviceEntryGate=0",
  );

  assert.equal(
    createServiceApplicationActionPath({
      serviceId: 3170,
      action: "edit",
      includeServiceEntryGate: true,
      sourceSearch: "?serviceEntryGate=unexpected",
    }),
    "/services/media-license?serviceId=3170&actions=edit",
  );

  console.log("Permit action path tests passed.");
};

let exitCode = 0;

try {
  await run();
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

process.exit(exitCode);
