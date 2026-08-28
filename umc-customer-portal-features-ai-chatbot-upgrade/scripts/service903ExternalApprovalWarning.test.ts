import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowService903ExternalApprovalWarning } from "../src/components/designable/src/components/SelectTable/service903ExternalApprovalWarning.ts";

test("shows the warning for each configured service 903 activity", () => {
  for (const activityId of [1, 4, 1021, 16, 23]) {
    assert.equal(
      shouldShowService903ExternalApprovalWarning([activityId], []),
      true,
      `activity ${activityId} should show the warning`,
    );
    assert.equal(
      shouldShowService903ExternalApprovalWarning([String(activityId)], []),
      true,
      `string activity ${activityId} should show the warning`,
    );
  }
});

test("does not show the warning for a configured prefilled activity", () => {
  assert.equal(
    shouldShowService903ExternalApprovalWarning(["1"], [1]),
    false,
  );
});

test("does not show the warning for an unconfigured activity", () => {
  assert.equal(
    shouldShowService903ExternalApprovalWarning(["42"], []),
    false,
  );
});

test("shows the warning when one activity in a mixed selection is configured", () => {
  assert.equal(
    shouldShowService903ExternalApprovalWarning(["42", "23"], []),
    true,
  );
});

test("hides the warning after every configured activity is removed", () => {
  assert.equal(
    shouldShowService903ExternalApprovalWarning(["42"], []),
    false,
  );
});
