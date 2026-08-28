import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildModifyLanguageSnapshots,
  buildModifyChangeSummary,
  filterModifyChangeSummaryForDisplay,
  formatModifyChangeValue,
  MODIFY_CHANGE_SUMMARY_SERVICE_CODES,
  resolveSubmittedModifyLanguageSnapshots,
  resolveSubmittedModifyChangeSummary,
  type ModifyFormStep,
} from "../src/pages/MediaLicense/modifyChangeSummary.ts";
import { ensureDataListRowIds } from "../src/components/designable/src/components/DataList/dataListRules.ts";
import {
  attachModifyReviewMetadata,
  clearModifyReviewMetadata,
} from "../src/pages/MediaLicense/modifyOriginalFormValues.ts";
import { stripSubmissionOnlyFormFields } from "../src/pages/MediaLicense/submissionFormFields.ts";

const createStep = (
  stepNameEn: string,
  properties: Record<string, unknown>,
  formValues: Record<string, unknown>,
): ModifyFormStep => ({
  stepNameEn,
  stepNameAr: `${stepNameEn} AR`,
  formData: JSON.stringify({
    schema: { type: "object", properties },
    formValues,
  }),
});

test("removes internal DataList row ids from submitted form values", () => {
  assert.deepEqual(
    stripSubmissionOnlyFormFields({
      dataList: [
        {
          __rowId: "pos:0",
          languageId: 2,
          language: "English",
          suggested_name: "English name",
        },
        {
          __rowId: "new:abc-1",
          languageId: 1,
          language: "Arabic",
          suggested_name: "Arabic name",
        },
      ],
    }),
    {
      dataList: [
        {
          languageId: 2,
          language: "English",
          suggested_name: "English name",
        },
        {
          languageId: 1,
          language: "Arabic",
          suggested_name: "Arabic name",
        },
      ],
    },
  );
});

test("reports only modified scalar fields with their schema labels", () => {
  const properties = {
    Email: {
      type: "string",
      title: "E-mail",
      "x-component": "Input",
      "x-component-props": { titleEn: "E-mail", titleAr: "البريد الإلكتروني" },
    },
    PhoneNumber: {
      type: "string",
      title: "Mobile Number",
      "x-component": "Input",
      "x-component-props": { titleEn: "Mobile Number", titleAr: "رقم الهاتف" },
    },
  };
  const before = [
    createStep("Chief Editor Information", properties, {
      Email: "old@example.com",
      PhoneNumber: "971500000001",
    }),
  ];
  const after = [
    createStep("Chief Editor Information", properties, {
      Email: "new@example.com",
      PhoneNumber: "971500000001",
    }),
  ];

  const result = buildModifyChangeSummary({ before, after });

  assert.equal(result.length, 1);
  assert.equal(result[0].sectionNameEn, "Chief Editor Information");
  assert.deepEqual(result[0].changes, [
    {
      kind: "field",
      component: "Input",
      changeType: "MODIFIED",
      fieldKey: "Email",
      labelEn: "E-mail",
      labelAr: "البريد الإلكتروني",
      beforeValue: "old@example.com",
      afterValue: "new@example.com",
    },
  ]);
});

test("reports a language replacement as a modified row", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        titleEn: "Language & Name List",
        titleAr: "قائمة اللغات والأسماء",
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Old name" },
        { languageId: 1, language: "Arabic", suggested_name: "Arabic name" },
      ],
    }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "New name" },
        { languageId: 3, language: "French", suggested_name: "French name" },
      ],
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(
    section.changes.map((change) => ({
      changeType: change.changeType,
      beforeValue: change.beforeValue,
      afterValue: change.afterValue,
    })),
    [
      {
        changeType: "MODIFIED",
        beforeValue: {
          languageId: 2,
          language: "English",
          suggested_name: "Old name",
        },
        afterValue: {
          languageId: 2,
          language: "English",
          suggested_name: "New name",
        },
      },
      {
        changeType: "MODIFIED",
        beforeValue: {
          languageId: 1,
          language: "Arabic",
          suggested_name: "Arabic name",
        },
        afterValue: {
          languageId: 3,
          language: "French",
          suggested_name: "French name",
        },
      },
    ],
  );
});

test("reports delete-then-add as DELETED + ADDED, not MODIFIED, via row ids", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        titleEn: "Language & Name List",
        titleAr: "Language & Name List AR",
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  // Server snapshot: no row ids yet, DataList seeds them as pos:<index>.
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "English name" },
        { languageId: 1, language: "Arabic", suggested_name: "Arabic name" },
      ],
    }),
  ];
  // User deleted the English row and added a brand new row that happens to
  // reuse the same language AND the same name. Without row ids this looked
  // like an in-place edit; the new row carries a fresh `new:` id instead.
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        {
          __rowId: "pos:1",
          languageId: 1,
          language: "Arabic",
          suggested_name: "Arabic name",
        },
        {
          __rowId: "new:abc-1",
          languageId: 2,
          language: "English",
          suggested_name: "English name",
        },
      ],
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(
    section.changes.map((change) => ({
      changeType: change.changeType,
      beforeValue: change.beforeValue,
      afterValue: change.afterValue,
    })),
    [
      {
        changeType: "DELETED",
        beforeValue: {
          languageId: 2,
          language: "English",
          suggested_name: "English name",
        },
        afterValue: null,
      },
      {
        changeType: "ADDED",
        beforeValue: null,
        afterValue: {
          languageId: 2,
          language: "English",
          suggested_name: "English name",
        },
      },
    ],
  );
});

test("row ids keep an in-place language edit reported as a single MODIFIED row", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Old name" },
      ],
    }),
  ];
  // Both fields changed at once, and the row keeps its seeded identity.
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        {
          __rowId: "pos:0",
          languageId: 3,
          language: "French",
          suggested_name: "New name",
        },
      ],
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(
    section.changes.map((change) => ({
      changeType: change.changeType,
      beforeValue: change.beforeValue,
      afterValue: change.afterValue,
    })),
    [
      {
        changeType: "MODIFIED",
        beforeValue: {
          languageId: 2,
          language: "English",
          suggested_name: "Old name",
        },
        afterValue: {
          languageId: 3,
          language: "French",
          suggested_name: "New name",
        },
      },
    ],
  );
});

test("keeps original language identities after a draft is sanitized and reopened", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "English name" },
        { languageId: 1, language: "Arabic", suggested_name: "Arabic name" },
      ],
    }),
  ];
  const draftRows = [
    {
      __rowId: "pos:1",
      languageId: 1,
      language: "Arabic",
      suggested_name: "Arabic name",
    },
  ];
  const sanitizedRows = stripSubmissionOnlyFormFields(draftRows, {
    preserveDataListRowIds: true,
  }) as Array<Record<string, unknown>>;
  const reopenedRows = ensureDataListRowIds(
    sanitizedRows,
    "languages_name_list",
  );
  const after = [
    createStep("Languages & Names", properties, {
      dataList: reopenedRows,
    }),
  ];

  assert.deepEqual(
    buildModifyChangeSummary({ before, after })[0].changes.map((change) => ({
      changeType: change.changeType,
      beforeLanguage: (change.beforeValue as { language?: string } | null)
        ?.language ?? null,
      afterLanguage: (change.afterValue as { language?: string } | null)
        ?.language ?? null,
    })),
    [
      {
        changeType: "DELETED",
        beforeLanguage: "English",
        afterLanguage: null,
      },
    ],
  );
});

