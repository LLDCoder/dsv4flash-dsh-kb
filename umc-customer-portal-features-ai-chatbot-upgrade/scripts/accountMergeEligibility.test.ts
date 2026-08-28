import assert from "node:assert/strict";
import test from "node:test";
import {
  getAccountMergeErrorStatus,
  interpretCanMergeResponse,
  normalizeAccountMergeStatus,
  type AccountMergeStatus,
} from "../src/pages/Home/utils.ts";

const BACKEND_STATUSES: AccountMergeStatus[] = [
  "SOURCE_NOT_ELIGIBLE",
  "SOURCE_ELIGIBLE",
  "FORCE_MERGE_REQUIRED",
  "TARGET_ELIGIBLE",
  "TARGET_IDENTITY_MISMATCH",
  "TARGET_HAS_BUSINESS_DATA",
  "TARGET_ALREADY_LINKED",
  "TARGET_ALREADY_MERGED",
  "TARGET_NOT_ELIGIBLE",
  "ALREADY_LINKED",
];

test("accepts the target verification status contract", () => {
  for (const status of BACKEND_STATUSES) {
    assert.equal(normalizeAccountMergeStatus(status), status);
  }
  assert.equal(normalizeAccountMergeStatus("TARGET_HAS_DATA_ASSETS"), "");
});

test("uses only canMerge and forceMerge for entry eligibility", () => {
  assert.deepEqual(
    interpretCanMergeResponse({
      canMerge: false,
      forceMerge: true,
      status: "SOURCE_ELIGIBLE",
    }),
    { mode: "none" },
  );
  assert.deepEqual(
    interpretCanMergeResponse({
      canMerge: true,
      forceMerge: false,
      sourceEligible: true,
      canLink: false,
      status: "TARGET_HAS_BUSINESS_DATA",
    }),
    { mode: "optional" },
  );
});

test("keeps forced merge target hints without using legacy status decisions", () => {
  assert.deepEqual(
    interpretCanMergeResponse(
      {
        canMerge: true,
        forceMerge: true,
        targetUserId: "target-user",
        targetEmail: "person@example.com",
        status: "TARGET_HAS_BUSINESS_DATA",
      },
      "source@example.com",
    ),
    {
      mode: "forced",
      matchedAccountEmail: "person@example.com",
      targetUserId: "target-user",
    },
  );
  assert.deepEqual(
    interpretCanMergeResponse(
      {
        canMerge: true,
        forceMerge: true,
        targetUserId: null,
        targetEmail: null,
      },
      "source@example.com",
    ),
    {
      mode: "forced",
      matchedAccountEmail: "source@example.com",
      targetUserId: "",
    },
  );
});

test("reads direct and axios target verification error statuses", () => {
  assert.equal(
    getAccountMergeErrorStatus({ status: "TARGET_IDENTITY_MISMATCH" }),
    "TARGET_IDENTITY_MISMATCH",
  );
  assert.equal(
    getAccountMergeErrorStatus({
      response: { data: { businessCode: "TARGET_HAS_BUSINESS_DATA" } },
    }),
    "TARGET_HAS_BUSINESS_DATA",
  );
  assert.equal(
    getAccountMergeErrorStatus({ errorCode: "TARGET_ALREADY_MERGED" }),
    "TARGET_ALREADY_MERGED",
  );
});
