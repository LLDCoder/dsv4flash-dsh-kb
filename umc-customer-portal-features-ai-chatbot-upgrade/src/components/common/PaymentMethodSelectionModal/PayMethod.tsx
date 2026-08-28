import { type FC, type MouseEvent, useState } from "react";
import { Form, Input, Modal } from "antd";
import Wallet from "@/assets/images/Wallet.svg";
import Cardholder from "@/assets/images/Cardholder.svg";
import formatMoney from "@/utils/formatMoney";
import WalletAcitve from '@/assets/images/wallet-active.png'
import CustomButton from "@/components/common/CustomButton";
import type { IWalletDetailObj } from "@/pages/Payments";
import { useTranslation } from "react-i18next";
import VerificationInput from "@/components/common/VerificationInput";
import jinggao from '@/assets/images/jinggao.png';
import eyePng from '@/assets/images/eye.png';
import yellowWarnPng from '@/assets/images/yellow-warn.png';
import shouquan from '@/assets/images/shouquan.png';
import hideEyePng from '@/assets/images/hide-eye.png';
import Loading from "@/components/common/Loading";
import request from "@/utils/request";
import aesEncrypt from "@/utils/aesEncrypt";
import Aed from "@/assets/icons/Aed";
import CardPay from '@/assets/icons/CardPay';
import Warning from "@/assets/images/warning.png";
import { postRecharge } from '@/services/payments';
import success from '@/assets/images/registration-successful.png';
import "./PayMethod.less";

