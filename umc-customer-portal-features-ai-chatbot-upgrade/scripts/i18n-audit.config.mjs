export const dynamicKeyPrefixes = [
  "termsModal.",
  "homeAction.permitStatus.",
  "serviceDetail.steps.",
  "serviceDetail.units.",
  "serviceDetail.serviceSteps.",
  "processModal.",
  "menu.",
];

export const externalRuntimePrefixes = [
  "selfMonitor.reasons.",
];

export const dynamicContextKeys = {
  "personalProfilePage.alerts.expiringSoon": {
    contexts: ["today", "oneDay", "twoDays", "fewDays", "manyDays"],
    producers: ["src/pages/EstablishmentProfile/components/AlertBanners/index.tsx"],
  },
  "personalProfilePage.alerts.expired": {
    contexts: ["oneDay", "twoDays", "fewDays", "manyDays"],
    producers: ["src/pages/EstablishmentProfile/components/AlertBanners/index.tsx"],
  },
  "establishmentProfile.messages.identityDocumentExpireIn": {
    contexts: ["today", "oneDay", "twoDays", "fewDays", "manyDays"],
    producers: ["src/pages/EstablishmentProfile/components/AlertBanners/index.tsx"],
  },
  "establishmentProfile.messages.identityDocumentExpiredAgo": {
    contexts: ["oneDay", "twoDays", "fewDays", "manyDays"],
    producers: ["src/pages/EstablishmentProfile/components/AlertBanners/index.tsx"],
  },
};

