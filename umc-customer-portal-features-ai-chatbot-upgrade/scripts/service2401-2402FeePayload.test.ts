import assert from "node:assert/strict";
import test from "node:test";
import { buildService2401FeeEnginePayload } from "../src/pages/MediaLicense/feeStrategyPayload/buildService2401Payload.ts";
import { buildService2402FeePayload } from "../src/pages/MediaLicense/feeStrategyPayload/buildService2402Payload.ts";
import type { MediaLicenseFeeStrategyConfig } from "../src/pages/MediaLicense/feeStrategyPayload/index.ts";
import type { IUser } from "../src/store/user.ts";

const userInfo = {
  id: "user-2400",
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
      id: 2400,
      nameAr: "Test Establishment",
      nameEn: "Test Establishment",
      userProfileId: "2400",
      userTypeId: "2",
      email: "fee-test@example.com",
    },
  ],
  isFirstLogin: false,
  createOn: "",
} as IUser;

const service2401Config: MediaLicenseFeeStrategyConfig = {
  serviceId: 2401,
  expectedFeeVersion: "2401.1.0",
  kind: "service2401",
};

const service2402Config: MediaLicenseFeeStrategyConfig = {
  serviceId: 2402,
  expectedFeeVersion: "2402.1.0",
  kind: "service2402",
};

test("builds Service 2401 fee requests with the New action", async () => {
  const enginePayload = await buildService2401FeeEnginePayload({
    config: service2401Config,
    formValuesList: [
      {
        SelfMonitorForm: {
          mediaLicenseInternalId: 2401001,
        },
      },
    ],
    currentProfileId: "2400",
    userInfo,
  });

  assert.equal(enginePayload.actionType, 1);
  assert.equal(enginePayload.request.serviceId, 2401);
  assert.deepEqual(enginePayload.request.payload, {
    mediaLicenseId: 2401001,
  });
});

test("builds Service 2402 fee requests with the Renew action and lifecycle context", async () => {
  const envelope = await buildService2402FeePayload({
    config: service2402Config,
    formValuesList: [
      {
        SelfMonitorForm: {
          mediaLicenseInternalId: 2402001,
          selfMonitorCertificateNumber: "SM-2402-001",
        },
      },
    ],
    currentProfileId: "2400",
    userInfo,
  });

  assert.equal(envelope.serviceId, 2402);
  assert.equal(envelope.enginePayload.actionType, 2);
  assert.equal(envelope.enginePayload.expectedFeeVersion, "2402.1.0");
  assert.equal(envelope.enginePayload.request.serviceId, 2402);
  assert.deepEqual(envelope.enginePayload.request.payload, {
    mediaLicenseId: 2402001,
    selfMonitorCertificateNumber: "SM-2402-001",
  });
});
