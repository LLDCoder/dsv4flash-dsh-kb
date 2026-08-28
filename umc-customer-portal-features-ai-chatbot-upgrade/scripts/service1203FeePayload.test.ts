import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildService1203FeeEnginePayload } from "../src/pages/MediaLicense/feeStrategyPayload/buildService1203Payload.ts";
import type { MediaLicenseFeeStrategyConfig } from "../src/pages/MediaLicense/feeStrategyPayload/index.ts";
import { attachCustomerEngineRequestContext } from "../src/pages/MediaLicense/customerEngineRequestContext.ts";
import { ModifyEnginePayloadError } from "../src/pages/MediaLicense/modifyEnginePayloadError.ts";
import type { IUser } from "../src/store/user.ts";

const config: MediaLicenseFeeStrategyConfig = {
  serviceId: 1203,
  kind: "service1203",
};

const userInfo = {
  id: "user-1203",
  email: "fee-test@example.com",
  firstName: "Fee",
  lastName: "Test",
  listRoles: [],
  listUserFilter: null,
  listUserProfile: null,
  phoneNumber: null,
  token: "",
  userInvitation: {
    id: 0,
    name: "",
    photoUrl: "",
    userProfileId: "",
    userTypeId: "",
    email: "",
  },
  userEstablishments: [
    {
      establishmentUrl: null,
      id: 9323,
      nameAr: "Test Establishment",
      nameEn: "Test Establishment",
      userProfileId: "9323",
      userTypeId: "2",
      email: "fee-test@example.com",
    },
  ],
  isFirstLogin: false,
  createOn: "",
} as IUser;

const buildPayload = async (overrides?: {
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  licensePermitNo?: string | null;
  sourceMedialLicenseId?: number | null;
}) => {
  return buildService1203FeeEnginePayload({
    config,
    formValuesList: [],
    currentProfileId: "9323",
    userInfo,
    sourceApplicationId: 767,
    sourceApplicationDetailId: 767,
    licensePermitNo: "2791129",
    sourceMedialLicenseId: 123,
    ...overrides,
  });
};

