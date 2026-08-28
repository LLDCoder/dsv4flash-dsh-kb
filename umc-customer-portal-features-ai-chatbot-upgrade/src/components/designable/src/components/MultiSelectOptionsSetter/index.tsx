import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Input, Radio, Switch } from "antd";
import { HolderOutlined, DeleteOutlined } from "@ant-design/icons";
import { useForm } from "@formily/react";
import {
  SortableContainer,
  SortableElement,
  SortableHandle,
} from "react-sortable-hoc";
import type { SortEnd } from "react-sortable-hoc";
import { arrayMoveImmutable } from "array-move";
import "./index.less";

export interface MultiSelectOptionItem {
  key: string;
  value: string;
  description: string;
  showDescription: boolean;
}

interface MultiSelectOptionsSetterProps {
  value?: {
    label: string;
    value: string;
    description?: string;
    showDescription?: boolean;
  }[];
  onChange?: (
    value: {
      label: string;
      value: string;
      description?: string;
      showDescription?: boolean;
    }[]
  ) => void;
}

const DEFAULT_OPTIONS: MultiSelectOptionItem[] = [
  { key: "Option 1", value: "Option 1", description: "", showDescription: false },
  { key: "Option 2", value: "Option 2", description: "", showDescription: false },
  { key: "Option 3", value: "Option 3", description: "", showDescription: false },
];

