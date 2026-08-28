import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  countValidTrainees,
  createDataListLanguageCandidate,
  getDataListLanguageEditFallback,
  getDataListStoredLanguageFields,
  getDataListRuleViolation,
  hasReachedDataListMaxItems,
  isDuplicateDataListLanguage,
  isDuplicateTraineeEmail,
  isDuplicateTraineeEmiratesId,
  isDuplicateTraineeMobile,
  isSameDataListLanguage,
  isValidTraineeRecord,
  normalizeDataListMaxItems,
  normalizeDataListMinItems,
  resolveDataListMinItems,
} from "../src/components/designable/src/components/DataList/dataListRules.ts";

const validTrainee = (overrides = {}) => ({
  fullName: "John Doe",
  emiratesIdNumber: "784-1990-1234567-1",
  mobileNumber: "+971501234567",
  email: "john@example.com",
  ...overrides,
});

test("resolves explicit and constrained language-list minimums", () => {
  assert.equal(
    resolveDataListMinItems({
      minItems: 2,
      dataSource: "languages_name_list",
      required: true,
    }),
    2,
  );
  assert.equal(
    resolveDataListMinItems({
      minItems: 2,
      dataSource: "languages_name_list",
      required: false,
    }),
    2,
  );
  assert.equal(
    resolveDataListMinItems({
      dataSource: "languages_name_list",
      required: true,
      maxItems: 2,
      serviceCode: 1203,
      uniqueLanguageRequired: true,
    }),
    1,
  );
  assert.equal(
    resolveDataListMinItems({
      minItems: 0,
      dataSource: "languages_name_list",
      required: true,
      maxItems: 2,
      serviceCode: "1203",
      uniqueLanguageRequired: true,
    }),
    1,
  );
  assert.equal(
    resolveDataListMinItems({
      dataSource: "languages_name_list",
      required: true,
      maxItems: 2,
      serviceCode: 1201,
      uniqueLanguageRequired: true,
    }),
    undefined,
  );
  assert.equal(
    resolveDataListMinItems({
      dataSource: "languages_name_list",
      required: true,
    }),
    undefined,
  );
  assert.equal(
    resolveDataListMinItems({
      dataSource: "languages_name_list",
      required: true,
      maxItems: 2,
      uniqueLanguageRequired: false,
    }),
    undefined,
  );
  assert.equal(
    resolveDataListMinItems({
      dataSource: "languages_name_list",
      required: false,
    }),
    undefined,
  );
  assert.equal(
    resolveDataListMinItems({
      minItems: 2,
      dataSource: "material_list",
      required: true,
    }),
    undefined,
  );
  assert.equal(
    resolveDataListMinItems({
      dataSource: "material_list",
      required: true,
    }),
    undefined,
  );
});

test("normalizes only positive integer max item values", () => {
  assert.equal(normalizeDataListMaxItems(1), 1);
  assert.equal(normalizeDataListMaxItems(12), 12);
  assert.equal(normalizeDataListMaxItems(undefined), undefined);
  assert.equal(normalizeDataListMaxItems(null), undefined);
  assert.equal(normalizeDataListMaxItems("2"), undefined);
  assert.equal(normalizeDataListMaxItems(0), undefined);
  assert.equal(normalizeDataListMaxItems(-1), undefined);
  assert.equal(normalizeDataListMaxItems(1.5), undefined);
  assert.equal(normalizeDataListMaxItems(Number.POSITIVE_INFINITY), undefined);
});

test("reports the max as reached at the configured item count", () => {
  assert.equal(hasReachedDataListMaxItems(1, 2), false);
  assert.equal(hasReachedDataListMaxItems(2, 2), true);
  assert.equal(hasReachedDataListMaxItems(2, 3), false);
  assert.equal(hasReachedDataListMaxItems(3, 3), true);
  assert.equal(hasReachedDataListMaxItems(3, 2), true);
  assert.equal(hasReachedDataListMaxItems(3, undefined), false);
});

test("compares matching language ids before language names", () => {
  assert.equal(
    isSameDataListLanguage(
      { languageId: 6, language: "English" },
      { languageId: "6", language: "Arabic" },
    ),
    true,
  );
  assert.equal(
    isSameDataListLanguage(
      { languageId: 6, language: "English" },
      { languageId: 7, language: "English" },
    ),
    false,
  );
});

