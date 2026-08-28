import React from "react";
import { Tooltip } from "antd";
import type { TooltipPlacement } from "antd/es/tooltip";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { sanitizeTooltipHtml } from "./sanitizeTooltipHtml";
import "./index.less";

const DEFAULT_HTML_CONTENT_STYLE: React.CSSProperties = {
  maxWidth: 350,
  maxHeight: 300,
  overflow: "auto",
};

const DEFAULT_OVERLAY_INNER_STYLE: React.CSSProperties = {
  maxWidth: 360,
};

const DEFAULT_WRAPPER_STYLE: React.CSSProperties = {
  display: "inline-flex",
  marginLeft: 4,
  lineHeight: 1,
};

const DEFAULT_ICON_STYLE: React.CSSProperties = {
  color: "rgba(0,0,0,0.45)",
  cursor: "help",
  fontSize: 14,
};

export type RenderDescriptionTooltipOptions = {
  content?: string | null;
  placement?: TooltipPlacement;
  overlayInnerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  tooltipClassName?: string;
};

export function isHtmlTooltip(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

export function isEffectivelyEmptyTip(str: string): boolean {
  if (!str) return true;
  const text = str.replace(/<[^>]*>/g, "").trim();
  return text.length === 0 && !/<img\s/i.test(str) && !/<video\s/i.test(str);
}

export function resolveDescriptionTooltipContent(
  content?: string | null,
  contentStyle?: React.CSSProperties,
): React.ReactNode | undefined {
  if (typeof content !== "string" || isEffectivelyEmptyTip(content)) {
    return undefined;
  }

  if (!isHtmlTooltip(content)) {
    return content;
  }

  const sanitizedContent = sanitizeTooltipHtml(content);
  if (isEffectivelyEmptyTip(sanitizedContent)) {
    return undefined;
  }

  return (
    <div
      className="html-tooltip-content"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      style={{ ...DEFAULT_HTML_CONTENT_STYLE, ...contentStyle }}
    />
  );
}

export function renderDescriptionTooltip(
  options: RenderDescriptionTooltipOptions,
): React.ReactElement | null {
  const {
    content,
    placement = "top",
    overlayInnerStyle,
    contentStyle,
    iconStyle,
    wrapperStyle,
    tooltipClassName,
  } = options;
  const title = resolveDescriptionTooltipContent(content, contentStyle);

  if (!title) {
    return null;
  }

  return (
    <Tooltip
      title={title}
      placement={placement}
      overlayClassName={tooltipClassName}
      overlayInnerStyle={{
        ...DEFAULT_OVERLAY_INNER_STYLE,
        ...overlayInnerStyle,
      }}
    >
      <span style={{ ...DEFAULT_WRAPPER_STYLE, ...wrapperStyle }}>
        <QuestionCircleOutlined
          style={{ ...DEFAULT_ICON_STYLE, ...iconStyle }}
        />
      </span>
    </Tooltip>
  );
}
