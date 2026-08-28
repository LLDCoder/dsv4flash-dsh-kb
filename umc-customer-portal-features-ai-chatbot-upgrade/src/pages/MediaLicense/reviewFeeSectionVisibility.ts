interface ReviewFeeSectionState {
  quoteLoading: boolean;
  quoteError: string | null;
  quoteData: { totalAmount?: number | null } | null;
  penaltyLoading: boolean;
  penaltyError: string | null;
  penaltyTotalAmount: number;
  isPenaltyContextMissing: boolean;
}

export const shouldRenderFeeAndPenaltySection = ({
  quoteLoading,
  quoteError,
  quoteData,
  penaltyLoading,
  penaltyError,
  penaltyTotalAmount,
  isPenaltyContextMissing,
}: ReviewFeeSectionState) =>
  quoteLoading ||
  Boolean(quoteError) ||
  quoteData !== null ||
  penaltyLoading ||
  Boolean(penaltyError) ||
  penaltyTotalAmount > 0 ||
  isPenaltyContextMissing;
