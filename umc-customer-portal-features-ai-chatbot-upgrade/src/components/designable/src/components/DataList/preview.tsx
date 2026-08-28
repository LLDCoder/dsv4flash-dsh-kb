import { createBehavior, createResource } from "@designable/core";
import { connect, mapProps } from "@formily/react";
import { DnFC } from "@designable/react";
import DataListInner from "./DataList";
import { AllLocales } from "../../locales";

export const DataList: DnFC<React.ComponentProps<typeof DataListInner>> =
  connect(
    DataListInner,
    mapProps((props, field) => {
      return {
        ...props,
        designMode: field?.designable ? true : false,
      };
    })
  );

DataList.Behavior = createBehavior({
  name: "DataList",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "DataList",
  designerProps: {
    defaultProps: {
      name: "dataList",
    },
    propsSchema: {
      type: "object",
      properties: {
        "field-group": {
          type: "void",
          "x-component": "CollapseItem",
          properties: {
            "x-component-props": {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  "x-decorator": "FormItem",
                  "x-component": "Input",
                },
                addButtonText: {
                  type: "string",
                  "x-decorator": "FormItem",
                  "x-component": "Input",
                  default: "Add New",
                },
                fieldSource: {
                  type: "object",
                  "x-decorator": "FormItem",
                  "x-component": "DataListSourceSetter",
                },
              },
            },
            "x-decorator-props": {
              type: "object",
              properties: {
                tooltip: {
                  type: "string",
                  "x-decorator": "FormItem",
                  "x-decorator-props": { colon: false, label: " " },
                  "x-component": "DescriptionRichTextSetter",
                },
              },
            },
            required: {
              type: "boolean",
              "x-decorator": "FormItem",
              "x-component": "Switch",
            },
            "x-display": {
              type: "string",
              "x-decorator": "FormItem",
              "x-component": "StringSwitchSetter",
              default: "visible",
              "x-component-props": {
                checkedValue: "visible",
                unCheckedValue: "none",
              },
            },
            "x-pattern": {
              type: "string",
              "x-decorator": "FormItem",
              "x-component": "StringSwitchSetter",
              default: "editable",
              "x-component-props": {
                checkedValue: "editable",
                unCheckedValue: "disabled",
              },
            },
          },
        },
      },
    },
  },
  designerLocales: AllLocales.DataList,
});

DataList.Resource = createResource({
  title: '',
  icon: "TableOutlined",
  elements: [
    {
      componentName: "Field",
      props: {
        type: "array",
        title: "",
        "x-decorator": "FormItem",
        "x-decorator-props": {
          colon: false,
          label: false,
        },
        "x-component": "DataList",
        "x-component-props": {
          addButtonText: "Add New",
          title: "Data List",
        },
      },
    },
  ],
});

export default DataList;
