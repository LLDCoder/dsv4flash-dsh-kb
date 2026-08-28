import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { AcquaintanceFormField } from "./AcquaintanceFormField";

export const AcquaintanceForm: DnFC<
  React.ComponentProps<typeof AcquaintanceFormField>
> = AcquaintanceFormField;

AcquaintanceForm.Behavior = createBehavior({
  name: "AcquaintanceForm",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "AcquaintanceForm",
  designerProps: {
    propsSchema: AllSchemas.AcquaintanceForm,
  },
  designerLocales: AllLocales.AcquaintanceForm,
});

AcquaintanceForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "acquaintanceForm",
        "x-decorator": "FormItem",
        "x-component": "AcquaintanceForm",
        'x-decorator-props': { label: false,title: false },
      },
    },
  ],
});
