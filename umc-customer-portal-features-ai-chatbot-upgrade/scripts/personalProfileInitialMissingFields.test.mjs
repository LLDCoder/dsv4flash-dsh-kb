import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const modulePath = new URL(
  "../src/pages/PersonalProfile/utils/initialMissingRequiredFields.ts",
  import.meta.url,
);
const personalProfilePagePath = new URL(
  "../src/pages/PersonalProfile/index.tsx",
  import.meta.url,
);
const profileDataHookPath = new URL(
  "../src/pages/PersonalProfile/hooks/useProfileData.ts",
  import.meta.url,
);

async function loadModule() {
  assert.equal(
    existsSync(modulePath),
    true,
    "initial missing required fields helper must exist",
  );

  const source = await readFile(modulePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: modulePath.pathname,
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;

  return import(dataUrl);
}

test("includes the selected identity field when the profile did not return it", async () => {
  const { getInitialMissingRequiredFields } = await loadModule();
  const initialValues = {
    dateOfBirth: null,
    emiratesId: "",
    fullNameAr: "   ",
    fullNameEn: "Existing name",
    nationalityId: 1023,
  };

  const missingFields = getInitialMissingRequiredFields(
    ["dateOfBirth", "fullNameAr", "fullNameEn", "nationalityId"],
    "emiratesId",
    initialValues,
  );

  assert.deepEqual(
    [...missingFields].sort(),
    ["dateOfBirth", "emiratesId", "fullNameAr"],
  );
});

test("keeps a snapshot of initially missing fields after the user starts typing", async () => {
  const { getInitialMissingRequiredFields } = await loadModule();
  const initialValues = {
    occupation: null,
    passportExpiryDate: { _isAMomentObject: true, isValid: () => false },
    personalPhotoUrl: "photo.png",
    passportNumber: "A123456",
  };

  const missingFields = getInitialMissingRequiredFields(
    ["occupation", "passportExpiryDate", "personalPhotoUrl"],
    "passportNumber",
    initialValues,
  );
  initialValues.occupation = "Developer";

  assert.deepEqual(
    [...missingFields].sort(),
    ["occupation", "passportExpiryDate"],
  );
});

test("does not unlock fields when the detail request did not succeed", async () => {
  const [pageSource, hookSource] = await Promise.all([
    readFile(personalProfilePagePath, "utf8"),
    readFile(profileDataHookPath, "utf8"),
  ]);

  assert.match(pageSource, /!profileLoadSucceeded/);
  assert.match(hookSource, /setProfileLoadSucceeded\(false\)/);
  assert.match(hookSource, /setProfileLoadSucceeded\(true\)/);
});

test("blocks reentrant submits before form validation starts", async () => {
  const source = await readFile(personalProfilePagePath, "utf8");
  const submitStart = source.indexOf("const handleSubmit = async () =>");
  const submitEnd = source.indexOf("const showActionFooter", submitStart);
  const submitSource = source.slice(submitStart, submitEnd);

  const guardIndex = submitSource.indexOf("if (isSubmittingRef.current) return");
  const lockIndex = submitSource.indexOf("isSubmittingRef.current = true");
  const validationIndex = submitSource.indexOf("form.validateFields()");

  assert.ok(guardIndex >= 0);
  assert.ok(lockIndex > guardIndex);
  assert.ok(validationIndex > lockIndex);
});
