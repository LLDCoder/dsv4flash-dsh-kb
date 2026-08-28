import * as React from "react";
import { useState, useEffect } from "react";
import { Button, Modal, Table, Select } from "antd";
import { useField } from "@formily/react";
import { languageOptions } from "../../LanguageSelectMulti/language";
import EmptyBox from "../../../../../common/EmptyBox/EmptyBox";
import "./DataListSourceSetter.less";

export interface DropdownOption {
  label: string;
  value: number | string;
}

export interface DataListFieldConfig {
  fieldName: string;
  required: boolean;
  placeholderText: string;
  listVisible: boolean;
  formVisible: boolean;
  displayType: "Text Input" | "Dropdown" | "Emirates ID" | "Email" | "Mobile";
  options?: DropdownOption[];
  fieldType: 'string' | 'number';
  /**
   * Stable record key persisted to form values. When provided, the runtime
   * uses this instead of the fieldName-derived key so the saved data structure
   * stays fixed (e.g. List of Trainees -> fullName/emiratesIdNumber/...).
   */
  fieldKey?: string;
}

export interface DataListSourceConfig {
  dataSource: string;
  fields: DataListFieldConfig[];
}

interface DataListSourceSetterProps {
  value?: DataListSourceConfig;
  onChange?: (value: DataListSourceConfig) => void;
}

interface DataSourceOption {
  label: string;
  value: string;
}

const DATA_SOURCE_OPTIONS: DataSourceOption[] = [
  { label: "Equipment List", value: "equipment_list" },
  { label: "Material List", value: "material_list" },
  { label: "Languages & Name List", value: "languages_name_list" },
  { label: "List of Trainees", value: "list_of_trainees" },
];
const SEARCHABLE_CHILDREN_SELECT_PROPS = {
  showSearch: true,
  optionFilterProp: "children" as const,
};
// equipmentId for rule strategy validation
const EQUIPMENT_OPTIONS: DropdownOption[] = [
  { label: "Camera", value: "1" },
  { label: "Tripod", value: "2" },
  { label: "Reflector", value: "3" },
  { label: "Light Meter", value: "4" },
  { label: "Monopod", value: "5" },
  { label: "Photographic filter", value: "6" },
  { label: "Loupe", value: "7" },
  { label: "Photographic film", value: "8" },
  { label: "Extension tube", value: "9" },
  { label: "Snoot", value: "10" },
  { label: "Batteries", value: "11" },
  { label: "Other", value: "12" },
];

const getDefaultFieldsForDataSource = (
  dataSource: string
): DataListFieldConfig[] => {
  const mapping: Record<string, DataListFieldConfig[]> = {
    equipment_list: [
      {
        fieldName: "Equipment",
        fieldType: 'string',
        required: true,
        placeholderText: "Select Equipment",
        listVisible: true,
        formVisible: true,
        displayType: "Dropdown",
        options: EQUIPMENT_OPTIONS,
      },
      {
        fieldName: "Number",
        fieldType: 'number',
        required: true,
        placeholderText: "Enter Number",
        listVisible: true,
        formVisible: true,
        displayType: "Text Input",
      },
    ],
    material_list: [
      {
        fieldName: "Title",
        fieldType: 'string',
        required: true,
        placeholderText: "Enter Title",
        listVisible: true,
        formVisible: true,
        displayType: "Text Input",
      },
      {
        fieldName: "Language",
        fieldType: 'string',
        required: true,
        placeholderText: "Select Language",
        listVisible: true,
        formVisible: true,
        displayType: "Dropdown",
        options: languageOptions,
      },
      {
        fieldName: "Number Of Title",
        fieldType: 'string',
        required: true,
        placeholderText: "Enter Number Of Title",
        listVisible: true,
        formVisible: true,
        displayType: "Text Input",
      },
    ],
    languages_name_list: [
      {
        fieldName: "Language",
        fieldType: 'string',
        required: true,
        placeholderText: "Select Language",
        listVisible: true,
        formVisible: true,
        displayType: "Dropdown",
        options: languageOptions,
      },
      {
        fieldName: "Suggested Name",
        fieldType: 'string',
        required: true,
        placeholderText: "Enter Suggested Name",
        listVisible: true,
        formVisible: true,
        displayType: "Text Input",
      },
    ],
    list_of_trainees: [
      {
        fieldName: "Full Name",
        fieldKey: "fullName",
        fieldType: 'string',
        required: true,
        placeholderText: "Enter full name",
        listVisible: true,
        formVisible: true,
        displayType: "Text Input",
      },
      {
        fieldName: "Emirates ID Number",
        fieldKey: "emiratesIdNumber",
        fieldType: 'string',
        required: true,
        placeholderText: "Enter Emirates ID number",
        listVisible: true,
        formVisible: true,
        displayType: "Emirates ID",
      },
      {
        fieldName: "Mobile Number",
        fieldKey: "mobileNumber",
        fieldType: 'string',
        required: true,
        placeholderText: "Enter mobile number",
        listVisible: true,
        formVisible: true,
        displayType: "Mobile",
      },
      {
        fieldName: "Email",
        fieldKey: "email",
        fieldType: 'string',
        required: true,
        placeholderText: "Enter email address",
        listVisible: true,
        formVisible: true,
        displayType: "Email",
      },
    ],
  };

  return mapping[dataSource] || [];
};

