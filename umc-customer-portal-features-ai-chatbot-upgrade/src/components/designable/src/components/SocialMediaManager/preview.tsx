import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { SocialMediaManagerField } from "./SocialMediaManagerField";

export const SocialMediaManager: DnFC<
  React.ComponentProps<typeof SocialMediaManagerField>
> = SocialMediaManagerField;

const emptyPropsSchema: ISchema = {
  type: "object",
  properties: {},
};

SocialMediaManager.Behavior = createBehavior({
  name: "SocialMediaManager",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "SocialMediaManager",
  designerProps: {
    propsSchema: emptyPropsSchema,
  },
  designerLocales: (AllLocales as any).SocialMediaManager,
});

SocialMediaManager.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "socialMediaManager",
        "x-decorator": "FormItem",
        "x-component": "SocialMediaManager",
      },
    },
  ],
});
