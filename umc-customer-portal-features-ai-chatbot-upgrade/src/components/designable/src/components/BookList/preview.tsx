import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { BookListUploadField } from "./BookListUploadField";

export const BookList: DnFC<
  React.ComponentProps<typeof BookListUploadField>
> = BookListUploadField;

BookList.Behavior = createBehavior({
  name: "BookList",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "BookList",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.BookList),
  },
  designerLocales: AllLocales.BookList,
});

BookList.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "bookListUpload",
        "x-decorator": "FormItem",
        "x-component": "BookList",
      },
    },
  ],
});