const DataListSourceSetter: React.FC<DataListSourceSetterProps> = (props) => {
  const field = useField();
  const [visible, setVisible] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string>("");
  const [fields, setFields] = useState<DataListFieldConfig[]>([]);

  const getCurrentValue = (): DataListSourceConfig | undefined => {
    if (props.value !== undefined) return props.value;
    return (field as any).value;
  };

  useEffect(() => {
    const val = getCurrentValue();
    if (val) {
      setSelectedDataSource(val.dataSource || "");
      setFields(val.fields || []);
    }
  }, [props.value, field]);

  const handleOpen = () => {
    const val = getCurrentValue();
    if (val) {
      setSelectedDataSource(val.dataSource || "");
      setFields(val.fields || []);
    } else {
      setSelectedDataSource("");
      setFields([]);
    }
    setVisible(true);
  };

  const handleSave = () => {
    const config: DataListSourceConfig = {
      dataSource: selectedDataSource,
      fields,
    };
    if (props.onChange) {
      props.onChange(config);
    } else if ((field as any).setValue) {
      (field as any).setValue(config);
    }
    setVisible(false);
  };

  const handleCancel = () => {
    const val = getCurrentValue();
    if (val) {
      setSelectedDataSource(val.dataSource || "");
      setFields(val.fields || []);
    } else {
      setSelectedDataSource("");
      setFields([]);
    }
    setVisible(false);
  };

  const handleDataSourceChange = (value: string) => {
    setSelectedDataSource(value);
    setFields(getDefaultFieldsForDataSource(value));
  };

  const isConfigured = !!getCurrentValue()?.dataSource;

  const tableColumns = [
    {
      title: "Field Name",
      dataIndex: "fieldName",
      key: "fieldName",
      width: "18%",
    },
    {
      title: "Required",
      dataIndex: "required",
      key: "required",
      width: "10%",
      render: (val: boolean) => (val ? "Yes" : "No"),
    },
    {
      title: "Placeholder Text",
      dataIndex: "placeholderText",
      key: "placeholderText",
      width: "22%",
    },
    {
      title: "List Visible",
      dataIndex: "listVisible",
      key: "listVisible",
      width: "12%",
      render: (val: boolean) => (val ? "Yes" : "No"),
    },
    {
      title: "Form Visible",
      dataIndex: "formVisible",
      key: "formVisible",
      width: "12%",
      render: (val: boolean) => (val ? "Yes" : "No"),
    },
    {
      title: "Display Type",
      dataIndex: "displayType",
      key: "displayType",
      width: "14%",
    },
  ];

  return (
    <div className="datalist-source-setter">
      <Button
        onClick={handleOpen}
        type="default"
        block
        className={`source-config-btn ${isConfigured ? "configured" : ""}`}
      >
        {isConfigured ? "Configured" : "Configure"}
      </Button>
      <Modal centered
        title={
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            Data Source Configuration
          </div>
        }
        visible={visible}
        onCancel={handleCancel}
        width={1000}
        footer={null}
        className="datalist-source-config-modal"
        bodyStyle={{ padding: "24px" }}
        maskClosable={false}
        getContainer={() => document.body}
      >
        <div className="datalist-source-config-content">
          <div className="data-source-select-section">
            <div className="section-label">
              Select Data Source <span style={{ color: "#ff4d4f" }}>*</span>
            </div>
            <Select
              {...SEARCHABLE_CHILDREN_SELECT_PROPS}
              style={{ width: "100%" }}
              placeholder="Please select a data source"
              value={selectedDataSource || undefined}
              onChange={handleDataSourceChange}
              size="large"
            >
              {DATA_SOURCE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="fields-section">
            <div className="section-label">Fields</div>
            <div className="fields-table-container">
              {selectedDataSource && fields.length > 0 ? (
                <Table
                  columns={tableColumns}
                  dataSource={fields}
                  pagination={false}
                  rowKey={(_, index) => `field-${index}`}
                  bordered
                  size="middle"
                />
              ) : (
                <div className="empty-fields">
                  <EmptyBox
                    title="Please select a data source to view available fields"
                    customClassName="empty-fields-content"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer-custom">
            <Button
              onClick={handleCancel}
              size="large"
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              size="large"
              className="save-btn"
              disabled={!selectedDataSource}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DataListSourceSetter;
