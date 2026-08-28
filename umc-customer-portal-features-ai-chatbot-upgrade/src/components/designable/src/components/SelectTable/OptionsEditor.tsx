import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Input, Tree, Form } from "antd";
import { DownOutlined } from '@ant-design/icons';
import {
  PlusOutlined,
  DeleteTwoTone,
  FolderOutlined,
  FileOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useField } from "@formily/react";
import type { DataNode } from "antd/es/tree";
import "./OptionsEditor.less";

interface ExtendedDataNode extends DataNode {
  label?: string;
  value?: string;
  fee?: string;
  children?: ExtendedDataNode[];
}

interface TreeNodeData {
  label: string;
  value: string;
  fee?: string;
  key?: string;
  children?: TreeNodeData[];
}

interface OptionsEditorProps {
  value?: TreeNodeData[];
  onChange?: (value: TreeNodeData[]) => void;
}

const convertToTreeData = (data: TreeNodeData[]): ExtendedDataNode[] => {
  return data.map((item, index) => ({
    title: item.label || item.value || `Option ${index + 1}`,
    key: item.key || `node-${Date.now()}-${index}`,
    value: item.value,
    label: item.label,
    fee: item.fee || "",
    children: item.children ? convertToTreeData(item.children) : undefined,
    icon:
      item.children && item.children.length > 0 ? (
        <FolderOutlined />
      ) : (
        <FileOutlined />
      ),
  }));
};

const convertToFlatData = (treeData: ExtendedDataNode[]): TreeNodeData[] => {
  return treeData.map((node) => ({
    label: node.label || (node.title as string) || "",
    value: node.value || node.label || (node.key as string) || "",
    fee: node.fee || "",
    key: node.key as string,
    children:
      node.children && node.children.length > 0
        ? convertToFlatData(node.children as ExtendedDataNode[])
        : undefined,
  }));
};

