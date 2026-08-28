import React from "react";
import { useTranslation } from "react-i18next";
import PersonalPhotoTooltip from "@/components/common/PersonalPhotoTooltip";

const PersonalPhotoLabel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      {t("IDSelector.label.personalPhoto")}
      <span className="idselector-required">*</span>
      {" "}
      <PersonalPhotoTooltip />
    </>
  );
};

export default PersonalPhotoLabel;
