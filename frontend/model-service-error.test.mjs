import assert from "node:assert/strict";
import {
  isModelServiceFailure,
  MODEL_SERVICE_BUSY_MESSAGES,
  sanitizeAssistantContent,
} from "./model-service-error.js";

const rawEnglish =
  "The configured model service requires a balance or billing update. This request could not be completed.";
const rawArabic =
  "تتطلب خدمة النموذج تحديث الرصيد أو الفوترة. لم يكتمل الطلب.";

assert.equal(isModelServiceFailure(rawEnglish), true);
assert.equal(sanitizeAssistantContent(rawEnglish), MODEL_SERVICE_BUSY_MESSAGES.en);
assert.equal(sanitizeAssistantContent(rawArabic), MODEL_SERVICE_BUSY_MESSAGES.ar);
assert.equal(isModelServiceFailure("The current account balance is 100 credits."), false);
assert.equal(isModelServiceFailure("The Admin Portal read service was temporarily unavailable."), false);
assert.equal(
  sanitizeAssistantContent("The Admin Portal read service was temporarily unavailable."),
  "The Admin Portal read service was temporarily unavailable.",
);
assert.equal(isModelServiceFailure("provider payment_required"), true);

console.log("model-service-error: all assertions passed");
