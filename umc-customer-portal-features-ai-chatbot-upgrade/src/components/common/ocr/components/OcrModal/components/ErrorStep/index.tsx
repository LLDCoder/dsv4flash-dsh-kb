import React from "react";
import { ExclamationCircleFilled } from "@ant-design/icons";
import CustomButton from "@/components/common/CustomButton";
import type { ErrorStepProps } from "../../type";
import "./index.less";

const ErrorStep: React.FC<ErrorStepProps> = ({
  title,
  description,
  confirmText,
  onConfirm,
}) => (
  <div className="identity-ocr-modal__scene identity-ocr-modal__scene--error">
    <div className="identity-ocr-modal__error">
      <div className="identity-ocr-modal__error-icon">
        <ExclamationCircleFilled className="identity-ocr-modal__error-icon-mark" />
      </div>
      <h3 className="identity-ocr-modal__title">{title}</h3>
      <p className="identity-ocr-modal__description">{description}</p>
    </div>
    <div className="identity-ocr-modal__actions identity-ocr-modal__actions--error">
      <CustomButton
        variant="danger-outline"
        text={confirmText}
        customClassName="identity-ocr-modal__action-button identity-ocr-modal__action-button--single"
        onClick={onConfirm}
        customStyle={{ width: 160 }}
      />
    </div>
  </div>
);

export default ErrorStep;
