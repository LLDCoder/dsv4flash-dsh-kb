import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { TransferHistoryField } from "./TransferHistoryField";

export const TransferHistory: DnFC<
  React.ComponentProps<typeof TransferHistoryField>
> = TransferHistoryField;

const transferHistorySchema: ISchema = {
  type: "object",
  properties: {},
};

TransferHistory.Behavior = createBehavior({
  name: "TransferHistory",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "TransferHistory",
  designerProps: {
    propsSchema: transferHistorySchema,
  },
  designerLocales: AllLocales.TransferHistory,
});

TransferHistory.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "TransferHistory",
        "x-decorator": "FormItem",
        "x-component": "TransferHistory",
      },
    },
  ],
});
