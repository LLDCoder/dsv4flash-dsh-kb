import { Modal } from "antd";
import SimpleBar from "@/components/SimpleBar";
import { CustomButton } from "@/components/common";
import { renderGateDialogIcon } from "./dialogShared";
import type { ServiceEntryGateMessageDialog } from "./types";
import "./service-entry-gate.less";

interface ServiceEntryGateModalProps {
  visible: boolean;
  dialog: ServiceEntryGateMessageDialog;
  onAction: (actionKey: string) => void;
  onClose: () => void;
}

export default function ServiceEntryGateModal({
  visible,
  dialog,
  onAction,
  onClose,
}: ServiceEntryGateModalProps) {
  const isBlockerCard = dialog.variant === "service-unavailable";
  const isRequirementMissing = dialog.variant === "requirement-missing";
  const resolvedTone = dialog.tone || "warning";

  const renderDescription = () => {
    const highlight = dialog.descriptionHighlightText;
    if (!highlight || !dialog.description.includes(highlight)) {
      return dialog.description;
    }
    const index = dialog.description.indexOf(highlight);
    return (
      <>
        {dialog.description.slice(0, index)}
        <strong className="service-entry-gate-dialog__description-highlight">
          {highlight}
        </strong>
        {dialog.description.slice(index + highlight.length)}
      </>
    );
  };

  const renderActions = (className = "") => (
    <div
      className={`service-entry-gate-dialog__actions ${isBlockerCard ? "service-entry-gate-dialog__actions--blocker-card" : "service-entry-gate-dialog__actions--message"} ${dialog.actions.length === 1 ? "service-entry-gate-dialog__actions--single" : ""} ${className}`}
    >
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
  );

  const renderOrderedItems = () => {
    if (!dialog.orderedItems?.length) {
      return null;
    }

    const panel = (
      <div className="service-entry-gate-dialog__panel">
        <ol className="service-entry-gate-dialog__ordered-list">
          {dialog.orderedItems.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ol>
      </div>
    );

    return isRequirementMissing ? (
      <SimpleBar className="service-entry-gate-dialog__requirements-scroll">
        {panel}
      </SimpleBar>
    ) : (
      panel
    );
  };

  return (
    <Modal
      visible={visible}
      footer={
        isRequirementMissing
          ? renderActions("service-entry-gate-dialog__actions--footer")
          : null
      }
      centered
      getContainer={() => document.body}
      closable={dialog.closeable ?? true}
      onCancel={onClose}
      width={dialog.width ?? 760}
      className={`service-entry-gate-dialog service-entry-gate-dialog--message service-entry-gate-dialog--${dialog.variant || "default"} ${isBlockerCard ? "service-entry-gate-dialog--blocker-card" : ""}`}
    >
      <div
        className={`service-entry-gate-dialog__body service-entry-gate-dialog__body--message ${isBlockerCard ? "service-entry-gate-dialog__body--blocker-card" : ""}`}
      >
        <div
          className={`service-entry-gate-dialog__header ${isBlockerCard ? "service-entry-gate-dialog__header--blocker-card" : "service-entry-gate-dialog__header--message"}`}
        >
          <div
            className={`service-entry-gate-dialog__icon service-entry-gate-dialog__icon--${resolvedTone}`}
          >
            {renderGateDialogIcon(resolvedTone)}
          </div>
          <div
            className={
              isBlockerCard
                ? "service-entry-gate-dialog__copy-block service-entry-gate-dialog__copy-block--blocker-card"
                : "service-entry-gate-dialog__copy-block service-entry-gate-dialog__copy-block--message"
            }
          >
            <h3 className="service-entry-gate-dialog__title">{dialog.title}</h3>
            <p className="service-entry-gate-dialog__description">
              {renderDescription()}
            </p>
          </div>
        </div>
        {dialog.bulletItems?.length ? (
          <ul className="service-entry-gate-dialog__bullet-list">
            {dialog.bulletItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {renderOrderedItems()}
        {dialog.link ? (
          <div className="service-entry-gate-dialog__panel">
            <a
              className="service-entry-gate-dialog__panel-link"
              href={dialog.link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dialog.link.label}
            </a>
          </div>
        ) : null}
        {dialog.helperText ? (
          <div className="service-entry-gate-dialog__helper">
            {dialog.helperText}
          </div>
        ) : null}
        {isRequirementMissing ? null : renderActions()}
      </div>
    </Modal>
  );
}
