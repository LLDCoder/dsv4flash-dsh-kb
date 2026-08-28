import assert from "node:assert/strict";
import type { IUser } from "@/store/user";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import {
  buildMediaLicenseRuleStrategyPayload,
  getMediaLicenseRuleStrategyConfig,
} from "@/pages/MediaLicense/ruleStrategyPayload";
import { ModifyEnginePayloadError } from "@/pages/MediaLicense/modifyEnginePayloadError";

const userInfo = {
  userEstablishments: [
    {
      id: 1,
      userProfileId: "9323",
    },
  ],
} as IUser;

export const runService1203RulePayloadTests = async () => {
  const existingService903Config = getMediaLicenseRuleStrategyConfig(903);
  assert.deepEqual(existingService903Config, {
    serviceId: 903,
    kind: "service903",
  });

  const config = getMediaLicenseRuleStrategyConfig(1203);
  assert.deepEqual(config, {
    serviceId: 1203,
    kind: "service1203",
  });

  useLicenseLifecycleSourceStore.setState({
    licenseLifecycleSource: {
      sourceServiceCode: "1201",
      sourceMedialLicenseId: 123,
      sourceApplicationId: 767,
      sourceApplicationDetailId: 767,
      licensePermitNo: "2791129",
      serviceId: 3248,
      serviceCode: "1203",
    },
  });

  const payload = await buildMediaLicenseRuleStrategyPayload({
    config: config!,
    formilyList: [],
    currentProfileId: "9323",
    userInfo,
    serviceCode: "1203",
    submissionMode: "submit",
  });

  assert.equal(payload.actionType, 4);
  assert.equal(payload.expectedRuleVersion, undefined);
  assert.deepEqual(
    {
      ...payload.request,
      requestTime: undefined,
    },
    {
      serviceId: 1203,
      applicantUserId: "9323",
      establishmentId: "1",
      applicationId: 767,
      applicationDetailId: 767,
      licensePermitNo: "2791129",
      mediaLicenseId: 123,
      termsAgreed: true,
      submissionMode: "submit",
      requestTime: undefined,
    },
  );
  assert.equal(typeof payload.request.requestTime, "string");
  assert.ok(payload.request.requestTime.length > 0);

  useLicenseLifecycleSourceStore.setState({ licenseLifecycleSource: null });
  await assert.rejects(
    () =>
      buildMediaLicenseRuleStrategyPayload({
        config: config!,
        formilyList: [],
        currentProfileId: "9323",
        userInfo,
        serviceCode: "1203",
        submissionMode: "submit",
      }),
    (error: unknown) =>
      error instanceof ModifyEnginePayloadError &&
      error.code === "missing-context",
  );
};
