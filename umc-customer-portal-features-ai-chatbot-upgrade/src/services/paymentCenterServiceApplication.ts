import request from "@/utils/request";
import downloadBlobFile from "@/utils/downloadBlobFile";
import type { PaymentReceiptDto } from "@/utils/paymentReceipt";

/**
 * Response from payment center for a service application's frozen payment order.
 * Backend DTO may evolve; keep fields optional and normalize in the page layer.
 */
export interface ServiceApplicationPaymentOrderDto {
  id?: number;
  applicationId?: number;
  serviceId?: number;
  paymentIntentOrderId?: number | null;
  amount?: number;
  currencyCode?: string | null;
  referenceNumber?: string | null;
  feeVersion?: string | null;
  /** Subtotal for service / fees before delivery, when provided separately. */
  serviceFee?: number;
  subTotal?: number;
  deliveryFee?: number;
  deliveryAmount?: number;
  vatAmount?: number;
  vatIncluded?: boolean;
  /** Raw fee lines from server (stringified JSON) */
  feeBreakdownJson?: string | null;
  feeWarningsJson?: string | null;
  freeDecisionJson?: string | null;
  feeQuoteRawResponseJson?: string | null;
  receiptWithHeaderUrl?: string | null;
  paymentReceiptWithHeaderUrl?: string | null;
  channelId?: number | null;
  expiresAt?: string | null;
  createdOn?: string | null;
  updatedOn?: string | null;
  status?: string | number | null;
  hasReceipt?: boolean;
  receipt?: PaymentReceiptDto | null;
}

export interface ServiceApplicationFeeBreakdownItemDto {
  code?: string | null;
  legacyG3Code?: string | null;
  chargeName?: string | null;
  chargeNameAr?: string | null;
  description?: string | null;
  basis?: string | null;
  amount?: number | string | null;
}

export interface ServiceApplicationPayNowValidateRequest {
  applicationIds: number[];
}

export interface ServiceApplicationPayNowValidateResult {
  canPayNow?: boolean;
  totalAmount?: number | string | null;
  message?: string | null;
}

export const getServiceApplicationPayment = (applicationId: number) => {
  return request.get<
    { data: ServiceApplicationPaymentOrderDto } | ServiceApplicationPaymentOrderDto
  >(`/api/payment-center/service-applications/${applicationId}/payment`, {}, {
    skipErrorToast: true,
  });
};

export const validateServiceApplicationPayNow = (
  data: ServiceApplicationPayNowValidateRequest,
) => {
  type ValidateResponse =
    | { data?: ServiceApplicationPayNowValidateResult }
    | ServiceApplicationPayNowValidateResult;

  return request.post<ValidateResponse, ValidateResponse>(
    "/api/payment-center/service-applications/pay-now/validate",
    data,
    {
      skipErrorToast: true,
    },
  );
};

export const downloadServiceApplicationReceipt = async (
  applicationId: number,
  fileName: string,
) => {
  const blob = (await request.get(
    `/api/payment-center/service-applications/${applicationId}/receipt`,
    {},
    {
      responseType: "blob",
    },
  )) as unknown as Blob;

  downloadBlobFile(blob, fileName);
};
