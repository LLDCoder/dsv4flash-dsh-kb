import React from "react";
import { Input as AntdInput } from "antd";
import { connect, mapProps, mapReadPretty } from "@formily/react";
import { PreviewText } from "@formily/antd";
import { LoadingOutlined } from "@ant-design/icons";
import { createBehavior, createResource } from "@designable/core";
// import { DnFC } from "@designable/react";
import { AllLocales } from "../../locales";
import { useTranslation } from "react-i18next";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";
import "./preview.less";

interface WordLimitConfig {
  enabled: boolean;
  limit: number;
}

function applyWordLimit(props: Record<string, any>): Record<string, any> {
  const { wordLimitConfig, ...rest } = props;
  const cfg = wordLimitConfig as WordLimitConfig | undefined;
  if (cfg?.enabled && cfg.limit > 0) {
    rest.maxLength = Math.floor(cfg.limit);
  }
  return rest;
}

function applyTextAreaCount(props: Record<string, any>): Record<string, any> {
  const { className, ...rest } = props;
  if (rest.maxLength == null) {
    return { className, ...rest };
  }
  const cls = [className, "formily-textarea-count"].filter(Boolean).join(" ");
  const hasExplicitSize = rest.rows != null || rest.autoSize != null;
  return {
    ...rest,
    className: cls,
    showCount: rest.showCount ?? true,
    ...(hasExplicitSize ? {} : { rows: 4 }),
  };
}
function applyRtl(props: Record<string, any>): Record<string, any> {
  const { rtl, className, ...rest } = props;
  if (!rtl) return { className, ...rest };
  const cls = [className, "Formily-Input-rtl"].filter(Boolean).join(" ");
  return { ...rest, className: cls };
}

function localizeInputProps(
  props: Record<string, any>,
  isAr: boolean,
  t: ReturnType<typeof useTranslation>["t"],
  i18n: ReturnType<typeof useTranslation>["i18n"],
) {
  const {
    placeholderEn,
    placeholderAr,
    placeholderKey,
    placeholderParams,
    ...rest
  } = props;
  delete rest.titleEn;
  delete rest.titleAr;
  delete rest.uniqueValue;
  delete rest.wordLimitConfig;
  const localizedPlaceholder = resolveI18nPlaceholder({
    isAr,
    i18n,
    t,
    placeholder: rest.placeholder,
    placeholderEn,
    placeholderAr,
    placeholderKey,
    placeholderParams,
  });

  return {
    ...rest,
    placeholder: localizedPlaceholder,
  };
}

const LocalizedInput = React.forwardRef<any, Record<string, any>>(
  (props, ref) => {
    const { t, i18n } = useTranslation();
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    return React.createElement(AntdInput, {
      ref,
      ...localizeInputProps(props, isAr, t, i18n),
    });
  },
);

const LocalizedTextArea = React.forwardRef<any, Record<string, any>>(
  (props, ref) => {
    const { t, i18n } = useTranslation();
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    return React.createElement(AntdInput.TextArea, {
      ref,
      ...localizeInputProps(props, isAr, t, i18n),
    });
  },
);

export const Input: any = connect(
  LocalizedInput,
  mapProps((props: any, field: any) => {
    const applied = applyRtl(applyWordLimit(props));
    return {
      ...applied,
      suffix: React.createElement(
        "span",
        null,
        field?.loading || field?.validating
          ? React.createElement(LoadingOutlined)
          : applied.suffix
      ),
    };
  }),

  mapReadPretty(PreviewText.Input)
) as any;

(Input as any).TextArea = connect(
  LocalizedTextArea,
  mapProps((props: any) => applyTextAreaCount(applyWordLimit(props))),
  mapReadPretty(PreviewText.Input)
);