test("keeps language additions and deletions distinct when list size changes", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const english = {
    languageId: 2,
    language: "English",
    suggested_name: "English name",
  };
  const arabic = {
    languageId: 1,
    language: "Arabic",
    suggested_name: "Arabic name",
  };
  const before = [
    createStep("Languages & Names", properties, { dataList: [english] }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [english, arabic],
    }),
  ];

  assert.deepEqual(
    buildModifyChangeSummary({ before, after })[0].changes.map(
      (change) => change.changeType,
    ),
    ["ADDED"],
  );
  assert.deepEqual(
    buildModifyChangeSummary({ before: after, after: before })[0].changes.map(
      (change) => change.changeType,
    ),
    ["DELETED"],
  );
});

test("reports multiple same-position language replacements as modified rows", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "One" },
        { languageId: 1, language: "Arabic", suggested_name: "Two" },
      ],
    }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 3, language: "French", suggested_name: "Three" },
        { languageId: 4, language: "Spanish", suggested_name: "Four" },
      ],
    }),
  ];

  assert.deepEqual(
    buildModifyChangeSummary({ before, after })[0].changes.map((change) => ({
      changeType: change.changeType,
      beforeLanguage: (change.beforeValue as { language: string }).language,
      afterLanguage: (change.afterValue as { language: string }).language,
    })),
    [
      {
        changeType: "MODIFIED",
        beforeLanguage: "English",
        afterLanguage: "French",
      },
      {
        changeType: "MODIFIED",
        beforeLanguage: "Arabic",
        afterLanguage: "Spanish",
      },
    ],
  );
});

test("does not invent a legacy modification when the list length changes", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 1, language: "Arabic", suggested_name: "Alpha" },
        { languageId: 2, language: "English", suggested_name: "Beta" },
      ],
    }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 3, language: "French", suggested_name: "Beta" },
      ],
    }),
  ];

  assert.deepEqual(
    buildModifyChangeSummary({ before, after })[0].changes.map((change) => ({
      changeType: change.changeType,
      beforeLanguage: (change.beforeValue as { language?: string } | null)
        ?.language ?? null,
      afterLanguage: (change.afterValue as { language?: string } | null)
        ?.language ?? null,
    })),
    [
      {
        changeType: "DELETED",
        beforeLanguage: "Arabic",
        afterLanguage: null,
      },
      {
        changeType: "DELETED",
        beforeLanguage: "English",
        afterLanguage: null,
      },
      {
        changeType: "ADDED",
        beforeLanguage: null,
        afterLanguage: "French",
      },
    ],
  );
});

test("keeps a same-name row pairing stable when only the name changes", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 1, language: "Arabic", suggested_name: "Same" },
        { languageId: 2, language: "English", suggested_name: "Same" },
      ],
    }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 1, language: "Arabic", suggested_name: "Same" },
        { languageId: 2, language: "English", suggested_name: "Renamed" },
      ],
    }),
  ];

  assert.deepEqual(
    buildModifyChangeSummary({ before, after })[0].changes.map((change) => ({
      changeType: change.changeType,
      beforeName: (change.beforeValue as { suggested_name?: string } | null)
        ?.suggested_name ?? null,
      afterName: (change.afterValue as { suggested_name?: string } | null)
        ?.suggested_name ?? null,
    })),
    [
      {
        changeType: "MODIFIED",
        beforeName: "Same",
        afterName: "Renamed",
      },
    ],
  );
});

test("uses the supplied profile snapshot for ProfileForm comparisons", () => {
  const properties = {
    ProfileForm: {
      "x-component": "ProfileForm",
      "x-component-props": {
        titleEn: "Establishment Information",
        titleAr: "معلومات المنشأة",
      },
    },
  };
  const before = [createStep("Establishment Information", properties, {})];
  const after = [
    createStep("Establishment Information", properties, {
      ProfileForm: {
        establishmentNameEnglish: "New Establishment",
        workEmail: "same@example.com",
      },
    }),
  ];

  const [section] = buildModifyChangeSummary({
    before,
    after,
    profileBefore: {
      establishmentNameEnglish: "Old Establishment",
      workEmail: "same@example.com",
    },
  });

  assert.deepEqual(section.changes, [
    {
      kind: "field",
      component: "ProfileForm",
      changeType: "MODIFIED",
      fieldKey: "establishmentNameEnglish",
      labelEn: "Establishment Name in English",
      labelAr: "اسم المنشأة باللغة الإنجليزية",
      beforeValue: "Old Establishment",
      afterValue: "New Establishment",
    },
  ]);
});

test("keeps an embedded ProfileForm draft snapshot immutable", () => {
  const properties = {
    ProfileForm: { "x-component": "ProfileForm" },
  };
  const embeddedProfile = {
    establishmentNameEnglish: "Saved original",
  };

  const result = buildModifyChangeSummary({
    before: [
      createStep("Establishment Information", properties, {
        ProfileForm: embeddedProfile,
      }),
    ],
    after: [
      createStep("Establishment Information", properties, {
        ProfileForm: embeddedProfile,
      }),
    ],
    profileBefore: {
      establishmentNameEnglish: "Changed live profile",
    },
  });

  assert.deepEqual(result, []);
});

test("does not report inactive or empty ProfileForm branch values as changes", () => {
  const properties = {
    ProfileForm: { "x-component": "ProfileForm" },
  };
  const afterProfile = {
    hasTradeLicense: true,
    commercialLicenseNumber: "CN-123",
    reserveTradeNumber: undefined,
  };

  const result = buildModifyChangeSummary({
    before: [createStep("Establishment Information", properties, {})],
    after: [
      createStep("Establishment Information", properties, {
        ProfileForm: afterProfile,
      }),
    ],
    profileBefore: {
      ...afterProfile,
      reserveTradeNumber: "",
      reserveTradeName: "",
    },
  });

  assert.deepEqual(result, []);
});

test("does not report equivalent ProfileForm mobile number storage as changes", () => {
  const properties = {
    ProfileForm: { "x-component": "ProfileForm" },
  };
  const result = buildModifyChangeSummary({
    before: [createStep("Establishment Information", properties, {})],
    after: [
      createStep("Establishment Information", properties, {
        ProfileForm: {
          phoneNumber: "+971501234567",
          phoneNumberCountryCode: "+971",
          phoneNumberLocalNumber: "501234567",
        },
      }),
    ],
    profileBefore: {
      phoneNumber: "+971501234567",
      phoneNumberCountryCode: null,
      phoneNumberLocalNumber: null,
    },
  });

  assert.deepEqual(result, []);
});

test("reports a ProfileForm mobile number edit as one canonical change", () => {
  const properties = {
    ProfileForm: { "x-component": "ProfileForm" },
  };
  const [section] = buildModifyChangeSummary({
    before: [createStep("Establishment Information", properties, {})],
    after: [
      createStep("Establishment Information", properties, {
        ProfileForm: {
          phoneNumber: "+971501234567",
          phoneNumberCountryCode: "+44",
          phoneNumberLocalNumber: "7700900123",
        },
      }),
    ],
    profileBefore: {
      phoneNumber: "+971501234567",
      phoneNumberCountryCode: null,
      phoneNumberLocalNumber: null,
    },
  });

  assert.deepEqual(section.changes, [
    {
      kind: "field",
      component: "ProfileForm",
      changeType: "MODIFIED",
      fieldKey: "phoneNumber",
      labelEn: "Phone Number",
      labelAr: "رقم الهاتف",
      beforeValue: "+971501234567",
      afterValue: "+447700900123",
    },
  ]);
});

