import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import DocumentViewer from "@/components/common/DocumentViewer";
import type { AttachmentItem } from "../utils/fixtures";

const AttachmentListModal = ({
  visible,
  attachments,
  onCancel,
}: {
  visible: boolean;
  attachments: AttachmentItem[];
  onCancel: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      footer={null}
      title={t("violationsFinesPage.appealDetail.attachmentModalTitle")}
      onCancel={onCancel}
      wrapClassName="violations-fines-attachment-modal"
      destroyOnClose
      centered
    >
      <div className="violations-fines-attachment-list">
        {attachments.map((file, index) => (
          <div className="violations-fines-attachment-list__column" key={`${file.name}-${index}`}>
            <h3 className="violations-fines-attachment-list__title">
              {t("violationsFinesPage.common.attachment")} {index + 1}
            </h3>
            <DocumentViewer
              className="violations-fines-attachment-viewer"
              fileName={file.name || file.url}
              fileUrl={file.url || file.name}
              hasDelete={false}
              hasDownload
              hasView
            />
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default AttachmentListModal;