Input.Behavior = createBehavior(
  {
    name: "Input",
    extends: ["Field"],
    selector: (node) => node.props["x-component"] === "Input",
    designerProps: {
      propsSchema: {
        type: "object",
        properties: {
          uniqueValue: {
            type: "string",
            title: "Unique Value",
            "x-decorator": "FormItem",
            "x-component": "UniqueValueSetter",
          },
          title: {
            type: "string",
            "x-decorator": "FormItem",
            "x-component": "Input",
          },
          "x-component-props": {
            type: "object",
            properties: {
              placeholder: {
                type: "string",
                "x-decorator": "FormItem",
                "x-component": "Input",
              },
              placeholderKey: {
                type: "string",
                "x-decorator": "FormItem",
                "x-component": "Input",
              },
              placeholderParams: {
                "x-decorator": "FormItem",
                "x-component": "ValueInput",
                "x-component-props": {
                  include: ["EXPRESSION"],
                },
              },
            },
          },
          "x-decorator-props": {
            type: "object",
            properties: {
              tooltip: {
                type: "string",
                "x-decorator": "FormItem",
                "x-decorator-props": { colon: false, label: " " },
                "x-component": "DescriptionRichTextSetter",
              },
            },
          },
          "x-component-props.wordLimitConfig": {
            type: "object",
            "x-decorator": "FormItem",
            "x-decorator-props": { colon: false, label: " " },
            "x-component": "WordLimitSetter",
          },
          "x-validator": {
            type: "array",
            "x-component": "ValidatorSetter",
          },
          "x-decorator-props.style": {
            type: "void",
            properties: {
              "style.width": {
                type: "string",
                "x-decorator": "FormItem",
                "x-component": "FieldWidthSetter",
              },
            },
          },
          required: {
            type: "boolean",
            "x-decorator": "FormItem",
            "x-component": "Switch",
          },
          "x-display": {
            type: "boolean",
            "x-decorator": "FormItem",
            "x-component": "StringSwitchSetter",
            default: "visible",
            "x-component-props": {
              checkedValue: "visible",
              unCheckedValue: "none",
            },
          },
        },
      },
    },
    designerLocales: AllLocales.Input,
  },
  {
    name: "Input.TextArea",
    extends: ["Field"],
    selector: (node) => node.props["x-component"] === "Input.TextArea",
    designerProps: {
      propsSchema: {
        type: "object",
        properties: {
          uniqueValue: {
            type: "string",
            title: "Unique Value",
            "x-decorator": "FormItem",
            "x-component": "UniqueValueSetter",
          },
          title: {
            type: "string",
            "x-decorator": "FormItem",
            "x-component": "Input",
          },
          "x-component-props": {
            type: "object",
            properties: {
              placeholder: {
                type: "string",
                "x-decorator": "FormItem",
                "x-component": "Input",
              },
              placeholderKey: {
                type: "string",
                "x-decorator": "FormItem",
                "x-component": "Input",
              },
              placeholderParams: {
                "x-decorator": "FormItem",
                "x-component": "ValueInput",
                "x-component-props": {
                  include: ["EXPRESSION"],
                },
              },
            },
          },
          "x-decorator-props": {
            type: "object",
            properties: {
              tooltip: {
                type: "string",
                "x-decorator": "FormItem",
                "x-decorator-props": { colon: false, label: " " },
                "x-component": "DescriptionRichTextSetter",
              },
            },
          },
          "x-component-props.wordLimitConfig": {
            type: "object",
            "x-decorator": "FormItem",
            "x-decorator-props": { colon: false, label: " " },
            "x-component": "WordLimitSetter",
          },
          "x-validator": {
            type: "array",
            "x-component": "ValidatorSetter",
          },
          "x-decorator-props.style": {
            type: "void",
            properties: {
              "style.width": {
                type: "string",
                "x-decorator": "FormItem",
                "x-component": "FieldWidthSetter",
              },
            },
          },
          required: {
            type: "boolean",
            "x-decorator": "FormItem",
            "x-component": "Switch",
          },
          "x-display": {
            type: "boolean",
            "x-decorator": "FormItem",
            "x-component": "StringSwitchSetter",
            default: "visible",
            "x-component-props": {
              checkedValue: "visible",
              unCheckedValue: "none",
            },
          },
        },
      },
    },
    designerLocales: AllLocales.TextArea,
  },
);

Input.Resource = createResource(
  {
    icon: "InputSource",
    elements: [
      {
        componentName: "Field",
        props: {
          type: "string",
          title: "Input",
          "x-decorator": "FormItem",
          "x-component": "Input",
        },
      },
    ],
  },
  {
    icon: "TextAreaSource",
    elements: [
      {
        componentName: "Field",
        props: {
          type: "string",
          title: "TextArea",
          "x-decorator": "FormItem",
          "x-component": "Input.TextArea",
        },
      },
    ],
  },
);
