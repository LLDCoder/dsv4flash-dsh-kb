import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { FilmingPurposeFormField } from "./FilmingPurposeFormField";

export const FilmingPurposeForm: DnFC<
  React.ComponentProps<typeof FilmingPurposeFormField>
> = FilmingPurposeFormField;

const filmingPurposeFormSchema: ISchema = {
  type: "object",
  properties: {},
};

FilmingPurposeForm.Behavior = createBehavior({
  name: "FilmingPurposeForm",
  extends: ["Field"],
  selector: (node) =>
    node.props?.["x-component"] === "FilmingPurposeForm",
  designerProps: {
    propsSchema: filmingPurposeFormSchema,
  },
  designerLocales: (AllLocales as any).FilmingPurposeForm,
});

FilmingPurposeForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "FilmingPurpose",
        "x-decorator": "FormItem",
        "x-component": "FilmingPurposeForm",
      },
    },
  ],
});
