import assert from "node:assert/strict";
import test from "node:test";
import {
  buildModifyLifecycleActivityPayload,
  resolveModifyLifecycleActivityIds,
  resolveModifySourceApplicationActivityIds,
} from "../src/pages/MediaLicense/modifyLifecycleActivityPayload.ts";

test("normalizes lifecycle activity ids into a unique number array", () => {
  assert.deepEqual(
    resolveModifyLifecycleActivityIds(["1040", 1040, 1043, 0, "invalid"]),
    [1040, 1043],
  );
});

test("builds the top-level activityIds payload for modify services", () => {
  assert.deepEqual(buildModifyLifecycleActivityPayload([1040]), {
    activityIds: [1040],
  });
});

test("rejects missing lifecycle activities instead of submitting an empty array", () => {
  assert.throws(
    () => buildModifyLifecycleActivityPayload([]),
    /at least one lifecycle activity is required/i,
  );
});

test("resolves Service 803 activity ids from the original application form data", () => {
  const sourceFormData = JSON.stringify([
    {
      stepNameEn: "Activity Details",
      formData: JSON.stringify({
        formValues: {
          SelectTableSingle: {
            selectedKey: ["27", 27],
          },
        },
      }),
    },
    {
      stepNameEn: "Chief Editor / Authorized Person",
      formData: JSON.stringify({ formValues: {} }),
    },
  ]);

  assert.deepEqual(
    resolveModifySourceApplicationActivityIds(sourceFormData),
    [27],
  );
});

test("does not infer Service 803 activity ids from invalid source form data", () => {
  assert.deepEqual(resolveModifySourceApplicationActivityIds("invalid"), []);
  assert.deepEqual(
    resolveModifySourceApplicationActivityIds(
      JSON.stringify([
        {
          formData: JSON.stringify({
            formValues: { SelectTableSingle: { tableData: [{ Id: 27 }] } },
          }),
        },
      ]),
    ),
    [],
  );
});

test("skips a malformed source step before resolving the Service 803 activity", () => {
  assert.deepEqual(
    resolveModifySourceApplicationActivityIds(
      JSON.stringify([
        { formData: "invalid" },
        {
          formData: JSON.stringify({
            formValues: {
              SelectTableSingle: { selectedKey: ["27"] },
            },
          }),
        },
      ]),
    ),
    [27],
  );
});
