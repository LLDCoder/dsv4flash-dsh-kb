import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { DnFC } from "@designable/react";
import { ISchema } from "@formily/react";
import { AllLocales } from "../../locales";
import { GameDistributionFormField } from "./GameDistributionFormField";

export const GameDistributionForm: DnFC<
  React.ComponentProps<typeof GameDistributionFormField>
> = GameDistributionFormField;

const gameDistributionFormSchema: ISchema = {
  type: "object",
  properties: {
    "field-group": {
      type: "void",
      "x-component": "CollapseItem",
      properties: {
        "x-component-props": {
          type: "object",
          properties: {},
        },
      },
    },
  },
};

GameDistributionForm.Behavior = createBehavior({
  name: "GameDistributionForm",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "GameDistributionForm",
  designerProps: {
    propsSchema: gameDistributionFormSchema,
  },
  designerLocales: AllLocales.GameDistributionForm,
});

GameDistributionForm.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "Game Distribution Form",
        "x-decorator": "FormItem",
        "x-component": "GameDistributionForm",
      },
    },
  ],
});
