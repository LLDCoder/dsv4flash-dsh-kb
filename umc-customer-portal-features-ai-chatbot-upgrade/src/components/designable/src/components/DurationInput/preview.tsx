/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { observer } from "@formily/react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import { AllLocales } from "../../locales";
import { AllSchemas } from "../../schemas";
import ConnectedDurationInput from "./DurationInput";
import i18n from "@/localization/config";

function buildDurationInputDesignerProps() {
  return {
    propsSchema: {
      type: "object",
      properties: {
        uniqueValue: {
          type: "string",
          "x-decorator": "FormItem",
          "x-component": "UniqueValueSetter",
        },
        "x-component-props.titleEn": {
          type: "string",
          "x-decorator": "FormItem",
          "x-component": "Input",
          "x-component-props": {
            lang: "en",
            placeholder: i18n.t("DurationInput.designerPlaceholderTitle", {
              lng: "en",
            }),
          },
        },
        "x-component-props.titleAr": {
          type: "string",
          "x-decorator": "FormItem",
          "x-component": "Input",
          "x-component-props": {
            lang: "ar",
            placeholder: i18n.t("DurationInput.designerPlaceholderTitle", {
              lng: "ar",
            }),
          },
        },
        "x-component-props": {
          type: "object",
          properties: AllSchemas.DurationInput.properties,
        },
        "x-decorator-props": {
          type: "object",
          properties: {
            tooltipEn: {
              type: "string",
              "x-decorator": "FormItem",
              "x-decorator-props": { colon: false, label: " " },
              "x-component": "DescriptionRichTextSetter",
              "x-component-props": {
                lang: "en",
              },
            },
            tooltipAr: {
              type: "string",
              "x-decorator": "FormItem",
              "x-decorator-props": { colon: false, label: " " },
              "x-component": "DescriptionRichTextSetter",
              "x-component-props": {
                lang: "ar",
              },
            },
          },
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
        "x-validator": {
          type: "array",
          "x-component": "ValidatorSetter",
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
        "x-pattern": {
          type: "string",
          "x-decorator": "FormItem",
          "x-component": "StringSwitchSetter",
          default: "editable",
          "x-component-props": {
            checkedValue: "editable",
            unCheckedValue: "readOnly",
          },
        },
      },
    },
  };
}

const DurationInputInner = observer((props: any) =>
  React.createElement(ConnectedDurationInput as any, props),
);

export const DurationInput: DnFC<any> = DurationInputInner as any;

DurationInput.Behavior = createBehavior({
  name: "DurationInput",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "DurationInput",
  designerProps: buildDurationInputDesignerProps,
  designerLocales: AllLocales.DurationInput,
});

DurationInput.Resource = createResource({
  icon: "TimePickerSource",
  elements: [
    {
      componentName: "Field",
      props: {
        type: "string",
        title: i18n.t("DurationInput.defaultTitle", { lng: "en" }),
        "x-decorator": "FormItem",
        "x-component": "DurationInput",
        "x-component-props": {
          titleEn: i18n.t("DurationInput.defaultTitle", { lng: "en" }),
          titleAr: i18n.t("DurationInput.defaultTitle", { lng: "ar" }),
          bordered: true,
          size: "middle",
        },
      },
    },
  ],
});

export default DurationInput;
