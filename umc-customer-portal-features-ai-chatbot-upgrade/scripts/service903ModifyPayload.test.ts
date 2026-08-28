import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
) => ({
  formData: JSON.stringify({ formValues, modifyChangeSet }),
});

const setLifecycleSource = () => {
  useLicenseLifecycleSourceStore.setState({
    licenseLifecycleSource: {
      sourceServiceCode: "901",
      sourceMedialLicenseId: 43,
      sourceApplicationId: 135,
      sourceApplicationDetailId: 136,
      licensePermitNo: "0297611",
      serviceId: 3189,
      serviceCode: "903",
    },
  });
};

const createFormilyList = () => [
  toFormilyStep(
    {
      SelectTable: {
        selectedKey: ["41", "42"],
        prefilledSelectedKey: ["41"],
      },
      ProfileForm: {
        commercialLicenseNumber: "CN-1234567",
        workEmail: "updated@example.com",
      },
    },
    {
      sectionNameEn: "Activity Details",
      sectionNameAr: "Activity Details",
      changes: [
        {
          component: "ProfileForm",
          fieldKey: "commercialLicenseNumber",
          afterValue: "CN-1234567",
        },
        {
          component: "ProfileForm",
          fieldKey: "workEmail",
          afterValue: "updated@example.com",
        },
        {
          component: "AddressPicker",
          ownerComponent: "ProfileForm",
          fieldKey: "addressPicker.street",
          afterValue: "Updated street",
        },
        {
          component: "SelectTable",
          fieldKey: "SelectTable",
          changeType: "ADDED",
        },
      ],
    },
  ),
];

export const runService903ModifyPayloadTests = async () => {
  setLifecycleSource();

  assert.deepEqual(getMediaLicenseRuleStrategyConfig(903), {
    serviceId: 903,
    kind: "service903",
  });
  assert.deepEqual(getMediaLicenseFeeStrategyConfig(903), {
    serviceId: 903,
    kind: "service903",
  });

  for (const sourcePath of [
    "src/pages/MediaLicense/requestFeeQuote.ts",
    "src/pages/MediaLicense/index.tsx",
  ]) {
    const source = readFileSync(resolve(sourcePath), "utf8");
    const actionType4ContextKinds = source.match(
      /const ACTION_TYPE4_CONTEXT_FEE_SERVICE_KINDS = new Set\(\[([\s\S]*?)\]\);/,
    )?.[1];

    assert.ok(
      actionType4ContextKinds,
      `${sourcePath} must declare the action type 4 context fee strategy set`,
    );
    assert.match(
      actionType4ContextKinds,
      /"service903"/,
      `${sourcePath} must preserve the service 903 payload built from lifecycle context`,
    );
  }

  const rulePayload = await buildMediaLicenseRuleStrategyPayload({
    config: getMediaLicenseRuleStrategyConfig(903)!,
    formilyList: createFormilyList(),
    currentProfileId: "9353",
    userInfo,
    serviceCode: "903",
    submissionMode: "submit",
  });

  assert.equal(rulePayload.actionType, 4);
  assert.equal(rulePayload.expectedRuleVersion, undefined);
  assert.deepEqual(
    { ...rulePayload.request, requestTime: undefined },
    {
      serviceId: 903,
      applicationId: 135,
      applicationDetailId: 136,
      modificationItems: [
        "ESTABLISHMENT_INFORMATION",
        "TRADE_LICENSE_NUMBER",
        "MEDIA_ACTIVITY_ADD",
      ],
      establishmentFields: ["workEmail", "addressPicker.street"],
      tradeLicenseNumber: "CN-1234567",
      addedEconomicActivityIds: [42],
      removedEconomicActivityIds: [],
      termsAgreed: true,
      submissionMode: "submit",
      requestTime: undefined,
    },
  );
  assert.equal(typeof rulePayload.request.requestTime, "string");

  const feePayload = await buildMediaLicenseFeeStrategyEnginePayload({
    config: getMediaLicenseFeeStrategyConfig(903)!,
    formilyList: createFormilyList(),
    currentProfileId: "9353",
    userInfo,
    sourceApplicationId: 135,
    sourceApplicationDetailId: 136,
    sourceMedialLicenseId: 43,
    licensePermitNo: "0297611",
  });

  assert.equal(feePayload.actionType, 4);
  assert.equal(feePayload.expectedFeeVersion, undefined);
  assert.deepEqual(feePayload.request.payload, {
    applicationId: 135,
    applicationDetailId: 136,
    modificationItems: [
      "ESTABLISHMENT_INFORMATION",
      "TRADE_LICENSE_NUMBER",
      "MEDIA_ACTIVITY_ADD",
    ],
    addedEconomicActivityIds: [42],
    removedEconomicActivityIds: [],
  });
  assert.equal("courierCompanyId" in feePayload.request, false);
  assert.equal("amount" in (feePayload.request.payload || {}), false);
  assert.equal("termsAgreed" in (feePayload.request.payload || {}), false);

  await assert.rejects(
    buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(903)!,
      formilyList: [
        toFormilyStep({
          SelectTable: {
            selectedKey: ["42", 42],
            prefilledSelectedKey: ["41", 42],
          },
        }),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "903",
    }),
    /removing existing Media Activities is not allowed/,
  );

  await assert.rejects(
    buildMediaLicenseFeeStrategyEnginePayload({
      config: getMediaLicenseFeeStrategyConfig(903)!,
      formilyList: [
        toFormilyStep({
          SelectTable: {
            selectedKey: [],
            prefilledSelectedKey: ["41"],
            tableData: [{ Id: "41" }],
          },
        }),
      ],
      currentProfileId: "9353",
      userInfo,
      sourceApplicationId: 135,
      sourceApplicationDetailId: 136,
      sourceMedialLicenseId: 43,
      licensePermitNo: "0297611",
    }),
    /removing existing Media Activities is not allowed/,
  );

  await assert.rejects(
    buildMediaLicenseRuleStrategyPayload({
      config: getMediaLicenseRuleStrategyConfig(903)!,
      formilyList: [
        toFormilyStep({
          SelectTable: {
            selectedKey: ["41"],
            prefilledSelectedKey: ["41"],
          },
        }),
      ],
      currentProfileId: "9353",
      userInfo,
      serviceCode: "903",
    }),
    /at least one supported modification is required/,
  );
};
