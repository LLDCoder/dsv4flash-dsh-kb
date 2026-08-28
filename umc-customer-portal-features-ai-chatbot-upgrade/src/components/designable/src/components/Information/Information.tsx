import React from "react";
import { connect, mapProps, mapReadPretty } from "@formily/react";
import { LoadingOutlined } from "@ant-design/icons";
import { PreviewText } from "@formily/antd";
import "./index.less";
import ToastWarningIcon from "@/assets/icons/toast-warning.svg";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { sanitizeRichTextHtml } from "@/utils/sanitizeRichTextHtml";

const normalizeStyleType = (style: unknown) => {
  const rawStyle = String(style || "warning").trim();
  const normalizedStyle = rawStyle.toLowerCase();

  if (normalizedStyle === "reminder") {
    return "reminder";
  }

  return "warning";
};

const InformationDom = ({
  text,
  textEn,
  textAr,
  contentEn,
  contentAr,
  Style = "warning",
}) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const informationValue =
    preferLocalizedEnAr(
      isAr,
      typeof textEn === "string" ? textEn : typeof contentEn === "string" ? contentEn : undefined,
      typeof textAr === "string" ? textAr : typeof contentAr === "string" ? contentAr : undefined,
    ) ||
    text ||
    t("Information.defaultText");
  const isHtmlContent =
    informationValue && /<[a-z][\s\S]*>/i.test(informationValue);
  const styleType = normalizeStyleType(Style);
  const displayValue = isHtmlContent
    ? sanitizeRichTextHtml(informationValue)
    : informationValue;
  const containerClass = `information-container information-${styleType}`;
  return (
    <div className={containerClass}>
      <span className="information-icon information-warning-icon">
        <img src={ToastWarningIcon} alt="" />
      </span>
      {isHtmlContent ? (
        <span
          className="information-content"
          dangerouslySetInnerHTML={{
            __html: displayValue,
          }}
        />
      ) : (
        <span className="information-content">{displayValue}</span>
      )}
    </div>
  );
};

export const Information: ReactFC<InformationProps<unknown, unknown>> = connect(
  InformationDom,
  mapProps(
    {
      loading: true,
    },
    (props, field) => {
      const restProps = { ...props };
      delete (restProps as { options?: unknown }).options;
      delete (restProps as { dataSource?: unknown }).dataSource;
      return {
        ...restProps,
        suffixIcon:
          field?.["loading"] || field?.["validating"] ? (
            <LoadingOutlined />
          ) : (
            props.suffixIcon
          ),
      };
    }
  ),
  mapReadPretty((props) => {
    return <PreviewText.Select {...props} />;
  })
);

export default Information;
