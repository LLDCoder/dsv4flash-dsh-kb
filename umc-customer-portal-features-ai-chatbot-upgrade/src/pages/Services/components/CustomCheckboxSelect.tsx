import { useState, type ReactNode } from 'react';
import { Select, Checkbox, Input, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { CustomTagProps } from 'rc-select/lib/BaseSelect';
import { useTranslation } from 'react-i18next';
import { selectDownIcon } from '@/utils/date';
import '../index.less';

interface CustomSelectProps {
  options: {
    label: string;
    value: string;
  }[];
  value?: string[];
  defaultValue?: string[];
  maxTagCount?: number;
  placeholder?: string;
  onChange?: (values: string[]) => void;
}

export default function CustomCheckboxSelect({ 
    options, 
    value,
    defaultValue = [], 
    maxTagCount = 2, 
    placeholder,
    onChange
  }: CustomSelectProps) {
  const { t } = useTranslation();
  const [internalCheckedValues, setInternalCheckedValues] =
    useState<string[]>(defaultValue);
  const checkedValues = value ?? internalCheckedValues;
  const [dropdownSearchValue, setDropdownSearchValue] = useState('');
  const isAllChecked =
    options.length > 0 && checkedValues.length === options.length;
  const isIndeterminate = checkedValues.length > 0 && checkedValues.length < options.length;
  
  const updateValues = (newValues: string[]) => {
    if (value === undefined) {
      setInternalCheckedValues(newValues);
    }
    onChange?.(newValues);
  };

  const handleAllChange = (e: CheckboxChangeEvent) => {
    const newValues = e.target.checked ? options.map(item => item.value) : [];
    updateValues(newValues);
  };

    const customTagRender = ({ value, onClose }: CustomTagProps) => {
      const option = options.find(item => item.value === value);
      const displayLabel = option ? option.label : value;

      return (
        <span className="services-user-type-tag-wrapper">
          <Tag
            closable
            className="services-user-type-tag"
            onClose={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose?.();
            }}
          >
            <Checkbox
              checked
              disabled
              className="services-user-type-tag-checkbox"
            />
            <span>{displayLabel}</span>
          </Tag>
        </span>
      );
    };

    const normalizedDropdownSearchValue = dropdownSearchValue
      .trim()
      .toLocaleLowerCase();
    const filteredOptions = normalizedDropdownSearchValue
      ? options.filter((item) =>
          item.label.toLocaleLowerCase().includes(normalizedDropdownSearchValue),
        )
      : options;

    const optionsWithCheckbox = filteredOptions.map((item) => ({
      ...item,
      searchLabel: item.label,
      label: (
        <div className="services-user-type-option">
          <span
            className="services-user-type-option-checkbox"
            aria-hidden="true"
          >
            <Checkbox
              checked={checkedValues.includes(item.value)}
              tabIndex={-1}
            />
          </span>
          <span className="services-user-type-option-label">{item.label}</span>
        </div>
      ),
    }));

    const renderDropdown = (menu: ReactNode) => (
      <div className="services-user-type-dropdown-content">
        <div
          className="services-user-type-dropdown-search"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Input
            aria-label={t("formPlaceholders.common.search")}
            placeholder={t("formPlaceholders.common.search")}
            prefix={<SearchOutlined />}
            value={dropdownSearchValue}
            onChange={(event) => setDropdownSearchValue(event.target.value)}
            allowClear
          />
        </div>
        <div
          className="services-user-type-select-all"
          onMouseDown={(event) => event.preventDefault()}
        >
          <Checkbox
            indeterminate={isIndeterminate}
            checked={isAllChecked}
            onChange={handleAllChange}
          >
            {t("servicesPage.selectAll")}
          </Checkbox>
        </div>
        {menu}
      </div>
    );
  
    return (
      <Select
        className="services-user-type-select LanguageSelect"
        dropdownClassName="services-user-type-dropdown LanguageSelectdropdown"
        mode="multiple"
        showArrow
        suffixIcon={selectDownIcon}
        maxTagCount={maxTagCount}
        maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
        value={checkedValues}
        options={optionsWithCheckbox}
        dropdownRender={renderDropdown}
        tagRender={customTagRender}
        placeholder={placeholder ?? t("formPlaceholders.common.select")}
        showSearch={false}
        filterOption={false}
        allowClear
        onChange={(values) => updateValues(values)}
        onDropdownVisibleChange={(open) => {
          if (!open) {
            setDropdownSearchValue('');
          }
        }}
      />
    );
  };
