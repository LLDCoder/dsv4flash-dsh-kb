import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import WarningCircleIcon from "@/assets/images/warning-circle.png";
import "./index.less";

export interface AccountSuspendedModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AccountSuspendedModal({
  visible,
  onClose,
  onConfirm,
}: AccountSuspendedModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      title={<div className="account-suspended__header-title" />}
      footer={null}
      centered
      closable
      maskClosable={false}
      keyboard={false}
      destroyOnClose
      width={720}
      onCancel={onClose}
      className="account-suspended-modal"
      wrapClassName="account-suspended-modal-wrap"
    >
      <div className="account-suspended">
        <img
          className="account-suspended__icon"
          src={WarningCircleIcon}
          alt=""
          aria-hidden
        />
        <h2 className="account-suspended__title">
          {t("servicesPage.accountSuspended.title")}
        </h2>
        <p className="account-suspended__description">
          {t("servicesPage.accountSuspended.description")}
        </p>
        <button
          type="button"
          className="account-suspended__confirm"
          onClick={onConfirm}
        >
          {t("servicesPage.accountSuspended.confirm")}
        </button>
      </div>
    </Modal>
  );
}