const PayMethod: FC<{
  totalAmount: number;
  amount: number;
  active: "1" | "2" | null;
  setActive: (e: "1" | "2" | null) => void;
  getWalletDetail: () => void;
  walletDetail: IWalletDetailObj | null;
  showHeading?: boolean;
  embedded?: boolean;
  walletDisabled?: boolean;
}> = ({
  amount,
  totalAmount,
  active,
  setActive,
  walletDetail,
  getWalletDetail,
  showHeading = true,
  embedded = false,
  walletDisabled = false,
}) => {
    const { t } = useTranslation();
    const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
    const [codeYzm, setCodeYzm] = useState(['', '', '', '', '', '']);
    const [codeYzm2, setCodeYzm2] = useState(['', '', '', '', '', '']);
    const [eye, setEye] = useState(false);
    const [activeLoading, setActiveLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeAmount, setActiveAmount] = useState('0.00');
    const [customAmount, setCustomAmount] = useState('');
    const [hasError, setHasError] = useState(false);
    const [rechargeLoading, setRechargeLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const isNotMatch = codeYzm.join('') !== codeYzm2.join('') && codeYzm.join('').length === 6 && codeYzm2.join('').length === 6;
    const isDisabled = isNotMatch || codeYzm.join('').length < 6 || codeYzm2.join('').length < 6;
    const isWalletSelected = active === '1';
    const isCardSelected = active === '2';
    const isWalletInactive = walletDetail?.statusId === 1;
    const isWalletInsufficient = amount < totalAmount;
    const hasCustomAmount = customAmount.trim() !== '';
    const rechargeAmount = hasCustomAmount ? customAmount : activeAmount;
    const isRechargeDisabled =
      !rechargeAmount ||
      rechargeAmount === '0.00' ||
      (hasCustomAmount && hasError);

    function handleCreatePin() {
      if (activeLoading) return;
      if (isDisabled) return;
      if (walletDetail?.id) {
        setActiveLoading(true);
        request.post(`/api/Wallet/${walletDetail?.id}/Active`, {
          pin: aesEncrypt(codeYzm2.join(''))
        }).then((res) => {
          if (res.data) {
            setCreatePinModalVisible(false);
            getWalletDetail();
          }
        }).finally(() => {
          setActiveLoading(false);
        });
      }

    }
    async function handleRecharge() {
      if (rechargeLoading) return;
      if (isRechargeDisabled) {
        return;
      }
      if (walletDetail?.id) {
        setRechargeLoading(true);
        postRecharge({
          id: walletDetail.id,
          balance: Number(rechargeAmount),
        }).then((res) => {
          if (res.data) {
            setModalOpen(false);
            setModalVisible(true);
            getWalletDetail();
          }
        }).finally(() => {
          setRechargeLoading(false);
        });
      }
    }
    return <div className={`pay-method ${embedded ? 'pay-method--embedded' : ''}`}>
      {showHeading && (
        <h3 className="pay-method__title">
          {t("payments.paymentMethodSelection.title")}
        </h3>
      )}
      {!isWalletInactive ? <div onClick={() => { if (!walletDisabled) setActive(isWalletSelected ? null : '1') }} className={`pay-method__card ${walletDisabled ? 'pay-method__card--disabled' : ''} ${isWalletSelected ? 'pay-method__card--active' : ''} ${isWalletSelected && isWalletInsufficient ? 'pay-method__card--insufficient' : ''}`}>
        <div className="pay-method__card-content">
          <div className="pay-method__card-main">
            <div className="pay-method__icon-box">
              <img src={Wallet} />
            </div>
            <div>
              <div className="pay-method__label">
                {t("payments.paymentMethodSelection.wallet")}{" "}
                <span className="pay-method__instant-payment">
                  {t("payments.paymentMethodSelection.instantPayment")}
                </span>
              </div>
              <div className="pay-method__description">
                {t("payments.paymentMethodSelection.walletDesc")}
              </div>
            </div>
          </div>
          <div >
            {(!isWalletSelected || !isWalletInsufficient) && (
              <div className="pay-method__balance-label">
                {t("payments.paymentMethodSelection.availableBalance")}
              </div>
            )}
            <div className="pay-method__balance-amount"><Aed />{formatMoney(amount)}</div>
          </div>
        </div>
        {isWalletSelected && isWalletInsufficient && !walletDisabled && <div className="pay-method__insufficient-balance">
          <div className="pay-method__insufficient-balance-icon">
            <img src={Warning} />
          </div>
          <div className="pay-method__insufficient-balance-content">
            <div className="pay-method__insufficient-balance-title">
              {t("payments.paymentMethodSelection.insufficientTitle")}
            </div>
            <div className="pay-method__insufficient-balance-description">
              {t("payments.paymentMethodSelection.insufficientDesc")}{" "}
              <span className="pay-method__insufficient-balance-amount">
                <Aed />{formatMoney(totalAmount - amount)}
              </span>{" "}
              {t("payments.paymentMethodSelection.insufficientDescSuffix")}
            </div>
          </div>
          <div className="pay-method__insufficient-balance-action">
            <CustomButton text={t("payments.paymentMethodSelection.recharge")} onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              setActiveAmount('0.00');
              setCustomAmount('');
              setHasError(false);
              setModalOpen(true);
            }} />
          </div>
        </div>}
      </div> : <div className={`pay-method__card pay-method__card--wallet-layout ${walletDisabled ? 'pay-method__card--disabled' : ''} ${isWalletSelected ? 'pay-method__card--wallet-inactive-selected pay-method__card--active' : 'pay-method__card--wallet-inactive'}`} onClick={() => { if (!walletDisabled) setActive(isWalletSelected ? null : '1') }}>
        <div className="pay-method__card-main">
          <div className="pay-method__icon-box">
            <img src={WalletAcitve} />
          </div>
          <div>
            <div className="pay-method__label">
              {t("payments.paymentMethodSelection.wallet")}{" "}
              <span className="pay-method__instant-payment">
                {t("payments.paymentMethodSelection.instantPayment")}
              </span>
            </div>
            <div className="pay-method__description">
              {t("payments.paymentMethodSelection.walletInactiveDesc")}
            </div>
          </div>

        </div>
        <div >
          <div className="pay-method__wallet-action">
            <CustomButton text={t("payments.paymentMethodSelection.activateWallet")} disabled={walletDisabled} onClick={() => setCreatePinModalVisible(true)} />
          </div>
        </div>
      </div>}
      <div className={`pay-method__card ${isCardSelected ? 'pay-method__card--active' : ''}`} onClick={() => { setActive(isCardSelected ? null : '2') }}>
        <div className="pay-method__card-main">
          <div className="pay-method__icon-box">
            <img src={Cardholder} alt="" />
          </div>
          <div>
            <div className="pay-method__label">
              {t("payments.paymentMethodSelection.card")}
            </div>
            <div className="pay-method__description">
              {t("payments.paymentMethodSelection.cardDesc")}
            </div>
          </div>
        </div>
      </div>

      <Modal centered className='create-pin-modal' visible={createPinModalVisible} maskClosable={false} onCancel={() => setCreatePinModalVisible(false)} footer={null} title={<div className='create-pin-header'>
        <div className='create-pin-title'>{t('payments.createPin.title')}</div>
        <div className='create-pin-desc'>{t('payments.createPin.desc')}</div>
      </div>}>
        <div className='create-pin-content'>
          <div className='create-pin-item'>
            <div className='create-pin-item-title'>{t('payments.createPin.enterPIN')}</div>
            <VerificationInput hide={!eye} codeYzm={codeYzm} onChange={(codeYzm) => setCodeYzm(codeYzm)} />
            {isNotMatch && <div className='create-pin-jinggao'><img src={jinggao} alt="" /> {t('payments.createPin.noMatch')} </div>}
          </div>
          <div className='create-pin-item'>
            <div className='create-pin-item-title'>{t('payments.createPin.confirmPIN')}</div>
            <VerificationInput hide={!eye} codeYzm={codeYzm2} onChange={(codeYzm) => setCodeYzm2(codeYzm)} />
            {isNotMatch && <div className='create-pin-jinggao'><img src={jinggao} alt="" /> {t('payments.createPin.noMatch')} </div>}
          </div>
          <div className='eye-icon' onClick={() => setEye(!eye)}>
            {eye ? <img className='pwd-eye' src={eyePng} /> : <img className='pwd-eye' src={hideEyePng} />}
            {eye ? <div className='eye-text'>{t('payments.createPin.showPIN')}</div> : <div className='eye-text'>{t('payments.createPin.hidePIN')}</div>}
          </div>
          <div className='create-pin-rule'>
            <div className='warn-icon'><img src={yellowWarnPng} /></div>
            <div className='warn-content'>
              <div className='warn-title'>{t('payments.createPin.requirements')}:</div>
              <ul className='warn-items'>
                <li>{t('payments.createPin.pinLength')}</li>
                <li>{t('payments.createPin.pinComplexity')}</li>
                <li>{t('payments.createPin.pinSecurity')}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className='create-pin-footer'>
          <div className='create-pin-securely'><img src={shouquan} alt="" />{t('payments.createPin.pinSecurityDesc')}</div>
          <div className={`create-pin-btn ${isDisabled ? 'disabled' : ''}`} onClick={handleCreatePin}><Loading loading={activeLoading}>{t('payments.createPin.createPIN')}</Loading></div>
        </div>
      </Modal>

      <Modal className='payments-modal pay-method-recharge-modal' forceRender centered maskClosable={false} visible={modalOpen} onCancel={() => setModalOpen(false)} footer={null} title={<div className='payments-modal-header'>
        <div className='title'>{t('payments.recharge.title')}</div>
        <div className='desc'>{t('payments.recharge.desc')}</div>
      </div>}>
        <div className='payments-modal-content'>
          <div className='recharge-amount'>
            <div className='recharge-amount-title'>{t('payments.recharge.rechargeAmount')}</div>
            <div className='recharge-amount-amount'>
              {['100.00', '500.00', '1000.00', '2000.00', '5000.00'].map(item => {
                return <div key={item} className={item === activeAmount ? 'recharge-amount-active' : ''} onClick={() => {
                  setCustomAmount('');
                  setHasError(false);
                  if (activeAmount === item) {
                    setActiveAmount('0.00');
                  } else {
                    setActiveAmount(item);
                  }
                }}><Aed />{item}</div>
              })}
              <Form layout="vertical" className={`custorm-form ${hasCustomAmount ? 'has-value' : ''}`}>
                <Form.Item>
                  <Input
                    className="custom-amount-input"
                    value={customAmount}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, '');
                      const val = num ? String(Math.min(Number(num), 50000)) : '';
                      setActiveAmount('0.00');
                      setCustomAmount(val);
                      setHasError(Boolean(val) && Number(val) < 100);
                    }}
                    placeholder={t('payments.recharge.customAmount')}
                  />
                </Form.Item>
                <div className={`payments-modal-form-desc ${hasError ? 'error' : ''}`}>
                  {t('payments.recharge.minAmount')} <Aed /> 100.00
                </div>
              </Form>
            </div>
          </div>
        </div>
        <div className='card-pay'>
          <div className='card-pay-title'><CardPay />{t('payments.recharge.cardPayment')}</div>
          <div className='card-pay-desc'>{t('payments.recharge.cardPaymentDesc')}</div>
        </div>
        <div className='payments-modal-footer'>
          <div className='total-amount'>
            <div className='total-amount-text'>{t('payments.recharge.totalAmount')}</div>
            <div className='total-amount-amount'>
              <Aed /> {rechargeAmount || '0.00'}
            </div>
          </div>
          <div onClick={handleRecharge} className={`submit-btn ${isRechargeDisabled ? 'disabled' : ''}`}>
            <Loading loading={rechargeLoading}>{t('payments.recharge.continueToPayment')}</Loading>
          </div>
        </div>
      </Modal>
      <Modal centered className='recharge-successful-modal' maskClosable={false} onCancel={() => setModalVisible(false)} title={<div className='height-64'></div>} footer={null} visible={modalVisible}>
        <div className='recharge-successful-modal-content'>
          <img src={success} alt="" />
          <div className='title'>{t('payments.rechargeSuccessful.title')}</div>
          <div className='desc'>{t('payments.rechargeSuccessful.desc')}</div>
          <div className='btn-group'>
            <div onClick={() => setModalVisible(false)} className='close-btn'>{t('payments.rechargeSuccessful.close')}</div>
            <div className='download-btn'>{t('payments.rechargeSuccessful.downloadReceipt')}</div>
          </div>
        </div>
      </Modal>
    </div>
  }

export default PayMethod;