export const dynamicValueKeys = {
  "common.mobileNumberValidation": {
    values: [
      "REQUIRED",
      "INVALID_COUNTRY",
      "NOT_A_NUMBER",
      "TOO_SHORT",
      "TOO_LONG",
      "INVALID_LENGTH",
      "INVALID_FORMAT",
    ],
    producers: ["src/components/common/MobileNumberInput/utils.ts"],
    valueSources: [
      {
        file: "src/components/common/MobileNumberInput/utils.ts",
        identifier: "MOBILE_NUMBER_VALIDATION_I18N_CODES",
        selector: "array",
      },
    ],
  },
  "BeneficiaryType.option": {
    values: [
      "commercialEntityHasMediaLicense",
      "commercialEntityHasNoMediaLicense",
      "governmentEntity",
      "individual",
      "privateSchoolEducationalInstitutionUniversity",
    ],
    producers: [
      "src/components/designable/src/components/BeneficiaryType/BeneficiaryTypeField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/BeneficiaryType/BeneficiaryTypeField.tsx",
        identifier: "DEFAULT_BENEFICIARY_TYPE_OPTIONS",
        selector: "array-property",
        property: "translationKey",
      },
    ],
  },
  "BookTradingForm.option.bookType": {
    values: ["Paper", "Electronic"],
    producers: [
      "src/components/designable/src/components/BookTradingForm/BookTradingFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/BookTradingForm/BookTradingFormField.tsx",
        identifier: "BOOK_TYPE_VALUES",
        selector: "array",
      },
    ],
  },
  "DataList.dataSources": {
    values: [
      "equipment_list",
      "material_list",
      "languages_name_list",
      "list_of_trainees",
      "unknown",
    ],
    producers: [
      "src/components/designable/src/components/DataList/DataList.tsx",
      "src/components/designable/src/components/DataList/Setter/DataListSourceSetter.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/DataList/DataList.tsx",
        identifier: "DATA_LIST_DATA_SOURCE_VALUES",
        selector: "array",
      },
    ],
    extraValues: ["unknown"],
  },
  "DataList.equipmentOptions": {
    values: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "unknown",
    ],
    producers: [
      "src/components/designable/src/components/DataList/DataList.tsx",
      "src/components/designable/src/components/DataList/Setter/DataListSourceSetter.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/DataList/DataList.tsx",
        identifier: "DATA_LIST_EQUIPMENT_VALUES",
        selector: "array",
      },
    ],
    extraValues: ["unknown"],
  },
  "FilmRescreeningForm.option.copyrightsType": {
    values: ["1", "2", "3", "4", "5"],
    producers: [
      "src/components/designable/src/components/FilmRescreeningForm/FilmRescreeningFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/FilmRescreeningForm/FilmRescreeningFormField.tsx",
        identifier: "COPYRIGHTS_TYPE_VALUES",
        selector: "array",
      },
    ],
  },
  "FilmScreeningForm.value": {
    values: [
      "distributionOfElectronicVideoGames",
      "programsDistribution",
      "cinemaDistribution",
      "distributionOfSongs",
      "distributionDvdBd3dbd",
      "usa",
      "english",
      "arabicEnglish",
    ],
    producers: [
      "src/components/designable/src/components/FilmScreeningForm/FilmScreeningFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/FilmScreeningForm/FilmScreeningFormField.tsx",
        identifier: "LOCALIZED_VALUE_KEYS",
        selector: "object-values",
      },
    ],
  },
  "FilmTrailerForm.value": {
    values: [
      "action",
      "drama",
      "english",
      "arabic",
      "japanese",
      "usa",
      "uae",
      "japan",
      "cinemaDistribution",
      "programsDistribution",
    ],
    producers: [
      "src/components/designable/src/components/FilmTrailerForm/FilmTrailerFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/FilmTrailerForm/FilmTrailerFormField.tsx",
        identifier: "LOCALIZED_VALUE_KEYS",
        selector: "object-values",
      },
    ],
  },
  "GameDistributionForm.value": {
    values: [
      "distributionOfElectronicVideoGames",
      "programsDistribution",
      "usa",
      "english",
      "arabicEnglish",
    ],
    producers: [
      "src/components/designable/src/components/GameDistributionForm/GameDistributionFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/GameDistributionForm/GameDistributionFormField.tsx",
        identifier: "LOCALIZED_VALUE_KEYS",
        selector: "object-values",
      },
    ],
  },
  "IDSelector.type": {
    values: ["emiratesId", "uid", "passport"],
    producers: [
      "src/components/designable/src/components/IDSelector/IDSelectorField.tsx",
      "src/components/designable/src/components/IDSelector/idSelectorUtils.ts",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/IDSelector/idSelectorUtils.ts",
        identifier: "ID_OPTIONS",
        selector: "array-property",
        property: "value",
      },
    ],
  },
  "LicenseTransferForm.value": {
    values: ["uae", "male"],
    producers: [
      "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
        identifier: "LOCALIZED_VALUE_KEYS",
        selector: "object-values",
      },
    ],
  },
  "LicenseTransferForm.option": {
    values: [
      "emirate.abu_dhabi",
      "emirate.dubai",
      "emirate.sharjah",
      "emirate.ajman",
      "emirate.umm_al_quwain",
      "emirate.ras_al_khaimah",
      "emirate.fujairah",
      "licensingAuthority.ad_ded",
      "licensingAuthority.dubai_ded",
      "licensingAuthority.sharjah_edd",
      "region.abu_dhabi",
      "region.al_ain",
      "region.western_region",
      "area.map",
      "area.khalifa_city",
      "area.al_reem_island",
      "idType.emirates_id",
      "idType.passport",
    ],
    producers: [
      "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
        identifier: "LICENSE_TRANSFER_OPTION_KEYS",
        path: ["emirate"],
        selector: "array",
      },
      {
        file: "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
        identifier: "LICENSE_TRANSFER_OPTION_KEYS",
        path: ["licensingAuthority"],
        selector: "array",
      },
      {
        file: "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
        identifier: "LICENSE_TRANSFER_OPTION_KEYS",
        path: ["region"],
        selector: "array",
      },
      {
        file: "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
        identifier: "LICENSE_TRANSFER_OPTION_KEYS",
        path: ["area"],
        selector: "array",
      },
      {
        file: "src/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField.tsx",
        identifier: "LICENSE_TRANSFER_OPTION_KEYS",
        path: ["idType"],
        selector: "array",
      },
    ],
  },
  "VideoGamePackageForm.option.gamePlatform": {
    values: ["Sony/Playstation", "Xbox", "Nintendo", "PC", "Mobile", "Other"],
    producers: [
      "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
        identifier: "GAME_PLATFORM_VALUES",
        selector: "array",
      },
    ],
  },
  "VideoGamePackageForm.option.type": {
    values: [
      "Action",
      "Action - Adventure",
      "Adventure",
      "Role-Playing",
      "Simulation",
      "Strategy",
    ],
    producers: [
      "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
        identifier: "TYPE_VALUES",
        selector: "array",
      },
    ],
  },
  "VideoGamePackageForm.option.copyrightsType": {
    values: [
      "Distribution DVD, BD & 3DBD",
      "Distribution of electronic video games",
      "Cinema Distribution",
      "Programs Distribution",
      "Distribution of songs",
    ],
    producers: [
      "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
        identifier: "COPYRIGHTS_TYPE_VALUES",
        selector: "array",
      },
    ],
  },
  "VideoGamePackageForm.permit": {
    values: [
      "Age Rating Permit For Video Games",
      "Distribution Of Non-Digital Video Games",
      "Distribution Of Digital Video Games",
    ],
    producers: [
      "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
    ],
    valueSources: [
      {
        file: "src/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField.tsx",
        identifier: "PERMIT_LABEL_VALUES",
        selector: "array",
      },
    ],
  },
  "mediaLicensePage.changeType": {
    values: ["added", "modified", "deleted"],
    producers: [
      "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
    ],
    valueSources: [
      {
        file: "src/pages/MediaLicense/components/ModifyChangeSummary.tsx",
        identifier: "CHANGE_TYPE_TRANSLATION_SUFFIX",
        selector: "object-values",
      },
    ],
  },
  "payFines.payment": {
    values: [
      "success.title",
      "failed.title",
      "processing.title",
      "unknown.title",
      "failed.description",
      "processing.description",
      "unknown.description",
    ],
    producers: [
      "src/pages/PayFines/index.tsx",
      "src/pages/PayFinesDetail/index.tsx",
    ],
    valueSources: [
      {
        file: "src/pages/PayFines/index.tsx",
        identifier: "PAYMENT_TITLE_KEY_BY_STATUS",
        selector: "object-values",
      },
      {
        file: "src/pages/PayFines/index.tsx",
        identifier: "PAYMENT_DESCRIPTION_KEY_BY_STATUS",
        selector: "object-values",
      },
    ],
  },
  "refundPage.refundStatus": {
    values: [
      "under_review",
      "pending_refund",
      "approved",
      "rejected",
      "refunded",
      "cancelled",
      "unknown",
    ],
    producers: [
      "src/components/common/CustomStatusTag/index.tsx",
      "src/utils/refundStatus.ts",
    ],
    valueSources: [
      {
        file: "src/utils/refundStatus.ts",
        identifier: "REFUND_STATUS_LABELS",
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.myRequest": {
    values: [
      "100",
      "101",
      "102",
      "103",
      "104",
      "105",
      "106",
      "107",
      "108",
      "109",
      "allStatuses",
      "draft",
      "underReview",
      "pendingPayment",
      "pendingModification",
      "pendingDisposition",
      "underVerification",
      "completed",
      "completedDispositionVerified",
      "completedDispositionNotVerified",
      "rejected",
      "rejectedDispositionVerified",
      "rejectedDispositionNotVerified",
      "cancelled",
      "unknown",
    ],
    producers: [
      "src/components/common/CustomStatusTag/index.tsx",
      "src/pages/my-requests/index.tsx",
      "src/utils/myRequestApproval.ts",
    ],
    valueSources: [
      {
        file: "src/utils/myRequestApproval.ts",
        identifier: "STATUS_BY_ID",
        selector: "object-keys",
      },
      {
        file: "src/utils/myRequestApproval.ts",
        identifier: "STATUS_LABELS",
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.wallet": {
    values: ["1", "2", "3", "4", "5", "6", "7"],
    producers: ["src/components/common/CustomStatusTag/index.tsx"],
    valueSources: [
      {
        file: "src/components/common/CustomStatusTag/index.tsx",
        identifier: "STATUS_ENUM",
        path: ["wallet"],
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.application": {
    values: ["1", "2", "3", "4", "5"],
    producers: ["src/components/common/CustomStatusTag/index.tsx"],
    valueSources: [
      {
        file: "src/components/common/CustomStatusTag/index.tsx",
        identifier: "STATUS_ENUM",
        path: ["application"],
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.transaction": {
    values: ["1", "2", "3", "4", "5", "6", "7"],
    producers: ["src/components/common/CustomStatusTag/index.tsx"],
    valueSources: [
      {
        file: "src/components/common/CustomStatusTag/index.tsx",
        identifier: "STATUS_ENUM",
        path: ["transaction"],
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.equiry": {
    values: ["0", "1", "2", "3", "4", "5", "6", "7"],
    producers: ["src/components/common/CustomStatusTag/index.tsx"],
    valueSources: [
      {
        file: "src/components/common/CustomStatusTag/index.tsx",
        identifier: "STATUS_ENUM",
        path: ["equiry"],
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.app": {
    values: ["100", "101", "102", "103", "104", "105", "106", "107"],
    producers: ["src/components/common/CustomStatusTag/index.tsx"],
    valueSources: [
      {
        file: "src/components/common/CustomStatusTag/index.tsx",
        identifier: "STATUS_ENUM",
        path: ["app"],
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.violation": {
    values: ["1", "7", "8", "9", "10"],
    producers: [
      "src/components/common/CustomStatusTag/index.tsx",
      "src/pages/ViolationsFinesAppealDetail/index.tsx",
    ],
    valueSources: [
      {
        file: "src/components/common/CustomStatusTag/index.tsx",
        identifier: "STATUS_ENUM",
        path: ["violation"],
        selector: "object-keys",
      },
    ],
  },
  "customStatusTag.appeal": {
    values: ["0", "1", "2", "3", "4", "6", "7", "8"],
    producers: ["src/components/common/CustomStatusTag/index.tsx"],
    valueSources: [
      {
        file: "src/components/common/CustomStatusTag/index.tsx",
        identifier: "STATUS_ENUM",
        path: ["appeal"],
        selector: "object-keys",
      },
    ],
  },
  "mediaLicensePage.publicationLanguage": {
    values: ["invalidSelection", "optionsUnavailable"],
    producers: ["src/pages/MediaLicense/ruleStrategyPayloadUtils.ts"],
    valueSources: [
      {
        file: "src/pages/MediaLicense/ruleStrategyPayloadUtils.ts",
        identifier: "PublicationLanguageValidationValue",
        selector: "type-union",
      },
    ],
  },
  "myRequestsPage.detail.timeline.stages": {
    values: [
      "submitted",
      "underReview",
      "approvalGranted",
      "pendingPayment",
      "documentIssuance",
      "rejected",
      "cancelled",
    ],
    producers: [
      "src/utils/myRequestApproval.ts",
      "src/pages/Detail/index.tsx",
    ],
    valueSources: [
      {
        file: "src/utils/myRequestApproval.ts",
        identifier: "MyRequestTimelineStageKey",
        selector: "type-union",
      },
    ],
  },
  "myRequestsPage.cardPayment.messages": {
    values: [
      "recovery",
      "recreated",
      "queryFailed",
      "timeout",
      "popupBlocked",
      "purchaseFailed",
      "notReady",
      "cancelFailed",
      "transactionNotFound",
      "cancelPending",
      "sessionMissing",
      "confirmationAutomatic",
      "confirmationPending",
      "applicationMissing",
    ],
    producers: ["src/pages/Detail/CardPayment/useCardPayment.ts"],
    valueSources: [
      {
        file: "src/pages/Detail/CardPayment/useCardPayment.ts",
        identifier: "CardPaymentMessageKey",
        selector: "type-union",
      },
    ],
  },
  "myRequestsPage.actions": {
    values: [
      "delete",
      "duplicate",
      "details",
      "edit",
      "payNow",
      "cancel",
      "viewDocument",
      "downloadReceipt",
      "submitProof",
    ],
    producers: [
      "src/utils/myRequestApproval.ts",
      "src/pages/my-requests/index.tsx",
      "src/pages/Detail/index.tsx",
    ],
    valueSources: [
      {
        file: "src/utils/myRequestApproval.ts",
        identifier: "ACTION_LABELS",
        selector: "object-keys",
      },
    ],
  },
  "myRequestsPage.tabs": {
    values: [
      "ALL",
      "PENDING_PAYMENT",
      "PENDING_MODIFICATION",
      "PENDING_DISPOSITION",
      "DRAFT",
    ],
    producers: ["src/pages/my-requests/index.tsx"],
    valueSources: [
      {
        file: "src/pages/my-requests/index.tsx",
        identifier: "TOP_APPLICATION_TABS",
        selector: "array-property",
        property: "labelKey",
      },
    ],
  },
};

export const deletionEvidence = {
  "nma-terms-authority-2026-07-30": {
    status: "verified",
    verifiedAt: "2026-07-30",
    staticSearch: "SignUp and Media License static Terms consumers use the shared termsModal resource.",
    dynamicReview: "Terms sections use the fixed ordered section descriptor; no dynamic backend key producer is involved.",
    backendReview: "Footer Terms remains on getPolicyType(\"TermsConditions\") and is not replaced by this static resource.",
    browserReview: "English and Arabic SignUp Terms were checked at 1920px with nine section counts 3/6/8/3/1/1/1/1/2.",
  },
};

export const verifiedUnusedKeys = [];

const termsReplacementKeys = {
  "mediaLicensePage.TermsConditions.title": ["termsModal.title"],
  "mediaLicensePage.TermsConditions.close": ["common.close"],
  "mediaLicensePage.TermsConditions.introduction": ["termsModal.introduction"],
  "mediaLicensePage.TermsConditions.intro": [
    "termsModal.introParagraph1",
    "termsModal.introParagraph2",
  ],
  "mediaLicensePage.TermsConditions.firstTitle": ["termsModal.firstTitle"],
  "mediaLicensePage.TermsConditions.first1": ["termsModal.first1"],
  "mediaLicensePage.TermsConditions.first2": ["termsModal.first2"],
  "mediaLicensePage.TermsConditions.first3": ["termsModal.first3"],
  "mediaLicensePage.TermsConditions.secondTitle": ["termsModal.secondTitle"],
  "mediaLicensePage.TermsConditions.second1": ["termsModal.second1"],
  "mediaLicensePage.TermsConditions.second2": ["termsModal.second2"],
  "mediaLicensePage.TermsConditions.second3": ["termsModal.second3"],
  "mediaLicensePage.TermsConditions.second4": ["termsModal.second4"],
};

export const replacedResourceKeys = Object.fromEntries(
  Object.entries(termsReplacementKeys).map(([key, replacementKeys]) => [
    key,
    {
      replacementKeys,
      evidenceId: "nma-terms-authority-2026-07-30",
    },
  ]),
);

export const removedResourceKeys = [
  "termsModal.fourth4",
  "termsModal.fourth5",
  "termsModal.fourth6",
  "termsModal.fourth7",
  "termsModal.fourth8",
].map((key) => ({
  key,
  evidenceId: "nma-terms-authority-2026-07-30",
}));

export const visibleJsxAttributes = new Set([
  "aria-label",
  "cancelText",
  "copyButtonText",
  "content",
  "description",
  "emptyText",
  "headerLabel",
  "help",
  "label",
  "noteText",
  "noteTitle",
  "okText",
  "passwordLabel",
  "placeholder",
  "subtitle",
  "subTitle",
  "text",
  "title",
]);

export const hardcodedExcludedPathParts = [
  "/assets/",
  "/components/common/CountrySelect/constants.ts",
  "/designable/src/components/DataList/Setter/",
  "/designable/src/components/CountryDropdown/countries.ts",
  "/designable/src/components/DescriptionRichTextSetter/",
  "/designable/src/components/EquipmentList/Setter/",
  "/designable/src/components/FieldWidthSetter/",
  "/designable/src/components/Information/StyleSelector.tsx",
  "/designable/src/components/MultiSelectOptionsSetter/",
  "/designable/src/components/RestrictionSetter/",
  "/designable/src/components/SelectOptionsSetter/",
  "/designable/src/components/SelectTable/OptionsEditor.tsx",
  "/designable/src/components/UniqueValueSetter/",
  "/designable/src/components/WordLimitSetter/",
  "/example.tsx",
  "/preview.tsx",
  "/preview.ts",
  "/ruleStrategyPayload/",
  "/routes/",
];

export const hardcodedObjectPropertyExcludedPathParts = [
  "/designable/src/components/CustomizeAddress/CustomizeAddress.tsx",
  "/designable/src/components/IDSelector/idSelectorUtils.ts",
  "/designable/src/components/LanguageSelect/language.js",
  "/designable/src/components/LanguageSelectMulti/language.js",
  "/designable/src/components/UrlList/FilmsUrlsListField.tsx",
  "/designable/src/locales/",
  "/designable/src/schemas/",
];

export const allowedVisibleLiterals = new Set([
  "AR",
  "AED",
  "(AED)",
  "EN",
  "&gt;",
  "NMA",
  "OK",
  "PIN",
  "UAE PASS",
]);

export const expectedTermsSections = {
  first: 3,
  second: 6,
  third: 8,
  fourth: 3,
  fifth: 1,
  sixth: 1,
  seventh: 1,
  eighth: 1,
  ninth: 2,
};

export const authoritativeResourceHashes = {
  termsModal: {
    source:
      "https://srvstg.nma.gov.ae/#/app/MediaContentServices/PublicationsPrintingPermit/?establishmentId=8919",
    capturedOn: "2026-07-30",
    en: "640f851c7f368b5d6de07cbc737d79ad14971d61508842c89bb89be18ec862e7",
    ar: "6802f74d78c6b2275cb4b98a2b3a71880c22fcdf966ab8589a54c9ae4c2e034a",
  },
};
