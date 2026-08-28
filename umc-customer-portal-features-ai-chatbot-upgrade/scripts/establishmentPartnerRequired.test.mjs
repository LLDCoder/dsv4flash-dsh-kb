import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { transform } from "esbuild";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const loadPartnerSectionValidation = async () => {
  try {
    const source = await readSource(
      "src/pages/EstablishmentProfile/utils/partnerSectionValidation.ts",
    );
    const { code } = await transform(source, {
      format: "esm",
      loader: "ts",
      target: "es2022",
    });
    return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  } catch {
    return {};
  }
};

test("validates the visible Partner List and its owner rules", async () => {
  const { isPartnerSectionValid } = await loadPartnerSectionValidation();

  assert.equal(
    typeof isPartnerSectionValid,
    "function",
    "missing partner-section validity helper",
  );

  const validApplicableSection = {
    partnerSectionVisible: true,
    partnersLength: 1,
    licenseOwnerRulesApply: true,
    ownerCount: 1,
    licenseOwnerMaxCount: 2,
  };
  const scenarios = [
    ["hidden partner section", { ...validApplicableSection, partnerSectionVisible: false }, true],
    ["visible empty partner list", { ...validApplicableSection, partnersLength: 0 }, false],
    [
      "non-applicable subtype with one partner",
      { ...validApplicableSection, licenseOwnerRulesApply: false, ownerCount: 0 },
      true,
    ],
    ["applicable subtype without an owner", { ...validApplicableSection, ownerCount: 0 }, false],
    ["applicable subtype with one owner", validApplicableSection, true],
    [
      "applicable subtype with two owners",
      { ...validApplicableSection, partnersLength: 2, ownerCount: 2 },
      true,
    ],
    [
      "applicable subtype above the owner limit",
      { ...validApplicableSection, partnersLength: 3, ownerCount: 3 },
      false,
    ],
  ];

  for (const [name, input, expected] of scenarios) {
    assert.equal(
      isPartnerSectionValid(input),
      expected,
      name,
    );
  }
});

test("keeps Submit clickable before validation", async () => {
  const source = await readSource(
    "src/pages/EstablishmentProfile/index.tsx",
  );

  assert.doesNotMatch(source, /disabled={!formState\.isFormValid}/);
  assert.match(source, /onClick={formState\.handleSubmit}/);
});

