import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applySocialMediaCanonicalAccountContext,
  applySocialMediaModifySchemaContext,
} from "../src/pages/MediaLicense/socialMediaModifySchema.ts";
import { clearModifyReviewMetadata } from "../src/pages/MediaLicense/modifyOriginalFormValues.ts";

const originalItems = [
  {
    id: "account-1",
    accountName: "Original account",
    accountUrl: "https://example.com",
    mediaCategory: "2",
    mediaSubCategories: ["4"],
    accountType: "1",
    accountTitle: "Original account",
  },
];

const createStep = () => ({
  stepNameEn: "Social Media Accounts",
  stepNameAr: "حسابات التواصل الاجتماعي",
  formData: JSON.stringify({
    schema: {
      type: "object",
      properties: {
        wrapper: {
          type: "void",
          "x-component": "Card",
          properties: {
            socialMediaAccounts: {
              "x-component": "SocialMediaAccount",
              "x-component-props": { titleEn: "Social Media Accounts" },
            },
          },
        },
      },
    },
    formValues: { socialMediaAccounts: originalItems },
  }),
});

test("injects modify mode and the original account snapshot into the component schema", () => {
  const [result] = applySocialMediaModifySchemaContext([createStep()]);
  const parsed = JSON.parse(result.formData || "{}");
  const componentProps =
    parsed.schema.properties.wrapper.properties.socialMediaAccounts[
      "x-component-props"
    ];

  assert.equal(componentProps.modifyMode, true);
  assert.deepEqual(componentProps.originalItems, originalItems);
  assert.deepEqual(parsed.formValues.socialMediaAccounts, originalItems);
});

test("leaves forms without SocialMediaAccount unchanged", () => {
  const step = {
    stepNameEn: "Other",
    formData: JSON.stringify({
      schema: {
        type: "object",
        properties: { Name: { "x-component": "Input" } },
      },
      formValues: { Name: "unchanged" },
    }),
  };

  assert.deepEqual(applySocialMediaModifySchemaContext([step]), [step]);
});

test("injects an explicitly supplied fixed media category", () => {
  const [result] = applySocialMediaModifySchemaContext([createStep()], {
    fixedMediaCategory: "2",
  });
  const parsed = JSON.parse(result.formData || "{}");
  const componentProps =
    parsed.schema.properties.wrapper.properties.socialMediaAccounts[
      "x-component-props"
    ];

  assert.equal(componentProps.fixedMediaCategory, "2");
});

test("uses the embedded original snapshot when reopening a draft", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  parsed.formValues.socialMediaAccounts = [
    { ...originalItems[0], accountName: "Draft account" },
  ];
  parsed.modifyOriginalFormValues = {
    socialMediaAccounts: originalItems,
  };
  step.formData = JSON.stringify(parsed);

  const [result] = applySocialMediaModifySchemaContext([step]);
  const resultFormData = JSON.parse(result.formData || "{}");
  const componentProps =
    resultFormData.schema.properties.wrapper.properties.socialMediaAccounts[
      "x-component-props"
    ];

  assert.deepEqual(componentProps.originalItems, originalItems);
});

test("uses the current values as SocialMediaAccount originals in a new Modify session", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  const currentItems = [
    { ...originalItems[0], accountName: "Current account" },
  ];
  parsed.formValues.socialMediaAccounts = currentItems;
  parsed.modifyOriginalFormValues = {
    socialMediaAccounts: originalItems,
  };
  parsed.modifyChangeSet = { sectionNameEn: "Social Media Accounts", changes: [] };
  step.formData = JSON.stringify(parsed);

  const [result] = applySocialMediaModifySchemaContext(
    clearModifyReviewMetadata([step]),
  );
  const resultFormData = JSON.parse(result.formData || "{}");
  const componentProps =
    resultFormData.schema.properties.wrapper.properties.socialMediaAccounts[
      "x-component-props"
    ];

  assert.deepEqual(componentProps.originalItems, currentItems);
});

