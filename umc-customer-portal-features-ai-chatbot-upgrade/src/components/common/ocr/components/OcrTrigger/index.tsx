import React from "react";
import ScanIcon from "@/assets/images/ocr/Scan.svg";
import type { OcrTriggerProps } from "../../type";
import "./index.less";

const OcrTrigger: React.FC<OcrTriggerProps> = ({
  disabled = false,
  onClick,
  title,
}) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!disabled) {
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      className="ocr-trigger"
      disabled={disabled}
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={handleClick}
    >
      <img className="ocr-trigger__icon" src={ScanIcon} alt="" />
    </button>
  );
};

export default OcrTrigger;
