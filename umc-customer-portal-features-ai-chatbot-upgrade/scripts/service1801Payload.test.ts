import assert from "node:assert/strict";
import { buildService1801FeeEnginePayload } from "../src/pages/MediaLicense/feeStrategyPayload/buildService1801Payload.ts";
import { buildService1801Payload } from "../src/pages/MediaLicense/ruleStrategyPayload/buildService1801Payload.ts";
import type { IUser } from "../src/store/user.ts";

const currentProfileId = "9337";
const config = {
  serviceId: 1801,
  kind: "service1801",
  expectedFeeVersion: "1801.1.0",
};
const userInfo = {
  userEstablishments: [
    {
      id: 9,
      userProfileId: currentProfileId,
      userTypeId: "2",
    },
  ],
} as IUser;

const buildFormValuesList = (
  activityId: 2035 | 2036,
  idSelector?: Record<string, unknown>,
) => [
  {
    SelectTableSingle: {
      selectedKey: [String(activityId)],
      tableData: [{ Id: String(activityId) }],
    },
    MediaType: 3,
    ToWhomConcernCertificate: "assignment-letter.pdf",
    PermitStartDate: "2026-09-01",
  },
  {
    EstablishmentNameEnglish: "Foreign Entity English",
    EstablishmentNameArabic: "Foreign Entity Arabic",
    EntityHQCountry: 4,
    Website: "https://entity.example",
    Email: "entity@example.com",
    PhoneNumber: "+971501234567",
  },
  {
    idSelector,
    PersonalPhoto: "legacy-personal-photo.png",
    PassportCopy: "legacy-passport-copy.pdf",
    acquaintanceForm: {
      passportNumber: "LEGACY-PASSPORT",
      currentNationality: "IN",
      emiratesId: "LEGACY-EMIRATES-ID",
    },
  },
];

const buildRulePayload = (
  activityId: 2035 | 2036,
  idSelector?: Record<string, unknown>,
) =>
  buildService1801Payload({
    config,
    formValuesList: buildFormValuesList(activityId, idSelector),
    currentProfileId,
    userInfo,
    serviceCode: "1801",
  });

const testEmiratesIdPayload = async () => {
  const payload = await buildRulePayload(2036, {
    type: "emiratesId",
    fullNameEnglish: "Journalist English",
    fullNameArabic: "Journalist Arabic",
    nationality: 212,
    emiratesId: "784-1111-1111111-1",
    PersonalPhoto: "journalist-photo.png",
    EmiratesID: "emirates-id-copy.pdf",
  });

  assert.equal(payload.request.isTemporaryPressCard, false);
  assert.equal(payload.request.businessTypeId, 1041);
  assert.equal(payload.request.assignmentLetterUrl, "assignment-letter.pdf");
  assert.deepEqual(payload.request.foreignEntity, {
    nameEnglish: "Foreign Entity English",
    nameArabic: "Foreign Entity Arabic",
    headquarterCountryId: 356,
    websiteUrl: "https://entity.example",
    email: "entity@example.com",
    phoneNumber: "+971501234567",
  });
  assert.deepEqual(payload.request.journalist, {
    fullNameEnglish: "Journalist English",
    fullNameArabic: "Journalist Arabic",
    passportNumber: undefined,
    passportCountryId: 784,
    passportCopyUrl: undefined,
    personalPhotoUrl: "journalist-photo.png",
    emiratesId: "784-1111-1111111-1",
  });
  assert.equal(Object.hasOwn(payload.request, "PermitStartDate"), false);
};

const testPassportPayload = async () => {
  const payload = await buildRulePayload(2035, {
    type: "passport",
    fullNameEnglish: "Passport Journalist English",
    fullNameArabic: "Passport Journalist Arabic",
    nationality: "IN",
    passportNumber: "P1234567",
    PersonalPhoto: "passport-photo.png",
    PassportScan: "passport-scan.pdf",
  });

  assert.equal(payload.request.isTemporaryPressCard, true);
  assert.deepEqual(payload.request.journalist, {
    fullNameEnglish: "Passport Journalist English",
    fullNameArabic: "Passport Journalist Arabic",
    passportNumber: "P1234567",
    passportCountryId: 356,
    passportCopyUrl: "passport-scan.pdf",
    personalPhotoUrl: "passport-photo.png",
    emiratesId: undefined,
  });
};

const testMissingIdSelectorPayload = async () => {
  const payload = await buildRulePayload(2036);

  assert.deepEqual(payload.request.journalist, {
    fullNameEnglish: undefined,
    fullNameArabic: undefined,
    passportNumber: undefined,
    passportCountryId: undefined,
    passportCopyUrl: undefined,
    personalPhotoUrl: undefined,
    emiratesId: undefined,
  });
};

const testActivityOverridesStaleIdSelectorType = async () => {
  const regularPayload = await buildRulePayload(2036, {
    type: "passport",
    passportNumber: "STALE-PASSPORT",
    PassportScan: "stale-passport.pdf",
    emiratesId: "784-2222-2222222-2",
  });
  const temporaryPayload = await buildRulePayload(2035, {
    type: "emiratesId",
    emiratesId: "STALE-EMIRATES-ID",
    passportNumber: "P7654321",
    PassportScan: "passport-scan.pdf",
  });

  assert.equal(regularPayload.request.journalist.emiratesId, "784-2222-2222222-2");
  assert.equal(regularPayload.request.journalist.passportNumber, undefined);
  assert.equal(regularPayload.request.journalist.passportCopyUrl, undefined);
  assert.equal(temporaryPayload.request.journalist.emiratesId, undefined);
  assert.equal(temporaryPayload.request.journalist.passportNumber, "P7654321");
  assert.equal(temporaryPayload.request.journalist.passportCopyUrl, "passport-scan.pdf");
};

const testFeePayload = async () => {
  const temporaryPayload = await buildService1801FeeEnginePayload({
    config,
    formValuesList: buildFormValuesList(2035),
    currentProfileId,
    userInfo,
  });
  const regularPayload = await buildService1801FeeEnginePayload({
    config,
    formValuesList: buildFormValuesList(2036),
    currentProfileId,
    userInfo,
  });

  assert.deepEqual(temporaryPayload.request.payload, {
    isTemporaryPressCard: true,
  });
  assert.deepEqual(regularPayload.request.payload, {
    isTemporaryPressCard: false,
  });
  assert.equal(Object.hasOwn(temporaryPayload.request.payload || {}, "PermitStartDate"), false);
};

export const runService1801PayloadTests = async () => {
  await testEmiratesIdPayload();
  await testPassportPayload();
  await testMissingIdSelectorPayload();
  await testActivityOverridesStaleIdSelectorType();
  await testFeePayload();
};

await runService1801PayloadTests();
console.log("Service 1801 payload tests passed.");
