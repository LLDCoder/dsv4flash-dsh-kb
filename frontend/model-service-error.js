const MODEL_SERVICE_FAILURE_PATTERNS = [
  /\binsufficient\s+(?:balance|credit|quota)/i,
  /\b(?:requires?|need|needs|unable|failed|failure|error|could\s+not|cannot|update|payment)\b[^\n]{0,100}\b(?:balance|billing|credit|quota)\b/i,
  /\b(?:balance|billing|credit|quota)\b[^\n]{0,100}\b(?:requires?|need|needs|unable|failed|failure|error|could\s+not|cannot|update|payment)\b/i,
  /\b(?:credit|quota)\s+(?:balance|limit|exhausted|exceeded)/i,
  /\bconfigured\s+model\s+service\b/i,
  /\bmodel[_\s-]*payment[_\s-]*required\b/i,
  /\bpayment[_\s-]*required\b/i,
  /\b(?:provider|upstream)\b[^\n]{0,100}\b(?:billing|payment|balance|credit|quota)\b/i,
  /\b(?:billing|payment|balance|credit|quota)\b[^\n]{0,100}\b(?:provider|upstream)\b/i,
  /(?:الرصيد|الفوترة|خدمة\s+النموذج|الدفع).{0,100}(?:يتطلب|تحديث|خطأ|غير\s+كاف|تعذر|فشل)/u,
  /(?:يتطلب|تتطلب|تحديث|خطأ|غير\s+كاف|تعذر|فشل).{0,100}(?:الرصيد|الفوترة|خدمة\s+النموذج|الدفع)/u,
];

export const MODEL_SERVICE_BUSY_MESSAGES = Object.freeze({
  en: "The service is temporarily busy. Please try again shortly.",
  ar: "الخدمة مشغولة مؤقتًا. يرجى المحاولة مرة أخرى قريبًا.",
});

function containsArabic(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u.test(text);
}

export function isModelServiceFailure(value) {
  const text = String(value ?? "");
  return MODEL_SERVICE_FAILURE_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeAssistantContent(value) {
  const text = String(value ?? "");
  if (!isModelServiceFailure(text)) return text;
  return containsArabic(text)
    ? MODEL_SERVICE_BUSY_MESSAGES.ar
    : MODEL_SERVICE_BUSY_MESSAGES.en;
}
