import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { connect, mapProps } from "@formily/react";
import { createFieldSchema } from "../Field";
import { AllLocales } from "../../locales";
import { NewpaperMagazineCirculationField } from "./NewpaperMagazineCirculationField";

const newpaperMagazineCirculationSchema: ISchema = {
  type: "object",
  properties: {},
};

export const NewpaperMagazineCirculation: DnFC<
  React.ComponentProps<typeof NewpaperMagazineCirculationField>
> = connect(
  NewpaperMagazineCirculationField,
  mapProps((props, field) => ({
    ...props,
    designMode: field?.designable ? true : false,
  }))
);

NewpaperMagazineCirculation.Behavior = createBehavior({
  name: "NewpaperMagazineCirculation",
  extends: ["Field"],
  selector: (node) =>
    node.props?.["x-component"] === "NewpaperMagazineCirculation",
  designerProps: {
    propsSchema: createFieldSchema(newpaperMagazineCirculationSchema),
  },
  designerLocales: AllLocales.NewpaperMagazineCirculation,
});

NewpaperMagazineCirculation.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "newpaperMagazineCirculation",
        "x-decorator": "FormItem",
        "x-component": "NewpaperMagazineCirculation",
      },
    },
  ],
});

export default NewpaperMagazineCirculation;
