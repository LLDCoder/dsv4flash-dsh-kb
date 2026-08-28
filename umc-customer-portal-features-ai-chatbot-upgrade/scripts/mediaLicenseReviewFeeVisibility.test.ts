import assert from "node:assert/strict";
import test from "node:test";
import { shouldRenderFeeAndPenaltySection } from "../src/pages/MediaLicense/reviewFeeSectionVisibility.ts";

const idlePenaltyState = {
  penaltyLoading: false,
  penaltyError: null,
  penaltyTotalAmount: 0,
  isPenaltyContextMissing: false,
};

test("keeps Service Fees visible for a successful zero-value quote", () => {
  assert.equal(
    shouldRenderFeeAndPenaltySection({
      quoteLoading: false,
      quoteError: null,
      quoteData: {
        totalAmount: 0,
        breakdown: [],
      },
      ...idlePenaltyState,
    }),
    true,
  );
});

test("hides the fee and penalty section before either result exists", () => {
  assert.equal(
    shouldRenderFeeAndPenaltySection({
      quoteLoading: false,
      quoteError: null,
      quoteData: null,
      ...idlePenaltyState,
    }),
    false,
  );
});
