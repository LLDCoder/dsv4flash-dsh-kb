import React from "react";
import { useTranslation } from "react-i18next";
import CustomButton from "../CustomButton";
import EmptyBoxIcon from "@/assets/images/empty.svg";
import "./index.less";

interface EmptyBoxProps {
  title: string;
  buttonText?: string;
  customClassName?: string;
  onClick?: () => void;
  hasButton?: boolean;
  icon?: string;
}

const EmptyBox: React.FC<EmptyBoxProps> = ({
  title,
  buttonText,
  customClassName = "",
  onClick,
  hasButton = false,
  icon = EmptyBoxIcon,
}) => {
  const { t } = useTranslation();
  const resolvedButtonText = buttonText ?? t("emptyBox.defaultButton");
  return (
    <div className={`empty-state ${customClassName}`}>
      <img src={icon} alt={t("emptyBox.altEmpty")} className="empty-icon" />
      <p className="empty-text">{title}</p>
      {hasButton && onClick && (
        <CustomButton
          text={resolvedButtonText}
          variant="outline"
          onClick={onClick}
        />
      )}
    </div>
  );
};

export default EmptyBox;
