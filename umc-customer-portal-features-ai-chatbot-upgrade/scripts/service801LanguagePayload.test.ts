import assert from "node:assert/strict";
import test from "node:test";
import { buildService801FeeEnginePayload } from "../src/pages/MediaLicense/feeStrategyPayload/buildService801Payload.ts";
import { buildService801Payload } from "../src/pages/MediaLicense/ruleStrategyPayload/buildService801Payload.ts";
import type { IUser } from "../src/store/user.ts";

const currentProfileId = "9337";
const config = {
  serviceId: 801,
  kind: "service801",
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

const buildFormValuesList = (languageValue: unknown) => [
  {
    SelectTableSingle: {
      selectedKey: [25],
      tableData: [{ Id: 25 }],
    },
    Languages: languageValue,
  },
];

const buildRulePayload = (languageValue: unknown) =>
  buildService801Payload({
    config,
    formValuesList: buildFormValuesList(languageValue),
    currentProfileId,
    userInfo,
    serviceCode: "801",
  });

const buildFeePayload = (languageValue: unknown) =>
  buildService801FeeEnginePayload({
    config,
    formValuesList: buildFormValuesList(languageValue),
    currentProfileId,
    userInfo,
  });

test("builds the service 801 rule payload from a scalar language id", () => {
  assert.deepEqual(buildRulePayload(3).request.languageIds, [3]);
  assert.deepEqual(buildRulePayload("3").request.languageIds, [3]);
});

test("builds the service 801 fee payload from a scalar language id", async () => {
  const numericPayload = await buildFeePayload(3);
  const stringPayload = await buildFeePayload("3");

  assert.deepEqual(numericPayload.request.payload?.selectedLanguageIds, [3]);
  assert.deepEqual(stringPayload.request.payload?.selectedLanguageIds, [3]);
});

test("preserves legacy service 801 language id arrays", async () => {
  assert.deepEqual(buildRulePayload([3, "4"]).request.languageIds, [3, 4]);

  const feePayload = await buildFeePayload([3, "4"]);
  assert.deepEqual(feePayload.request.payload?.selectedLanguageIds, [3, 4]);
});

test("keeps empty service 801 language values empty", async () => {
  for (const emptyValue of [undefined, null, "", " "]) {
    assert.deepEqual(buildRulePayload(emptyValue).request.languageIds, []);

    const feePayload = await buildFeePayload(emptyValue);
    assert.deepEqual(feePayload.request.payload?.selectedLanguageIds, []);
  }
});
