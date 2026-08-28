import React from "react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import HoverTooltip from "../HoverTooltip";
export type PersonalPhotoTooltipProps = Omit<
  ComponentProps<typeof HoverTooltip>,
  "content"
>;
const PersonalPhotoTooltip: React.FC<PersonalPhotoTooltipProps> = (props) => {
  const { t } = useTranslation();
  return (
    <HoverTooltip
      {...props}
      content={
        <div>
          <div>{t("individualIdentity.personalPhotoTooltip.line1")}</div>
          <div>{t("individualIdentity.personalPhotoTooltip.line2")}</div>
          <div>{t("individualIdentity.personalPhotoTooltip.line3")}</div>
          <div>{t("individualIdentity.personalPhotoTooltip.line4")}</div>
        </div>
      }
    />
  );
};
export default PersonalPhotoTooltip;
