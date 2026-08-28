import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.less";
import {
  CustomButton,
  CustomMessage,
  RelatedInfoCard,
  type FileItem,
  type RelatedInfoCardStatusVariant,
} from "@/components/common";
import ActionFooter from "@/components/common/ActionFooter";
import DocumentViewer from "@/components/common/DocumentViewer";
import { useHistory, useLocation } from "react-router-dom";
import {
  enquiryApplication,
  postRefundConversation,
  refundDetail,
  refundEdit,
  type RefundComment,
  type RefundDetailResponse,
} from "@/services/refund";
import ComfirmModal from "@/components/common/ComfirmModal";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import { resolveRefundStatus } from "@/utils/refundStatus";
import { fileUpload } from "@/services/media";
import { ImageBaseUrl } from "@/utils/url";
import moment from "moment";
import { Modal, Spin, Upload, type UploadProps } from "antd";
import type { RcFile } from "antd/lib/upload/interface";
import type { UploadRequestError } from "rc-upload/lib/interface";
import AED from "@/assets/icons/Aed";
import avatar from "@/assets/images/avatar.png";
import SummaryRefundNumberIcon from "@/assets/refund-detail-icons/summary-refund-number.svg";
import SummaryCategoryIcon from "@/assets/refund-detail-icons/summary-category.svg";
import SummaryTimeIcon from "@/assets/refund-detail-icons/summary-time.svg";
import SummaryStatusIcon from "@/assets/refund-detail-icons/summary-status.svg";
import BannerSuccessIcon from "@/assets/refund-detail-icons/banner-success.svg";
import BannerErrorIcon from "@/assets/refund-detail-icons/banner-error.svg";
import BannerAttachmentIcon from "@/assets/refund-detail-icons/banner-attachment.svg";
import ComposerAttachmentIcon from "@/assets/refund-detail-icons/composer-attachment.svg";
import ChevronUpIcon from "@/assets/refund-detail-icons/chevron-up.svg";
import Upward from "@/assets/icons/Upward";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

interface RefundConversationViewModel {
  id: string;
  message: string;
  attachments: string[];
  userName: string;
  photoUrl?: string;
  createdOn?: string;
}

interface RelatedCardData {
  title: string;
  number: string;
  statusLabel: string;
  statusVariant: RelatedInfoCardStatusVariant;
  fields: Array<{ label: string; value: string }>;
  onView?: () => void | Promise<void>;
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_SIZE_MB = 5;
const CANCELLED_STATUS_ID = 7;

const SUMMARY_ICON_BY_KEY = {
  number: SummaryRefundNumberIcon,
  category: SummaryCategoryIcon,
  time: SummaryTimeIcon,
  status: SummaryStatusIcon,
} as const;

type SummaryItemKey = keyof typeof SUMMARY_ICON_BY_KEY;

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

const formatDateTime = (value?: string | null) =>
  value ? moment(value).format("DD/MM/YYYY HH:mm:ss") : "-";

const formatText = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  "master card": "Mastercard",
  amex: "American Express",
  "american express": "American Express",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
  "union pay": "UnionPay",
};

const maskCardNumber = (cardNumber: string) => {
  const digits = cardNumber.replace(/\D/g, "");
  // Keep the format consistent with the backend-masked value: show the leading
  // 6 and trailing 4 digits, mask everything in between. Fall back gracefully
  // when the number is too short to keep both segments visible.
  if (digits.length <= 4) return digits;
  if (digits.length <= 10) {
    return `${digits.slice(0, -4).replace(/\d/g, "*")}${digits.slice(-4)}`;
  }
  const head = digits.slice(0, 6);
  const tail = digits.slice(-4);
  const masked = "*".repeat(digits.length - 10);
  return `${head}${masked}${tail}`;
};

const maskCardInformation = (value?: string | null) => {
  const text = formatText(value);
  if (text === "-") {
    return text;
  }

  const brandMatch = text.match(
    /\b(visa|mastercard|master card|amex|american express|discover|jcb|unionpay|union pay)\b/i,
  );
  // Keep the backend-provided masked card number as-is (e.g. 550000******5559).
  const cardNumberMatch = text.match(/[\d*]*\*[\d*]*|\d{4,}/);

  if (!cardNumberMatch) {
    return "****";
  }

  const cardNumber = cardNumberMatch[0];
  // Backend already masks the number; only fall back to masking when a raw
  // unmasked number is received. Keep the leading and trailing digits visible
  // and mask the middle part to stay consistent (e.g. 550000******5559).
  const displayNumber = cardNumber.includes("*")
    ? cardNumber
    : maskCardNumber(cardNumber);

  const prefixParts = text
    .slice(0, cardNumberMatch.index)
    .split(/[-_/|]+/)
    .map((part) => part.trim())
    .filter((part) => /[a-z]/i.test(part));

  const brand = brandMatch
    ? CARD_BRAND_LABELS[brandMatch[1].toLowerCase()]
    : prefixParts[0] || "Visa";

  return [brand, displayNumber].filter(Boolean).join(" ");
};

