import React, { useEffect, useMemo, useRef, useState } from "react";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  Spin,
  Tooltip,
  message,
} from "antd";
import type { RcFile } from "antd/lib/upload";
import type { UploadRequestOption } from "rc-upload/lib/interface";
import { useTranslation } from "react-i18next";
import FileUpload, { type FileItem } from "@/components/common/FileUpload";
import PreviewModal from "@/components/common/PreviewModal";
import LangMenu from "@/components/common/LangMenu";
import {
  createMobileNumberFormRule,
  DEFAULT_COUNTRY_DIAL_CODE,
  FormMobileNumberInput,
} from "@/components/common/MobileNumberInput";
import {
  INSPECTION_DECLARATION_TEMPLATE_FILE_NAME,
  INSPECTION_DECLARATION_TEMPLATE_URL,
} from "@/constants/inspectionDeclarationTemplate";
import { UPLOAD_LIMITS } from "@/constants/uploadLimits";
import { downloadInspectionReportFile } from "@/pages/InspectionCommon/reportDownload";
import {
  buildContactNumberFields,
  createContactNumberSnapshot,
  readContactFormValue,
  toContactFormValue,
} from "@/components/common/MobileNumberInput";
import { ImageBaseUrl } from "@/utils/url";
import {
  getDeclarationPortalContext,
  submitDeclarationPortalSignature,
  uploadDeclarationPortalFile,
  type DeclarationPortalContext,
} from "./service";
import StatusPage from "./StatusPage";
import logoAsset from "./assets/logo-uae-media-council.svg";
import footerBgAsset from "./assets/background-submit-bar.png";
import requiredStarAsset from "./assets/mark-required.svg";
import requiredStarMobileAsset from "./assets/mark-required-mobile.svg";
import requiredStarUploadAsset from "./assets/mark-required-upload.svg";
import fileVectorAsset from "./assets/icon-pdf-document.svg";
import pdfFileDetailAsset from "./assets/icon-pdf-fold.svg";
import downloadLineAAsset from "./assets/icon-download-arrow.svg";
import downloadLineBAsset from "./assets/icon-download-tray.svg";
import downloadLineCAsset from "./assets/icon-download-accent.svg";
import helpCircleAsset from "./assets/icon-help-circle.svg";
import helpQuestionAsset from "./assets/icon-help-question.svg";
import infoAsset from "./assets/icon-info.svg";
import "./index.less";

type DeclarationFormValues = {
  fullName: string;
  position: string;
  mobileNumber: Record<string, unknown>;
  emailAddress: string;
  emiratesId: string;
  eidAttachmentFiles: FileItem[];
  signedDeclarationFiles: FileItem[];
};

type PortalAttachment = {
  fileName: string;
  fileUrl: string;
};

type FileChipAction = "view" | "download" | "delete";

const EID_DIGITS_REGEX = /^784\d{12}$/;
const EID_MAX_LENGTH = 15;
const PDF_ACCEPT = ".pdf,application/pdf";
const ATTACHMENT_MAX_SIZE_MB = 5;
const declarationMobileFieldNames = {
  countryCode: "mobileCountryCode",
  phoneNumber: "mobileLocalNumber",
};

const triggerStaticTemplateDownload = () => {
  const link = document.createElement("a");
  link.href = INSPECTION_DECLARATION_TEMPLATE_URL;
  link.download = INSPECTION_DECLARATION_TEMPLATE_FILE_NAME;
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getSearchToken = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("token")?.trim() || "";
};

const normalizeLocalizedDigits = (value: unknown) => String(value ?? "")
  .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));

const getDigitsOnlyValue = (value: unknown, maxLength?: number) => {
  const digits = normalizeLocalizedDigits(value).replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
};

const isPdfFile = (file: { name?: unknown; type?: unknown }) => {
  const fileName = String(file.name || "");
  const contentType = String(file.type || "").toLowerCase();
  return contentType === "application/pdf" || /\.pdf$/i.test(fileName);
};

