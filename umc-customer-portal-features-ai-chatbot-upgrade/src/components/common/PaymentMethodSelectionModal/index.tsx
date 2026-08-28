import { type FC } from "react";
import { Modal } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import SimpleBar from "@/components/SimpleBar";
import CustomButton from "@/components/common/CustomButton";
import AED from "@/assets/icons/Aed";
import formatMoney from "@/utils/formatMoney";
import "./PaymentMethodSelectionModal.less";

export interface PaymentConfirmationItem {
  title: string;
  reference: string;
  amount: number;
}

interface PaymentMethodSelectionModalProps {
  visible: boolean;
  items: PaymentConfirmationItem[];
  totalAmount: number;
  loading?: boolean;
  onCancel: () => void;
  onProceed: () => void;
}

const PaymentMethodSelectionModal: FC<PaymentMethodSelectionModalProps> = ({
  visible,
  items,
  totalAmount,
  loading = false,
  onCancel,
  onProceed,
}) => {
  const { t } = useTranslation();
  const isBatchPayment = items.length > 1;
  return (
    <Modal
      className="payment-method-selection-modal"
      wrapClassName="payment-method-selection-modal-root"
      visible={visible}
      centered
      closable={false}
      maskClosable={false}
      destroyOnClose
      onCancel={onCancel}
      footer={
        <div className="payment-method-selection-modal__footer-actions">
          <CustomButton
            text={t("payments.paymentMethodSelection.cancel")}
            variant="outline"
            customClassName="payment-method-selection-modal__footer-button"
            onClick={onCancel}
            disabled={loading}
          />
          <CustomButton
            text={t("payments.paymentMethodSelection.proceed")}
            variant="primary"
            customClassName="payment-method-selection-modal__footer-button"
            onClick={onProceed}
            disabled={loading}
            loading={loading}
          />
        </div>
      }
    >
      <div className="payment-method-selection-modal__header">
        <div className="payment-method-selection-modal__title">
          {t("payments.paymentMethodSelection.confirmTitle")}
        </div>
        <button
          type="button"
          className="payment-method-selection-modal__close"
          onClick={onCancel}
          disabled={loading}
          aria-label={t("payments.paymentMethodSelection.closeAria")}
        >
          <CloseOutlined />
        </button>
      </div>
      <SimpleBar className="payment-method-selection-modal__scroll">
        <div
          className={`payment-method-selection-modal__content${
            isBatchPayment ? " payment-method-selection-modal__content--batch" : " payment-method-selection-modal__content--single"
          }`}
        >
          <div className="payment-method-selection-modal__items">
            {items.map((item, index) => (
              <div className="payment-method-selection-modal__item" key={`${item.reference}-${index}`}>
                {isBatchPayment ? (
                  <span className="payment-method-selection-modal__item-index">
                    {index + 1}
                  </span>
                ) : null}
                <div className="payment-method-selection-modal__item-copy">
                  <div className="payment-method-selection-modal__item-title">{item.title}</div>
                  <div className="payment-method-selection-modal__item-reference">{item.reference}</div>
                </div>
                <div className="payment-method-selection-modal__item-amount">
                  <AED />{formatMoney(item.amount)}
                </div>
              </div>
            ))}
          </div>
          <PaymentAmountRow
            total
            label={t("payments.paymentMethodSelection.totalPayable")}
            amount={totalAmount}
          />
        </div>
      </SimpleBar>
    </Modal>
  );
};

const PaymentAmountRow = ({ label, amount, total = false }: { label: string; amount: number; total?: boolean }) => (
  <div
    className={`payment-method-selection-modal__amount-row${
      total ? " payment-method-selection-modal__amount-row--total" : ""
    }`}
  >
    <span>{label}</span>
    <span><AED />{formatMoney(amount)}</span>
  </div>
);

export default PaymentMethodSelectionModal;
