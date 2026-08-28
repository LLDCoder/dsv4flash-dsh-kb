import text from '@/assets/images/text.png';
import status from '@/assets/images/status.png';
import Type from '@/assets/images/type.png';
import time from '@/assets/images/status.png';
import AED from '@/assets/icons/Aed';
import { ActionFooter, CustomButton, CustomMessage } from '@/components/common';
import './index.less';
import CustomStatusTag from '@/components/common/CustomStatusTag';
import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import request from '@/utils/request';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import formatMoney from '@/utils/formatMoney';
import warning from '@/assets/images/warning.png';
import RefundModal from '@/pages/Refund/components/AddModal';
import type { ITransaction } from '@/pages/Payments';
import { downloadTransactionReceipt } from '@/services/payments';
import {
  getAppealViolationByNo,
  unwrapApiData,
  type AppealViolationDetailDto,
} from '@/services/appeal';
import {
  getReceiptDownloadErrorMessage,
  getReceiptDownloadFileName,
  getReceiptPendingMessage,
} from '@/utils/paymentReceipt';
import type {
  ApiEnvelope,
  IApplicatonInfo,
  ITransactionDetail,
  PaymentCenterApplicationItem,
  PaymentCenterDetailPayload,
  PaymentCenterTransaction,
  WalletDetail,
  WalletPaymentMethod,
} from './types';

