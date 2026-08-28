import type { Field, FieldValidator } from "@formily/core";
import { observer, useField, useForm } from "@formily/react";
import { Input, Radio } from "antd";
import type { RadioChangeEvent } from "antd/lib/radio";
import type { RcFile } from "antd/lib/upload";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";
import CustomMessage from "@/components/common/CustomMessage";
import DocumentViewer from "@/components/common/DocumentViewer";
import {
  useFormLanguageHost,
  useFormPreviewLang,
} from "@/components/designable/playground/FormPreviewLangContext";
import i18n from "@/localization/config";
import {
  fileUpload,
  getDocumentUploadResponseUrl,
} from "@/services/media";
import {
  DEFAULT_DRAFT_FILE_OR_LINK_TYPE,
  isDraftFileOrLinkType,
  resolveDraftFileOrLinkTypeFieldName,
  type DraftFileOrLinkType,
} from "./schemaContract";
import "./styles.less";

const DEFAULT_FILE_FORMATS = ["JPG", "JPEG", "PNG", "PDF", "DOCX", "MP4"];
const FILE_FORMAT_TO_ACCEPT: Record<string, string> = {
  JPG: ".jpg",
  JPEG: ".jpeg",
  PNG: ".png",
  PDF: ".pdf",
  DOCX: ".docx",
  MP4: ".mp4",
};
const DEFAULT_FILE_SIZE_LIMIT = 5;
const MAX_LINK_LENGTH = 2000;

export interface DraftFileOrLinkFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  fileFormat?: string[];
  fileSizeLimit?: number;
  disabled?: boolean;
  readOnly?: boolean;
  title?: string;
  titleEn?: string;
  titleAr?: string;
}

type FieldWithDesignable = Field & {
  designable?: boolean;
};

interface ValidationContext {
  form: ReturnType<typeof useForm>;
  typePath: string;
  invalidUrlMessage: string;
}

const getSiblingPath = (address: string, siblingName: string) => {
  const segments = address.split(".");
  segments[segments.length - 1] = siblingName;
  return segments.join(".");
};

const toValidatorList = (
  validator: FieldValidator | undefined,
): Exclude<FieldValidator, unknown[]>[] => {
  if (!validator) return [];
  return (Array.isArray(validator) ? validator : [validator]) as Exclude<
    FieldValidator,
    unknown[]
  >[];
};

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeFileFormats = (fileFormat?: string[]) => {
  const configured = Array.isArray(fileFormat)
    ? fileFormat
        .map((format) => String(format).trim().toUpperCase())
        .filter((format) => Boolean(FILE_FORMAT_TO_ACCEPT[format]))
    : [];
  return configured.length > 0 ? configured : DEFAULT_FILE_FORMATS;
};

const normalizeFileSizeLimit = (value?: number) =>
  Math.min(
    100,
    Math.max(
      1,
      Number.isFinite(value) ? Number(value) : DEFAULT_FILE_SIZE_LIMIT,
    ),
  );

