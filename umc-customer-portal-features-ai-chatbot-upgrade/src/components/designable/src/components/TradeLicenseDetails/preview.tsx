import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { TradeLicenseDetailsField } from "./TradeLicenseDetailsField";

export const TradeLicenseDetails: DnFC<
  React.ComponentProps<typeof TradeLicenseDetailsField>
> = TradeLicenseDetailsField;

const tradeLicenseDetailsSchema: ISchema = {
  type: "object",
  properties: {},
};

TradeLicenseDetails.Behavior = createBehavior({
  name: "TradeLicenseDetails",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "TradeLicenseDetails",
  designerProps: {
    propsSchema: tradeLicenseDetailsSchema,
  },
  designerLocales: (AllLocales as any).TradeLicenseDetails,
});

TradeLicenseDetails.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Trade License Details",
        "x-decorator": "FormItem",
        "x-component": "TradeLicenseDetails",
      },
    },
  ],
});
