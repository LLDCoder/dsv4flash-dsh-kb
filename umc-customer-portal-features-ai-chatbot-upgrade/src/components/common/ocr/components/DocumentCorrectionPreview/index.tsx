import React from "react";
import { Spin } from "antd";
import type { OcrPreviewFileType } from "../../type";
import { useDocumentCorrectionPreview } from "./useDocumentCorrectionPreview";
import "./index.less";

interface DocumentCorrectionPreviewProps {
  fileUrl: string;
  fileName?: string;
  fileType: OcrPreviewFileType;
  documentLabel: string;
  fallbackPreviewImage: string;
}

const DocumentCorrectionPreview: React.FC<
  DocumentCorrectionPreviewProps
> = ({
  fileUrl,
  fileName,
  fileType,
  documentLabel,
  fallbackPreviewImage,
}) => {
  const { previewUrl, previewErrorFallbackUrl, isProcessing } =
    useDocumentCorrectionPreview({
      fileUrl,
      fileType,
      fallbackPreviewImage,
    });
  return (
    <div className="identity-ocr-document-preview">
      <div
        className="identity-ocr-document-preview__frame"
        aria-label={fileName || documentLabel}
        aria-busy={isProcessing}
      >
        {previewUrl ? (
          <img
            key={previewUrl}
            className="identity-ocr-document-preview__image"
            src={previewUrl}
            alt={documentLabel}
            onError={(event) => {
              const fallbackStage = Number(
                event.currentTarget.dataset.fallbackStage || 0,
              );

              if (
                fallbackStage === 0 &&
                previewErrorFallbackUrl &&
                previewErrorFallbackUrl !== fallbackPreviewImage
              ) {
                event.currentTarget.dataset.fallbackStage = "1";
                event.currentTarget.src = previewErrorFallbackUrl;
                return;
              }

              if (fallbackStage < 2 && fallbackPreviewImage) {
                event.currentTarget.dataset.fallbackStage = "2";
                event.currentTarget.src = fallbackPreviewImage;
              }
            }}
          />
        ) : null}
        {isProcessing ? (
          <div className="identity-ocr-document-preview__loading">
            <Spin size="large" />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DocumentCorrectionPreview;
