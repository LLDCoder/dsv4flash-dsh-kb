import React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { IDSelectorField } from "./IDSelectorField";

export const IDSelector: DnFC<
  React.ComponentProps<typeof IDSelectorField>
> = IDSelectorField;

IDSelector.Behavior = createBehavior({
  name: "IDSelector",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "IDSelector",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.IDSelector),
  },
  designerLocales: AllLocales.IDSelector,
});

IDSelector.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "idSelector",
        // title: "ID Selector",
        "x-decorator": "FormItem",
        "x-component": "IDSelector",
        "x-component-props": {
          showEmiratesId: true,
          showUID: true,
          showPassport: false,
        },
      },
    },
  ],
});


