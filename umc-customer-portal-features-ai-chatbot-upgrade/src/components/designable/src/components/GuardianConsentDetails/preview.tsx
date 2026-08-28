import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import type { ISchema } from "@formily/react";
import { connect, mapProps } from "@formily/react";
import { createFieldSchema } from "../Field";
import { AllLocales } from "../../locales";
import { GuardianConsentDetailsField } from "./GuardianConsentDetailsField";

const guardianConsentDetailsComponentSchema: ISchema = {
  type: "object",
  properties: {},
};

export const GuardianConsentDetails: DnFC<
  React.ComponentProps<typeof GuardianConsentDetailsField>
> = connect(
  GuardianConsentDetailsField,
  mapProps((props, field) => ({
    ...props,
    designMode: field?.designable ? true : false,
  }))
);

GuardianConsentDetails.Behavior = createBehavior({
  name: "GuardianConsentDetails",
  extends: ["Field"],
  selector: (node) =>
    node.props?.["x-component"] === "GuardianConsentDetails",
  designerProps: {
    propsSchema: createFieldSchema(guardianConsentDetailsComponentSchema),
  },
  designerLocales: (AllLocales as any).GuardianConsentDetails,
});

GuardianConsentDetails.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "guardianConsentDetails",
        "x-decorator": "FormItem",
        "x-component": "GuardianConsentDetails",
      },
    },
  ],
});

export default GuardianConsentDetails;
