import React from "react";
import { EmiratePort as EmiratePortComponent } from "./EmiratePort";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllLocales } from "../../locales";

export const EmiratePort: DnFC<React.ComponentProps<typeof EmiratePortComponent>> =
  EmiratePortComponent;

EmiratePort.Behavior = createBehavior({
  name: "EmiratePort",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "EmiratePort",
  designerProps: {
      defaultProps: {
        name: "EmiratePort",
      },
    propsSchema: {
      type: "object",
      properties: {
        uniqueValue: {
          type: "string",
          title: "Unique Value",
          "x-decorator": "FormItem",
          "x-component": "UniqueValueSetter",
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
        "x-component-props": {
          type: "object",
          properties: {
            placeholder: {
              type: "string",
              "x-decorator": "FormItem",
              "x-component": "Input",
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
    },
  },
  designerLocales: AllLocales.EmiratePort,
});

EmiratePort.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        title: "Emirate Port",
        "x-decorator": "FormItem",
        "x-component": "EmiratePort",
      },
    },
  ],
});

export default EmiratePort;
