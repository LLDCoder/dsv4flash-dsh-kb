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
import { SelectTableSingleField } from "./SelectTableField";

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

export const SelectTableSingle: DnFC<any> = observer((props) => {
  const node = useTreeNode();
  const nodeId = useNodeIdProps();

  const componentProps = node?.props?.["x-component-props"] || {};
  const selectTableProps = { ...componentProps, ...props };

  return (
    <div {...nodeId}>
      <SelectTableSingleField {...selectTableProps} />
    </div>
  );
});

SelectTableSingle.Column = (props: any) => {
  return <div {...props}>{props.children}</div>;
};

ArrayBase.mixin(SelectTableSingle);

SelectTableSingle.Behavior = createBehavior({
  name: "SelectTableSingle",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "SelectTableSingle",
  designerProps: {
    droppable: true,
    propsSchema: createFieldSchema(AllSchemas.SelectTableSingle),
  },
  designerLocales: AllLocales.SelectTableSingle,
});

SelectTableSingle.Column.Behavior = createBehavior({
  name: "SelectTableSingle.Column",
  extends: ["Field"],
  selector: (node) => node.props["x-component"] === "SelectTableSingle.Column",
  designerProps: {
    droppable: true,
    allowDrop: (node) =>
      node.props["type"] === "object" &&
      node.parent?.props?.["x-component"] === "SelectTableSingle",
    propsSchema: createVoidFieldSchema(AllSchemas.SelectTableSingle.Column),
  },
  designerLocales:
    (AllLocales.SelectTableSingle as any)?.Column || AllLocales.SelectTableSingle,
});

SelectTableSingle.Resource = createResource({
  icon: "SelectSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name:'SelectTableSingle',
        "x-decorator": "FormItem",
        "x-component": "SelectTableSingle",
        "x-component-props": {
          tableTitle: "Service Fees",
          activityContainerName: "Activity Container Name",
        },
      },
    },
  ],
});
export default SelectTableSingle;