const maskPaymentDescription = (
  description?: string | null,
  cardInfo?: string | null,
) => {
  const text = formatText(description);
  const rawCardInfo = formatText(cardInfo);

  if (text === "-" || rawCardInfo === "-") {
    return text;
  }

  return text.split(rawCardInfo).join(maskCardInformation(cardInfo));
};

const formatAmount = (
  value?: number | string | null,
  localeTag?: string,
) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }

  const locale = localeTag === "ar" ? "ar-AE" : "en-US";
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getErrorMessage = (_error: unknown, fallbackMessage: string) =>
  fallbackMessage;

const getAttachmentPaths = (
  attachments: Array<string | null | undefined> = [],
) => {
  const seenAttachments = new Set<string>();

  return attachments.reduce<string[]>((list, attachment) => {
    const normalizedAttachment = String(attachment ?? "").trim();
    if (!normalizedAttachment || seenAttachments.has(normalizedAttachment)) {
      return list;
    }

    seenAttachments.add(normalizedAttachment);
    list.push(normalizedAttachment);
    return list;
  }, []);
};

const getCategoryLabel = (
  detail: RefundDetailResponse | null | undefined,
  isAr: boolean,
  translate: TFunction,
) => {
  if (!detail) {
    return "-";
  }

  if (
    detail.categoryObj?.nameEn != null ||
    detail.categoryObj?.nameAr != null
  ) {
    const v = preferLocalizedEnAr(
      isAr,
      detail.categoryObj?.nameEn,
      detail.categoryObj?.nameAr,
    );
    if (v) return v;
  }

  if (detail.categoryId === 1) {
    return String(translate("refundPage.category.fineRefund"));
  }

  if (detail.categoryId === 2) {
    return String(translate("refundPage.category.applicationRefund"));
  }

  const categoryName = detail.categoryObj?.nameEn ?? "";
  if (categoryName.toLowerCase().includes("fine")) {
    return String(translate("refundPage.category.fineRefund"));
  }

  if (categoryName.toLowerCase().includes("application")) {
    return String(translate("refundPage.category.applicationRefund"));
  }

  return formatText(categoryName);
};

const getRelatedStatusVariant = (statusLabel?: string): RelatedInfoCardStatusVariant => {
  const normalizedStatus = String(statusLabel ?? "")
    .trim()
    .toLowerCase();

  if (
    normalizedStatus.includes("completed") ||
    normalizedStatus.includes("paid") ||
    normalizedStatus.includes("approved") ||
    normalizedStatus.includes("refunded") ||
    normalizedStatus.includes("pending refund")
  ) {
    return "success";
  }

  if (
    normalizedStatus.includes("reject") ||
    normalizedStatus.includes("failed")
  ) {
    return "error";
  }

  if (normalizedStatus.includes("cancel")) {
    return "cancelled";
  }

  if (
    normalizedStatus.includes("review") ||
    normalizedStatus.includes("pending")
  ) {
    return "warn";
  }

  return "neutral";
};

const isCustomerComment = (comment: RefundComment) => {
  if (comment.roleTypeId === 1) {
    return true;
  }

  if (comment.isCurrentProfile || comment.isCurrentUserProfile) {
    return true;
  }

  return false;
};

const getBannerComment = (detail?: RefundDetailResponse | null) => {
  if (!detail?.commentDetails?.length) {
    return null;
  }

  const reversedComments = [...detail.commentDetails].reverse();
  const latestExternalComment = reversedComments.find(
    (comment) => !isCustomerComment(comment),
  );

  return latestExternalComment ?? reversedComments[0] ?? null;
};

const getCommentUserName = (comment: RefundComment, youLabel: string) => {
  const userName = formatText(comment.userName);
  const isCurrentUser =
    comment.isCurrentProfile || comment.isCurrentUserProfile;

  if (isCurrentUser && userName !== "-") {
    return `${userName} (${youLabel})`;
  }

  return userName;
};