const generateKey = () =>
  `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

//
const getAllParentKeys = (data: ExtendedDataNode[]): React.Key[] => {
  const parentKeys: React.Key[] = [];

  const traverse = (nodes: ExtendedDataNode[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        parentKeys.push(node.key);
        traverse(node.children as ExtendedDataNode[]);
      }
    });
  };

  traverse(data);
  return parentKeys;
};

const findNode = (
  treeData: ExtendedDataNode[],
  key: string
): ExtendedDataNode | null => {
  for (const node of treeData) {
    if (node.key === key) {
      return node;
    }
    if (node.children) {
      const found = findNode(node.children as ExtendedDataNode[], key);
      if (found) return found;
    }
  }
  return null;
};

const deleteNode = (
  treeData: ExtendedDataNode[],
  key: string
): ExtendedDataNode[] => {
  return treeData
    .filter((node) => node.key !== key)
    .map((node) => ({
      ...node,
      children: node.children
        ? deleteNode(node.children as ExtendedDataNode[], key)
        : undefined,
    }));
};

const updateNode = (
  treeData: ExtendedDataNode[],
  key: string,
  updates: Partial<ExtendedDataNode>
): ExtendedDataNode[] => {
  return treeData.map((node) => {
    if (node.key === key) {
      return { ...node, ...updates };
    }
    if (node.children) {
      return {
        ...node,
        children: updateNode(node.children as ExtendedDataNode[], key, updates),
      };
    }
    return node;
  });
};

const addChildNode = (
  treeData: ExtendedDataNode[],
  parentKey: string
): ExtendedDataNode[] => {
  return treeData.map((node) => {
    if (node.key === parentKey) {
      const newChild: ExtendedDataNode = {
        title: "item",
        key: generateKey(),
        value: "",
        label: "",
        fee: "",
        icon: <FileOutlined />,
      };
      return {
        ...node,
        children: [...(node.children || []), newChild],
        icon: <FolderOutlined />,
      };
    }
    if (node.children) {
      return {
        ...node,
        children: addChildNode(node.children as ExtendedDataNode[], parentKey),
      };
    }
    return node;
  });
};

const OptionsEditor: React.FC<OptionsEditorProps> = (props) => {
  const field = useField();
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [treeData, setTreeData] = useState<ExtendedDataNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ExtendedDataNode | null>(
    null
  );
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const getCurrentValue = useCallback((): TreeNodeData[] => {
    if (props.value !== undefined) {
      return props.value || [];
    }
    const fieldValue = (field as any).value;
    return Array.isArray(fieldValue) ? fieldValue : [];
  }, [props.value, field]);

  useEffect(() => {
    const currentValue = getCurrentValue();
    if (currentValue.length > 0) {
      const data = convertToTreeData(currentValue);
      setTreeData(data);
      //
      setExpandedKeys(getAllParentKeys(data));
    } else {
      setTreeData([]);
      setExpandedKeys([]);
    }
  }, [getCurrentValue, visible]);

  const handleOpen = () => {
    const currentValue = getCurrentValue();
    if (currentValue.length > 0) {
      const data = convertToTreeData(currentValue);
      setTreeData(data);
      //
      setExpandedKeys(getAllParentKeys(data));
    } else {
      setTreeData([]);
      setExpandedKeys([]);
    }
    setSelectedKey(null);
    setSelectedNode(null);
    form.resetFields();
    setVisible(true);
  };

  const handleOk = () => {
    const flatData = convertToFlatData(treeData);
    const filteredData = flatData.filter((item) => {
      if (!item.label) return false;
      if (item.children && item.children.length > 0) {
        item.children = item.children.filter((child) => child.label);

        if (item.children.length > 0) return true;
      }
      return item.label;
    });

    if (props.onChange) {
      props.onChange(filteredData);
    } else {
      if ((field as any).setValue) {
        (field as any).setValue(filteredData);
      }
    }
    setVisible(false);
  };

  const handleCancel = () => {
    const currentValue = getCurrentValue();
    if (currentValue.length > 0) {
      const data = convertToTreeData(currentValue);
      setTreeData(data);
      //
      setExpandedKeys(getAllParentKeys(data));
    } else {
      setTreeData([]);
      setExpandedKeys([]);
    }
    setSelectedKey(null);
    setSelectedNode(null);
    form.resetFields();
    setVisible(false);
  };

  const handleAddNode = () => {
    const newNode: ExtendedDataNode = {
      title: "item",
      key: generateKey(),
      value: "",
      label: "",
      fee: "",
      children: [],
      icon: <FolderOutlined />,
    };
    setTreeData([...treeData, newNode]);
  };

  const handleAddChild = () => {
    if (!selectedKey) {
      handleAddNode();
      return;
    }
    setTreeData(addChildNode(treeData, selectedKey));
  };

  const handleDelete = () => {
    if (!selectedKey) return;
    handleDeleteNode(selectedKey);
  };

  const handleDeleteNode = (key: string) => {
    const newTreeData = deleteNode(treeData, key);
    const updatedTreeData = updateNodeIcons(newTreeData);
    setTreeData(updatedTreeData);
    if (selectedKey === key) {
      setSelectedKey(null);
      setSelectedNode(null);
      form.resetFields();
    }
  };

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) {
      setSelectedKey(null);
      setSelectedNode(null);
      form.resetFields();
      return;
    }
    const key = selectedKeys[0] as string;
    const node = findNode(treeData, key);
    setSelectedKey(key);
    setSelectedNode(node);
    if (node) {
      form.setFieldsValue({
        label: node.label || node.title || "",
        fee: node.fee || "",
      });
    }
  };

  // /
  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys);
  };

  useEffect(() => {
    if (selectedKey && selectedNode) {
      const currentValues = {
        label: selectedNode.label || selectedNode.title || "",
        fee: selectedNode.fee || "",
      };

      const formValues = form.getFieldsValue();
      if (
        formValues.label !== currentValues.label ||
        formValues.fee !== currentValues.fee
      ) {
        form.setFieldsValue(currentValues);
      }
    } else if (!selectedKey) {
      form.resetFields();
    }
  }, [selectedKey, selectedNode, form]);

  const handleFormChange = useCallback(
    (changedValues: any, allValues: any) => {
      if (!selectedKey) return;

      setTreeData((prevTreeData) => {
        const node = findNode(prevTreeData, selectedKey);
        if (!node) return prevTreeData;

        const hasChildren = node.children && node.children.length > 0;
        const updates: Partial<ExtendedDataNode> = {
          label: allValues.label || "",
          fee: allValues.fee || "",
          title: allValues.label || "item",
          icon: hasChildren ? <FolderOutlined /> : <FileOutlined />,
        };

        const updatedTreeData = updateNode(prevTreeData, selectedKey, updates);

        const updatedNode = findNode(updatedTreeData, selectedKey);
        if (updatedNode) {
          setSelectedNode(updatedNode);
        }

        return updatedTreeData;
      });
    },
    [selectedKey]
  );

  const updateNodeIcons = (data: ExtendedDataNode[]): ExtendedDataNode[] => {
    return data.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      return {
        ...node,
        icon: hasChildren ? <FolderOutlined /> : <FileOutlined />,
        children: node.children
          ? updateNodeIcons(node.children as ExtendedDataNode[])
          : undefined,
      };
    });
  };

  const deepCloneNode = (node: ExtendedDataNode): ExtendedDataNode => {
    return {
      ...node,
      children: node.children
        ? node.children.map((child) => deepCloneNode(child))
        : undefined,
    };
  };

  const handleDrop = (info: any) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split("-");
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (
      data: ExtendedDataNode[],
      key: string,
      callback: (
        item: ExtendedDataNode,
        index: number,
        arr: ExtendedDataNode[]
      ) => void
    ) => {
      data.forEach((item, index, arr) => {
        if (item.key === key) {
          callback(item, index, arr);
          return;
        }
        if (item.children) {
          loop(item.children as ExtendedDataNode[], key, callback);
        }
      });
    };

    const data = treeData.map((node) => deepCloneNode(node));
    let dragObj: ExtendedDataNode | null = null;

    const findAndRemove = (nodes: ExtendedDataNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].key === dragKey) {
          dragObj = deepCloneNode(nodes[i]);
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i].children) {
          if (findAndRemove(nodes[i].children as ExtendedDataNode[])) {
            return true;
          }
        }
      }
      return false;
    };

    findAndRemove(data);

    if (!dragObj) return;

    if (!info.dropToGap) {
      // ，
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);

        //
        if (!expandedKeys.includes(dropKey)) {
          setExpandedKeys([...expandedKeys, dropKey]);
        }
      });
    } else if (
      (info.node.children || []).length > 0 &&
      info.node.expanded &&
      dropPosition === 1
    ) {
      //
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);
      });
    } else {
      // ，
      let ar: ExtendedDataNode[] = [];
      let i: number = 0;
      loop(data, dropKey, (item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj!);
      } else {
        ar.splice(i + 1, 0, dragObj!);
      }
    }

    const updatedData = updateNodeIcons(data);
    setTreeData(updatedData);

    if (selectedKey === dragKey) {
      setSelectedKey(dragKey);
      const updatedNode = findNode(updatedData, dragKey);
      setSelectedNode(updatedNode);
      if (updatedNode) {
        form.setFieldsValue({
          label: updatedNode.label || updatedNode.title || "",
          fee: updatedNode.fee || "",
        });
      }
    }
  };

  return (
    <>
      <Button onClick={handleOpen} type="default" block>
        Configure
      </Button>
      <Modal centered
        title="Activity Configuration"
        visible={visible}
        onCancel={handleCancel}
        width={1000}
        footer={null}
        className="activity-config-modal"
        bodyStyle={{ padding: "24px" }}
      >
        <div className="activity-config-content">
          <div className="options-tree-container">
            <div className="options-tree-header">
              <h3 className="options-tree-title">Options Tree</h3>
              <Button
                type="primary"
                onClick={handleAddNode}
                size="middle"
                className="add-node-btn"
              >
                Add Node
              </Button>
            </div>
            <div className="options-tree-content">
              {treeData.length > 0 ? (
                <Tree
                  draggable
                  blockNode
                  showLine={true}
                  selectedKeys={selectedKey ? [selectedKey] : []}
                  expandedKeys={expandedKeys}
                  onExpand={handleExpand}
                  onSelect={handleSelect}
                  onDrop={handleDrop}
                  treeData={treeData}
                  className="activity-tree"
                  switcherIcon={<DownOutlined />}
                  titleRender={(nodeData) => {
                    const node = nodeData as ExtendedDataNode;
                    const isSelected = selectedKey === node.key;
                    return (
                      <div
                        className={`tree-node-title ${
                          isSelected ? "tree-node-selected" : ""
                        }`}
                      >
                        <MenuOutlined className="drag-handle" />
                        <span
                          className="tree-node-text"
                          title={node.title as string}
                        >
                          {node.title}
                        </span>
                        {isSelected && (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteTwoTone twoToneColor="#eb2f96" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(node.key as string);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            className="tree-node-delete-btn"
                            title="Del"
                          />
                        )}
                      </div>
                    );
                  }}
                />
              ) : (
                <div className="empty-tree">
                  No options available. Click the "Add Node" button to add.
                </div>
              )}
            </div>
          </div>

          <div className="divider-vertical"></div>

          <div className="node-property-container">
            <h3 className="node-property-title">Node Property</h3>
            <div className="node-property-content">
              {selectedNode ? (
                <Form
                  form={form}
                  layout="vertical"
                  onValuesChange={handleFormChange}
                >
                  <Form.Item
                    label="Label"
                    name="label"
                    rules={[
                      { required: true, message: "Please enter the Label" },
                    ]}
                  >
                    <Input placeholder="Please enter the Label" />
                  </Form.Item>
                  {treeData.filter((item) => {
                    return item.key === selectedKey;
                  }).length == 0 && (
                    <Form.Item label="Fee" name="fee">
                      <Input placeholder="Please enter the Fee" />
                    </Form.Item>
                  )}
                </Form>
              ) : (
                <div className="empty-property">
                  Please select a node on the left to edit.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer-custom">
          <Button onClick={handleCancel} className="cancel-btn">
            Cancel
          </Button>
          <Button type="primary" onClick={handleOk} className="save-btn">
            Save
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default OptionsEditor;
