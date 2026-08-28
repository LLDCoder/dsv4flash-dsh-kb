import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { PartnerListField } from "./PartnerListField";

export const PartnerList: DnFC<
  React.ComponentProps<typeof PartnerListField>
> = PartnerListField;

const partnerListSchema: ISchema = {
  type: "object",
  properties: {
    "field-group": {
      type: "void",
      "x-component": "CollapseItem",
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
                placeholder: "Partner List",
              },
              required: true,
              default: "Partner List",
            },
            description: {
              type: "string",
              title: "Description",
              "x-decorator": "FormItem",
              "x-component": "RichText",
            },
            addButtonLabel: {
              type: "string",
              title: "Add Button Label",
              "x-decorator": "FormItem",
              "x-component": "Input",
              "x-component-props": {
                placeholder: "Add New Partner",
              },
              default: "Add New Partner",
            },
            showEmiratesId: {
              type: "boolean",
              title: "Emirates ID",
              "x-decorator": "FormItem",
              "x-component": "Switch",
              "x-component-props": {
                defaultChecked: true,
              },
              default: true,
            },
            showUID: {
              type: "boolean",
              title: "UAE Unified Number (UID)",
              "x-decorator": "FormItem",
              "x-component": "Switch",
              "x-component-props": {
                defaultChecked: true,
              },
              default: true,
            },
            showPassport: {
              type: "boolean",
              title: "Passport",
              "x-decorator": "FormItem",
              "x-component": "Switch",
              "x-component-props": {
                defaultChecked: true,
              },
              default: true,
            },
          },
        },
      },
    },
  },
};

PartnerList.Behavior = createBehavior({
  name: "PartnerList",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "PartnerList",
  designerProps: {
    propsSchema: partnerListSchema,
  },
  designerLocales: AllLocales.PartnerList,
});

PartnerList.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Partner List",
        "x-decorator": "FormItem",
        "x-component": "PartnerList",
        "x-component-props": {
          labelName: "Partner List",
          addButtonLabel: "Add New Partner",
          showEmiratesId: true,
          showUID: true,
          showPassport: true,
        },
      },
    },
  ],
});
