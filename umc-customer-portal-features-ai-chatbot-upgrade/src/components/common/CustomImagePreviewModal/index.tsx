import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import {
  CloseOutlined,
  DownloadOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import "./index.less";

export interface CustomImagePreviewModalProps {
  visible: boolean;
  src?: string;
  fileName?: string;
  onCancel: () => void;
}

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;
const MP4_FILE_PATTERN = /\.mp4(?:$|[?#&])/i;

const isMp4File = (...values: Array<string | undefined>) =>
  values.some((value) => {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return false;
    }

    try {
      return (
        MP4_FILE_PATTERN.test(normalizedValue) ||
        MP4_FILE_PATTERN.test(decodeURIComponent(normalizedValue))
      );
    } catch {
      return MP4_FILE_PATTERN.test(normalizedValue);
    }
  });

const getFallbackFileName = (src: string) => {
  try {
    const url = new URL(src, window.location.href);
    const pathName = url.pathname.split("/").filter(Boolean).pop();
    return pathName || "image";
  } catch {
    const pathName = src.split(/[/?#]/).filter(Boolean).pop();
    return pathName || "image";
  }
};

const CustomImagePreviewModal: React.FC<CustomImagePreviewModalProps> = ({
  visible,
  src,
  fileName,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [mediaFailed, setMediaFailed] = useState(false);

  const mediaSrc = useMemo(
    () => (typeof src === "string" ? src.trim() : ""),
    [src],
  );
  const isVideo = useMemo(
    () => isMp4File(fileName, mediaSrc),
    [fileName, mediaSrc],
  );
  const canZoomOut =
    !isVideo && Boolean(mediaSrc) && !mediaFailed && scale > MIN_SCALE;
  const canZoomIn =
    !isVideo && Boolean(mediaSrc) && !mediaFailed && scale < MAX_SCALE;
  const canDownload = Boolean(mediaSrc);

  useEffect(() => {
    setScale(DEFAULT_SCALE);
    setMediaFailed(false);
  }, [mediaSrc, visible]);

  const handleZoomOut = () => {
    if (!canZoomOut) return;
    setScale((current) => Math.max(MIN_SCALE, current - SCALE_STEP));
  };

  const handleZoomIn = () => {
    if (!canZoomIn) return;
    setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP));
  };

  const handleDownload = () => {
    if (!mediaSrc || typeof document === "undefined") return;

    const link = document.createElement("a");
    link.href = mediaSrc;
    link.download = fileName || getFallbackFileName(mediaSrc);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      visible={visible}
      footer={null}
      closable={false}
      title={null}
      width="100vw"
      centered
      destroyOnClose
      maskClosable
      wrapClassName="custom-image-preview-modal"
      className="custom-image-preview-modal__dialog"
      bodyStyle={{ padding: 0 }}
      maskStyle={{ background: "rgba(0, 0, 0, 0.58)" }}
      onCancel={onCancel}
    >
      <button
        type="button"
        className="custom-image-preview-modal__close"
        aria-label={t("previewModal.closePreview")}
        onClick={onCancel}
      >
        <CloseOutlined />
      </button>

      <div className="custom-image-preview-modal__stage">
        {mediaSrc && !mediaFailed ? (
          isVideo ? (
            <video
              src={mediaSrc}
              controls
              playsInline
              preload="metadata"
              aria-label={fileName || t("previewModal.videoPreview")}
              className="custom-image-preview-modal__video"
              onError={() => setMediaFailed(true)}
            />
          ) : (
            <img
              src={mediaSrc}
              alt={fileName || t("previewModal.imagePreview")}
              className="custom-image-preview-modal__image"
              style={{ transform: `scale(${scale})` }}
              onError={() => setMediaFailed(true)}
            />
          )
        ) : (
          <div className="custom-image-preview-modal__empty">
            {mediaSrc
              ? isVideo
                ? t("previewModal.videoPreviewFailed")
                : t("previewModal.imagePreviewFailed")
              : isVideo
                ? t("previewModal.noVideoAvailable")
                : t("previewModal.noImageAvailable")}
          </div>
        )}
      </div>

      <div className="custom-image-preview-modal__toolbar">
        {!isVideo ? (
          <>
            <button
              type="button"
              className="custom-image-preview-modal__tool"
              aria-label={t("previewModal.zoomOut")}
              disabled={!canZoomOut}
              onClick={handleZoomOut}
            >
              <MinusCircleOutlined />
            </button>
            <button
              type="button"
              className="custom-image-preview-modal__tool"
              aria-label={t("previewModal.zoomIn")}
              disabled={!canZoomIn}
              onClick={handleZoomIn}
            >
              <PlusCircleOutlined />
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="custom-image-preview-modal__tool"
          aria-label={
            isVideo
              ? t("previewModal.downloadVideo")
              : t("previewModal.downloadImage")
          }
          disabled={!canDownload}
          onClick={handleDownload}
        >
          <DownloadOutlined />
        </button>
      </div>
    </Modal>
  );
};

export default CustomImagePreviewModal;
