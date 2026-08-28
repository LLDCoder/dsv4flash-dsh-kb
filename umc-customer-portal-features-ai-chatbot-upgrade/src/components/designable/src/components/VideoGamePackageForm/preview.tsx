import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { VideoGamePackageFormField } from "./VideoGamePackageFormField";

export const VideoGamePackageForm: DnFC<
  React.ComponentProps<typeof VideoGamePackageFormField>
> = VideoGamePackageFormField;

const videoGamePackageFormSchema: ISchema = {
  type: "object",
  properties: {},
};

VideoGamePackageForm.Behavior = createBehavior({
  name: "VideoGamePackageForm",
  extends: ["Field"],
  selector: (node) =>
    node.props?.["x-component"] === "VideoGamePackageForm",
  designerProps: {
    propsSchema: videoGamePackageFormSchema,
  },
  designerLocales: (AllLocales as any).VideoGamePackageForm,
});

VideoGamePackageForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "VideoGamePackage",
        "x-decorator": "FormItem",
        "x-component": "VideoGamePackageForm",
      },
    },
  ],
});
