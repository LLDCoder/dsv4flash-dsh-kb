import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Spin, Upload, type UploadProps } from "antd";
import type { RcFile } from "antd/lib/upload/interface";
import type { UploadRequestError } from "rc-upload/lib/interface";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import {
  CustomButton,
  CustomMessage,
  RelatedInfoCard,
  type FileItem,
  type RelatedInfoCardStatusVariant,
} from "@/components/common";
import ActionFooter from "@/components/common/ActionFooter";
import DocumentViewer from "@/components/common/DocumentViewer";
import PreviewModal from "@/components/common/PreviewModal";
import { fileUpload } from "@/services/media";
import { ImageBaseUrl } from "@/utils/url";
import {
  cancelAppeal,
  getAppealDetail,
  getAppealReasons,
  getAppealViolationByNo,
  sendAppealMessage,
  unwrapApiData,
  type AppealCommunicationDto,
  type AppealDecisionAttachmentDto,
  type AppealDetailDto,
  type AppealViolationDetailDto,
} from "@/services/appeal";
import AED from "@/assets/icons/Aed";
import avatar from "@/assets/images/avatar.png";
import SummaryAppealNumberIcon from "@/assets/refund-detail-icons/summary-refund-number.svg";
import SummarySubmissionTimeIcon from "@/assets/refund-detail-icons/summary-time.svg";
import SummaryStatusIcon from "@/assets/refund-detail-icons/summary-status.svg";
import BannerSuccessIcon from "@/assets/violations-fines/appeal-banner-approved.svg";
import BannerErrorIcon from "@/assets/violations-fines/appeal-banner-rejected.svg";
import BannerAttachmentIcon from "@/assets/violations-fines/appeal-banner-attachment.svg";
import ComposerAttachmentIcon from "@/assets/refund-detail-icons/composer-attachment.svg";
import ChevronUpIcon from "@/assets/refund-detail-icons/chevron-up.svg";
import Upward from "@/assets/icons/Upward";
import {
  DATE_TIME_FORMAT,
  EMPTY_VALUE,
  formatAmount,
  formatTextValue,
  getReasonLabel,
  getRequestErrorMessage,
  getRouteId,
  makeAttachmentItems,
  mapAppealStatus,
  mapAppealReasonDtos,
  mapViolationStatus,
} from "../ViolationsFines/utils/utils";
import {
  VIOLATION_STATUS_ID,
  type AttachmentItem,
  type AppealReasonOption,
  type ViolationStatus,
} from "../ViolationsFines/utils/fixtures";
import CancelAppealModal from "../ViolationsFines/components/CancelAppealModal";
import AttachmentListModal from "../ViolationsFines/components/AttachmentListModal";
import { StatusTag } from "../ViolationsFines/components/PageShared";
import "./index.less";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_SIZE_MB = 5;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

interface AppealCommunicationViewModel {
  id: string;
  senderName: string;
  body: string;
  createdOn?: string;
  avatarSrc: string;
  attachments: Array<{ name: string; url: string }>;
}

type PreviewAttachment = {
  name: string;
  url: string;
};

type SummaryItemKey = "number" | "time" | "status";

const SUMMARY_ITEMS: Array<{
  key: SummaryItemKey;
  labelKey: string;
  icon: string;
}> = [
  {
    key: "number",
    labelKey: "violationsFinesPage.appealDetail.summary.appealNumber",
    icon: SummaryAppealNumberIcon,
  },
  {
    key: "time",
    labelKey: "violationsFinesPage.appealDetail.summary.submissionDate",
    icon: SummarySubmissionTimeIcon,
  },
  {
    key: "status",
    labelKey: "violationsFinesPage.appealDetail.summary.status",
    icon: SummaryStatusIcon,
  },
];

const formatDateTime = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === EMPTY_VALUE) {
    return EMPTY_VALUE;
  }

  const parsed = moment(normalized, [DATE_TIME_FORMAT, moment.ISO_8601], true);
  const date = parsed.isValid() ? parsed : moment(normalized);
  return date.isValid() ? date.format(DATE_TIME_FORMAT) : EMPTY_VALUE;
};

