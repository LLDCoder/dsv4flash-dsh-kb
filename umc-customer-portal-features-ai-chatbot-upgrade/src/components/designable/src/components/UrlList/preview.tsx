import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { FilmsUrlsListField } from "./FilmsUrlsListField";

export const UrlList: DnFC<React.ComponentProps<typeof FilmsUrlsListField>> =
  FilmsUrlsListField;

UrlList.Behavior = createBehavior({
  name: "UrlList",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "UrlList",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.UrlList),
  },
  designerLocales: AllLocales.UrlList,
});

UrlList.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "urlList",
        "x-decorator": "FormItem",
        "x-component": "UrlList",
        "x-component-props": {
          addButtonText: "Add New",
          maxItems: 3,
          title: "List of Cinematic Film Trailers URLs (Max. 3 per Permit)",
          fileSizeLimit: 100,
        },
      },
    },
  ],
});