test("updates Formily schema without unmounting the observer tree", () => {
  const formilyViewSource = readFileSync(
    "src/components/common/FormliyView/index.tsx",
    "utf8",
  );

  assert.doesNotMatch(
    formilyViewSource,
    /setIsSchemaFieldMounted\(false\)|pendingSchemaDataRef|form\.clearFormGraph\("\*", false\)/,
    "schema replacement must not blank the form or destroy mounted observers",
  );
  assert.match(
    formilyViewSource,
    /<SchemaField\s+schema=\{schemaData\.schema\}/,
    "schema updates should preserve the mounted Formily field tree",
  );
});

test("hydrates canonical social account identifiers by an exact unique business match", () => {
  const canonicalAccounts = [
    {
      accountId: 9,
      platformId: 1,
      mediaCategoryId: 2,
      subCategoryIds: [4],
      displayName: "Original account",
      websiteUrl: "https://example.com",
    },
  ];
  const [result] = applySocialMediaCanonicalAccountContext(
    [createStep()],
    canonicalAccounts,
  );
  const parsed = JSON.parse(result.formData || "{}");

  assert.deepEqual(parsed.formValues.socialMediaAccounts[0], {
    ...originalItems[0],
    accountId: 9,
    platformId: 1,
    mediaCategoryId: 2,
    subCategoryIds: [4],
  });
});

test("appends canonical accounts missing from the saved form values", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  const secondAccount = {
    id: "account-2",
    accountName: "Second account",
    accountUrl: "https://example.com/second",
    mediaCategory: "2",
    mediaSubCategories: ["5"],
    accountType: "2",
    accountTitle: "Second account",
  };
  parsed.formValues.socialMediaAccounts = [originalItems[0], secondAccount];
  parsed.modifyOriginalFormValues = {
    socialMediaAccounts: [originalItems[0], secondAccount],
  };
  step.formData = JSON.stringify(parsed);

  const [result] = applySocialMediaCanonicalAccountContext([step], [
    {
      accountId: 9,
      platformId: 1,
      mediaCategoryId: 2,
      subCategoryIds: [4],
      displayName: "Original account",
      websiteUrl: "https://example.com",
    },
    {
      accountId: 10,
      platformId: 2,
      mediaCategoryId: 2,
      subCategoryIds: [5],
      displayName: "Second account",
      websiteUrl: "https://example.com/second",
    },
    {
      accountId: 11,
      platformId: 3,
      mediaCategoryId: 2,
      subCategoryIds: [6],
      displayName: "Third account",
      websiteUrl: "https://example.com/third",
    },
  ]);
  const resultFormData = JSON.parse(result.formData || "{}");
  const expectedThirdAccount = {
    id: "canonical-11",
    accountId: 11,
    platformId: 3,
    mediaCategoryId: 2,
    subCategoryIds: [6],
    accountName: "Third account",
    accountTitle: "Third account",
    accountUrl: "https://example.com/third",
    accountType: "3",
    mediaCategory: "2",
    mediaSubCategories: ["6"],
  };

  assert.equal(resultFormData.formValues.socialMediaAccounts.length, 3);
  assert.deepEqual(
    resultFormData.formValues.socialMediaAccounts[2],
    expectedThirdAccount,
  );
  assert.equal(
    resultFormData.modifyOriginalFormValues.socialMediaAccounts.length,
    3,
  );
  assert.deepEqual(
    resultFormData.modifyOriginalFormValues.socialMediaAccounts[2],
    expectedThirdAccount,
  );
});

