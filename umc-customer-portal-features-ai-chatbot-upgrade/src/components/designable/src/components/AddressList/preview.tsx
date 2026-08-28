import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllLocales } from "../../locales";
import { FilmingLocationsField } from "./AddressList";

const addressListPropsSchema = {
  type: "object",
  properties: {
    "x-component-props": {
      type: "object",
      properties: {
        labelName: {
          type: "string",
          title: "Label Name",
          "x-decorator": "FormItem",
          "x-component": "Input",
          "x-component-props": {
            placeholder: "Filming Locations",
          },
          default: "Filming Locations",
        },
        addButtonLabel: {
          type: "string",
          title: "Add Button Label",
          "x-decorator": "FormItem",
          "x-component": "Input",
          "x-component-props": {
            placeholder: "Add New",
          },
          default: "Add New",
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
        unCheckedValue: "disabled",
      },
    },
  },
};

export const AddressList: DnFC<
  React.ComponentProps<typeof FilmingLocationsField>
> = FilmingLocationsField;

AddressList.Behavior = createBehavior({
  name: "AddressList",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "AddressList",
  designerProps: {
    propsSchema: addressListPropsSchema,
  },
  designerLocales: AllLocales.AddressList,
});

AddressList.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "filmingLocations",
        required: true,
        "x-decorator": "FormItem",
        "x-component": "AddressList",
        "x-decorator-props": { label: false },
        "x-display": "visible",
        "x-pattern": "editable",
        "x-component-props": {
          labelName: "Filming Locations",
          addButtonLabel: "Add New",
        },
      },
    },
  ],
});
