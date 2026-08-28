import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { LicenseInformationFormField } from "./LicenseInformationFormField";

export const LicenseInformationForm: DnFC<
  React.ComponentProps<typeof LicenseInformationFormField>
> = LicenseInformationFormField;

const licenseInformationFormSchema: ISchema = {
  type: "object",
  properties: {},
};

LicenseInformationForm.Behavior = createBehavior({
  name: "LicenseInformationForm",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "LicenseInformationForm",
  designerProps: {
    propsSchema: licenseInformationFormSchema,
  },
  designerLocales: AllLocales.LicenseInformationForm,
});

LicenseInformationForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "License Information Form",
        "x-decorator": "FormItem",
        "x-component": "LicenseInformationForm",
      },
    },
  ],
});
