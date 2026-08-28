import request from "@/utils/request";
import type { RequestConfig } from "@/utils/request";
import saveFileWithAxios from "@/utils/saveFileWithAxios";
import downloadBlobFile from "@/utils/downloadBlobFile";
import type { PaymentReceiptDto } from "@/utils/paymentReceipt";

export interface IGetTransactionsParams {
    PageSize: number;
    PageIndex: number;
    TransactionNo?: string;
    TransactionTypeId?: number | null;
    StatusId?: number | null;
    StartDate?: string | null;
    EndDate?: string | null;
    SortDirection?: number;
}

function toPaymentCenterTransactionsQueryParams(params: IGetTransactionsParams) {
    return {
        pageIndex: params.PageIndex,
        pageSize: params.PageSize,
        keyWord: params.TransactionNo,
        transactionTypeId: params.TransactionTypeId ?? undefined,
        statusId: params.StatusId ?? undefined,
        startDate: params.StartDate ?? undefined,
        endDate: params.EndDate ?? undefined,
        sortDirection: 1,
        sortBy: "createdOn",
    };
}

/** Dashboard header totals used by Payments page (legacy wallet field names). */
export interface ITransactionSumDetial {
    finesSum: number;
    rechargeSum: number;
    refund: number;
    serviceApplicationSum: number;
    total: number;
}

export interface IPaymentCenterTransactionTotals {
    total: number;
    serviceTotal: number;
    fineTotal: number;
    refundTotal: number;
    last7DaysTotal: number | null;
    revenueAmount: number | null;
    growthCount: number | null;
}

export interface IPaymentCenterTransactionsStatisticsData {
    paymentTotals: IPaymentCenterTransactionTotals;
    revenueTotals: IPaymentCenterTransactionTotals;
}

/** Full JSON body from GET /api/payment-center/transactions/statistics */
export interface IPaymentCenterStatisticsApiResponse {
    isSuccess: boolean;
    statusCode: number;
    message: string;
    data: IPaymentCenterTransactionsStatisticsData;
}

export interface PaymentCenterTransactionDetailDto {
    transaction?: {
        id?: number;
        transactionNo?: string;
    } | null;
    hasReceipt?: boolean;
    receipt?: PaymentReceiptDto | null;
}

function toSafeAmount(value: number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Map payment-center /transactions/statistics payload to the shape expected by Payments UI.
 * Recharge is not returned by this API; the card shows 0 until a field is added.
 */
export function mapPaymentCenterStatisticsToSumDetail(
    payload: IPaymentCenterTransactionsStatisticsData | undefined | null,
): ITransactionSumDetial | null {
    const payment = payload?.paymentTotals;
    if (!payment) return null;
    return {
        total: toSafeAmount(payment.total),
        serviceApplicationSum: toSafeAmount(payment.serviceTotal),
        finesSum: toSafeAmount(payment.fineTotal),
        refund: toSafeAmount(payment.refundTotal),
        rechargeSum: 0,
    };
}

export function getExportTransactions(params: IGetTransactionsParams, fileName: string) {
    return saveFileWithAxios(
        "/api/payment-center/transactions/export",
        fileName,
        toPaymentCenterTransactionsQueryParams(params),
    );
}

export function getTransactionsList(params: IGetTransactionsParams) {
    return request.get(
        "/api/payment-center/transactions",
        toPaymentCenterTransactionsQueryParams(params),
    );
}

export function getTransactionDetail(
    transactionNo: string,
    config: RequestConfig = {},
) {
    return request.get<PaymentCenterTransactionDetailDto>(
        `/api/payment-center/transactions/${transactionNo}`,
        {},
        config,
    );
}

export async function downloadTransactionReceipt(
    transactionNo: string,
    fileName: string,
    config: RequestConfig = {},
) {
    const blob = (await request.get(
        `/api/payment-center/transactions/${transactionNo}/receipt`,
        {},
        {
            responseType: "blob",
            ...config,
        },
    )) as unknown as Blob;

    if (!config.signal?.aborted) {
        downloadBlobFile(blob, fileName);
    }
}

export function getTransactionTypes() { 
    return request.get('/api/Wallet/Transaction/Type');
}

export function getTransactionStatuses() { 
    return request.get('/api/Wallet/Transaction/Status');
}

export function getDetail() { 
    return request.get('/api/Wallet/Detail');
}

export function getTransactionTypeSum(): Promise<IPaymentCenterStatisticsApiResponse> {
    return request.get(
        "/api/payment-center/transactions/statistics",
    ) as Promise<IPaymentCenterStatisticsApiResponse>;
}

export function postActive({id, pin}: {id: number, pin: string}){
    return request.post(`/api/Wallet/${id}/Active`, {
        pin
    })
}
export function postRecharge({id, balance}: { id: number, balance: number }){
    return request.post(`/api/Wallet/${id}/Recharge`,{
        balance,
    })
}

export function getCode(verifyCodeType: number){
    return request.get('/api/Wallet/PIN/Send/Code', {
        verifyCodeType,
    })
}
interface IPostVerifyCode{
    verifyCode: string;
}
export function postVerifyCode(params: IPostVerifyCode){
    return request.post('/api/Wallet/PIN/Verify/Code', params)
}
interface IPutResetPin{
    walletId: number;
    newPIN: string;
    verifyCode: string;
}

export function putResetPin({ walletId, ...params}: IPutResetPin){ 
    return request.put(`/api/Wallet/PIN/${walletId}/Reset`, params)
}

export function postRefund(transactionNo: string){
    return request.post(`/api/Wallet/${transactionNo}/Refund`)
}
