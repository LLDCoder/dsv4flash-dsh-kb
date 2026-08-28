import { CloseOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import PaymentSuccessFeedback from "@/components/common/PaymentSuccessFeedback";
import paymentSuccessIcon from "@/assets/icons/pay-fines/modal-success.svg";
import i18n from "@/localization/config";
import "./index.less";

interface SinglePaymentSuccessModalProps {
  visible: boolean;
  closeDisabled?: boolean;
  fineReferenceNumber: string;
  receiptAvailable: boolean;
  receiptDownloadLoading: boolean;
  onClose: () => void;
  onDownloadReceipt: () => void;
  onReceiptUnavailable: () => void;
  onSubmitFeedback: (rating: number) => Promise<void>;
}

export default function SinglePaymentSuccessModal({
  visible,
  closeDisabled = false,
  fineReferenceNumber,
  receiptAvailable,
  receiptDownloadLoading,
  onClose,
  onDownloadReceipt,
  onReceiptUnavailable,
  onSubmitFeedback,
}: SinglePaymentSuccessModalProps) {
  return (
    <Modal
      centered
      className="pay-fines-payment-modal pay-fines-single-payment-success-modal"
      closable={!closeDisabled}
      closeIcon={<CloseOutlined />}
      footer={null}
      keyboard={!closeDisabled}
      maskClosable={false}
      visible={visible}
      onCancel={onClose}
    >
      <div className="pay-fines-single-payment-success">
        <div className="pay-fines-single-payment-success__icon">
          <img alt="" src={paymentSuccessIcon} />
        </div>
        <div className="pay-fines-single-payment-success__title">
          {i18n.t("payFines.payment.success.title")}
        </div>
        <div className="pay-fines-single-payment-success__description">
          {i18n.t("payFines.payment.success.singleDescription", {
            sn: fineReferenceNumber,
          })}
        </div>
        <div className="pay-fines-single-payment-success__actions">
          <button
            className="pay-fines-single-payment-success__button"
            disabled={closeDisabled}
            type="button"
            onClick={onClose}
          >
            {i18n.t("common.close")}
          </button>
          <button
            aria-disabled={!receiptAvailable || receiptDownloadLoading}
            className={`pay-fines-single-payment-success__button pay-fines-single-payment-success__button--primary${
              receiptAvailable
                ? ""
                : " pay-fines-single-payment-success__button--unavailable"
            }`}
            disabled={receiptDownloadLoading}
            type="button"
            onClick={
              receiptAvailable ? onDownloadReceipt : onReceiptUnavailable
            }
          >
            {i18n.t("btns.downloadReceipt")}
          </button>
        </div>
        <PaymentSuccessFeedback
          active={visible}
          title={i18n.t("payFines.payment.feedbackTitle")}
          dissatisfiedLabel={i18n.t(
            "payFines.payment.feedbackExtremelyDissatisfied",
          )}
          satisfiedLabel={i18n.t(
            "payFines.payment.feedbackExtremelySatisfied",
          )}
          submitLabel={i18n.t("common.submit")}
          onSubmit={onSubmitFeedback}
        />
      </div>
    </Modal>
  );
}
