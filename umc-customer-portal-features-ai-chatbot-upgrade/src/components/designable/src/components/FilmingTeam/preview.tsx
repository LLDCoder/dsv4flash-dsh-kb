import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { MemberListField } from "./MemberListField";

export const FilmingTeam: DnFC<
  React.ComponentProps<typeof MemberListField>
> = MemberListField;

const memberListSchema: ISchema = {
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
                placeholder: "Filming Team",
              },
              default: "Filming Team",
            },
            existingMemberButtonLabel: {
              type: "string",
              title: "Existing Member Button Label",
              "x-decorator": "FormItem",
              "x-component": "Input",
              "x-component-props": {
                placeholder: "Add Existing Member",
              },
              default: "Add Existing Member",
            },
            newMemberButtonLabel: {
              type: "string",
              title: "New Member Button Label",
              "x-decorator": "FormItem",
              "x-component": "Input",
              "x-component-props": {
                placeholder: "Add New Member",
              },
              default: "Add New Member",
            },
            memberLimits: {
              type: "number",
              title: "Member Limits",
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
                defaultChecked: true,
              },
            },
            showPassport: {
              type: "boolean",
              title: "Passport",
              "x-decorator": "FormItem",
              "x-component": "Switch",
              "x-component-props": {
                defaultChecked: true,
              },
            },
          },
        },
      },
    },
  },
};

FilmingTeam.Behavior = createBehavior({
  name: "FilmingTeam",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "FilmingTeam",
  designerProps: {
    propsSchema: memberListSchema,
  },
  designerLocales: AllLocales.FilmingTeam,
});

FilmingTeam.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Filming Team",
        required: true,
        "x-decorator": "FormItem",
        "x-component": "FilmingTeam",
        "x-component-props": {
          labelName: "Filming Team",
          existingMemberButtonLabel: "Add Existing Member",
          newMemberButtonLabel: "Add New Member",
          showEmiratesId: true,
          showUID: true,
          showPassport: true,
        },
      },
    },
  ],
});
