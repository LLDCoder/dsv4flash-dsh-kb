import React from "react";
import { Card as AntdCard, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import { createBehavior, createResource } from "@designable/core";
import { AllLocales } from "../../locales";
import { sanitizeTooltipHtml } from "../FormItemWithHtmlTooltip/sanitizeTooltipHtml";

function isTooltipEmpty(html: string | undefined): boolean {
  if (!html) return true;
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text.length === 0 && !/<img\s/i.test(html) && !/<video\s/i.test(html);
}

type DesignableCardProps = React.ComponentProps<typeof AntdCard> & {
  descTooltip?: string;
  titleEn?: string;
  titleAr?: string;
};

const getLocaleTitle = (language: string): string => {
  const availableLocales = Object.keys(AllLocales.Card) as (keyof typeof AllLocales.Card)[];
  const matchedLocale = availableLocales.find(l => l === language || l.startsWith(language));
  return AllLocales.Card[matchedLocale || 'en-US'].defaultTitle;
};

export const Card = (props: DesignableCardProps) => {
  const { descTooltip, className, ...restProps } = props;
  delete restProps.titleEn;
  delete restProps.titleAr;
  const { i18n } = useTranslation();
  const hideDefaultTitle = className?.split(/\s+/).includes("training-program-card");
  const displayTitle = restProps.title || (hideDefaultTitle ? "" : getLocaleTitle(i18n.language || 'en'));
  const sanitizedDescTooltip = sanitizeTooltipHtml(descTooltip ?? "");
  const hasTooltip = !isTooltipEmpty(sanitizedDescTooltip);

  const titleNode = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span data-content-editable="x-component-props.title">
        {displayTitle}
      </span>
      {hasTooltip && (
        <Tooltip
          title={
            <div
              dangerouslySetInnerHTML={{
                __html: sanitizedDescTooltip,
              }}
              style={{ maxWidth: 350, maxHeight: 300, overflow: "auto" }}
            />
          }
          placement="top"
        >
          <QuestionCircleOutlined
            style={{ fontSize: 14, color: "#999", cursor: "pointer" }}
          />
        </Tooltip>
      )}
    </span>
  );

  return (
    <AntdCard
      {...restProps}
      title={displayTitle || hasTooltip ? titleNode : undefined}
      className={["formliy-container", className].filter(Boolean).join(" ")}
    >
      {props.children}
    </AntdCard>
  );
};

Card.Behavior = createBehavior({
  name: "Card",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "Card",
  designerProps: {
    droppable: true,
    propsSchema: {
      type: "object",
      properties: {},
    },
  },
  designerLocales: AllLocales.Card,
});

Card.Resource = createResource({
  icon: "CardSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Container",
        type: "void",
        "x-component": "Card",
        "x-component-props": {
          title: "Container",
        },
      },
    },
  ],
});
