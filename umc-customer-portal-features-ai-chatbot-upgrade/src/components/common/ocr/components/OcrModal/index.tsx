import React, { useEffect, useState } from "react";
import { Form } from "antd";
import { useTranslation } from "react-i18next";
import SimpleBar from "@/components/SimpleBar";
import OcrBaseModal from "../OcrBaseModal";
import { OCR_CAPTURE_SOURCE, OCR_STEP, OCR_USE_REAL_CAMERA } from "../../constants";
import { getOcrExampleImage, OCR_DOCUMENT_CONFIG } from "../../data";
import { useOcrFlow } from "../../hooks/useOcrFlow";
import type {
  OcrApplyPayload,
  OcrModalProps,
} from "../../type";
import EntryStep from "./components/EntryStep";
import ErrorStep from "./components/ErrorStep";
import ResultStep from "./components/ResultStep";
import ScanStep from "./components/ScanStep";
import { usePassportOcrNationality } from "./hooks/usePassportOcrNationality";
import type { OcrResultFormValues } from "./type";
import { pickResultFormValues } from "./utils";
import "./index.less";

const OcrModal: React.FC<OcrModalProps> = ({
  visible,
  documentType,
  nationalityList = [],
  onApply,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const [resultForm] = Form.useForm<OcrResultFormValues>();
  const [isApplyingResult, setIsApplyingResult] = useState(false);
  const flow = useOcrFlow({
    visible,
    documentType,
  });

  const documentConfig = OCR_DOCUMENT_CONFIG[documentType];
  const fallbackPreviewImage = getOcrExampleImage(documentType);
  const entryTitle = t(documentConfig.entryTitleKey);
  const scanTitle = t(documentConfig.scanTitleKey);
  const entryNote = t(documentConfig.entryNoteKey);
  const documentTitleLabel =
    documentType === "emiratesId"
      ? t("individualIdentity.verify.emiratesId")
      : t("individualIdentity.verify.passport");

  const {
    nationalityOptions,
    nationalityLoading,
    getVerifiedNationalityId,
  } = usePassportOcrNationality({
    visible,
    documentType,
    step: flow.step,
    result: flow.result,
    fallbackNationalityList: nationalityList,
    isAr,
    form: resultForm,
  });

  useEffect(() => {
    if (!flow.result) {
      resultForm.resetFields();
      return;
    }

    resultForm.resetFields();
    const initialValues = pickResultFormValues(
      flow.result.payload,
      documentConfig.resultFields,
    );

    if (documentType === "passport") {
      initialValues.nationalityId = undefined;
    }

    resultForm.setFieldsValue(initialValues);
  }, [documentConfig.resultFields, documentType, flow.result, resultForm]);

  const handleCancel = () => {
    resultForm.resetFields();
    flow.resetToEntry();
    onClose();
  };

  const handleApply = async () => {
    if (!flow.result) {
      return;
    }

    setIsApplyingResult(true);

    try {
      const formValues = await resultForm.validateFields();
      const payload = {
        ...flow.result.payload,
        ...formValues,
      } as OcrApplyPayload;

      if (documentType === "passport") {
        const selectedNationalityId = getVerifiedNationalityId(
          formValues.nationalityId,
        );

        if (selectedNationalityId !== undefined) {
          payload.nationalityId = selectedNationalityId;
        } else {
          delete payload.nationalityId;
        }
      }

      onApply(payload, { previewFileType: flow.previewFileType });
      resultForm.resetFields();
      flow.resetToEntry();
      onClose();
    } finally {
      setIsApplyingResult(false);
    }
  };

  const modalWidth =
    flow.step === OCR_STEP.ENTRY
      ? 960
      : flow.step === OCR_STEP.SCAN
        ? "calc(100vw - 128px)"
        : flow.step === OCR_STEP.ERROR
          ? 720
          : 880;

  const modalClassName = [
    "identity-ocr-modal",
    `identity-ocr-modal--${flow.step}`,
    `identity-ocr-modal--${documentType}`,
    flow.step === OCR_STEP.SCAN ? "identity-ocr-modal--size-scan-fullscreen" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderScene = () => {
    if (flow.step === OCR_STEP.ENTRY) {
      return (
        <EntryStep
          documentLabel={documentTitleLabel}
          entryTitle={entryTitle}
          entryNote={entryNote}
          documentPreviewImage={fallbackPreviewImage}
          cameraButtonText={t("ocr.actions.scanByCamera", {
            document: documentType === "emiratesId" ? "EID" : documentTitleLabel,
          })}
          uploadButtonText={t("ocr.actions.uploadDocument", {
            document: documentType === "emiratesId" ? "EID" : documentTitleLabel,
          })}
          orText={t("ocr.entry.or")}
          canInteract={!flow.isBusy}
          uploadLoading={
            flow.pendingSource === OCR_CAPTURE_SOURCE.UPLOAD &&
            (flow.isUploading || flow.isRecognizing)
          }
          cameraLoading={flow.isStartingCamera}
          onStartCamera={() => {
            void flow.startCamera();
          }}
          onChooseFile={flow.triggerChooseImage}
        />
      );
    }

    if (flow.step === OCR_STEP.SCAN) {
      return (
        <ScanStep
          stageLabel={t("ocr.scan.stageLabel")}
          scanTitle={scanTitle}
          description={t("ocr.scan.description")}
          cancelText={t("ocr.actions.cancel")}
          captureText={t("ocr.actions.capturePhoto")}
          capturedPreviewUrl={flow.capturedPreviewUrl}
          useMockPreview={!OCR_USE_REAL_CAMERA}
          captureLoading={
            flow.isCapturing ||
            (flow.pendingSource === OCR_CAPTURE_SOURCE.CAMERA &&
              (flow.isUploading || flow.isRecognizing))
          }
          disabled={flow.isBusy}
          onCancel={handleCancel}
          onCapture={() => {
            void flow.capturePhoto();
          }}
          videoRef={flow.videoRef}
          frameVideoRef={flow.frameVideoRef}
        />
      );
    }

    if (flow.step === OCR_STEP.ERROR) {
      return (
        <ErrorStep
          title={t("ocr.errors.cameraUnavailableTitle")}
          description={t("ocr.errors.cameraUnavailableDescription")}
          confirmText={t("ocr.actions.ok")}
          onConfirm={flow.resetToEntry}
        />
      );
    }

    return (
      <ResultStep
        documentType={documentType}
        documentLabel={documentTitleLabel}
        previewUrl={flow.previewUrl}
        previewFileName={flow.previewFileName}
        previewFileType={flow.previewFileType}
        fallbackPreviewImage={fallbackPreviewImage}
        warnings={flow.result?.warnings ?? []}
        form={resultForm}
        fieldConfigs={documentConfig.resultFields}
        nationalityOptions={nationalityOptions}
        nationalityLoading={nationalityLoading}
        isApplyingResult={isApplyingResult}
        onCancel={handleCancel}
        onConfirm={() => {
          void handleApply();
        }}
        cancelText={t("ocr.actions.cancel")}
      />
    );
  };

  return (
    <OcrBaseModal
      visible={visible}
      width={modalWidth}
      className={modalClassName}
      onCancel={handleCancel}
    >
      <input
        ref={flow.fileInputRef}
        type="file"
        accept={flow.uploadAccept}
        style={{ display: "none" }}
        onChange={flow.handleFileChange}
      />
      <SimpleBar className="identity-ocr-modal__scroll">
        <div className="identity-ocr-modal__content">{renderScene()}</div>
      </SimpleBar>
    </OcrBaseModal>
  );
};

export default OcrModal;