/** AntD `validateFields` rejects with `{ errorFields }`, not with an `Error`. */
const isFormValidationError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  Array.isArray((error as { errorFields?: unknown }).errorFields);

/** Surfaces the backend business message (`message` / `title`) when present. */
const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();
  return "";
};

const preventNonDigitKeyDown = (
  event: React.KeyboardEvent<HTMLInputElement>,
) => {
  const controlKeys = new Set([
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "Tab",
    "Enter",
    "Escape",
  ]);

  if (event.ctrlKey || event.metaKey || controlKeys.has(event.key)) return;
  if (event.key.length === 1 && !/^\d$/.test(event.key)) {
    event.preventDefault();
  }
};

const preventInvalidDigitPaste = (
  event: React.ClipboardEvent<HTMLInputElement>,
) => {
  const text = event.clipboardData.getData("text");
  if (text && !/^\d+$/.test(normalizeLocalizedDigits(text))) {
    event.preventDefault();
  }
};

const validateEmiratesId = (_: unknown, value: unknown, message: string) => {
  const normalizedValue = getDigitsOnlyValue(value, EID_MAX_LENGTH);

  if (!normalizedValue || EID_DIGITS_REGEX.test(normalizedValue)) {
    return Promise.resolve();
  }

  return Promise.reject(new Error(message));
};

const isAbsoluteAttachmentUrl = (value: string) => /^(https?:)?\/\//i.test(value);
const isRootRelativeAttachmentUrl = (value: string) =>
  value.startsWith("/") && !value.startsWith("//");
const isApiAttachmentPath = (value: string) => /^\/api\//i.test(value);
const isDirectRootRelativeAttachmentUrl = (value: string) =>
  isRootRelativeAttachmentUrl(value) && !isApiAttachmentPath(value);
const isDataAttachmentUrl = (value: string) => /^data:/i.test(value);
const isBlobAttachmentUrl = (value: string) => /^blob:/i.test(value);

const getDocumentDownloadFileName = (value: string) => {
  try {
    const parsedUrl = new URL(value, "https://local.invalid");
    if (!/^\/api\/Document\/Dowload$/i.test(parsedUrl.pathname)) return "";

    const fileName = parsedUrl.searchParams.get("fileName");
    return fileName ? decodeURIComponent(fileName) : "";
  } catch {
    return "";
  }
};

const normalizeDeclarationAttachmentFilePath = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (isDataAttachmentUrl(raw) || isBlobAttachmentUrl(raw)) return raw;

  if (raw.startsWith(ImageBaseUrl)) {
    return decodeURIComponent(raw.slice(ImageBaseUrl.length));
  }

  const documentDownloadFileName = getDocumentDownloadFileName(raw);
  if (documentDownloadFileName) return documentDownloadFileName;

  if (isDirectRootRelativeAttachmentUrl(raw)) return raw;

  if (isAbsoluteAttachmentUrl(raw)) {
    try {
      const parsedUrl = new URL(raw);
      const fileName = parsedUrl.searchParams.get("fileName");
      return fileName ? decodeURIComponent(fileName) : raw;
    } catch {
      return raw;
    }
  }

  return raw;
};

const buildDeclarationAttachmentAccessUrl = (value?: string | null) => {
  const filePath = normalizeDeclarationAttachmentFilePath(value);
  if (!filePath) return "";

  if (
    isDataAttachmentUrl(filePath) ||
    isBlobAttachmentUrl(filePath) ||
    isAbsoluteAttachmentUrl(filePath)
  ) {
    return filePath;
  }

  if (isDirectRootRelativeAttachmentUrl(filePath)) return filePath;
  if (isApiAttachmentPath(filePath)) return "";

  return `${ImageBaseUrl}${encodeURIComponent(filePath)}`;
};

