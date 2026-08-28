import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./index.less";
import {
  ActionFooter,
  CustomButton,
  CustomMessage,
  RelatedInfoCardGroup,
  RelatedInfoCardPanel,
} from "@/components/common";
import DocumentViewer from "@/components/common/DocumentViewer";
import { useHistory, useLocation } from "react-router-dom";
import {
  getEnquiryInfo,
  postConversation,
  putStatus,
  type EnquiryItem,
} from "@/services/complaints";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import BaseNumber from "@/assets/images/info_ticket_number.png";
import BaseStatus from "@/assets/images/info_status.png";
import BaseEnquiryType from "@/assets/images/info_enquiry_type.png";
import BaseSubmissionTime from "@/assets/images/info_submission_time.png";
import { Spin, Tooltip, Upload } from "antd";
import { PaperClipOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Upward from "@/assets/icons/Upward";
import avatar from "@/assets/images/avatar.png";
import { fileUpload } from "@/services/media";
import type { FileItem } from "@/components/common/FileUpload";
import type { RcFile } from "antd/lib/upload/interface";
import noData from "@/assets/images/no-data.png";
import { ImageBaseUrl } from "@/utils/url";
import CancelEnquiryModal from "../Complaints/components/CancelEnquiryModal";
import ReopenModal from "../Complaints/components/ReopenModal";
import { resolveApiEntityLabel } from "@/utils/bilingualDisplay";
import {
  enquiryApplication,
  type EnquiryApplicationData,
} from "@/services/refund";
import type { UploadRequestOption as RcCustomRequestOptions } from "rc-upload/lib/interface";
import { formatDisplayDateTime } from "@/utils/date";
// import { onFieldChange } from "@formily/core";

const renderLtrDateTime = (value?: string | null) => {
  const displayValue = value && value.trim() ? value : "-";

  return (
    <span className="complaints-ltr-datetime" dir="ltr">
      {displayValue}
    </span>
  );
};

const MAX_MESSAGE_LENGTH = 1000;
const CANCELLABLE_ENQUIRY_STATUS_IDS = [1, 2, 3, 4];

const getSendMessageErrorMessage = (_error: unknown, fallback: string) =>
  fallback;

const ComplaintsDetails: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language || "en").startsWith("ar");
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get("id");
  const scrollToMessage = searchParams.get("scrollToMessage") === "1";
  const editorRef = useRef<HTMLDivElement>(null);
  const pendingScrollAfterExpandRef = useRef(false);
  const [detail, setDetail] = useState<EnquiryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [reopenModalVisible, setReopenModalVisible] = useState(false);
  const enquiryId = useMemo(() => {
    if (!id) {
      return null;
    }
    const parsed = Number(id);
    return Number.isNaN(parsed) ? null : parsed;
  }, [id]);

  const fetchDetail = useCallback(async () => {
    if (enquiryId === null) {
      if (id) {
        CustomMessage.error(t("request.parameter.error"));
      }
      return;
    }
    setLoading(true);
    try {
      const response = await getEnquiryInfo(enquiryId);
      if (response?.data) {
        setDetail(response.data);
      } else {
        CustomMessage.error(t("request.operation.failed"));
      }
    } catch (error) {
      console.error("Failed to fetch enquiry info:", error);
      CustomMessage.error(t("request.operation.failed"));
    } finally {
      setLoading(false);
    }
  }, [enquiryId, id, t]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    setShowMore(false);
  }, [enquiryId]);

  const baseList = useMemo(() => {
    if (!detail) {
      return [];
    }
    const enquiryTypeName = detail.enquiryTypeObj
      ? resolveApiEntityLabel(isAr, detail.enquiryTypeObj) || "-"
      : "-";
    const statusNode =
      detail.enquiryStatusId !== undefined ? (
        <CustomStatusTag
          type="equiry"
          status={
            [1, 2, 3, 4].includes(detail.enquiryStatusId)
              ? 0
              : detail.enquiryStatusId
          }
        />
      ) : (
        "-"
      );
    return [
      {
        name: t("complaintsPage.detail.ticketNumber"),
        value: detail.enquiryNumber ?? "-",
        icon: BaseNumber,
      },
      {
        name: t("complaintsPage.detail.enquiryType"),
        value: enquiryTypeName,
        icon: BaseEnquiryType,
      },
      {
        name: t("complaintsPage.detail.submissionTime"),
        value: renderLtrDateTime(
          formatDisplayDateTime(detail.createdOn)
        ),
        icon: BaseSubmissionTime,
      },
      {
        name: t("complaintsPage.detail.status"),
        value: statusNode,
        icon: BaseStatus,
      },
    ];
  }, [detail, isAr, t]);

  const detailFields = useMemo(() => {
    const serviceName = detail?.serviceObj
      ? resolveApiEntityLabel(isAr, detail.serviceObj) || "-"
      : "-";
    const enquirySource =
      detail?.enquirySoruceObj != null
        ? resolveApiEntityLabel(isAr, detail.enquirySoruceObj) || "-"
        : "-";
    return [
      {
        key: "enquirySource" as const,
        label: t("complaintsPage.detail.enquirySource"),
        value: enquirySource,
      },
      {
        key: "applicationNumber" as const,
        label: t("complaintsPage.detail.applicationNumber"),
        value: detail?.applicationNo ? detail.applicationNo : "-",
      },
      {
        key: "serviceName" as const,
        label: t("complaintsPage.detail.serviceName"),
        value: serviceName,
      },
      {
        key: "description" as const,
        label: t("complaintsPage.detail.problemDescription"),
        value: detail?.description ? detail.description : "-",
      },
    ];
  }, [detail, isAr, t]);

  const infos = baseList.map((item) => (
    <div className="base_info_item" key={item.name}>
      <img src={item.icon} alt="" />
      <div className="info_content">
        <div className="info_name">{item.name}</div>
        <div className="info_value">{item.value}</div>
      </div>
    </div>
  ));

  const handleMessageChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(event.target.value);
    },
    []
  );

  const handleSendMessage = useCallback(async () => {
    if (sendLoading) {
      return;
    }
    const trimmedMessage = message.trim();
    const hasAttachments = fileList.length > 0;

    if (!trimmedMessage && !hasAttachments) {
      CustomMessage.error(t("complaintsPage.detail.emptyMessageError"));
      return;
    }
    if (enquiryId) {
      try {
        setSendLoading(true);
        await postConversation({
          enquiryId: enquiryId,
          messageContent: trimmedMessage,
          attachments: fileList.map((file) => file.url),
        });
        CustomMessage.success(t("complaintsPage.detail.messageSentSuccess"));
        setMessage("");
        setFileList([]);
        fetchDetail();
      } catch (error) {
        console.error("Failed to send complaint message:", error);
        CustomMessage.error(
          getSendMessageErrorMessage(error, t("request.operation.failed"))
        );
      } finally {
        setSendLoading(false);
      }
    }
  }, [message, fileList, t, enquiryId, fetchDetail, sendLoading]);

  async function handleUpload(options: RcCustomRequestOptions) {
    if (fileList.length === 3) {
      CustomMessage.error(t("complaintsPage.detail.fileUploadMax"));
      return;
    }
    const { file } = options;
    if (
      typeof file === "string" ||
      !("size" in file) ||
      !("name" in file)
    ) {
      CustomMessage.error(t("complaintsPage.detail.fileUploadInvalidFormat"));
      return;
    }
    if (file.size / 1024 / 1024 > 5) {
      CustomMessage.error(t("complaintsPage.detail.fileSizeExceeded"));
      return;
    }
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await fileUpload(formData);
      const newFile: FileItem = {
        url: res.data[0],
        name: file.name,
      };
      const newFileList = [...fileList, newFile];
      setFileList(newFileList);
      CustomMessage.success(t("complaintsPage.detail.fileUploadSuccess"));
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }

  const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
  const beforeUpload = (file: RcFile) => {
    const fileName = file.name;
    const fileExt = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    const isExtValid = allowedExtensions.includes(fileExt);

    if (!isExtValid) {
      CustomMessage.error(t("complaintsPage.detail.fileUploadInvalidFormat"));
    }
    return isExtValid;
  };

  const hasDetail = !!detail;
  const canCancelEnquiry =
    detail != null &&
    CANCELLABLE_ENQUIRY_STATUS_IDS.includes(detail.enquiryStatusId);
  const sendButtonDisabled =
    sendLoading || (!message.trim() && fileList.length === 0);
  const attachmentButtonDisabled = sendLoading || fileList.length >= 3;
  const hasMoreHistory = (detail?.enquiryConversations?.length ?? 0) > 3;
  const enquiryConversations = useMemo(() => {
    const conversations = detail?.enquiryConversations ?? [];
    if (showMore || conversations.length <= 3) {
      return conversations;
    }

    return conversations.slice(-3);
  }, [detail?.enquiryConversations, showMore]);

  function handleReopen() {
    setReopenModalVisible(true);
  }

  const handleShowMoreMessages = useCallback(() => {
    pendingScrollAfterExpandRef.current = true;
    setShowMore(true);
  }, []);

  const scrollToTarget = useCallback(() => {
    const target = editorRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const offsetTop = rect.top + window.pageYOffset - 60;

    window.scrollTo({
      top: offsetTop,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    if (detail && ![5, 6, 7].includes(detail.enquiryStatusId) && scrollToMessage) {
      scrollToTarget();
    }
  }, [detail, scrollToMessage, scrollToTarget]);

  useEffect(() => {
    if (!showMore || !pendingScrollAfterExpandRef.current) {
      return;
    }

    pendingScrollAfterExpandRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      scrollToTarget();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [showMore, scrollToTarget]);

  const onFieldChange = (key: string, value: string) => {
    if (key === "applicationNumber" && value) {
      enquiryApplication(value).then((res: { data: EnquiryApplicationData }) => {
        if (res.data) {
          console.log('res.data', res.data);
          history.push(`/my-requests/detail?id=${res.data.applicaitonId}`);
        }
      });
    }
  }

  return (
    <div className="detail-container">
      <Spin spinning={loading} tip={t("common.loading")}>
        {hasDetail ? (
          <>
            <div className="base_info">{infos}</div>
            <div className="detail-body">
              <div className="area-left">
                {/* Basic Information */}
                <div className="card-box">
                  <div className="card-title">
                    {t("complaintsPage.detail.basicInformation")}
                  </div>
                  <div className="detail-grid">
                    {detailFields.map((field) => (
                      <div key={field.key} className="detail-field">
                        <div className="field-label">{field.label}</div>
                        {/* <Tooltip title={field.value}> */}
                          <div
                            className={`field-value ${field.key === "applicationNumber"
                                ? "appnum-value"
                                : ""
                              } ${field.key === "description" || field.key === "serviceName" ? "description-value" : ""}`}
                            onClick={() => onFieldChange(field.key, field.value)}
                          >
                            {field.value}
                          </div>
                        {/* </Tooltip> */}
                      </div>
                    ))}
                    <div className="detail-field full-width">
                      <div className="field-label">
                        {t("complaintsPage.detail.attachment")}
                      </div>
                      <div className="materials-list">
                        {!!detail.attachmentUrls &&
                          detail.attachmentUrls.length > 0 ? (
                          detail.attachmentUrls.map((url) => (
                            <DocumentViewer
                              hasDelete={false}
                              hasDownload={true}
                              hasView={true}
                              fileName={url}
                              key={url}
                            />
                          ))
                        ) : (
                          <span className="material-name">
                            {t("complaintsPage.detail.noAttachment")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Ticket Communications */}
                <div className="card-box ticket-communications">
                  <div className="card-title">
                    {t("complaintsPage.detail.ticketCommunications")}
                  </div>
                  <div className="communications-body">
                    {detail?.enquiryConversations?.length > 0 && (
                      <div>
                        {hasMoreHistory && !showMore && (
                          <div
                            onClick={handleShowMoreMessages}
                            className="show-more-messages"
                          >
                            <div className="show-more-messages-icon">
                              <Upward />
                            </div>
                            <div className="show-more-message-text">
                              {t("complaintsPage.detail.showMoreMessages")}
                            </div>
                          </div>
                        )}
                        {enquiryConversations.map((item, index) => {
                          const conversationKey = `${item.userId || "unknown"}-${
                            item.submissionTime || index
                          }-${index}`;

                          return (
                            <React.Fragment key={conversationKey}>
                              <div className="communications-item-wrapper">
                                <div className="communications-item">
                                  <div className="communications-item-header">
                                    <div className="communications-item-icon">
                                      <img
                                        src={
                                          item.photoUrl
                                            ? ImageBaseUrl + item.photoUrl
                                            : avatar
                                        }
                                        alt=""
                                      />
                                    </div>
                                    <div className="communications-item-title">
                                      <div>
                                        {item.userName}
                                        {item.isCurrentUserProfile
                                          ? t("complaintsPage.detail.youSuffix")
                                          : ""}
                                      </div>
                                      <div className="communications-item-message">
                                        {renderLtrDateTime(
                                          formatDisplayDateTime(item.submissionTime)
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="communications-item-content">
                                    {item.messageContent}
                                  </div>
                                  <div className="communications-item-filelist">
                                    {item.attachements?.map((file) => {
                                      return (
                                        <div className="communications-item-file">
                                          <DocumentViewer
                                            hasDelete={false}
                                            hasDownload={true}
                                            hasView={true}
                                            fileName={file}
                                            key={file}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              {enquiryConversations.length - 1 > index && (
                                <div className="communications-item-divider-wrapper">
                                  <div className="communications-item-divider"></div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {hasMoreHistory && showMore && (
                          <div
                            onClick={() => setShowMore(false)}
                            className="show-more-messages show-more-messages--bottom"
                          >
                            <div className="show-more-messages-icon show-more-messages-icon--expanded">
                              <Upward />
                            </div>
                            <div className="show-more-message-text">
                              {t("complaintsPage.detail.collapseHistory")}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {(detail?.enquiryConversations?.length ?? 0) === 0 && (
                      <div className="communications-empty">
                        {t("complaintsPage.detail.messagesEmpty")}
                      </div>
                    )}
                    {![5, 6, 7].includes(detail.enquiryStatusId) && (
                      <>
                        <div className="communication-editor" ref={editorRef}>
                          <textarea
                            maxLength={MAX_MESSAGE_LENGTH}
                            className="message-textarea"
                            value={message}
                            onChange={handleMessageChange}
                            placeholder={t("formPlaceholders.common.leaveSupportMessage")}
                          />

                          {fileList.length > 0 && (
                            <div className="editor-files">
                              {fileList.map((file, index) => {
                                return (
                                  <div
                                    className="editor-footer-file"
                                    key={file.url}
                                  >
                                    <DocumentViewer
                                      className="complaints-detail-document-viewer"
                                      hasDelete={true}
                                      onDelete={() => {
                                        const newFileList = fileList.filter(
                                          (_, i) => i !== index
                                        );
                                        setFileList(newFileList);
                                      }}
                                      hasDownload={false}
                                      hasView={true}
                                      fileName={file.url}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div
                            className={`editor-footer ${
                              isAr ? "editor-footer--rtl" : ""
                            }`}
                          >
                            <div className="editor-counter">
                              {message.length}/{MAX_MESSAGE_LENGTH}
                            </div>
                            <div className="editor-footer-right">
                              <Upload
                                beforeUpload={beforeUpload}
                                maxCount={3}
                                showUploadList={false}
                                customRequest={handleUpload}
                                accept=".jpg,.jpeg,.png,.pdf"
                                disabled={attachmentButtonDisabled}
                              >
                                <button
                                  type="button"
                                  className={[
                                    "attachment-trigger",
                                    attachmentButtonDisabled
                                      ? "attachment-trigger--disabled"
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  disabled={attachmentButtonDisabled}
                                >
                                  <PaperClipOutlined className="attachment-icon" />
                                </button>
                              </Upload>
                              <button
                                type="button"
                                className={[
                                  "send-message-btn",
                                  sendButtonDisabled
                                    ? "send-message-btn--disabled"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onClick={handleSendMessage}
                                disabled={sendButtonDisabled}
                              >
                                {sendLoading
                                  ? t("common.loading")
                                  : t("complaintsPage.detail.send")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="area-right">
                {/* Linked Tickets */}
                <RelatedInfoCardGroup
                  className="complaints-linked-tickets"
                  title={t("complaintsPage.detail.linkedTickets")}
                >
                  <div className="ticket-card-wrapper">
                    {detail?.enquiryServices &&
                      detail?.enquiryServices.length > 0 ? (
                      detail.enquiryServices.map((item) => {
                        const enquiryNumber =
                          String(item.enquiryNumber ?? "-").trim() || "-";
                        return (
                          <RelatedInfoCardPanel
                            className="ticket-card"
                            key={item.enquiryId ?? item.enquiryNumber}
                            number={
                              <Tooltip title={enquiryNumber}>
                                <span className="complaints-linked-ticket-number">
                                  {enquiryNumber}
                                </span>
                              </Tooltip>
                            }
                            status={
                              item.enquiryStatusId !== undefined ? (
                                <CustomStatusTag
                                  type="equiry"
                                  status={[1, 2, 3, 4].includes(item.enquiryStatusId) ? 0 : item.enquiryStatusId}
                                />
                              ) : null
                            }
                            viewLabel={t("complaintsPage.detail.view")}
                            onView={() => {
                              history.push(
                                `/complaints/complaints-details?id=${item.enquiryId}`
                              );
                            }}
                          >
                            <div className="detail-field">
                              <div className="field-label">
                                {t("complaintsPage.detail.serviceName")}
                              </div>
                              <div className="field-value">
                                {item.serviceObj
                                  ? resolveApiEntityLabel(isAr, item.serviceObj) ||
                                  "-"
                                  : "-"}
                              </div>
                            </div>
                            <div className="detail-field">
                              <div className="field-label">
                                {t("complaintsPage.detail.submissionTime")}
                              </div>
                              <div className="field-value">
                                {renderLtrDateTime(
                                  formatDisplayDateTime(item.createdOn)
                                )}
                              </div>
                            </div>
                          </RelatedInfoCardPanel>
                        );
                      })
                    ) : (
                      <div className="no-data">
                        <img src={noData} alt="" />
                      </div>
                    )}
                  </div>
                </RelatedInfoCardGroup>
                {/* Reopen History */}
                {!!detail?.enquiryHistors?.length && (
                  <div className="card-box">
                    <div className="card-title">
                      {t("complaintsPage.detail.reopenHistory")}
                    </div>
                    {detail.enquiryHistors.map((item) => (
                      <div className="history-card">
                        <div className="complaints-reopen-history">
                          <div className="complaints-reopen-history-title">
                            #{item.number}
                          </div>
                          <div className="complaints-reopen-history-item">
                            <div className="complaints-reopen-history-item-field">
                              {t("complaintsPage.detail.reopenReason")}
                            </div>
                            <Tooltip
                              title={item.reopenReason}
                            >
                              <div className="complaints-reopen-history-item-value">
                                {item.reopenReason}
                              </div>
                            </Tooltip>
                          </div>
                          <div className="complaints-reopen-history-item">
                            <div className="complaints-reopen-history-item-field">
                              {t("complaintsPage.detail.reopenDate")}
                            </div>
                            <div className="complaints-reopen-history-item-value">
                              {renderLtrDateTime(
                                formatDisplayDateTime(item.createdOn)
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <CancelEnquiryModal
              onCancel={() => {
                setCancelModalVisible(false);
              }}
              onConfirm={async () => {
                if (detail) {
                  try {
                    await putStatus({
                      enquiryId: detail.id,
                      enquiryStatusId: 7,
                    });
                    CustomMessage.success(t("common.operationSuccess"));
                    setCancelModalVisible(false);
                    fetchDetail();
                  } catch (error) {
                    const statusCode =
                      (error as { statusCode?: number }).statusCode ??
                      (error as { response?: { data?: { statusCode?: number } } }).response?.data?.statusCode;

                    if (statusCode === 4205) {
                      setCancelModalVisible(false);
                      fetchDetail();
                      return;
                    }

                    throw error;
                  }
                }
              }}
              visible={cancelModalVisible}
              title={t("complaintsPage.cancelModal.title")}
              content={t("complaintsPage.cancelModal.content")}
            />
            <ActionFooter
              actions={
                <div className="btn-cancel-enquiry">
                  {canCancelEnquiry && (
                    <CustomButton
                      text={t("complaintsPage.detail.cancelEnquiry")}
                      variant="outline"
                      onClick={() => setCancelModalVisible(true)}
                    />
                  )}
                  <ReopenModal
                    visible={reopenModalVisible}
                    record={detail}
                    onCancel={() => {
                      setReopenModalVisible(false);
                      fetchDetail();
                    }}
                  />
                  {detail.enquiryStatusId === 5 && detail.reopenTimes < 3 && (
                    <CustomButton
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        handleReopen();
                      }}
                      text={t("complaintsPage.list.actions.reopen")}
                    />
                  )}
                </div>
              }
            />
          </>
        ) : (
          !loading && (
            <div className="empty-detail">
              {t("complaintsPage.detail.noDetail")}
            </div>
          )
        )}
      </Spin>
    </div>
  );
};

export default ComplaintsDetails;
