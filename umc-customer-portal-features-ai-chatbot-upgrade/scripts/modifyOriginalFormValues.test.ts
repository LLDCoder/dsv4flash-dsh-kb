import assert from "node:assert/strict";
import test from "node:test";
import {
  attachModifyChangeSet,
  attachModifyOriginalFormValues,
  attachModifyReviewMetadata,
  clearModifyReviewMetadata,
  hasEmbeddedModifyOriginalValues,
  resolveModifyOriginalForms,
} from "../src/pages/MediaLicense/modifyOriginalFormValues.ts";

const createStep = (
  stepNameEn: string,
  component: string,
  formValues: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) => ({
  stepNameEn,
  formData: JSON.stringify({
    schema: {
      type: "object",
      properties: { Field: { "x-component": component } },
    },
    formValues,
    ...extra,
  }),
});

test("embeds the matched original step values for Admin review", () => {
  const current = [createStep("Details", "Input", { Field: "After" })];
  const original = [createStep("Details", "Input", { Field: "Before" })];
  const [result] = attachModifyOriginalFormValues(current, original);
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.modifyOriginalFormValues, { Field: "Before" });
  assert.deepEqual(parsed.formValues, { Field: "After" });
});

test("uses the real Profile snapshot for a ProfileForm field", () => {
  const current = [
    createStep("Establishment", "ProfileForm", {
      Field: { establishmentNameEnglish: "After" },
    }),
  ];
  const original = [createStep("Establishment", "ProfileForm", {})];
  const [result] = attachModifyOriginalFormValues(current, original, {
    establishmentNameEnglish: "Before",
  });
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.modifyOriginalFormValues.Field, {
    establishmentNameEnglish: "Before",
  });
});

test("preserves an embedded draft snapshot instead of replacing it", () => {
  const current = [
    createStep(
      "Details",
      "Input",
      { Field: "Draft after" },
      { modifyOriginalFormValues: { Field: "Saved before" } },
    ),
  ];
  const original = [createStep("Details", "Input", { Field: "Wrong before" })];
  const [result] = attachModifyOriginalFormValues(current, original);
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.modifyOriginalFormValues, { Field: "Saved before" });
});

test("restores the embedded snapshot for a draft Change Summary", () => {
  const current = [
    createStep(
      "Details",
      "Input",
      { Field: "Draft after" },
      { modifyOriginalFormValues: { Field: "Saved before" } },
    ),
  ];
  const [result] = resolveModifyOriginalForms(current);
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.formValues, { Field: "Saved before" });
  assert.deepEqual(parsed.modifyOriginalFormValues, { Field: "Saved before" });
});

test("clears inherited review metadata without changing the current form data", () => {
  const current = [
    createStep(
      "Details",
      "Input",
      { Field: "Current value" },
      {
        modifyOriginalFormValues: { Field: "Historical value" },
        modifyChangeSet: { sectionNameEn: "Details", changes: [] },
        fileList: [{ name: "document.pdf" }],
      },
    ),
  ];

  const [result] = clearModifyReviewMetadata(current);
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.formValues, { Field: "Current value" });
  assert.deepEqual(parsed.fileList, [{ name: "document.pdf" }]);
  assert.equal("modifyOriginalFormValues" in parsed, false);
  assert.equal("modifyChangeSet" in parsed, false);
});

test("clears inherited social media operations for a new Modify session", () => {
  const current = [
    {
      stepNameEn: "Social Media Accounts",
      formData: JSON.stringify({
        schema: {
          type: "object",
          properties: {
            socialMediaAccounts: {
              "x-component": "SocialMediaAccount",
            },
          },
        },
        formValues: {
          socialMediaAccounts: [
            {
              id: "existing-account",
              accountId: 59,
              accountName: "Existing account",
            },
            {
              id: "previously-added-account",
              accountId: 60,
              accountName: "Previously added account",
              operation: "ADD",
            },
          ],
        },
      }),
    },
  ];

  const [result] = clearModifyReviewMetadata(current);
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.formValues.socialMediaAccounts, [
    {
      id: "existing-account",
      accountId: 59,
      accountName: "Existing account",
    },
    {
      id: "previously-added-account",
      accountId: 60,
      accountName: "Previously added account",
    },
  ]);
});

