import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeService1801IdSelectorFormilyList,
  resolveService1801IdSelectorRuntimeType,
} from "../src/pages/MediaLicense/service1801IdSelectorRuntime.ts";

const createList = (
  selectedKey: unknown,
  idSelector: Record<string, unknown> | undefined,
) => [
  {
    formData: JSON.stringify({
      schema: { properties: { SelectTableSingle: { "x-component": "SelectTableSingle" } } },
      formValues: { SelectTableSingle: { selectedKey } },
    }),
  },
  {
    formData: JSON.stringify({
      schema: { properties: { idSelector: { "x-component": "IDSelector" } } },
      formValues: idSelector ? { idSelector } : {},
    }),
  },
];

const readIdSelector = (list: Array<{ formData?: string }>) =>
  JSON.parse(list[1].formData || "{}").formValues.idSelector;

test("maps regular activity 2036 to Emirates ID", () => {
  const list = createList(["2036"], { type: "passport", passportNumber: "P1" });
  assert.equal(resolveService1801IdSelectorRuntimeType(list), "emiratesId");
  assert.deepEqual(readIdSelector(normalizeService1801IdSelectorFormilyList(list)), {
    type: "emiratesId",
  });
});

test("maps temporary activity 2035 to Passport", () => {
  const list = createList([2035], {
    type: "emiratesId",
    emiratesId: "784-1",
    passportNumber: "P1",
    PersonalPhoto: "photo.png",
  });
  assert.equal(resolveService1801IdSelectorRuntimeType(list), "passport");
  assert.deepEqual(readIdSelector(normalizeService1801IdSelectorFormilyList(list)), {
    type: "passport",
    passportNumber: "P1",
    PersonalPhoto: "photo.png",
  });
});

test("uses the first selected activity when malformed data contains multiple values", () => {
  assert.equal(
    resolveService1801IdSelectorRuntimeType(
      createList(["9999", "2035", "2036"], undefined),
    ),
    "passport",
  );
});

test("removes IDSelector data when activity is missing or unsupported", () => {
  const missing = normalizeService1801IdSelectorFormilyList(
    createList([], { type: "passport", passportNumber: "P1" }),
  );
  const unsupported = normalizeService1801IdSelectorFormilyList(
    createList(["9999"], { type: "emiratesId", emiratesId: "784-1" }),
  );
  assert.equal(readIdSelector(missing), undefined);
  assert.equal(readIdSelector(unsupported), undefined);
});