test("registers the deployed service 1203 fee strategy", () => {
  const registrySource = readFileSync(
    resolve("src/pages/MediaLicense/feeStrategyPayload/index.ts"),
    "utf8",
  );

  const service1203Config = registrySource.match(
    /1203:\s*\{[\s\S]*?serviceId:\s*1203,[\s\S]*?kind:\s*"service1203",?[\s\S]*?\}/,
  )?.[0];
  assert.ok(service1203Config);
  assert.doesNotMatch(service1203Config, /expectedFeeVersion/);
  assert.match(registrySource, /config\.kind === "service1203"/);
  assert.match(registrySource, /buildService1203FeeEnginePayload\(/);

  for (const sourcePath of [
    "src/pages/MediaLicense/requestFeeQuote.ts",
    "src/pages/MediaLicense/index.tsx",
  ]) {
    const source = readFileSync(resolve(sourcePath), "utf8");
    assert.match(
      source,
      /ACTION_TYPE4_CONTEXT_FEE_SERVICE_KINDS[\s\S]*?"service1203"/,
    );
  }
});

test("builds the verified service 1203 modify fee payload", async () => {
  const payload = await buildPayload();

  assert.equal(payload.actionType, 4);
  assert.equal(payload.expectedFeeVersion, undefined);
  assert.equal(payload.request.serviceId, 1203);
  assert.equal(payload.request.applicant.licensePermitNo, "2791129");
  assert.deepEqual(payload.request.payload, {
    applicationId: 767,
    applicationDetailId: 767,
    licensePermitNo: "2791129",
  });
  assert.equal("languageCount" in (payload.request.payload || {}), false);
  assert.equal("totalAmount" in (payload.request.payload || {}), false);
  assert.equal("modificationItems" in (payload.request.payload || {}), false);

  const finalPayload = attachCustomerEngineRequestContext(payload, {
    licensePermitNo: "2791129",
    mediaLicenseId: 123,
  });
  assert.equal(finalPayload.request.licensePermitNo, "2791129");
  assert.equal(finalPayload.request.mediaLicenseId, 123);
});

test("rejects service 1203 payloads without source application context", async () => {
  await assert.rejects(
    buildPayload({ sourceApplicationId: null }),
    (error: unknown) =>
      error instanceof ModifyEnginePayloadError &&
      error.code === "missing-context" &&
      /applicationId and applicationDetailId are required/.test(error.message),
  );
  await assert.rejects(
    buildPayload({ sourceApplicationDetailId: null }),
    (error: unknown) =>
      error instanceof ModifyEnginePayloadError &&
      error.code === "missing-context",
  );
});

test("rejects service 1203 payloads without a license permit number", async () => {
  await assert.rejects(
    buildPayload({ licensePermitNo: null }),
    (error: unknown) =>
      error instanceof ModifyEnginePayloadError &&
      error.code === "missing-context" &&
      /licensePermitNo is required/.test(error.message),
  );
});

test("rejects service 1203 payloads without media license context", async () => {
  await assert.rejects(
    buildPayload({ sourceMedialLicenseId: null }),
    (error: unknown) =>
      error instanceof ModifyEnginePayloadError &&
      error.code === "missing-context" &&
      /mediaLicenseId is required/.test(error.message),
  );
});

test("blocks service 1203 submission while the fee quote is pending", () => {
  const mediaLicenseSource = readFileSync(
    resolve("src/pages/MediaLicense/index.tsx"),
    "utf8",
  );
  const handlePayNowSource = mediaLicenseSource.slice(
    mediaLicenseSource.indexOf("const handlePayNow = async"),
    mediaLicenseSource.indexOf("const handDraft = async"),
  );
  const handleSubmitSource = mediaLicenseSource.slice(
    mediaLicenseSource.indexOf("const handleSubmit = async"),
    mediaLicenseSource.indexOf("// Change now Profile"),
  );
  const feeQuoteRulesSource = readFileSync(
    resolve("src/pages/MediaLicense/modifyFeeQuoteRules.ts"),
    "utf8",
  );

  assert.match(
    mediaLicenseSource,
    /const isCurrentModifyFeeQuotePending = isModifyFeeQuotePending\(/,
  );
  assert.match(feeQuoteRulesSource, /"service1203"/);
  assert.match(handlePayNowSource, /if \(isCurrentModifyFeeQuotePending\)/);
  assert.match(handleSubmitSource, /if \(isCurrentModifyFeeQuotePending\)/);
  assert.ok(
    (mediaLicenseSource.match(/isCurrentModifyFeeQuotePending/g) || []).length >= 5,
  );
});

test("provides the pending fee message in English and Arabic", () => {
  const mediaLicenseSource = readFileSync(
    resolve("src/pages/MediaLicense/index.tsx"),
    "utf8",
  );
  const englishTranslations = JSON.parse(
    readFileSync(resolve("src/localization/mediaLicense/en.json"), "utf8"),
  ) as Record<string, unknown>;
  const arabicTranslations = JSON.parse(
    readFileSync(resolve("src/localization/mediaLicense/ar.json"), "utf8"),
  ) as Record<string, unknown>;

  assert.equal(
    englishTranslations.feeCalculationPending,
    "Please wait until the fee calculation is complete.",
  );
  assert.equal(
    arabicTranslations.feeCalculationPending,
    "يرجى الانتظار حتى يكتمل احتساب الرسوم.",
  );
  assert.doesNotMatch(
    mediaLicenseSource,
    /CustomMessage\.warning\("Please wait until the fee calculation is complete\."\)/,
  );
  assert.ok(
    (
      mediaLicenseSource.match(
        /t\("mediaLicensePage\.feeCalculationPending"\)/g,
      ) || []
    ).length >= 3,
  );
});