test("falls back to normalized language names for legacy rows", () => {
  assert.equal(
    isSameDataListLanguage(
      { language: " English " },
      { languageId: 6, language: "english" },
    ),
    true,
  );
  assert.equal(
    isSameDataListLanguage({ language: "" }, { language: "" }),
    false,
  );
});

test("builds a lookup-backed candidate that matches legacy name-only rows", () => {
  const candidate = createDataListLanguageCandidate({
    value: 6,
    label: "English",
    saveLabel: "English",
  });

  assert.deepEqual(candidate, {
    language: "English",
    languageId: 6,
  });
  assert.equal(
    isDuplicateDataListLanguage([{ language: "English" }], candidate),
    true,
  );
});

test("preserves stored language values when edit lookup options are not ready", () => {
  assert.deepEqual(
    getDataListLanguageEditFallback({
      language: "English",
      languageId: 6,
    }),
    {
      language: 6,
      languageId: 6,
    },
  );
  assert.deepEqual(
    getDataListLanguageEditFallback({ language: "English" }),
    {
      language: "English",
    },
  );
  assert.deepEqual(getDataListLanguageEditFallback({}), {});
  assert.deepEqual(
    getDataListStoredLanguageFields({
      language: "English",
      languageId: 6,
    }),
    {
      language: "English",
      languageId: 6,
    },
  );
});

test("excludes the edited row when checking a language candidate", () => {
  const rows = [
    { languageId: 6, language: "English" },
    { languageId: 7, language: "Arabic" },
  ];

  assert.equal(isDuplicateDataListLanguage(rows, rows[0], 0), false);
  assert.equal(
    isDuplicateDataListLanguage(
      rows,
      { languageId: 6, language: "English" },
      1,
    ),
    true,
  );
});

test("gives max item violations priority over duplicate languages", () => {
  const rows = [
    { languageId: 6, language: "English" },
    { languageId: 6, language: "English" },
  ];

  assert.deepEqual(
    getDataListRuleViolation(rows, {
      maxItems: 1,
      uniqueLanguageRequired: true,
    }),
    { type: "maxItems", maxItems: 1 },
  );
  assert.deepEqual(
    getDataListRuleViolation(rows, {
      maxItems: 2,
      uniqueLanguageRequired: true,
    }),
    { type: "duplicateLanguage" },
  );
  assert.equal(
    getDataListRuleViolation(rows, {
      maxItems: 2,
      uniqueLanguageRequired: false,
    }),
    undefined,
  );
});

test("normalizes only positive integer min item values", () => {
  assert.equal(normalizeDataListMinItems(1), 1);
  assert.equal(normalizeDataListMinItems(2), 2);
  assert.equal(normalizeDataListMinItems(undefined), undefined);
  assert.equal(normalizeDataListMinItems("2"), undefined);
  assert.equal(normalizeDataListMinItems(0), undefined);
  assert.equal(normalizeDataListMinItems(-1), undefined);
  assert.equal(normalizeDataListMinItems(1.5), undefined);
});

test("treats a trainee as valid only when all four fields pass", () => {
  assert.equal(isValidTraineeRecord(validTrainee()), true);
  assert.equal(isValidTraineeRecord(validTrainee({ fullName: "" })), false);
  assert.equal(
    isValidTraineeRecord(validTrainee({ fullName: "  " })),
    false,
  );
  assert.equal(
    isValidTraineeRecord(validTrainee({ fullName: "x".repeat(201) })),
    false,
  );
  assert.equal(
    isValidTraineeRecord(validTrainee({ emiratesIdNumber: "784123456712341" })),
    false,
  );
  assert.equal(
    isValidTraineeRecord(validTrainee({ mobileNumber: "0501234567" })),
    false,
  );
  assert.equal(
    isValidTraineeRecord(validTrainee({ mobileNumber: "+971001234567" })),
    false,
  );
  assert.equal(
    isValidTraineeRecord(validTrainee({ email: "not-an-email" })),
    false,
  );
  assert.equal(
    isValidTraineeRecord(
      validTrainee({ email: `${"a".repeat(250)}@x.com` }),
    ),
    false,
  );
});

