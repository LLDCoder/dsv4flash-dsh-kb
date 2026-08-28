import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { SocialMediaAccountField } from "./SocialMediaAccountField";

export const SocialMediaAccount: DnFC<React.ComponentProps<typeof SocialMediaAccountField>> =
  SocialMediaAccountField;

SocialMediaAccount.Behavior = createBehavior({
  name: "SocialMediaAccount",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "SocialMediaAccount",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.SocialMediaAccount),
  },
  designerLocales: AllLocales.SocialMediaAccount,
});

SocialMediaAccount.Resource = createResource({
  icon: "SelectSource",
  title:'',
  elements: [
    {
      componentName: "Field",
      props: {
        name: "socialMediaAccounts",
        "x-decorator": "FormItem",
        "x-component": "SocialMediaAccount",
        "x-decorator-props":{
          label:false,
          colon:false
        } 
      },
    },
  ],
});
