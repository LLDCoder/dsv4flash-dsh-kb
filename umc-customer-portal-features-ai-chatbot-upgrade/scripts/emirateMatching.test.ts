import assert from "node:assert/strict";
import test from "node:test";

import {
  findMatchingEmirate,
  normalizeArabicEmirateName,
  normalizeEmirateName,
} from "../src/components/designable/src/components/AddressList/emirateMatching";

/** Mirrors GetEmirateList under Accept-Language: en. */
const englishEmirates = [
  { id: 8, nameEn: "Ajman", nameAr: "عجمان", code: "AJM" },
  { id: 10, nameEn: "Ras Al Khaimah", nameAr: "رأس الخيمة", code: "RAK" },
  { id: 11, nameEn: "Umm Al-Quwain", nameAr: "أم القيوين", code: "UAQ" },
  { id: 12, nameEn: "Fujairah", nameAr: "الفجيرة", code: "FUJ" },
];

/** Mirrors GetEmirateList under Accept-Language: ar, where nameEn is localized too. */
const arabicEmirates = [
  { id: 8, nameEn: "عجمان", nameAr: "عجمان", code: "AJM" },
  { id: 10, nameEn: "رأس الخيمة", nameAr: "رأس الخيمة", code: "RAK" },
  { id: 11, nameEn: "أم القيوين", nameAr: "أم القيوين", code: "UAQ" },
  { id: 12, nameEn: "الفجيرة", nameAr: "الفجيرة", code: "FUJ" },
];

test("normalizeEmirateName strips punctuation and case", () => {
  assert.equal(normalizeEmirateName("Ras Al-Khaimah"), "rasalkhaimah");
  assert.equal(normalizeEmirateName("عجمان"), "");
  assert.equal(normalizeEmirateName(undefined), "");
});

test("normalizeArabicEmirateName folds hamza, ya, ta marbuta and separators", () => {
  assert.equal(normalizeArabicEmirateName("رأس الخيمة"), "راسالخيمه");
  assert.equal(normalizeArabicEmirateName("إمارة عجمان"), "امارهعجمان");
  assert.equal(normalizeArabicEmirateName("Ajman"), "");
});

test("matches the English geocoder name against an English emirate list", () => {
  assert.equal(findMatchingEmirate("Ajman Emirate", englishEmirates)?.id, 8);
  assert.equal(findMatchingEmirate("Umm Al Quwain", englishEmirates)?.id, 11);
});

test("matches the English geocoder name when the list is localized to Arabic", () => {
  assert.equal(findMatchingEmirate("Ajman Emirate", arabicEmirates)?.id, 8);
  assert.equal(findMatchingEmirate("Ras Al Khaimah", arabicEmirates)?.id, 10);
  assert.equal(findMatchingEmirate("Umm Al Quwain", arabicEmirates)?.id, 11);
  assert.equal(findMatchingEmirate("Al Fujairah", arabicEmirates)?.id, 12);
});

test("matches an Arabic geocoder name against either list", () => {
  assert.equal(findMatchingEmirate("إمارة عجمان", arabicEmirates)?.id, 8);
  assert.equal(findMatchingEmirate("إمارة عجمان", englishEmirates)?.id, 8);
  assert.equal(findMatchingEmirate("رأس الخيمة", englishEmirates)?.id, 10);
});

/** The full GetEmirateList payload; codes verified against the running API. */
const allEmirates = [
  { id: 1, nameEn: "أبوظبي", nameAr: "أبوظبي", code: "AUH" },
  { id: 6, nameEn: "دبي", nameAr: "دبي", code: "DXB" },
  { id: 7, nameEn: "الشارقة", nameAr: "الشارقة", code: "SHJ" },
  { id: 8, nameEn: "عجمان", nameAr: "عجمان", code: "AJM" },
  { id: 10, nameEn: "رأس الخيمة", nameAr: "رأس الخيمة", code: "RAK" },
  { id: 11, nameEn: "أم القيوين", nameAr: "أم القيوين", code: "UAQ" },
  { id: 12, nameEn: "الفجيرة", nameAr: "الفجيرة", code: "FUJ" },
];

test("places every emirate Google can return on an Arabic-only list", () => {
  const expected: Array<[string, string]> = [
    ["Abu Dhabi Emirate", "AUH"],
    ["Dubai", "DXB"],
    ["Sharjah Emirate", "SHJ"],
    ["Ajman Emirate", "AJM"],
    ["Ras Al Khaimah", "RAK"],
    ["Umm Al Quwain", "UAQ"],
    ["Fujairah", "FUJ"],
  ];

  expected.forEach(([geocoderName, code]) => {
    assert.equal(findMatchingEmirate(geocoderName, allEmirates)?.code, code, geocoderName);
  });
});

test("keeps refusing emirates the service does not cover", () => {
  assert.equal(findMatchingEmirate("Dubai", arabicEmirates), undefined);
  assert.equal(findMatchingEmirate("دبي", arabicEmirates), undefined);
  assert.equal(findMatchingEmirate("Abu Dhabi Emirate", englishEmirates), undefined);
  assert.equal(findMatchingEmirate("Sharjah Emirate", arabicEmirates), undefined);
});

test("returns undefined for empty or unknown places", () => {
  assert.equal(findMatchingEmirate("", englishEmirates), undefined);
  assert.equal(findMatchingEmirate(undefined, englishEmirates), undefined);
  assert.equal(findMatchingEmirate("Doha", englishEmirates), undefined);
});

test("falls back to the code table only when it is unambiguous", () => {
  // A list entry without a code can still be matched by its own name.
  assert.equal(
    findMatchingEmirate("Fujairah", [{ nameEn: "Fujairah", nameAr: "الفجيرة" }])?.nameEn,
    "Fujairah",
  );
  // An Arabic-only list entry without a code has nothing left to match on.
  assert.equal(findMatchingEmirate("Fujairah", [{ nameEn: "الفجيرة", nameAr: "الفجيرة" }]), undefined);
});