function cleanLocalizedText(value?: string | null) {
  if (value == null || value === '') return '';
  return String(value).replace(/^["']+|["']+$/g, '').trim();
}

function pickLocalizedName(
  obj: { nameEn?: string; nameAr?: string | null } | null | undefined,
  lang: string,
) {
  if (!obj) return '';
  return pickLocalizedText(obj.nameEn, obj.nameAr, lang);
}

function pickLocalizedText(
  valueEn: string | null | undefined,
  valueAr: string | null | undefined,
  lang: string,
) {
  const primary = lang.startsWith('ar') ? valueAr : valueEn;
  return (
    cleanLocalizedText(primary) ||
    cleanLocalizedText(valueEn) ||
    cleanLocalizedText(valueAr)
  );
}

function displayText(value?: string | null) {
  const cleaned = cleanLocalizedText(value);
  return cleaned || '-';
}

function formatTransactionCardInfo(cardBrand?: string | null, maskedCardNumber?: string | null) {
  const brand = cleanLocalizedText(cardBrand);
  const cardNo = cleanLocalizedText(maskedCardNumber);

  if (brand && cardNo) return `${brand} ${cardNo}`;
  if (brand) return brand;
  if (cardNo) return cardNo;
  return '-';
}

function walletDetailFromPayload(payload: PaymentCenterDetailPayload): WalletDetail {
  const acc = payload.accountInfo as WalletDetail | null | undefined;
  if (acc?.statusObj && typeof acc.balance === 'number') {
    return {
      id: acc.id,
      walletOwnerUserId: acc.walletOwnerUserId,
      balance: acc.balance,
      currency: acc.currency,
      statusId: acc.statusId,
      statusObj: acc.statusObj,
      ishasPin: acc.ishasPin,
    };
  }
  const tx = payload.transaction;
  return {
    id: 0,
    walletOwnerUserId: '',
    balance: tx.balanceAfter,
    currency: 'AED',
    statusId: 0,
    statusObj: { id: 0, nameEn: '', nameAr: null, scope: null },
    ishasPin: false,
  };
}

function mapPaymentCenterTransaction(tx: PaymentCenterTransaction): ITransaction {
  const pm = tx.paymentMethodObj;
  return {
    id: tx.id,
    transactionNo: tx.transactionNo,
    transactionTypeId: tx.transactionTypeId,
    transactionTypeObj: {
      id: tx.transactionTypeObj.id,
      nameEn: tx.transactionTypeObj.nameEn,
      nameAr: tx.transactionTypeObj.nameAr ?? '',
    },
    paymentMethodId: tx.paymentMethodId,
    walletVauleObj: pm
      ? {
          id: pm.id,
          nameEn: pm.nameEn,
          nameAr: pm.nameAr ?? '',
        }
      : { id: tx.paymentMethodId, nameEn: '', nameAr: '' },
    amount: tx.amount,
    balanceBefore: tx.balanceBefore,
    balanceAfter: tx.balanceAfter,
    statusId: tx.statusId,
    statusObj: {
      id: tx.statusObj.id,
      nameEn: tx.statusObj.nameEn,
      nameAr: tx.statusObj.nameAr ?? '',
    },
    description: tx.description,
    createOn: tx.completedAt ?? tx.createdOn,
    completedAt: tx.completedAt ?? tx.createdOn,
    referenceNumber: tx.referenceNumber,
    maskedCardNumber: tx.maskedCardNumber ?? null,
    cardBrand: tx.cardBrand ?? null,
  };
}

function mapApplicationItem(item: PaymentCenterApplicationItem): IApplicatonInfo {
  return {
    applicationId: item.applicationId,
    applicationNumber: item.applicationNumber,
    serviceName: item.serviceName,
    serviceNameNameEn: item.serviceNameEn,
    serviceNameNameAr: item.serviceNameAr,
    applicationStatusId: item.applicationStatusId,
    applicationStatusObj: {
      id: item.applicationStatusObj.id,
      nameEn: item.applicationStatusObj.nameEn,
      nameAr: item.applicationStatusObj.nameAr ?? '',
      scope: item.applicationStatusObj.code ?? '',
    },
    applyFor: item.applyFor,
  };
}

function normalizePaymentCenterDetail(
  payload: PaymentCenterDetailPayload | null | undefined,
): ITransactionDetail | null {
  if (!payload?.transaction) return null;
  const firstApp = payload.applicationItems?.[0];
  return {
    walletDetail: walletDetailFromPayload(payload),
    walletTransaction: mapPaymentCenterTransaction(payload.transaction),
    applicatonInfo: firstApp ? mapApplicationItem(firstApp) : undefined,
    refund: payload.refund ?? null,
    hasReceipt: payload.hasReceipt,
    receipt: payload.receipt ?? null,
  };
}

export default function TransactionDetails(){
    const { i18n, t } = useTranslation();
    const history = useHistory();
    const [data, setData] = useState<ITransactionDetail | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<WalletPaymentMethod[] | null>(null);
    const [relatedViolation, setRelatedViolation] =
        useState<AppealViolationDetailDto | null>(null);
    const [refundModalVisible, setRefundModalVisible] = useState(false);
    const urlPrams = new URLSearchParams(window.location.search);
    const transactionNo = urlPrams.get('transactionNo');
    const getTransaction = useCallback(() => {
        if (!transactionNo) return;
        request.get(`/api/payment-center/transactions/${transactionNo}`).then((res) => {
            const raw = res as unknown as
                | ApiEnvelope<PaymentCenterDetailPayload>
                | PaymentCenterDetailPayload;
            const inner: PaymentCenterDetailPayload | undefined =
                raw && typeof raw === 'object' && 'transaction' in raw
                    ? (raw as PaymentCenterDetailPayload)
                    : (raw as ApiEnvelope<PaymentCenterDetailPayload>).data;
            setData(normalizePaymentCenterDetail(inner));
        });
    }, [transactionNo]);
    useEffect(() => {
        if (!transactionNo) return;
        getTransaction();
        request.get('/api/Wallet/Transaction/Paymentmethod').then((res) => {
            const body = res as unknown as { data?: WalletPaymentMethod[] };
            setPaymentMethod(body.data ?? null);
        });
    }, [transactionNo, getTransaction]);
    const fineReferenceNumber =
        data?.walletTransaction?.transactionTypeId === 3
            ? cleanLocalizedText(data.walletTransaction.referenceNumber)
            : '';
    useEffect(() => {
        setRelatedViolation(null);
        if (!fineReferenceNumber) return;

        let cancelled = false;
        getAppealViolationByNo(fineReferenceNumber)
            .then((response) => {
                if (!cancelled) {
                    setRelatedViolation(unwrapApiData(response));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRelatedViolation(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [fineReferenceNumber]);
    function getPaymentMethod() {
        const pay = paymentMethod?.find(
            (item) => item.id === data?.walletTransaction?.paymentMethodId,
        );
        if (pay) {
            return displayText(pickLocalizedName(pay, i18n.language));
        }
        return displayText(
            pickLocalizedName(data?.walletTransaction?.walletVauleObj, i18n.language),
        );
    }
    function handleRefund(){
        setRefundModalVisible(true);
    }
    function goToApplicationDetail() {
        const applicationId = data?.applicatonInfo?.applicationId;
        if (applicationId != null) {
            history.push(`/my-requests/detail?id=${applicationId}`);
        }
    }
    function goToRefundDetail() {
        const refundId = data?.refund?.id;
        if (refundId != null) {
            history.push(`/refund/refund-detail?id=${refundId}`);
        }
    }
    function getRefundStatusLabel() {
        const refundStatus = pickLocalizedName(data?.refund?.statusObj, i18n.language);
        if (refundStatus) return refundStatus;
        return pickLocalizedName(data?.walletTransaction?.statusObj, i18n.language) || '-';
    }
    function getRefundAmount() {
        const amount = data?.refund?.amount ?? data?.walletTransaction?.amount;
        if (amount == null) return '-';
        return formatMoney(Math.abs(amount));
    }
    async function handleDownloadReceipt() {
        if (!transactionNo) {
            CustomMessage.error(t('payments.detailPage.receiptNotReady'));
            return;
        }

        const pendingMessage = getReceiptPendingMessage(
            data?.hasReceipt,
            data?.receipt,
        );

        if (pendingMessage) {
            CustomMessage.error(pendingMessage);
            return;
        }

        try {
            await downloadTransactionReceipt(
                transactionNo,
                getReceiptDownloadFileName(
                    data?.receipt,
                    `receipt-${transactionNo}.pdf`,
                ),
            );
        } catch (error) {
            CustomMessage.error(getReceiptDownloadErrorMessage(error));
        }
    }
    function getActions(){
        if(data?.walletTransaction?.transactionTypeId === 2 && data?.walletTransaction?.statusId === 3){
            if (data.refund) {
                return <CustomButton text={t('payments.detailPage.downloadReceipt')} onClick={() => void handleDownloadReceipt()} />;
            }
            return <>
                <div className='transactiondetails-btn-refund' onClick={handleRefund}>{t('payments.detailPage.refund')}</div>
                <CustomButton text={t('payments.detailPage.downloadReceipt')} onClick={() => void handleDownloadReceipt()} />
            </>
        }
        if(data?.walletTransaction?.transactionTypeId === 1 && data?.walletTransaction?.statusId === 3){
            return <CustomButton text={t('payments.detailPage.downloadReceipt')} onClick={() => void handleDownloadReceipt()} />
        }
        if(data?.walletTransaction?.transactionTypeId === 3 && data?.walletTransaction?.statusId === 3){
            if (data.refund) {
                return <CustomButton text={t('payments.detailPage.downloadReceipt')} onClick={() => void handleDownloadReceipt()} />;
            }
            return <>
                <div className='transactiondetails-btn-refund' onClick={handleRefund}>{t('payments.detailPage.refund')}</div>
                <CustomButton text={t('payments.detailPage.downloadReceipt')} onClick={() => void handleDownloadReceipt()} />
            </>
        }
        if(data?.walletTransaction?.transactionTypeId === 4 && data?.walletTransaction?.statusId === 3){
            return <CustomButton text={t('payments.detailPage.downloadReceipt')} onClick={() => void handleDownloadReceipt()} />
        }
    }

    function getRelatedApplication(){
        if(data?.walletTransaction?.transactionTypeId === 1) {
            return <>
                <div className='related-application-title'>
                    {t('payments.detailPage.walletInformation')}
                </div>
                <div className='related-application-content'>
                    <div className='related-application-id-wrapper'>
                        <div className='related-application-id'>
                            {data?.applicatonInfo?.applicationNumber || '-'}
                        </div>
                        {!!data?.walletTransaction?.statusId && <CustomStatusTag type="transaction" status={data?.walletTransaction?.statusId} />}
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>{t('payments.detailPage.serviceName')}</div>
                        <div className='related-application-item-value'>
                            {pickLocalizedText(
                                data?.applicatonInfo?.serviceNameNameEn,
                                data?.applicatonInfo?.serviceNameNameAr,
                                i18n.language,
                            ) || displayText(data?.applicatonInfo?.serviceName)}
                        </div>
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>{t('payments.detailPage.currentBalance')}</div>
                        <div className='related-application-item-value'>
                            <AED />{data?.walletDetail?.balance}
                        </div>
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>{t('payments.detailPage.lastRecharge')}</div>
                        <div className='related-application-item-value'>
                            {data?.walletTransaction?.createOn
                                ? moment(data.walletTransaction.createOn).format('DD/MM/YYYY HH:mm:ss')
                                : '-'}
                        </div>
                    </div>
                    <div className='related-application-view'>
                        <CustomButton
                            customClassName='view-btn'
                            text={t('payments.detailPage.view')}
                            variant='outline'
                            onClick={goToApplicationDetail}
                        />
                    </div>
                </div>
            </>
        }

        if(data?.walletTransaction?.transactionTypeId === 2){
            return <>
                <div className='related-application-title'>
                    {t('payments.detailPage.relatedApplication')}
                </div>
                {<div className='related-application-content'>
                    <div className='related-application-id-wrapper'>
                        <div className='related-application-id'>
                            {displayText(data?.applicatonInfo?.applicationNumber)}
                        </div>
                        {!!data?.applicatonInfo?.applicationStatusId && <CustomStatusTag type="app" status={data.applicatonInfo.applicationStatusId} />}
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>{t('payments.detailPage.serviceName')}</div>
                        <div className='related-application-item-value'>
                            {pickLocalizedText(
                                data?.applicatonInfo?.serviceNameNameEn,
                                data?.applicatonInfo?.serviceNameNameAr,
                                i18n.language,
                            )}
                        </div>
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>{t('payments.detailPage.appliedFor')}</div>
                        <div className='related-application-item-value'>
                            {displayText(data?.applicatonInfo?.applyFor)}
                        </div>
                    </div>
                    <div className='related-application-view'>
                        <CustomButton
                            customClassName='view-btn'
                            text={t('payments.detailPage.view')}
                            variant='outline'
                            onClick={goToApplicationDetail}
                        />
                    </div>
                </div>}
            </>
        }

        if(data?.walletTransaction?.transactionTypeId === 3){
            const violationStatus =
                relatedViolation?.statusId ?? relatedViolation?.status;

            return <>
                <div className='related-application-title'>
                    {t('payments.detailPage.relatedViolation')}
                </div>
                <div className='related-application-content'>
                    <div className='related-application-id-wrapper'>
                        <div className='related-application-id'>
                            {displayText(
                                relatedViolation?.violationNo ?? fineReferenceNumber,
                            )}
                        </div>
                        {violationStatus !== null &&
                            violationStatus !== undefined && (
                                <CustomStatusTag
                                    type="violation"
                                    status={violationStatus}
                                />
                            )}
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>
                            {t('payments.detailPage.violationType')}
                        </div>
                        <div className='related-application-item-value'>
                            {displayText(
                                pickLocalizedText(
                                    relatedViolation?.violationType,
                                    relatedViolation?.violationTypeAr,
                                    i18n.language,
                                ),
                            )}
                        </div>
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>
                            {t('payments.detailPage.violator')}
                        </div>
                        <div className='related-application-item-value'>
                            {displayText(relatedViolation?.violatorName)}
                        </div>
                    </div>
                    <div className='related-application-view'>
                        <CustomButton
                            customClassName='view-btn'
                            text={t('payments.detailPage.view')}
                            variant='outline'
                            disabled={!fineReferenceNumber}
                            onClick={() =>
                                history.push(
                                    `/violations-fines/violations/${encodeURIComponent(
                                        fineReferenceNumber,
                                    )}`,
                                )
                            }
                        />
                    </div>
                </div>
            </>
        }

        if(data?.walletTransaction?.transactionTypeId === 4){
            return <>
                <div className='related-application-title'>
                    {t('payments.detailPage.relatedRefundApplication')}
                </div>
                <div className='related-application-content'>
                    <div className='related-application-id-wrapper'>
                        <div className='related-application-id'>
                            {displayText(data?.refund?.applicationNo ?? data?.walletTransaction?.referenceNumber)}
                        </div>
                        <div className='related-application-status related-application-status-success'>
                            {getRefundStatusLabel()}
                        </div>
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>{t('payments.detailPage.refundType')}</div>
                        <div className='related-application-item-value'>
                            {displayText(pickLocalizedName(data?.walletTransaction?.transactionTypeObj, i18n.language))}
                        </div>
                    </div>
                    <div className='related-application-item'>
                        <div className='related-application-item-title'>{t('payments.detailPage.refundReason')}</div>
                        <div className='related-application-item-value'>
                            {displayText(pickLocalizedName(data?.refund?.reasonObj, i18n.language))}
                        </div>
                    </div>
                    <div className='related-application-view'>
                        <CustomButton
                            customClassName='view-btn'
                            text={t('payments.detailPage.view')}
                            variant='outline'
                            disabled={data?.refund?.id == null}
                            onClick={goToRefundDetail}
                        />
                    </div>
                </div>
            </>
        }

        return null;
    }
    return <div className="transactiondetails">
         <RefundModal
            record={data?.walletTransaction ?? null}
            show={refundModalVisible}
            close={() => {
                setRefundModalVisible(false);
                getTransaction();
            }}
            refresh={getTransaction}
            success={() => undefined}
        />
        <div className="transactiondetails-header">
            <div className='transactiondetails-header-item'>
                <div className='transactiondetails-header-icon'>
                    <img src={text} alt="" />
                </div>
                <div>
                    <div className='transactiondetails-header-title'>{t('payments.detailPage.transactionNumber')}</div>
                    <div className='transactiondetails-header-value'>
                        {displayText(data?.walletTransaction?.transactionNo)}
                    </div>
                </div>
            </div>
           <div className='transactiondetails-header-item'>
                <div className='transactiondetails-header-icon'>
                    <img src={status} alt="" />
                </div>
                <div>
                    <div className='transactiondetails-header-title'>{t('payments.detailPage.transactionStatus')}</div>
                    <div className='transactiondetails-header-value'>
                        {!!data?.walletTransaction?.statusId && <CustomStatusTag type="transaction" status={data?.walletTransaction?.statusId} />}
                    </div>
                </div>
            </div>
            <div className='transactiondetails-header-item'>
                <div className='transactiondetails-header-icon'>
                    <img src={Type} alt="" />
                </div>
                <div>
                    <div className='transactiondetails-header-title'>{t('payments.detailPage.transactionType')}</div>
                    <div className='transactiondetails-header-value'>
                        {displayText(
                            pickLocalizedName(
                                data?.walletTransaction?.transactionTypeObj,
                                i18n.language,
                            ),
                        )}
                    </div>
                </div>
            </div>
            <div className='transactiondetails-header-item'>
                <div className='transactiondetails-header-icon'>
                    <img src={time} alt="" />
                </div>
                <div>
                    <div className='transactiondetails-header-title'>{t('payments.detailPage.transactionTime')}</div>
                    <div className='transactiondetails-header-value'>
                        {data?.walletTransaction?.createOn
                            ? moment(data.walletTransaction.createOn).format('DD/MM/YYYY HH:mm:ss')
                            : '-'}
                    </div>
                </div>
            </div>
        </div>
        <div className="transactiondetails-content">
            <div className='transactiondetails-content-left'>
                <div className='transactiondetails-payment-info'>
                    <div className='payment-info-title'>
                        {t('payments.detailPage.paymentInformation')}
                    </div>
                    <div className='payment-info-items'>
                        <div className='payment-info-item'>
                            <div className='payment-info-item-title'>{t('payments.detailPage.paymentMethod')}</div>
                            <div className='payment-info-item-value'>{getPaymentMethod()}</div>
                        </div>
                        <div className='payment-info-item'>
                            <div className='payment-info-item-title'>{t('payments.detailPage.cardInformation')}</div>
                            <div className='payment-info-item-value'>
                                {formatTransactionCardInfo(
                                    data?.walletTransaction?.cardBrand,
                                    data?.walletTransaction?.maskedCardNumber,
                                )}
                            </div>
                        </div>
                        {data?.walletTransaction?.transactionTypeId === 3 && (
                            <div className='payment-info-item'>
                                <div className='payment-info-item-title'>
                                    {t('payments.detailPage.amount')}
                                </div>
                                <div className='payment-info-item-value'>
                                    <AED />{formatMoney(data?.walletTransaction?.amount)}
                                </div>
                            </div>
                        )}
                        {data?.walletTransaction?.transactionTypeId === 1 && <>
                            <div className='payment-info-item payment-info-item-recharge'>
                                <div className='payment-info-item-title'>{t('payments.detailPage.rechargeAmount')}</div>
                                <div className='payment-info-item-value'>
                                    +<AED />{formatMoney(data?.walletTransaction?.amount)}
                                </div>
                            </div>
                            <div className='payment-info-item'>
                                <div className='payment-info-item-title'>{t('payments.detailPage.transactionFee')}</div>
                                <div className='payment-info-item-value'><AED />0.00</div>
                            </div>
                        </>}
                        {data?.walletTransaction?.transactionTypeId === 2 && <div className='payment-info-item'>
                            <div className='payment-info-item-title'>{t('payments.detailPage.amountCharged')}</div>
                            <div className='payment-info-item-value'><AED /> {formatMoney(data?.walletTransaction?.amount)}</div>
                        </div>}
                        {data?.walletTransaction?.transactionTypeId === 4 && <div className='payment-info-item'>
                            <div className='payment-info-item-title'>{t('payments.detailPage.amount')}</div>
                            <div className='payment-info-item-value'><AED /> {getRefundAmount()}</div>
                        </div>}
                    </div>
                    <div className='payment-info-item-desc'>
                        <div className='payment-info-item-title'>{t('payments.detailPage.description')}</div>
                        <div className='payment-info-item-value'>
                            {data?.walletTransaction?.transactionTypeId === 3
                                ? t('payments.detailPage.finePaymentDescription')
                                : displayText(data?.walletTransaction?.description)}
                        </div>
                    </div>
                    {data?.refund?.id && data?.walletTransaction?.transactionTypeId === 2 && (
                    <div className='related-refund-detail'>
                        <div className='related-refund-title-wrapper'>
                            <div className='related-refund-title'>{t('payments.detailPage.relatedRefundDetail')}</div>
                            <div className='related-refund-view-details'>
                                <CustomButton
                                    variant="outline"
                                    text={t('payments.detailPage.viewDetails')}
                                    onClick={() => {
                                        const refund = data?.refund;
                                        if (refund) {
                                            history.push(`/refund/refund-detail?id=${refund.id}`);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className='related-refund-items'>
                            <div className='related-refund-item'>
                                <div className='related-refund-item-title'>{t('payments.detailPage.applicationNumber')}</div>
                                <div className='related-refund-item-value application-number'>{data.refund.applicationNo}</div>
                            </div>
                            <div className='related-refund-item'>
                                <div className='related-refund-item-title'>{t('payments.detailPage.refundStatus')}</div>
                                <div className='related-refund-item-value'>
                                    <div className='related-refund-item-tag'>
                                        {pickLocalizedName(data.refund.statusObj, i18n.language)}
                                    </div>
                                </div>
                            </div>
                            <div className='related-refund-item'>
                                <div className='related-refund-item-title'>{t('payments.detailPage.refundInitiated')}</div>
                                <div className='related-refund-item-value'>
                                    {data.refund.createdOn
                                        ? moment(data.refund.createdOn).format('DD/MM/YYYY HH:mm:ss')
                                        : ''}
                                </div>
                            </div>
                            <div className='related-refund-item'>
                                <div className='related-refund-item-title'>{t('payments.detailPage.refundAmount')}</div>
                                <div className='related-refund-item-value'>
                                    <AED />{formatMoney(data.refund.amount)}
                                </div>
                            </div>
                            <div className='related-refund-item'>
                                <div className='related-refund-item-title'>{t('payments.detailPage.refundMethod')}</div>
                                <div className='related-refund-item-value'>
                                    {pickLocalizedName(data.refund.paymentMethodObj, i18n.language)}
                                </div>
                            </div>

                            <div className='related-refund-item related-refund-last-item'>
                                <div className='related-refund-item-title'>{t('payments.detailPage.refundReason')}</div>
                                <div className='related-refund-item-value'>
                                    {pickLocalizedName(data.refund.reasonObj, i18n.language)}
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                    {data?.walletTransaction?.statusId === 4 && data?.walletTransaction?.transactionTypeId === 2 && <div className='transactiondetails-failure-reason'>
                        <div className='failure-reason-icon'><img src={warning} alt="" /></div>
                        <div>
                            <div className='failure-reason-title'>{t('payments.detailPage.failureReason')}</div>
                            <div className='failure-reason-content'>{t('payments.detailPage.failureInsufficientFunds')}</div>
                        </div>
                    </div>}
                </div>
            </div>
            <div className='transactiondetails-content-right'>
                <div className='transactiondetails-related-application'>
                    {getRelatedApplication()}
                </div>
            </div>
        </div>
        {data?.walletTransaction?.statusId !== 6 && <ActionFooter
            actions={getActions()}
        />} 
    </div>
}