const MultiSelectOptionsSetter: React.FC<MultiSelectOptionsSetterProps> = ({
  value,
  onChange,
}) => {
  const form = useForm();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<MultiSelectOptionItem[]>(DEFAULT_OPTIONS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [defaultIndex, setDefaultIndex] = useState(0);

  const enumValue = value;
  const defaultVal = (form as any).values?.default;

  const parseOptions = useCallback(
    (
      enumArr:
        | { label: string; value: string; description?: string; showDescription?: boolean }[]
        | undefined
    ): MultiSelectOptionItem[] => {
      if (!enumArr || !Array.isArray(enumArr) || enumArr.length === 0) {
        return DEFAULT_OPTIONS;
      }
      return enumArr.map((item) => ({
        key: item.label,
        value: item.value,
        description: item.description || "",
        showDescription: item.showDescription || false,
      }));
    },
    []
  );

  const findDefaultIndex = useCallback(
    (opts: MultiSelectOptionItem[], def: string | string[] | undefined): number => {
      if (!def || opts.length === 0) return 0;
      const defVal = Array.isArray(def) ? def[0] : def;
      if (!defVal) return 0;
      const idx = opts.findIndex((o) => o.value === defVal);
      return idx >= 0 ? idx : 0;
    },
    []
  );

  useEffect(() => {
    const opts = parseOptions(enumValue);
    setOptions(opts);
    setSelectedIndex(0);
    setDefaultIndex(findDefaultIndex(opts, defaultVal));
  }, [visible, enumValue, defaultVal, parseOptions, findDefaultIndex]);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const opts = parseOptions(enumValue);
    setOptions(opts.length > 0 ? opts : DEFAULT_OPTIONS);
    setSelectedIndex(0);
    setDefaultIndex(findDefaultIndex(opts, defaultVal));
    setVisible(true);
  };

  const handleSave = () => {
    const enumArr = options.map((o) => ({
      label: o.key,
      value: o.value,
      description: o.description,
      showDescription: o.showDescription,
    }));
    const defaultOptionValue =
      options.length > 0 ? options[defaultIndex].value : undefined;

    onChange?.(enumArr);
    (form as any).setValuesIn?.(
      "default",
      defaultOptionValue ? [defaultOptionValue] : []
    );
    setVisible(false);
  };

  const handleCancel = () => {
    const opts = parseOptions(enumValue);
    setOptions(opts.length > 0 ? opts : DEFAULT_OPTIONS);
    setSelectedIndex(0);
    setDefaultIndex(findDefaultIndex(opts, defaultVal));
    setVisible(false);
  };

  const isConfigured =
    enumValue && Array.isArray(enumValue) && enumValue.length > 0;

  const handleAddNode = () => {
    const num = options.length + 1;
    const newOpt: MultiSelectOptionItem = {
      key: `Option ${num}`,
      value: `Option ${num}`,
      description: "",
      showDescription: false,
    };
    setOptions([...options, newOpt]);
    setSelectedIndex(options.length);
  };

  const handleDelete = (index: number) => {
    if (options.length <= 1) return;
    const next = options.filter((_, i) => i !== index);
    setOptions(next);
    if (selectedIndex >= next.length) {
      setSelectedIndex(Math.max(0, next.length - 1));
    } else if (selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (defaultIndex >= next.length) {
      setDefaultIndex(Math.max(0, next.length - 1));
    } else if (defaultIndex > index) {
      setDefaultIndex(defaultIndex - 1);
    }
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const next = [...options];
    const oldKey = next[index].key;
    const wasValueSameAsKey = next[index].value === oldKey;
    next[index] = {
      ...next[index],
      key: newKey,
      ...(wasValueSameAsKey ? { value: newKey } : {}),
    };
    setOptions(next);
  };

  const handleValueChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = { ...next[index], value: val };
    setOptions(next);
  };

  const handleDescriptionChange = (index: number, desc: string) => {
    const next = [...options];
    next[index] = { ...next[index], description: desc };
    setOptions(next);
  };

  const handleShowDescriptionChange = (
    index: number,
    showDesc: boolean
  ) => {
    const next = [...options];
    next[index] = { ...next[index], showDescription: showDesc };
    setOptions(next);
  };

  const onSortEnd = ({ oldIndex, newIndex }: SortEnd) => {
    if (oldIndex === newIndex) return;
    const next = arrayMoveImmutable(options, oldIndex, newIndex);
    setOptions(next);
    setSelectedIndex(
      selectedIndex === oldIndex
        ? newIndex
        : selectedIndex < oldIndex && selectedIndex >= newIndex
        ? selectedIndex + 1
        : selectedIndex > oldIndex && selectedIndex <= newIndex
        ? selectedIndex - 1
        : selectedIndex
    );
    setDefaultIndex(
      defaultIndex === oldIndex
        ? newIndex
        : defaultIndex < oldIndex && defaultIndex >= newIndex
        ? defaultIndex + 1
        : defaultIndex > oldIndex && defaultIndex <= newIndex
        ? defaultIndex - 1
        : defaultIndex
    );
  };

  const selectedOption = options[selectedIndex];

  const DragHandle = SortableHandle(() => (
    <span className="drag-handle">
      <HolderOutlined />
    </span>
  ));

  const SortableOptionItem = SortableElement(
    ({
      opt,
      isSelected,
      isDefault,
      onSelect,
      onDefaultChange,
      onDelete,
    }: {
      opt: MultiSelectOptionItem;
      index: number;
      isSelected: boolean;
      isDefault: boolean;
      onSelect: () => void;
      onDefaultChange: () => void;
      onDelete: () => void;
    }) => (
      <div
        className={`option-item ${isSelected ? "selected" : ""}`}
        onClick={onSelect}
      >
        <DragHandle />
        <span className="option-label">{opt.key}</span>
        <span
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <DeleteOutlined />
        </span>
        <Radio
          checked={isDefault}
          onChange={onDefaultChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )
  );

  const SortableOptionsList = SortableContainer(
    ({ children }: { children?: React.ReactNode }) => (
      <div className="options-list">{children}</div>
    )
  );

  return (
    <div className="multi-select-options-setter">
      <Button
        block
        type="default"
        htmlType="button"
        className={`options-config-btn ${isConfigured ? "configured" : ""}`}
        onClick={handleOpenModal}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isConfigured ? "Configured" : "Options Configuration"}
      </Button>
      <Modal centered
        title="Options Configuration"
        visible={visible}
        onCancel={handleCancel}
        footer={null}
        width={900}
        className="multi-select-options-modal"
        destroyOnClose
        maskClosable={false}
        getContainer={() => document.body}
      >
        <div className="options-config-content">
          <div className="options-tree-section">
            <div className="section-header">
              <span className="section-label">Option Tree</span>
              <Button
                type="primary"
                ghost
                size="small"
                onClick={handleAddNode}
                className="add-node-btn"
              >
                Add Node
              </Button>
            </div>
            <SortableOptionsList
              onSortEnd={onSortEnd}
              useDragHandle
              helperClass="sortable-helper"
            >
              {options.map((opt, index) => (
                <SortableOptionItem
                  key={`opt-${index}`}
                  index={index}
                  opt={opt}
                  isSelected={selectedIndex === index}
                  isDefault={defaultIndex === index}
                  onSelect={() => setSelectedIndex(index)}
                  onDefaultChange={() => setDefaultIndex(index)}
                  onDelete={() => handleDelete(index)}
                />
              ))}
            </SortableOptionsList>
          </div>
          <div className="node-property-section">
            <div className="section-label">Node Property</div>
            {selectedOption ? (
              <div className="property-fields">
                <div className="field-item">
                  <label>
                    Key <span className="required-mark">*</span>
                  </label>
                  <Input
                    value={selectedOption.key}
                    onChange={(e) =>
                      handleKeyChange(
                        selectedIndex,
                        e.target.value.slice(0, 200)
                      )
                    }
                    maxLength={200}
                    placeholder="Key"
                  />
                </div>
                <div className="field-item">
                  <label>
                    Value <span className="required-mark">*</span>
                  </label>
                  <Input
                    value={selectedOption.value}
                    onChange={(e) =>
                      handleValueChange(
                        selectedIndex,
                        e.target.value.slice(0, 200)
                      )
                    }
                    maxLength={200}
                    placeholder="Value"
                  />
                </div>
                <div className="field-item description-field">
                  <div className="description-header">
                    <label>Description</label>
                    <Switch
                      checked={selectedOption.showDescription}
                      onChange={(checked) =>
                        handleShowDescriptionChange(selectedIndex, checked)
                      }
                      size="small"
                    />
                  </div>
                  {selectedOption.showDescription && (
                    <Input.TextArea
                      value={selectedOption.description}
                      onChange={(e) =>
                        handleDescriptionChange(
                          selectedIndex,
                          e.target.value.slice(0, 200)
                        )
                      }
                      maxLength={200}
                      placeholder="Enter content"
                      rows={4}
                      showCount
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="no-selection">Select an option</div>
            )}
          </div>
        </div>
        <div className="modal-footer-custom">
          <Button onClick={handleCancel} className="cancel-btn">
            Cancel
          </Button>
          <Button type="primary" onClick={handleSave} className="save-btn">
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MultiSelectOptionsSetter;
