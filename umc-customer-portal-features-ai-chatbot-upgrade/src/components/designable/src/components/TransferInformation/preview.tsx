import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { TransferInformationField } from "./TransferInformationField";

export const TransferInformation: DnFC<
  React.ComponentProps<typeof TransferInformationField>
> = TransferInformationField;

const transferInformationSchema: ISchema = {
  type: "object",
  properties: {},
};

TransferInformation.Behavior = createBehavior({
  name: "TransferInformation",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "TransferInformation",
  designerProps: {
    propsSchema: transferInformationSchema,
  },
  designerLocales: AllLocales.TransferInformation,
});

TransferInformation.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Transfer Information",
        "x-decorator": "FormItem",
        "x-component": "TransferInformation",
      },
    },
  ],
});
