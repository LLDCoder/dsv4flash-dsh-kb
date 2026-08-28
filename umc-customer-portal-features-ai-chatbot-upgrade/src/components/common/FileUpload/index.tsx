import React, { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Input } from "antd";
import ViewIcon from "@/assets/icons/document-viewer/view.svg";
import UploadCloud from "@/assets/images/uploadCloud.png";
import DisableUploadCloud from "@/assets/images/disableUploadCloud.svg";
import FileJpg from "@/assets/images/FileJpg.svg";
import FileJpeg from "@/assets/images/FileJpeg.svg";
import FilePdf from "@/assets/images/FilePdf.svg";
import FilePng from "@/assets/images/FilePng.svg";
import FileVideo from "@/assets/images/movies.svg";
import TrashIcon from "@/assets/images/Trash.svg";
import "./index.less";
import CustomMessage from "../CustomMessage";
import type { RcFile } from "antd/lib/upload";
import type {
  UploadProgressEvent,
  UploadRequestError,
  UploadRequestOption,
} from "rc-upload/lib/interface";
import { useTranslation } from "react-i18next";
import {
  resolveFileIconType,
  type FileIconType,
} from "../fileIconType";

export interface FileItem {
  url: string;
  name: string;
}

interface FileUploadBaseProps {
  value?: FileItem[];
  onChange?: (files: FileItem[]) => void;
  maxCount?: number;
  maxSize?: number; // MB
  accept?: string;
  placeholder?: string;
  uploadTip?: string;
  disabled?: boolean;
  isSingle?: boolean;
  beforeUpload?: (file: RcFile) => boolean;
  onProgress?: (percent: number) => void;
  maxSizeErrorMessage?: string;
  showUploadTip?: boolean;
  onPreview?: (file: FileItem) => void;
}

type FileUploadProps = FileUploadBaseProps &
  (
    | {
        readOnly: true;
        customRequest?: never;
      }
    | {
        readOnly?: false;
        customRequest: (options: UploadRequestOption<string>) => void;
      }
  );

const FILE_ICON_BY_TYPE: Record<FileIconType, string> = {
  pdf: FilePdf,
  jpg: FileJpg,
  jpeg: FileJpeg,
  png: FilePng,
  video: FileVideo,
};

