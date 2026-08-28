import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createForm } from "@formily/core";
import { shouldLoadMediaLicenseProfile } from "../src/pages/MediaLicense/mediaLicenseProfileLoad.ts";
import {
  getFormValuesSignature,
  getSchemaDataSignature,
  shouldApplyFormValuesSignature,
} from "../src/components/common/FormliyView/formValuesState.ts";
import { normalizeSchemaComponentProps } from "../src/components/common/FormliyView/schemaLocalization.ts";
import {
  buildContactNumberFields,
  createContactNumberSnapshot,
  resolveContactNumberValidationValue,
} from "../src/components/common/MobileNumberInput/contactNumber.ts";
import { validateMobileNumber } from "../src/components/common/MobileNumberInput/utils.ts";
import { createPersonalProfileEditPolicy } from "../src/pages/PersonalProfile/utils/expiryUtils.ts";
import {
  applyTradeLicenseMode,
  getProfileFormFieldClassName,
  getOriginalTradeLicenseMode,
  getProfileDraftForContext,
  resolveProfileDraftContextKey,
  shouldInitializeProfileForm,
  shouldAttemptProfileAddressSourceInitialization,
  getProfileFormValidationErrors,
  getProfileFormSourceAddress,
  hasProfileFormSchema,
  isProfileFormSourceBaselinePending,
  mapProfileFormSource,
  mapResolvedProfileFormSource,
  mergeResolvedProfileFormSourceBaseline,
  normalizeProfileFormBranches,
  requiresProfileFormSourceAddressLookup,
  resolveProfileFormSourceBaseline,
  resolveProfileFormAddress,
  shouldReportProfileAddressResolutionFailure,
} from "../src/components/designable/src/components/ProfileForm/profileFormRules.ts";
import * as profileFormRules from "../src/components/designable/src/components/ProfileForm/profileFormRules.ts";

import {
  mapPartnerToApiPartner,
  normalizeEstablishmentPartnersApiRow,
} from "../src/pages/EstablishmentProfile/utils/formHelpers.ts";

const emirates = [
  { id: 1, nameEn: "Abu Dhabi" },
  { id: 2, nameEn: "Dubai" },
];

const source = {
  licenseNumber: "CN-10",
  trnumber: "TR-20",
  licenseExpiryDate: "2026-12-31",
  licenseCopyUrl: "license.pdf",
  establishmentTypeName: "Commercial",
  emails: "profile@example.ae",
  nameAr: "Arabic name",
  nameEn: "English name",
  authorityIdName: "Authority",
  establishmentMobile: "+971500000000",
  tenancyContractEndDate: "2026-06-30",
  tenancyContractCopyUrl: "tenancy.pdf",
  memorandumOfAssociationCopyUrl: "memorandum.pdf",
  powerOfAttorneyCopyUrl: "power.pdf",
  establishmentEmirateId: 2,
  establishmentEmirateName: "Dubai",
  emirate: "Abu Dhabi",
  region: "Region",
  area: "Area",
  street: "Street",
};

const requiredEstablishmentValues = {
  establishmentSubTypes: "Commercial",
  establishmentNameArabic: "Arabic name",
  establishmentNameEnglish: "English name",
  establishmentEmirateName: "Abu Dhabi",
  licensingAuthority: "Authority",
  phoneNumber: "+971500000000",
};

const validCommercialProfileValues = {
  ...requiredEstablishmentValues,
  hasTradeLicense: true,
  emirate: 1,
  commercialLicenseNumber: "CN-10",
  licenseExpiryDate: "2026-12-31",
  commercialLicense: "license.pdf",
};

test("allows readonly Emirates ID verification only for pending third-party completion", () => {
  assert.equal(
    createPersonalProfileEditPolicy({
      mode: "edit",
      pageMode: "pendingCompletion",
      initialVerificationComplete: false,
      detailThirdPartyIcpEnabled: true,
      profileVerificationMethod: 1,
    }).allowReadonlyIdentityVerification,
    true,
  );

  const disallowedCases = [
    {
      mode: "add",
      pageMode: "pendingCompletion",
      detailThirdPartyIcpEnabled: true,
      profileVerificationMethod: 1,
    },
    {
      mode: "edit",
      pageMode: "approved",
      detailThirdPartyIcpEnabled: true,
      profileVerificationMethod: 1,
    },
    {
      mode: "edit",
      pageMode: "pendingCompletion",
      detailThirdPartyIcpEnabled: false,
      profileVerificationMethod: 1,
    },
    {
      mode: "edit",
      pageMode: "pendingCompletion",
      detailThirdPartyIcpEnabled: true,
      profileVerificationMethod: 2,
    },
  ] as const;

  disallowedCases.forEach((testCase) => {
    assert.equal(
      createPersonalProfileEditPolicy({
        ...testCase,
        initialVerificationComplete: false,
      }).allowReadonlyIdentityVerification,
      false,
    );
  });
});

test("derives original mode from license number before reserve trade number", () => {
  assert.equal(getOriginalTradeLicenseMode(source), true);
  assert.equal(getOriginalTradeLicenseMode({ trnumber: "TR-20" }), false);
  assert.equal(getOriginalTradeLicenseMode({}), undefined);
});

test("treats a missing profile response as an empty profile source", () => {
  const missingSource = null as unknown as typeof source;

  assert.equal(getOriginalTradeLicenseMode(missingSource), undefined);
  assert.doesNotThrow(() => mapProfileFormSource(missingSource));
  assert.equal(mapProfileFormSource(missingSource).commercialLicenseNumber, undefined);
});

test("uses an initial draft only for the profile context that owns it", () => {
  const draft = {
    hasTradeLicense: true,
    establishmentNameEnglish: "Saved establishment",
  };

  assert.equal(
    getProfileDraftForContext(draft, "profile-1", "profile-2"),
    undefined,
  );
  assert.deepEqual(
    getProfileDraftForContext(draft, "profile-1", "profile-1"),
    draft,
  );
});

test("captures the first non-empty profile context for the initial draft", () => {
  assert.equal(resolveProfileDraftContextKey(undefined, ""), undefined);
  assert.equal(
    resolveProfileDraftContextKey(undefined, "profile-1"),
    "profile-1",
  );
  assert.equal(
    resolveProfileDraftContextKey("profile-1", "profile-2"),
    "profile-1",
  );
});

test("splits a recognized legacy establishment mobile for display without rewriting unchanged storage", () => {
  const initial = createContactNumberSnapshot({
    fullNumber: "+971501234567",
  });

  assert.deepEqual(initial.value, {
    countryCode: "+971",
    phoneNumber: "501234567",
  });
  assert.equal(initial.sourceMode, "legacy");
  assert.deepEqual(
    buildContactNumberFields({
      value: initial.value,
      initial,
      keys: {
        fullNumber: "phoneNumber",
        countryCode: "phoneNumberCountryCode",
        localNumber: "phoneNumberLocalNumber",
      },
    }),
    {
      phoneNumber: "+971501234567",
      phoneNumberCountryCode: "",
      phoneNumberLocalNumber: "",
    },
  );
});

test("keeps an unsupported legacy calling code unresolved", () => {
  const initial = createContactNumberSnapshot({
    fullNumber: "+999123456",
  });

  assert.deepEqual(initial.value, {
    countryCode: "",
    phoneNumber: "+999123456",
  });
  assert.equal(initial.sourceMode, "legacy");
});

test("resolves the displayed default country code for local-only validation", () => {
  assert.deepEqual(
    resolveContactNumberValidationValue({
      fullNumber: "551529931",
      defaultCountryCode: "+971",
    }),
    {
      countryCode: "+971",
      phoneNumber: "551529931",
    },
  );
});

test("preserves explicit and international country codes during validation", () => {
  assert.deepEqual(
    resolveContactNumberValidationValue({
      countryCode: "+44",
      localNumber: "7911123456",
      fullNumber: "551529931",
      defaultCountryCode: "+971",
    }),
    {
      countryCode: "+44",
      phoneNumber: "7911123456",
    },
  );
  assert.deepEqual(
    resolveContactNumberValidationValue({
      fullNumber: "+971551529931",
      defaultCountryCode: "+44",
    }),
    {
      countryCode: "+971",
      phoneNumber: "551529931",
    },
  );
});

