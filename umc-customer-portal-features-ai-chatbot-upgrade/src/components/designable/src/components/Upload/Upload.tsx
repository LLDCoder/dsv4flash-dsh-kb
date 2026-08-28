import * as React from "react";
import { connect, useField } from "@formily/react";
import DocumentViewer from "../../../../common/DocumentViewer/index";
import { fileUpload } from "@/services/media";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";

const FILE_FORMAT_TO_ACCEPT: Record<string, string> = {
  JPG: ".jpg",
  JPEG: ".jpeg",
  PNG: ".png",
  PDF: ".pdf",
  DOCX: ".docx",
  MP4: ".mp4",
};

const formatAcceptLabel = (accept: string) =>
  accept
    .split(",")
    .map((item) => item.trim().replace(/^\./, ""))
    .filter(Boolean)
    .join(", ");

const UploadComponent = ({
  value,
  onChange,
  fileFormat,
  fileSizeLimit,
  titleEn,
  titleAr,
  labelEn,
  labelAr,
  placeholderEn,
  placeholderAr,
  uploadTipEn,
  uploadTipAr,
  reuploadTooltipEn,
  reuploadTooltipAr,
  ...props
}) => {
  const field = useField();
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const uploadFile = async (options: any) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await fileUpload(formData);
      if (res.data && res.data.length > 0) {
        onSuccess(res.data[0]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      if (onError) {
        onError(error);
      }
    }
  };

  const accept =
    fileFormat && Array.isArray(fileFormat) && fileFormat.length > 0
      ? fileFormat
          .map((f: string) => FILE_FORMAT_TO_ACCEPT[f] || `.${f.toLowerCase()}`)
          .join(",")
      : "";

  const maxSize = Math.min(100, Math.max(1, fileSizeLimit ?? 5));
  const acceptLabel = formatAcceptLabel(accept || ".pdf,.jpg,.jpeg,.png");
  const localizedLabel = preferLocalizedEnAr(
    isAr,
    typeof labelEn === "string" ? labelEn : typeof titleEn === "string" ? titleEn : undefined,
    typeof labelAr === "string" ? labelAr : typeof titleAr === "string" ? titleAr : undefined,
  );
  const resolvedPlaceholder = resolveI18nPlaceholder({
    isAr,
    i18n,
    t,
    placeholder: props.placeholder,
    placeholderEn,
    placeholderAr,
    placeholderKey: props.placeholderKey,
    placeholderParams: props.placeholderParams,
    defaultPlaceholder: t("Upload.placeholder"),
  });
  const localizedUploadTip = preferLocalizedEnAr(
    isAr,
    typeof uploadTipEn === "string" ? uploadTipEn : undefined,
    typeof uploadTipAr === "string" ? uploadTipAr : undefined,
  );
  const localizedReuploadTooltip = preferLocalizedEnAr(
    isAr,
    typeof reuploadTooltipEn === "string" ? reuploadTooltipEn : undefined,
    typeof reuploadTooltipAr === "string" ? reuploadTooltipAr : undefined,
  );
  const isDisabled =
    !!props?.disabled ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    field?.pattern === "disabled";

  return (
    <DocumentViewer
      value={value}
      onChange={onChange}
      hasView={true}
      hasDownload={true}
      {...props}
      label={localizedLabel || props.label}
      disabled={isDisabled}
      hasDelete={!isDisabled}
      reuploadTooltip={localizedReuploadTooltip || props.reuploadTooltip}
      uploadConfig={{
        maxCount: 1,
        placeholder: resolvedPlaceholder,
        uploadTip: localizedUploadTip || props.uploadTip || "",
        maxSize,
        accept,
        invalidFileTypeMessage: t("Upload.validation.invalidFileType", {
          types: acceptLabel,
        }),
        maxSizeErrorMessage: t("Upload.validation.maxSize", { max: maxSize }),
        customRequest: uploadFile,
      }}
    />
  );
};

export const UploadDom = connect(UploadComponent);

export default UploadDom;
