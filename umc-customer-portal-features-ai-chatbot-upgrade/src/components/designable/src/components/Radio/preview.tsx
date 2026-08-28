import * as React from "react";
import { Radio as FormilyRadio } from "@formily/antd";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllLocales } from "../../locales";
import RadioGroupWithLayout from "./RadioGroupWithLayout";

export const Radio: DnFC<React.ComponentProps<typeof FormilyRadio>> =
  FormilyRadio;

const singleSelectPropsSchema = {
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
      title: "Label Name",
      "x-decorator": "FormItem",
      "x-component": "Input",
      "x-component-props": {
        maxLength: 200,
      },
    },
    "x-component-props": {
      type: "object",
      properties: {
        layout: {
          type: "string",
          "x-decorator": "FormItem",
          "x-component": "Select",
          "x-component-props": {
            defaultValue: "horizontal",
            options: [
              { label: "Horizontal", value: "horizontal" },
              { label: "Vertical", value: "vertical" },
            ],
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
    enum: {
      type: "array",
      "x-decorator": "FormItem",
      "x-component": "SingleSelectOptionsSetter",
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
      type: "string",
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
};

Radio.Behavior = createBehavior({
  name: "Radio.Group",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "Radio.Group",
  designerProps: {
    propsSchema: singleSelectPropsSchema,
  },
  designerLocales: AllLocales.RadioGroup,
});

Radio.Resource = createResource({
  icon: "RadioGroupSource",
  elements: [
    {
      componentName: "Field",
      props: {
        type: "string",
        title: "Single Select",
        "x-decorator": "FormItem",
        "x-component": "Radio.Group",
        "x-component-props": {
          layout: "horizontal",
        },
        enum: [
          { label: "Option 1", value: "Option 1" },
          { label: "Option 2", value: "Option 2" },
        ],
        default: "Option 1",
      },
    },
  ],
});
