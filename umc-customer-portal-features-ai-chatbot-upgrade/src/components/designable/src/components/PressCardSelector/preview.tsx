import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import { connect, mapProps } from "@formily/react";
import type { DnFC } from "@designable/react";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import PressCardSelectorInner from "./PressCardSelector";

export const PressCardSelector: DnFC<
  React.ComponentProps<typeof PressCardSelectorInner>
> = connect(
  PressCardSelectorInner,
  mapProps((props, field) => ({
    ...props,
    designMode: field?.designable ? true : false,
  }))
);

PressCardSelector.Behavior = createBehavior({
  name: "PressCardSelector",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "PressCardSelector",
  designerProps: {
    propsSchema: {
      type: "object",
      properties: {
        "field-group": {
          type: "void",
          "x-component": "CollapseItem",
          properties: {
            title: {
              type: "string",
              "x-decorator": "FormItem",
              "x-component": "Input",
            },
          },
        },
        "component-group": {
          type: "void",
          "x-component": "CollapseItem",
          properties: {
            "x-component-props": AllSchemas.PressCardSelector,
          },
        },
      },
    },
  },
  designerLocales: AllLocales.PressCardSelector,
});

PressCardSelector.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        type: "string",
        name: "pressCardSelector",
        "x-decorator": "FormItem",
        "x-component": "PressCardSelector",
        title: "Press Card Selector",
        "x-component-props": {
          placeholder: "Select a press card",
        },
      },
    },
  ],
});

export default PressCardSelector;
