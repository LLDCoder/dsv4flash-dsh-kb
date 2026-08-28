import type {
  FeeQuoteResponse,
  PenaltyEvaluateResponse,
} from "@/services/services";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";

export type DisplayQuoteRow = {
  code: string;
  chargeName: string;
  amount: number;
};

export const formatAmount = (amount?: number | null) =>
  Number(amount ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const buildFeeRows = (
  quoteData: FeeQuoteResponse | null,
  isAr: boolean,
): DisplayQuoteRow[] =>
  (quoteData?.breakdown || []).map((item, index) => ({
    code:
      item.legacyG3Code ||
      item.legacyCode ||
      item.code ||
      `fee-${index + 1}`,
    chargeName:
      preferLocalizedEnAr(isAr, item.chargeName, item.chargeNameAr) || "-",
    amount: Number(item.amount || 0),
  }));

export const buildPenaltyRows = (
  penaltyData: PenaltyEvaluateResponse | null | undefined,
): DisplayQuoteRow[] =>
  (Array.isArray(penaltyData?.items) ? penaltyData.items : []).map(
    (item, index) => ({
      code: String(
        item.penaltyCode ||
          item.code ||
          item["itemCode"] ||
          item["legacyG3Code"] ||
          `penalty-${index + 1}`,
      ),
      chargeName: String(
        item.penaltyName ||
          item.name ||
          item.title ||
          item.description ||
          item["chargeName"] ||
          `Penalty item ${index + 1}`,
      ),
      amount: Number(
        item.amount ?? item.currentAmount ?? item.fineAmount ?? item["total"] ?? 0,
      ),
    }),
  );