const formatText = (value?: string | number | null) => formatTextValue(value);

const getNonEmptyText = (value?: string | number | null) => {
  const normalized = String(value ?? "").trim();
  return normalized;
};

const resolveCommunicationAvatarSrc = (personalPhotoUrl?: string | null) => {
  const normalized = getNonEmptyText(personalPhotoUrl);

  if (!normalized) {
    return avatar;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("/")
  ) {
    return normalized;
  }

  return `${ImageBaseUrl}${normalized}`;
};

const getAttachmentFileName = (attachment: string) => {
  const normalized = getNonEmptyText(attachment);
  if (!normalized) {
    return EMPTY_VALUE;
  }

  const path = normalized.split(/[?#]/)[0];
  const fileName = path.split("/").filter(Boolean).pop();
  return fileName ? decodeURIComponent(fileName) : normalized;
};

const getAttachmentPaths = (
  attachments: Array<string | null | undefined> = [],
) => {
  const seen = new Set<string>();

  return attachments.reduce<string[]>((list, attachment) => {
    const normalized = String(attachment ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      return list;
    }

    seen.add(normalized);
    list.push(normalized);
    return list;
  }, []);
};

const mapDecisionAttachments = (
  attachments: AppealDecisionAttachmentDto[] | null | undefined,
) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment) => {
      const url = getNonEmptyText(attachment.fileUrl);
      if (!url) {
        return null;
      }

      const name =
        getNonEmptyText(attachment.fileName) || getAttachmentFileName(url);

      return {
        name,
        url,
      };
    })
    .filter(Boolean) as AttachmentItem[];
};

const mergeAttachmentItems = (...groups: AttachmentItem[][]) => {
  const seen = new Set<string>();

  return groups.flat().reduce<AttachmentItem[]>((list, item) => {
    const url = getNonEmptyText(item.url);
    if (!url || seen.has(url)) {
      return list;
    }

    seen.add(url);
    list.push({
      name: getNonEmptyText(item.name) || getAttachmentFileName(url),
      url,
    });
    return list;
  }, []);
};

const getViolationStatusById = (statusId?: number | string | null) => {
  const normalizedStatusId = Number(statusId);
  if (!Number.isFinite(normalizedStatusId)) {
    return undefined;
  }

  return (Object.keys(VIOLATION_STATUS_ID) as ViolationStatus[]).find(
    (key) => VIOLATION_STATUS_ID[key] === normalizedStatusId,
  );
};