test("uses an explicit country code with a local-only full-number field", () => {
  assert.deepEqual(
    resolveContactNumberValidationValue({
      countryCode: "+44",
      fullNumber: "7911123456",
      defaultCountryCode: "+971",
    }),
    {
      countryCode: "+44",
      phoneNumber: "7911123456",
    },
  );
});

test("keeps an explicit country code ahead of a conflicting international full number", () => {
  assert.deepEqual(
    resolveContactNumberValidationValue({
      countryCode: "+44",
      fullNumber: "+971551529931",
      defaultCountryCode: "+971",
    }),
    {
      countryCode: "+44",
      phoneNumber: "551529931",
    },
  );
});

test("keeps an explicitly unsupported international number invalid", () => {
  const validationValue = resolveContactNumberValidationValue({
    fullNumber: "+999123456",
    defaultCountryCode: "+971",
  });

  assert.equal(validationValue, "+999123456");
  assert.equal(
    validateMobileNumber(validationValue).errorCode,
    "INVALID_COUNTRY",
  );
});

test("keeps empty and malformed local numbers invalid", () => {
  assert.equal(
    validateMobileNumber(
      resolveContactNumberValidationValue({
        defaultCountryCode: "+971",
      }),
    ).errorCode,
    "REQUIRED",
  );
  assert.equal(
    validateMobileNumber(
      resolveContactNumberValidationValue({
        fullNumber: "1",
        defaultCountryCode: "+971",
      }),
    ).errorCode,
    "TOO_SHORT",
  );
});

test("does not rewrite an unchanged local-only legacy mobile", () => {
  const initial = createContactNumberSnapshot({
    fullNumber: "551529931",
  });

  assert.deepEqual(
    buildContactNumberFields({
      value: initial.value,
      initial,
      keys: {
        fullNumber: "phoneNumber",
        countryCode: "phoneNumberCountryCode",
        localNumber: "phoneNumberLocalNumber",
      },
    }),
    {
      phoneNumber: "551529931",
      phoneNumberCountryCode: "",
      phoneNumberLocalNumber: "",
    },
  );
});

test("does not initialize split storage for a local-only dynamic mobile", () => {
  const mobileNumberInputFieldSource = readFileSync(
    "src/components/designable/src/components/MobileNumberInput/MobileNumberInputField.tsx",
    "utf8",
  );

  assert.match(
    mobileNumberInputFieldSource,
    /if \(\s*!isLegacyValue \|\|\s*!snapshot\.value\.countryCode \|\|\s*storedCountryCode\s*\)\s*\{\s*return;\s*\}/,
  );
});

test("uses the resolved country code for composite and dynamic display", () => {
  const compositeFieldSource = readFileSync(
    "src/components/designable/src/components/MobileNumberInput/CompositeMobileNumberField.tsx",
    "utf8",
  );
  const dynamicFieldSource = readFileSync(
    "src/components/designable/src/components/MobileNumberInput/MobileNumberInputField.tsx",
    "utf8",
  );

  assert.match(compositeFieldSource, /displayValidationCountryCode/);
  assert.match(dynamicFieldSource, /currentValidationCountryCode/);
});

test("validates a local-only legacy establishment mobile with the default country code", () => {
  assert.equal(
    profileFormRules.isValidProfileMobileNumber({
      phoneNumber: "551529931",
    }),
    true,
  );
});

test("reinitializes after FormliyView reapplies saved form data", () => {
  assert.equal(shouldInitializeProfileForm(undefined, 0, true, false), true);
  assert.equal(shouldInitializeProfileForm(0, 0, true, false), false);
  assert.equal(shouldInitializeProfileForm(0, 1, true, false), true);
  assert.equal(shouldInitializeProfileForm(undefined, 1, false, false), false);
  assert.equal(shouldInitializeProfileForm(undefined, 1, true, true), false);
});

test("isolates each Profile Form field validation state", () => {
  const errors = ["commercialLicenseNumber", "licenseExpiryDate"];

  assert.equal(
    getProfileFormFieldClassName(
      "commercialLicenseNumber",
      errors,
      true,
    ),
    "profile-form__field profile-form__field--error",
  );
  assert.equal(
    getProfileFormFieldClassName("workEmail", errors, true),
    "profile-form__field profile-form__field--valid",
  );
  assert.equal(
    getProfileFormFieldClassName("commercialLicenseNumber", errors, false),
    "profile-form__field profile-form__field--valid",
  );
});

test("requires every starred Profile Form field and keeps optional fields optional", () => {
  const requiredFields = [
    "establishmentSubTypes",
    "establishmentNameArabic",
    "establishmentNameEnglish",
    "establishmentEmirateName",
    "licensingAuthority",
    "hasTradeLicense",
    "commercialLicenseNumber",
    "licenseExpiryDate",
    "phoneNumber",
    "commercialLicense",
  ] as const;

  assert.deepEqual(
    getProfileFormValidationErrors(validCommercialProfileValues, emirates),
    [],
  );

  requiredFields.forEach((fieldName) => {
    const values: Record<string, unknown> = {
      ...validCommercialProfileValues,
    };
    delete values[fieldName];
    assert.ok(
      getProfileFormValidationErrors(values, emirates).includes(fieldName),
      `${fieldName} should be required`,
    );
  });

  assert.deepEqual(
    getProfileFormValidationErrors(
      {
        ...validCommercialProfileValues,
        workEmail: undefined,
        tenancyContractEndDate: undefined,
        tenancyContract: undefined,
        memorandumOfAssociation: undefined,
        powerOfAttorney: undefined,
      },
      emirates,
    ),
    [],
  );
});

test("keeps service 903 Activities optional without weakening other services", () => {
  const selectTableSource = readFileSync(
    "src/components/designable/src/components/SelectTable/SelectTableField.tsx",
    "utf8",
  );
  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );

  assert.match(
    selectTableSource,
    /const isActivitySelectionRequired = !isService903;/,
  );
  assert.match(
    selectTableSource,
    /field\.required = isActivitySelectionRequired;/,
  );
  assert.match(
    selectTableSource,
    /isActivitySelectionRequired \? requiredValidator : undefined/,
  );
  assert.match(selectTableSource, /code: "ValidateError", messages: \[\]/);
  assert.match(
    selectTableSource,
    /required=\{isActivitySelectionRequired\}/,
  );
  assert.doesNotMatch(
    mediaLicenseSource,
    /Please add a new activity to proceed\./,
  );
});

