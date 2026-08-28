import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import CustomButton from "@/components/common/CustomButton";
import AED from "@/assets/icons/Aed";
import formatMoney from "@/utils/formatMoney";
import "./index.less";

interface CardPaymentProgressModalProps {
  visible: boolean;
  amount: number;
  modalClassName?: string;
  modalWidth?: number;
  closable?: boolean;
  amountLabel?: string;
  confirmLoading?: boolean;
  cancelLoading?: boolean;
  onClose: () => void | Promise<void>;
  onConfirmCompleted: () => void;
}

const CardPaymentProgressModal: React.FC<CardPaymentProgressModalProps> = ({
  visible,
  amount,
  modalClassName = "",
  modalWidth = 640,
  closable = false,
  amountLabel,
  confirmLoading = false,
  cancelLoading = false,
  onClose,
  onConfirmCompleted,
}) => {
  const { t } = useTranslation();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!visible) {
      setConfirmingCancel(false);
    }
  }, [visible]);

  const showCancelConfirmation = useCallback(() => {
    if (cancelLoading || confirmLoading) {
      return;
    }

    setConfirmingCancel(true);
  }, [cancelLoading, confirmLoading]);

  const handleCancelConfirmationClose = useCallback(() => {
    if (cancelLoading) {
      return;
    }

    setConfirmingCancel(false);
  }, [cancelLoading]);

  const handleCancelConfirmationConfirm = useCallback(async () => {
    if (cancelLoading || confirmLoading) {
      return;
    }

    try {
      await onClose();
    } finally {
      if (mountedRef.current) {
        setConfirmingCancel(false);
      }
    }
  }, [cancelLoading, confirmLoading, onClose]);

  return (
    <Modal
      visible={visible}
      onCancel={
        confirmingCancel
          ? handleCancelConfirmationClose
          : showCancelConfirmation
      }
      footer={null}
      centered
      width={modalWidth}
      className={`card-payment-progress-modal ${
        confirmingCancel ? "card-payment-progress-modal--confirming" : ""
      } ${modalClassName}`.trim()}
      maskClosable={false}
      closable={closable}
    >
      {confirmingCancel ? (
        <div className="card-payment-progress-modal__content card-payment-progress-modal__content--confirm">
          <div className="card-payment-progress-modal__confirm-icon">
            <div className="card-payment-progress-modal__confirm-icon-ring">
              <span>!</span>
            </div>
          </div>
          <div className="card-payment-progress-modal__copy">
            <h2>{t("payments.cardPaymentProgress.cancelConfirmTitle")}</h2>
            <p>{t("payments.cardPaymentProgress.cancelConfirmDescription")}</p>
          </div>
          <div className="card-payment-progress-modal__actions card-payment-progress-modal__actions--confirm">
            <CustomButton
              variant="outline"
              onClick={handleCancelConfirmationClose}
              disabled={cancelLoading}
              customClassName="card-payment-progress-modal__action card-payment-progress-modal__action--confirm-secondary"
            >
              {t("payments.cardPaymentProgress.cancelConfirmCancel")}
            </CustomButton>
            <CustomButton
              variant="danger"
              onClick={handleCancelConfirmationConfirm}
              loading={cancelLoading}
              disabled={cancelLoading || confirmLoading}
              customClassName="card-payment-progress-modal__action card-payment-progress-modal__action--confirm-primary"
            >
              {t("payments.cardPaymentProgress.cancelConfirmConfirm")}
            </CustomButton>
          </div>
        </div>
      ) : (
        <div className="card-payment-progress-modal__content">
          <div className="card-payment-progress-modal__icon">
            <div className="card-payment-progress-modal__icon-ring">
              <span>i</span>
            </div>
          </div>
          <div className="card-payment-progress-modal__copy">
            <h2>{t("payments.cardPaymentProgress.title")}</h2>
            <p>{t("payments.cardPaymentProgress.description")}</p>
          </div>
          <div className="card-payment-progress-modal__amount">
            <span>{amountLabel || t("payments.cardPaymentProgress.amount")}</span>
            <div className="card-payment-progress-modal__amount-value">
              <AED />
              <strong>{formatMoney(amount)}</strong>
            </div>
          </div>
          <div className="card-payment-progress-modal__actions">
            <CustomButton
              variant="outline"
              onClick={showCancelConfirmation}
              disabled={cancelLoading || confirmLoading}
              customClassName="card-payment-progress-modal__action card-payment-progress-modal__action--secondary"
            >
              {t("payments.cardPaymentProgress.cancel")}
            </CustomButton>
            <CustomButton
              variant="primary"
              onClick={onConfirmCompleted}
              loading={confirmLoading}
              disabled={cancelLoading}
              customClassName="card-payment-progress-modal__action"
            >
              {t("payments.cardPaymentProgress.completed")}
            </CustomButton>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CardPaymentProgressModal;
