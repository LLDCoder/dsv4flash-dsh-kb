import React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { LanguageSelect as LanguageSelectComponent } from "./LanguageSelect";

export const LanguageSelect: DnFC<
  React.ComponentProps<typeof LanguageSelectComponent>
> = LanguageSelectComponent;

LanguageSelect.Behavior = createBehavior({
  name: "LanguageSelect",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "LanguageSelect",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.LanguageSelect),
  },
  designerLocales: AllLocales.LanguageSelect,
});

LanguageSelect.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        title: "Single Language",
        "x-decorator": "FormItem",
        "x-component": "LanguageSelect",
      },
    },
  ],
});



