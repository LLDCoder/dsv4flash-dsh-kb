import type { ISchema } from "@formily/react";

export const PressCardSelector: ISchema = {
  type: "object",
  properties: {
    placeholder: {
      type: "string",
      title: "Placeholder",
      default: "Select a press card",
      "x-decorator": "FormItem",
      "x-component": "Input",
    },
  },
};
