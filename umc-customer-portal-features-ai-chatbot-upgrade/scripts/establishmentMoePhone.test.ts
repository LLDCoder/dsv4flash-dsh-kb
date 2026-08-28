import assert from "node:assert/strict";
import test from "node:test";
import { toMobileNumberValue } from "../src/components/common/MobileNumberInput/utils.ts";
import { mapMoeLicenseDetailsToFormValues } from "../src/pages/EstablishmentProfile/utils/formHelpers.ts";

const UAE_COUNTRY_CODE = "+971";
const UAE_LOCAL_NUMBER = "544598777";

const assertPhoneReadOnly = (readOnlyFields: string[], expected: boolean) => {
  assert.equal(readOnlyFields.includes("phoneNumber"), expected);
  assert.equal(readOnlyFields.includes("establishmentMobile"), expected);
};

test("removes supported UAE prefixes from an MOE phone number", () => {
  const phoneCases = [
    { sourceNumber: "+971544598777", expectedLocalNumber: UAE_LOCAL_NUMBER },
    { sourceNumber: "00971544598777", expectedLocalNumber: UAE_LOCAL_NUMBER },
    { sourceNumber: "0971544598777", expectedLocalNumber: UAE_LOCAL_NUMBER },
    { sourceNumber: "971544598777", expectedLocalNumber: UAE_LOCAL_NUMBER },
    { sourceNumber: "+9710544598777", expectedLocalNumber: UAE_LOCAL_NUMBER },
  ];

  phoneCases.forEach(({ sourceNumber, expectedLocalNumber }) => {
    const result = mapMoeLicenseDetailsToFormValues({
      countryCode: UAE_COUNTRY_CODE,
      licenseMobPhoneNo: sourceNumber,
    });

    assert.deepEqual(result.values.establishmentMobile, {
      phoneCountryCode: UAE_COUNTRY_CODE,
      phoneLocalNumber: expectedLocalNumber,
    });
    assertPhoneReadOnly(result.readOnlyFields, true);
  });
});

test("normalizes supported UAE country-code aliases before strict validation", () => {
  ["971", "0971", "00971", "+971"].forEach((countryCode) => {
    const result = mapMoeLicenseDetailsToFormValues({
      countryCode,
      licenseMobPhoneNo: "0502223344",
    });

    assert.deepEqual(result.values.establishmentMobile, {
      phoneCountryCode: UAE_COUNTRY_CODE,
      phoneLocalNumber: "502223344",
    });
    assertPhoneReadOnly(result.readOnlyFields, true);
  });
});

test("defaults unrecognized country codes to UAE before strict validation", () => {
  ["9712", "09712", "009712", "+9712", "abc971", "+971x", "+999"].forEach(
    (countryCode) => {
      const result = mapMoeLicenseDetailsToFormValues({
        countryCode,
        licenseMobPhoneNo: "0502223344",
      });

      assert.deepEqual(result.values.establishmentMobile, {
        phoneCountryCode: UAE_COUNTRY_CODE,
        phoneLocalNumber: "502223344",
      });
      assertPhoneReadOnly(result.readOnlyFields, true);
    },
  );
});

test("keeps an MOE local phone number without a UAE prefix unchanged", () => {
  const result = mapMoeLicenseDetailsToFormValues({
    countryCode: UAE_COUNTRY_CODE,
    licenseMobPhoneNo: UAE_LOCAL_NUMBER,
  });

  assert.deepEqual(result.values.establishmentMobile, {
    phoneCountryCode: UAE_COUNTRY_CODE,
    phoneLocalNumber: UAE_LOCAL_NUMBER,
  });
  assertPhoneReadOnly(result.readOnlyFields, true);
});

test("defaults a local MOE phone without a country code to UAE", () => {
  const result = mapMoeLicenseDetailsToFormValues({
    licenseMobPhoneNo: "0502223344",
  });

  assert.deepEqual(result.values.establishmentMobile, {
    phoneCountryCode: UAE_COUNTRY_CODE,
    phoneLocalNumber: "502223344",
  });
  assertPhoneReadOnly(result.readOnlyFields, true);
});

test("locks a valid non-UAE MOE phone", () => {
  const result = mapMoeLicenseDetailsToFormValues({
    countryCode: "+44",
    licenseMobPhoneNo: "7911123456",
  });

  assert.deepEqual(result.values.establishmentMobile, {
    phoneCountryCode: "+44",
    phoneLocalNumber: "7911123456",
  });
  assertPhoneReadOnly(result.readOnlyFields, true);
});

