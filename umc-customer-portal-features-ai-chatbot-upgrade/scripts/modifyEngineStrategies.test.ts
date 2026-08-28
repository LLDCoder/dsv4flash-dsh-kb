import assert from "node:assert/strict";
import type { IUser } from "@/store/user";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import {
  buildMediaLicenseRuleStrategyPayload,
  getMediaLicenseRuleStrategyConfig,
} from "@/pages/MediaLicense/ruleStrategyPayload";
import {
  buildMediaLicenseFeeStrategyEnginePayload,
  getMediaLicenseFeeStrategyConfig,
} from "@/pages/MediaLicense/feeStrategyPayload";
import {
  isModifyFeeQuotePending,
  resolveModifyFeeSourceApplicationDetailId,
} from "@/pages/MediaLicense/modifyFeeQuoteRules";
import {
  isValidApplicationId,
  mergeLifecycleActivitySourceContext,
  shouldRedirectMissingPermitLifecycleContext,
} from "@/utils/licenseLifecycleSource";
import {
  getMissingRequiredModifyEnginePayload,
  MODIFY_ENGINE_PAYLOAD_REQUIRED_SERVICE_CODES,
} from "@/pages/MediaLicense/modifyFinalSubmitRules";
import {
  collectPublicationLanguageListPaths,
  findLanguageId,
  getPublicationLanguageValidationMessage,
  normalizePublicationLanguageFormilyList,
  resolveStrictLanguageId,
} from "@/pages/MediaLicense/ruleStrategyPayloadUtils";
import { attachModifyReviewMetadata } from "@/pages/MediaLicense/modifyOriginalFormValues";

const userInfo = {
  userEstablishments: [
    {
      id: 88,
      userProfileId: "9353",
      userTypeId: "2",
    },
  ],
} as IUser;

const toFormilyStep = (
  formValues: Record<string, unknown>,
  modifyChangeSet?: Record<string, unknown>,
  schema?: Record<string, unknown>,
) => ({
  formData: JSON.stringify({ formValues, modifyChangeSet, schema }),
});

const setLifecycleSource = (serviceCode: string) => {
  useLicenseLifecycleSourceStore.setState({
    licenseLifecycleSource: {
      sourceServiceCode: "8007",
      sourceMedialLicenseId: 52,
      sourceApplicationId: 171,
      sourceApplicationDetailId: 171,
      licensePermitNo: "1706813",
      serviceId: 3231,
      serviceCode,
    },
  });
};

