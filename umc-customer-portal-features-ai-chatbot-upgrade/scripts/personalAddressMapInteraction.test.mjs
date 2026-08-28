import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("prefills the personal address Street without making it readonly", () => {
  const icpMappingSource = readFileSync(
    "src/pages/PersonalProfile/utils/icpPersonToForm.ts",
    "utf8",
  );
  const addressSectionSource = readFileSync(
    "src/pages/PersonalProfile/components/AddressSection.tsx",
    "utf8",
  );

  assert.match(
    icpMappingSource,
    /values\.addressStreet = streetStr;/,
  );
  assert.doesNotMatch(
    icpMappingSource,
    /readonlyFieldNames\.push\("addressStreet"\);/,
  );
  assert.doesNotMatch(addressSectionSource, /icpReadonlyFieldNames/);
  assert.doesNotMatch(addressSectionSource, /icpReadonly/);
});
