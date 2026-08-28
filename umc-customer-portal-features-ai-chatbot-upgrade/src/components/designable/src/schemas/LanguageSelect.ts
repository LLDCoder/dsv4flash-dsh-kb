import { ISchema } from "@formily/react";

export const LanguageSelect: ISchema = {
  type: "object",
  properties: {
    allowClear: {
      type: "boolean",
      "x-decorator": "FormItem",
      "x-component": "Switch",
    },
    showSearch: {
      type: "boolean",
      "x-decorator": "FormItem",
      "x-component": "Switch",
    },
    placeholder: {
      type: "string",
      "x-decorator": "FormItem",
      "x-component": "Input",
    },
    placeholderKey: {
      type: "string",
      "x-decorator": "FormItem",
      "x-component": "Input",
    },
    placeholderParams: {
      "x-decorator": "FormItem",
      "x-component": "ValueInput",
      "x-component-props": {
        include: ["EXPRESSION"],
      },
    },
  },
};



