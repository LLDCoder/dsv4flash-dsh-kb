import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bookListSource = readFileSync(
  "src/components/designable/src/components/BookList/BookListUploadField.tsx",
  "utf8",
);
const mediaLicenseSource = readFileSync(
  "src/pages/MediaLicense/index.tsx",
  "utf8",
);

test("validates the shared book-list Excel header before importing rows", () => {
  assert.match(bookListSource, /BOOK_LIST_TEMPLATE_HEADERS/);
  assert.match(bookListSource, /isBookListTemplateHeaderValid/);
  assert.match(bookListSource, /BookList\.message\.invalidTemplate/);
  assert.match(bookListSource, /publication_book_list_template\.xlsx/);
});

test("marks book-list errors and scrolls after any failed Next attempt", () => {
  assert.match(bookListSource, /data-form-validation-error="true"/);
  assert.match(
    bookListSource,
    /hasTotalWeightValidationError\s*\?\s*\{\s*"data-form-validation-error":\s*"true"/,
  );
  assert.match(bookListSource, /book-list-table-row-invalid/);
  assert.match(
    bookListSource,
    /state\.selfErrors\s*=\s*\[t\("BookList\.invalidRows"\)\]/,
  );
  assert.doesNotMatch(
    bookListSource,
    /Math\.min\(\.\.\.invalidRowIndexSet\)/,
  );
  assert.doesNotMatch(
    mediaLicenseSource,
    /!didAdvance && currentFormInstance\?\.invalid === true/,
  );
  assert.doesNotMatch(
    mediaLicenseSource,
    /targetedValidationError \|\|/,
  );
  assert.match(
    mediaLicenseSource,
    /firstValidationError\?\.classList\.contains\(\s*"book-list-validation-error",?\s*\)/,
  );
});
