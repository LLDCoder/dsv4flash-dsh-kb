import React from "react";
import { UploadOutlined } from "@ant-design/icons";
import CustomButton from "@/components/common/CustomButton";
import ScanIcon from "@/assets/images/ocr/Scan.svg";
import type { EntryStepProps } from "../../type";
import "./index.less";

const EntryStep: React.FC<EntryStepProps> = ({
  documentLabel,
  entryTitle,
  entryNote,
  documentPreviewImage,
  cameraButtonText,
  uploadButtonText,
  orText,
  canInteract,
  uploadLoading,
  cameraLoading,
  onStartCamera,
  onChooseFile,
}) => (
  <div className="identity-ocr-modal__scene identity-ocr-modal__scene--entry">
    <div className="identity-ocr-modal__intro">
      <h3 className="identity-ocr-modal__title">{entryTitle}</h3>
      <div className="identity-ocr-modal__document-preview">
        <img
          className="identity-ocr-modal__document-preview-image"
          src={documentPreviewImage}
          alt={documentLabel}
          width={270}
          height={176}
        />
      </div>
    </div>
    <div className="identity-ocr-modal__actions identity-ocr-modal__actions--entry">
      <CustomButton
        variant="outline"
        icon={ScanIcon}
        text={cameraButtonText}
        loading={cameraLoading}
        disabled={!canInteract}
        customClassName="identity-ocr-modal__action-button identity-ocr-modal__action-button--outline"
        onClick={onStartCamera}
      />
      <div className="identity-ocr-modal__divider">
        <span>{orText}</span>
      </div>
      <CustomButton
        variant="gold"
        icon={<UploadOutlined />}
        text={uploadButtonText}
        loading={uploadLoading}
        disabled={!canInteract}
        customClassName="identity-ocr-modal__action-button identity-ocr-modal__action-button--primary"
        onClick={onChooseFile}
      />
      <div className="identity-ocr-modal__footer-note">{entryNote}</div>
    </div>
  </div>
);

export default EntryStep;
