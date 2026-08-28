import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHomeRenewalDocumentType } from "../src/pages/Home/utils.ts";

test("defaults Home renewal action-needed records to a license document", () => {
  assert.equal(normalizeHomeRenewalDocumentType(undefined), "LICENSE");
});

test("preserves an explicit permit document type", () => {
  assert.equal(normalizeHomeRenewalDocumentType("PERMIT"), "PERMIT");
});