test("marks custom validation errors for page-level first-error scrolling", () => {
  const profileFormSource = readFileSync(
    "src/components/designable/src/components/ProfileForm/ProfileFormField.tsx",
    "utf8",
  );
  const addressPickerSource = readFileSync(
    "src/components/designable/src/components/AddressPicker/AddressPicker.tsx",
    "utf8",
  );
  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );

  assert.match(profileFormSource, /data-form-validation-error="true"/);
  assert.match(addressPickerSource, /data-form-validation-error="true"/);
  assert.match(
    mediaLicenseSource,
    /querySelectorAll<HTMLElement>\(\s*["']\[data-form-validation-error="true"\], \.FormliyView \.ant-formily-item-error["'],?\s*\)/,
  );
  assert.match(
    mediaLicenseSource,
    /element\.dataset\.formValidationError === "true"/,
  );
  assert.match(
    mediaLicenseSource,
    /!element\.querySelector\(\s*["']\[data-form-validation-error="true"\]["'],?\s*\)/,
  );
});

test("attempts address source initialization once per source revision", () => {
  assert.equal(
    shouldAttemptProfileAddressSourceInitialization(
      undefined,
      1,
      true,
      true,
      true,
    ),
    true,
  );
  assert.equal(
    shouldAttemptProfileAddressSourceInitialization(1, 1, true, true, true),
    false,
  );
  assert.equal(
    shouldAttemptProfileAddressSourceInitialization(1, 2, true, true, true),
    true,
  );
  assert.equal(
    shouldAttemptProfileAddressSourceInitialization(1, 2, true, false, true),
    false,
  );
});

test("uses a stable context bridge for Profile Form runtime updates", () => {
  const formliyViewSource = readFileSync(
    "src/components/common/FormliyView/index.tsx",
    "utf8",
  );

  assert.match(formliyViewSource, /ProfileFormBridgeContext\.Provider/);
  assert.match(formliyViewSource, /ProfileForm:\s*ProfileFormBridge/);
  assert.doesNotMatch(
    formliyViewSource,
    /ProfileForm:\s*\(props:\s*ComponentBridgeProps\)/,
  );
});

test("reapplies Formily values only when their stable signature changes", () => {
  const previousSignature = getFormValuesSignature({
    profileForm: { workEmail: "saved@example.ae" },
  });
  const schemaOnlySignature = getFormValuesSignature({
    profileForm: { workEmail: "saved@example.ae" },
  });
  const changedValuesSignature = getFormValuesSignature({
    profileForm: { workEmail: "changed@example.ae" },
  });

  assert.equal(
    shouldApplyFormValuesSignature(previousSignature, schemaOnlySignature),
    false,
  );
  assert.equal(
    shouldApplyFormValuesSignature(previousSignature, changedValuesSignature),
    true,
  );
  assert.equal(getFormValuesSignature(undefined), "{}");
});

test("keeps the schema signature independent from form values", () => {
  const schemaPayload = {
    form: { labelCol: 4, wrapperCol: 14 },
    schema: { type: "object", properties: {} },
  };
  const firstSignature = getSchemaDataSignature({
    ...schemaPayload,
    formValues: { profileForm: { workEmail: "first@example.ae" } },
  });
  const changedValuesSignature = getSchemaDataSignature({
    ...schemaPayload,
    formValues: { profileForm: { workEmail: "changed@example.ae" } },
  });
  const changedSchemaSignature = getSchemaDataSignature({
    ...schemaPayload,
    schema: { type: "object", properties: { added: {} } },
    formValues: { profileForm: { workEmail: "first@example.ae" } },
  });

  assert.equal(firstSignature, changedValuesSignature);
  assert.notEqual(firstSignature, changedSchemaSignature);
});

test("waits for a permit lifecycle application id before loading Profile data", () => {
  assert.equal(
    shouldLoadMediaLicenseProfile({
      routeAction: "",
      hasRouteApplicationId: false,
      applicationId: null,
    }),
    true,
  );
  assert.equal(
    shouldLoadMediaLicenseProfile({
      routeAction: "MODIFY",
      hasRouteApplicationId: false,
      applicationId: null,
    }),
    false,
  );
  assert.equal(
    shouldLoadMediaLicenseProfile({
      routeAction: "MODIFY",
      hasRouteApplicationId: false,
      applicationId: 394,
    }),
    true,
  );
});

test("guards the Media License Profile request without blocking service loading", () => {
  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );

  assert.match(
    mediaLicenseSource,
    /if \(\s*shouldLoadMediaLicenseProfile\([\s\S]*?\)\s*\) \{\s*await loadProfileInfo\(\);\s*\}/,
  );
});

test("separates Formily schema updates from value resets", () => {
  const formliyViewSource = readFileSync(
    "src/components/common/FormliyView/index.tsx",
    "utf8",
  );

  assert.match(
    formliyViewSource,
    /const lastAppliedFormValuesSignatureRef = useRef<string>\(""\);/,
  );
  assert.match(
    formliyViewSource,
    /const initialValues = useMemo\([\s\S]*?\[formValuesSignature\],\s*\);/,
  );
  assert.match(
    formliyViewSource,
    /const form = useMemo\([\s\S]*?\[serviceCode\],\s*\);/,
  );
  assert.match(
    formliyViewSource,
    /const shouldApplyFormValues = shouldApplyFormValuesSignature\([\s\S]*?if \(shouldApplyFormValues\) \{[\s\S]*?form\.setInitialValues\(initialValues, "overwrite"\);[\s\S]*?form\.reset\(\);[\s\S]*?setFormDataRevision/,
  );
  assert.match(formliyViewSource, /getSchemaDataSignature\(parsedFormData\)/);
  assert.doesNotMatch(formliyViewSource, /`\$\{Moss\.formData\}::/);
});

test("updates the Formily schema without forcing an empty unmount frame", () => {
  const formliyViewSource = readFileSync(
    "src/components/common/FormliyView/index.tsx",
    "utf8",
  );

  assert.doesNotMatch(formliyViewSource, /setIsSchemaFieldMounted\(false\)/);
  assert.doesNotMatch(formliyViewSource, /clearFormGraph/);
  assert.doesNotMatch(formliyViewSource, /pendingSchemaDataRef/);
  assert.doesNotMatch(formliyViewSource, /key=\{appliedSchemaSignature\}/);
  assert.match(formliyViewSource, /setSchemaData\(/);
});

test("keeps Formily pattern synchronized without recreating the form", () => {
  const formliyViewSource = readFileSync(
    "src/components/common/FormliyView/index.tsx",
    "utf8",
  );

  assert.match(
    formliyViewSource,
    /form\.setPattern\(disabled \? "disabled" : "editable"\);/,
  );
});

test("nests Address Picker exactly once under Profile Form", () => {
  const form = createForm();
  const profileField = form.createField({ name: "profileForm" });
  const addressField = form.createField({
    basePath: profileField.address,
    name: "addressPicker",
  });
  const profileFormSource = readFileSync(
    "src/components/designable/src/components/ProfileForm/ProfileFormField.tsx",
    "utf8",
  );

  assert.equal(addressField.address.toString(), "profileForm.addressPicker");
  assert.match(profileFormSource, /<Field\s+name="addressPicker"/);
  assert.doesNotMatch(profileFormSource, /name=\{field\.address\.concat/);
});

test("guards Address Picker lookup updates after unmount", () => {
  const addressPickerSource = readFileSync(
    "src/components/designable/src/components/AddressPicker/AddressPicker.tsx",
    "utf8",
  );

  assert.match(addressPickerSource, /let isActive = true;/);
  assert.match(
    addressPickerSource,
    /return \(\) => \{\s*isActive = false;\s*\};/,
  );
});

test("does not mutate Address Picker hierarchy in a locked Formily pattern", () => {
  const addressPickerSource = readFileSync(
    "src/components/designable/src/components/AddressPicker/AddressPicker.tsx",
    "utf8",
  );

  assert.match(
    addressPickerSource,
    /const isDisabled =[\s\S]*?isLockedPattern\(form\.pattern\);/,
  );
  assert.match(
    addressPickerSource,
    /if \(\s*!isDisabled &&\s*Number\(value\.emirateId\) !== 1/,
  );
});

test("finishes Profile Form initialization before setting the Formily value", () => {
  const profileFormSource = readFileSync(
    "src/components/designable/src/components/ProfileForm/ProfileFormField.tsx",
    "utf8",
  );

  assert.doesNotMatch(profileFormSource, /\[initialized, setInitialized\]/);
  assert.doesNotMatch(profileFormSource, /addressSourceRevision/);
  assert.match(
    profileFormSource,
    /if \(!profileLoaded\) \{\s*initializedRevisionRef\.current = undefined;\s*profileSourceBaselineRef\.current = undefined;/,
  );
  assert.match(
    profileFormSource,
    /sourceAddressEnabledRef\.current = !hasSavedAddress;\s*field\.setValue\(activeValues\);\s*profileSourceBaselineRef\.current = activeValues;\s*onProfileSourceResolved\?\.\(activeValues\);/,
  );
  assert.match(
    profileFormSource,
    /const resolvedBaseline = mergeResolvedProfileFormSourceBaseline\(\s*profileSourceBaselineRef\.current \|\|\s*mapProfileFormSource\(safeProfileInfo\),\s*addressPicker,\s*\);\s*profileSourceBaselineRef\.current = resolvedBaseline;\s*onProfileSourceResolved\?\.\(resolvedBaseline\);/,
  );
  assert.match(
    profileFormSource,
    /!profileLoaded \|\| initializedRevisionRef\.current === undefined/,
  );
  assert.match(
    profileFormSource,
    /sourceRevision: initializedRevisionRef\.current \?\? 0/,
  );
  assert.match(profileFormSource, /sourceReady: profileLoaded/);

  const addressPickerSource = readFileSync(
    "src/components/designable/src/components/AddressPicker/AddressPicker.tsx",
    "utf8",
  );
  assert.match(
    addressPickerSource,
    /if \(!props\.sourceReady\) \{\s*resolvedSourceAddressRef\.current = undefined;/,
  );
  assert.match(
    addressPickerSource,
    /resolvedSourceAddressRef\.current === sourceAddress/,
  );
});

test("normalizes an explicit null profile before Profile Form initialization", () => {
  const profileFormSource = readFileSync(
    "src/components/designable/src/components/ProfileForm/ProfileFormField.tsx",
    "utf8",
  );

  assert.match(
    profileFormSource,
    /const safeProfileInfo = useMemo\(\(\) => profileInfo \|\| \{\}, \[profileInfo\]\);/,
  );
  assert.match(
    profileFormSource,
    /getProfileFormSourceAddress\(safeProfileInfo\)/,
  );
  assert.match(
    profileFormSource,
    /getOriginalTradeLicenseMode\(safeProfileInfo\)/,
  );
  assert.match(
    profileFormSource,
    /mapProfileFormSource\(safeProfileInfo, savedValues\)/,
  );
});

test("does not allow an original commercial license to switch to reserve trade", () => {
  const values = { hasTradeLicense: true, workEmail: "kept@example.ae" };

  assert.deepEqual(
    applyTradeLicenseMode(values, true, false, {
      reserveTradeNumber: "TR-20",
    }),
    values,
  );
});

test("clears only entered commercial values when returning to reserve trade", () => {
  const reserveValues = {
    hasTradeLicense: false,
    reserveTradeNumber: "TR-20",
    reserveTradeName: "Reserve name",
    workEmail: "kept@example.ae",
    addressPicker: { street: "Kept street" },
  };
  const reserveCache = {
    reserveTradeNumber: "TR-20",
    reserveTradeName: "Reserve name",
  };
  const activeYesValues = applyTradeLicenseMode(
    reserveValues,
    false,
    true,
    reserveCache,
  );
  assert.equal("reserveTradeNumber" in activeYesValues, false);
  assert.equal("reserveTradeName" in activeYesValues, false);

  const values = {
    ...activeYesValues,
    commercialLicenseNumber: "CN-99",
    licenseExpiryDate: "2028-01-01",
    commercialLicense: "new-license.pdf",
  };

  assert.deepEqual(applyTradeLicenseMode(values, false, false, reserveCache), {
    hasTradeLicense: false,
    reserveTradeNumber: "TR-20",
    reserveTradeName: "Reserve name",
    workEmail: "kept@example.ae",
    addressPicker: { street: "Kept street" },
  });
});

test("normalizes active license branches at persistence boundaries", () => {
  class NonPlainValue {
    readonly value = "2026-12-31";
  }
  const nonPlainValue = new NonPlainValue();
  const normalized = normalizeProfileFormBranches({
    nonPlainValue,
    section: {
      profile: {
        hasTradeLicense: true,
        commercialLicenseNumber: "CN-10",
        reserveTradeNumber: "TR-20",
        reserveTradeName: "reserve.pdf",
      },
      rows: [
        {
          hasTradeLicense: false,
          commercialLicenseNumber: "CN-20",
          licenseExpiryDate: "2026-12-31",
          commercialLicense: "commercial.pdf",
          reserveTradeNumber: "TR-30",
          reserveTradeName: "reserve-2.pdf",
        },
      ],
    },
  }) as Record<string, unknown>;

  assert.equal(normalized.nonPlainValue, nonPlainValue);
  assert.deepEqual(normalized.section, {
    profile: {
      hasTradeLicense: true,
      commercialLicenseNumber: "CN-10",
    },
    rows: [
      {
        hasTradeLicense: false,
        reserveTradeNumber: "TR-30",
        reserveTradeName: "reserve-2.pdf",
      },
    ],
  });

  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );
  assert.equal(
    mediaLicenseSource.match(/normalizeProfileFormBranches\(/g)?.length,
    2,
  );
});

test("keeps saved profile values while deriving the original lock from source", () => {
  const mapped = mapProfileFormSource(source, {
    hasTradeLicense: false,
    commercialLicenseNumber: "draft-number",
    addressPicker: { street: "Draft street" },
  });

  assert.equal(getOriginalTradeLicenseMode(source), true);
  assert.equal(mapped.hasTradeLicense, true);
  assert.equal(mapped.commercialLicenseNumber, "draft-number");
  assert.deepEqual(mapped.addressPicker, { street: "Draft street" });
});

test("strips legacy source address metadata from saved values", () => {
  const mapped = mapProfileFormSource(source, {
    sourceAddress: { emirate: "Legacy Emirate" },
    addressEmirate: "Legacy Emirate",
    addressRegion: "Legacy Region",
    addressArea: "Legacy Area",
    addressStreet: "Legacy Street",
    addressPicker: { street: "Saved nested street" },
  });
  for (const legacyKey of [
    "sourceAddress",
    "addressEmirate",
    "addressRegion",
    "addressArea",
    "addressStreet",
  ]) {
    assert.equal(legacyKey in mapped, false);
  }
  assert.deepEqual(mapped.addressPicker, { street: "Saved nested street" });
});

test("maps confirmed source fields with nested address and no reserve attachment", () => {
  const mapped = mapProfileFormSource(source);

  assert.deepEqual(mapped, {
    hasTradeLicense: true,
    commercialLicenseNumber: "CN-10",
    reserveTradeNumber: "TR-20",
    licenseExpiryDate: "2026-12-31",
    commercialLicense: "license.pdf",
    reserveTradeName: "",
    establishmentSubTypes: "Commercial",
    workEmail: "profile@example.ae",
    establishmentNameArabic: "Arabic name",
    establishmentNameEnglish: "English name",
    licensingAuthority: "Authority",
    phoneNumber: "+971500000000",
    phoneNumberCountryCode: undefined,
    phoneNumberLocalNumber: undefined,
    tenancyContractEndDate: "2026-06-30",
    tenancyContract: "tenancy.pdf",
    memorandumOfAssociation: "memorandum.pdf",
    powerOfAttorney: "power.pdf",
    emirate: 2,
    establishmentEmirateName: "Dubai",
  });
  assert.equal("sourceAddress" in mapped, false);
  assert.equal("reserveTradeAttachment" in mapped, false);
  assert.equal("addressEmirate" in mapped, false);
  assert.equal("addressRegion" in mapped, false);
  assert.equal("addressArea" in mapped, false);
  assert.equal("addressStreet" in mapped, false);
});

test("uses the lookup-resolved source address as the Modify profile baseline", () => {
  const mapped = mapResolvedProfileFormSource(source, {
    emirateId: 1,
    regionId: 10,
    areaId: 100,
    street: "Street",
  });

  assert.deepEqual(mapped.addressPicker, {
    emirateId: 1,
    regionId: 10,
    areaId: 100,
    street: "Street",
  });
  assert.equal(mapped.establishmentNameEnglish, "English name");
});

test("keeps a named source address pending until lookup resolution", () => {
  const draftAddress = {
    emirateId: 1,
    regionId: 10,
    areaId: 100,
    street: "Street",
  };
  const unresolvedBaseline = resolveProfileFormSourceBaseline(
    source,
    undefined,
  );

  assert.equal(unresolvedBaseline, undefined);
  assert.equal(
    isProfileFormSourceBaselinePending(
      true,
      true,
      source,
      unresolvedBaseline,
    ),
    true,
  );

  const resolvedSource = mapResolvedProfileFormSource(source, draftAddress);
  assert.deepEqual(
    resolveProfileFormSourceBaseline(source, resolvedSource)?.addressPicker,
    draftAddress,
  );
  assert.equal(
    isProfileFormSourceBaselinePending(true, true, source, resolvedSource),
    false,
  );
});

test("uses numeric source address ids without waiting for lookup resolution", () => {
  const numericSource = {
    ...source,
    emirate: 1,
    region: 10,
    area: 100,
  };
  const baseline = resolveProfileFormSourceBaseline(numericSource, undefined);

  assert.deepEqual(baseline?.addressPicker, {
    emirateId: 1,
    regionId: 10,
    areaId: 100,
    street: "Street",
  });
  assert.equal(
    isProfileFormSourceBaselinePending(true, true, numericSource, baseline),
    false,
  );
  assert.equal(requiresProfileFormSourceAddressLookup(numericSource), false);
});

test("normalizes numeric non-Abu Dhabi source addresses without regionId", () => {
  const numericSource = {
    ...source,
    emirate: 2,
    region: 20,
    area: 200,
  };
  const baseline = resolveProfileFormSourceBaseline(numericSource, undefined);

  assert.deepEqual(baseline?.addressPicker, {
    emirateId: 2,
    areaId: 200,
    street: "Street",
  });
});

test("preserves the initial profile value when source address resolution completes", () => {
  const baseline = {
    establishmentNameArabic: "Baseline Arabic name",
    addressPicker: { street: "Initial street" },
  };

  const resolved = mergeResolvedProfileFormSourceBaseline(baseline, {
    emirateId: 1,
    regionId: 10,
    areaId: 100,
  });

  assert.equal(
    resolved.establishmentNameArabic,
    baseline.establishmentNameArabic,
  );
  assert.deepEqual(resolved.addressPicker, {
    emirateId: 1,
    regionId: 10,
    areaId: 100,
    street: "Initial street",
  });
});

test("uses a source with no address as an immediate empty address baseline", () => {
  const sourceWithoutAddress = {
    ...source,
    emirate: undefined,
    region: undefined,
    area: undefined,
    street: undefined,
  };
  const baseline = resolveProfileFormSourceBaseline(
    sourceWithoutAddress,
    undefined,
  );

  assert.equal(requiresProfileFormSourceAddressLookup(sourceWithoutAddress), false);
  assert.equal(baseline?.addressPicker, undefined);
  assert.equal(
    isProfileFormSourceBaselinePending(
      true,
      true,
      sourceWithoutAddress,
      baseline,
    ),
    false,
  );
});

test("maps only numeric source address identifiers into address picker ids", () => {
  const mapped = mapProfileFormSource({
    ...source,
    emirate: 1,
    region: "2",
    area: 3,
    latitude: 24.4539,
    longitude: 54.3773,
  });

  assert.deepEqual(mapped.addressPicker, {
    emirateId: 1,
    regionId: 2,
    areaId: 3,
    street: "Street",
    latitude: 24.4539,
    longitude: 54.3773,
  });
});

test("maps profile coordinates only when both values are valid", () => {
  const completeAddress = getProfileFormSourceAddress({
    ...source,
    latitude: 24.4539,
    longitude: 54.3773,
  });
  const incompleteAddress = getProfileFormSourceAddress({
    ...source,
    latitude: 24.4539,
    longitude: null,
  });

  assert.deepEqual(completeAddress, {
    emirate: "Abu Dhabi",
    region: "Region",
    area: "Area",
    street: "Street",
    latitude: 24.4539,
    longitude: 54.3773,
  });
  assert.deepEqual(incompleteAddress, {
    emirate: "Abu Dhabi",
    region: "Region",
    area: "Area",
    street: "Street",
  });
});

test("returns an empty source address when the profile source is unavailable", () => {
  assert.deepEqual(getProfileFormSourceAddress(null), {});
});

test("keeps confirmed source address names separate for later resolution", () => {
  assert.deepEqual(getProfileFormSourceAddress(source), {
    emirate: "Abu Dhabi",
    region: "Region",
    area: "Area",
    street: "Street",
  });
});

test("resolves address names exactly within their parent hierarchy", () => {
  const resolved = resolveProfileFormAddress(
    {
      emirate: " abu dhabi ",
      region: "REGION",
      area: "Area",
      street: "Street",
      latitude: 24.4539,
      longitude: 54.3773,
    },
    [
      { id: 1, nameEn: "Abu Dhabi", nameAr: "أبوظبي" },
      { id: 2, nameEn: "Dubai", nameAr: "دبي" },
    ],
    [
      { id: 20, emirateId: 2, nameEn: "Region", nameAr: "منطقة دبي" },
      { id: 10, emirateId: 1, nameEn: "Region", nameAr: "منطقة" },
    ],
    [
      { id: 200, regionId: 20, nameEn: "Area", nameAr: "منطقة دبي" },
      { id: 100, regionId: 10, nameEn: "Area", nameAr: "منطقة" },
    ],
  );

  assert.deepEqual(resolved, {
    emirateId: 1,
    regionId: 10,
    areaId: 100,
    street: "Street",
    latitude: 24.4539,
    longitude: 54.3773,
  });
});

test("resolves non-Abu Dhabi area names without retaining regionId", () => {
  const resolvedAddress = resolveProfileFormAddress(
    {
      emirate: "Dubai",
      region: "Dubai Region",
      area: "Dubai Area",
      street: "Street",
    },
    [
      { id: 1, nameEn: "Abu Dhabi", nameAr: "أبوظبي" },
      { id: 2, nameEn: "Dubai", nameAr: "دبي" },
    ],
    [
      { id: 10, emirateId: 1, nameEn: "Abu Dhabi Region", nameAr: "منطقة" },
      { id: 20, emirateId: 2, nameEn: "Dubai Region", nameAr: "منطقة دبي" },
    ],
    [
      { id: 100, regionId: 10, nameEn: "Dubai Area", nameAr: "منطقة" },
      { id: 200, regionId: 20, nameEn: "Dubai Area", nameAr: "منطقة دبي" },
    ],
  );
  const mapped = mapResolvedProfileFormSource(
    { ...source, emirate: "Dubai", region: "Dubai Region", area: "Dubai Area" },
    { ...resolvedAddress, regionId: 20 },
  );

  assert.deepEqual(resolvedAddress, {
    emirateId: 2,
    areaId: 200,
    street: "Street",
  });
  assert.deepEqual(mapped.addressPicker, resolvedAddress);
});

test("detects ProfileForm only in the schema step that declares it", () => {
  const socialOnlyStep = {
    formData: JSON.stringify({
      schema: {
        properties: {
          social: { "x-component": "SocialMediaAccount" },
        },
      },
    }),
  };
  const laterProfileStep = {
    formData: JSON.stringify({
      schema: {
        properties: {
          profile: { "x-component": "ProfileForm" },
        },
      },
    }),
  };

  assert.equal(hasProfileFormSchema([socialOnlyStep]), false);
  assert.equal(hasProfileFormSchema([socialOnlyStep, laterProfileStep]), true);
  assert.equal(hasProfileFormSchema([laterProfileStep]), true);
  assert.equal(hasProfileFormSchema([{ formData: "{" }]), false);
});

test("hides the outer Formily label for ProfileForm without affecting ordinary fields", () => {
  const normalized = normalizeSchemaComponentProps({
    type: "object",
    properties: {
      profile: {
        title: "Establishment Information",
        "x-decorator": "FormItem",
        "x-component": "ProfileForm",
      },
      email: {
        title: "Work Email",
        "x-decorator": "FormItem",
        "x-component": "Input",
      },
    },
  }) as {
    properties: Record<string, Record<string, unknown>>;
  };

  assert.deepEqual(normalized.properties.profile["x-decorator-props"], {
    colon: false,
    label: false,
    feedbackLayout: "none",
  });
  assert.equal(normalized.properties.email["x-decorator-props"], undefined);
});

test("reports lookup failure only for a ready named source address", () => {
  assert.equal(
    shouldReportProfileAddressResolutionFailure(true, true, {
      emirate: "Dubai",
      region: "Dubai Region",
      area: "Dubai Area",
    }),
    true,
  );
  assert.equal(
    shouldReportProfileAddressResolutionFailure(true, false, {
      emirate: "Dubai",
    }),
    false,
  );
  assert.equal(
    shouldReportProfileAddressResolutionFailure(true, true, {
      emirate: 2,
      region: 20,
      area: 200,
    }),
    false,
  );
  assert.equal(
    shouldReportProfileAddressResolutionFailure(false, true, {
      emirate: "Dubai",
    }),
    false,
  );
});

test("keeps the map optional and shows it without an action hint in read-only mode", () => {
  const addressPickerSource = readFileSync(
    "src/components/designable/src/components/AddressPicker/AddressPicker.tsx",
    "utf8",
  );
  const addressMapSource = readFileSync(
    "src/components/common/AddressMapPicker/index.tsx",
    "utf8",
  );
  const googleMapPickerSource = readFileSync(
    "src/components/designable/src/components/FilmingLocations/GoogleMapPicker.tsx",
    "utf8",
  );
  const english = JSON.parse(
    readFileSync("src/localization/formily/en.json", "utf8"),
  );
  const arabic = JSON.parse(
    readFileSync("src/localization/formily/ar.json", "utf8"),
  );

  assert.match(
    addressPickerSource,
    /const shouldShowMap = props\.showMap !== false;/,
  );
  assert.match(addressPickerSource, /centerAddress=\{mapCenterAddress\}/);
  assert.match(
    addressPickerSource,
    /latitude=\{hasCoordinates \? value\.latitude : undefined\}/,
  );
  assert.match(
    addressPickerSource,
    /hint=\{isDisabled \? undefined : t\("AddressPicker\.mapHint"\)\}/,
  );
  assert.match(addressMapSource, /centerAddress\?: string;/);
  assert.match(addressMapSource, /centerAddress=\{centerAddress\}/);
  assert.match(
    addressMapSource,
    /\{hint \? <span className="address-map__hint">\{hint\}<\/span> : null\}/,
  );
  assert.match(googleMapPickerSource, /new IntersectionObserver/);
  assert.match(
    googleMapPickerSource,
    /entry\.intersectionRect\.width > 0/,
  );
  assert.match(
    googleMapPickerSource,
    /entry\.intersectionRect\.height > 0/,
  );
  assert.match(googleMapPickerSource, /containerReadyAbortController\.abort\(\)/);
  assert.match(
    googleMapPickerSource,
    /\[interactive, latitude, loading, longitude, value\]/,
  );
  assert.match(
    googleMapPickerSource,
    /!active\s*\|\|\s*!mapRef\.current\s*\|\|\s*markerRef\.current/,
  );
  assert.match(
    googleMapPickerSource,
    /mapTargetRef\.current\.centerAddress\?\.trim\(\)/,
  );
  assert.equal(
    english.AddressPicker.mapHint,
    "Click on the map to select the address location.",
  );
  assert.equal(
    arabic.AddressPicker.mapHint,
    "انقر على الخريطة لتحديد موقع العنوان.",
  );
});

test("keeps the shared Google map non-interactive in review mode", () => {
  const addressMapSource = readFileSync(
    "src/components/common/AddressMapPicker/index.tsx",
    "utf8",
  );
  const googleMapPickerSource = readFileSync(
    "src/components/designable/src/components/FilmingLocations/GoogleMapPicker.tsx",
    "utf8",
  );

  assert.match(addressMapSource, /<GoogleMapPicker[\s\S]*?interactive=\{interactive\}/);
  assert.match(googleMapPickerSource, /interactive\?: boolean;/);
  assert.match(googleMapPickerSource, /interactive = true,/);
  assert.match(googleMapPickerSource, /const geocoder = new googleMaps\.Geocoder\(\);/);
  assert.match(
    googleMapPickerSource,
    /if \(interactive\) \{[\s\S]*?map\.addListener\("click"/,
  );
  assert.match(
    googleMapPickerSource,
    /if \(\s*!centerAddress\?\.trim\(\)/,
  );
  assert.match(
    googleMapPickerSource,
    /const syncCenterAddressToMap = async \(\) => \{[\s\S]*?geocodeAddress\(/,
  );
  assert.match(
    googleMapPickerSource,
    /\{interactive \? \([\s\S]*?filming-locations-map-hint[\s\S]*?\) : null\}/,
  );
});

test("shows the read-only map in the establishment Profile Information review", () => {
  const reviewProfileSource = readFileSync(
    "src/pages/MediaLicense/components/ReviewProfileInfo.tsx",
    "utf8",
  );

  assert.match(
    reviewProfileSource,
    /import \{ AddressMapField \} from "@\/components\/common\/AddressMapPicker";/,
  );
  assert.match(reviewProfileSource, /interactive=\{false\}/);
  assert.match(
    reviewProfileSource,
    /centerAddress=\{reviewMapCenterAddress\}/,
  );
  assert.match(
    reviewProfileSource,
    /latitude=\{hasReviewMapCoordinates \? latitude : undefined\}/,
  );
  assert.match(
    reviewProfileSource,
    /longitude=\{hasReviewMapCoordinates \? longitude : undefined\}/,
  );
  assert.doesNotMatch(
    reviewProfileSource,
    /<AddressMapField[\s\S]*?hint=/,
  );
});

test("does not guess child address ids when an exact parent match is unavailable", () => {
  const resolved = resolveProfileFormAddress(
    {
      emirate: "Abu Dhabi",
      region: "Unknown Region",
      area: "Area",
      street: "Street",
    },
    [{ id: 1, nameEn: "Abu Dhabi", nameAr: "أبوظبي" }],
    [{ id: 10, emirateId: 1, nameEn: "Region", nameAr: "منطقة" }],
    [{ id: 100, regionId: 10, nameEn: "Area", nameAr: "منطقة" }],
  );

  assert.deepEqual(resolved, { emirateId: 1, street: "Street" });
});

type ProfileReviewRules = {
  extractCurrentProfileFormValues?: (
    formilyList: Array<{ formData?: string }>,
  ) => Record<string, unknown> | undefined;
  overlayProfileFormReviewValues?: <T extends Record<string, unknown>>(
    source: T,
    values: Record<string, unknown> | undefined,
  ) => T;
  resolveProfileFormReviewAddress?: <T extends Record<string, unknown>>(
    source: T,
    addressPicker: Record<string, unknown> | undefined,
    emirates: Array<Record<string, unknown>>,
    regions: Array<Record<string, unknown>>,
    areas: Array<Record<string, unknown>>,
    isAr?: boolean,
  ) => T;
};

const profileReviewRules = profileFormRules as ProfileReviewRules;

test("extracts ProfileForm values by schema component identity and normalized field key", () => {
  const expectedValues = {
    workEmail: "current@example.com",
    establishmentNameEnglish: "Current Establishment",
  };
  const extractCurrentProfileFormValues =
    profileReviewRules.extractCurrentProfileFormValues || (() => undefined);

  const extracted = extractCurrentProfileFormValues([
    { formData: "{" },
    {
      formData: JSON.stringify({
        schema: {
          type: "object",
          properties: {
            section: {
              type: "void",
              properties: {
                "profile-form": {
                  "x-component": "ProfileForm",
                },
              },
            },
          },
        },
        formValues: {
          "Profile Form": expectedValues,
        },
      }),
    },
  ]);

  assert.deepEqual(extracted, expectedValues);
});

test("returns no current ProfileForm values for malformed or unrelated form steps", () => {
  const extractCurrentProfileFormValues =
    profileReviewRules.extractCurrentProfileFormValues ||
    (() => ({ unexpected: true }));

  assert.equal(
    extractCurrentProfileFormValues([
      { formData: "not-json" },
      {
        formData: JSON.stringify({
          schema: {
            properties: {
              addressPicker: { "x-component": "AddressPicker" },
            },
          },
          formValues: { ProfileForm: { workEmail: "ignored@example.com" } },
        }),
      },
      {},
    ]),
    undefined,
  );
});

test("overlays only ProfileForm-owned review fields and preserves profile-only data", () => {
  const legalPerson = { name: "Original Legal Person" };
  const partners = [{ id: 1 }];
  const source = {
    emails: "original@example.com",
    nameAr: "Original Arabic",
    nameEn: "Original English",
    establishmentMobile: "971500000000",
    licenseNumber: "OLD-1",
    licenseExpiryDate: "2026-01-01",
    licenseCopyUrl: "old-license.pdf",
    establishmentTypeName: "Original Type",
    addressName: "Original Establishment Emirate",
    authorityIdName: "Original Authority",
    tenancyContractEndDate: "2026-02-01",
    tenancyContractCopyUrl: "old-tenancy.pdf",
    memorandumOfAssociationCopyUrl: "old-memorandum.pdf",
    powerOfAttorneyCopyUrl: "old-power.pdf",
    emirate: "Original Emirate",
    region: "Original Region",
    area: "Original Area",
    street: "Original Street",
    latitude: 24,
    longitude: 54,
    legalPerson,
    partners,
  };
  const overlayProfileFormReviewValues =
    profileReviewRules.overlayProfileFormReviewValues ||
    ((originalSource) => originalSource);

  const result = overlayProfileFormReviewValues(source, {
    workEmail: "current@example.com",
    establishmentNameArabic: "Current Arabic",
    establishmentNameEnglish: "Current English",
    phoneNumber: "971500000001",
    commercialLicenseNumber: "NEW-1",
    licenseExpiryDate: "2027-01-01",
    commercialLicense: "new-license.pdf",
    establishmentSubTypes: "Current Type",
    establishmentEmirateName: "Current Establishment Emirate",
    licensingAuthority: "Current Authority",
    tenancyContractEndDate: "2027-02-01",
    tenancyContract: "new-tenancy.pdf",
    memorandumOfAssociation: "new-memorandum.pdf",
    powerOfAttorney: "new-power.pdf",
    addressPicker: {
      emirateId: 2,
      regionId: 20,
      areaId: 200,
      street: "Current Street",
      latitude: 25.2048,
      longitude: 55.2708,
    },
    unrelatedField: "must-not-leak",
  });

  assert.deepEqual(result, {
    ...source,
    emails: "current@example.com",
    nameAr: "Current Arabic",
    nameEn: "Current English",
    establishmentMobile: "971500000001",
    licenseNumber: "NEW-1",
    licenseExpiryDate: "2027-01-01",
    licenseCopyUrl: "new-license.pdf",
    establishmentTypeName: "Current Type",
    addressName: "Current Establishment Emirate",
    authorityIdName: "Current Authority",
    tenancyContractEndDate: "2027-02-01",
    tenancyContractCopyUrl: "new-tenancy.pdf",
    memorandumOfAssociationCopyUrl: "new-memorandum.pdf",
    powerOfAttorneyCopyUrl: "new-power.pdf",
    street: "Current Street",
    latitude: 25.2048,
    longitude: 55.2708,
  });
  assert.equal(result.legalPerson, legalPerson);
  assert.equal(result.partners, partners);
  assert.equal("unrelatedField" in result, false);

  assert.deepEqual(
    overlayProfileFormReviewValues(source, {
      addressPicker: {
        emirateId: 2,
        latitude: 25.2048,
      },
    }),
    {
      ...source,
      latitude: undefined,
      longitude: undefined,
    },
  );
});

test("clears stale commercial review fields for the active reserve trade branch", () => {
  const source = {
    licenseNumber: "OLD-1",
    licenseExpiryDate: "2026-01-01",
    licenseCopyUrl: "old-license.pdf",
    legalPerson: { name: "Original Legal Person" },
  };
  const overlayProfileFormReviewValues =
    profileReviewRules.overlayProfileFormReviewValues ||
    ((originalSource) => originalSource);

  assert.deepEqual(
    overlayProfileFormReviewValues(source, {
      hasTradeLicense: false,
      reserveTradeNumber: "TR-NEW",
      reserveTradeName: "reserve-trade-name.pdf",
    }),
    {
      ...source,
      hasTradeLicense: false,
      reserveTradeNumber: "TR-NEW",
      reserveTradeName: "reserve-trade-name.pdf",
      licenseNumber: undefined,
      licenseExpiryDate: undefined,
      licenseCopyUrl: undefined,
      latitude: undefined,
      longitude: undefined,
    },
  );
});

test("resolves current address names only from exact ids in the current hierarchy", () => {
  const source = {
    emirate: "Existing Emirate",
    region: "Existing Region",
    area: "Existing Area",
  };
  const resolveProfileFormReviewAddress =
    profileReviewRules.resolveProfileFormReviewAddress ||
    ((originalSource) => originalSource);

  const resolved = resolveProfileFormReviewAddress(
    source,
    { emirateId: 2, regionId: 20, areaId: 200 },
    [
      { id: 1, nameEn: "Abu Dhabi" },
      { id: 2, nameEn: "Dubai" },
    ],
    [
      { id: 20, emirateId: 1, nameEn: "Wrong Parent Region" },
      { id: 20, emirateId: 2, nameEn: "Dubai Region" },
    ],
    [
      { id: 200, regionId: 10, nameEn: "Wrong Parent Area" },
      { id: 200, regionId: 20, nameEn: "Dubai Area" },
    ],
  );
  const unresolved = resolveProfileFormReviewAddress(
    source,
    { emirateId: 9, regionId: 20, areaId: 200 },
    [{ id: 2, nameEn: "Dubai" }],
    [{ id: 20, emirateId: 2, nameEn: "Dubai Region" }],
    [{ id: 200, regionId: 20, nameEn: "Dubai Area" }],
  );

  assert.deepEqual(resolved, {
    emirate: "Dubai",
    region: "Dubai Region",
    area: "Dubai Area",
  });
  assert.deepEqual(unresolved, {
    emirate: undefined,
    region: undefined,
    area: undefined,
  });
});

test("clears the original review address when the current emirate cannot be resolved", () => {
  const resolveProfileFormReviewAddress =
    profileReviewRules.resolveProfileFormReviewAddress ||
    ((originalSource) => originalSource);

  assert.deepEqual(
    resolveProfileFormReviewAddress(
      {
        emirate: "Original Emirate",
        region: "Original Region",
        area: "Original Area",
      },
      { emirateId: 999, regionId: 998, areaId: 997 },
      [{ id: 1, nameEn: "Abu Dhabi" }],
      [],
      [],
    ),
    {
      emirate: undefined,
      region: undefined,
      area: undefined,
    },
  );
});

test("localizes profile review address values with an English fallback", () => {
  const resolveProfileFormReviewAddress =
    profileReviewRules.resolveProfileFormReviewAddress ||
    ((originalSource) => originalSource);
  const addressPicker = { emirateId: 2, regionId: 20, areaId: 200 };
  const emirates = [
    { id: 2, nameEn: "Dubai", nameAr: "دبي" },
  ];
  const regions = [
    { id: 20, emirateId: 2, nameEn: "Dubai Region", nameAr: "منطقة دبي" },
  ];
  const areas = [
    { id: 200, regionId: 20, nameEn: "Dubai Area", nameAr: "" },
  ];

  assert.deepEqual(
    resolveProfileFormReviewAddress(
      {},
      addressPicker,
      emirates,
      regions,
      areas,
      true,
    ),
    {
      emirate: "دبي",
      region: "منطقة دبي",
      area: "Dubai Area",
    },
  );
  assert.deepEqual(
    resolveProfileFormReviewAddress(
      {},
      addressPicker,
      emirates,
      regions,
      areas,
      false,
    ),
    {
      emirate: "Dubai",
      region: "Dubai Region",
      area: "Dubai Area",
    },
  );
});

test("resolves a non-AD area without regionId and clears stale child address names", () => {
  const source = {
    emirate: "Existing Emirate",
    region: "Existing Region",
    area: "Existing Area",
  };
  const resolveProfileFormReviewAddress =
    profileReviewRules.resolveProfileFormReviewAddress ||
    ((originalSource) => originalSource);
  const emirates = [
    { id: 1, nameEn: "Abu Dhabi" },
    { id: 2, nameEn: "Dubai" },
  ];
  const regions = [
    { id: 10, emirateId: 1, nameEn: "Abu Dhabi Region" },
    { id: 20, emirateId: 2, nameEn: "Dubai Parent Region" },
  ];
  const areas = [
    { id: 200, regionId: 10, nameEn: "Wrong Parent Area" },
    { id: 201, regionId: 20, nameEn: "Dubai Area" },
  ];

  assert.deepEqual(
    resolveProfileFormReviewAddress(
      source,
      { emirateId: 2, areaId: 201 },
      emirates,
      regions,
      areas,
    ),
    {
      emirate: "Dubai",
      region: undefined,
      area: "Dubai Area",
    },
  );
  assert.deepEqual(
    resolveProfileFormReviewAddress(
      source,
      { emirateId: 2, areaId: 200 },
      emirates,
      regions,
      areas,
    ),
    {
      emirate: "Dubai",
      region: undefined,
      area: undefined,
    },
  );
});

test("leaves profile review data unchanged when no ProfileForm exists", () => {
  const source = {
    licenseNumber: "ORIGINAL-1",
    emirate: "Original Emirate",
    latitude: 24.4539,
    longitude: 54.3773,
  };
  const overlayProfileFormReviewValues =
    profileReviewRules.overlayProfileFormReviewValues ||
    ((originalSource) => originalSource);

  assert.equal(overlayProfileFormReviewValues(source, undefined), source);
});

test("keeps active Profile information separate from pending ProfileForm changes", () => {
  const mediaLicenseSource = readFileSync(
    "src/pages/MediaLicense/index.tsx",
    "utf8",
  );
  const reviewProfileSource = readFileSync(
    "src/pages/MediaLicense/components/ReviewProfileInfo.tsx",
    "utf8",
  );

  assert.doesNotMatch(mediaLicenseSource, /overlayProfileFormReviewValues\(/);
  assert.match(
    mediaLicenseSource,
    /<ReviewPersonalInformation\s+ProfileInfoIndex=\{ProfileInfoIndex\}/,
  );
  assert.match(
    mediaLicenseSource,
    /<ReviewProfileInfo\s+ProfileInfoIndex=\{ProfileInfoIndex\}/,
  );
  assert.match(
    reviewProfileSource,
    /Promise\.all\(\[getEmirateList\(\), getRegionList\(\), getAreaList\(\)\]\)/,
  );
  assert.match(reviewProfileSource, /resolveProfileFormReviewAddress\(/);
  assert.match(
    reviewProfileSource,
    /setResolvedProfileAddress\(CLEARED_PROFILE_ADDRESS\);\s*let isActive = true;\s*Promise\.all/,
  );
  assert.match(
    reviewProfileSource,
    /\.catch\(\(error\) => \{\s*if \(!isActive\) return;\s*setResolvedProfileAddress\(CLEARED_PROFILE_ADDRESS\);/,
  );
  assert.match(
    reviewProfileSource,
    /getPartnersNewList\(currentEstablishment\.id\)[\s\S]*?if \(isActive\)[\s\S]*?\.catch\(\(\) => \{[\s\S]*?setPartners\(\[\]\);[\s\S]*?return \(\) => \{\s*isActive = false;/,
  );
  assert.match(
    reviewProfileSource,
    /if \(!addressPicker\) \{\s*setResolvedProfileAddress\(\{\}\);\s*return;\s*\}/,
  );
  assert.match(
    reviewProfileSource,
    /\{addressPicker && \(reviewMapCenterAddress \|\| hasReviewMapCoordinates\) \? \(/,
  );
});

test("renders reserve trade review values instead of stale commercial values", () => {
  const reviewProfileSource = readFileSync(
    "src/pages/MediaLicense/components/ReviewProfileInfo.tsx",
    "utf8",
  );

  assert.match(
    reviewProfileSource,
    /ProfileInfoIndex\.hasTradeLicense === false[\s\S]*?ProfileForm\.label\.reserveTradeNumber[\s\S]*?ProfileInfoIndex\.reserveTradeNumber/,
  );
  assert.match(
    reviewProfileSource,
    /ProfileInfoIndex\.hasTradeLicense === false[\s\S]*?ProfileForm\.label\.uploadReserveTradeName[\s\S]*?ProfileInfoIndex\.reserveTradeName/,
  );
});

test("validates Emirate-specific commercial license formats", () => {
  const base = {
    ...requiredEstablishmentValues,
    hasTradeLicense: true,
    licenseExpiryDate: "2026-12-31",
    commercialLicense: "license.pdf",
  };

  assert.deepEqual(
    getProfileFormValidationErrors(
      { ...base, emirate: 1, commercialLicenseNumber: "CN-10" },
      emirates,
    ),
    [],
  );
  assert.ok(
    getProfileFormValidationErrors(
      { ...base, emirate: 1, commercialLicenseNumber: "10" },
      emirates,
    ).includes("commercialLicenseNumber"),
  );
  assert.deepEqual(
    getProfileFormValidationErrors(
      { ...base, emirate: 2, commercialLicenseNumber: "10" },
      emirates,
    ),
    [],
  );
  assert.ok(
    getProfileFormValidationErrors(
      { ...base, emirate: 2, commercialLicenseNumber: "CN-10" },
      emirates,
    ).includes("commercialLicenseNumber"),
  );
});

test("requires active branch fields and rejects unresolved identifiers", () => {
  assert.deepEqual(
    getProfileFormValidationErrors(requiredEstablishmentValues),
    ["hasTradeLicense"],
  );
  assert.deepEqual(
    getProfileFormValidationErrors({
      ...requiredEstablishmentValues,
      hasTradeLicense: false,
    }),
    ["reserveTradeNumber", "reserveTradeName"],
  );
  assert.deepEqual(
    getProfileFormValidationErrors({
      ...requiredEstablishmentValues,
      hasTradeLicense: true,
      commercialLicenseNumber: "CN-10",
    }),
    ["licenseExpiryDate", "commercialLicense"],
  );
  assert.ok(
    getProfileFormValidationErrors(
      {
        ...requiredEstablishmentValues,
        hasTradeLicense: false,
        reserveTradeNumber: "TR-20",
        reserveTradeName: "reserve.pdf",
      },
      emirates,
      true,
    ).includes("hasTradeLicense"),
  );
  assert.ok(
    getProfileFormValidationErrors({
      ...requiredEstablishmentValues,
      hasTradeLicense: true,
      emirate: 1,
      commercialLicenseNumber: "CN-10",
      licenseExpiryDate: "not-a-date",
      commercialLicense: "license.pdf",
    }).includes("licenseExpiryDate"),
  );
});

test("still validates visible phone number before a license branch is selected", () => {
  assert.deepEqual(
    getProfileFormValidationErrors({
      ...requiredEstablishmentValues,
      phoneNumber: undefined,
    }),
    ["hasTradeLicense", "phoneNumber"],
  );
});

test("preserves representative fields for company partner API payloads", () => {
  const partner = {
    partnerTypeCode: "1",
    representativeNameEn: "Company Representative",
    representativeNameAr: "ممثل الشركة",
    representativeEmiratesId: "784-1234-1234567-1",
  } as Parameters<typeof mapPartnerToApiPartner>[0];

  const payload = mapPartnerToApiPartner(partner);
  assert.equal(payload.representativeNameEn, "Company Representative");
  assert.equal(payload.representativeNameAr, "ممثل الشركة");
  assert.equal(payload.representativeEmiratesId, "784-1234-1234567-1");
});

test("clears representative fields for individual partner API payloads", () => {
  const partner = {
    partnerTypeCode: "2",
    representativeNameEn: "Company Representative",
    representativeNameAr: "ممثل الشركة",
    representativeEmiratesId: "784-1234-1234567-1",
  } as Parameters<typeof mapPartnerToApiPartner>[0];

  const payload = mapPartnerToApiPartner(partner);
  assert.equal(payload.representativeNameEn, null);
  assert.equal(payload.representativeNameAr, null);
  assert.equal(payload.representativeEmiratesId, null);
});

test("normalizes representative fields from establishment partner API rows", () => {
  const normalized = normalizeEstablishmentPartnersApiRow({
    id: 7,
    partnerTypeCode: "1",
    fullNameEn: "Company",
    fullNameAr: "شركة",
    representativeNameEn: "Company Representative",
    representativeNameAr: "ممثل الشركة",
    representativeEmiratesId: "784-1234-1234567-1",
  });

  assert.equal(normalized.representativeNameEn, "Company Representative");
  assert.equal(normalized.representativeNameAr, "ممثل الشركة");
  assert.equal(normalized.representativeEmiratesId, "784-1234-1234567-1");
});