test("counts only valid trainee rows", () => {
  const rows = [
    validTrainee(),
    validTrainee({ email: "bad" }),
    validTrainee({ emiratesIdNumber: "784-1990-7654321-2", email: "a@b.co" }),
  ];
  assert.equal(countValidTrainees(rows), 2);
  assert.equal(countValidTrainees([]), 0);
});

test("detects duplicate Emirates ID ignoring dash formatting", () => {
  const rows = [
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
    validTrainee({ emiratesIdNumber: "784199012345671" }),
  ];
  // Same digits, different formatting -> duplicate.
  assert.equal(isDuplicateTraineeEmiratesId(rows, rows[1], null), true);
  // Excluding its own row -> not a duplicate against itself.
  assert.equal(isDuplicateTraineeEmiratesId(rows, rows[0], 0), true);
  // Blank candidate never duplicates.
  assert.equal(
    isDuplicateTraineeEmiratesId(rows, validTrainee({ emiratesIdNumber: "" }), null),
    false,
  );
});

test("detects duplicate email case-insensitively and mobile by digits", () => {
  const rows = [
    validTrainee({ email: "John@Example.com", mobileNumber: "+971501234567" }),
    validTrainee({ email: "john@example.com", mobileNumber: "+971501234567" }),
  ];
  assert.equal(isDuplicateTraineeEmail(rows, rows[1], null), true);
  assert.equal(isDuplicateTraineeMobile(rows, rows[1], null), true);
  assert.equal(
    isDuplicateTraineeEmail(rows, validTrainee({ email: "" }), null),
    false,
  );
});

test("prioritizes trainee duplicates over minItems, in ID > email > mobile order", () => {
  const dupEmiratesId = [
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
    validTrainee({
      emiratesIdNumber: "784-1990-1234567-1",
      email: "other@example.com",
      mobileNumber: "+971509999999",
    }),
  ];
  assert.deepEqual(
    getDataListRuleViolation(dupEmiratesId, {
      minItems: 2,
      traineeRulesEnabled: true,
    }),
    { type: "duplicateEmiratesId" },
  );

  const dupEmail = [
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
    validTrainee({
      emiratesIdNumber: "784-1990-7654321-2",
      email: "john@example.com",
      mobileNumber: "+971509999999",
    }),
  ];
  assert.deepEqual(
    getDataListRuleViolation(dupEmail, {
      minItems: 2,
      traineeRulesEnabled: true,
    }),
    { type: "duplicateEmail" },
  );

  const dupMobile = [
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
    validTrainee({
      emiratesIdNumber: "784-1990-7654321-2",
      email: "other@example.com",
      mobileNumber: "+971501234567",
    }),
  ];
  assert.deepEqual(
    getDataListRuleViolation(dupMobile, {
      minItems: 2,
      traineeRulesEnabled: true,
    }),
    { type: "duplicateMobile" },
  );
});

test("flags minItems when fewer than the required valid trainees", () => {
  const oneValid = [
    validTrainee(),
    validTrainee({
      emiratesIdNumber: "784-1990-7654321-2",
      mobileNumber: "+971509999999",
      email: "bad",
    }),
  ];
  assert.deepEqual(
    getDataListRuleViolation(oneValid, {
      minItems: 2,
      traineeRulesEnabled: true,
    }),
    { type: "minItems", minItems: 2 },
  );

  const twoValid = [
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
    validTrainee({
      emiratesIdNumber: "784-1990-7654321-2",
      email: "jane@example.com",
      mobileNumber: "+971509999999",
    }),
  ];
  assert.equal(
    getDataListRuleViolation(twoValid, {
      minItems: 2,
      traineeRulesEnabled: true,
    }),
    undefined,
  );
});

test("reports values below the configured minimum", () => {
  assert.deepEqual(
    getDataListRuleViolation([], {
      minItems: 1,
      maxItems: 2,
      uniqueLanguageRequired: true,
    }),
    { type: "minItems", minItems: 1 },
  );
  assert.equal(
    getDataListRuleViolation([{ languageId: 6, language: "English" }], {
      minItems: 1,
    }),
    undefined,
  );
  assert.equal(
    getDataListRuleViolation([], {
      minItems: undefined,
    }),
    undefined,
  );
});

