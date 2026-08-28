import assert from "node:assert/strict";
import test from "node:test";
import { resolveDefaultServiceUserTypeCodes } from "../src/pages/Services/serviceProfileFilter";

const userTypes = [
  { id: 1, code: "1" },
  { id: 2, code: "2" },
  { id: 20, code: "7" },
  { id: 27, code: "12" },
];

test("maps the current profile user type id to the service filter code", () => {
  assert.deepEqual(
    resolveDefaultServiceUserTypeCodes({
      currentUserTypeId: "1",
      isGlobalProfile: false,
      userTypes,
    }),
    ["1"],
  );
  assert.deepEqual(
    resolveDefaultServiceUserTypeCodes({
      currentUserTypeId: "20",
      isGlobalProfile: false,
      userTypes,
    }),
    ["7"],
  );
  assert.deepEqual(
    resolveDefaultServiceUserTypeCodes({
      currentUserTypeId: 27,
      isGlobalProfile: false,
      userTypes,
    }),
    ["12"],
  );
});

test("does not infer a service filter code for global or unmapped profiles", () => {
  assert.deepEqual(
    resolveDefaultServiceUserTypeCodes({
      currentUserTypeId: "1",
      isGlobalProfile: true,
      userTypes,
    }),
    [],
  );
  assert.deepEqual(
    resolveDefaultServiceUserTypeCodes({
      currentUserTypeId: "999",
      isGlobalProfile: false,
      userTypes,
    }),
    [],
  );
});
