import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { createFieldSchema } from "../Field";
import { FileUploadGridField } from "./FileUploadGridField";

export const FileUploadGrid: DnFC<
  React.ComponentProps<typeof FileUploadGridField>
> = FileUploadGridField;

FileUploadGrid.Behavior = createBehavior({
  name: "FileUploadGrid",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "FileUploadGrid",
  designerProps: {
    propsSchema: createFieldSchema(AllSchemas.FileUploadGrid),
  },
  designerLocales: AllLocales.FileUploadGrid,
});

FileUploadGrid.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "fileUploadGrid",
        "x-decorator": "FormItem",
        "x-component": "FileUploadGrid",
      },
    },
  ],
});