test("preserves similarly named fields outside SocialMediaAccount steps", () => {
  const current = [
    createStep("Other", "Input", {
      socialMediaAccounts: [
        {
          id: "unrelated-item",
          operation: "ADD",
        },
      ],
    }),
  ];

  const [result] = clearModifyReviewMetadata(current);
  const parsed = JSON.parse(result.formData || "{}");

  assert.equal(
    parsed.formValues.socialMediaAccounts[0].operation,
    "ADD",
  );
});

test("embeds the computed Change Set in its matching step and clears stale data", () => {
  const current = [
    createStep("Details", "Input", { Field: "After" }),
    createStep(
      "Unchanged",
      "Input",
      { Field: "Same" },
      { modifyChangeSet: { changes: [{ fieldKey: "stale" }] } },
    ),
  ];
  const [changed, unchanged] = attachModifyChangeSet(current, [
    {
      sectionNameEn: "Details",
      sectionNameAr: "Details",
      changes: [
        {
          kind: "field",
          component: "Input",
          changeType: "MODIFIED",
          fieldKey: "Field",
          labelEn: "Field",
          labelAr: "الحقل",
          beforeValue: "Before",
          afterValue: "After",
        },
      ],
    },
  ]);

  assert.deepEqual(JSON.parse(changed.formData || "{}").modifyChangeSet, {
    sectionNameEn: "Details",
    sectionNameAr: "Details",
    changes: [
      {
        kind: "field",
        component: "Input",
        changeType: "MODIFIED",
        fieldKey: "Field",
        labelEn: "Field",
        labelAr: "الحقل",
        beforeValue: "Before",
        afterValue: "After",
      },
    ],
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      JSON.parse(unchanged.formData || "{}"),
      "modifyChangeSet",
    ),
    false,
  );
});

test("persists original values and the matching computed Change Set together", () => {
  const current = [createStep("Details", "Input", { Field: "After" })];
  const original = [createStep("Details", "Input", { Field: "Before" })];
  const [result] = attachModifyReviewMetadata(current, original);
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.modifyOriginalFormValues, { Field: "Before" });
  assert.deepEqual(parsed.modifyChangeSet?.changes, [
    {
      kind: "field",
      component: "Input",
      changeType: "MODIFIED",
      fieldKey: "Field",
      labelEn: "Field",
      labelAr: "Field",
      beforeValue: "Before",
      afterValue: "After",
    },
  ]);
});

test("detects whether a saved Modify draft contains an original snapshot", () => {
  assert.equal(
    hasEmbeddedModifyOriginalValues([
      createStep("Details", "Input", { Field: "After" }, {
        modifyOriginalFormValues: { Field: "Before" },
      }),
    ]),
    true,
  );
  assert.equal(
    hasEmbeddedModifyOriginalValues([
      createStep("Details", "Input", { Field: "After" }),
    ]),
    false,
  );
  assert.equal(
    hasEmbeddedModifyOriginalValues([
      createStep("Details", "Input", { Field: "After" }, {
        modifyOriginalFormValues: { Field: "Before" },
      }),
      createStep("Other", "Input", { Field: "After" }),
    ]),
    false,
  );
  assert.equal(
    hasEmbeddedModifyOriginalValues([
      createStep("Details", "Input", { Field: "After" }, {
        modifyOriginalFormValues: {},
      }),
    ]),
    false,
  );
  assert.equal(
    hasEmbeddedModifyOriginalValues([
      createStep("Details", "Input", { Field: "After" }, {
        modifyOriginalFormValues: { Field: "Before" },
      }),
      { stepNameEn: "Broken", formData: "not-json" },
    ]),
    false,
  );
  assert.equal(
    hasEmbeddedModifyOriginalValues([
      createStep("Details", "Input", { Field: "After" }, {
        modifyOriginalFormValues: { Field: "Before" },
      }),
      { stepNameEn: "Missing" },
    ]),
    false,
  );
});
