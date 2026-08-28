import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { LicenseTransferFormField } from "./LicenseTransferFormField";

export const LicenseTransferForm: DnFC<
  React.ComponentProps<typeof LicenseTransferFormField>
> = LicenseTransferFormField;

const licenseTransferFormSchema: ISchema = {
  type: "object",
  properties: {
    "field-group": {
      type: "void",
      "x-component": "CollapseItem",
      properties: {
        "x-component-props": {
          type: "object",
          properties: {
            alertMessage: {
              type: "string",
              "x-decorator": "FormItem",
              "x-component": "Input.TextArea",
              "x-component-props": {
                rows: 3,
              },
              default: "License transfer is subject to approval. The recipient must have a valid UAE Media Council account and meet all eligibility requirements.",
              title: "Alert Message",
            },
          },
        },
      },
    },
  },
};

LicenseTransferForm.Behavior = createBehavior({
  name: "LicenseTransferForm",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "LicenseTransferForm",
  designerProps: {
    propsSchema: licenseTransferFormSchema,
  },
  designerLocales: AllLocales.LicenseTransferForm,
});

LicenseTransferForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "License Transfer Form",
        "x-decorator": "FormItem",
        "x-component": "LicenseTransferForm",
        "x-component-props": {
          alertMessage: "License transfer is subject to approval. The recipient must have a valid UAE Media Council account and meet all eligibility requirements.",
        },
      },
    },
  ],
});
