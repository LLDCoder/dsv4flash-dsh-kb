import React, { useState, useEffect, useCallback } from "react";
import { Select } from "antd";
import { useDesigner } from "@designable/react";
import "./index.less";
import { getFieldDictionaryList } from "@/services/services";
// Mock data - replace with API data later
// const MOCK_OPTIONS= []
export interface UniqueValueSetterProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
}

const UniqueValueSetter: React.FC<UniqueValueSetterProps> = ({
  value,
  onChange,
}) => {
  const [MOCK_OPTIONS, setMOCK_OPTIONS] = useState<
    { fieldKey: string; fieldValue: string }[]
  >([]);
  const engine = useDesigner();
  const [currentValue, setCurrentValue] = useState<string | undefined>(value);

  const getSelectedNode = useCallback(() => {
    try {
      const tree = engine?.getCurrentTree?.();
      const workspace = (engine as any)?.workbench?.currentWorkspace;
      const selectedId = workspace?.operation?.selection?.selected?.[0];
      return selectedId && tree ? tree.findById(selectedId) : null;
    } catch {
      return null;
    }
  }, [engine]);

  useEffect(() => {
    if (value !== currentValue) {
      setCurrentValue(value);
    }
  }, [value]);

  useEffect(() => {
    getFieldDictionaryList().then((res) => {
      const formattedOptions = (res.data || []).map((item: any) => ({
        label: item.fieldValue,
        value: item.fieldKey,
      }));
      setMOCK_OPTIONS(formattedOptions);
    });
  }, []);

  const handleChange = (selectedValue: string | undefined) => {
    setCurrentValue(selectedValue);
    onChange?.(selectedValue);

    const node = getSelectedNode();
    if (node && selectedValue) {
      node.props.name = selectedValue;
    }
  };

  return (
    <div className="unique-value-setter">
      <Select
        value={currentValue}
        onChange={handleChange}
        options={MOCK_OPTIONS}
        placeholder="Select unique value"
        allowClear
        showSearch
        optionFilterProp="label"
        style={{ width: "100%" }}
        getPopupContainer={(trigger) =>
          trigger.closest(".dn-settings-form") || document.body
        }
      />
    </div>
  );
};

export default UniqueValueSetter;
