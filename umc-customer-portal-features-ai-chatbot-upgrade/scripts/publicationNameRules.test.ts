import assert from "node:assert/strict";
import test from "node:test";
import {
  isDuplicateDataListPublicationName,
  isPublicationNameServiceCode,
  normalizePublicationName,
  resolvePublicationNameCheckExclusions,
} from "../src/components/designable/src/components/DataList/dataListRules.ts";

test("normalizes publication names without changing letter case", () => {
  assert.equal(normalizePublicationName("  Daily  News  "), "Daily News");
  assert.equal(normalizePublicationName("Daily\t\nNews"), "Daily News");
  assert.equal(normalizePublicationName("   "), "");
});

test("detects publication name duplicates after whitespace and case normalization", () => {
  const rows = [
    { suggested_name: "Daily News" },
    { suggested_name: "Weekly Review" },
  ];

  assert.equal(
    isDuplicateDataListPublicationName(
      rows,
      { suggested_name: "  daily   news " },
      null,
    ),
    true,
  );
  assert.equal(
    isDuplicateDataListPublicationName(
      rows,
      { suggested_name: "Daily News" },
      0,
    ),
    false,
  );
  assert.equal(
    isDuplicateDataListPublicationName(
      rows,
      { suggested_name: "Monthly Journal" },
      null,
    ),
    false,
  );
});

test("does not treat blank publication names as duplicates", () => {
  assert.equal(
    isDuplicateDataListPublicationName(
      [{ suggested_name: "" }],
      { suggested_name: "   " },
      null,
    ),
    false,
  );
});

test("limits backend publication name checks to service 1201", () => {
  assert.equal(isPublicationNameServiceCode("1201"), true);
  assert.equal(isPublicationNameServiceCode(1202), false);
  assert.equal(isPublicationNameServiceCode(1203), false);
  assert.equal(isPublicationNameServiceCode(1204), false);
  assert.equal(isPublicationNameServiceCode("120"), false);
  assert.equal(isPublicationNameServiceCode("12010"), false);
  assert.equal(isPublicationNameServiceCode("901"), false);
});

test("does not expose persisted exclusion identifiers to a new application", () => {
  // Entry flow: no lifecycle action, so a leftover persisted context must not
  // reach the backend check even when every identifier looks plausible.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: false,
      currentServiceCode: "1201",
      targetServiceCode: "1204",
      expectedSourceApplicationId: 1793,
      sourceApplicationId: 1793,
      sourceMediaLicenseId: 282,
    }),
    {},
  );
  // Lifecycle action but no validated source for the current page identity:
  // activity-context identifiers alone are never enough.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      targetServiceCode: "1201",
      expectedSourceApplicationId: null,
      sourceApplicationId: 1793,
      sourceMediaLicenseId: 282,
    }),
    {},
  );
});

test("uses only valid source identifiers for lifecycle name checks", () => {
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      targetServiceCode: "1201",
      expectedSourceApplicationId: "1793",
      sourceApplicationId: "1793",
      sourceMediaLicenseId: 282,
    }),
    {
      excludeApplicationId: 1793,
      excludeMediaLicenseId: 282,
    },
  );
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      targetServiceCode: "1201",
      expectedSourceApplicationId: 0,
      sourceApplicationId: 1793,
      sourceMediaLicenseId: "invalid",
    }),
    {},
  );
  // An unusable media license id degrades to an application-only exclusion
  // instead of dropping the exclusion altogether.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      expectedSourceApplicationId: 1793,
      expectedSourceMediaLicenseId: "invalid",
    }),
    { excludeApplicationId: 1793 },
  );
});

test("keeps exclusions only for service 1201 without activity context", () => {
  // Service 1201 is outside LIFECYCLE_ACTIVITY_SERVICE_CODES, so the activity
  // lookup never runs and its identifiers stay undefined. The validated source
  // must still drive the exclusion, otherwise modifying an existing publication
  // name would collide with its own record.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      expectedSourceApplicationId: 1793,
      expectedSourceMediaLicenseId: 282,
    }),
    {
      excludeApplicationId: 1793,
      excludeMediaLicenseId: 282,
    },
  );
  // Other 120x services never call the publication name check.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1204",
      expectedSourceApplicationId: 1793,
      expectedSourceMediaLicenseId: 282,
      targetServiceCode: undefined,
      sourceApplicationId: undefined,
      sourceMediaLicenseId: undefined,
    }),
    {},
  );
});

test("prefers activity context media license id over the validated source", () => {
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      expectedSourceApplicationId: 1793,
      expectedSourceMediaLicenseId: 111,
      targetServiceCode: "1201",
      sourceApplicationId: 1793,
      sourceMediaLicenseId: 282,
    }),
    {
      excludeApplicationId: 1793,
      excludeMediaLicenseId: 282,
    },
  );
});

test("rejects exclusions from stale or non-publication lifecycle contexts", () => {
  // Activity context resolved for a different service than the one on screen.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      targetServiceCode: "1203",
      expectedSourceApplicationId: 1793,
      sourceApplicationId: 1793,
      sourceMediaLicenseId: 282,
    }),
    {},
  );
  // Non-publication service: the backend check is not name-scoped there.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "903",
      targetServiceCode: "903",
      expectedSourceApplicationId: 1793,
      sourceApplicationId: 1793,
      sourceMediaLicenseId: 282,
    }),
    {},
  );
  // Activity context belongs to another application than the validated source.
  assert.deepEqual(
    resolvePublicationNameCheckExclusions({
      isLifecycleAction: true,
      currentServiceCode: "1201",
      targetServiceCode: "1201",
      expectedSourceApplicationId: 1800,
      sourceApplicationId: 1793,
      sourceMediaLicenseId: 282,
    }),
    {},
  );
});