const getRelatedStatusVariant = (status?: ViolationStatus): RelatedInfoCardStatusVariant => {
  if (status === "paid") {
    return "success";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  if (
    status === "pendingPayment" ||
    status === "underAppeal" ||
    status === "warningIssued"
  ) {
    return "warn";
  }

  return "neutral";
};

const normalizeAppealCommunications = (
  communications: AppealCommunicationDto[] | undefined,
): AppealCommunicationViewModel[] => {
  if (!Array.isArray(communications) || communications.length === 0) {
    return [];
  }

  return communications
    .map((item, index) => {
      const senderName = formatText(item.senderName);

      return {
        id: String(item.id ?? `${item.createdOn ?? "message"}-${index}`),
        senderName,
        body: formatText(item.body || item.note),
        createdOn: item.createdOn,
        avatarSrc: resolveCommunicationAvatarSrc(item.personalPhotoUrl),
        attachments: makeAttachmentItems(
          [item.attachmentUrl1, item.attachmentUrl2, item.attachmentUrl3],
          [item.attachmentName1, item.attachmentName2, item.attachmentName3],
        ),
      };
    })
    .sort((left, right) => {
      return (
        new Date(left.createdOn ?? 0).getTime() -
        new Date(right.createdOn ?? 0).getTime()
      );
    });
};

const AppealDetailPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const routeId = getRouteId(location.pathname);
  const [detail, setDetail] = useState<AppealDetailDto | null>(null);
  const [appealReasons, setAppealReasons] = useState<AppealReasonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelingAppeal, setCancelingAppeal] = useState(false);
  const [attachmentListVisible, setAttachmentListVisible] = useState(false);
  const [attachmentListFiles, setAttachmentListFiles] = useState<
    AttachmentItem[]
  >([]);
  const [previewAttachment, setPreviewAttachment] =
    useState<PreviewAttachment | null>(null);
  const [composerMessage, setComposerMessage] = useState("");
  const [composerFiles, setComposerFiles] = useState<FileItem[]>([]);
  const [sendLoading, setSendLoading] = useState(false);
  const [resultBannerNote, setResultBannerNote] = useState(EMPTY_VALUE);
  const [resultDecisionAttachments, setResultDecisionAttachments] = useState<
    AttachmentItem[]
  >([]);
  const [relatedViolationDetail, setRelatedViolationDetail] =
    useState<AppealViolationDetailDto | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!routeId) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getAppealDetail(routeId);
      const data = unwrapApiData(response);
      setDetail(data ?? null);
    } catch (error) {
      setDetail(null);
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.loadAppealDetailFailed"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [routeId, t]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    let cancelled = false;
    getAppealReasons()
      .then((response) => {
        if (!cancelled) {
          setAppealReasons(
            mapAppealReasonDtos(
              unwrapApiData(response),
              i18n.language.startsWith("ar"),
            ),
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAppealReasons([]);
          CustomMessage.error(
            getRequestErrorMessage(
              error,
              t("violationsFinesPage.messages.loadAppealReasonsFailed"),
            ),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language, t]);

  const appealStatus = useMemo(() => {
    if (!detail) {
      return undefined;
    }

    return mapAppealStatus(
      detail.statusId,
      `${detail.status ?? ""} ${detail.statusAr ?? ""}`,
    );
  }, [detail]);
  const isUnderReview =
    appealStatus === "processing" || appealStatus === "underReview";
  const isApproved = appealStatus === "approved";
  const isRejected = appealStatus === "rejected";
  const showBanner = Boolean(
    detail?.resultBanner && (isApproved || isRejected),
  );
  const showComposer = isUnderReview;
  const showCancelButton = isUnderReview;
  const detailsSectionBodyId = "appeal-detail-page-details-body";
  const detailId = detail?.id;
  const resultBannerDetailNote = detail?.resultBanner?.note;
  const relatedViolation = detail?.relatedViolation;
  const relatedViolationNo = getNonEmptyText(relatedViolation?.violationNo);
  const resultBannerLegacyAttachments = useMemo(
    () =>
      makeAttachmentItems(
        getAttachmentPaths([
          detail?.resultBanner?.attachmentUrl1,
          detail?.resultBanner?.attachmentUrl2,
          detail?.resultBanner?.attachmentUrl3,
        ]),
      ),
    [detail?.resultBanner],
  );
  const resultBannerAttachments = useMemo(
    () =>
      mergeAttachmentItems(
        resultBannerLegacyAttachments,
        resultDecisionAttachments,
      ),
    [resultBannerLegacyAttachments, resultDecisionAttachments],
  );
  useEffect(() => {
    const directNote = getNonEmptyText(resultBannerDetailNote);

    if (!showBanner || detailId === undefined) {
      setResultBannerNote(EMPTY_VALUE);
      setResultDecisionAttachments([]);
    } else {
      setResultBannerNote(directNote || EMPTY_VALUE);
      setResultDecisionAttachments([]);
    }

    if (!relatedViolationNo) {
      setRelatedViolationDetail(null);
      return;
    }

    let cancelled = false;
    const currentAppealId = Number(detailId);
    setRelatedViolationDetail(null);

    getAppealViolationByNo(relatedViolationNo)
      .then((response) => {
        if (cancelled) {
          return;
        }

        const violation = unwrapApiData(response) ?? null;
        setRelatedViolationDetail(violation);

        if (!showBanner || detailId === undefined) {
          return;
        }

        const associatedAppeal = violation?.associatedAppeal;
        const isSameAppeal =
          Number(associatedAppeal?.appealId) === currentAppealId;
        const finalDecisionNote = isSameAppeal
          ? getNonEmptyText(associatedAppeal?.decision?.finalDecisionNote)
          : "";
        const finalDecisionAttachments = isSameAppeal
          ? mapDecisionAttachments(associatedAppeal?.decision?.attachments)
          : [];

        setResultBannerNote(directNote || finalDecisionNote || EMPTY_VALUE);
        setResultDecisionAttachments(finalDecisionAttachments);
      })
      .catch(() => {
        if (!cancelled) {
          setRelatedViolationDetail(null);

          if (showBanner && detailId !== undefined) {
            setResultBannerNote(directNote || EMPTY_VALUE);
            setResultDecisionAttachments([]);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    detailId,
    relatedViolationNo,
    resultBannerDetailNote,
    showBanner,
  ]);
  const appealAttachments = useMemo(
    () =>
      makeAttachmentItems([
        detail?.attachmentUrl1,
        detail?.attachmentUrl2,
        detail?.attachmentUrl3,
      ]),
    [detail],
  );
  const normalizedCommunications = useMemo(
    () => normalizeAppealCommunications(detail?.communications),
    [detail?.communications],
  );
  const communications = useMemo(() => {
    if (!normalizedCommunications.length) {
      return [];
    }

    if (isHistoryExpanded) {
      return normalizedCommunications;
    }

    return [normalizedCommunications[normalizedCommunications.length - 1]];
  }, [isHistoryExpanded, normalizedCommunications]);
  const hasMoreHistory = normalizedCommunications.length > 1;
  const appealReason = getReasonLabel(detail?.reasonId, appealReasons);
  const relatedViolationStatus = useMemo(() => {
    const statusById = getViolationStatusById(relatedViolation?.statusId);
    if (statusById) {
      return statusById;
    }

    const statusLabel = String(relatedViolation?.status ?? "").trim();
    return statusLabel
      ? mapViolationStatus(statusLabel, relatedViolation?.fineAmount)
      : undefined;
  }, [relatedViolation]);
  const relatedViolationStatusLabel = useMemo(() => {
    if (!relatedViolationStatus) {
      return EMPTY_VALUE;
    }

    const statusId = VIOLATION_STATUS_ID[relatedViolationStatus];
    return t(`customStatusTag.violation.${statusId}`);
  }, [relatedViolationStatus, t]);
  const relatedViolationType = useMemo(() => {
    const isAr = i18n.language.startsWith("ar");
    const enrichedViolationType = isAr
      ? getNonEmptyText(relatedViolationDetail?.violationTypeAr) ||
        getNonEmptyText(relatedViolationDetail?.violationType)
      : getNonEmptyText(relatedViolationDetail?.violationType) ||
        getNonEmptyText(relatedViolationDetail?.violationTypeAr);

    return formatText(
      enrichedViolationType ||
        relatedViolation?.violationType ||
        relatedViolation?.violationTypeId,
    );
  }, [i18n.language, relatedViolation, relatedViolationDetail]);
  const summaryValues = {
    number: formatText(detail?.appealNo),
    time: formatDateTime(detail?.submissionTime),
    status: appealStatus ? (
      <StatusTag status={appealStatus} kind="appeal" />
    ) : (
      EMPTY_VALUE
    ),
  };

  const openAttachmentList = useCallback((attachments: AttachmentItem[]) => {
    setAttachmentListFiles(attachments);
    setAttachmentListVisible(true);
  }, []);

  const openResultBannerAttachments = useCallback(
    (attachments: AttachmentItem[]) => {
      if (attachments.length === 1) {
        const attachment = attachments[0];
        setPreviewAttachment({
          name: attachment.name,
          url: attachment.url,
        });
        return;
      }

      openAttachmentList(attachments);
    },
    [openAttachmentList],
  );

  const handleCancelAppeal = useCallback(async () => {
    if (!detail || cancelingAppeal) {
      return;
    }

    setCancelingAppeal(true);
    try {
      await cancelAppeal(detail.id);
      setCancelVisible(false);
      CustomMessage.success(
        t("violationsFinesPage.messages.cancelAppealSuccess"),
      );
      fetchDetail();
    } catch (error) {
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.cancelAppealFailed"),
        ),
      );
    } finally {
      setCancelingAppeal(false);
    }
  }, [cancelingAppeal, detail, fetchDetail, t]);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await fileUpload(formData);
      const fileUrl = response.data?.[0];
      if (!fileUrl) {
        throw new Error(t("violationsFinesPage.messages.uploadNoUrl"));
      }

      const nextFile: FileItem = {
        url: fileUrl,
        name:
          typeof file === "object" && file !== null && "name" in file
            ? String(file.name)
            : fileUrl,
      };
      setComposerFiles((prevFiles) => [...prevFiles, nextFile]);
      onSuccess?.(fileUrl);
      CustomMessage.success(t("violationsFinesPage.messages.uploadSuccess"));
    } catch (error) {
      onError?.(error as UploadRequestError);
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.uploadFailed"),
        ),
      );
    }
  };

  const beforeUpload = (file: RcFile) => {
    if (composerFiles.length >= MAX_ATTACHMENT_COUNT) {
      CustomMessage.error(
        t("violationsFinesPage.messages.maxFiles", {
          count: MAX_ATTACHMENT_COUNT,
        }),
      );
      return Upload.LIST_IGNORE;
    }

    const fileExtension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      CustomMessage.error(t("violationsFinesPage.messages.fileTypes"));
      return Upload.LIST_IGNORE;
    }

    if (file.size / 1024 / 1024 > MAX_ATTACHMENT_SIZE_MB) {
      CustomMessage.error(
        t("violationsFinesPage.messages.fileSize", {
          size: MAX_ATTACHMENT_SIZE_MB,
        }),
      );
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const handleSendMessage = useCallback(async () => {
    if (!detail || sendLoading) {
      return;
    }

    if (!composerMessage.trim()) {
      CustomMessage.error(t("violationsFinesPage.messages.messageRequired"));
      return;
    }

    setSendLoading(true);
    try {
      await sendAppealMessage(detail.id, {
        body: composerMessage.trim(),
        attachmentUrl1: composerFiles[0]?.url,
        attachmentUrl2: composerFiles[1]?.url,
        attachmentUrl3: composerFiles[2]?.url,
        attachmentName1: composerFiles[0]?.name,
        attachmentName2: composerFiles[1]?.name,
        attachmentName3: composerFiles[2]?.name,
      });
      CustomMessage.success(t("violationsFinesPage.messages.messageSent"));
      setComposerMessage("");
      setComposerFiles([]);
      fetchDetail();
    } catch (error) {
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.sendMessageFailed"),
        ),
      );
    } finally {
      setSendLoading(false);
    }
  }, [composerFiles, composerMessage, detail, fetchDetail, sendLoading, t]);

  const attachmentButtonDisabled =
    composerFiles.length >= MAX_ATTACHMENT_COUNT || sendLoading;
  const sendButtonDisabled = sendLoading || !composerMessage.trim();

  if (!detail && !loading) {
    return (
      <div className="appeal-detail-page">
        <div className="appeal-detail-page__empty-card">
          {t("violationsFinesPage.appealDetail.empty")}
        </div>
        <ActionFooter
          className="appeal-detail-page__footer"
          onBack={() =>
            history.push("/violations-fines?tab=appeals", {
              activeTab: "appeals",
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="appeal-detail-page">
      <Spin spinning={loading}>
        <div className="appeal-detail-page__overview-card">
          {showBanner ? (
            <div
              className={[
                "appeal-detail-page__banner",
                isRejected ? "appeal-detail-page__banner--rejected" : "",
                isApproved ? "appeal-detail-page__banner--approved" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="appeal-detail-page__banner-content">
                <img
                  className="appeal-detail-page__banner-icon"
                  src={isRejected ? BannerErrorIcon : BannerSuccessIcon}
                  alt=""
                />
                <div className="appeal-detail-page__banner-copy">
                  <div className="appeal-detail-page__banner-title">
                    {isRejected
                      ? t("violationsFinesPage.appealDetail.banner.rejected")
                      : t("violationsFinesPage.appealDetail.banner.approved")}
                  </div>
                  <div className="appeal-detail-page__banner-text">
                    {resultBannerNote}
                  </div>
                </div>
              </div>
              {resultBannerAttachments.length > 0 ? (
                <button
                  type="button"
                  className="appeal-detail-page__banner-action"
                  onClick={() =>
                    openResultBannerAttachments(resultBannerAttachments)
                  }
                >
                  <img
                    className="appeal-detail-page__banner-action-icon"
                    src={BannerAttachmentIcon}
                    alt=""
                  />
                  <span className="appeal-detail-page__banner-action-text">
                    {t("violationsFinesPage.common.attachment")}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="appeal-detail-page__summary">
            {SUMMARY_ITEMS.map((item) => (
              <div className="appeal-detail-page__summary-item" key={item.key}>
                <div className="appeal-detail-page__summary-icon-wrap">
                  <img
                    className="appeal-detail-page__summary-icon"
                    src={item.icon}
                    alt=""
                  />
                </div>
                <div className="appeal-detail-page__summary-copy">
                  <div className="appeal-detail-page__summary-label">
                    {t(item.labelKey)}
                  </div>
                  <div className="appeal-detail-page__summary-value">
                    {summaryValues[item.key]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="appeal-detail-page__content">
          <div className="appeal-detail-page__main">
            <div className="appeal-detail-page__details-card">
              <button
                type="button"
                className="appeal-detail-page__card-header appeal-detail-page__card-header--toggle"
                onClick={() => setIsDetailsExpanded((value) => !value)}
                aria-expanded={isDetailsExpanded}
                aria-controls={detailsSectionBodyId}
              >
                <span
                  className="appeal-detail-page__card-title"
                  role="heading"
                  aria-level={2}
                >
                  {t("violationsFinesPage.appealDetail.details.title")}
                </span>
                <span
                  className="appeal-detail-page__collapse-button"
                  aria-hidden="true"
                >
                  <img
                    className={[
                      "appeal-detail-page__collapse-icon",
                      isDetailsExpanded
                        ? "appeal-detail-page__collapse-icon--expanded"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    src={ChevronUpIcon}
                    alt=""
                  />
                </span>
              </button>

              {isDetailsExpanded ? (
                <div
                  className="appeal-detail-page__details-body"
                  id={detailsSectionBodyId}
                >
                  <div className="appeal-detail-page__section">
                    <div className="appeal-detail-page__field-label">
                      {t(
                        "violationsFinesPage.appealDetail.details.appealReason",
                      )}
                    </div>
                    <div className="appeal-detail-page__field-value">
                      {appealReason}
                    </div>
                  </div>

                  <div className="appeal-detail-page__section">
                    <div className="appeal-detail-page__field-label">
                      {t("violationsFinesPage.appealDetail.details.notes")}
                    </div>
                    <div className="appeal-detail-page__notes">
                      {formatText(detail?.reasonRemark)}
                    </div>
                  </div>

                  <div className="appeal-detail-page__section">
                    <div className="appeal-detail-page__field-label">
                      {t("violationsFinesPage.appealDetail.details.attachments")}
                    </div>
                    {appealAttachments.length > 0 ? (
                      <div className="appeal-detail-page__attachments-grid">
                        {appealAttachments.map((file, index) => (
                          <div
                            className="appeal-detail-page__attachment-item"
                            key={`${file.url}-${index}`}
                          >
                            <DocumentViewer
                              fileName={file.name}
                              fileUrl={file.url}
                              hasDelete={false}
                              hasDownload={true}
                              hasView={true}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="appeal-detail-page__field-value">
                        {EMPTY_VALUE}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="appeal-detail-page__communications-card">
              <div className="appeal-detail-page__card-header">
                <h2 className="appeal-detail-page__card-title">
                  {t("violationsFinesPage.appealDetail.communications.title")}
                </h2>
              </div>
              {hasMoreHistory && !isHistoryExpanded ? (
                <button
                  className="appeal-detail-page__show-more-messages"
                  type="button"
                  onClick={() => setIsHistoryExpanded(true)}
                >
                  <span className="appeal-detail-page__show-more-messages-icon">
                    <Upward />
                  </span>
                  <span className="appeal-detail-page__show-more-message-text">
                    {t("violationsFinesPage.appealDetail.communications.showMore")}
                  </span>
                </button>
              ) : null}

              {communications.length > 0 ? (
                <div className="appeal-detail-page__communications-list">
                  {communications.map((comment, index) => (
                    <div key={comment.id}>
                      <div className="appeal-detail-page__communications-item">
                        <div className="appeal-detail-page__communications-avatar-wrap">
                          <img
                            className="appeal-detail-page__communications-avatar"
                            src={comment.avatarSrc}
                            alt=""
                          />
                        </div>
                        <div className="appeal-detail-page__communications-content">
                          <div className="appeal-detail-page__communications-header">
                            <div className="appeal-detail-page__communications-name">
                              {comment.senderName}
                            </div>
                            <div className="appeal-detail-page__communications-time">
                              {formatDateTime(comment.createdOn)}
                            </div>
                          </div>
                          <div className="appeal-detail-page__communications-message">
                            {comment.body}
                          </div>
                          {comment.attachments.length > 0 ? (
                            <div className="appeal-detail-page__communications-attachments">
                              {comment.attachments.map(
                                (file, attachmentIndex) => (
                                  <div
                                    className="appeal-detail-page__attachment-item"
                                    key={`${comment.id}-${file.url}-${attachmentIndex}`}
                                  >
                                    <DocumentViewer
                                      fileName={file.name}
                                      fileUrl={file.url}
                                      hasDelete={false}
                                      hasDownload={true}
                                      hasView={true}
                                    />
                                  </div>
                                ),
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {index < communications.length - 1 ? (
                        <div className="appeal-detail-page__communications-divider" />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="appeal-detail-page__communications-empty">
                  {t("violationsFinesPage.appealDetail.communications.empty")}
                </div>
              )}

              {showComposer ? (
                <div className="appeal-detail-page__composer">
                  <textarea
                    className="appeal-detail-page__composer-textarea"
                    value={composerMessage}
                    maxLength={MAX_MESSAGE_LENGTH}
                    onChange={(event) => setComposerMessage(event.target.value)}
                    placeholder={t("formPlaceholders.common.leaveSupportMessage")}
                  />

                  {composerFiles.length > 0 ? (
                    <div className="appeal-detail-page__composer-files">
                      {composerFiles.map((file, index) => (
                        <div
                          className="appeal-detail-page__attachment-item"
                          key={`${file.url}-${index}`}
                        >
                          <DocumentViewer
                            fileName={file.name}
                            fileUrl={file.url}
                            hasDelete={true}
                            hasDownload={false}
                            hasView={true}
                            onDelete={() => {
                              setComposerFiles((prevFiles) =>
                                prevFiles.filter(
                                  (_, fileIndex) => fileIndex !== index,
                                ),
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="appeal-detail-page__composer-footer">
                    <div className="appeal-detail-page__composer-counter">
                      {composerMessage.length}/{MAX_MESSAGE_LENGTH}
                    </div>
                    <div className="appeal-detail-page__composer-actions">
                      <Upload
                        beforeUpload={beforeUpload}
                        showUploadList={false}
                        customRequest={handleUpload}
                        accept=".jpg,.jpeg,.png,.pdf"
                        disabled={attachmentButtonDisabled}
                      >
                        <button
                          type="button"
                          className={[
                            "appeal-detail-page__composer-attachment",
                            attachmentButtonDisabled
                              ? "appeal-detail-page__composer-attachment--disabled"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={attachmentButtonDisabled}
                        >
                          <img
                            className="appeal-detail-page__composer-attachment-icon"
                            src={ComposerAttachmentIcon}
                            alt=""
                          />
                        </button>
                      </Upload>
                      <button
                        type="button"
                        className={[
                          "appeal-detail-page__composer-send",
                          sendButtonDisabled
                            ? "appeal-detail-page__composer-send--disabled"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={sendButtonDisabled}
                        onClick={handleSendMessage}
                      >
                        <span className="appeal-detail-page__composer-send-text">
                          {sendLoading
                            ? t("violationsFinesPage.common.sending")
                            : t("violationsFinesPage.common.send")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="appeal-detail-page__sidebar">
            <RelatedInfoCard
              title={t("violationsFinesPage.appealDetail.related.title")}
              number={formatText(relatedViolation?.violationNo)}
              statusLabel={relatedViolationStatusLabel === EMPTY_VALUE ? undefined : relatedViolationStatusLabel}
              statusVariant={getRelatedStatusVariant(relatedViolationStatus)}
              viewLabel={t("violationsFinesPage.appealDetail.related.view")}
              onView={
                relatedViolationNo
                  ? () =>
                      history.push(
                        `/violations-fines/violations/${encodeURIComponent(relatedViolationNo)}`,
                      )
                  : undefined
              }
            >
              <div className="appeal-detail-page__related-fields">
                <div className="appeal-detail-page__related-field">
                  <div className="appeal-detail-page__field-label">
                    {t("violationsFinesPage.appealDetail.related.violationType")}
                  </div>
                  <div className="appeal-detail-page__field-value">
                    {relatedViolationType}
                  </div>
                </div>
                <div className="appeal-detail-page__related-field">
                  <div className="appeal-detail-page__field-label">
                    {t("violationsFinesPage.appealDetail.related.violator")}
                  </div>
                  <div className="appeal-detail-page__field-value">
                    {formatText(relatedViolation?.violatorName)}
                  </div>
                </div>
                <div className="appeal-detail-page__related-field">
                  <div className="appeal-detail-page__field-label">
                    {t("violationsFinesPage.appealDetail.related.fineAmount")}
                  </div>
                  <div className="appeal-detail-page__field-value">
                    {relatedViolation?.fineAmount != null && <AED />}
                    <span>{formatAmount(relatedViolation?.fineAmount, false)}</span>
                  </div>
                </div>
              </div>
            </RelatedInfoCard>
          </aside>
        </div>

        <AttachmentListModal
          visible={attachmentListVisible}
          attachments={attachmentListFiles}
          onCancel={() => setAttachmentListVisible(false)}
        />

        <PreviewModal
          visible={Boolean(previewAttachment)}
          fileData={{
            name: previewAttachment?.name ?? "",
            url: previewAttachment?.url ?? "",
          }}
          onCancel={() => setPreviewAttachment(null)}
        />

        <CancelAppealModal
          visible={cancelVisible}
          onCancel={() => {
            if (!cancelingAppeal) {
              setCancelVisible(false);
            }
          }}
          onConfirm={handleCancelAppeal}
          loading={cancelingAppeal}
        />

        <ActionFooter
          className="appeal-detail-page__footer"
          onBack={() =>
            history.push("/violations-fines?tab=appeals", {
              activeTab: "appeals",
            })
          }
          actions={
            showCancelButton ? (
              <CustomButton
                text={t("violationsFinesPage.common.cancel")}
                variant="primary"
                onClick={() => setCancelVisible(true)}
              />
            ) : null
          }
        />
      </Spin>
    </div>
  );
};

export default AppealDetailPage;