test("replaces stale account identifiers without appending duplicate canonical accounts", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  const originalAccount = {
    id: "1785309235147-b56f4c88441b9",
    accountId: 58,
    platformId: 12,
    mediaCategoryId: 1,
    subCategoryIds: [19],
    accountName: "YUye",
    accountTitle: "YUye",
    accountUrl: "wwww.baidu.com",
    accountType: "12",
    mediaCategory: "1",
    mediaSubCategories: ["19"],
  };
  const addedAccount = {
    id: "1785309594937-1e3cf90b44d1f",
    accountName: "YUye",
    accountTitle: "YUye",
    accountUrl: "wwww.baidu.com",
    accountType: "10",
    mediaCategory: "1",
    mediaSubCategories: ["20"],
    operation: "ADD",
  };
  parsed.formValues.socialMediaAccounts = [originalAccount, addedAccount];
  parsed.modifyOriginalFormValues = {
    socialMediaAccounts: [originalAccount],
  };
  step.formData = JSON.stringify(parsed);

  const [result] = applySocialMediaCanonicalAccountContext([step], [
    {
      accountId: 59,
      platformId: 12,
      mediaCategoryId: 1,
      subCategoryIds: [19],
      displayName: "YUye",
      websiteUrl: "wwww.baidu.com",
    },
    {
      accountId: 60,
      platformId: 10,
      mediaCategoryId: 1,
      subCategoryIds: [20],
      displayName: "YUye",
      websiteUrl: "wwww.baidu.com",
    },
  ]);
  const resultFormData = JSON.parse(result.formData || "{}");

  assert.equal(resultFormData.formValues.socialMediaAccounts.length, 2);
  assert.deepEqual(
    resultFormData.formValues.socialMediaAccounts.map(
      (item: { accountId?: number }) => item.accountId,
    ),
    [59, 60],
  );
  assert.equal(
    resultFormData.formValues.socialMediaAccounts[1].operation,
    "ADD",
  );
  assert.equal(
    resultFormData.modifyOriginalFormValues.socialMediaAccounts.length,
    2,
  );
  assert.deepEqual(
    resultFormData.modifyOriginalFormValues.socialMediaAccounts.map(
      (item: { accountId?: number }) => item.accountId,
    ),
    [59, 60],
  );
});

test("distinguishes canonical accounts by platform and sub-categories", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  parsed.formValues.socialMediaAccounts = [
    {
      ...originalItems[0],
      id: "account-1",
      accountType: "5",
      mediaSubCategories: ["3"],
    },
    {
      ...originalItems[0],
      id: "account-2",
      accountType: "2",
      mediaSubCategories: ["1", "2", "7", "4"],
    },
  ];
  step.formData = JSON.stringify(parsed);

  const [result] = applySocialMediaCanonicalAccountContext([step], [
    {
      accountId: 40,
      platformId: 2,
      mediaCategoryId: 2,
      subCategoryIds: [1, 2, 4, 7],
      displayName: "Original account",
      websiteUrl: "https://example.com",
    },
    {
      accountId: 39,
      platformId: 5,
      mediaCategoryId: 2,
      subCategoryIds: [3],
      displayName: "Original account",
      websiteUrl: "https://example.com",
    },
  ]);
  const resultFormData = JSON.parse(result.formData || "{}");

  assert.equal(resultFormData.formValues.socialMediaAccounts[0].accountId, 39);
  assert.equal(resultFormData.formValues.socialMediaAccounts[1].accountId, 40);
});

test("matches canonical sub-category identifiers regardless of order", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  parsed.formValues.socialMediaAccounts[0] = {
    ...parsed.formValues.socialMediaAccounts[0],
    accountType: "2",
    mediaSubCategories: ["7", "1", "4", "2"],
  };
  step.formData = JSON.stringify(parsed);

  const [result] = applySocialMediaCanonicalAccountContext([step], [
    {
      accountId: 40,
      platformId: 2,
      mediaCategoryId: 2,
      subCategoryIds: [1, 2, 4, 7],
      displayName: "Original account",
      websiteUrl: "https://example.com",
    },
    {
      accountId: 41,
      platformId: 2,
      mediaCategoryId: 2,
      subCategoryIds: [3],
      displayName: "Original account",
      websiteUrl: "https://example.com",
    },
  ]);
  const resultFormData = JSON.parse(result.formData || "{}");

  assert.equal(resultFormData.formValues.socialMediaAccounts[0].accountId, 40);
});

