import React from "react";
import { CameraOutlined } from "@ant-design/icons";
import CustomButton from "@/components/common/CustomButton";
import type { ScanStepProps } from "../../type";
import "./index.less";

const ScanStep: React.FC<ScanStepProps> = ({
  stageLabel,
  scanTitle,
  description,
  cancelText,
  captureText,
  captureLoading,
  capturedPreviewUrl,
  disabled,
  useMockPreview,
  onCancel,
  onCapture,
  videoRef,
  frameVideoRef,
}) => (
  <div className="identity-ocr-modal__scene identity-ocr-modal__scene--scan">
    <div className="identity-ocr-modal__scan-stage-label">{stageLabel}</div>
    <div className="identity-ocr-modal__scan-copy">
      <h3 className="identity-ocr-modal__scan-title">{scanTitle}</h3>
      <p className="identity-ocr-modal__scan-description">{description}</p>
    </div>
    <div className="identity-ocr-modal__scan-surface">
      {!useMockPreview && (
        <video
          ref={videoRef}
          className="identity-ocr-modal__video identity-ocr-modal__video--background"
          muted
          autoPlay
          playsInline
        />
      )}
      {capturedPreviewUrl && (
        <img
          src={capturedPreviewUrl}
          alt=""
          aria-hidden="true"
          className="identity-ocr-modal__captured-image identity-ocr-modal__captured-image--background"
        />
      )}
      <div className="identity-ocr-modal__scan-surface-overlay" />
      <div className="identity-ocr-modal__scan-frame">
        {!useMockPreview && (
          <video
            ref={frameVideoRef}
            className="identity-ocr-modal__video identity-ocr-modal__video--frame"
            muted
            autoPlay
            playsInline
          />
        )}
        {capturedPreviewUrl && (
          <img
            src={capturedPreviewUrl}
            alt=""
            aria-hidden="true"
            className="identity-ocr-modal__captured-image identity-ocr-modal__captured-image--frame"
          />
        )}
        <div className="identity-ocr-modal__scan-frame-outline" />
      </div>
    </div>
    <div className="identity-ocr-modal__actions identity-ocr-modal__actions--scan">
      <CustomButton
        variant="outline"
        text={cancelText}
        disabled={disabled}
        customClassName="identity-ocr-modal__action-button identity-ocr-modal__action-button--outline"
        onClick={onCancel}
      />
      <CustomButton
        variant="gold"
        icon={<CameraOutlined />}
        text={captureText}
        loading={captureLoading}
        disabled={disabled}
        customClassName="identity-ocr-modal__action-button identity-ocr-modal__action-button--primary"
        onClick={onCapture}
      />
    </div>
  </div>
);

export default ScanStep;
