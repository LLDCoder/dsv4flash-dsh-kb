import { Modal } from "antd";
import { CustomButton } from "@/components/common";
import { renderGateDialogIcon } from "./dialogShared";
import type { ServiceEntryGateDangerConfirmDialog } from "./types";
import "./service-entry-gate.less";
interface ServiceEntryDangerConfirmModalProps {
  visible: boolean;
  dialog: ServiceEntryGateDangerConfirmDialog;
  onAction: (actionKey: string) => void;
  onClose: () => void;
}

export default function ServiceEntryDangerConfirmModal({
  visible,
  dialog,
  onAction,
  onClose,
}: ServiceEntryDangerConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      footer={null}
      centered
      getContainer={() => document.body}
      closable={dialog.closeable ?? true}
      onCancel={onClose}
      width={dialog.width ?? 760}
      className={`service-entry-gate-dialog service-entry-gate-dialog--danger-confirm service-entry-gate-dialog--${dialog.variant || "default"}`}
    >
      <div className="service-entry-gate-dialog__body service-entry-gate-dialog__body--danger-confirm">
        <div className="service-entry-gate-dialog__header service-entry-gate-dialog__header--danger-confirm">
          <div
            className={`service-entry-gate-dialog__icon service-entry-gate-dialog__icon--${dialog.tone || "danger"}`}
          >
            {renderGateDialogIcon(dialog.tone || "danger")}
          </div>
          <div className="service-entry-gate-dialog__copy-block service-entry-gate-dialog__copy-block--danger-confirm">
            <h3 className="service-entry-gate-dialog__title">{dialog.title}</h3>
            <p className="service-entry-gate-dialog__description">
              {dialog.description}
            </p>
          </div>
        </div>
        <div className="service-entry-gate-dialog__actions service-entry-gate-dialog__actions--danger-confirm">
          {dialog.actions.map((action) => (
            <CustomButton
              key={action.key}
              variant={action.variant || "outline"}
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
