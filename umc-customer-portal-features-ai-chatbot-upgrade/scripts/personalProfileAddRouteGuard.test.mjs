import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const guardModulePath = new URL(
  "../src/pages/PersonalProfile/utils/profileRouteGuard.ts",
  import.meta.url,
);
const personalProfilePagePath = new URL(
  "../src/pages/PersonalProfile/index.tsx",
  import.meta.url,
);
const myAccountPagePath = new URL(
  "../src/pages/MyAccount/index.tsx",
  import.meta.url,
);

async function loadGuardModule() {
  const source = await readFile(guardModulePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: guardModulePath.pathname,
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;

  return import(dataUrl);
}

test("builds the existing personal-profile detail URL from API data", async () => {
  const { buildExistingPersonalProfileDetailUrl } = await loadGuardModule();

  assert.equal(
    buildExistingPersonalProfileDetailUrl(
      { type: 3, isGethirdPartyApi: false },
      "underReview",
    ),
    "/my-account/personal-profile?mode=edit&pageMode=underReview&isGethirdPartyApi=false",
  );
  assert.equal(
    buildExistingPersonalProfileDetailUrl(
      { type: 3, isGethirdPartyApi: true },
      "approved",
    ),
    "/my-account/personal-profile?mode=edit&pageMode=approved&isGethirdPartyApi=null",
  );
});

test("guards add mode with the real personal-profile lookup", async () => {
  const source = await readFile(personalProfilePagePath, "utf8");

  assert.match(source, /getUserIndividual\(userInfo\.id\)/);
  assert.match(source, /history\.replace\(redirectUrl\)/);
  assert.match(source, /addModeProfileCheckKey === location\.key/);
  assert.match(source, /setAddModeProfileCheckKey\(location\.key\)/);
});

test("uses one detail URL builder for add guards and My Account navigation", async () => {
  const source = await readFile(myAccountPagePath, "utf8");

  assert.match(source, /buildExistingPersonalProfileDetailUrl\(/);
  assert.match(source, /getPersonalProfilePageMode\(personalProfile\)/);
  assert.doesNotMatch(source, /function getPersonalProfileDetailsPageMode/);
});
