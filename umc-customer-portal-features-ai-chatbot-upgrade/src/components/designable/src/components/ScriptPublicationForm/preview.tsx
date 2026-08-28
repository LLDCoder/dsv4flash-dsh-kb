import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { ScriptPublicationFormField } from "./ScriptPublicationFormField";

export const ScriptPublicationForm: DnFC<
  React.ComponentProps<typeof ScriptPublicationFormField>
> = ScriptPublicationFormField;

const scriptPublicationFormSchema: ISchema = {
  type: "object",
  properties: {},
};

ScriptPublicationForm.Behavior = createBehavior({
  name: "ScriptPublicationForm",
  extends: ["Field"],
  selector: (node) =>
    node.props?.["x-component"] === "ScriptPublicationForm",
  designerProps: {
    propsSchema: scriptPublicationFormSchema,
  },
  designerLocales: (AllLocales as any).ScriptPublicationForm,
});

ScriptPublicationForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "ScriptPublicationForm",
        "x-decorator": "FormItem",
        "x-component": "ScriptPublicationForm",
      },
    },
  ],
});