function RequiredLabel({
  children,
  help,
  mobileMark,
  uploadMark,
}: {
  children: React.ReactNode;
  help?: React.ReactNode;
  mobileMark?: boolean;
  uploadMark?: boolean;
}) {
  const markAsset = uploadMark
    ? requiredStarUploadAsset
    : mobileMark
      ? requiredStarMobileAsset
      : requiredStarAsset;

  return (
    <span className="inspection-declaration__form-label">
      <span className="inspection-declaration__form-label-text">
        {children}
      </span>
      {help ? <HelpIcon title={help} /> : null}
      <img
        className="inspection-declaration__required-mark"
        src={markAsset}
        alt=""
      />
    </span>
  );
}

function HelpIcon({ title }: { title?: React.ReactNode }) {
  const icon = (
    <span
      className="inspection-declaration__help-icon"
      aria-hidden={title ? undefined : true}
      aria-label={typeof title === "string" ? title : undefined}
      tabIndex={title ? 0 : undefined}
    >
      <img
        className="inspection-declaration__help-icon-circle"
        src={helpCircleAsset}
        alt=""
      />
      <img
        className="inspection-declaration__help-icon-question"
        src={helpQuestionAsset}
        alt=""
      />
    </span>
  );

  if (!title) return icon;

  return (
    <Tooltip
      title={title}
      getPopupContainer={(triggerNode) => triggerNode.ownerDocument.body}
    >
      {icon}
    </Tooltip>
  );
}

function PdfFileIcon() {
  return (
    <span className="inspection-declaration__file-icon" aria-hidden="true">
      <img
        className="inspection-declaration__file-icon-part inspection-declaration__file-icon-part--document"
        src={fileVectorAsset}
        alt=""
      />
      <img
        className="inspection-declaration__file-icon-part inspection-declaration__file-icon-part--fold"
        src={pdfFileDetailAsset}
        alt=""
      />
    </span>
  );
}

function DownloadIcon() {
  return (
    <span className="inspection-declaration__download-icon" aria-hidden="true">
      <img
        className="inspection-declaration__download-icon-part inspection-declaration__download-icon-part--arrow"
        src={downloadLineAAsset}
        alt=""
      />
      <img
        className="inspection-declaration__download-icon-part inspection-declaration__download-icon-part--tray"
        src={downloadLineBAsset}
        alt=""
      />
      <img
        className="inspection-declaration__download-icon-part inspection-declaration__download-icon-part--accent"
        src={downloadLineCAsset}
        alt=""
      />
    </span>
  );
}