test("defaults to the spec minimum when the schema carries no minItems", () => {
  // Services published before the designer exposed a Min Items setter send no
  // minItems; AC-09 must still be enforced for them.
  assert.deepEqual(
    getDataListRuleViolation([validTrainee()], {
      traineeRulesEnabled: true,
    }),
    { type: "minItems", minItems: 2 },
  );

  const twoValid = [
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
    validTrainee({
      emiratesIdNumber: "784-1990-7654321-2",
      email: "jane@example.com",
      mobileNumber: "+971509999999",
    }),
  ];
  assert.equal(
    getDataListRuleViolation(twoValid, { traineeRulesEnabled: true }),
    undefined,
  );
});

test("skips trainee rules when not enabled", () => {
  const dup = [
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
    validTrainee({ emiratesIdNumber: "784-1990-1234567-1" }),
  ];
  assert.equal(
    getDataListRuleViolation(dup, { minItems: 2, traineeRulesEnabled: false }),
    undefined,
  );
});

test("validates the language selector immediately for duplicate values", () => {
  const componentSource = readFileSync(
    "src/components/designable/src/components/DataList/DataList.tsx",
    "utf8",
  );

  assert.match(
    componentSource,
    /validateTrigger=\{\s*isLanguageField\s*\?\s*"onChange"\s*:\s*undefined\s*\}/,
  );
  assert.match(
    componentSource,
    /createDataListLanguageCandidate\(\s*selectedLanguageOption,\s*\)/,
  );
  assert.match(
    componentSource,
    /isDuplicateDataListLanguage\(\s*data,\s*languageCandidate,\s*editingIndex,\s*\)/,
  );
  assert.match(
    componentSource,
    /return Promise\.reject\([\s\S]*?"DataList\.validation\.duplicateLanguage"[\s\S]*?\);/,
  );
  assert.doesNotMatch(
    componentSource,
    /!usesPublicationLanguageId\s*&&\s*!modalVisible/,
  );
  assert.match(
    componentSource,
    /const shouldPreload = !languagesRequestedRef\.current;/,
  );
  // A failed load must also be retried on open, so the retry gate is not just
  // "list is empty" — it also fires when the previous attempt failed, and it
  // fires at most once per open.
  assert.match(
    componentSource,
    /const shouldRetryOnOpen =\s*modalVisible &&\s*!languagesRetriedForOpenRef\.current &&\s*\(languageItemsRaw\.length === 0 \|\| languagesLoadFailed\);/,
  );
  assert.match(
    componentSource,
    /if \(\s*!shouldPreload &&\s*\(!shouldRetryOnOpen \|\| languagesRequestInFlightRef\.current\)\s*\)/,
  );
  assert.match(
    componentSource,
    /Object\.assign\(\s*formValues,\s*getDataListLanguageEditFallback\(record\),\s*\)/,
  );
  assert.match(
    componentSource,
    /Object\.assign\(\s*item,\s*getDataListStoredLanguageFields\(originalRecord\),\s*\)/,
  );
});

test("uses overflow-aware tooltips for language list cells", () => {
  const componentSource = readFileSync(
    "src/components/designable/src/components/DataList/DataList.tsx",
    "utf8",
  );
  const stylesSource = readFileSync(
    "src/components/designable/src/components/DataList/DataList.less",
    "utf8",
  );

  assert.match(
    componentSource,
    /import OverflowTooltip from "@\/components\/common\/OverflowTooltip"/,
  );
  assert.match(
    componentSource,
    /const isLanguageNameListField = \(fieldName: string\) =>[\s\S]*?fieldName === "Language"[\s\S]*?fieldName === "Suggested Name"/,
  );
  assert.match(
    componentSource,
    /<OverflowTooltip[\s\S]*?className="datalist-overflow-value"[\s\S]*?title=\{displayValue\}/,
  );
  assert.match(
    stylesSource,
    /\.datalist-overflow-value\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
  );
  assert.match(
    componentSource,
    /scroll=\{\s*isLanguagesNameList\(effectiveFieldSource\)\s*\?\s*undefined\s*:\s*\{\s*x:\s*true\s*\}\s*\}/,
  );
  assert.match(
    componentSource,
    /getLanguageNameListColumnWidth[\s\S]*?fieldName === "Language"\) return "28%";/,
  );
  assert.match(
    componentSource,
    /title: t\("DataList.actions"\),[\s\S]*?width: 140,/,
  );
});