test("preserves canonical mobile numbers when split storage cannot be combined", () => {
  const profileProperties = {
    ProfileForm: { "x-component": "ProfileForm" },
  };
  const profileResult = buildModifyChangeSummary({
    before: [createStep("Establishment Information", profileProperties, {})],
    after: [
      createStep("Establishment Information", profileProperties, {
        ProfileForm: {
          phoneNumber: "+971501234567",
          phoneNumberCountryCode: "+",
          phoneNumberLocalNumber: "invalid",
        },
      }),
    ],
    profileBefore: {
      phoneNumber: "+971501234567",
    },
  });

  const idSelectorProperties = {
    idSelector: { "x-component": "IDSelector" },
  };
  const idSelectorResult = buildModifyChangeSummary({
    before: [
      createStep("Chief Editor Information", idSelectorProperties, {
        idSelector: {
          mobileNo: "+971501234567",
        },
      }),
    ],
    after: [
      createStep("Chief Editor Information", idSelectorProperties, {
        idSelector: {
          mobileNo: "+971501234567",
          mobileNoCountryCode: "+44",
          mobileNoLocalNumber: "",
        },
      }),
    ],
  });

  assert.deepEqual(profileResult, []);
  assert.deepEqual(idSelectorResult, []);
});

test("matches schema keys to uniquely normalized form-value keys", () => {
  const properties = {
    card: {
      type: "void",
      "x-component": "Card",
      properties: {
        "Work Phone": {
          type: "string",
          "x-component": "Input",
          "x-component-props": { titleEn: "Work Phone" },
        },
        "Qualification  Copy": {
          type: "string",
          "x-component": "Upload",
          "x-component-props": { titleEn: "Qualification Copy" },
        },
        "Years of Experience": {
          type: "string",
          "x-component": "Input",
          "x-component-props": { titleEn: "Years of Experience" },
        },
      },
    },
  };
  const before = [
    createStep("Chief Editor Information", properties, {
      WorkPhone: "971500000001",
      QualificationCopy: "old.pdf",
      YearsofExperience: "5",
    }),
  ];
  const after = [
    createStep("Chief Editor Information", properties, {
      WorkPhone: "971500000002",
      QualificationCopy: "new.pdf",
      YearsofExperience: "6",
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(
    section.changes.map((change) => [change.fieldKey, change.beforeValue, change.afterValue]),
    [
      ["Work Phone", "971500000001", "971500000002"],
      ["Qualification  Copy", "old.pdf", "new.pdf"],
      ["Years of Experience", "5", "6"],
    ],
  );
});

test("reports social media account operations without exposing operation metadata", () => {
  const properties = {
    socialMediaAccounts: {
      type: "array",
      "x-component": "SocialMediaAccount",
      "x-component-props": {
        titleEn: "Social Media Accounts",
        titleAr: "حسابات التواصل الاجتماعي",
      },
    },
  };
  const originalFirst = {
    id: "account-1",
    accountTitle: "Original account",
    accountUrl: "https://example.com/original",
  };
  const originalSecond = {
    id: "account-2",
    accountTitle: "Deleted account",
    accountUrl: "https://example.com/deleted",
  };
  const added = {
    id: "account-3",
    accountTitle: "Added account",
    accountUrl: "https://example.com/added",
  };
  const before = [
    createStep("Social Media Accounts", properties, {
      socialMediaAccounts: [originalFirst, originalSecond],
    }),
  ];
  const after = [
    createStep("Social Media Accounts", properties, {
      socialMediaAccounts: [
        {
          ...originalFirst,
          accountTitle: "Updated account",
          operation: "MODIFY",
        },
        { ...originalSecond, operation: "DELETE" },
        { ...added, operation: "ADD" },
      ],
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(
    section.changes.map((change) => ({
      component: change.component,
      changeType: change.changeType,
      beforeValue: change.beforeValue,
      afterValue: change.afterValue,
    })),
    [
      {
        component: "SocialMediaAccount",
        changeType: "MODIFIED",
        beforeValue: originalFirst,
        afterValue: {
          ...originalFirst,
          accountTitle: "Updated account",
        },
      },
      {
        component: "SocialMediaAccount",
        changeType: "DELETED",
        beforeValue: originalSecond,
        afterValue: null,
      },
      {
        component: "SocialMediaAccount",
        changeType: "ADDED",
        beforeValue: null,
        afterValue: added,
      },
    ],
  );
});

test("renders social account changes as explicit Figma before and after cards", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );

  assert.match(
    componentSource,
    /<SocialChangeCards\s+section=\{section\}\s+serviceCode=\{serviceCode\}/,
  );
  assert.match(
    componentSource,
    /change\.component === "SocialMediaAccount"/,
  );
  assert.match(componentSource, /change\.beforeValue/);
  assert.match(componentSource, /change\.afterValue/);
  assert.match(componentSource, /modify-change-summary__social-comparison/);
  assert.match(componentSource, /modify-change-summary__social-placeholder/);
  assert.match(componentSource, /const beforeAccounts = socialChanges\.map/);
  assert.match(componentSource, /const afterAccounts = socialChanges\.map/);
  assert.match(componentSource, /isRecord\(change\.beforeValue\)/);
  assert.match(componentSource, /isRecord\(change\.afterValue\)/);
  assert.match(componentSource, /mediaLicensePage\.beforeChange/);
  assert.match(componentSource, /mediaLicensePage\.afterChange/);
  assert.match(componentSource, /mediaLicensePage\.sectionChanges/);
  assert.match(
    componentSource,
    /hasSocialChanges \? \(\s*<SocialChangeCards\s+section=\{section\}\s+serviceCode=\{serviceCode\}/,
  );
});

test("uses the current application service code for detail lookup labels", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );
  const detailSource = readFileSync("src/pages/Detail/index.tsx", "utf8");

  assert.match(componentSource, /serviceCode\?: string \| number \| null/);
  assert.match(componentSource, /serviceCodeProp \?\? storedServiceCode/);
  assert.match(
    detailSource,
    /<ModifyChangeSummary[\s\S]*?serviceCode=\{detailFormServiceCode\}/,
  );
});

test("uses the standard full-width review section header for Changes Summary", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );

  assert.match(componentSource, /ReviewProfileInfoCommon/);
  assert.match(componentSource, /useState\(true\)/);
  assert.match(componentSource, /<ReviewProfileInfoCommon/);
  assert.doesNotMatch(componentSource, /<details\b/);
  assert.doesNotMatch(componentSource, /<summary\b/);
});

test("keeps Modified social account badges on the shared warning palette", () => {
  const stylesSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.less",
    "utf8",
  );

  assert.match(
    stylesSource,
    /\.modify-change-summary__social-status--modified\s*\{\s*color:\s*#f29f0e;\s*background:\s*#fffbeb;/,
  );
});

test("shows social account title tooltips only through the overflow-aware wrapper", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );
  const stylesSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.less",
    "utf8",
  );
  const overflowTooltipSource = readFileSync(
    "src/components/common/OverflowTooltip/index.tsx",
    "utf8",
  );

  assert.match(componentSource, /import OverflowTooltip from "@\/components\/common\/OverflowTooltip"/);
  assert.match(
    componentSource,
    /<OverflowTooltip[\s\S]*?className="modify-change-summary__social-name"[\s\S]*?title=\{displayAccountName\}/,
  );
  assert.match(
    stylesSource,
    /\.modify-change-summary__social-name\s*\{[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
  );
  assert.match(
    overflowTooltipSource,
    /scrollWidth\s*>\s*(?:content\.)?clientWidth/,
  );
  assert.match(
    overflowTooltipSource,
    /scrollHeight\s*>\s*(?:content\.)?clientHeight/,
  );
  assert.doesNotMatch(
    overflowTooltipSource,
    /scroll(?:Width|Height)\s*>\s*(?:content\.)?client(?:Width|Height)\s*\+\s*1/,
  );
  assert.match(overflowTooltipSource, /document\.fonts\.ready/);
});

