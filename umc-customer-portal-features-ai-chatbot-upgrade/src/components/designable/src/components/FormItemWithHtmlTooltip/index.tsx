import React from "react";
import { FormItem as FormilyFormItem } from "@formily/antd";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { sanitizeTooltipHtml } from "./sanitizeTooltipHtml";
import "./index.less";

function isHtmlString(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function isEffectivelyEmpty(str: string): boolean {
  if (!str) return true;
  const text = str.replace(/<[^>]*>/g, "").trim();
  return text.length === 0 && !/<img\s/i.test(str) && !/<video\s/i.test(str);
}

type FormilyFormItemProps = React.ComponentProps<typeof FormilyFormItem>;
const FormilyFormItemAny = FormilyFormItem as React.ComponentType<
  FormilyFormItemProps & Record<string, unknown>
>;

type FormItemWithHtmlTooltipProps = FormilyFormItemProps & {
  tooltipEn?: string;
  tooltipAr?: string;
  labelEn?: string;
  labelAr?: string;
  helpEn?: string;
  helpAr?: string;
  extraEn?: string;
  extraAr?: string;
};

type FormItemWithHtmlTooltipComponent = React.FC<FormItemWithHtmlTooltipProps> & {
  BaseComponent?: typeof FormilyFormItem;
};

const FormItemWithHtmlTooltip: FormItemWithHtmlTooltipComponent = (props) => {
  const { i18n } = useTranslation();
  const {
    tooltip,
    tooltipEn,
    tooltipAr,
    labelEn,
    labelAr,
    helpEn,
    helpAr,
    extraEn,
    extraAr,
    ...rest
  } = props;
  const restProps = rest as FormilyFormItemProps & Record<string, unknown>;
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const localizedTooltip = preferLocalizedEnAr(
    isAr,
    typeof tooltipEn === "string" ? tooltipEn : undefined,
    typeof tooltipAr === "string" ? tooltipAr : undefined,
  );
  let processedTooltip =
    localizedTooltip || (typeof tooltip === "string" ? tooltip : tooltip);
  const localizedLabel = preferLocalizedEnAr(
    isAr,
    typeof labelEn === "string" ? labelEn : undefined,
    typeof labelAr === "string" ? labelAr : undefined,
  );
  const localizedHelp = preferLocalizedEnAr(
    isAr,
    typeof helpEn === "string" ? helpEn : undefined,
    typeof helpAr === "string" ? helpAr : undefined,
  );
  const localizedExtra = preferLocalizedEnAr(
    isAr,
    typeof extraEn === "string" ? extraEn : undefined,
    typeof extraAr === "string" ? extraAr : undefined,
  );
  const resolvedLabel =
    restProps.label === false ? false : localizedLabel || restProps.label;

  if (typeof processedTooltip === "string") {
    const normalizedTooltip = processedTooltip;
    if (isEffectivelyEmpty(normalizedTooltip)) {
      processedTooltip = undefined;
    } else if (isHtmlString(normalizedTooltip)) {
      const sanitizedTooltip = sanitizeTooltipHtml(normalizedTooltip);
      processedTooltip = isEffectivelyEmpty(sanitizedTooltip) ? (
        undefined
      ) : (
        <div
          dangerouslySetInnerHTML={{ __html: sanitizedTooltip }}
          style={{ maxWidth: 350, maxHeight: 300, overflow: "auto" }}
          className="html-tooltip-content"
        />
      );
    }
  }

  return (
    <FormilyFormItemAny
      {...restProps}
      label={resolvedLabel}
      help={localizedHelp || restProps.help}
      extra={localizedExtra || restProps.extra}
      tooltip={processedTooltip}
    />
  );
};

FormItemWithHtmlTooltip.BaseComponent = FormilyFormItem;

export default FormItemWithHtmlTooltip;
