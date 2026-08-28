import * as React from "react";
import { useState, useCallback } from "react";
import { observer, useField } from "@formily/react";
import type { Field } from "@formily/core";
import { Upload, Card } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { useTranslation } from "react-i18next";
import CustomImagePreviewModal from "@/components/common/CustomImagePreviewModal";
import CustomMessage from "@/components/common/CustomMessage";
import "./styles.less";
import FieldDecoratorTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip/FieldDecoratorTooltip";
import { resolveTrustedFilePreviewUrl } from "@/utils/security/externalDestinations";
interface FileItem {
  uid: string;
  name: string;
  status: "done" | "uploading" | "error";
  url?: string;
  thumbUrl?: string;
  type?: string;
  size?: number;
}

interface FileUploadGridValue {
  fileList?: FileItem[];
}

interface FileUploadGridFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: string | null;
  maxImages?: number;
  addButtonLabel?: React.ReactNode;
}

type FileUploadGridFormilyField = Field<
  never,
  never,
  unknown,
  FileUploadGridValue | undefined
>;

const isImageFile = (fileName: string) => {
  const extension = fileName.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension || "");
};

const normalizeFileStatus = (status?: UploadFile["status"]): FileItem["status"] => {
  if (status === "uploading" || status === "error") {
    return status;
  }
  return "done";
};

export const FileUploadGridField: React.FC<FileUploadGridFieldProps> = observer((props) => {
  const { t } = useTranslation();
  const {
    title,
    description,
    maxImages: maxImagesProp,
    addButtonLabel,
    ...restProps
  } = props;
  const maxImages =
    typeof maxImagesProp === "number" && Number.isFinite(maxImagesProp)
      ? maxImagesProp
      : Number.POSITIVE_INFINITY;
  const field = useField<FileUploadGridFormilyField>();
  const current = React.useMemo<FileUploadGridValue>(() => {
    if (field.value && typeof field.value === "object") {
      return field.value;
    }
    return {};
  }, [field.value]);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const fileList = React.useMemo(
    () => (Array.isArray(current.fileList) ? current.fileList : []),
    [current.fileList],
  );

  const handleFieldChange = useCallback(
    (value: FileItem[]) => {
      field.setValue({
        ...current,
        fileList: value,
      });
    },
    [current, field],
  );

  const handlePreview = useCallback(async (file: FileItem) => {
    if (!file.url && !file.thumbUrl) {
      return;
    }

    if (isImageFile(file.name)) {
      setPreviewImage(file.url || file.thumbUrl || "");
      setPreviewVisible(true);
      setPreviewTitle(file.name);
    } else {
      const trustedPreviewUrl = resolveTrustedFilePreviewUrl(file.url);
      if (trustedPreviewUrl) {
        window.open(trustedPreviewUrl, "_blank", "noopener,noreferrer");
      }
    }
  }, []);

  const antdFileList: UploadFile[] = fileList.map((f) => ({
    uid: f.uid,
    name: f.name,
    status: f.status,
    url: f.url,
    thumbUrl: f.thumbUrl,
    type: f.type,
    size: f.size,
  }));

  const handleRemove = useCallback(
    (file: FileItem) => {
      const newFileList = fileList.filter((item) => item.uid !== file.uid);
      handleFieldChange(newFileList);
    },
    [fileList, handleFieldChange],
  );

  const handleChange: UploadProps["onChange"] = useCallback(
    ({ fileList: newFileList }) => {
      const processedFileList: FileItem[] = newFileList.map((file: UploadFile) => ({
        uid: file.uid,
        name: file.name,
        status: normalizeFileStatus(file.status),
        url: file.response?.url || file.url,
        thumbUrl: file.thumbUrl,
        type: file.type,
        size: file.size,
      }));

      handleFieldChange(processedFileList);
    },
    [handleFieldChange],
  );

  const beforeUpload = useCallback((file: File) => {
    const isValidSize = file.size / 1024 / 1024 < 10;
    if (!isValidSize) {
      CustomMessage.error(
        t("FileUploadGrid.validation.maxFileSize", { size: 10 }),
      );
      return false;
    }
    return true;
  }, [t]);

  const customRequest = useCallback<NonNullable<UploadProps["customRequest"]>>(({ file, onSuccess }) => {
    setTimeout(() => {
      const uploadFile = file as File;
      const mockUrl = URL.createObjectURL(uploadFile);
      onSuccess?.({
        url: mockUrl,
        name: uploadFile.name,
      });
    }, 1000);
  }, []);

  return (
    <div className="file-upload-grid-container" {...restProps}>
      <Card
        className="file-upload-grid-card"
        title={
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <span>{title}</span>
            <FieldDecoratorTooltip
              fallbackContent={
                typeof description === "string" ? description : null
              }
              placement="top"
            />
          </span>
        }
      >
        <Upload
          listType="picture-card"
          fileList={antdFileList}
          onChange={handleChange}
          beforeUpload={beforeUpload}
          customRequest={customRequest}
          accept="image/*,.pdf,.doc,.docx,.txt"
          onPreview={(file) =>
            handlePreview({
              uid: file.uid,
              name: file.name,
              status: normalizeFileStatus(file.status),
              url: file.url || file.thumbUrl,
              thumbUrl: file.thumbUrl,
              type: file.type,
              size: file.size,
            })
          }
          onRemove={(file) => {
            handleRemove({
              uid: file.uid,
              name: file.name,
              status: normalizeFileStatus(file.status),
              url: file.url,
              thumbUrl: file.thumbUrl,
              type: file.type,
              size: file.size,
            });
            return true;
          }}
        >
          {antdFileList.length >= maxImages ? null : (
            <div className="FileUpload-span">{addButtonLabel}</div>
          )}
        </Upload>

        <CustomImagePreviewModal
          visible={previewVisible}
          src={previewImage}
          fileName={previewTitle}
          onCancel={() => setPreviewVisible(false)}
        />
      </Card>
    </div>
  );
});