test("truncates language table values with overflow-aware tooltips", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );
  const stylesSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.less",
    "utf8",
  );

  assert.match(
    componentSource,
    /const LanguageTableValue[\s\S]*?<OverflowTooltip[\s\S]*?className="modify-change-summary__table-cell"[\s\S]*?title=\{displayValue\}/,
  );
  assert.match(
    componentSource,
    /const LanguageTableValue[\s\S]*?align=\{\{ offset: \[0, 8\] \}\}/,
  );
  assert.match(componentSource, /<LanguageTableValue value=\{row\.language\}/);
  assert.match(componentSource, /<LanguageTableValue value=\{row\.name\}/);
  assert.match(
    stylesSource,
    /\.modify-change-summary__table-cell\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
  );
  assert.match(
    componentSource,
    /const SummaryCardTitle[\s\S]*?<OverflowTooltip[\s\S]*?as="h3"[\s\S]*?className="modify-change-summary__card-title"[\s\S]*?title=\{title\}/,
  );
  assert.match(
    stylesSource,
    /\.modify-change-summary__card-title\s*\{[\s\S]*?flex:\s*1;[\s\S]*?min-width:\s*0;/,
  );
});

test("limits the Changes Summary to the five approved Modify services", () => {
  assert.deepEqual(
    Array.from(MODIFY_CHANGE_SUMMARY_SERVICE_CODES),
    ["803", "903", "1203", "80011", "80012"],
  );
});

test("renders language changes as Figma before and after cards", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );

  assert.match(componentSource, /const LanguageChangeCards/);
  assert.match(componentSource, /modify-change-summary__language-section/);
  assert.match(componentSource, /mediaLicensePage\.language/);
  assert.match(componentSource, /mediaLicensePage\.name/);
  assert.match(componentSource, /mediaLicensePage\.beforeChange/);
  assert.match(componentSource, /mediaLicensePage\.afterChange/);
  assert.doesNotMatch(componentSource, /mediaLicensePage\.modifiedSections/);
  assert.match(componentSource, /const isArabic = Boolean\(i18n\.language/);
  assert.match(componentSource, /snapshot\.beforeRows/);
  assert.match(componentSource, /snapshot\.afterRows/);
});

test("renders complete language snapshots with change types", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );
  const englishMessages = readFileSync(
    "src/localization/mediaLicense/en.json",
    "utf8",
  );
  const arabicMessages = readFileSync(
    "src/localization/mediaLicense/ar.json",
    "utf8",
  );

  assert.match(
    componentSource,
    /languageSnapshots\?: ModifyLanguageSnapshot\[\]/,
  );
  assert.match(
    componentSource,
    /const rows = side === "before"\s*\?\s*snapshot\.beforeRows\s*:\s*\[\.\.\.snapshot\.afterRows,\s*\.\.\.snapshot\.deletedRows\]/,
  );
  assert.match(componentSource, /mediaLicensePage\.changeTypeLabel/);
  assert.match(componentSource, /snapshot\.deletedRows/);
  assert.match(
    componentSource,
    /mediaLicensePage\.noPreviousLanguageRecord/,
  );
  assert.match(englishMessages, /"noPreviousLanguageRecord"/);
  assert.match(arabicMessages, /"noPreviousLanguageRecord"/);
});

test("builds complete ordered language snapshots for additions", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        titleEn: "Language & Name List",
        titleAr: "قائمة اللغات والأسماء",
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Suggested" },
      ],
    }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Suggested" },
        { languageId: 1, language: "Arabic", suggested_name: "Hello" },
      ],
    }),
  ];

  assert.deepEqual(buildModifyLanguageSnapshots({ before, after }), [
    {
      sectionNameEn: "Languages & Names",
      sectionNameAr: "Languages & Names AR",
      fieldKey: "dataList",
      beforeRows: [
        { key: "id:2", language: "English", name: "Suggested" },
      ],
      afterRows: [
        { key: "id:2", language: "English", name: "Suggested" },
        {
          key: "id:1",
          language: "Arabic",
          name: "Hello",
          changeType: "ADDED",
        },
      ],
      deletedRows: [],
    },
  ]);
});

test("preserves added, modified, and deleted types in row-id language snapshots", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 6, language: "Akan", suggested_name: "Suggested" },
        { languageId: 2, language: "English", suggested_name: "Old name" },
        { languageId: 1, language: "Arabic", suggested_name: "Remove me" },
      ],
    }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        {
          __rowId: "pos:0",
          languageId: 6,
          language: "Akan",
          suggested_name: "Suggested",
        },
        {
          __rowId: "pos:1",
          languageId: 3,
          language: "French",
          suggested_name: "New name",
        },
        {
          __rowId: "new:abc-1",
          languageId: 2,
          language: "English",
          suggested_name: "Hello",
        },
      ],
    }),
  ];

  assert.deepEqual(buildModifyLanguageSnapshots({ before, after }), [
    {
      sectionNameEn: "Languages & Names",
      sectionNameAr: "Languages & Names AR",
      fieldKey: "dataList",
      beforeRows: [
        { key: "id:6", language: "Akan", name: "Suggested" },
        { key: "id:2", language: "English", name: "Old name" },
        { key: "id:1", language: "Arabic", name: "Remove me" },
      ],
      afterRows: [
        { key: "row:pos:0", language: "Akan", name: "Suggested" },
        {
          key: "row:pos:1",
          language: "French",
          name: "New name",
          changeType: "MODIFIED",
        },
        {
          key: "row:new:abc-1",
          language: "English",
          name: "Hello",
          changeType: "ADDED",
        },
      ],
      deletedRows: [
        {
          key: "deleted:id:1",
          language: "Arabic",
          name: "Remove me",
          changeType: "DELETED",
        },
      ],
    },
  ]);
});

test("normalizes live review section names for snapshot matching", () => {
  const properties = {
    dataList: {
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep(" Languages & Names ", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Suggested" },
      ],
    }),
  ];
  const after = [
    createStep(" Languages & Names ", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Suggested" },
        { languageId: 1, language: "Arabic", suggested_name: "Hello" },
      ],
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });
  const [snapshot] = buildModifyLanguageSnapshots({ before, after });

  assert.equal(section.sectionNameEn, snapshot.sectionNameEn);
  assert.equal(section.sectionNameAr, snapshot.sectionNameAr);
});

test("keeps deleted language rows available for the Change Type column", () => {
  const properties = {
    dataList: {
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Suggested" },
        { languageId: 1, language: "Arabic", suggested_name: "Hello" },
      ],
    }),
  ];
  const after = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Suggested" },
      ],
    }),
  ];

  const [snapshot] = buildModifyLanguageSnapshots({ before, after });

  assert.deepEqual(snapshot.deletedRows, [
    {
      key: "deleted:id:1",
      language: "Arabic",
      name: "Hello",
      changeType: "DELETED",
    },
  ]);
});

