import React, { useMemo, useState } from "react";
import { Input, Modal } from "antd";
import { useTranslation } from "react-i18next";
import {
  CloseOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { CustomButton } from "@/components/common";
import { copyToClipboard } from "@/utils/copy";
import { downFile } from "@/utils/down";
import "./index.less";

interface CardPaymentDocumentPasswordModalProps {
  visible: boolean;
  password: string;
  fileName: string;
  url: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

const CardPaymentDocumentPasswordModal: React.FC<
  CardPaymentDocumentPasswordModalProps
> = ({
  visible,
  password,
  fileName,
  url,
  title,
  subtitle,
  onClose,
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const baseUrl = useMemo(
    () => import.meta.env.VITE_DownloadPDF_URL || window.location.origin,
    [],
  );

  const handleCopyAndRedirect = async () => {
    const copied = await copyToClipboard(password);

    if (!copied) {
      return;
    }

    const previewUrl = `${baseUrl}/api/pdf/preview?fileName=${url}`;
    downFile(previewUrl, `${fileName}.pdf`);
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={640}
      className="card-payment-document-password-modal"
      closeIcon={<CloseOutlined className="card-payment-document-password-modal__close-icon" />}
      maskClosable={false}
    >
      <div className="card-payment-document-password-modal__content">
        <div className="card-payment-document-password-modal__icon">
          <DownloadOutlined />
        </div>
        <div className="card-payment-document-password-modal__copy">
          <h2>{title || t("myRequestsPage.documentModal.title")}</h2>
          <p>{subtitle || t("myRequestsPage.documentModal.subtitle")}</p>
        </div>
        <div className="card-payment-document-password-modal__field">
          <label htmlFor="card-payment-password-input">
            {t("myRequestsPage.documentModal.passwordLabel")}
          </label>
          <Input
            id="card-payment-password-input"
            type={showPassword ? "text" : "password"}
            value={password}
            readOnly
            suffix={
              <button
                type="button"
                className="card-payment-document-password-modal__eye-button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </button>
            }
          />
        </div>
        <div className="card-payment-document-password-modal__note">
          <div className="card-payment-document-password-modal__note-header">
            <ExclamationCircleOutlined />
            <span>{t("myRequestsPage.documentModal.noteTitle")}</span>
          </div>
          <p>
            {t("myRequestsPage.documentModal.noteText")}
          </p>
        </div>
        <CustomButton
          variant="primary"
          onClick={() => void handleCopyAndRedirect()}
          disabled={!password || !url || !fileName}
          customClassName="card-payment-document-password-modal__button"
        >
          {t("myRequestsPage.documentModal.copyRedirect")}
        </CustomButton>
      </div>
    </Modal>
  );
};

export default CardPaymentDocumentPasswordModal;
