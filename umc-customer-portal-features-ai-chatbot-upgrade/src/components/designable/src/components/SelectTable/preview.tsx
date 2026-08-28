import React from "react";
import { Select as FormilySelect } from "@formily/antd";
import { Table } from "antd";
import { createBehavior, createResource, TreeNode } from "@designable/core";
import {
  DnFC,
  useTreeNode,
  useNodeIdProps,
  TreeNodeWidget,
} from "@designable/react";
import { createFieldSchema } from "../Field";
import { createVoidFieldSchema } from "../Field";
import { AllSchemas } from "../../schemas";
import { AllLocales } from "../../locales";
import { observer, useField, useForm } from "@formily/react";
import { ArrayBase } from "@formily/antd";
import { useDropTemplate } from "../../hooks";
import AED from "@/assets/images/AED.png";
import { queryNodesByComponentPath } from "../../shared";
import "./styles.less";
import { SelectTableField } from "./SelectTableField";

const ensureObjectItemsNode = (node: TreeNode) => {
  const takeNode = node.children.find(
    (child) => child.props["type"] === "array"
  );
  if (takeNode) {
    return takeNode;
  }
  const objectNode = node.children.find(
    (child) => child.props["type"] === "object"
  );
  if (objectNode) {
    return objectNode;
  }
  const newObjectNode = new TreeNode({
    componentName: "Field",
    props: {
      type: "object",
    },
  });
  node.append(newObjectNode);
  return newObjectNode;
};

export const SelectTable: DnFC<any> = observer((props) => {
  const node = useTreeNode();
  const nodeId = useNodeIdProps();

  const componentProps = node?.props?.["x-component-props"] || {};
  const selectTableProps = { ...componentProps, ...props };

  return (
    <div {...nodeId}>
      <SelectTableField {...selectTableProps} />
    </div>
  );
});

SelectTable.Column = (props: any) => {
  return <div {...props}>{props.children}</div>;
};

ArrayBase.mixin(SelectTable);

SelectTable.Behavior = createBehavior({
  name: "SelectTable",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "SelectTable",
  designerProps: {
    droppable: true,
    propsSchema: createFieldSchema(AllSchemas.SelectTable),
  },
  designerLocales: AllLocales.SelectTable,
});

SelectTable.Column.Behavior = createBehavior({
  name: "SelectTable.Column",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "SelectTable.Column",
  designerProps: {
    droppable: true,
    allowDrop: (node) =>
      node.props["type"] === "object" &&
      node.parent?.props?.["x-component"] === "SelectTable",
    propsSchema: createVoidFieldSchema(AllSchemas.SelectTable.Column),
  },
  designerLocales:
    (AllLocales.SelectTable as any)?.Column || AllLocales.SelectTable,
});

SelectTable.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name:'SelectTable',
        "x-decorator": "FormItem",
        "x-component": "SelectTable",
        "x-component-props": {
          tableTitle: "Service Fees",
          activityContainerName: "Activity Container Name",
        },
      },
    },
  ],
});
export default SelectTable;