export const runModifyEngineStrategiesTests = async () => {
  assert.equal(
    shouldRedirectMissingPermitLifecycleContext({
      isPermitLifecycleAction: true,
      applicationId: null,
      hasRouteApplicationId: false,
      source: null,
    }),
    true,
  );
  assert.equal(
    shouldRedirectMissingPermitLifecycleContext({
      isPermitLifecycleAction: true,
      applicationId: 137,
      hasRouteApplicationId: false,
      source: null,
    }),
    false,
  );

  assert.equal(isValidApplicationId(137), true);
  assert.equal(isValidApplicationId("137"), true);
  assert.equal(isValidApplicationId(""), false);
  assert.equal(isValidApplicationId(0), false);
  assert.equal(isValidApplicationId(-1), false);
  assert.equal(isValidApplicationId("invalid"), false);
  assert.equal(
    shouldRedirectMissingPermitLifecycleContext({
      isPermitLifecycleAction: true,
      applicationId: null,
      hasRouteApplicationId: false,
      source: {
        sourceServiceCode: "801",
        sourceMedialLicenseId: 45,
        sourceApplicationId: 137,
        sourceApplicationDetailId: 137,
      },
    }),
    false,
  );
  const publicationSchema = {
    type: "object",
    properties: {
      layout: {
        type: "void",
        "x-component": "Card",
        properties: {
          dataList: {
            type: "array",
            "x-component": "DataList",
            "x-component-props": {
              fieldSource: { dataSource: "material_list" },
            },
          },
          ignoredLanguageNames: {
            type: "array",
            "x-component": "DataList",
            "x-component-props": {
              fieldSource: { dataSource: "languages_name_list" },
            },
          },
          ignoredEquipment: {
            type: "array",
            "x-component": "DataList",
            "x-component-props": {
              fieldSource: { dataSource: "equipment_list" },
            },
          },
          publicationBooks: {
            type: "object",
            "x-component": "BookList",
          },
          beneficiaryType: {
            type: "object",
            "x-component": "BeneficiaryType",
          },
          language: { type: "string", "x-component": "Select" },
        },
      },
    },
  };
  assert.deepEqual(collectPublicationLanguageListPaths(publicationSchema), {
    materialListPaths: ["dataList", "beneficiaryType.materialList"],
    bookListPaths: ["publicationBooks.bookList"],
  });
  assert.equal(
    findLanguageId([{ id: 2, nameEn: "English" }], "Unknown language"),
    "Unknown language",
  );
  assert.equal(findLanguageId([{ id: 2, nameEn: "English" }], 999), 999);
  assert.equal(
    resolveStrictLanguageId(
      [{ id: 2, nameEn: "English", nameAr: "الإنجليزية" }],
      "الإنجليزية",
      "Book language1",
    ),
    2,
  );
  assert.throws(
    () =>
      resolveStrictLanguageId(
        [{ id: 2, nameEn: "English" }],
        999,
        "Book language1",
      ),
    (error: unknown) =>
      getPublicationLanguageValidationMessage(error) ===
      "Book language1 must be selected from the language list.",
  );
  assert.equal(
    getPublicationLanguageValidationMessage(new Error("Unrelated failure")),
    undefined,
  );
  const service21LanguagePayload = await buildMediaLicenseRuleStrategyPayload({
    config: getMediaLicenseRuleStrategyConfig(21)!,
    formilyList: [
      toFormilyStep({ moviePackageForm: { language: "English" } }),
    ],
    currentProfileId: "9353",
    userInfo,
    serviceCode: "21",
  });
  assert.equal(service21LanguagePayload.request.languageId, "English");

  const buildPublicationPayload = (
    serviceCode: 301 | 302 | 303 | 304,
    formValues: Record<string, unknown>,
  ) =>
    buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(serviceCode)!,
      formilyList: [toFormilyStep(formValues)],
      currentProfileId: "9353",
      userInfo,
      serviceCode: String(serviceCode),
    });

  const publicationMaterialCases = [
    { serviceCode: 301 as const, language: "French", expectedId: 47 },
    { serviceCode: 302 as const, language: "Russian", expectedId: 136 },
    { serviceCode: 303 as const, language: "English", expectedId: 2 },
  ];

  for (const { serviceCode, language, expectedId } of publicationMaterialCases) {
    const payload = await buildPublicationPayload(serviceCode, {
      dataList: [
        {
          materialTypeId: 22,
          title: "Test material",
          language,
          number_of_title: 1,
        },
      ],
    });
    assert.equal(payload.request.materials[0]?.language, expectedId);
  }

  const service304Payload = await buildPublicationPayload(304, {
    beneficiaryType: {
      beneficiaryType: 2,
      beneficiaryName: "Test beneficiary",
      materialList: [
        {
          materialTypeId: 22,
          title: "Test material",
          language: "Arabic",
          number_of_title: 1,
        },
      ],
    },
    bookListUpload: {
      bookList: [
        {
          isbn: "9781234567892",
          title: "Beneficiary book",
          authorName: "Test author",
          language1: "French",
        },
      ],
    },
  });
  assert.equal(service304Payload.request.materials[0]?.language, 1);
  assert.deepEqual(service304Payload.request.bookList, [
    {
      isbn: "9781234567892",
      title: "Beneficiary book",
      authorName: "Test author",
      language1: 47,
    },
  ]);

  const service301Payload = await buildPublicationPayload(301, {
    dataList: [],
    bookListUpload: {
      bookList: [
        {
          isbn: "9781234567891",
          title: "Government book",
          authorName: "Test author",
          language1: "2",
          language2: "Arabic",
        },
      ],
    },
  });
  assert.deepEqual(service301Payload.request.bookList, [
    {
      isbn: "9781234567891",
      title: "Government book",
      authorName: "Test author",
      language1: 2,
      language2: 1,
    },
  ]);

  const service302Payload = await buildPublicationPayload(302, {
    dataList: [],
    bookListUpload: {
      bookList: [
        {
          isbn: "9781234567890",
          title: "Test book",
          authorName: "Test author",
          language1: "English",
          language2: "Arabic",
        },
      ],
    },
  });
  assert.deepEqual(service302Payload.request.materials, []);
  assert.deepEqual(service302Payload.request.bookList, [
    {
      isbn: "9781234567890",
      title: "Test book",
      authorName: "Test author",
      language1: 2,
      language2: 1,
    },
  ]);

  const normalizedService302FormilyList = normalizePublicationLanguageFormilyList(
    [
      toFormilyStep(
        {
          dataList: [{ language: "French" }],
          beneficiaryType: { materialList: [{ language: "Arabic" }] },
          publicationBooks: {
            bookList: [{ language1: "English", language2: "Arabic" }],
          },
          language: "English",
        },
        undefined,
        publicationSchema,
      ),
    ],
    [
      { id: 1, nameEn: "Arabic" },
      { id: 2, nameEn: "English" },
      { id: 47, nameEn: "French" },
    ],
  );
  const normalizedService302FormValues = JSON.parse(
    normalizedService302FormilyList[0].formData,
  ).formValues;
  assert.equal(normalizedService302FormValues.dataList[0].language, 47);
  assert.equal(
    normalizedService302FormValues.beneficiaryType.materialList[0].language,
    1,
  );
  assert.equal(
    normalizedService302FormValues.publicationBooks.bookList[0].language1,
    2,
  );
  assert.equal(
    normalizedService302FormValues.publicationBooks.bookList[0].language2,
    1,
  );
  assert.equal(normalizedService302FormValues.language, "English");

  const normalizedLegacyBookList = normalizePublicationLanguageFormilyList(
    [
      toFormilyStep(
        {
          bookListUpload: [
            {
              isbn: "9781234567891",
              language1: "English",
              language2: "Arabic",
            },
          ],
        },
        undefined,
        {
          type: "object",
          properties: {
            bookListUpload: {
              type: "object",
              "x-component": "BookList",
            },
          },
        },
      ),
    ],
    [
      { id: 1, nameEn: "Arabic" },
      { id: 2, nameEn: "English" },
    ],
  );
  const normalizedLegacyBookValues = JSON.parse(
    normalizedLegacyBookList[0].formData,
  ).formValues;
  assert.equal(normalizedLegacyBookValues.bookListUpload[0].language1, 2);
  assert.equal(normalizedLegacyBookValues.bookListUpload[0].language2, 1);

  await assert.rejects(
    buildPublicationPayload(301, {
      dataList: [
        {
          materialTypeId: 22,
          title: "Test material",
          language: "Unknown language",
          number_of_title: 1,
        },
      ],
    }),
    /language must be selected from the language list/i,
  );

  await assert.rejects(
    buildPublicationPayload(302, {
      bookListUpload: {
        bookList: [
          {
            isbn: "9781234567890",
            title: "Test book",
            authorName: "Test author",
            language1: "Unknown language",
          },
        ],
      },
    }),
    /language1 must be selected from the language list/i,
  );

  await assert.rejects(
    buildPublicationPayload(301, {
      bookListUpload: {
        bookList: [
          {
            isbn: "9781234567890",
            title: "Test book",
            authorName: "Test author",
          },
        ],
      },
    }),
    /language1 must be selected from the language list/i,
  );

  const ruleTestContext = globalThis as typeof globalThis & {
    __RULE_TEST_CONTEXT__: { failLanguages: boolean };
  };
  ruleTestContext.__RULE_TEST_CONTEXT__.failLanguages = true;
  try {
    await assert.rejects(
      buildPublicationPayload(303, {
        dataList: [
          {
            materialTypeId: 28,
            title: "Test material",
            language: "English",
            number_of_title: 1,
          },
        ],
      }),
      /Language options are unavailable/,
    );
  } finally {
    ruleTestContext.__RULE_TEST_CONTEXT__.failLanguages = false;
  }

  assert.deepEqual(
    Array.from(MODIFY_ENGINE_PAYLOAD_REQUIRED_SERVICE_CODES),
    ["803", "903", "1203", "80011", "80012"],
  );
  for (const serviceCode of MODIFY_ENGINE_PAYLOAD_REQUIRED_SERVICE_CODES) {
    assert.equal(getMissingRequiredModifyEnginePayload(serviceCode, {}), "bre");
    assert.equal(
      getMissingRequiredModifyEnginePayload(serviceCode, {
        breEnginePayload: { actionType: 4, request: { serviceId: Number(serviceCode) } },
      }),
      "fee",
    );
    assert.equal(
      getMissingRequiredModifyEnginePayload(serviceCode, {
        feeEnginePayload: { actionType: 4, request: { serviceId: Number(serviceCode) } },
      }),
      "bre",
    );
    assert.equal(
      getMissingRequiredModifyEnginePayload(serviceCode, {
        breEnginePayload: { actionType: 4, request: { serviceId: Number(serviceCode) } },
        feeEnginePayload: { actionType: 4, request: { serviceId: Number(serviceCode) } },
      }),
      null,
    );
  }
  assert.equal(getMissingRequiredModifyEnginePayload("1201", {}), null);

  assert.equal(
    resolveModifyFeeSourceApplicationDetailId({
      strategyKind: "service803",
      lifecycleActivityDetailId: null,
      effectiveLifecycleDetailId: 137,
    }),
    137,
    "Service 803 Fee must use the source detail from the effective Modify lifecycle source",
  );
  assert.equal(
    resolveModifyFeeSourceApplicationDetailId({
      strategyKind: "service903",
      lifecycleActivityDetailId: 1000,
      effectiveLifecycleDetailId: 999,
    }),
    1000,
    "Activity-backed Modify services must retain their lifecycle activity detail source",
  );

  const directLinkLifecycleSource = mergeLifecycleActivitySourceContext({
    source: {
      sourceServiceCode: "1201",
      sourceMedialLicenseId: 123,
      sourceApplicationId: 767,
      sourceApplicationDetailId: null,
      licensePermitNo: "2791129",
      serviceId: 3248,
      serviceCode: "1203",
    },
    activityContext: {
      sourceApplicationId: 767,
      sourceApplicationDetailId: 767,
      sourceMedialLicenseId: 123,
      targetServiceCode: "1203",
      targetServiceType: "MODIFY",
      selectionMode: "modify-final",
      existingActivities: [],
      selectedActivityIds: [1010],
      selectedActivities: [],
    },
    licensePermitNo: "2791129",
  });
  assert.equal(directLinkLifecycleSource?.sourceApplicationDetailId, 767);

  const existingLifecycleSource = mergeLifecycleActivitySourceContext({
    source: {
      sourceMedialLicenseId: 999,
      sourceApplicationId: 998,
      sourceApplicationDetailId: 997,
    },
    activityContext: {
      sourceApplicationId: 767,
      sourceApplicationDetailId: 767,
      sourceMedialLicenseId: 123,
      targetServiceCode: "1203",
      targetServiceType: "MODIFY",
      selectionMode: "modify-final",
      existingActivities: [],
      selectedActivityIds: [1010],
      selectedActivities: [],
    },
    licensePermitNo: null,
  });
  assert.deepEqual(
    {
      sourceApplicationId: existingLifecycleSource?.sourceApplicationId,
      sourceApplicationDetailId:
        existingLifecycleSource?.sourceApplicationDetailId,
      sourceMedialLicenseId: existingLifecycleSource?.sourceMedialLicenseId,
    },
    {
      sourceApplicationId: 998,
      sourceApplicationDetailId: 997,
      sourceMedialLicenseId: 999,
    },
  );

  for (const serviceId of [803, 80011, 80012]) {
    assert.deepEqual(getMediaLicenseRuleStrategyConfig(serviceId), {
      serviceId,
      kind: `service${serviceId}`,
    });
    assert.deepEqual(getMediaLicenseFeeStrategyConfig(serviceId), {
      serviceId,
      kind: `service${serviceId}`,
    });
  }

  assert.deepEqual(getMediaLicenseRuleStrategyConfig(1203), {
    serviceId: 1203,
    kind: "service1203",
  });
  assert.deepEqual(getMediaLicenseFeeStrategyConfig(1203), {
    serviceId: 1203,
    kind: "service1203",
  });

  assert.ok(directLinkLifecycleSource);
  useLicenseLifecycleSourceStore.setState({
    licenseLifecycleSource: directLinkLifecycleSource,
  });
  const service1203RulePayload = await buildMediaLicenseRuleStrategyPayload({
    config: getMediaLicenseRuleStrategyConfig(1203)!,
    formilyList: [],
    currentProfileId: "9353",
    userInfo,
    serviceCode: "1203",
  });
  assert.equal(service1203RulePayload.request.applicationId, 767);
  assert.equal(service1203RulePayload.request.applicationDetailId, 767);
  assert.equal(service1203RulePayload.request.termsAgreed, true);

  const service1203FeePayload = await buildMediaLicenseFeeStrategyEnginePayload({
    config: getMediaLicenseFeeStrategyConfig(1203)!,
    formilyList: [],
    currentProfileId: "9353",
    userInfo,
    applicationId: null,
    applicationNo: "2791129",
    licensePermitNo: directLinkLifecycleSource.licensePermitNo,
    sourceApplicationId: directLinkLifecycleSource.sourceApplicationId,
    sourceApplicationDetailId:
      directLinkLifecycleSource.sourceApplicationDetailId,
    sourceMedialLicenseId: directLinkLifecycleSource.sourceMedialLicenseId,
  });
  assert.equal(service1203FeePayload.request.payload.applicationId, 767);
  assert.equal(service1203FeePayload.request.payload.applicationDetailId, 767);
  assert.equal(
    "termsAgreed" in (service1203FeePayload.request.payload || {}),
    false,
  );

  const mobileSchema = {
    type: "object",
    properties: {
      ProfileForm: { "x-component": "ProfileForm" },
      idSelector: { "x-component": "IDSelector" },
    },
  };
  const originalMobileStep = {
    stepNameEn: "Contact Information",
    stepNameAr: "Contact Information",
    formData: JSON.stringify({
      schema: mobileSchema,
      formValues: {
        ProfileForm: { phoneNumber: "+971501234567" },
        idSelector: {
          type: "passport",
          passportNumber: "P1234567",
          mobileNo: "+971501234567",
        },
      },
    }),
  };
  const currentMobileStep = {
    ...originalMobileStep,
    formData: JSON.stringify({
      schema: mobileSchema,
      formValues: {
        ProfileForm: {
          phoneNumber: "+971501234567",
          phoneNumberCountryCode: "+44",
          phoneNumberLocalNumber: "7700900123",
        },
        idSelector: {
          type: "passport",
          passportNumber: "P1234567",
          mobileNo: "+971501234567",
          mobileNoCountryCode: "+44",
          mobileNoLocalNumber: "7700900123",
        },
      },
    }),
  };
  const [mobileModifyStep] = attachModifyReviewMetadata(
    [currentMobileStep],
    [originalMobileStep],
  );
  const mobileChangeSet = JSON.parse(mobileModifyStep.formData!).modifyChangeSet;
  assert.deepEqual(
    mobileChangeSet.changes.map(
      (change: { fieldKey: string }) => change.fieldKey,
    ),
    ["phoneNumber", "idSelector.mobileNo"],
  );

  for (const serviceId of [903, 80012]) {
    setLifecycleSource(String(serviceId));
    const profileMobilePayload = await buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(serviceId)!,
      formilyList: [mobileModifyStep],
      currentProfileId: "9353",
      userInfo,
      serviceCode: String(serviceId),
    });
    assert.deepEqual(profileMobilePayload.request.establishmentFields, [
      "phoneNumber",
    ]);
  }

  setLifecycleSource("803");
  const service803MobilePayload =
    await buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(803)!,
      formilyList: [mobileModifyStep],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "803",
    });
  assert.deepEqual(service803MobilePayload.request.establishmentFields, [
    "phoneNumber",
  ]);
  assert.deepEqual(service803MobilePayload.request.chiefEditor?.fieldKeys, [
    "idSelector.mobileNo",
  ]);

  for (const serviceId of [1203, 804, 905, 1205]) {
    setLifecycleSource(String(serviceId));
    const unaffectedPayload = await buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(serviceId)!,
      formilyList: [mobileModifyStep],
      currentProfileId: "9353",
      userInfo,
      serviceCode: String(serviceId),
    });
    const request = unaffectedPayload.request as unknown as Record<
      string,
      unknown
    >;
    assert.equal("establishmentFields" in request, false);
    assert.equal("chiefEditor" in request, false);
    assert.equal("modificationItems" in request, false);
  }

  setLifecycleSource("803");
  const service803Config = getMediaLicenseRuleStrategyConfig(803)!;
  const service803RulePayload =
    await buildMediaLicenseRuleStrategyPayload({
      config: service803Config,
      formilyList: [
        toFormilyStep(
          {
            ProfileForm: {
              establishmentNameEnglish: "Test",
              addressPicker: { street: "New Street" },
            },
            Email: "editor@example.com",
            QualificationCopy: "common/qualification.pdf",
            idSelector: {
              type: "passport",
              passportNumber: "P1234567",
              PersonalPhoto: "common/personal-photo.png",
            },
          },
          {
            sectionNameEn: "Details",
            sectionNameAr: "Details",
            changes: [
              {
                component: "ProfileForm",
                fieldKey: "establishmentNameEnglish",
              },
              {
                component: "AddressPicker",
                ownerComponent: "ProfileForm",
                fieldKey: "addressPicker.street",
              },
              { component: "Input", fieldKey: "Email" },
              { component: "IDSelector", fieldKey: "idSelector.fullNameEnglish" },
              { component: "Upload", fieldKey: "QualificationCopy" },
            ],
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "803",
    });
  assert.equal(service803RulePayload.actionType, 4);
  assert.equal("expectedRuleVersion" in service803RulePayload, false);
  assert.equal(service803RulePayload.request.serviceId, 803);
  assert.equal(service803RulePayload.request.applicationId, 171);
  assert.equal(service803RulePayload.request.applicationDetailId, 171);
  assert.equal(service803RulePayload.request.termsAgreed, true);
  assert.deepEqual(service803RulePayload.request.modificationItems, [
    "ESTABLISHMENT_INFORMATION",
    "CHIEF_EDITOR",
  ]);
  assert.deepEqual(service803RulePayload.request.establishmentFields, [
    "establishmentNameEnglish",
    "addressPicker.street",
  ]);
  assert.deepEqual(service803RulePayload.request.chiefEditor, {
    submitted: true,
    fieldKeys: [
      "Email",
      "idSelector.fullNameEnglish",
      "QualificationCopy",
    ],
    identityDocumentType: "PASSPORT",
    identityDocumentNumber: "P1234567",
    attachmentKeys: ["QualificationCopy"],
  });
  assert.equal(service803RulePayload.request.submissionMode, "submit");
  assert.match(
    service803RulePayload.request.requestTime,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
  );

  await assert.rejects(
    buildMediaLicenseRuleStrategyPayload({
      config: service803Config,
      formilyList: [
        toFormilyStep(
          { Email: "editor@example.com" },
          {
            changes: [{ component: "Input", fieldKey: "Email" }],
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "803",
    }),
    /IDSelector identity document is required/,
  );

  for (const serviceId of [80011, 80012]) {
    setLifecycleSource(String(serviceId));
    const socialPayload = await buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(serviceId)!,
      formilyList: [
        toFormilyStep({
          socialMediaAccounts: [
            {
              id: "1778080835150-32bd46c9852f1",
              accountId: 9,
              platformId: 1,
              mediaCategoryId: 1,
              subCategoryIds: [20],
              accountName: "Title updated",
              accountUrl: "https://example.com",
              mediaCategory: "1",
              mediaSubCategories: ["20"],
              accountType: "1",
              screenshot: "common/proof.pdf",
              operation: "MODIFY",
            },
          ],
        }),
        ...(serviceId === 80011 ? [mobileModifyStep] : []),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: String(serviceId),
    });

    assert.equal(socialPayload.actionType, 4);
    assert.equal(socialPayload.request.termsAgreed, true);
    assert.deepEqual(socialPayload.request.modificationItems, [
      "SOCIAL_MEDIA_ACCOUNT",
    ]);
    assert.deepEqual(socialPayload.request.socialMediaAccountChanges, [
      {
        operation: "MODIFY",
        accountId: 9,
        platformId: 1,
        accountType: 1,
        mediaCategoryId: 1,
        displayName: "Title updated",
        websiteUrl: "https://example.com",
        proofDocUrl: "common/proof.pdf",
        subCategoryIds: [20],
      },
    ]);
  }

  setLifecycleSource("80011");
  await assert.rejects(
    buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(80011)!,
      formilyList: [
        toFormilyStep({
          socialMediaAccounts: [
            {
              id: "legacy-only",
              accountName: "Legacy account",
              accountUrl: "https://example.com",
              mediaCategory: "1",
              mediaSubCategories: ["20"],
              accountType: "1",
              operation: "MODIFY",
            },
          ],
        }),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "80011",
    }),
    /authoritative accountId/,
  );

  const service80012EditableEstablishmentFields = [
    "workEmail",
    "establishmentNameArabic",
    "establishmentNameEnglish",
    "hasTradeLicense",
    "commercialLicenseNumber",
    "licenseExpiryDate",
    "phoneNumber",
    "tenancyContractEndDate",
    "commercialLicense",
    "tenancyContract",
    "reserveTradeName",
    "memorandumOfAssociation",
    "powerOfAttorney",
    "addressPicker.emirateId",
    "addressPicker.regionId",
    "addressPicker.areaId",
    "addressPicker.street",
    "addressPicker.latitude",
    "addressPicker.longitude",
  ];

  setLifecycleSource("80012");
  const service80012RulePayload =
    await buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(80012)!,
      formilyList: [
        toFormilyStep(
          { ProfileForm: { establishmentNameEnglish: "Updated" } },
          {
            changes: service80012EditableEstablishmentFields.map(
              (fieldKey) => ({
                component: fieldKey.startsWith("addressPicker.")
                  ? "AddressPicker"
                  : "ProfileForm",
                ...(fieldKey.startsWith("addressPicker.")
                  ? { ownerComponent: "ProfileForm" }
                  : {}),
                fieldKey,
              }),
            ),
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "80012",
    });
  assert.equal(service80012RulePayload.actionType, 4);
  assert.equal("expectedRuleVersion" in service80012RulePayload, false);
  assert.deepEqual(service80012RulePayload.request, {
    serviceId: 80012,
    applicantUserId: "9353",
    applicationId: 171,
    applicationDetailId: 171,
    licensePermitNo: "1706813",
    mediaLicenseId: 52,
    modificationItems: ["ESTABLISHMENT_INFORMATION"],
    establishmentFields: service80012EditableEstablishmentFields,
    socialMediaAccountChanges: [],
    termsAgreed: true,
    submissionMode: "submit",
    requestTime: service80012RulePayload.request.requestTime,
  });
  await assert.rejects(
    buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(80012)!,
      formilyList: [
        toFormilyStep(
          { ProfileForm: { licensingAuthority: "Updated" } },
          {
            changes: [
              {
                component: "ProfileForm",
                fieldKey: "licensingAuthority",
              },
            ],
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "80012",
    }),
    /unsupported Establishment Information fields: licensingAuthority/,
  );

  const service80012CombinedPayload =
    await buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(80012)!,
      formilyList: [
        toFormilyStep(
          {
            ProfileForm: { phoneNumber: "971500000000" },
            socialMediaAccounts: [
              {
                id: "new-account",
                accountName: "New account",
                accountUrl: "https://example.com/new",
                mediaCategory: "2",
                mediaSubCategories: ["4", "1"],
                accountType: "3",
                screenshot: "common/new-proof.pdf",
                operation: "ADD",
              },
              {
                id: "deleted-account",
                accountId: 10,
                operation: "DELETE",
              },
            ],
          },
          {
            changes: [
              {
                component: "ProfileForm",
                fieldKey: "phoneNumber",
              },
              {
                component: "SocialMediaAccount",
                fieldKey: "socialMediaAccounts",
              },
            ],
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "80012",
    });
  assert.deepEqual(service80012CombinedPayload.request.modificationItems, [
    "ESTABLISHMENT_INFORMATION",
    "SOCIAL_MEDIA_ACCOUNT",
  ]);
  assert.deepEqual(
    service80012CombinedPayload.request.socialMediaAccountChanges,
    [
      {
        operation: "ADD",
        accountId: null,
        platformId: 3,
        accountType: 3,
        mediaCategoryId: 2,
        displayName: "New account",
        websiteUrl: "https://example.com/new",
        proofDocUrl: "common/new-proof.pdf",
        subCategoryIds: [4, 1],
      },
      {
        operation: "DELETE",
        accountId: 10,
      },
    ],
  );
  await assert.rejects(
    () =>
      buildMediaLicenseRuleStrategyPayload({
        config: getMediaLicenseRuleStrategyConfig(80012)!,
        formilyList: [
          toFormilyStep(
            { ProfileForm: { establishmentNameEnglish: "Updated" } },
            {
              changes: [
                {
                  component: "ProfileForm",
                  fieldKey: "establishmentNameEnglish",
                },
              ],
            },
          ),
        ],
        currentProfileId: "",
        userInfo,
        serviceCode: "80012",
      }),
    /applicant, application, license permit, and media license context are required/,
  );
  await assert.rejects(
    () =>
      buildMediaLicenseRuleStrategyPayload({
        config: getMediaLicenseRuleStrategyConfig(80012)!,
        formilyList: [
          toFormilyStep(
            { ProfileForm: { establishmentNameEnglish: "Updated" } },
            {
              changes: [
                {
                  component: "ProfileForm",
                  fieldKey: "establishmentNameEnglish",
                },
              ],
            },
          ),
        ],
        currentProfileId: "0",
        userInfo,
        serviceCode: "80012",
      }),
    /applicant, application, license permit, and media license context are required/,
  );

  setLifecycleSource("80012");
  useLicenseLifecycleSourceStore.setState({
    licenseLifecycleSource: {
      ...useLicenseLifecycleSourceStore.getState().licenseLifecycleSource!,
      sourceApplicationId: 0,
    },
  });
  await assert.rejects(
    () =>
      buildMediaLicenseRuleStrategyPayload({
        config: getMediaLicenseRuleStrategyConfig(80012)!,
        formilyList: [
          toFormilyStep(
            { ProfileForm: { establishmentNameEnglish: "Updated" } },
            {
              changes: [
                {
                  component: "ProfileForm",
                  fieldKey: "establishmentNameEnglish",
                },
              ],
            },
          ),
        ],
        currentProfileId: "9353",
        userInfo,
        serviceCode: "80012",
      }),
    /application, license permit, and media license context are required/,
  );
  setLifecycleSource("80012");

  const service803FeePayload =
    await buildMediaLicenseFeeStrategyEnginePayload({
      config: getMediaLicenseFeeStrategyConfig(803)!,
      formilyList: [
        toFormilyStep(
          {
            ProfileForm: { establishmentNameEnglish: "Test" },
            Email: "editor@example.com",
          },
          {
            sectionNameEn: "Details",
            sectionNameAr: "Details",
            changes: [
              { component: "ProfileForm", fieldKey: "name" },
              { component: "Input", fieldKey: "Email" },
            ],
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      sourceApplicationId: 171,
      sourceApplicationDetailId: 171,
      sourceMedialLicenseId: 52,
      licensePermitNo: "1706813",
    });
  assert.deepEqual(service803FeePayload.request.payload?.modificationItems, [
    "ESTABLISHMENT_INFORMATION",
    "CHIEF_EDITOR",
  ]);
  assert.equal(
    "termsAgreed" in (service803FeePayload.request.payload || {}),
    false,
  );

  const service803ProfileAddressFeePayload =
    await buildMediaLicenseFeeStrategyEnginePayload({
      config: getMediaLicenseFeeStrategyConfig(803)!,
      formilyList: [
        toFormilyStep(
          { ProfileForm: { addressPicker: { street: "New Street" } } },
          {
            sectionNameEn: "Establishment Information",
            sectionNameAr: "Establishment Information",
            changes: [
              {
                component: "AddressPicker",
                ownerComponent: "ProfileForm",
                fieldKey: "addressPicker.street",
              },
            ],
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      sourceApplicationId: 171,
      sourceApplicationDetailId: 171,
      sourceMedialLicenseId: 52,
      licensePermitNo: "1706813",
    });
  assert.deepEqual(
    service803ProfileAddressFeePayload.request.payload?.modificationItems,
    ["ESTABLISHMENT_INFORMATION"],
  );

  const service80012FeePayload =
    await buildMediaLicenseFeeStrategyEnginePayload({
      config: getMediaLicenseFeeStrategyConfig(80012)!,
      formilyList: [
        toFormilyStep(
          {
            ProfileForm: { establishmentNameEnglish: "Test" },
            socialMediaAccounts: [
              { id: "existing-1", operation: "DELETE" },
            ],
          },
          {
            sectionNameEn: "Details",
            sectionNameAr: "Details",
            changes: [
              { component: "ProfileForm", fieldKey: "name" },
              {
                component: "SocialMediaAccount",
                fieldKey: "socialMediaAccounts",
              },
            ],
          },
        ),
      ],
      currentProfileId: "9353",
      userInfo,
      sourceApplicationId: 171,
      sourceApplicationDetailId: 171,
      sourceMedialLicenseId: 52,
      licensePermitNo: "1706813",
    });
  assert.deepEqual(
    service80012FeePayload.request.payload?.modificationItems,
    ["ESTABLISHMENT_INFORMATION", "SOCIAL_MEDIA_ACCOUNT"],
  );
  assert.equal(
    "termsAgreed" in (service80012FeePayload.request.payload || {}),
    false,
  );

  const payload = await buildMediaLicenseFeeStrategyEnginePayload({
    config: getMediaLicenseFeeStrategyConfig(80011)!,
    formilyList: [
      toFormilyStep({
        socialMediaAccounts: [{ id: "existing-1", operation: "DELETE" }],
      }),
    ],
    currentProfileId: "9353",
    userInfo,
    sourceApplicationId: 171,
    sourceApplicationDetailId: 171,
    sourceMedialLicenseId: 52,
    licensePermitNo: "1706813",
  });

  assert.equal(payload.actionType, 4);
  assert.equal(payload.expectedFeeVersion, undefined);
  assert.equal(payload.request.serviceId, 80011);
  assert.equal(payload.request.licensePermitNo, "1706813");
  assert.equal(payload.request.mediaLicenseId, 52);
  assert.deepEqual(payload.request.payload, {
    applicationId: 171,
    applicationDetailId: 171,
    licensePermitNo: "1706813",
    mediaLicenseId: 52,
    modificationItems: ["SOCIAL_MEDIA_ACCOUNT"],
  });
  assert.equal("amount" in (payload.request.payload || {}), false);
  assert.equal("termsAgreed" in (payload.request.payload || {}), false);
  assert.equal("expectedFeeVersion" in payload, false);

  assert.equal(
    isModifyFeeQuotePending(
      getMediaLicenseFeeStrategyConfig(803),
      true,
      null,
    ),
    true,
  );
  assert.equal(
    isModifyFeeQuotePending(
      getMediaLicenseFeeStrategyConfig(80011),
      false,
      null,
    ),
    true,
  );
  assert.equal(
    isModifyFeeQuotePending(
      getMediaLicenseFeeStrategyConfig(80012),
      false,
      { totalAmount: 200 } as never,
    ),
    false,
  );
  assert.equal(
    isModifyFeeQuotePending(
      getMediaLicenseFeeStrategyConfig(1201),
      true,
      null,
    ),
    false,
  );
};
