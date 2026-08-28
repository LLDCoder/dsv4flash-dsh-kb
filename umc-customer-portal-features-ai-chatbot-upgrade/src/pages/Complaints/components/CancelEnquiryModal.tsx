import React, { useState } from "react";
import { Modal } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import WarningCircle from "@/assets/images/warning-circle.png";
import "./CancelEnquiryModal.less";

interface CancelEnquiryModalProps {
  visible: boolean;
  title: string;
  content: string;
  onCancel: () => void;
  onConfirm: (() => Promise<unknown>) | (() => void);
}

const CancelEnquiryModal: React.FC<CancelEnquiryModalProps> = ({
  visible,
  title,
  content,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={loading ? undefined : onCancel}
      footer={null}
      closable={false}
      centered
      destroyOnClose={true}
      maskClosable={!loading}
      keyboard={!loading}
      className="complaints-cancel-modal"
      wrapClassName="complaints-cancel-modal-wrap"
    >
      <div className="complaints-cancel-modal__root">
        <button
          aria-label={t("common.close")}
          className="complaints-cancel-modal__close"
          disabled={loading}
          type="button"
          onClick={onCancel}
        >
          <CloseOutlined />
        </button>

        <div className="complaints-cancel-modal__icon">
          <img src={WarningCircle} alt="" aria-hidden="true" />
        </div>

        <h3 className="complaints-cancel-modal__title">{title}</h3>
        <p className="complaints-cancel-modal__description">{content}</p>

        <div className="complaints-cancel-modal__actions">
          <button
            className="complaints-cancel-modal__button complaints-cancel-modal__button--cancel"
            disabled={loading}
            type="button"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </button>
          <button
            className="complaints-cancel-modal__button complaints-cancel-modal__button--confirm"
            disabled={loading}
            type="button"
            onClick={handleConfirm}
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelEnquiryModal;
