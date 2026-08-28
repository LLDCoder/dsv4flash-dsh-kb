import assert from "node:assert/strict";
import test from "node:test";
import { isServiceEntryGateEnabled } from "../src/utils/serviceEntryGateQuery.ts";

const runtime = globalThis as typeof globalThis & {
  __serviceEntryGateDefaultEnabled: boolean;
};

test("keeps the gate enabled when the environment default is enabled", {
  skip: !runtime.__serviceEntryGateDefaultEnabled,
}, () => {
  for (const search of [
    "",
    "?serviceEntryGate=0",
    "?serviceEntryGate=false",
    "?serviceEntryGate=off",
    "?serviceEntryGate=disabled",
    "?serviceEntryGate=unexpected",
  ]) {
    assert.equal(
      isServiceEntryGateEnabled(search),
      true,
      `expected Gate to remain enabled for ${search || "an empty query"}`,
    );
  }
});

test("preserves query overrides when the environment default is disabled", {
  skip: runtime.__serviceEntryGateDefaultEnabled,
}, () => {
  const cases = [
    ["", false],
    ["?serviceEntryGate=1", true],
    ["?serviceEntryGate=true", true],
    ["?serviceEntryGate=on", true],
    ["?serviceEntryGate=enabled", true],
    ["?serviceEntryGate=0", false],
    ["?serviceEntryGate=false", false],
    ["?serviceEntryGate=off", false],
    ["?serviceEntryGate=disabled", false],
    ["?serviceEntryGate=unexpected", false],
  ] as const;

  for (const [search, expected] of cases) {
    assert.equal(
      isServiceEntryGateEnabled(search),
      expected,
      `expected ${search || "an empty query"} to resolve to ${expected}`,
    );
  }
});
