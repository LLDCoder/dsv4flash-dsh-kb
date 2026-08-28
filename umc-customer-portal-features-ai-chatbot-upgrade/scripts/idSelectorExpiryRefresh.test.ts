import assert from "node:assert/strict";
import test from "node:test";
import {
  formatValidIcpExpiryDate,
  mergeIcpEmiratesIdExpiryIntoValue,
  shouldAutoRefreshEmiratesIdExpiry,
} from "../src/components/designable/src/components/IDSelector/expiryRefresh.ts";
import { patchFormDataWithService1204ReadOnlyLock } from "../src/pages/MediaLicense/specialServiceLogic/service1204.ts";
import { patchFormDataWithService802ReadOnlyLock } from "../src/pages/MediaLicense/specialServiceLogic/service802.ts";
import { patchFormDataWithService80021ReadOnlyLock } from "../src/pages/MediaLicense/specialServiceLogic/service80021.ts";
import { patchFormDataWithService80022ExpiryRefresh } from "../src/pages/MediaLicense/specialServiceLogic/service80022.ts";

const currentValue = {
  type: "emiratesId" as const,
  dateOfBirth: "1988-08-15",
  emiratesId: "784-1231-2312312-3",
  fullNameEnglish: "Existing Name",
  nationality: 95,
  emiratesIdexpiryDate: "2027-01-01",
  EmiratesID: "existing.pdf",
};

test("refreshes only Emirates ID expiry and lookup metadata", () => {
  const result = mergeIcpEmiratesIdExpiryIntoValue(currentValue, {
    identityCard: { expiryDate: "2032-02-03T00:00:00Z" },
  });

  assert.deepEqual(result, {
    ...currentValue,
    emiratesIdexpiryDate: "2032-02-03",
    _icpLookupType: "emiratesId",
    _icpLookupSignature:
      "emiratesId|1988-08-15|784-1231-2312312-3",
  });
});

test("preserves the current value by rejecting a missing or invalid expiry", () => {
  assert.equal(mergeIcpEmiratesIdExpiryIntoValue(currentValue, {}), undefined);
  assert.equal(
    mergeIcpEmiratesIdExpiryIntoValue(currentValue, {
      identityCard: { expiryDate: "not-a-date" },
    }),
    undefined,
  );
  assert.equal(formatValidIcpExpiryDate("not-a-date"), undefined);
});

test("auto refresh runs only for a valid Emirates ID lookup", () => {
  assert.equal(
    shouldAutoRefreshEmiratesIdExpiry(true, "emiratesId", currentValue),
    true,
  );
  assert.equal(
    shouldAutoRefreshEmiratesIdExpiry(true, "uid", currentValue),
    false,
  );
  assert.equal(
    shouldAutoRefreshEmiratesIdExpiry(false, "emiratesId", currentValue),
    false,
  );
  assert.equal(
    shouldAutoRefreshEmiratesIdExpiry(true, "emiratesId", {
      ...currentValue,
      dateOfBirth: "invalid",
    }),
    false,
  );
});

test("service 1204 enables expiry refresh and preserves upload editability", () => {
  const result = patchFormDataWithService1204ReadOnlyLock({
    parsedFormData: {
      schema: {
        type: "object",
        properties: {
          idSelector: {
            type: "object",
            "x-component": "IDSelector",
            "x-component-props": { showEmiratesId: true },
          },
        },
      },
    },
  });
  const idSelector = (
    result.schema as {
      properties: Record<string, Record<string, unknown>>;
    }
  ).properties.idSelector;
  const props = idSelector["x-component-props"] as Record<string, unknown>;

  assert.equal(idSelector["x-pattern"], "editable");
  assert.equal(props.autoRefreshEmiratesIdExpiry, true);
  assert.deepEqual(props.editableFieldKeys, [
    "PersonalPhoto",
    "EmiratesID",
    "Passport",
    "Visa",
    "PassportScan",
  ]);
});

test("service 802 enables expiry refresh and preserves upload editability", () => {
  const result = patchFormDataWithService802ReadOnlyLock({
    parsedFormData: {
      schema: {
        properties: {
          idSelector: {
            "x-component": "IDSelector",
            "x-component-props": { showEmiratesId: true },
          },
        },
      },
    },
  });
  const idSelector = (
    result.schema as {
      properties: Record<string, Record<string, unknown>>;
    }
  ).properties.idSelector;
  const props = idSelector["x-component-props"] as Record<string, unknown>;

  assert.equal(props.autoRefreshEmiratesIdExpiry, true);
  assert.deepEqual(props.editableFieldKeys, [
    "PersonalPhoto",
    "EmiratesID",
    "Passport",
    "Visa",
    "PassportScan",
  ]);
});

test("services 80021 and 80022 enable nested manager expiry refresh", () => {
  const parsedFormData = {
    schema: {
      properties: {
        socialMediaManager: {
          "x-component": "SocialMediaManager",
          "x-component-props": { showUID: true },
        },
      },
    },
  };

  [
    patchFormDataWithService80021ReadOnlyLock,
    patchFormDataWithService80022ExpiryRefresh,
  ].forEach((patcher) => {
    const result = patcher({ parsedFormData });
    const manager = (
      result.schema as {
        properties: Record<string, Record<string, unknown>>;
      }
    ).properties.socialMediaManager;
    const props = manager["x-component-props"] as Record<string, unknown>;

    assert.equal(props.showUID, true);
    assert.equal(props.autoRefreshEmiratesIdExpiry, true);
  });
});