test("does not build a language snapshot when the final list is unchanged", () => {
  const properties = {
    dataList: {
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const values = {
    dataList: [
      { languageId: 2, language: "English", suggested_name: "Suggested" },
    ],
  };

  assert.deepEqual(
    buildModifyLanguageSnapshots({
      before: [createStep("Languages & Names", properties, values)],
      after: [createStep("Languages & Names", properties, values)],
    }),
    [],
  );
});

test("restores complete submitted language snapshots from embedded form values", () => {
  const submittedStep: ModifyFormStep = {
    stepNameEn: "Languages & Names ",
    stepNameAr: "اللغات والأسماء",
    formData: JSON.stringify({
      schema: {
        properties: {
          dataList: {
            "x-component": "DataList",
            "x-component-props": {
              fieldSource: { dataSource: "languages_name_list" },
            },
          },
        },
      },
      modifyOriginalFormValues: {
        dataList: [
          { languageId: 2, language: "English", suggested_name: "Suggested" },
        ],
      },
      formValues: {
        dataList: [
          { languageId: 2, language: "English", suggested_name: "Suggested" },
          { languageId: 1, language: "Arabic", suggested_name: "Hello" },
        ],
      },
      modifyChangeSet: {
        sectionNameEn: "Languages & Names",
        sectionNameAr: "اللغات والأسماء",
        changes: [],
      },
    }),
  };

  assert.deepEqual(resolveSubmittedModifyLanguageSnapshots([submittedStep]), [
    {
      sectionNameEn: "Languages & Names",
      sectionNameAr: "اللغات والأسماء",
      fieldKey: "dataList",
      beforeRows: [
        { key: "id:2", language: "English", name: "Suggested" },
      ],
      afterRows: [
        { key: "id:2", language: "English", name: "Suggested" },
        {
          key: "id:1",
          language: "Arabic",
          name: "Hello",
          changeType: "ADDED",
        },
      ],
      deletedRows: [],
    },
  ]);
  assert.deepEqual(resolveSubmittedModifyChangeSummary([submittedStep]), []);

  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );
  const detailSource = readFileSync("src/pages/Detail/index.tsx", "utf8");
  assert.match(
    componentSource,
    /displaySections\.length === 0 && languageSnapshots\.length === 0/,
  );
  assert.match(componentSource, /orphanLanguageSnapshots\.map/);
  assert.match(
    detailSource,
    /detailModifyChangeSections\.length > 0 \|\|\s*detailModifyLanguageSnapshots\.length > 0/,
  );
});

test("restores submitted delete-then-add snapshots from the persisted change set", () => {
  const properties = {
    dataList: {
      type: "array",
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const before = [
    createStep("Languages & Names", properties, {
      dataList: [
        { languageId: 2, language: "English", suggested_name: "Same name" },
        { languageId: 1, language: "Arabic", suggested_name: "Arabic name" },
      ],
    }),
  ];
  const current = [
    createStep("Languages & Names", properties, {
      dataList: [
        {
          __rowId: "pos:1",
          languageId: 1,
          language: "Arabic",
          suggested_name: "Arabic name",
        },
        {
          __rowId: "new:replacement",
          languageId: 2,
          language: "English",
          suggested_name: "Same name",
        },
      ],
    }),
  ];
  const [stepWithMetadata] = attachModifyReviewMetadata(current, before);
  const parsed = JSON.parse(stepWithMetadata.formData ?? "{}");
  const submittedStep = {
    ...stepWithMetadata,
    formData: JSON.stringify(stripSubmissionOnlyFormFields(parsed)),
  };

  assert.deepEqual(resolveSubmittedModifyLanguageSnapshots([submittedStep]), [
    {
      sectionNameEn: "Languages & Names",
      sectionNameAr: "Languages & Names AR",
      fieldKey: "dataList",
      beforeRows: [
        { key: "id:2", language: "English", name: "Same name" },
        { key: "id:1", language: "Arabic", name: "Arabic name" },
      ],
      afterRows: [
        { key: "id:1", language: "Arabic", name: "Arabic name" },
        {
          key: "id:2",
          language: "English",
          name: "Same name",
          changeType: "ADDED",
        },
      ],
      deletedRows: [
        {
          key: "deleted:id:2",
          language: "English",
          name: "Same name",
          changeType: "DELETED",
        },
      ],
    },
  ]);
});

test("keeps legacy submitted language summaries on the delta fallback", () => {
  const legacyStep: ModifyFormStep = {
    stepNameEn: "Languages & Names",
    formData: JSON.stringify({
      modifyChangeSet: {
        sectionNameEn: "Languages & Names",
        sectionNameAr: "Languages & Names",
        changes: [
          {
            kind: "list",
            component: "DataList",
            changeType: "ADDED",
            fieldKey: "dataList",
            labelEn: "Language & Name List",
            labelAr: "Language & Name List",
            beforeValue: null,
            afterValue: {
              languageId: 1,
              language: "Arabic",
              suggested_name: "Hello",
            },
          },
        ],
      },
    }),
  };

  assert.deepEqual(resolveSubmittedModifyLanguageSnapshots([legacyStep]), []);
  assert.equal(resolveSubmittedModifyChangeSummary([legacyStep]).length, 1);
});

test("keeps activity changes in the dedicated change type table", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );

  assert.match(componentSource, /const ActivityChangeTable/);
  assert.match(componentSource, /change\.component === "SelectTable"/);
  assert.match(componentSource, /mediaLicensePage\.activity/);
});

test("only treats actual upload values as file previews", () => {
  const componentSource = readFileSync(
    "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    "utf8",
  );

  assert.match(componentSource, /change\.component === "Upload"/);
  assert.match(componentSource, /"commercialLicense"/);
  assert.match(componentSource, /"tenancyContract"/);
  assert.doesNotMatch(componentSource, /\/file\|copy\|document\|license\|contract/);
});

test("reports only changed IDSelector child fields and preserves attachment semantics", () => {
  const properties = {
    idSelector: { "x-component": "IDSelector" },
  };
  const before = [
    createStep("Chief Editor Information", properties, {
      idSelector: {
        type: "passport",
        fullNameEnglish: "Before Name",
        nationality: 19,
        PassportScan: "old.pdf",
        _icpLookupSignature: "old-metadata",
      },
    }),
  ];
  const after = [
    createStep("Chief Editor Information", properties, {
      idSelector: {
        type: "passport",
        fullNameEnglish: "After Name",
        nationality: 19,
        PassportScan: "new.pdf",
        _icpLookupSignature: "new-metadata",
      },
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(section.changes, [
    {
      kind: "field",
      component: "IDSelector",
      changeType: "MODIFIED",
      fieldKey: "idSelector.fullNameEnglish",
      labelEn: "Full Name in English",
      labelAr: "الاسم الكامل بالإنجليزية",
      beforeValue: "Before Name",
      afterValue: "After Name",
    },
    {
      kind: "field",
      component: "Upload",
      changeType: "MODIFIED",
      fieldKey: "idSelector.PassportScan",
      labelEn: "Passport Scan",
      labelAr: "صورة جواز السفر",
      beforeValue: "old.pdf",
      afterValue: "new.pdf",
    },
  ]);
});

test("does not report equivalent IDSelector mobile number storage as changes", () => {
  const properties = {
    idSelector: { "x-component": "IDSelector" },
  };
  const result = buildModifyChangeSummary({
    before: [
      createStep("Chief Editor Information", properties, {
        idSelector: {
          mobileNo: "+971501234567",
          mobileNoCountryCode: null,
          mobileNoLocalNumber: null,
        },
      }),
    ],
    after: [
      createStep("Chief Editor Information", properties, {
        idSelector: {
          mobileNo: "+971501234567",
          mobileNoCountryCode: "+971",
          mobileNoLocalNumber: "501234567",
        },
      }),
    ],
  });

  assert.deepEqual(result, []);
});

test("reports an IDSelector mobile number edit as one canonical change", () => {
  const properties = {
    idSelector: { "x-component": "IDSelector" },
  };
  const [section] = buildModifyChangeSummary({
    before: [
      createStep("Chief Editor Information", properties, {
        idSelector: {
          mobileNo: "+971501234567",
          mobileNoCountryCode: null,
          mobileNoLocalNumber: null,
        },
      }),
    ],
    after: [
      createStep("Chief Editor Information", properties, {
        idSelector: {
          mobileNo: "+971501234567",
          mobileNoCountryCode: "+44",
          mobileNoLocalNumber: "7700900123",
        },
      }),
    ],
  });

  assert.deepEqual(section.changes, [
    {
      kind: "field",
      component: "IDSelector",
      changeType: "MODIFIED",
      fieldKey: "idSelector.mobileNo",
      labelEn: "Mobile No.",
      labelAr: "رقم الهاتف المتحرك",
      beforeValue: "+971501234567",
      afterValue: "+447700900123",
    },
  ]);
});

test("reports only changed AddressPicker child fields in ProfileForm", () => {
  const properties = {
    ProfileForm: { "x-component": "ProfileForm" },
  };
  const beforeAddress = {
    emirateId: 1,
    regionId: 2,
    areaId: 2,
    street: "Old Street",
  };
  const afterAddress = { ...beforeAddress, street: "New Street" };
  const [section] = buildModifyChangeSummary({
    before: [createStep("Establishment", properties, {})],
    after: [
      createStep("Establishment", properties, {
        ProfileForm: { addressPicker: afterAddress },
      }),
    ],
    profileBefore: { addressPicker: beforeAddress },
  });

  assert.deepEqual(section.changes, [
    {
      kind: "field",
      component: "AddressPicker",
      ownerComponent: "ProfileForm",
      changeType: "MODIFIED",
      fieldKey: "addressPicker.street",
      labelEn: "Street",
      labelAr: "الشارع",
      beforeValue: "Old Street",
      afterValue: "New Street",
    },
  ]);
});

test("does not report a lookup-resolved ProfileForm source address as a user change", () => {
  const properties = {
    ProfileForm: { "x-component": "ProfileForm" },
  };
  const resolvedAddress = {
    emirateId: 2,
    areaId: 20,
    street: "Office 302",
  };

  assert.deepEqual(
    buildModifyChangeSummary({
      before: [createStep("Establishment", properties, {})],
      after: [
        createStep("Establishment", properties, {
          ProfileForm: { addressPicker: resolvedAddress },
        }),
      ],
      profileBefore: { addressPicker: resolvedAddress },
    }),
    [],
  );
});

test("keeps remote lookup metadata for changed Select values", () => {
  const properties = {
    EducationalQualification: {
      "x-component": "Select",
      "x-component-props": {
        Source: "Qualifications",
        titleEn: "Educational Qualification",
      },
      enum: [
        { value: "Bachelor", label: "Bachelor" },
        {
          value: "Master",
          labelEn: "Master",
          labelAr: "ماجستير",
        },
      ],
    },
  };
  const [section] = buildModifyChangeSummary({
    before: [
      createStep("Chief Editor Information", properties, {
        EducationalQualification: 3,
      }),
    ],
    after: [
      createStep("Chief Editor Information", properties, {
        EducationalQualification: 4,
      }),
    ],
  });

  assert.deepEqual(section.changes[0].valueSource, {
    type: "lookup",
    source: "Qualifications",
  });
  assert.equal(section.changes[0].valueOptions, undefined);
});

test("keeps matching schema enum labels for changed Select values", () => {
  const properties = {
    EducationalQualification: {
      "x-component": "Select",
      enum: [
        { value: "Bachelor", label: "Bachelor" },
        {
          value: "Master",
          labelEn: "Master",
          labelAr: "ماجستير",
        },
        { value: "PHD", label: "PHD" },
      ],
    },
  };
  const [section] = buildModifyChangeSummary({
    before: [
      createStep("Chief Editor Information", properties, {
        EducationalQualification: "Bachelor",
      }),
    ],
    after: [
      createStep("Chief Editor Information", properties, {
        EducationalQualification: "Master",
      }),
    ],
  });

  assert.deepEqual(section.changes[0].valueOptions, [
    {
      value: "Bachelor",
      labelEn: "Bachelor",
      labelAr: "Bachelor",
    },
    {
      value: "Master",
      labelEn: "Master",
      labelAr: "ماجستير",
    },
  ]);
  assert.equal(section.changes[0].valueSource, undefined);
});

test("marks nested nationality and address IDs with their real lookup sources", () => {
  const properties = {
    idSelector: { "x-component": "IDSelector" },
    addressPicker: { "x-component": "AddressPicker" },
  };
  const [section] = buildModifyChangeSummary({
    before: [
      createStep("Chief Editor Information", properties, {
        idSelector: { nationality: 19 },
        addressPicker: { emirateId: 1, regionId: 2, areaId: 2 },
      }),
    ],
    after: [
      createStep("Chief Editor Information", properties, {
        idSelector: { nationality: 20 },
        addressPicker: { emirateId: 3, regionId: 4, areaId: 5 },
      }),
    ],
  });

  assert.deepEqual(
    section.changes.map((change) => [
      change.fieldKey,
      change.ownerComponent,
      change.valueSource,
    ]),
    [
      ["idSelector.nationality", undefined, { type: "nationality" }],
      ["addressPicker.emirateId", undefined, { type: "emirate" }],
      ["addressPicker.regionId", undefined, { type: "region" }],
      ["addressPicker.areaId", undefined, { type: "area" }],
    ],
  );
});

test("hides service 903 prefilled activity tags while keeping them locked", () => {
  const selectTableSource = readFileSync(
    "src/components/designable/src/components/SelectTable/SelectTableField.tsx",
    "utf8",
  );

  assert.match(selectTableSource, /lockedValues=\{lockedSelectedKey\}/);
  assert.match(
    selectTableSource,
    /hiddenSelectedValues=\{\s*isService903\s*\?\s*resolvedPrefilledSelectedKey/,
  );
});

test("ignores SelectTable lifecycle metadata for a profile-only change", () => {
  const properties = {
    SelectTable: {
      "x-component": "SelectTable",
      "x-component-props": {
        activityLabelNameEn: "Activities",
        activityLabelNameAr: "الأنشطة",
      },
    },
    ProfileForm: {
      "x-component": "ProfileForm",
    },
  };
  const before = [
    createStep("Activity Details", properties, {
      SelectTable: {
        selectedKey: ["1"],
      },
      ProfileForm: {},
    }),
  ];
  const after = [
    createStep("Activity Details", properties, {
      SelectTable: {
        selectedKey: ["1"],
        prefilledSelectedKey: ["1"],
        tableData: [
          {
            Id: "1",
            ActivityEn: "Existing activity",
            ActivityAr: "نشاط قائم",
          },
        ],
      },
      ProfileForm: {
        establishmentNameEnglish: "Updated Establishment",
      },
    }),
  ];

  const [section] = buildModifyChangeSummary({
    before,
    after,
    profileBefore: {
      establishmentNameEnglish: "Original Establishment",
    },
  });

  assert.deepEqual(section.changes, [
    {
      kind: "field",
      component: "ProfileForm",
      changeType: "MODIFIED",
      fieldKey: "establishmentNameEnglish",
      labelEn: "Establishment Name in English",
      labelAr: "اسم المنشأة باللغة الإنجليزية",
      beforeValue: "Original Establishment",
      afterValue: "Updated Establishment",
    },
  ]);
});

test("reports only activities added after the SelectTable prefilled selection", () => {
  const properties = {
    SelectTable: {
      "x-component": "SelectTable",
      "x-component-props": {
        activityLabelNameEn: "Activities",
        activityLabelNameAr: "الأنشطة",
      },
    },
  };
  const before = [
    createStep("Activity Details", properties, {
      SelectTable: { selectedKey: ["1"] },
    }),
  ];
  const addedActivity = {
    Id: "2",
    Activity: "Added activity",
    ActivityEn: "Added activity",
    ActivityAr: "نشاط مضاف",
  };
  const after = [
    createStep("Activity Details", properties, {
      SelectTable: {
        selectedKey: ["1", "2"],
        prefilledSelectedKey: ["1"],
        tableData: [
          {
            Id: "1",
            ActivityEn: "Existing activity",
            ActivityAr: "نشاط قائم",
          },
          addedActivity,
        ],
      },
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(section.changes, [
    {
      kind: "list",
      component: "SelectTable",
      changeType: "ADDED",
      fieldKey: "SelectTable",
      labelEn: "Activities",
      labelAr: "الأنشطة",
      beforeValue: null,
      afterValue: ["Added activity"],
    },
  ]);
});

test("preserves generic SelectTable comparison without lifecycle prefilled data", () => {
  const properties = {
    SelectTable: {
      "x-component": "SelectTable",
    },
  };
  const beforeValue = { selectedKey: ["1"] };
  const afterValue = { selectedKey: ["2"] };
  const before = [
    createStep("Non-lifecycle activities", properties, {
      SelectTable: beforeValue,
    }),
  ];
  const after = [
    createStep("Non-lifecycle activities", properties, {
      SelectTable: afterValue,
    }),
  ];

  const [section] = buildModifyChangeSummary({ before, after });

  assert.deepEqual(section.changes, [
    {
      kind: "field",
      component: "SelectTable",
      changeType: "MODIFIED",
      fieldKey: "SelectTable",
      labelEn: "SelectTable",
      labelAr: "SelectTable",
      beforeValue,
      afterValue,
    },
  ]);
});

test("returns no sections for unchanged values and malformed form data", () => {
  const unchanged = createStep(
    "Chief Editor Information",
    { Email: { "x-component": "Input", title: "E-mail" } },
    { Email: "same@example.com" },
  );

  assert.deepEqual(
    buildModifyChangeSummary({ before: [unchanged], after: [unchanged] }),
    [],
  );
  assert.deepEqual(
    buildModifyChangeSummary({
      before: [{ stepNameEn: "Broken", formData: "{" }],
      after: [{ stepNameEn: "Broken", formData: "{" }],
    }),
    [],
  );
});

test("does not show inherited 1203 changes in a new Modify session", () => {
  const profileProperties = {
    Profile: { "x-component": "ProfileForm" },
  };
  const languageProperties = {
    dataList: {
      "x-component": "DataList",
      "x-component-props": {
        fieldSource: { dataSource: "languages_name_list" },
      },
    },
  };
  const chiefEditorProperties = {
    MobileNumber: { "x-component": "Input" },
    YearsOfExperience: { "x-component": "Input" },
  };
  const current = [
    createStep("Establishment Information", profileProperties, {
      Profile: { establishmentNameEnglish: "Commercial DP" },
    }),
    createStep("Languages & Names", languageProperties, {
      dataList: [
        { language: "Akan", suggested_name: "Suggested" },
        { language: "English", suggested_name: "S" },
      ],
    }),
    createStep("Chief Editor Information", chiefEditorProperties, {
      MobileNumber: "+971551529931",
      YearsOfExperience: 1,
    }),
  ].map((step) => {
    const parsed = JSON.parse(step.formData || "{}");
    return {
      ...step,
      formData: JSON.stringify({
        ...parsed,
        modifyOriginalFormValues: {
          Profile: { establishmentNameEnglish: "Commercial DP11" },
          dataList: [{ language: "Akan", suggested_name: "Suggested" }],
          MobileNumber: "123123",
          YearsOfExperience: 12,
        },
        modifyChangeSet: { sectionNameEn: step.stepNameEn, changes: [] },
      }),
    };
  });
  const baseline = clearModifyReviewMetadata(current);

  assert.deepEqual(
    buildModifyChangeSummary({ before: baseline, after: baseline }),
    [],
  );
  assert.deepEqual(
    buildModifyLanguageSnapshots({ before: baseline, after: baseline }),
    [],
  );
});

test("records only changes made after a new Modify session starts", () => {
  const properties = {
    MobileNumber: { "x-component": "Input" },
  };
  const baseline = [
    createStep("Chief Editor Information", properties, {
      MobileNumber: "+971551529931",
    }),
  ];
  const after = [
    createStep("Chief Editor Information", properties, {
      MobileNumber: "+971551500000",
    }),
  ];

  const [section] = buildModifyChangeSummary({ before: baseline, after });

  assert.deepEqual(section.changes.map((change) => change.fieldKey), [
    "MobileNumber",
  ]);
});

test("formats list records, files and empty values for review", () => {
  assert.equal(
    formatModifyChangeValue({
      language: "English",
      suggested_name: "Business Insider",
    }),
    "English / Business Insider",
  );
  assert.equal(
    formatModifyChangeValue(
      "common/2026/07/09/qualification-copy.pdf",
      { fileLike: true },
    ),
    "qualification-copy.pdf",
  );
  assert.equal(formatModifyChangeValue(null), "-");
  assert.equal(
    formatModifyChangeValue(true, {
      booleanLabels: { true: "نعم", false: "لا" },
    }),
    "نعم",
  );
  assert.equal(
    formatModifyChangeValue("2027-07-16T23:59:59", { dateOnly: true }),
    "16/07/2027",
  );
  assert.equal(
    formatModifyChangeValue("not-a-date", { dateOnly: true }),
    "not-a-date",
  );
});

test("restores the submitted change set for application details", () => {
  const submittedStep: ModifyFormStep = {
    stepNameEn: "Languages & Names",
    stepNameAr: "اللغات والأسماء",
    formData: JSON.stringify({
      modifyOriginalFormValues: {
        dataList: [
          { languageId: 2, language: "English", suggested_name: "Before" },
        ],
      },
      formValues: {
        dataList: [
          { languageId: 2, language: "English", suggested_name: "After" },
        ],
      },
      modifyChangeSet: {
        sectionNameEn: "Languages & Names",
        sectionNameAr: "اللغات والأسماء",
        changes: [
          {
            kind: "list",
            component: "DataList",
            changeType: "MODIFIED",
            fieldKey: "dataList",
            labelEn: "Language & Name List",
            labelAr: "قائمة اللغات والأسماء",
            beforeValue: {
              languageId: 2,
              language: "English",
              suggested_name: "Before",
            },
            afterValue: {
              languageId: 2,
              language: "English",
              suggested_name: "After",
            },
          },
        ],
      },
    }),
  };

  assert.deepEqual(resolveSubmittedModifyChangeSummary([submittedStep]), [
    {
      sectionNameEn: "Languages & Names",
      sectionNameAr: "اللغات والأسماء",
      changes: [
        {
          kind: "list",
          component: "DataList",
          changeType: "MODIFIED",
          fieldKey: "dataList",
          labelEn: "Language & Name List",
          labelAr: "قائمة اللغات والأسماء",
          beforeValue: {
            languageId: 2,
            language: "English",
            suggested_name: "Before",
          },
          afterValue: {
            languageId: 2,
            language: "English",
            suggested_name: "After",
          },
        },
      ],
    },
  ]);
});

test("normalizes persisted ProfileForm phone parts into one Phone Number change", () => {
  const submittedStep: ModifyFormStep = {
    stepNameEn: "Activity Details",
    stepNameAr: "تفاصيل النشاط",
    formData: JSON.stringify({
      modifyChangeSet: {
        sectionNameEn: "Activity Details",
        sectionNameAr: "تفاصيل النشاط",
        changes: [
          {
            kind: "field",
            component: "Profile Form",
            changeType: "ADDED",
            fieldKey: "Phone Number Country Code",
            labelEn: "phoneNumberCountryCode",
            labelAr: "phoneNumberCountryCode",
            beforeValue: "",
            afterValue: "+971",
          },
          {
            kind: "field",
            component: "Profile Form",
            changeType: "ADDED",
            fieldKey: "phone_number_local_number",
            labelEn: "phoneNumberLocalNumber",
            labelAr: "phoneNumberLocalNumber",
            beforeValue: "",
            afterValue: "501234567",
          },
        ],
      },
    }),
  };

  assert.deepEqual(resolveSubmittedModifyChangeSummary([submittedStep]), [
    {
      sectionNameEn: "Activity Details",
      sectionNameAr: "تفاصيل النشاط",
      changes: [
        {
          kind: "field",
          component: "Profile Form",
          changeType: "ADDED",
          fieldKey: "phoneNumber",
          labelEn: "Phone Number",
          labelAr: "رقم الهاتف",
          beforeValue: "",
          afterValue: "+971501234567",
        },
      ],
    },
  ]);
});

test("hides persisted AddressPicker coordinates from display without changing source data", () => {
  const submittedStep: ModifyFormStep = {
    stepNameEn: "Establishment Information",
    stepNameAr: "بيانات المنشأة",
    formData: JSON.stringify({
      modifyChangeSet: {
        sectionNameEn: "Establishment Information",
        sectionNameAr: "بيانات المنشأة",
        changes: [
          {
            kind: "field",
            component: "AddressPicker",
            ownerComponent: "ProfileForm",
            changeType: "ADDED",
            fieldKey: "addressPicker.latitude",
            labelEn: "addressPicker.latitude",
            labelAr: "addressPicker.latitude",
            beforeValue: null,
            afterValue: 0,
          },
          {
            kind: "field",
            component: "AddressPicker",
            ownerComponent: "ProfileForm",
            changeType: "MODIFIED",
            fieldKey: "addressPicker.longitude",
            labelEn: "addressPicker.longitude",
            labelAr: "addressPicker.longitude",
            beforeValue: 54.4859459667631,
            afterValue: 54.666218654071464,
          },
          {
            kind: "field",
            component: "AddressPicker",
            ownerComponent: "ProfileForm",
            changeType: "MODIFIED",
            fieldKey: "ProfileForm.addressPicker.street",
            labelEn: "Street",
            labelAr: "الشارع",
            beforeValue: "Old street",
            afterValue: "New street",
          },
        ],
      },
    }),
  };

  const resolved = resolveSubmittedModifyChangeSummary([submittedStep]);
  const displayed = filterModifyChangeSummaryForDisplay(resolved);

  assert.equal(resolved[0]?.changes.length, 3);
  assert.deepEqual(displayed, [
    {
      sectionNameEn: "Establishment Information",
      sectionNameAr: "بيانات المنشأة",
      changes: [
        {
          kind: "field",
          component: "AddressPicker",
          ownerComponent: "ProfileForm",
          changeType: "MODIFIED",
          fieldKey: "ProfileForm.addressPicker.street",
          labelEn: "Street",
          labelAr: "الشارع",
          beforeValue: "Old street",
          afterValue: "New street",
        },
      ],
    },
  ]);
  assert.equal(resolved[0]?.changes[0]?.afterValue, 0);
});

test("removes coordinate-only display sections but keeps unrelated latitude fields", () => {
  const sections = [
    {
      sectionNameEn: "Address",
      sectionNameAr: "العنوان",
      changes: [
        {
          kind: "field" as const,
          component: "AddressPicker",
          changeType: "MODIFIED" as const,
          fieldKey: "addressPicker.latitude",
          labelEn: "Latitude",
          labelAr: "خط العرض",
          beforeValue: -1,
          afterValue: 0,
        },
      ],
    },
    {
      sectionNameEn: "Other",
      sectionNameAr: "أخرى",
      changes: [
        {
          kind: "field" as const,
          component: "Input",
          changeType: "MODIFIED" as const,
          fieldKey: "latitude",
          labelEn: "Latitude",
          labelAr: "Latitude",
          beforeValue: "old",
          afterValue: "new",
        },
      ],
    },
  ];

  assert.deepEqual(filterModifyChangeSummaryForDisplay(sections), [sections[1]]);
  assert.equal(sections[0].changes.length, 1);
});

test("hides social media comparisons only for social media modify services", () => {
  const sections = [
    {
      sectionNameEn: "Social Media Accounts",
      sectionNameAr: "Social Media Accounts",
      changes: [
        {
          kind: "field" as const,
          component: "Input",
          changeType: "MODIFIED" as const,
          fieldKey: "referenceNumber",
          labelEn: "Reference Number",
          labelAr: "Reference Number",
          beforeValue: "before",
          afterValue: "after",
        },
        {
          kind: "list" as const,
          component: "SocialMediaAccount",
          changeType: "MODIFIED" as const,
          fieldKey: "socialMediaAccounts",
          labelEn: "Social Media Account",
          labelAr: "Social Media Account",
          beforeValue: { accountName: "Before" },
          afterValue: { accountName: "After" },
        },
      ],
    },
  ];

  for (const serviceCode of ["80011", "80012"]) {
    assert.deepEqual(filterModifyChangeSummaryForDisplay(sections, serviceCode), [
      { ...sections[0], changes: [sections[0].changes[0]] },
    ]);
  }
  assert.deepEqual(
    filterModifyChangeSummaryForDisplay(
      [{ ...sections[0], changes: [sections[0].changes[1]] }],
      "80011",
    ),
    [],
  );
  assert.deepEqual(filterModifyChangeSummaryForDisplay(sections, "903"), sections);
});

test("prefers a persisted complete Phone Number over internal phone parts", () => {
  const submittedStep: ModifyFormStep = {
    stepNameEn: "Activity Details",
    stepNameAr: "تفاصيل النشاط",
    formData: JSON.stringify({
      modifyChangeSet: {
        sectionNameEn: "Activity Details",
        sectionNameAr: "تفاصيل النشاط",
        changes: [
          {
            kind: "field",
            component: "ProfileForm",
            changeType: "MODIFIED",
            fieldKey: "phoneNumber",
            labelEn: "Phone Number",
            labelAr: "رقم الهاتف",
            beforeValue: "+971501234567",
            afterValue: "+971501234568",
          },
          {
            kind: "field",
            component: "ProfileForm",
            changeType: "MODIFIED",
            fieldKey: "phoneNumberCountryCode",
            labelEn: "phoneNumberCountryCode",
            labelAr: "phoneNumberCountryCode",
            beforeValue: "+971",
            afterValue: "+971",
          },
          {
            kind: "field",
            component: "ProfileForm",
            changeType: "MODIFIED",
            fieldKey: "phoneNumberLocalNumber",
            labelEn: "phoneNumberLocalNumber",
            labelAr: "phoneNumberLocalNumber",
            beforeValue: "501234567",
            afterValue: "501234568",
          },
        ],
      },
    }),
  };

  const [section] = resolveSubmittedModifyChangeSummary([submittedStep]);

  assert.equal(section.changes.length, 1);
  assert.equal(section.changes[0].fieldKey, "phoneNumber");
  assert.equal(section.changes[0].beforeValue, "+971501234567");
  assert.equal(section.changes[0].afterValue, "+971501234568");
});

test("does not merge phone-like fields from another component", () => {
  const submittedStep: ModifyFormStep = {
    stepNameEn: "Chief Editor Information",
    formData: JSON.stringify({
      modifyChangeSet: {
        sectionNameEn: "Chief Editor Information",
        sectionNameAr: "معلومات رئيس التحرير",
        changes: [
          {
            kind: "field",
            component: "IDSelector",
            changeType: "ADDED",
            fieldKey: "phoneNumberCountryCode",
            labelEn: "Country Code",
            labelAr: "رمز الدولة",
            beforeValue: "",
            afterValue: "+971",
          },
          {
            kind: "field",
            component: "IDSelector",
            changeType: "ADDED",
            fieldKey: "phoneNumberLocalNumber",
            labelEn: "Local Number",
            labelAr: "الرقم المحلي",
            beforeValue: "",
            afterValue: "501234567",
          },
        ],
      },
    }),
  };

  const [section] = resolveSubmittedModifyChangeSummary([submittedStep]);

  assert.equal(section.changes.length, 2);
  assert.equal(section.changes[0].fieldKey, "phoneNumberCountryCode");
  assert.equal(section.changes[1].fieldKey, "phoneNumberLocalNumber");
});

test("does not invent a submitted summary without trusted metadata", () => {
  assert.deepEqual(
    resolveSubmittedModifyChangeSummary([
      createStep(
        "Establishment Information",
        { WorkEmail: { "x-component": "Input" } },
        { WorkEmail: "new@example.com" },
      ),
    ]),
    [],
  );
});
