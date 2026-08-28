import assert from "node:assert/strict";
import test from "node:test";
import { resolveServiceDeliveryTime } from "../src/pages/MediaLicense/components/serviceDetailsDeliveryTime.ts";

test("uses the configured English service delivery time without converting it", () => {
  assert.equal(
    resolveServiceDeliveryTime({
      isArabic: false,
      serviceDeliveryTimeEn: "5 working days",
      serviceDeliveryTimeAr: "5 أيام عمل",
    }),
    "5 working days",
  );
});

test("uses the configured Arabic service delivery time", () => {
  assert.equal(
    resolveServiceDeliveryTime({
      isArabic: true,
      serviceDeliveryTimeEn: "5 working days",
      serviceDeliveryTimeAr: "5 أيام عمل",
    }),
    "5 أيام عمل",
  );
});

test("shows a dash when the active-language delivery time is not configured", () => {
  assert.equal(
    resolveServiceDeliveryTime({
      isArabic: true,
      serviceDeliveryTimeEn: "5 working days",
      serviceDeliveryTimeAr: null,
    }),
    "-",
  );
});
