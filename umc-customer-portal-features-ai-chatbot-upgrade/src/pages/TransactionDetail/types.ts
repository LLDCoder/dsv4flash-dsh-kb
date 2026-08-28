import type { ITransaction } from '@/pages/Payments';

export interface StatusObj {
  id: number;
  nameEn: string;
  nameAr: string | null;
  scope: string | null;
}

export interface WalletDetail {
  id: number;
  walletOwnerUserId: string;
  balance: number;
  currency: string;
  statusId: number;
  statusObj: StatusObj;
  ishasPin: boolean;
}

export interface WalletPaymentMethod {
  id: number;
  nameEn: string;
  nameAr: string;
  scope: string;
}

/** Payment center GET /transactions/:no — inner `data` payload */
export interface PaymentCenterNameObj {
  id: number;
  nameEn: string;
  nameAr: string | null;
  code?: string | null;
}

export interface PaymentCenterTransaction {
  id: number;
  transactionNo: string;
  transactionTypeId: number;
  transactionTypeObj: PaymentCenterNameObj;
  paymentMethodId: number;
  paymentMethodObj?: PaymentCenterNameObj | null;
  amount: number;
  statusId: number;
  statusObj: PaymentCenterNameObj;
  description: string;
  createdOn: string;
  completedAt?: string | null;
  updateOn?: string;
  referenceNumber: string;
  maskedCardNumber?: string | null;
  cardBrand?: string | null;
  balanceBefore: number;
  balanceAfter: number;
}

export interface PaymentCenterApplicationItem {
  applicationId: number;
  applicationDetailId: number;
  applicationNumber: string;
  serviceName: string;
  serviceNameEn: string;
  serviceNameAr: string;
  applicationStatusId: number;
  applicationStatusObj: PaymentCenterNameObj;
  applyFor: string;
  createdOn: string;
}

export interface PaymentCenterRefund {
  id: number;
  applicationNo: string;
  statusId: number;
  statusObj: PaymentCenterNameObj;
  reasonId: number;
  reasonObj: PaymentCenterNameObj;
  amount: number;
  paymentMethodId: number;
  paymentMethodObj?: PaymentCenterNameObj | null;
  updateOn?: string;
  createdOn: string;
}

export interface PaymentCenterDetailPayload {
  transaction: PaymentCenterTransaction;
  applicationItems?: PaymentCenterApplicationItem[] | null;
  refund?: PaymentCenterRefund | null;
  accountInfo?: WalletDetail | null;
  hasReceipt?: boolean;
  receipt?: {
    id?: number;
    receiptNo?: string | null;
    status?: number | string | null;
    storedFileId?: number | null;
    fileName?: string | null;
    contentType?: string | null;
    generatedOn?: string | null;
    failureReason?: string | null;
  } | null;
}

export interface ApiEnvelope<T> {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string;
  data: T;
}

export interface ApplicationStatusObj {
  id: number;
  nameEn: string;
  nameAr: string;
  scope: string;
}

export interface IApplicatonInfo {
  applicationId: number;
  applicationNumber: string;
  serviceName: string;
  serviceNameNameEn: string;
  serviceNameNameAr: string;
  applicationStatusId: number;
  applicationStatusObj: ApplicationStatusObj;
  applyFor: string;
}

export interface ITransactionDetail {
  walletDetail: WalletDetail;
  walletTransaction: ITransaction;
  applicatonInfo?: IApplicatonInfo;
  refund?: PaymentCenterRefund | null;
  hasReceipt?: boolean;
  receipt?: PaymentCenterDetailPayload["receipt"];
}
