import assert from "node:assert/strict";
import test from "node:test";
import {
  canRunIdentityVerification,
  shouldContinueAfterIdentityVerification,
  shouldReuseCompletedIdentityVerification,
} from "../src/pages/PersonalProfile/utils/submissionPolicy";

test("continues profile submission when identity verification fails by default", () => {
  assert.equal(shouldContinueAfterIdentityVerification(false), true);
});

test("continues profile submission when identity verification succeeds", () => {
  assert.equal(shouldContinueAfterIdentityVerification(true), true);
});

test("blocks profile submission after a failed verification when ignoring is disabled", () => {
  assert.equal(shouldContinueAfterIdentityVerification(false, false), false);
});

test("does not reuse a completed verification when Submit requires a fresh request", () => {
  assert.equal(shouldReuseCompletedIdentityVerification(true, true), false);
});

test("allows verification from Submit even when edit-page automatic verification is disabled", () => {
  assert.equal(
    canRunIdentityVerification({
      isAddMode: false,
      isEditWithInitialData: false,
      detailAutoSyncFromLoadedForm: false,
      canRunEditManualVerification: false,
      isSubmitAttempt: true,
    }),
    true,
  );
});
