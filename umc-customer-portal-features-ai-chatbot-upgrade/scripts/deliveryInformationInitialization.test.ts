import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeliveryInformationDisplay,
  createDeliveryProfileRequestGuard,
  EMPTY_DELIVERY_INFORMATION_VALUES,
  resolveActiveApplicationDeliveryInformation,
  resolveApplicationDeliveryInformation,
  resolveInitialDeliveryInformation,
  shouldClearDeliveryCourierSelection,
  toProfileForm,
} from "../src/pages/Detail/DeliveryInformation/formValues.ts";

const applicationDetailDelivery = {
  id: 45,
  applicationId: 2856,
  applicationDetailId: 2856,
  courierId: 1,
  courierNameEn: "Emirates Post",
  courierNameAr: "Emirates Post",
  recipientName: "Peter",
  emirateId: 6,
  emirateNameEn: "Dubai",
  emirateNameAr: "دبي",
  regionId: 11,
  regionNameEn: "Dubai",
  regionNameAr: "دبي",
  areaId: 187,
  areaNameEn: "NAKHLAT DEIRA",
  areaNameAr: "نخلة ديره",
  street:
    "27 Rabat St - Al Reem Island - Shams Abu Dhabi - Abu Dhabi - United Arab Emirates",
  addressEn:
    "27 Rabat St - Al Reem Island - Shams Abu Dhabi - Abu Dhabi - United Arab Emirates - NAKHLAT DEIRA - Dubai - United Arab Emirates",
  addressAr:
    "27 Rabat St - Al Reem Island - Shams Abu Dhabi - Abu Dhabi - United Arab Emirates - نخلة ديره - دبي - الإمارات العربية المتحدة",
  mobile: "+971551529931",
  mobileCountryCode: "+971",
  mobileLocalNumber: "551529931",
};

test("reads delivery information from the application detail response", () => {
  assert.deepEqual(
    resolveApplicationDeliveryInformation({
      deliveryInfo: applicationDetailDelivery,
    }),
    applicationDetailDelivery,
  );
});

test("hides delivery information when application detail returns null", () => {
  assert.equal(
    resolveApplicationDeliveryInformation({ deliveryInfo: null }),
    null,
  );
});

test("does not show delivery information from a previous application", () => {
  assert.equal(
    resolveActiveApplicationDeliveryInformation(
      { applicationId: 2856, data: applicationDetailDelivery },
      225,
    ),
    null,
  );
});

test("uses backend-composed delivery values directly", () => {
  assert.deepEqual(
    buildDeliveryInformationDisplay(
      {
        courierService: "Aramex",
        recipientName: "James Huxley",
        mobileNumber: "+971565637283",
        address:
          "Al Huwelat street - Bateen Area - Abu Dhabi - United Arab Emirates",
      },
    ),
    {
      courierService: "Aramex",
      recipientName: "James Huxley",
      mobileNumber: "+971565637283",
      address:
        "Al Huwelat street - Bateen Area - Abu Dhabi - United Arab Emirates",
    },
  );
});

test("commits only the latest delivery profile request", () => {
  const guard = createDeliveryProfileRequestGuard();
  const firstRequestId = guard.begin();
  const secondRequestId = guard.begin();

  assert.equal(guard.isCurrent(firstRequestId), false);
  assert.equal(guard.isCurrent(secondRequestId), true);

  guard.invalidate();
  assert.equal(guard.isCurrent(secondRequestId), false);

  let stateUpdateCount = 0;
  let requestCount = 0;
  const requestAfterInvalidation = guard.begin();
  if (requestAfterInvalidation !== null) {
    stateUpdateCount += 1;
    requestCount += 1;
  }

  assert.equal(requestAfterInvalidation, null);
  assert.equal(stateUpdateCount, 0);
  assert.equal(requestCount, 0);
});

test("maps split personal profile fields into delivery information", () => {
  assert.deepEqual(
    toProfileForm({
      fullNameEn: "Peter",
      mobileNumber: "+971551529931",
      mobileCountryCode: "+971",
      mobileLocalNumber: "551529931",
      emirateId: 6,
      regionId: 11,
      areaId: 187,
      street: "27 Rabat St",
    }),
    {
      courierService: "",
      recipientName: "Peter",
      emirateId: 6,
      regionId: 11,
      areaId: 187,
      street: "27 Rabat St",
      mobile: {
        mobileCountryCode: "+971",
        mobileLocalNumber: "551529931",
      },
    },
  );
});

test("splits a legacy international profile mobile number", () => {
  assert.deepEqual(
    toProfileForm({
      fullNameEn: "Peter",
      mobileNumber: "+971551529931",
    }).mobile,
    {
      mobileCountryCode: "+971",
      mobileLocalNumber: "551529931",
    },
  );
});

test("preserves an explicit local number when the split country code is missing", () => {
  assert.deepEqual(
    toProfileForm({
      fullNameEn: "Peter",
      mobileCountryCode: null,
      mobileLocalNumber: "551529931",
      mobileNumber: null,
    }).mobile,
    {
      mobileCountryCode: "+971",
      mobileLocalNumber: "551529931",
    },
  );
});

test("uses saved delivery information for an existing application", () => {
  assert.deepEqual(
    resolveInitialDeliveryInformation({
      applicationId: 1504,
      savedDelivery: {
        courierId: 9,
        recipientName: "Saved Recipient",
        emirateId: 1,
        regionId: 2,
        areaId: 3,
        street: "Saved Street",
        mobileCountryCode: "+971",
        mobileLocalNumber: "501234567",
      },
      personalProfile: {
        fullNameEn: "Profile Recipient",
        emirateId: 6,
        regionId: 11,
        areaId: 187,
        street: "Profile Street",
        mobileNumber: "+971551529931",
      },
    }),
    {
      courierService: 9,
      recipientName: "Saved Recipient",
      emirateId: 1,
      regionId: 2,
      areaId: 3,
      street: "Saved Street",
      mobile: {
        mobileCountryCode: "+971",
        mobileLocalNumber: "501234567",
      },
    },
  );
});

test("does not replace missing saved delivery with profile data", () => {
  assert.deepEqual(
    resolveInitialDeliveryInformation({
      applicationId: 1504,
      savedDelivery: null,
      personalProfile: {
        fullNameEn: "Profile Recipient",
        mobileNumber: "+971551529931",
      },
    }),
    EMPTY_DELIVERY_INFORMATION_VALUES,
  );
});

test("preserves a saved courier before the lookup resolves", () => {
  assert.equal(
    shouldClearDeliveryCourierSelection({
      courierService: 9,
      courierLookupResolved: false,
      courierOptions: [],
    }),
    false,
  );
});

test("clears a saved courier after an empty lookup resolves", () => {
  assert.equal(
    shouldClearDeliveryCourierSelection({
      courierService: 9,
      courierLookupResolved: true,
      courierOptions: [],
    }),
    true,
  );
});
