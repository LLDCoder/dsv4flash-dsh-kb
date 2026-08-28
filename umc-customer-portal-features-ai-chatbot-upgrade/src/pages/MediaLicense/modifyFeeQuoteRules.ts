type FeeStrategyLike = {
  kind?: string;
} | null | undefined;

const MODIFY_FEE_STRATEGY_KINDS = new Set([
  "service803",
  "service903",
  "service1203",
  "service80011",
  "service80012",
]);

const EFFECTIVE_LIFECYCLE_DETAIL_FEE_STRATEGY_KINDS = new Set([
  "service803",
  "service1203",
]);

export const resolveModifyFeeSourceApplicationDetailId = ({
  strategyKind,
  lifecycleActivityDetailId,
  effectiveLifecycleDetailId,
}: {
  strategyKind?: string;
  lifecycleActivityDetailId?: number | null;
  effectiveLifecycleDetailId?: number | null;
}): number | null =>
  EFFECTIVE_LIFECYCLE_DETAIL_FEE_STRATEGY_KINDS.has(strategyKind || "")
    ? effectiveLifecycleDetailId ?? null
    : lifecycleActivityDetailId ?? null;

export const isModifyFeeQuotePending = (
  config: FeeStrategyLike,
  loading: boolean,
  quoteData: unknown,
): boolean =>
  MODIFY_FEE_STRATEGY_KINDS.has(String(config?.kind ?? "")) &&
  (loading || !quoteData);
