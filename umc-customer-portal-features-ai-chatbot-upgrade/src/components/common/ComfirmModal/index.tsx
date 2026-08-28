import React, { useState } from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import CustomButton from "../CustomButton";
import SuccessImg from "@/assets/images/comfirm_success.png";
import WarningImg from "@/assets/images/comfirm_warning.png";
import "./index.less";

// props
interface ModalProps {
  show: boolean;
  title: string;
  icon?: string;
  content: string;
  cancelText?: string;
  comfrimText?: string;
  type?: "default" | "warning";
  expandContent?: React.ReactNode;
  close: () => void;
  comfrimHanld?: (() => Promise<unknown>) | (() => void);
  footRender?: React.ReactNode;
  className?: string;
}

const ComfirmModal: React.FC<ModalProps> = ({
  show,
  close,
  title,
  content,
  cancelText,
  comfrimText,
  type = "default",
  expandContent = null,
  icon,
  comfrimHanld,
  footRender,
  className,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const handleCancel = () => {
    close();
  };
  return (
    <Modal
      centered
      width="37.5%"
      className={className}
      wrapClassName="comfirm-modal"
      visible={show}
      onCancel={handleCancel}
      footer={
        footRender ? (
          footRender
        ) : (
          <div>
            <CustomButton
              text={cancelText ?? t("comfirmModal.cancel")}
              variant={type == "warning" ? "danger-outline" : "outline"}
              customClassName={`modal-btn ${
                type == "warning" ? "warning-btn-outline" : ""
              }`}
              onClick={handleCancel}
            />
            <CustomButton
              loading={loading}
              text={comfrimText ?? t("comfirmModal.confirm")}
              variant={type == "warning" ? "danger" : "primary"}
              customClassName={`modal-btn ${
                type == "warning" ? "warning-btn" : ""
              }`}
              onClick={async () => {
                setLoading(true);
                await comfrimHanld?.();
                setLoading(false);
              }}
            />
          </div>
        )
      }
    >
      <div className="modal-body">
        <img
          src={icon ? icon : type == "warning" ? WarningImg : SuccessImg}
          alt=""
        />
        <div className="title">{title}</div>
        <div className="content">{content}</div>
        {expandContent}
      </div>
    </Modal>
  );
};

export default ComfirmModal;
