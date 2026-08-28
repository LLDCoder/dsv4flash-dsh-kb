import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { DataFormField } from "./DataFormField";

export const DataForm: DnFC<
  React.ComponentProps<typeof DataFormField>
> = DataFormField;

DataForm.Behavior = createBehavior({
  name: "DataForm",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "DataForm",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.DataForm),
  },
  designerLocales: AllLocales.DataForm,
});

DataForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "dataForm",
        "x-decorator": "FormItem",
        "x-component": "DataForm",
      },
    },
  ],
});