export const DraftFileOrLinkField = observer(
  ({
    value = "",
    onChange,
    fileFormat,
    fileSizeLimit,
    disabled = false,
    readOnly = false,
  }: DraftFileOrLinkFieldProps) => {
    const field = useField<FieldWithDesignable>();
    const form = useForm();
    const language = useFormPreviewLang();
    const host = useFormLanguageHost();
    const locale = language.toLowerCase().startsWith("ar") ? "ar" : "en";
    const address = field.address.toString();
    const valueFieldName = address.split(".").at(-1) || "draftFileOrLink";
    const typeFieldName = resolveDraftFileOrLinkTypeFieldName(valueFieldName);
    const typePath = getSiblingPath(address, typeFieldName);
    const storedType = form.getValuesIn(typePath);
    const selectedType = isDraftFileOrLinkType(storedType)
      ? storedType
      : DEFAULT_DRAFT_FILE_OR_LINK_TYPE;
    const isDesigner = host === "designer" || Boolean(field.designable);
    const isReadOnly =
      readOnly ||
      disabled ||
      field.pattern === "readOnly" ||
      field.pattern === "readPretty" ||
      field.pattern === "disabled" ||
      form.pattern === "readOnly" ||
      form.pattern === "readPretty" ||
      form.pattern === "disabled";
    const interactionDisabled = isDesigner || isReadOnly;
    const allowedFormats = useMemo(
      () => normalizeFileFormats(fileFormat),
      [fileFormat],
    );
    const accept = useMemo(
      () =>
        allowedFormats
          .map((format) => FILE_FORMAT_TO_ACCEPT[format])
          .join(","),
      [allowedFormats],
    );
    const maxSize = normalizeFileSizeLimit(fileSizeLimit);
    const linkLabel = String(
      i18n.t("DraftFileOrLink.linkLabel", { lng: locale }),
    );
    const fileLabel = String(
      i18n.t("DraftFileOrLink.fileLabel", { lng: locale }),
    );
    const linkPlaceholder = String(
      i18n.t("DraftFileOrLink.linkPlaceholder", { lng: locale }),
    );
    const uploadPlaceholder = String(
      i18n.t("DraftFileOrLink.uploadPlaceholder", { lng: locale }),
    );
    const invalidUrlMessage = String(
      i18n.t("DraftFileOrLink.invalidUrl", { lng: locale }),
    );
    const invalidFileTypeMessage = String(
      i18n.t("DraftFileOrLink.invalidFileType", { lng: locale }),
    );
    const uploadFailedMessage = String(
      i18n.t("DraftFileOrLink.uploadFailed", { lng: locale }),
    );
    const validationContextRef = useRef<ValidationContext>({
      form,
      typePath,
      invalidUrlMessage,
    });
    const urlValidatorRef = useRef<((value: unknown) => string) | undefined>();

    validationContextRef.current = {
      form,
      typePath,
      invalidUrlMessage,
    };

    useEffect(() => {
      if (!isDraftFileOrLinkType(form.getValuesIn(typePath))) {
        form.setValuesIn(typePath, DEFAULT_DRAFT_FILE_OR_LINK_TYPE);
      }
    }, [form, typePath]);

    if (!urlValidatorRef.current) {
      urlValidatorRef.current = (candidate: unknown) => {
        const context = validationContextRef.current;
        if (context.form.getValuesIn(context.typePath) !== "link") return "";

        const normalized = String(candidate ?? "").trim();
        if (!normalized) return "";
        return isHttpUrl(normalized) ? "" : context.invalidUrlMessage;
      };
    }

    useEffect(() => {
      const originalValidator = field.validator;
      const urlValidator = urlValidatorRef.current;
      if (!urlValidator) return;

      field.setValidator([...toValidatorList(originalValidator), urlValidator]);
      return () => {
        const remainingValidators = toValidatorList(field.validator).filter(
          (validator) => validator !== urlValidator,
        );
        field.setValidator(remainingValidators);
      };
    }, [field]);

    const setMainValue = useCallback(
      (nextValue: string) => {
        if (onChange) {
          onChange(nextValue);
        } else {
          field.setValue(nextValue);
        }
      },
      [field, onChange],
    );

    const handleTypeChange = (event: RadioChangeEvent) => {
      const nextType = event.target.value as DraftFileOrLinkType;
      if (!isDraftFileOrLinkType(nextType) || nextType === selectedType) return;

      form.setValuesIn(typePath, nextType);
      setMainValue("");
      field.setSelfErrors([]);
      field.modify();
    };

    const handleLinkChange = (event: ChangeEvent<HTMLInputElement>) => {
      setMainValue(event.target.value.trim());
    };

    const handleLinkBlur = () => {
      const normalized = String(value ?? "").trim();
      if (normalized !== value) {
        setMainValue(normalized);
      }
      void field.validate("onBlur").catch(() => undefined);
    };

    const handleBeforeUpload = useCallback(
      (file: RcFile) => {
        const extension = file.name.split(".").at(-1)?.toUpperCase() || "";
        if (allowedFormats.includes(extension)) return true;

        CustomMessage.error(invalidFileTypeMessage);
        return false;
      },
      [allowedFormats, invalidFileTypeMessage],
    );

    const handleUpload = useCallback(
      async (options: {
        file: File;
        onSuccess?: (url: string) => void;
        onError?: (error: unknown) => void;
      }) => {
        const formData = new FormData();
        formData.append("files", options.file);
        try {
          const response = await fileUpload(formData);
          const fileUrl = getDocumentUploadResponseUrl(response);
          if (!fileUrl) {
            throw new Error("Upload response did not include a file URL.");
          }
          options.onSuccess?.(fileUrl);
        } catch (error) {
          console.error("DraftFileOrLink upload failed:", error);
          CustomMessage.error(uploadFailedMessage);
          options.onError?.(error);
        }
      },
      [uploadFailedMessage],
    );

    return (
      <div className="draft-file-or-link">
        <div className="draft-file-or-link__type-selector">
          <Radio.Group
            value={selectedType}
            disabled={interactionDisabled}
            onChange={handleTypeChange}
          >
            <Radio value="link">{linkLabel}</Radio>
            <Radio value="file">{fileLabel}</Radio>
          </Radio.Group>
        </div>

        <div className="draft-file-or-link__control">
          {selectedType === "link" ? (
            isReadOnly ? (
              value ? (
                isHttpUrl(value) ? (
                  <a
                    className="draft-file-or-link__readonly-link"
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                  >
                    {value}
                  </a>
                ) : (
                  <span
                    className="draft-file-or-link__readonly-value"
                    dir="ltr"
                  >
                    {value}
                  </span>
                )
              ) : null
            ) : (
              <Input
                className="draft-file-or-link__link-input"
                value={value}
                placeholder={linkPlaceholder}
                maxLength={MAX_LINK_LENGTH}
                disabled={interactionDisabled}
                allowClear
                type="url"
                dir="ltr"
                onChange={handleLinkChange}
                onBlur={handleLinkBlur}
              />
            )
          ) : (
            <DocumentViewer
              className="draft-file-or-link__file-viewer"
              value={value}
              onChange={(nextValue) =>
                setMainValue(
                  Array.isArray(nextValue)
                    ? String(nextValue[0] ?? "")
                    : nextValue,
                )
              }
              disabled={interactionDisabled}
              hasView
              hasDownload={isReadOnly}
              hasDelete={!isReadOnly && !isDesigner}
              uploadConfig={
                isReadOnly
                  ? undefined
                  : {
                      maxCount: 1,
                      maxSize,
                      accept,
                      placeholder: uploadPlaceholder,
                      uploadTip: "",
                      customRequest: handleUpload,
                      beforeUpload: handleBeforeUpload,
                      invalidFileTypeMessage,
                    }
              }
            />
          )}
        </div>
      </div>
    );
  },
);