const FileUpload: React.FC<FileUploadProps> = ({
  value = [],
  onChange,
  maxCount = 3,
  maxSize = 5,
  accept = ".jpg,.jpeg,.png,.pdf",
  placeholder,
  uploadTip,
  customRequest,
  disabled = false,
  isSingle = false,
  beforeUpload,
  onProgress,
  maxSizeErrorMessage,
  showUploadTip = true,
  onPreview,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const fileList = value || [];
  const uploadPlaceholder = placeholder || t("formPlaceholders.common.uploadFile");
  const resolvedUploadTip =
    uploadTip ??
    t("common.fileUpload.uploadTip", {
      maxSize,
      fileTypes: "jpg, jpeg, png, pdf",
      maxCount,
    });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearProgressTimer = useCallback(() => {
    if (!progressTimerRef.current) {
      return;
    }

    clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }, []);

  useEffect(() => clearProgressTimer, [clearProgressTimer]);

  const handleDelete = (index: number) => {
    const newFileList = fileList.filter((_, i) => i !== index);
    onChange?.(newFileList);
  };

  const handleUpload = async (options: UploadRequestOption<string>) => {
    const { file, onProgress: optionsOnProgress } = options;
    const uploadFile = file as RcFile;

    if (!customRequest) {
      options.onError?.(new Error());
      return;
    }

    if (uploadFile.size / 1024 / 1024 > maxSize) {
      console.error(`File size exceeds ${maxSize}MB`);
      CustomMessage.error(
        maxSizeErrorMessage ||
          t("common.fileUpload.fileSizeExceeded", { maxSize }),
      );
      return;
    }

    if (fileList.length >= maxCount) {
      console.error(`Maximum ${maxCount} files allowed`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    clearProgressTimer();

    // Simulate progress from 0 to 80% in 1 second
    let currentProgress = 0;
    const increment = 80 / 10; // 10 steps to reach 80% in 1 second
    const timer = setInterval(() => {
      if (currentProgress < 80) {
        currentProgress += increment;
        if (currentProgress >= 80) {
          currentProgress = 80;
          clearInterval(timer);
          if (progressTimerRef.current === timer) {
            progressTimerRef.current = null;
          }
        }
        setUploadProgress(currentProgress);
        onProgress?.(currentProgress);
      }
    }, 100); // 100ms per step, 10 steps = 1 second
    progressTimerRef.current = timer;

    try {
      // Wait for the upload to complete
      const url = await new Promise<string>((resolve, reject) => {
        customRequest({
          ...options,
          onProgress: (progress: UploadProgressEvent) => {
            // If actual progress is provided, use it
            if (progress && progress.percent) {
              setUploadProgress(progress.percent);
              optionsOnProgress?.(progress);
              onProgress?.(progress.percent);
            }
          },
          onSuccess: (url: string) => resolve(url),
          onError: (error: UploadRequestError | ProgressEvent) => reject(error),
        });
      });

      clearProgressTimer();

      // Animate from 80% to 100% in 1 second
      currentProgress = 80;
      const finalIncrement = 20 / 10; // 10 steps to reach 100% in 1 second
      const finalTimer = setInterval(() => {
        if (currentProgress < 100) {
          currentProgress += finalIncrement;
          if (currentProgress >= 100) {
            currentProgress = 100;
            clearInterval(finalTimer);
            if (progressTimerRef.current === finalTimer) {
              progressTimerRef.current = null;
            }
          }
          setUploadProgress(currentProgress);
          onProgress?.(currentProgress);
        }
      }, 100); // 100ms per step, 10 steps = 1 second
      progressTimerRef.current = finalTimer;

      // Wait for the animation to complete before setting the file
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set the file after the animation
      const newFile: FileItem = {
        url,
        name: uploadFile.name,
      };
      const newFileList = [...fileList, newFile];
      onChange?.(newFileList);
      clearProgressTimer();
      setUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload failed:', error);
      clearProgressTimer();
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const files = fileList.map((file, index) => (
    <div className="file-item" key={index}>
      <img
        src={
          FILE_ICON_BY_TYPE[
            resolveFileIconType({
              fileName: file.name,
              fileUrl: file.url,
              fallback: "jpg",
            })
          ]
        }
        alt="file"
      />
      <span className="file-name">{file.name}</span>
      {onPreview || !readOnly ? (
        <span className="file-actions">
          {onPreview ? (
            <img
              src={ViewIcon}
              alt="view"
              className="file-action-icon"
              onClick={() => onPreview(file)}
            />
          ) : null}
          {!readOnly ? (
            <img
              src={TrashIcon}
              alt="delete"
              className="file-action-icon"
              onClick={() => handleDelete(index)}
            />
          ) : null}
        </span>
      ) : null}
    </div>
  ));

  if (readOnly) {
    return (
      <div className="file-upload-wrapper file-upload-wrapper--read-only">
        {fileList.length > 0 ? <div className="file-list">{files}</div> : null}
      </div>
    );
  }

  return isSingle ? (
    <div className="file-upload-wrapper">
      {fileList.length > 0 ? (
        <div className="file-single">{files}</div>
      ) : (
        <div className="upload-input-wrapper">
          {uploading && (
            <div className="upload-progress">
              <div 
                className="upload-progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          <Upload
              maxCount={maxCount}
              customRequest={handleUpload}
              showUploadList={false}
              accept={accept}
              disabled={disabled || uploading || fileList.length >= maxCount}
              beforeUpload={beforeUpload}
            >
            <Input
              prefix={
                <img
                  src={disabled ? DisableUploadCloud : UploadCloud}
                  alt="upload"
                />
              }
              className="upload-input"
              readOnly
              size="large"
              placeholder={uploadPlaceholder}
              disabled={disabled || fileList.length >= maxCount}
            />
          </Upload>
        </div>
      )}
      {showUploadTip && fileList.length === 0 && resolvedUploadTip ? (
        <div className="upload-tip">{resolvedUploadTip}</div>
      ) : null}
    </div>
  ) : (
    <div className="file-upload-wrapper">
      <div className="upload-input-wrapper">
        {uploading && (
          <div className="upload-progress">
            <div 
              className="upload-progress-bar" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        <Upload
            maxCount={maxCount}
            customRequest={handleUpload}
            showUploadList={false}
            accept={accept}
            disabled={disabled || uploading || fileList.length >= maxCount}
            beforeUpload={beforeUpload}
          >
          <Input
            prefix={
              <img
                src={disabled ? DisableUploadCloud : UploadCloud}
                alt="upload"
              />
            }
            className="upload-input"
            readOnly
            size="large"
            placeholder={uploadPlaceholder}
            disabled={disabled || fileList.length >= maxCount}
          />
        </Upload>
      </div>
      {fileList.length > 0 && <div className="file-list">{files}</div>}
      {showUploadTip && resolvedUploadTip && (
        <div className="upload-tip">{resolvedUploadTip}</div>
      )}
    </div>
  );
};

export default FileUpload;
