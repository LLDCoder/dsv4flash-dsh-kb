import React, { useEffect, useMemo, useState } from "react";
import {
  isPdfFile,
  resolveDocumentAccessUrl,
} from "@/utils/pdfPreview";
import PdfPreviewModal from "@/components/common/PdfPreviewModal";
import CustomImagePreviewModal from "@/components/common/CustomImagePreviewModal";
import "./index.less";

export interface PreviewModalProps {
  fileData: { url: string; name: string; filePath?: string };
  visible: boolean;
  onCancel: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  fileData,
  visible,
  onCancel,
}) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const imagePreviewUrl = useMemo(
    () => resolveDocumentAccessUrl(previewUrl),
    [previewUrl],
  );

  useEffect(() => {
    if (!visible) return;

    setPreviewUrl(fileData.url);
    setIsPdf(isPdfFile(fileData.name, fileData.filePath, fileData.url));
  }, [fileData.filePath, fileData.name, fileData.url, visible]);

  return (
    <>
      <CustomImagePreviewModal
        visible={visible && !isPdf}
        src={imagePreviewUrl}
        fileName={fileData.name}
        onCancel={onCancel}
      />

      <PdfPreviewModal
        visible={visible && isPdf}
        fileUrl={fileData.url}
        fileName={fileData.name}
        filePath={fileData.filePath}
        onCancel={onCancel}
        modalProps={{
          className: "pdf-preview-modal--fullscreen",
        }}
      />
    </>
  );
};

export default PreviewModal;
