import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { PersonsInChargeListField } from "./PersonsInChargeListField";

export const PersonsInChargeList: DnFC<
  React.ComponentProps<typeof PersonsInChargeListField>
> = PersonsInChargeListField;

const personsInChargeListSchema: ISchema = {
  type: "object",
  properties: {
    "field-group": {
      type: "void",
      "x-component": "CollapseItem",
      properties: {
        "x-component-props": {
          type: "object",
          properties: {
            title: {
              type: "string",
              title: "Title",
              "x-decorator": "FormItem",
              "x-component": "Input",
              "x-component-props": {
                placeholder: "Persons in Charge",
              },
              default: "Persons in Charge",
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
            maxMembers: {
              type: "number",
              title: "Maximum Members",
              "x-decorator": "FormItem",
              "x-component": "NumberPicker",
              "x-component-props": {
                min: 1,
              },
            },
            showEmiratesId: {
              type: "boolean",
              title: "Emirates ID",
              "x-decorator": "FormItem",
              "x-component": "Switch",
              "x-component-props": {
                defaultChecked: true,
              },
            },
            showUID: {
              type: "boolean",
              title: "UAE Unified Number (UID)",
              "x-decorator": "FormItem",
              "x-component": "Switch",
              "x-component-props": {
                defaultChecked: false,
              },
            },
            showPassport: {
              type: "boolean",
              title: "Passport",
              "x-decorator": "FormItem",
              "x-component": "Switch",
              "x-component-props": {
                defaultChecked: false,
              },
            },
          },
        },
      },
    },
  },
};

PersonsInChargeList.Behavior = createBehavior({
  name: "PersonsInChargeList",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "PersonsInChargeList",
  designerProps: {
    propsSchema: personsInChargeListSchema,
  },
  designerLocales: AllLocales.PersonsInChargeList,
});

PersonsInChargeList.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Persons in Charge",
        "x-decorator": "FormItem",
        "x-component": "PersonsInChargeList",
        "x-component-props": {
          title: "Persons in Charge",
          addButtonLabel: "Add New",
          showEmiratesId: true,
          showUID: false,
          showPassport: false,
        },
      },
    },
  ],
});
