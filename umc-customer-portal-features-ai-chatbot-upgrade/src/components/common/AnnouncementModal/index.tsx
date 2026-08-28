import React from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import "./index.less";
import Warning2Icon from "@/assets/images/warning2.svg";
import { sanitizeRichTextHtml } from "@/utils/sanitizeRichTextHtml";

export interface AnnouncementModalProps {
  visible: boolean;
  headerLabel?: string;
  title: string;
  content: string;
  onClose: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  visible,
  headerLabel,
  title,
  content,
  onClose,
}) => {
  const { t } = useTranslation();
  const resolvedHeaderLabel =
    headerLabel ?? t("announcementModal.defaultHeaderLabel");
  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      closable
      centered
      width={640}
      maskClosable={false}
      className="announcement-modal"
    >
      <div className="announcement-container">
        <div className="announcement-header">
          <div className="announcement-icon">
            <img src={Warning2Icon} />
          </div>
          <span className="announcement-label">{resolvedHeaderLabel}</span>
        </div>
        <div className="announcement-body">
          <h2 className="announcement-title">{title}</h2>
          <div
            className="announcement-content"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichTextHtml(content),
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementModal;
