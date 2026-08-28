import type { ReactNode } from "react";
import OcrTrigger from "../OcrTrigger";
import "./index.less";

export interface OcrInputProps {
  children: ReactNode;
  ocrDisabled?: boolean;
  onOcrClick?: () => void;
  ocrTitle?: string;
}

const OcrInput = ({
  children,
  ocrDisabled = false,
  onOcrClick,
  ocrTitle,
}: OcrInputProps) => (
  <div className={`ocr-input${onOcrClick ? " ocr-input--with-trigger" : ""}`}>
    {children}
    {onOcrClick && (
      <span className="ocr-input__trigger">
        <OcrTrigger
          disabled={ocrDisabled}
          title={ocrTitle}
          onClick={onOcrClick}
        />
      </span>
    )}
  </div>
);

export default OcrInput;
