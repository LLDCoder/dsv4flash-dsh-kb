import React from "react";
import { useTranslation } from "react-i18next";
import {
  renderDescriptionTooltip,
  type RenderDescriptionTooltipOptions,
} from "./renderDescriptionTooltip";

function hasDirectionalMargin(wrapperStyle?: React.CSSProperties): boolean {
  if (!wrapperStyle) {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(wrapperStyle, "marginLeft") ||
    Object.prototype.hasOwnProperty.call(wrapperStyle, "marginRight")
  );
}

function resolveWrapperStyle(
  isAr: boolean,
  wrapperStyle?: React.CSSProperties,
): React.CSSProperties {
  if (hasDirectionalMargin(wrapperStyle)) {
    return wrapperStyle;
  }

  return isAr
    ? {
        marginLeft: 0,
        marginRight: 8,
        ...wrapperStyle,
      }
    : {
        marginLeft: 8,
        marginRight: 0,
        ...wrapperStyle,
      };
}

const LocalizedDescriptionTooltip: React.FC<
  RenderDescriptionTooltipOptions
> = ({ wrapperStyle, ...tooltipOptions }) => {
  const { i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));

  return renderDescriptionTooltip({
    ...tooltipOptions,
    wrapperStyle: resolveWrapperStyle(isAr, wrapperStyle),
  });
};

export default LocalizedDescriptionTooltip;
