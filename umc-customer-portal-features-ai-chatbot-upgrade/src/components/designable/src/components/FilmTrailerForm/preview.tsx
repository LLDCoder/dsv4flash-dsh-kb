import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { FilmTrailerFormField } from "./FilmTrailerFormField";

export const FilmTrailerForm: DnFC<
  React.ComponentProps<typeof FilmTrailerFormField>
> = FilmTrailerFormField;

const filmTrailerFormSchema: ISchema = {
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

FilmTrailerForm.Behavior = createBehavior({
  name: "FilmTrailerForm",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "FilmTrailerForm",
  designerProps: {
    propsSchema: filmTrailerFormSchema,
  },
  designerLocales: AllLocales.FilmTrailerForm,
});

FilmTrailerForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Film Age Rating",
        "x-decorator": "FormItem",
        "x-component": "FilmTrailerForm",
        "x-decorator-props": {
          colon: false,
          label: false,
        },
      },
    },
  ],
});
