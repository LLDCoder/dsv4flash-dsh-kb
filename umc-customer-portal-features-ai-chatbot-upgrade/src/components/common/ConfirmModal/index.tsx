import React from "react";
import { Modal } from "antd";
import { CloseOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import CustomButton from "../CustomButton";
import "./index.less";
import WaingGoldIcon from "@/assets/images/WarningGold.png";
import CheckCircleIcon from "@/assets/images/checkcircle.png";

export type ConfirmModalType = "warning" | "danger" | "info" | "success";

export interface ConfirmModalProps {
  visible: boolean;
  type?: ConfirmModalType;
  title: string;
  content: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  icon?: string;
  layout?: "default" | "centered";
  showClose?: boolean;
  /** Extra class on the modal, so a caller can restyle just its own dialog. */
  className?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  type = "warning",
  title,
  content,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  loading = false,
  icon,
  layout = "default",
  showClose = false,
  className,
}) => {
  const { t } = useTranslation();
  const resolvedCancelText = cancelText ?? t("common.cancel");
  const resolvedConfirmText = confirmText ?? t("common.confirm");
  const getIconConfig = () => {
    switch (type) {
      case "warning":
        return {
          icon: <img src={icon ?? WaingGoldIcon} />,
          className: "warning-icon",
        };
      case "danger":
        return {
          icon: icon ? <img src={icon} /> : <ExclamationCircleOutlined style={{ color: "#EA4F49", fontSize: 36 }} />,
          className: "danger-icon",
        };
      case "info":
        return {
          icon: "i",
          className: "info-icon",
        };
      case "success":
        return {
          icon: <img src={icon ?? CheckCircleIcon} />,
          className: "success-icon",
        };
      default:
        return {
          icon: "!",
          className: "warning-icon",
        };
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case "danger":
        return "danger";
      default:
        return "primary";
    }
  };

  const getCancelButtonVariant = () => {
    return "outline";
  };

  const iconConfig = getIconConfig();
  const modalClassName = [
    type === "danger" ? "darger-confirm-modal" : "confirm-modal",
    layout === "centered" ? "confirm-modal--centered" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={null}
      closable={showClose}
      closeIcon={showClose ? <CloseOutlined /> : undefined}
      className={modalClassName}
      centered
    >
      <div className="confirm-modal-content">
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon ${iconConfig.className}`}>
            {iconConfig.icon}
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        <p className="confirm-modal-text">{content}</p>
        <div className="confirm-modal-footer">
          {resolvedCancelText && (
            <CustomButton
              text={resolvedCancelText}
              variant={getCancelButtonVariant()}
              onClick={onCancel}
              customClassName="confirm-modal__button confirm-modal__button--cancel cancel-btn"
              disabled={loading}
            />
          )}
          <CustomButton
            text={resolvedConfirmText}
            variant={getConfirmButtonVariant()}
            onClick={onConfirm}
            customClassName="confirm-modal__button confirm-modal__button--confirm confirm-btn"
            loading={loading}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