test("scrolls to the first invalid form field after Submit", async () => {
  const source = await readSource(
    "src/pages/EstablishmentProfile/hooks/useEstablishmentForm.ts",
  );
  const handleSubmitStart = source.indexOf("const handleSubmit = async () =>");
  const handleSubmitEnd = source.indexOf(
    "const handleEmailUpdate = async",
    handleSubmitStart,
  );
  const handleSubmitSource = source.slice(handleSubmitStart, handleSubmitEnd);

  assert.match(
    handleSubmitSource,
    /validationError\?\.errorFields\?\.\[0\]\?\.name/,
  );
  assert.match(handleSubmitSource, /scrollToFormField\(firstErrorField\)/);
  assert.match(source, /form\.scrollToField\(fieldName,/);
});

test("shows the Commercial License required message when no expiry warning is active", async () => {
  const source = await readSource(
    "src/pages/EstablishmentProfile/components/EstablishmentDocumentsSection/index.tsx",
  );
  const expiryHelpStart = source.indexOf("const expiryHelp =");
  const expiryHelpEnd = source.indexOf("return (", expiryHelpStart);
  const expiryHelpSource = source.slice(expiryHelpStart, expiryHelpEnd);

  assert.ok(expiryHelpStart >= 0, "missing Commercial License expiry help");
  assert.match(expiryHelpSource, /:\s*undefined;/);
  assert.doesNotMatch(expiryHelpSource, /:\s*\(\s*""\s*\)/);
  assert.match(source, /help={expiryHelp}/);
});

test("scrolls to Partner List when its Submit validation fails", async () => {
  const [hookSource, sectionSource] = await Promise.all([
    readSource(
      "src/pages/EstablishmentProfile/hooks/useEstablishmentForm.ts",
    ),
    readSource(
      "src/pages/EstablishmentProfile/components/PartnerListSection/index.tsx",
    ),
  ]);
  const handleSubmitStart = hookSource.indexOf("const handleSubmit = async () =>");
  const handleSubmitEnd = hookSource.indexOf(
    "const handleEmailUpdate = async",
    handleSubmitStart,
  );
  const handleSubmitSource = hookSource.slice(handleSubmitStart, handleSubmitEnd);

  assert.match(sectionSource, /id="establishment-partner-list-section"/);
  assert.match(
    handleSubmitSource,
    /setPartnerSectionSubmitError\("noPartners"\);\s*scrollToPartnerSection\(\);/,
  );
  assert.match(
    handleSubmitSource,
    /setPartnerSectionSubmitError\("noOwner"\);[\s\S]*?scrollToPartnerSection\(\);[\s\S]*?return;/,
  );
});

test("marks the Partner List section as required whenever it is rendered", async () => {
  const [source, styles] = await Promise.all([
    readSource(
      "src/pages/EstablishmentProfile/components/PartnerListSection/index.tsx",
    ),
    readSource("src/pages/EstablishmentProfile/index.less"),
  ]);

  assert.match(
    source,
    /<span className="partner-list-required-mark" aria-hidden="true">\*<\/span>/,
  );
  assert.match(
    source,
    /partnerSectionSubmitError === "noPartners"[\s\S]*partnerListRequiredTitle[\s\S]*partnerListRequiredDescription/,
  );
  assert.match(
    styles,
    /\.partner-list-required-mark\s*{[\s\S]*margin-inline-start:\s*4px;[\s\S]*color:\s*#e60000;/,
  );
});

test("blocks an empty rendered Partner List before license-owner validation", async () => {
  const source = await readSource(
    "src/pages/EstablishmentProfile/hooks/useEstablishmentForm.ts",
  );
  const handleSubmitStart = source.indexOf("const handleSubmit = async () =>");
  const handleSubmitEnd = source.indexOf(
    "const handleEmailUpdate = async",
    handleSubmitStart,
  );
  const handleSubmitSource = source.slice(handleSubmitStart, handleSubmitEnd);
  const emptyPartnerGuardIndex = handleSubmitSource.indexOf(
    'setPartnerSectionSubmitError("noPartners")',
  );
  const licenseOwnerGuardIndex = handleSubmitSource.indexOf(
    'setPartnerSectionSubmitError("noOwner")',
  );
  const addProfileRequestIndex = handleSubmitSource.indexOf(
    "addUserProfileEstablishment(addParams)",
  );
  const updateProfileRequestIndex = handleSubmitSource.indexOf(
    "updateUserProfileEstablishment(updateParams)",
  );

  assert.match(
    source,
    /type PartnerSectionSubmitError =\s*\| "noPartners"\s*\| "noOwner"\s*\| "multipleOwners";/,
  );
  assert.ok(handleSubmitStart >= 0, "missing handleSubmit implementation");
  assert.ok(handleSubmitEnd > handleSubmitStart, "missing handleSubmit boundary");
  assert.match(
    handleSubmitSource,
    /if \(partnerSectionVisible && partners\.length === 0\)/,
  );
  assert.ok(emptyPartnerGuardIndex >= 0, "missing empty Partner List guard");
  assert.ok(
    licenseOwnerGuardIndex > emptyPartnerGuardIndex,
    "empty Partner List guard must run before license-owner validation",
  );
  assert.ok(
    addProfileRequestIndex > emptyPartnerGuardIndex,
    "empty Partner List guard must run before the add-profile request",
  );
  assert.ok(
    updateProfileRequestIndex > emptyPartnerGuardIndex,
    "empty Partner List guard must run before the update-profile request",
  );
});
