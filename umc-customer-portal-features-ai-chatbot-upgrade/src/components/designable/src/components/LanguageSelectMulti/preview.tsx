import React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { LanguageSelectMulti as LanguageSelectComponent } from "./LanguageSelectMulti";

export const LanguageSelectMulti: DnFC<
  React.ComponentProps<typeof LanguageSelectComponent>
> = LanguageSelectComponent;

LanguageSelectMulti.Behavior = createBehavior({
  name: "LanguageSelectMulti",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "LanguageSelectMulti",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.LanguageSelectMulti),
  },
  designerLocales: AllLocales.LanguageSelectMulti,
});

LanguageSelectMulti.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        title: "Multi Language",
        "x-decorator": "FormItem",
        "x-component": "LanguageSelectMulti",
      },
    },
  ],
});


