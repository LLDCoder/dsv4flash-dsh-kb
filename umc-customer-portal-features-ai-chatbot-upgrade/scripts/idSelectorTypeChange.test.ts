import assert from "node:assert/strict";
import test from "node:test";
import { createForm } from "@formily/core";
import {
  buildIdSelectorTypeChangeValue,
  normalizeIdSelectorRuntimeValue,
  type IDSelectorValue,
} from "../src/components/designable/src/components/IDSelector/idSelectorUtils.ts";

const initialValue: IDSelectorValue = {
  type: "emiratesId",
  _icpLookupType: "emiratesId",
  _icpLookupSignature: "emiratesId|1990-05-20|784-1234-1234567-8",
  dateOfBirth: "1990-05-20",
  emiratesId: "784-1234-1234567-8",
  uid: "123456789",
  passportNumber: "P1234567",
  fullNameArabic: "Initial Arabic Name",
  fullNameEnglish: "Initial English Name",
  nationality: 784,
  gender: "male",
  occupation: "EXPERT",
  emiratesIdexpiryDate: "2034-01-01",
  passportExpiryDate: "2033-01-01",
  PersonalPhoto: "profile-photo.png",
  EmiratesID: "emirates-id.pdf",
  Passport: "passport.pdf",
  Visa: "visa.pdf",
  PassportScan: "passport-scan.pdf",
};

test("restores only Emirates ID initial details while clearing lookup inputs", () => {
  assert.deepEqual(buildIdSelectorTypeChangeValue("emiratesId", initialValue), {
    type: "emiratesId",
    fullNameArabic: "Initial Arabic Name",
    fullNameEnglish: "Initial English Name",
    nationality: 784,
    gender: "male",
    occupation: "EXPERT",
    emiratesIdexpiryDate: "2034-01-01",
    PersonalPhoto: "profile-photo.png",
    EmiratesID: "emirates-id.pdf",
  });
});

test("does not leak Emirates ID documents into Passport initial details", () => {
  assert.deepEqual(buildIdSelectorTypeChangeValue("passport", initialValue), {
    type: "passport",
    fullNameArabic: "Initial Arabic Name",
    fullNameEnglish: "Initial English Name",
    nationality: 784,
    gender: "male",
    occupation: "EXPERT",
    passportExpiryDate: "2033-01-01",
    PersonalPhoto: "profile-photo.png",
    PassportScan: "passport-scan.pdf",
  });
});

test("starts with only the selected type when initial details are unavailable", () => {
  assert.deepEqual(buildIdSelectorTypeChangeValue("uid"), { type: "uid" });
});

test("forces Passport and removes incompatible Emirates ID data", () => {
  assert.deepEqual(normalizeIdSelectorRuntimeValue(initialValue, "passport"), {
    type: "passport",
    dateOfBirth: "1990-05-20",
    passportNumber: "P1234567",
    fullNameArabic: "Initial Arabic Name",
    fullNameEnglish: "Initial English Name",
    nationality: 784,
    gender: "male",
    occupation: "EXPERT",
    passportExpiryDate: "2033-01-01",
    PersonalPhoto: "profile-photo.png",
    PassportScan: "passport-scan.pdf",
  });
});

test("preserves current-type lookup metadata while removing other type fields", () => {
  assert.deepEqual(normalizeIdSelectorRuntimeValue(initialValue, "emiratesId"), {
    type: "emiratesId",
    dateOfBirth: "1990-05-20",
    emiratesId: "784-1234-1234567-8",
    fullNameArabic: "Initial Arabic Name",
    fullNameEnglish: "Initial English Name",
    nationality: 784,
    gender: "male",
    occupation: "EXPERT",
    emiratesIdexpiryDate: "2034-01-01",
    PersonalPhoto: "profile-photo.png",
    EmiratesID: "emirates-id.pdf",
    _icpLookupType: "emiratesId",
    _icpLookupSignature: "emiratesId|1990-05-20|784-1234-1234567-8",
  });
});

test("clears IDSelector for an invalid activity and preserves schema behavior when unset", () => {
  assert.equal(normalizeIdSelectorRuntimeValue(initialValue, null), undefined);
  assert.equal(normalizeIdSelectorRuntimeValue(initialValue, undefined), initialValue);
});

test("reads initial details from the data path below a void layout field", () => {
  const form = createForm({ initialValues: { idSelector: initialValue } });
  const layoutField = form.createVoidField({ name: "layout" });
  const idSelectorField = form.createObjectField({
    basePath: layoutField.address,
    name: "idSelector",
  });

  assert.equal(String(idSelectorField.address), "layout.idSelector");
  assert.equal(String(idSelectorField.path), "idSelector");
  assert.equal(form.getInitialValuesIn(idSelectorField.address), undefined);
  assert.equal(
    form.getInitialValuesIn(idSelectorField.path).PersonalPhoto,
    "profile-photo.png",
  );
});
