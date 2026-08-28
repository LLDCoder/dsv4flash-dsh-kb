import React from "react";
import { useField } from "@formily/react";
import type { TooltipPlacement } from "antd/es/tooltip";
import LocalizedDescriptionTooltip from "./LocalizedDescriptionTooltip";

type FieldDecoratorTooltipProps = {
  fallbackContent?: string | null;
  placement?: TooltipPlacement;
  overlayInnerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  tooltipClassName?: string;
};

type FieldDecoratorPropsShape = {
  decoratorProps?: {
    tooltip?: unknown;
  };
};

const FieldDecoratorTooltip: React.FC<FieldDecoratorTooltipProps> = ({
  fallbackContent,
  ...tooltipOptions
}) => {
  const field = useField();
  const decoratorTooltip = (field as FieldDecoratorPropsShape).decoratorProps
    ?.tooltip;
  const content =
    typeof decoratorTooltip === "string" && decoratorTooltip.trim()
      ? decoratorTooltip
      : fallbackContent;
  return <LocalizedDescriptionTooltip content={content} {...tooltipOptions} />;
};

export default FieldDecoratorTooltip;
