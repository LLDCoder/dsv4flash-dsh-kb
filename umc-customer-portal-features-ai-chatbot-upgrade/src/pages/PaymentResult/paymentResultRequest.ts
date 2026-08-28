export type PaymentResultReceiptRequestOutcome =
  | "completed"
  | "unauthorized"
  | "aborted";

interface PaymentResultReceiptRequestOptions<TDetail> {
  signal: AbortSignal;
  loadDetail: (signal: AbortSignal) => Promise<TDetail>;
  download: (detail: TDetail, signal: AbortSignal) => Promise<void>;
  onUnauthorized: () => void;
}

export const getPaymentResultHttpStatus = (error: unknown): number | null => {
  const candidate = error as {
    statusCode?: number;
    response?: { status?: number };
  };
  return candidate.statusCode ?? candidate.response?.status ?? null;
};

export const createPaymentResultReturnUrl = (
  pathname: string,
  search: string,
): string => `${pathname}${search}`;

export async function runPaymentResultReceiptRequest<TDetail>(
  options: PaymentResultReceiptRequestOptions<TDetail>,
): Promise<PaymentResultReceiptRequestOutcome> {
  try {
    const detail = await options.loadDetail(options.signal);
    if (options.signal.aborted) return "aborted";

    await options.download(detail, options.signal);
    return options.signal.aborted ? "aborted" : "completed";
  } catch (error) {
    if (options.signal.aborted) return "aborted";
    if (getPaymentResultHttpStatus(error) === 401) {
      options.onUnauthorized();
      return "unauthorized";
    }
    throw error;
  }
}
