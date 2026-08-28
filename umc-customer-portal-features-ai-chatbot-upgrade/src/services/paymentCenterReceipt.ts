import request from "@/utils/request";
import downloadBlobFile from "@/utils/downloadBlobFile";
import type { PaymentReceiptDto } from "@/utils/paymentReceipt";

export interface PaymentCenterReceiptInfoDto extends PaymentReceiptDto {
  receiptWithHeaderUrl?: string | null;
  paymentReceiptWithHeaderUrl?: string | null;
}

export interface PaymentCenterReceiptLookupResponse {
  hasReceipt?: boolean;
  receipt?: PaymentCenterReceiptInfoDto | null;
}

export const getServiceApplicationReceipt = (
  applicationId: number | string,
) => {
  return request.get<
    PaymentCenterReceiptLookupResponse,
    PaymentCenterReceiptLookupResponse
  >(
    `/api/payment-center/service-applications/${applicationId}/receipt`,
    {},
    {
      skipErrorToast: true,
    },
  );
};

export const getTransactionReceipt = (transactionNo: string) => {
  return request.get<
    PaymentCenterReceiptLookupResponse,
    PaymentCenterReceiptLookupResponse
  >(
    `/api/payment-center/transactions/${transactionNo}/receipt`,
    {},
    {
      skipErrorToast: true,
    },
  );
};

export const downloadPaymentReceipt = async (
  receiptNo: string,
  fileName = `${receiptNo}.pdf`,
) => {
  const blob = (await request.get(
    `/api/payment-center/receipts/${encodeURIComponent(receiptNo)}/download`,
    {},
    {
      responseType: "blob",
    },
  )) as unknown as Blob;

  downloadBlobFile(blob, fileName);
};