function FileChip({
  actions,
  attachment,
  onDelete,
  onDownload,
  onView,
}: {
  actions: FileChipAction[];
  attachment: PortalAttachment;
  onDelete?: () => void;
  onDownload?: () => void | Promise<void>;
  onView?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();

  const renderActionIcon = (action: FileChipAction) => {
    if (action === "view") {
      return (
        <EyeOutlined className="inspection-declaration__file-chip-action-icon" />
      );
    }

    if (action === "delete") {
      return (
        <DeleteOutlined className="inspection-declaration__file-chip-action-icon" />
      );
    }

    return <DownloadIcon />;
  };

  const getActionHandler = (action: FileChipAction) => {
    if (action === "view") return onView;
    if (action === "delete") return onDelete;
    return onDownload;
  };

  const getActionLabel = (action: FileChipAction) => {
    if (action === "view") {
      return t("inspectionDeclaration.fileActions.viewAria", {
        fileName: attachment.fileName,
      });
    }
    if (action === "delete") {
      return t("inspectionDeclaration.fileActions.deleteAria", {
        fileName: attachment.fileName,
      });
    }
    return t("inspectionDeclaration.fileActions.downloadAria", {
      fileName: attachment.fileName,
    });
  };

  const getActionTitle = (action: FileChipAction) => {
    if (action === "view") return t("inspectionDeclaration.fileActions.preview");
    if (action === "delete") return t("inspectionDeclaration.fileActions.delete");
    return t("inspectionDeclaration.fileActions.download");
  };

  const fileChipContent = (
    <>
      <PdfFileIcon />
      <span className="inspection-declaration__file-chip-name">
        {attachment.fileName}
      </span>
    </>
  );

  return (
    <div className="inspection-declaration__file-chip">
      {onView ? (
        <button
          className="inspection-declaration__file-chip-main inspection-declaration__file-chip-main--button"
          type="button"
          aria-label={getActionLabel("view")}
          onClick={() => {
            void onView();
          }}
        >
          {fileChipContent}
        </button>
      ) : (
        <div className="inspection-declaration__file-chip-main">
          {fileChipContent}
        </div>
      )}
      <div className="inspection-declaration__file-chip-actions">
        {actions.map((action) => {
          const handler = getActionHandler(action);

          if (!handler) return null;

          return (
            <Tooltip key={action} title={getActionTitle(action)}>
              <button
                className={`inspection-declaration__file-chip-action inspection-declaration__file-chip-action--${action}`}
                type="button"
                aria-label={getActionLabel(action)}
                onClick={() => {
                  void handler();
                }}
              >
                {renderActionIcon(action)}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}


function LoadingView() {
  const { t, i18n } = useTranslation();

  return (
    <main className="inspection-declaration">
      <div className="inspection-declaration__shell">
        <header className="inspection-declaration__header">
          <h1 className="inspection-declaration__title">
            {t("inspectionDeclaration.title")}
          </h1>
          <div className="inspection-declaration__brand">
            <LangMenu lang={i18n.language} onChange={() => undefined} />
            <img
              className="inspection-declaration__logo"
              src={logoAsset}
              alt={t("inspectionDeclaration.logoAlt")}
            />
          </div>
        </header>
        <div className="inspection-declaration__status-card">
          <Spin size="large" />
        </div>
      </div>
    </main>
  );
}

const getAttachmentPreviewData = (attachment: PortalAttachment) => {
  const rawUrl = attachment.fileUrl.trim();
  const normalizedPath = normalizeDeclarationAttachmentFilePath(rawUrl);
  const previewUrl = buildDeclarationAttachmentAccessUrl(rawUrl);

  if (!previewUrl) return null;

  return {
    name: attachment.fileName,
    url: previewUrl,
    filePath: normalizedPath || rawUrl,
  };
};

export default function InspectionDeclaration() {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm<DeclarationFormValues>();
  const mobileSnapshotRef = useRef(createContactNumberSnapshot({
    countryCode: DEFAULT_COUNTRY_DIAL_CODE,
    localNumber: "",
    fullNumber: "",
  }));
  const token = useMemo(getSearchToken, []);
  const [declaration, setDeclaration] = useState<DeclarationPortalContext | null>(
    null,
  );
  const [pageStatus, setPageStatus] = useState<
    "loading" | "ready" | "submitted" | "linkExpired"
  >("loading");
  const [submitting, setSubmitting] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PortalAttachment | null>(null);

  useEffect(() => {
    let active = true;

    if (!token) {
      setPageStatus("linkExpired");
      return () => {
        active = false;
      };
    }

    setPageStatus("loading");
    getDeclarationPortalContext(token)
    .then((data) => {
      if (!active) return;

      setDeclaration(data);
      const mobileSnapshot = createContactNumberSnapshot({
      countryCode: data.mobileCountryCode || DEFAULT_COUNTRY_DIAL_CODE,
      localNumber: data.mobileLocalNumber,
      fullNumber: data.mobile,
      });
      mobileSnapshotRef.current = mobileSnapshot;

      const prefilledEidFiles: FileItem[] =
      data.eidAttachmentFileName && data.eidAttachmentFileUrl
        ? [{
          name: data.eidAttachmentFileName,
          url: data.eidAttachmentFileUrl,
        }]
        : [];

      form.setFieldsValue({
      fullName: data.contactFullName,
      position: data.position,
      mobileNumber: toContactFormValue(
        mobileSnapshot,
        declarationMobileFieldNames,
      ),
      emailAddress: data.email,
      emiratesId: getDigitsOnlyValue(data.emiratesId, EID_MAX_LENGTH),
      eidAttachmentFiles: prefilledEidFiles,
      signedDeclarationFiles: [],
      });
      setPageStatus("ready");
    })
    .catch(() => {
      if (active) {
      setPageStatus("linkExpired");
      }
    });

    return () => {
      active = false;
    };
  }, [form, token]);

  const templateAttachment = useMemo<PortalAttachment | null>(() => {
    if (!declaration) return null;

    return {
      fileName: INSPECTION_DECLARATION_TEMPLATE_FILE_NAME,
      fileUrl: INSPECTION_DECLARATION_TEMPLATE_URL,
    };
  }, [declaration]);

  const previewFileData = useMemo(() => {
    if (!previewAttachment) return null;
    return getAttachmentPreviewData(previewAttachment);
  }, [previewAttachment]);

  const viewAttachment = (attachment: PortalAttachment) => {
    if (!getAttachmentPreviewData(attachment)) {
      message.error(t("inspectionDeclaration.feedback.fileUnavailable"));
      return;
    }

    setPreviewAttachment(attachment);
  };

  const previewUploadedFile = (file: FileItem) => {
    viewAttachment({ fileName: file.name, fileUrl: file.url });
  };

  const downloadAttachment = async (attachment: PortalAttachment) => {
    try {
      if (attachment.fileUrl === INSPECTION_DECLARATION_TEMPLATE_URL) {
        triggerStaticTemplateDownload();
        return;
      }

      await downloadInspectionReportFile(
        {
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
        },
        {
          skipAuth: true,
          skipErrorToast: true,
          skipUnauthorizedRedirect: true,
        },
      );
    } catch {
      message.error(t("inspectionDeclaration.feedback.downloadFailed"));
    }
  };

  const handleBeforeUpload = (file: RcFile) => {
    if (!isPdfFile(file)) {
      message.error(t("inspectionDeclaration.validation.pdfOnly"));
      return false;
    }

    return true;
  };

  const uploadFile = async (options: UploadRequestOption<string>) => {
    const file = options.file as RcFile;

    try {
      const uploadResult = await uploadDeclarationPortalFile(file);
      options.onSuccess?.(uploadResult.fileUrl, undefined as never);
    } catch (error) {
      message.error(t("inspectionDeclaration.feedback.uploadFailed"));
      options.onError?.(error as Error);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;

    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const eidFile = (values.eidAttachmentFiles || [])[0];
      const signedFile = (values.signedDeclarationFiles || [])[0];
      const mobileFields = buildContactNumberFields({
        value: readContactFormValue(
          values.mobileNumber,
          declarationMobileFieldNames,
        ),
        initial: mobileSnapshotRef.current,
        keys: {
          fullNumber: "mobile",
          countryCode: "mobileCountryCode",
          localNumber: "mobileLocalNumber",
        },
      });

      await submitDeclarationPortalSignature({
        token,
        fullName: values.fullName.trim(),
        position: values.position.trim(),
        mobile: mobileFields.mobile,
        mobileCountryCode: mobileFields.mobileCountryCode,
        mobileLocalNumber: mobileFields.mobileLocalNumber,
        email: values.emailAddress.trim(),
        emiratesId: getDigitsOnlyValue(values.emiratesId, EID_MAX_LENGTH),
        declarationAcknowledged: true,
        // The uploaded signed copy is the signature itself; no canvas is used.
        signatureImageFileName: signedFile?.name || "",
        signatureImageFileUrl: signedFile?.url || "",
        declarationDocumentFileName: signedFile?.name || "",
        declarationDocumentFileUrl: signedFile?.url || "",
        emiratesIdAttachmentFileName: eidFile?.name || "",
        emiratesIdAttachmentFileUrl: eidFile?.url || "",
      });
      setPageStatus("submitted");
    } catch (error) {
      if (isFormValidationError(error)) return;

      console.error("Failed to submit inspection declaration:", error);
      message.error(
        getErrorMessage(error) ||
          t("inspectionDeclaration.feedback.submissionFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (pageStatus === "loading") {
    return <LoadingView />;
  }

  if (pageStatus === "submitted" || pageStatus === "linkExpired") {
    return <StatusPage status={pageStatus} />;
  }

  return (
    <main className="inspection-declaration">
      <div className="inspection-declaration__shell">
        <header className="inspection-declaration__header">
          <h1 className="inspection-declaration__title">
            {t("inspectionDeclaration.title")}
          </h1>
          <div className="inspection-declaration__brand">
            <LangMenu lang={i18n.language} onChange={() => undefined} />
            <img
              className="inspection-declaration__logo"
              src={logoAsset}
              alt={t("inspectionDeclaration.logoAlt")}
            />
          </div>
        </header>

        <Form
          form={form}
          className="inspection-declaration__form"
          layout="vertical"
          requiredMark={false}
        >
          <section className="inspection-declaration__card inspection-declaration__contact-card">
            <h2 className="inspection-declaration__card-title">
              {t("inspectionDeclaration.sections.contactPersonInformation")}
            </h2>
            <div className="inspection-declaration__field-grid">
              <Form.Item
                label={<RequiredLabel>{t("inspectionDeclaration.fields.fullName")}</RequiredLabel>}
                name="fullName"
                rules={[{
                  required: true,
                  whitespace: true,
                  message: t("inspectionDeclaration.validation.required"),
                }]}
              >
                <Input placeholder={t("inspectionDeclaration.placeholders.fullName")} />
              </Form.Item>
              <Form.Item
                label={<RequiredLabel>{t("inspectionDeclaration.fields.position")}</RequiredLabel>}
                name="position"
                rules={[{
                  required: true,
                  whitespace: true,
                  message: t("inspectionDeclaration.validation.required"),
                }]}
              >
                <Input placeholder={t("inspectionDeclaration.placeholders.position")} />
              </Form.Item>
              <Form.Item
                label={(
                  <RequiredLabel mobileMark>
                    {t("inspectionDeclaration.fields.mobileNumber")}
                  </RequiredLabel>
                )}
                name="mobileNumber"
                validateTrigger={["onBlur"]}
                rules={[
                  createMobileNumberFormRule({
                    fieldNames: declarationMobileFieldNames,
                    required: true,
                  }),
                ]}
              >
                <FormMobileNumberInput
                fieldNames={declarationMobileFieldNames}
                defaultCountryCode={DEFAULT_COUNTRY_DIAL_CODE}
                placeholder={t("inspectionDeclaration.placeholders.mobilePhone")}
                />
              </Form.Item>
              <Form.Item
                label={<RequiredLabel>{t("inspectionDeclaration.fields.emailAddress")}</RequiredLabel>}
                name="emailAddress"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t("inspectionDeclaration.validation.required"),
                  },
                  {
                    type: "email",
                    message: t("inspectionDeclaration.validation.invalidEmail"),
                  },
                ]}
              >
                <Input placeholder={t("inspectionDeclaration.placeholders.emailAddress")} />
              </Form.Item>
              <Form.Item
                label={<RequiredLabel>{t("inspectionDeclaration.fields.eid")}</RequiredLabel>}
                name="emiratesId"
                getValueFromEvent={(event) =>
                  getDigitsOnlyValue(event?.target?.value, EID_MAX_LENGTH)}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t("inspectionDeclaration.validation.required"),
                  },
                  {
                    validator: (rule, value) => validateEmiratesId(
                      rule,
                      value,
                      t("inspectionDeclaration.validation.invalidEidFormat"),
                    ),
                  },
                ]}
              >
                <Input
                  inputMode="numeric"
                  maxLength={EID_MAX_LENGTH}
                  pattern="[0-9]*"
                  placeholder={t("inspectionDeclaration.placeholders.eid")}
                  onKeyDown={preventNonDigitKeyDown}
                  onPaste={preventInvalidDigitPaste}
                />
              </Form.Item>
              <div className="inspection-declaration__upload-field">
              <Form.Item
              label={
              <RequiredLabel
              help={t("inspectionDeclaration.tooltips.eidAttachment")}
              uploadMark
              >
              {t("inspectionDeclaration.fields.eidAttachment")}
              </RequiredLabel>
              }
              name="eidAttachmentFiles"
              rules={[{
              required: true,
              message: t("inspectionDeclaration.validation.required"),
              }]}
              >
              <FileUpload
              isSingle
              accept={PDF_ACCEPT}
              maxCount={UPLOAD_LIMITS.SINGLE_ATTACHMENT}
              maxSize={ATTACHMENT_MAX_SIZE_MB}
              showUploadTip={false}
              beforeUpload={handleBeforeUpload}
              customRequest={uploadFile}
              onPreview={previewUploadedFile}
              />
              </Form.Item>
              </div>
            </div>
          </section>

          <section className="inspection-declaration__card inspection-declaration__declaration-card">
            <h2 className="inspection-declaration__card-title">
              {t("inspectionDeclaration.sections.declarationAcknowledgement")}
            </h2>
            <div className="inspection-declaration__declaration-panel">
              <div className="inspection-declaration__notice">
                <img
                  className="inspection-declaration__notice-icon"
                  src={infoAsset}
                  alt=""
                />
                <span className="inspection-declaration__notice-text">
                  {t("inspectionDeclaration.notices.downloadAndSign")}
                </span>
              </div>
              <div className="inspection-declaration__download-field">
                <span className="inspection-declaration__plain-label">
                  {t("inspectionDeclaration.fields.downloadFile")}
                  <HelpIcon title={t("inspectionDeclaration.tooltips.downloadFile")} />
                </span>
                {templateAttachment ? (
                  <FileChip
                    actions={["view", "download"]}
                    attachment={templateAttachment}
                    onDownload={() => downloadAttachment(templateAttachment)}
                    onView={() => viewAttachment(templateAttachment)}
                  />
                ) : null}
              </div>
            </div>

            <div className="inspection-declaration__signed-upload">
            <Form.Item
            label={
            <RequiredLabel
            help={t("inspectionDeclaration.tooltips.signedFile")}
            uploadMark
            >
            {t("inspectionDeclaration.fields.uploadSignedFile")}
            </RequiredLabel>
            }
            name="signedDeclarationFiles"
            rules={[{
            required: true,
            message: t("inspectionDeclaration.validation.required"),
            }]}
            >
            <FileUpload
            isSingle
            accept={PDF_ACCEPT}
            maxCount={UPLOAD_LIMITS.SINGLE_ATTACHMENT}
            maxSize={ATTACHMENT_MAX_SIZE_MB}
            showUploadTip={false}
            beforeUpload={handleBeforeUpload}
            customRequest={uploadFile}
            onPreview={previewUploadedFile}
            />
            </Form.Item>
            </div>
          </section>
        </Form>

        <footer className="inspection-declaration__footer">
          <img
            className="inspection-declaration__footer-bg"
            src={footerBgAsset}
            alt=""
          />
          <Button
            type="primary"
            className="inspection-declaration__submit"
            loading={submitting}
            onClick={handleSubmit}
          >
            {t("inspectionDeclaration.actions.submit")}
          </Button>
        </footer>
      </div>
      {previewFileData ? (
        <PreviewModal
          visible={Boolean(previewAttachment)}
          fileData={previewFileData}
          onCancel={() => setPreviewAttachment(null)}
        />
      ) : null}
    </main>
  );
}
