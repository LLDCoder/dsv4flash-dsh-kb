import React, { useState } from "react";
import { Tooltip } from "antd";
import QuestionIcon from "@/assets/images/question.svg";
import "./index.less";

interface HoverTooltipProps {
  content: React.ReactNode;
  placement?:
    | "top"
    | "left"
    | "right"
    | "bottom"
    | "topLeft"
    | "topRight"
    | "bottomLeft"
    | "bottomRight"
    | "leftTop"
    | "leftBottom"
    | "rightTop"
    | "rightBottom";
  trigger?: "hover" | "focus" | "click";
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
}

const HoverTooltip: React.FC<HoverTooltipProps> = ({
  content,
  placement = "bottom",
  trigger = "hover",
  overlayClassName = "",
  overlayStyle = {},
}) => {
  return (
    <Tooltip
      title={content}
      placement={placement}
      trigger={trigger}
      overlayClassName={`hover-tooltip ${overlayClassName}`}
      overlayStyle={overlayStyle}
      color="#fff"
      overlayInnerStyle={{
        color: "#333",
        fontSize: "14px",
        lineHeight: "1.5",
        padding: "12px 16px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        border: "1px solid #e8e8e8",
      }}
    >
      <img src={QuestionIcon} className="tooltip-icon" />
    </Tooltip>
  );
};

export default HoverTooltip;
