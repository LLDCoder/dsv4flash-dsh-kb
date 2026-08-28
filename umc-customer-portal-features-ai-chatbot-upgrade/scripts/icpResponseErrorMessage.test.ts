import assert from "node:assert/strict";
import test from "node:test";
import { resolveIcpResponseErrorMessage } from "../src/utils/individualIdentity/icpResponse";
import {
  isLookupFresh,
  isQuerySignatureCurrent,
} from "../src/components/designable/src/components/IDSelector/querySignature";

const noDataResponse = {
  isSuccess: true,
  statusCode: 200,
  message: "Request successful",
  data: {
    responseCode: "2",
    responseDescription: "NO DATA FOUND                       ",
    responseDescriptionArabic: "لايوجد بيانات ضمن محددات البحث      ",
    personProfile: null,
  },
};

test("uses the English ICP business error instead of the transport success message", () => {
  assert.equal(
    resolveIcpResponseErrorMessage(noDataResponse, "en-US"),
    "NO DATA FOUND",
  );
});

test("uses the Arabic ICP business error for Arabic language variants", () => {
  assert.equal(
    resolveIcpResponseErrorMessage(noDataResponse, "ar-AE"),
    "لايوجد بيانات ضمن محددات البحث",
  );
});

test("falls back to the other confirmed bilingual ICP error field", () => {
  assert.equal(
    resolveIcpResponseErrorMessage(
      {
        data: {
          responseDescription: "NO DATA FOUND",
          responseDescriptionArabic: "   ",
        },
      },
      "ar",
    ),
    "NO DATA FOUND",
  );
});

test("does not expose the transport success message when no business error exists", () => {
  assert.equal(
    resolveIcpResponseErrorMessage(
      { isSuccess: true, message: "Request successful", data: {} },
      "en",
    ),
    undefined,
  );
});

test("prefers the confirmed ICP business error over the localized fallback", () => {
  assert.equal(
    resolveIcpResponseErrorMessage(
      {
        data: {
          responseDescription: "Person not found",
          responseDescriptionArabic: "لم يتم العثور على الشخص",
          personProfile: null,
        },
      },
      "en-US",
      "Unable to load UID information.",
    ),
    "Person not found",
  );
});

test("uses the localized fallback when the ICP response has no description", () => {
  assert.equal(
    resolveIcpResponseErrorMessage(
      { isSuccess: true, message: "Request successful", data: {} },
      "en-US",
      "Unable to load UID information.",
    ),
    "Unable to load UID information.",
  );
});

test("rejects an ICP response after the query inputs have changed", () => {
  assert.equal(
    isQuerySignatureCurrent("uid", "uid|2026-08-05|111111111", {
      type: "uid",
      dateOfBirth: "2026-08-05",
      uid: "222222222",
    }),
    false,
  );
});

test("does not restore stored ICP success while a retry is loading or failed", () => {
  const storedValue = {
    type: "uid" as const,
    dateOfBirth: "2026-08-05",
    uid: "111111111",
    _icpLookupType: "uid" as const,
    _icpLookupSignature: "uid|2026-08-05|111111111",
  };

  assert.equal(
    isLookupFresh(
      "uid",
      { status: "loading", signature: "uid|2026-08-05|111111111" },
      storedValue,
    ),
    false,
  );
  assert.equal(
    isLookupFresh(
      "uid",
      { status: "error", signature: "uid|2026-08-05|111111111" },
      storedValue,
    ),
    false,
  );
});
