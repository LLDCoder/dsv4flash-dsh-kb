import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { ProfileFormField } from "./ProfileFormField";

export const ProfileForm: DnFC<
  React.ComponentProps<typeof ProfileFormField>
> = ProfileFormField;

const profileFormSchema: ISchema = {
  type: "object",
  properties: {
    "field-group": {
      type: "void",
      "x-component": "CollapseItem",
      properties: {
        "x-component-props": {
          type: "object",
          properties: {},
        },
      },
    },
  },
};

ProfileForm.Behavior = createBehavior({
  name: "ProfileForm",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "ProfileForm",
  designerProps: {
    propsSchema: profileFormSchema,
  },
  designerLocales: AllLocales.ProfileForm,
});

ProfileForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Profile Form",
        "x-decorator": "FormItem",
        "x-component": "ProfileForm",
      },
    },
  ],
});