test("splits and locks a valid complete non-UAE MOE phone", () => {
  [undefined, "+44"].forEach((countryCode) => {
    const result = mapMoeLicenseDetailsToFormValues({
      countryCode,
      licenseMobPhoneNo: "+447911123456",
    });

    assert.deepEqual(result.values.establishmentMobile, {
      phoneCountryCode: "+44",
      phoneLocalNumber: "7911123456",
    });
    assertPhoneReadOnly(result.readOnlyFields, true);
  });
});

test("displays the UAE default for a missing stored country code", () => {
  const fieldNames = {
    countryCode: "phoneCountryCode",
    phoneNumber: "phoneLocalNumber",
  } as const;

  assert.deepEqual(
    toMobileNumberValue(
      {
        phoneCountryCode: "",
        phoneLocalNumber: "0502223344",
      },
      UAE_COUNTRY_CODE,
      fieldNames,
    ),
    {
      countryCode: UAE_COUNTRY_CODE,
      phoneNumber: "0502223344",
    },
  );
  assert.deepEqual(toMobileNumberValue(undefined, UAE_COUNTRY_CODE, fieldNames), {
    countryCode: UAE_COUNTRY_CODE,
    phoneNumber: "",
  });
});

test("keeps invalid MOE phones editable", () => {
  const invalidPhones = [
    { countryCode: UAE_COUNTRY_CODE, licenseMobPhoneNo: "123" },
    { countryCode: UAE_COUNTRY_CODE, licenseMobPhoneNo: "000000000" },
    { countryCode: UAE_COUNTRY_CODE, licenseMobPhoneNo: "501234567890123" },
    { countryCode: "+999", licenseMobPhoneNo: "123" },
    { countryCode: "+44", licenseMobPhoneNo: "+971502223344" },
    { countryCode: "+999", licenseMobPhoneNo: "+447911123456" },
  ];

  invalidPhones.forEach((phone) => {
    const result = mapMoeLicenseDetailsToFormValues(phone);

    assert.notEqual(result.values.establishmentMobile, undefined);
    assertPhoneReadOnly(result.readOnlyFields, false);
  });
});

test("clears the MOE phone to an editable UAE default when no local number is returned", () => {
  ["", "+971", "00971", "0971", "971", 0].forEach((sourceNumber) => {
    const result = mapMoeLicenseDetailsToFormValues({
      countryCode: UAE_COUNTRY_CODE,
      licenseMobPhoneNo: sourceNumber,
    });

    assert.equal(result.values.phoneNumber, "");
    assert.deepEqual(result.values.establishmentMobile, {
      phoneCountryCode: UAE_COUNTRY_CODE,
      phoneLocalNumber: "",
    });
    assertPhoneReadOnly(result.readOnlyFields, false);
  });
});

test("a later MOE lookup without a phone clears the previous lookup phone", () => {
  const previous = mapMoeLicenseDetailsToFormValues({
    countryCode: UAE_COUNTRY_CODE,
    licenseMobPhoneNo: "0502223344",
  });
  const next = mapMoeLicenseDetailsToFormValues({
    licenseAddrStreet: "Next Street",
  });
  const mergedFormValues = { ...previous.values, ...next.values };

  assert.deepEqual(mergedFormValues.establishmentMobile, {
    phoneCountryCode: UAE_COUNTRY_CODE,
    phoneLocalNumber: "",
  });
  assert.equal(mergedFormValues.phoneNumber, "");
  assertPhoneReadOnly(next.readOnlyFields, false);
});

test("does not turn empty or unknown-only MOE details into a successful mapping", () => {
  [{}, { unknownField: "unknown" }].forEach((details) => {
    const result = mapMoeLicenseDetailsToFormValues(details);

    assert.deepEqual(result.values, {});
    assert.deepEqual(result.readOnlyFields, []);
  });
});

test("prefills the establishment Street without making it read-only", () => {
  const { values, readOnlyFields } = mapMoeLicenseDetailsToFormValues({
    licenseAddrStreet: "Al Wahda Street",
  });

  assert.equal(values.street, "Al Wahda Street");
  assert.equal(readOnlyFields.includes("street"), false);
});
