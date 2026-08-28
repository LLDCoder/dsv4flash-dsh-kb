import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRegulateEntryBookOptions,
  buildRegulateEntryBookPrefill,
  hasDisplayableAgeClassification,
  hasDistributorAgency,
  isLibraryApprovedBook,
  shouldDisplayAgeClassification,
} from "../src/components/designable/src/components/BookTradingForm/bookTradingRules.ts";

test("prefills approved regulate entry book history fields", () => {
  assert.deepEqual(
    buildRegulateEntryBookPrefill(
      {
        title: "Book title",
        isbn: "9781234567890",
        authorName: "Author",
        languageId: [1, "2"],
        numberOfCopies: 25,
        NationalDepositoryNo: "ND-10",
        PrintYear: 2025,
        VersionNumber: "2.1",
        SubjectCategory: "7",
        SubjectSubCategory: 8,
        DistributorAgency: "Agency",
        AgeClassification: 3,
      },
      [{ label: "18+", value: 3 }],
    ),
    {
      BookTitle: "Book title",
      AuthorName: "Author",
      NationalDepositoryNo: "ND-10",
      ISBN: "9781234567890",
      PrintYear: "2025",
      VersionNumber: "2.1",
      DistributorAgency: "Agency",
      NumberOfCopies: "25",
      Language: [1, "2"],
      SubjectCategory: 7,
      SubjectSubCategory: 8,
      AgeClassification: 3,
    },
  );
});

test("ignores invalid age classification history values", () => {
  assert.deepEqual(
    buildRegulateEntryBookPrefill(
      { AgeClassification: 0 },
      [{ label: "General", value: 1 }],
    ),
    {},
  );
  assert.deepEqual(
    buildRegulateEntryBookPrefill(
      { AgeClassification: "invalid" },
      [{ label: "General", value: 1 }],
    ),
    {},
  );
  assert.deepEqual(
    buildRegulateEntryBookPrefill(
      { AgeClassification: 3 },
      [{ label: "General", value: 1 }],
    ),
    {},
  );
  assert.deepEqual(buildRegulateEntryBookPrefill({ AgeClassification: 3 }), {
    AgeClassification: 3,
  });
});

test("keeps approved ISBN books and excludes unsupported rows", () => {
  const options = buildRegulateEntryBookOptions([
    { id: 101, title: "No ISBN", isbn: null, isApproved: true },
    { id: 102, title: "With ISBN", isbn: "9781234567890", isApproved: 1 },
    { id: 103, title: "Rejected", isbn: null, isApproved: false },
  ]);

  assert.deepEqual(
    options.map(({ label, value }) => ({ label, value })),
    [
      { label: "With ISBN", value: "9781234567890" },
    ],
  );
});

test("validates read-only optional field display values", () => {
  const ageOptions = [{ label: "18+", value: 3 }];

  assert.equal(hasDisplayableAgeClassification(3, ageOptions), true);
  assert.equal(hasDisplayableAgeClassification(0, ageOptions), false);
  assert.equal(hasDisplayableAgeClassification(4, ageOptions), false);
  assert.equal(hasDistributorAgency("  Agency  "), true);
  assert.equal(hasDistributorAgency("   "), false);
});

test("hides age classification only for service 204 regulate entry", () => {
  assert.equal(shouldDisplayAgeClassification(204, true, true), false);
  assert.equal(shouldDisplayAgeClassification("204", true, true), false);
  assert.equal(shouldDisplayAgeClassification(204, false, true), true);
  assert.equal(shouldDisplayAgeClassification(2401, true, true), true);
  assert.equal(shouldDisplayAgeClassification(204, true, false), false);
});

test("maps id-suffixed category fields and disables existing service 204 rows", () => {
  assert.deepEqual(
    buildRegulateEntryBookPrefill({
      subjectCategoryId: 7,
      subjectSubCategoryId: 8,
    }),
    {
      SubjectCategory: 7,
      SubjectSubCategory: 8,
    },
  );

  const option = buildRegulateEntryBookOptions([
    {
      isbn: "9781234567890",
      title: "Existing application",
      hasExistingService204Application: true,
    },
  ])[0];
  assert.equal(option.disabled, true);
});

test("treats only library-approved books as already classified", () => {
  assert.equal(isLibraryApprovedBook({ isApproved: true }), true);
  assert.equal(isLibraryApprovedBook({ isApproved: 1 }), true);
  // Pending review and "no library record" both arrive as null and stay classifiable.
  assert.equal(isLibraryApprovedBook({ isApproved: null }), false);
  assert.equal(isLibraryApprovedBook({}), false);
  assert.equal(isLibraryApprovedBook(undefined), false);
});
