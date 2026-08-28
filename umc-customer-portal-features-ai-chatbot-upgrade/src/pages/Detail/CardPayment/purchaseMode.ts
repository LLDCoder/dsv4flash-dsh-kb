export type CardPaymentPurchaseMode = "merged" | "service-application";

export const resolveCardPaymentPurchaseMode = (
  hasPayablePenalty: boolean,
): CardPaymentPurchaseMode =>
  hasPayablePenalty ? "merged" : "service-application";
