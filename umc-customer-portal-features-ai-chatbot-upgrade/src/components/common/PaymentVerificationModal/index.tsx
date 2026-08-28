import React, { useState, useRef, useEffect } from 'react';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { CloseOutlined, QuestionCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import './index.less';
// import PasswordInput from '@/components/common/PasswordInput/PasswordInput';
import CustomButton from '@/components/common/CustomButton';
import lockIcon from '@/assets/images/lock1.svg';
import formatMoney from "@/utils/formatMoney";
import AED from '@/assets/icons/Aed';

interface PaymentVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  amount: number;
  loading?: boolean;
}

const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  amount,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  useEffect(() => {
    if (visible) {
      // Reset PIN when modal opens
      setPin(['', '', '', '', '', '']);
      setFocusedIndex(0);
      // Focus first input after modal animation
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [visible]);

  const handleInput = (index: number, value: string) => {
    // Only allow single digit
    const singleChar = value.replace(/[^0-9]/g, '').slice(0, 1);
    
    const newPin = [...pin];
    newPin[index] = singleChar;
    setPin(newPin);

    // Auto focus next input
    if (singleChar && index < 5) {
      setFocusedIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (pin[index] === '' && index > 0) {
        // Move to previous input if current is empty
        setFocusedIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setFocusedIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      setFocusedIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleConfirm = () => {
    const pinString = pin.join('');
    if (pinString.length === 6) {
      onConfirm(pinString);
    }
  };

  const handleForgotPin = () => {
    // Handle forgot PIN logic
    console.log('Forgot PIN clicked');
  };

  const isPinComplete = pin.every(digit => digit !== '');
  const isConfirmDisabled = !isPinComplete || loading;
  
  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={""}
      className="payment-verification-modal"
      closeIcon={<CloseOutlined className="modal-close-icon" />}
      maskClosable={false}
    >
      <div className="modal-content">
        {/* Lock Icon */}
        <div className="lock-icon-container">
         <img src={lockIcon}/>
        </div>

        {/* Title */}
        <h2 className="modal-title">{t("payments.paymentVerification.title")}</h2>
        
        {/* Subtitle */}
        <p className="modal-subtitle">
          {t("payments.paymentVerification.description")}
        </p>

        {/* PIN Input */}
        <div className="pin-input-container">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => handleFocus(index)}
              className={`pin-input ${focusedIndex === index ? 'focused' : ''} ${digit ? 'filled' : ''}`}
              style={{
                borderColor: focusedIndex === index ? '#92722A' : digit ? '#92722A' : '#C3C6CB'
              }}
            />

            // <PasswordInput></PasswordInput>
          ))}
        </div>
        

        {/* Confirm Button */}
        <CustomButton
          variant="primary"
          size="large"
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          loading={loading}
          customClassName="confirm-button"
        >
          <span className="confirm-payment-text">{t("payments.paymentVerification.confirm")}</span> <AED />{formatMoney(amount)}
        </CustomButton>

        {/* Cancel Button */}
        <CustomButton
          size="large"
          variant='outline'
          onClick={onClose}
          customClassName="cancel-button"
          disabled={loading}
        >
          {t("payments.paymentVerification.cancel")}
        </CustomButton>

        {/* Forgot PIN Link */}
        <div className="forgot-pin-container">
          <QuestionCircleOutlined className="question-icon" />
          <button className="forgot-pin-link" onClick={handleForgotPin}>
            {t("payments.paymentVerification.forgotPin")}
          </button>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <SafetyCertificateOutlined className="security-icon" />
          <span>{t("payments.paymentVerification.secured")}</span>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentVerificationModal;