test("preserves canonical identifiers for an edited draft through its stable item id", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  parsed.modifyOriginalFormValues = {
    socialMediaAccounts: originalItems,
  };
  parsed.formValues.socialMediaAccounts = [
    { ...originalItems[0], accountName: "Edited account" },
  ];
  step.formData = JSON.stringify(parsed);

  const [result] = applySocialMediaCanonicalAccountContext([step], [
    {
      accountId: 9,
      platformId: 1,
      mediaCategoryId: 2,
      subCategoryIds: [4],
      displayName: "Original account",
      websiteUrl: "https://example.com",
    },
  ]);
  const resultFormData = JSON.parse(result.formData || "{}");

  assert.equal(
    resultFormData.formValues.socialMediaAccounts[0].accountId,
    9,
  );
  assert.equal(
    resultFormData.modifyOriginalFormValues.socialMediaAccounts[0].accountId,
    9,
  );
});

test("does not guess canonical identifiers for ambiguous matches", () => {
  const canonicalAccount = {
    accountId: 9,
    platformId: 1,
    mediaCategoryId: 2,
    subCategoryIds: [4],
    displayName: "Original account",
    websiteUrl: "https://example.com",
  };
  const [result] = applySocialMediaCanonicalAccountContext(
    [createStep()],
    [canonicalAccount, { ...canonicalAccount, accountId: 10 }],
  );
  const parsed = JSON.parse(result.formData || "{}");

  assert.equal(parsed.formValues.socialMediaAccounts[0].accountId, undefined);
  assert.equal(parsed.formValues.socialMediaAccounts.length, 1);
});

test("does not restore a stale identifier through a stable item id", () => {
  const step = createStep();
  const parsed = JSON.parse(step.formData || "{}");
  const staleOriginal = {
    ...originalItems[0],
    accountId: 8,
    platformId: 1,
    mediaCategoryId: 2,
    subCategoryIds: [4],
  };
  parsed.modifyOriginalFormValues = {
    socialMediaAccounts: [staleOriginal],
  };
  parsed.formValues.socialMediaAccounts = [
    {
      ...originalItems[0],
      accountName: "Edited account",
    },
  ];
  step.formData = JSON.stringify(parsed);
  const canonicalAccount = {
    accountId: 9,
    platformId: 1,
    mediaCategoryId: 2,
    subCategoryIds: [4],
    displayName: "Original account",
    websiteUrl: "https://example.com",
  };

  const [result] = applySocialMediaCanonicalAccountContext(
    [step],
    [canonicalAccount, { ...canonicalAccount, accountId: 10 }],
  );
  const resultFormData = JSON.parse(result.formData || "{}");

  assert.equal(
    resultFormData.formValues.socialMediaAccounts[0].accountId,
    undefined,
  );
  assert.equal(resultFormData.formValues.socialMediaAccounts.length, 1);
});

test("does not match canonical identifiers when the URL path casing differs", () => {
  const step = createStep();
  const stepData = JSON.parse(step.formData || "{}");
  stepData.formValues.socialMediaAccounts[0].accountUrl =
    "https://example.com/brand";
  step.formData = JSON.stringify(stepData);

  const [result] = applySocialMediaCanonicalAccountContext([step], [
    {
      accountId: 9,
      platformId: 1,
      mediaCategoryId: 2,
      subCategoryIds: [4],
      displayName: "Original account",
      websiteUrl: "https://example.com/Brand",
    },
  ]);
  const parsed = JSON.parse(result.formData || "{}");

  assert.equal(parsed.formValues.socialMediaAccounts[0].accountId, undefined);
});

test("preserves empty artist option state for services without that lookup", () => {
  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );

  assert.match(
    mediaLicenseSource,
    /setArtistWorkTypeOptions\(\(currentOptions\) =>\s*currentOptions\.length === 0 \? currentOptions : \[\],?\s*\);/,
    "unrelated services must not recreate Formily component registrations with a new empty options array",
  );
});
