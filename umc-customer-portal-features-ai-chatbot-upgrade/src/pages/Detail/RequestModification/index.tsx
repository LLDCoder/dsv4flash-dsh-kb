import { type FC, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import DocumentViewer from "@/components/common/DocumentViewer";
import MyRequestWarning from "@/assets/images/MyRequestWarning.svg";
import SampleAttachmentJpg from "@/assets/images/FileJpg.svg";
import "./index.less";

const attachmentFiles = [
  {
    name: "File name.jpg",
    url: SampleAttachmentJpg,
  },
  {
    name: "File name.jpg",
    url: SampleAttachmentJpg,
  },
  {
    name: "File name.jpg",
    url: SampleAttachmentJpg,
  },
  {
    name: "File name.jpg",
    url: SampleAttachmentJpg,
  },
  {
    name: "File name.jpg",
    url: SampleAttachmentJpg,
  },
  {
    name: "File name.jpg",
    url: SampleAttachmentJpg,
  },
  {
    name: "File name.jpg",
    url: SampleAttachmentJpg,
  },
];

export interface approvalRecordProps {
  reason: string | null;
  notes: string | null;
}
export interface RequestDetailProps {
  reason?: string;
  notes?: string;
  applicationId: number;
  applicationNumber: string | null;
  statusEn: string | null;
  statusAr: string | null;
  createdOn: string; // date-time
  updatedOn: string | null; // date-time
  formData: string | null;
  approvalRecord?: approvalRecordProps | null;
}
const RequestModification: FC<{
  RequestDetail: RequestDetailProps;
  className?: string;
}> = ({ RequestDetail, className }) => {
  const { t, i18n } = useTranslation();
  const isRtl = Boolean(i18n.language?.startsWith("ar"));
  const reason = RequestDetail.approvalRecord?.reason || "-";
  const notes = RequestDetail.approvalRecord?.notes;
  const modificationContent = notes ? `${reason}; ${notes}` : reason;

  const reasonRef = useRef<HTMLDivElement>(null);
  const [showReasonTooltip, setShowReasonTooltip] = useState(false);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);

  const openAttachmentModal = () => {
    setAttachmentModalVisible(true);
  };

  const closeAttachmentModal = () => {
    setAttachmentModalVisible(false);
  };

  const handleAttachmentButtonKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAttachmentModal();
    }
  };

  useEffect(() => {
    const checkOverflow = (
      element: HTMLDivElement | null,
      setter: (value: boolean) => void,
    ) => {
      if (element) {
        const isOverflowing =
          element.scrollHeight > element.clientHeight ||
          element.scrollWidth > element.clientWidth;
        setter(isOverflowing);
      }
    };

    checkOverflow(reasonRef.current, setShowReasonTooltip);
  }, [modificationContent]);

  return (
    <>
      <div
        className={`request-modification ${className || ""}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <img src={MyRequestWarning} className="Request-Img" />
        <div className="request-modification__title">
          <div className="request-modification__title__text">
            {t("myRequestsPage.detail.requestModification.title")}
          </div>
          <Tooltip
            title={
              showReasonTooltip && modificationContent !== "-"
                ? modificationContent
                : undefined
            }
            placement="top"
          >
            <div ref={reasonRef} className="request-modification__content__text">
              <span>{modificationContent}</span>
            </div>
          </Tooltip>
        </div>
        {/* <div
          className="file-box"
          role="button"
          tabIndex={0}
          onClick={openAttachmentModal}
          onKeyDown={handleAttachmentButtonKeyDown}
        >
          {t("myRequestsPage.detail.requestModification.attachmentsButton")}
        </div> */}
      </div>

      <Modal
        visible={attachmentModalVisible}
        onCancel={closeAttachmentModal}
        footer={null}
        destroyOnClose
        centered
        width={768}
        title={t("myRequestsPage.detail.requestModification.attachmentListTitle")}
        wrapClassName={`request-modification-attachment-modal ${
          isRtl ? "request-modification-attachment-modal--rtl" : ""
        }`}
      >
        <div
          className="request-modification-attachment-list"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {attachmentFiles.length > 0 ? (
            attachmentFiles.map((file, index) => (
              <div
                className="request-modification-attachment-list__item"
                key={`${file.url}-${file.name}-${index}`}
              >
                <div className="request-modification-attachment-list__label">
                  {t("myRequestsPage.detail.requestModification.attachmentLabel")}
                </div>
                <DocumentViewer
                  className="request-modification-attachment-viewer"
                  fileName={file.name}
                  fileUrl={file.url}
                  fileType="JPG"
                  hasDelete={false}
                  hasDownload
                  hasView
                />
              </div>
            ))
          ) : (
            <div className="request-modification-attachment-list__empty">
              {t("myRequestsPage.detail.requestModification.emptyAttachments")}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
export default RequestModification;