const normalizeRefundComments = (
  comments: RefundComment[] | undefined,
  youLabel: string,
): RefundConversationViewModel[] => {
  if (!Array.isArray(comments) || comments.length === 0) {
    return [];
  }

  return comments
    .map((comment, index) => ({
      id: String(
        comment.commentId ?? `${comment.createdOn ?? "comment"}-${index}`,
      ),
      message: formatText(comment.messageContent),
      attachments: getAttachmentPaths(comment.attachments ?? []),
      userName: getCommentUserName(comment, youLabel),
      photoUrl: comment.photoUrl,
      createdOn: comment.createdOn,
    }))
    .sort((left, right) => {
      return (
        new Date(left.createdOn ?? 0).getTime() -
        new Date(right.createdOn ?? 0).getTime()
      );
    });
};

const RefundDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const localeTag = i18n.language.startsWith("ar") ? "ar" : "en";
  const history = useHistory();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const refundId = searchParams.get("id");
  const [detail, setDetail] = useState<RefundDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [attachmentListVisible, setAttachmentListVisible] = useState(false);
  const [attachmentListFiles, setAttachmentListFiles] = useState<string[]>([]);
  const [composerMessage, setComposerMessage] = useState("");
  const [composerFiles, setComposerFiles] = useState<FileItem[]>([]);
  const [sendLoading, setSendLoading] = useState(false);

  const youLabel = t("refundPage.detail.communications.you");

  const resolvedRefundStatus = useMemo(() => {
    return resolveRefundStatus({
      statusId: detail?.statusId,
      statusName: detail?.status,
      statusObjName: detail?.statusObj?.nameEn,
    });
  }, [detail?.status, detail?.statusId, detail?.statusObj?.nameEn]);
  const categoryLabel = getCategoryLabel(detail, isAr, t);
  const isFineRefund = detail?.categoryId === 1;
  const isUnderReview = resolvedRefundStatus.key === "under_review";
  const isRejected = resolvedRefundStatus.key === "rejected";
  const isPendingRefund = resolvedRefundStatus.key === "pending_refund";
  const showBanner = isRejected || isPendingRefund;
  const showComposer = isUnderReview;
  const showCancelButton = isUnderReview;

  const rootClassName = [
    "refund-detail-page",
    isRejected ? "refund-detail-page--rejected" : "",
    isPendingRefund ? "refund-detail-page--pending-refund" : "",
    isFineRefund
      ? "refund-detail-page--fine"
      : "refund-detail-page--application",
  ]
    .filter(Boolean)
    .join(" ");

  const fetchDetail = useCallback(async () => {
    if (!refundId) {
      return;
    }

    setLoading(true);
    try {
      const response = await refundDetail(refundId);
      if (!response?.data) {
        setDetail(null);
        CustomMessage.error(t("refundPage.detail.messages.loadFailed"));
        return;
      }

      setDetail(response.data ?? null);
    } catch (error) {
      console.error("Failed to load refund detail:", error);
      setDetail(null);
      CustomMessage.error(
        getErrorMessage(error, t("refundPage.detail.messages.loadFailed")),
      );
    } finally {
      setLoading(false);
    }
  }, [refundId, t]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const bannerComment = useMemo(() => getBannerComment(detail), [detail]);
  const rejectedBannerTitle = formatText(detail?.rejectedReason);
  const bannerTitle = isRejected
    ? rejectedBannerTitle === "-"
      ? t("refundPage.detail.banner.refundRejected")
      : rejectedBannerTitle
    : t("refundPage.detail.banner.pendingRefund");
  const bannerIcon = isRejected ? BannerErrorIcon : BannerSuccessIcon;
  const bannerMessage = useMemo(() => {
    return String(bannerComment?.messageContent ?? "").trim();
  }, [bannerComment?.messageContent]);

  const userAttachments = useMemo(() => {
    return getAttachmentPaths([
      detail?.attachmentsURL01,
      detail?.attachmentsURL02,
      detail?.attachmentsURL03,
    ]);
  }, [detail]);

  const normalizedComments = useMemo(
    () => normalizeRefundComments(detail?.commentDetails, youLabel),
    [detail?.commentDetails, youLabel],
  );

  const communications = useMemo(() => {
    if (!normalizedComments.length) {
      return [];
    }

    if (isHistoryExpanded) {
      return normalizedComments;
    }

    return [normalizedComments[normalizedComments.length - 1]];
  }, [isHistoryExpanded, normalizedComments]);

  const hasMoreHistory = normalizedComments.length > 1;
  const bannerAttachments = useMemo(
    () => getAttachmentPaths(bannerComment?.attachments ?? []),
    [bannerComment],
  );

  const summaryItems = useMemo(
    () =>
      (["number", "category", "time", "status"] as SummaryItemKey[]).map(
        (key) => ({
          key,
          label:
            key === "number"
              ? t("refundPage.detail.summary.refundNumber")
              : key === "category"
                ? t("refundPage.detail.summary.refundCategory")
                : key === "time"
                  ? t("refundPage.detail.summary.submissionTime")
                  : t("refundPage.detail.summary.status"),
          icon: SUMMARY_ICON_BY_KEY[key],
        }),
      ),
    [t],
  );

  const summaryValues = useMemo(() => {
    return {
      number: formatText(detail?.applicationNumber),
      category: categoryLabel,
      time: formatDateTime(detail?.createdOn),
      status: detail?.statusId != null ? (
        <CustomStatusTag status={detail.statusId} />
      ) : (
        <CustomStatusTag status={resolvedRefundStatus.label} />
      ),
    };
  }, [
    categoryLabel,
    detail?.applicationNumber,
    detail?.createdOn,
    detail?.statusId,
    resolvedRefundStatus.label,
  ]);

  const detailTitle = isFineRefund
    ? t("refundPage.detail.title.fineInformation")
    : t("refundPage.detail.title.applicationInformation");
  const paymentInfo = detail?.paymentInfo;
  const detailsSectionBodyId = "refund-detail-page-details-body";

  const toggleDetailsExpanded = useCallback(() => {
    setIsDetailsExpanded((prevValue) => !prevValue);
  }, []);

  const detailFields = useMemo(() => {
    const reasonDisplay = preferLocalizedEnAr(
      isAr,
      detail?.reasonObj?.nameEn,
      detail?.reasonObj?.nameAr,
    );
    return [
      {
        label: t("refundPage.detail.fields.refundCategory"),
        value: categoryLabel,
      },
      {
        label: isFineRefund
          ? t("refundPage.detail.fields.fineNumber")
          : t("refundPage.detail.fields.applicationNumber"),
        value: formatText(detail?.referenceNumber),
        isHighlight: true,
      },
      {
        label: t("refundPage.detail.fields.refundReason"),
        value: reasonDisplay || "-",
      },
      {
        label: t("refundPage.detail.fields.refundAmount"),
        value: formatAmount(detail?.amount, localeTag),
        isAmount: true,
      },
    ];
  }, [categoryLabel, detail, isAr, isFineRefund, localeTag, t]);

  const relatedPaymentFields = useMemo(() => {
    return [
      {
        label: t("refundPage.detail.payment.transactionNumber"),
        value: formatText(paymentInfo?.transactionNo),
      },
      {
        label: t("refundPage.detail.payment.status"),
        value:
          preferLocalizedEnAr(
            isAr,
            paymentInfo?.statusObj?.nameEn,
            paymentInfo?.statusObj?.nameAr,
          ) || "-",
        isStatus: true,
        statusClassSource:
          paymentInfo?.statusObj?.nameEn ??
          paymentInfo?.statusObj?.nameAr ??
          "",
      },
      {
        label: t("refundPage.detail.payment.transactionType"),
        value:
          preferLocalizedEnAr(
            isAr,
            paymentInfo?.transactionTypeObj?.nameEn,
            paymentInfo?.transactionTypeObj?.nameAr,
          ) || "-",
      },
      {
        label: t("refundPage.detail.payment.lastUpdatedTime"),
        value: formatDateTime(paymentInfo?.updateOn),
      },
      {
        label: t("refundPage.detail.payment.paymentMethod"),
        value:
          preferLocalizedEnAr(
            isAr,
            paymentInfo?.paymentMethodObj?.nameEn,
            paymentInfo?.paymentMethodObj?.nameAr,
          ) || "-",
      },
      {
        label: t("refundPage.detail.payment.cardInformation"),
        value: maskCardInformation(paymentInfo?.cardInfo),
      },
      {
        label: t("refundPage.detail.payment.amountCharged"),
        value: formatAmount(paymentInfo?.amount, localeTag),
        isChargeAmount: true,
      },
      {
        label: t("refundPage.detail.payment.applyFor"),
        value: formatText(
          paymentInfo?.applyForObj?.userName ?? detail?.applyFor,
        ),
      },
      {
        label: t("refundPage.detail.payment.description"),
        value: maskPaymentDescription(
          paymentInfo?.desciption,
          paymentInfo?.cardInfo,
        ),
        isFullWidth: true,
      },
    ];
  }, [detail?.applyFor, isAr, localeTag, paymentInfo, t]);

  const openAttachmentList = useCallback((attachments: string[]) => {
    setAttachmentListFiles(attachments);
    setAttachmentListVisible(true);
  }, []);

  const handleBannerAttachmentClick = useCallback(() => {
    if (!bannerAttachments.length) {
      return;
    }

    openAttachmentList(bannerAttachments);
  }, [bannerAttachments, openAttachmentList]);

  const relatedCardData = useMemo<RelatedCardData>(() => {
    if (isFineRefund) {
      const relatedViolation = detail?.relatedViolationInfo;
      const violationNumber = formatText(
        relatedViolation?.fineNumber ??
          relatedViolation?.violationNumber ??
          detail?.referenceNumber,
      );
      const statusLabel = formatText(relatedViolation?.statusName);

      return {
        title: t("refundPage.detail.related.violation"),
        number: violationNumber,
        statusLabel,
        statusVariant: getRelatedStatusVariant(statusLabel),
        fields: [
          {
            label: t("refundPage.detail.related.violationType"),
            value: formatText(relatedViolation?.violationType),
          },
          {
            label: t("refundPage.detail.related.violator"),
            value: formatText(relatedViolation?.violator ?? detail?.applyFor),
          },
        ],
        onView: () => {
          if (violationNumber === "-") {
            return;
          }

          history.push(`/pay-fines/detail?fineNumber=${violationNumber}`);
        },
      };
    }

    const relatedApplication = detail?.relatedApplicationInfo;
    const statusLabelDisplay =
      preferLocalizedEnAr(
        isAr,
        relatedApplication?.statusObj?.nameEn,
        relatedApplication?.statusObj?.nameAr,
      ) || "-";
    const statusForClass =
      relatedApplication?.statusObj?.nameEn ??
      relatedApplication?.statusObj?.nameAr ??
      "";

    return {
      title: t("refundPage.detail.related.application"),
      number: formatText(
        relatedApplication?.applicationNo ?? detail?.referenceNumber,
      ),
      statusLabel: statusLabelDisplay,
      statusVariant: getRelatedStatusVariant(statusForClass),
      fields: [
        {
          label: t("refundPage.detail.related.serviceName"),
          value:
            preferLocalizedEnAr(
              isAr,
              relatedApplication?.serviceObj?.nameEn,
              relatedApplication?.serviceObj?.nameAr,
            ) || "-",
        },
        {
          label: t("refundPage.detail.related.submissionTime"),
          value: formatDateTime(relatedApplication?.submissionTime),
        },
      ],
      onView: async () => {
        if (relatedApplication?.applicationId) {
          history.push(
            `/my-requests/detail?id=${relatedApplication.applicationId}`,
          );
          return;
        }

        const referenceNumber = detail?.referenceNumber;
        if (!referenceNumber) {
          return;
        }

        const response = await enquiryApplication(referenceNumber);
        if (!response.data?.applicaitonId) {
          return;
        }

        history.push(`/my-requests/detail?id=${response.data.applicaitonId}`);
      },
    };
  }, [detail, history, isAr, isFineRefund, t]);

  const handleCancelRefund = useCallback(async () => {
    if (!refundId) {
      return;
    }

    try {
      await refundEdit(refundId, { statusId: CANCELLED_STATUS_ID });
      setCancelModalVisible(false);
      CustomMessage.success(t("refundPage.detail.messages.cancelSuccess"));
      fetchDetail();
    } catch (error) {
      console.error("Failed to cancel refund:", error);
      CustomMessage.error(
        getErrorMessage(error, t("refundPage.detail.messages.cancelFailed")),
      );
    }
  }, [fetchDetail, refundId, t]);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    if (!options) {
      return;
    }

    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await fileUpload(formData);
      const fileUrl = response.data?.[0];
      if (!fileUrl) {
        throw new Error("Upload failed");
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
      CustomMessage.success(t("refundPage.detail.messages.uploadSuccess"));
    } catch (error) {
      console.error("Failed to upload refund attachment:", error);
      onError?.(error as UploadRequestError);
      CustomMessage.error(
        getErrorMessage(error, t("refundPage.detail.messages.uploadFailed")),
      );
    }
  };

  const beforeUpload = (file: RcFile) => {
    if (composerFiles.length >= MAX_ATTACHMENT_COUNT) {
      CustomMessage.error(
        t("refundPage.detail.messages.maxFiles", {
          count: MAX_ATTACHMENT_COUNT,
        }),
      );
      return Upload.LIST_IGNORE;
    }

    const fileExtension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      CustomMessage.error(t("refundPage.detail.messages.invalidFormat"));
      return Upload.LIST_IGNORE;
    }

    if (file.size / 1024 / 1024 > MAX_ATTACHMENT_SIZE_MB) {
      CustomMessage.error(
        t("refundPage.detail.messages.maxFileSize", {
          mb: MAX_ATTACHMENT_SIZE_MB,
        }),
      );
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const handleSendMessage = useCallback(async () => {
    if (sendLoading) {
      return;
    }

    if (!composerMessage.trim()) {
      CustomMessage.error(t("refundPage.detail.messages.messageRequired"));
      return;
    }

    if (!refundId) {
      return;
    }

    setSendLoading(true);
    try {
      await postRefundConversation(refundId, {
        messageContent: composerMessage.trim(),
        attachments: composerFiles.map((file) => file.url),
      });

      CustomMessage.success(t("refundPage.detail.messages.sendSuccess"));
      setComposerMessage("");
      setComposerFiles([]);
      fetchDetail();
    } catch (error) {
      console.error("Failed to send refund message:", error);
      CustomMessage.error(
        getErrorMessage(error, t("refundPage.detail.messages.sendFailed")),
      );
    } finally {
      setSendLoading(false);
    }
  }, [composerFiles, composerMessage, fetchDetail, refundId, sendLoading, t]);

  const attachmentButtonDisabled = composerFiles.length >= MAX_ATTACHMENT_COUNT;
  const hasComposerMessage = Boolean(composerMessage.trim());
  const sendButtonDisabled = sendLoading || !hasComposerMessage;

  return (
    <div className={rootClassName}>
      <Spin spinning={loading}>
        <div className="refund-detail-page__overview-card">
          {showBanner && (
            <div className="refund-detail-page__banner">
              <div className="refund-detail-page__banner-content">
                <img
                  className="refund-detail-page__banner-icon"
                  src={bannerIcon}
                  alt=""
                />
                <div className="refund-detail-page__banner-copy">
                  <div className="refund-detail-page__banner-title">
                    {bannerTitle}
                  </div>
                  {bannerMessage ? (
                    <div className="refund-detail-page__banner-text">
                      {bannerMessage}
                    </div>
                  ) : null}
                </div>
              </div>
              {bannerAttachments.length > 0 && (
                <button
                  type="button"
                  className="refund-detail-page__banner-action"
                  onClick={handleBannerAttachmentClick}
                >
                  <img
                    className="refund-detail-page__banner-action-icon"
                    src={BannerAttachmentIcon}
                    alt=""
                  />
                  <span className="refund-detail-page__banner-action-text">
                    {t("refundPage.detail.banner.attachment")}
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="refund-detail-page__summary">
            {summaryItems.map((item) => (
              <div className="refund-detail-page__summary-item" key={item.key}>
                <div className="refund-detail-page__summary-icon-wrap">
                  <img
                    className="refund-detail-page__summary-icon"
                    src={item.icon}
                    alt=""
                  />
                </div>
                <div className="refund-detail-page__summary-copy">
                  <div className="refund-detail-page__summary-label">
                    {item.label}
                  </div>
                  <div className="refund-detail-page__summary-value">
                    {summaryValues[item.key]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="refund-detail-page__content">
          <div className="refund-detail-page__main">
            <div className="refund-detail-page__details-card">
              <button
                type="button"
                className="refund-detail-page__card-header refund-detail-page__card-header--toggle"
                onClick={toggleDetailsExpanded}
                aria-expanded={isDetailsExpanded}
                aria-controls={detailsSectionBodyId}
              >
                <span
                  className="refund-detail-page__card-title"
                  role="heading"
                  aria-level={2}
                >
                  {detailTitle}
                </span>
                <span
                  className="refund-detail-page__collapse-button"
                  aria-hidden="true"
                >
                  <img
                    className={[
                      "refund-detail-page__collapse-icon",
                      isDetailsExpanded
                        ? "refund-detail-page__collapse-icon--expanded"
                        : "",
                    ].join(" ")}
                    src={ChevronUpIcon}
                    alt=""
                  />
                </span>
              </button>

              {isDetailsExpanded && (
                <div
                  className="refund-detail-page__details-body"
                  id={detailsSectionBodyId}
                >
                  <div className="refund-detail-page__field-grid">
                    {detailFields.map((field) => (
                      <div
                        className="refund-detail-page__field"
                        key={field.label}
                      >
                        <div className="refund-detail-page__field-label">
                          {field.label}
                        </div>
                        <div
                          className={[
                            "refund-detail-page__field-value",
                            field.isHighlight
                              ? "refund-detail-page__field-value--highlight"
                              : "",
                            field.isAmount
                              ? "refund-detail-page__field-value--amount"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {field.isAmount && field.value !== "-" && <AED />}
                          <span>{field.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="refund-detail-page__section">
                    <div className="refund-detail-page__field-label">
                      {t("refundPage.detail.attachments")}
                    </div>
                    {userAttachments.length > 0 ? (
                      <div className="refund-detail-page__attachments-grid">
                        {userAttachments.map((file) => (
                          <div
                            className="refund-detail-page__attachment-item"
                            key={file}
                          >
                            <DocumentViewer
                              fileName={file}
                              hasDelete={false}
                              hasDownload={true}
                              hasView={true}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="refund-detail-page__field-value">-</div>
                    )}
                  </div>

                  <div className="refund-detail-page__section">
                    <div className="refund-detail-page__field-label">
                      {t("refundPage.detail.notes")}
                    </div>
                    <div className="refund-detail-page__notes">
                      {formatText(detail?.additionalComments)}
                    </div>
                  </div>

                  <div className="refund-detail-page__payment-card">
                    <div className="refund-detail-page__payment-title">
                      {t("refundPage.detail.relatedPayment")}
                    </div>
                    <div className="refund-detail-page__payment-grid">
                      {relatedPaymentFields
                        .filter((field) => !field.isFullWidth)
                        .map((field) => (
                          <div
                            className="refund-detail-page__payment-field"
                            key={field.label}
                          >
                            <div className="refund-detail-page__field-label">
                              {field.label}
                            </div>
                            {field.isStatus ? (
                              <div className="refund-detail-page__payment-status-wrap">
                                <span
                                  className={[
                                    "refund-detail-page__status-pill",
                                    `refund-detail-page__status-pill--${getRelatedStatusVariant(
                                      (
                                        field as {
                                          statusClassSource?: string;
                                        }
                                      ).statusClassSource ?? String(field.value),
                                    )}`,
                                  ].join(" ")}
                                >
                                  {field.value}
                                </span>
                              </div>
                            ) : (
                              <div
                                className={[
                                  "refund-detail-page__field-value",
                                  field.isChargeAmount
                                    ? "refund-detail-page__field-value--charge"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {field.isChargeAmount &&
                                  field.value !== "-" && <AED />}
                                <span>{field.value}</span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    <div className="refund-detail-page__payment-divider" />

                    {relatedPaymentFields
                      .filter((field) => field.isFullWidth)
                      .map((field) => (
                        <div
                          className="refund-detail-page__payment-field refund-detail-page__payment-field--full"
                          key={field.label}
                        >
                          <div className="refund-detail-page__field-label">
                            {field.label}
                          </div>
                          <div className="refund-detail-page__field-value">
                            {field.value}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="refund-detail-page__communications-card">
              <div className="refund-detail-page__card-header">
                <h2 className="refund-detail-page__card-title">
                  {t("refundPage.detail.communications.title")}
                </h2>
              </div>
              {hasMoreHistory && !isHistoryExpanded && (
                <div
                  className="refund-detail-page__show-more-messages"
                  onClick={() => setIsHistoryExpanded(true)}
                >
                  <div className="refund-detail-page__show-more-messages-icon">
                    <Upward />
                  </div>
                  <div className="refund-detail-page__show-more-message-text">
                    {t("refundPage.detail.communications.showMore")}
                  </div>
                </div>
              )}

              {communications.length > 0 ? (
                <div className="refund-detail-page__communications-list">
                  {communications.map((comment, index) => (
                    <div key={comment.id}>
                      <div className="refund-detail-page__communications-item">
                        <div className="refund-detail-page__communications-avatar-wrap">
                          <img
                            className="refund-detail-page__communications-avatar"
                            src={
                              comment.photoUrl
                                ? `${ImageBaseUrl}${comment.photoUrl}`
                                : avatar
                            }
                            alt=""
                          />
                        </div>
                        <div className="refund-detail-page__communications-content">
                          <div className="refund-detail-page__communications-header">
                            <div className="refund-detail-page__communications-name">
                              {comment.userName}
                            </div>
                            <div className="refund-detail-page__communications-time">
                              {formatDateTime(comment.createdOn)}
                            </div>
                          </div>
                          <div className="refund-detail-page__communications-message">
                            {comment.message}
                          </div>
                          {comment.attachments.length ? (
                            <div className="refund-detail-page__communications-attachments">
                              {comment.attachments.map((file) => (
                                <div
                                  className="refund-detail-page__attachment-item"
                                  key={file}
                                >
                                  <DocumentViewer
                                    fileName={file}
                                    hasDelete={false}
                                    hasDownload={true}
                                    hasView={true}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {index < communications.length - 1 && (
                        <div className="refund-detail-page__communications-divider" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="refund-detail-page__communications-empty">
                  {t("refundPage.detail.communications.empty")}
                </div>
              )}

              {showComposer && (
                <div className="refund-detail-page__composer">
                  <textarea
                    className="refund-detail-page__composer-textarea"
                    value={composerMessage}
                    maxLength={MAX_MESSAGE_LENGTH}
                    onChange={(event) => setComposerMessage(event.target.value)}
                    placeholder={t("formPlaceholders.common.leaveSupportMessage")}
                  />

                  {composerFiles.length > 0 && (
                    <div className="refund-detail-page__composer-files">
                      {composerFiles.map((file, index) => (
                        <div
                          className="refund-detail-page__attachment-item"
                          key={file.url}
                        >
                          <DocumentViewer
                            fileName={file.url}
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
                  )}

                  <div className="refund-detail-page__composer-footer">
                    <div className="refund-detail-page__composer-counter">
                      {composerMessage.length}/{MAX_MESSAGE_LENGTH}
                    </div>
                    <div className="refund-detail-page__composer-actions">
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
                            "refund-detail-page__composer-attachment",
                            attachmentButtonDisabled
                              ? "refund-detail-page__composer-attachment--disabled"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={attachmentButtonDisabled}
                        >
                          <img
                            className="refund-detail-page__composer-attachment-icon"
                            src={ComposerAttachmentIcon}
                            alt=""
                          />
                        </button>
                      </Upload>
                      <button
                        type="button"
                        className={[
                          "refund-detail-page__composer-send",
                          sendButtonDisabled
                            ? "refund-detail-page__composer-send--disabled"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={sendButtonDisabled}
                        onClick={handleSendMessage}
                      >
                        <span className="refund-detail-page__composer-send-text">
                          {sendLoading
                            ? t("refundPage.detail.communications.sending")
                            : t("refundPage.detail.communications.send")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="refund-detail-page__sidebar">
            <RelatedInfoCard
              title={relatedCardData.title}
              number={relatedCardData.number}
              statusLabel={relatedCardData.statusLabel === "-" ? undefined : relatedCardData.statusLabel}
              statusVariant={relatedCardData.statusVariant}
              viewLabel={t("refundPage.detail.related.view")}
              onView={relatedCardData.onView}
            >
              <div className="refund-detail-page__related-fields">
                {relatedCardData.fields.map((field) => (
                  <div className="refund-detail-page__related-field" key={field.label}>
                    <div className="refund-detail-page__field-label">{field.label}</div>
                    <div className="refund-detail-page__field-value">{field.value}</div>
                  </div>
                ))}
              </div>
            </RelatedInfoCard>
          </aside>
        </div>

        <Modal centered
          title={t("refundPage.detail.attachmentModalTitle")}
          visible={attachmentListVisible}
          footer={null}
          wrapClassName="refund-detail-page__attachment-modal"
          onCancel={() => setAttachmentListVisible(false)}
        >
          <div className="refund-detail-page__attachment-modal-list">
            {attachmentListFiles.map((file) => (
              <div className="refund-detail-page__attachment-item" key={file}>
                <DocumentViewer
                  fileName={file}
                  hasDelete={false}
                  hasDownload={true}
                  hasView={true}
                />
              </div>
            ))}
          </div>
        </Modal>

        <ComfirmModal
          title={t("refundPage.cancelModal.title")}
          type="warning"
          content={t("refundPage.cancelModal.content")}
          show={cancelModalVisible}
          comfrimHanld={handleCancelRefund}
          close={() => setCancelModalVisible(false)}
        />

        <ActionFooter
          className="refund-detail-page__footer"
          onBack={() => history.push("/refund")}
          actions={
            showCancelButton ? (
              <CustomButton
                text={t("refundPage.table.cancel")}
                variant="primary"
                onClick={() => setCancelModalVisible(true)}
              />
            ) : null
          }
        />
      </Spin>
    </div>
  );
};

export default RefundDetail;
