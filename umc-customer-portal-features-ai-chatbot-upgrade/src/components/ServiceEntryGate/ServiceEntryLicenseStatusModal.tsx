import { CopyOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import { CustomButton } from "@/components/common";
import { copyToClipboard } from "@/utils/copy";
import { renderGateDialogIcon } from "./dialogShared";
import type { ServiceEntryGateLicenseStatusDialog } from "./types";
import "./service-entry-gate.less";
interface ServiceEntryLicenseStatusModalProps {
  visible: boolean;
  dialog: ServiceEntryGateLicenseStatusDialog;
  onAction: (actionKey: string) => void;
  onClose: () => void;
}

export default function ServiceEntryLicenseStatusModal({
  visible,
  dialog,
  onAction,
  onClose,
}: ServiceEntryLicenseStatusModalProps) {
  const { t } = useTranslation();

  const handleCopy = async () => {
    if (!dialog.identifierValue) {
      return;
    }
    await copyToClipboard(dialog.identifierValue, {
      successMessage: t("serviceEntryGate.messages.copied"),
    });
  };

  return (
    <Modal
      visible={visible}
      footer={null}
      centered
      getContainer={() => document.body}
      closable={dialog.closeable ?? true}
      onCancel={onClose}
      width={dialog.width ?? 760}
      className={`service-entry-gate-dialog service-entry-gate-dialog--license-status service-entry-gate-dialog--${dialog.variant || "default"}`}
    >
      <div className="service-entry-gate-dialog__body service-entry-gate-dialog__body--license-status">
        <div className="service-entry-gate-dialog__license-content">
          <div
            className={`service-entry-gate-dialog__icon service-entry-gate-dialog__icon--${dialog.tone || "warning"}`}
          >
            {renderGateDialogIcon(dialog.tone)}
          </div>
          <div className="service-entry-gate-dialog__copy-block service-entry-gate-dialog__copy-block--license-status">
            <h3 className="service-entry-gate-dialog__title">{dialog.title}</h3>
            <p className="service-entry-gate-dialog__description">
              {dialog.description}
            </p>
          </div>
        </div>
        {dialog.identifierValue ? (
          <div className="service-entry-gate-dialog__identifier service-entry-gate-dialog__identifier--license-status">
            <div className="service-entry-gate-dialog__identifier-copy">
              {dialog.identifierLabel ? (
                <span className="service-entry-gate-dialog__identifier-label">
                  {`${dialog.identifierLabel}:`}
                </span>
              ) : null}
              <span className="service-entry-gate-dialog__identifier-value">
                {dialog.identifierValue}
              </span>
            </div>
            <button
              type="button"
              className="service-entry-gate-dialog__copy-button"
              onClick={handleCopy}
              aria-label={t("serviceEntryGate.accessibility.copyIdentifier")}
            >
              <CopyOutlined />
            </button>
          </div>
        ) : null}
        {dialog.helperText ? (
          <div className="service-entry-gate-dialog__helper">
            {dialog.helperText}
          </div>
        ) : null}
        <div className="service-entry-gate-dialog__actions service-entry-gate-dialog__actions--license-status">
          {dialog.actions.map((action) => (
            <CustomButton
              key={action.key}
              variant={action.variant || "outline"}
              disabled={action.disabled}
              size="large"
              onClick={() => onAction(action.key)}
            >
              {action.label}
            </CustomButton>
          ))}
        </div>
      </div>
    </Modal>
  );
}
