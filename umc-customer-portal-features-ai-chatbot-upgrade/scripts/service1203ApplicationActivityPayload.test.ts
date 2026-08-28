import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildService1203ApplicationActivityPayload,
  resolveService1203ActivityIds,
} from "@/pages/MediaLicense/service1203ApplicationActivityPayload";

export const runService1203ApplicationActivityPayloadTests = () => {
  assert.deepEqual(resolveService1203ActivityIds([1010]), [1010]);
  assert.deepEqual(
    resolveService1203ActivityIds(["1010", 1010, 0, -1, "invalid", 2.5]),
    [1010],
  );
  assert.deepEqual(buildService1203ApplicationActivityPayload([1010]), {
    activityIds: [1010],
  });
  assert.throws(
    () => buildService1203ApplicationActivityPayload([]),
    /at least one lifecycle activity is required/i,
  );
  assert.throws(
    () => buildService1203ApplicationActivityPayload(undefined),
    /at least one lifecycle activity is required/i,
  );

  const mediaLicenseSource = readFileSync(
    resolve("src/pages/MediaLicense/index.tsx"),
    "utf8",
  );
  const ruleValidationSource = readFileSync(
    resolve("src/pages/MediaLicense/runRuleStrategyValidation.ts"),
    "utf8",
  );
  const englishTranslations = JSON.parse(
    readFileSync(resolve("src/localization/mediaLicense/en.json"), "utf8"),
  ) as Record<string, unknown>;
  const arabicTranslations = JSON.parse(
    readFileSync(resolve("src/localization/mediaLicense/ar.json"), "utf8"),
  ) as Record<string, unknown>;

  for (const key of [
    "lifecycleActivityLoadFailed",
    "currentActivities",
    "ruleValidationUnavailable",
  ]) {
    assert.equal(typeof englishTranslations[key], "string");
    assert.equal(typeof arabicTranslations[key], "string");
    assert.ok(String(englishTranslations[key]).trim());
    assert.ok(String(arabicTranslations[key]).trim());
  }
  assert.match(
    mediaLicenseSource,
    /t\("mediaLicensePage\.lifecycleActivityLoadFailed"\)/,
  );
  assert.match(
    mediaLicenseSource,
    /t\("mediaLicensePage\.currentActivities"\)/,
  );
  assert.match(mediaLicenseSource, /t\("mediaLicensePage\.retry"\)/);
  assert.match(
    ruleValidationSource,
    /i18n\.t\("mediaLicensePage\.ruleValidationUnavailable"\)/,
  );
};
