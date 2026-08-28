import React, { useMemo, useEffect, useState, useRef } from "react";
import { Checkbox, Select as AntdSelect } from "antd";
import {
  connect,
  mapProps,
  mapReadPretty,
  useField,
  useForm,
} from "@formily/react";
import { PreviewText } from "@formily/antd";
import { LoadingOutlined } from "@ant-design/icons";
import "./preview.less";
import selectedTexts from "../../../../../utils/showTitle";
import { getLookupData } from "@/services/services";
import { useServicesStore } from "@/store/services";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { useMaxTagCountForFormilyGrid } from "@/components/designable/src/utils/useMaxTagCountForFormilyGrid";

interface MultiDropdownInternalProps {
  value?: any;
  onChange?: (value: any) => void;
  Source?: string;
  dataSource?: any[];
  [key: string]: any;
}

type MultiDropdownOption = {
  label?: string;
  value: any;
  description?: string;
  showDescription?: boolean;
  labelEn?: string;
  labelAr?: string;
  nameEn?: string;
  nameAr?: string;
  NameEn?: string;
  NameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  DescriptionEn?: string;
  DescriptionAr?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function localizeOption(item: MultiDropdownOption, isAr: boolean) {
  const label = preferLocalizedEnAr(
    isAr,
    normalizeText(item.labelEn ?? item.nameEn ?? item.NameEn ?? item.label),
    normalizeText(item.labelAr ?? item.nameAr ?? item.NameAr),
  );
  const description = preferLocalizedEnAr(
    isAr,
    normalizeText(item.descriptionEn ?? item.DescriptionEn ?? item.description),
    normalizeText(item.descriptionAr ?? item.DescriptionAr),
  );

  return {
    ...item,
    label: label || normalizeText(item.value),
    description: description || item.description,
  };
}

const MultiDropdownInternal: React.FC<MultiDropdownInternalProps> = ({
  dataSource,
  value,
  onChange,
  Source,
  ...props
}) => {
  const field = useField();
  const form = useForm();
  const serviceCode = useServicesStore((state) => state.userInfo.servicesCode);
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  // const items = Array.isArray(dataSource) ? dataSource : [];

  const multiProps = {
    mode: "multiple" as const,
    ...props,
  };
  const localizedPlaceholder = preferLocalizedEnAr(
    isAr,
    typeof multiProps.placeholderEn === "string"
      ? multiProps.placeholderEn
      : undefined,
    typeof multiProps.placeholderAr === "string"
      ? multiProps.placeholderAr
      : undefined,
  );
  delete multiProps.placeholderEn;
  delete multiProps.placeholderAr;
  const [remoteItems, setRemoteItems] = useState<
    { label: string; value: any }[]
  >([]);
  useEffect(() => {
    if (!Source) {
      setRemoteItems([]);
      return;
    }
    let cancelled = false;
    getLookupData(Source, serviceCode)
      .then((res: { data?: unknown }) => {
        if (cancelled) return;
        setRemoteItems(normalizeLookupOptions(res?.data, isAr));
      })
      .catch(() => {
        if (!cancelled) setRemoteItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [Source, isAr, serviceCode]);

  const rawItems = Source
    ? remoteItems
    : Array.isArray(dataSource)
    ? dataSource
    : [];
  const items = useMemo(
    () =>
      rawItems.map((item: MultiDropdownOption) => localizeOption(item, isAr)),
    [isAr, rawItems],
  );

  const hasDescriptions = items.some(
    (item: any) => item?.showDescription && item?.description,
  );
  const selectedValues: Array<string | number> = Array.isArray(value)
    ? value.filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      )
    : typeof value === "string" || typeof value === "number"
    ? [value]
    : [];
  const optionValues = items
    .map((item) => item?.value)
    .filter(
      (item): item is string | number =>
        typeof item === "string" || typeof item === "number",
    );
  const hasSelectedValues = optionValues.some((optionValue) =>
    selectedValues.includes(optionValue),
  );
  const allSelected =
    optionValues.length > 0 &&
    optionValues.every((optionValue) => selectedValues.includes(optionValue));
  const titleText = useMemo(() => {
    return selectedTexts(value, items);
  }, [value, items]);
  const isDisabled =
    Boolean(multiProps.disabled) ||
    field?.pattern === "disabled" ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    form?.pattern === "disabled" ||
    form?.pattern === "readOnly" ||
    form?.pattern === "readPretty";

  const handleSelectAll = (checked: boolean) => {
    if (isDisabled || !onChange) return;
    onChange(checked ? optionValues : []);
  };

  const {
    className: customClassName,
    dropdownClassName: customDropdownClassName,
    dropdownRender: customDropdownRender,
    options: _options,
    ...selectProps
  } = multiProps;
  void _options;
  const selectClassName = ["MultiDropdown", "MultiDropdownMulti", customClassName]
    .filter(Boolean)
    .join(" ");
  const dropdownClassName = ["MultiDropdowndropdown", customDropdownClassName]
    .filter(Boolean)
    .join(" ");
  const renderSelectionContent = (item: MultiDropdownOption) => (
    <div className="multi-dropdown-selection-item">
      <Checkbox checked />
      <span>{item.label ?? item.value}</span>
    </div>
  );
  const renderOptionContent = (item: MultiDropdownOption) => {
    const optionValue = item?.value;
    const isSelected =
      (typeof optionValue === "string" || typeof optionValue === "number") &&
      selectedValues.includes(optionValue);
    const showDescription = Boolean(item?.showDescription && item?.description);

    return (
      <div
        className={
          showDescription
            ? "multi-dropdown-option multi-dropdown-option-with-desc"
            : "multi-dropdown-option"
        }
      >
        <Checkbox
          className="multi-dropdown-option-checkbox"
          checked={isSelected}
        />
        {showDescription ? (
          <div className="select-option-with-desc">
            <div className="select-option-title">{item.label}</div>
            <div className="select-option-desc">{item.description}</div>
          </div>
        ) : (
          <span>{item.label ?? item.value}</span>
        )}
      </div>
    );
  };
  const renderDropdown = (menu: React.ReactNode) => {
    const renderedMenu =
      typeof customDropdownRender === "function"
        ? customDropdownRender(menu)
        : menu;

    return (
      <div>
        <div className="multi-dropdown-select-all">
          <Checkbox
            className={
              hasSelectedValues
                ? "multi-dropdown-select-all-checkbox multi-dropdown-select-all-checkbox-has-selection"
                : "multi-dropdown-select-all-checkbox"
            }
            checked={allSelected}
            disabled={isDisabled}
            onChange={(event) => handleSelectAll(event.target.checked)}
          >
            {t("LanguageSelectMulti.selectAll")}
          </Checkbox>
        </div>
        <div>{renderedMenu}</div>
      </div>
    );
  };

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const maxTagCount = useMaxTagCountForFormilyGrid(wrapperRef);
  return (
    <span
      ref={wrapperRef}
      style={{ display: "inline-block", width: "100%", verticalAlign: "top" }}
      title={titleText}
      className="Formily-multi-select"
    >
      <AntdSelect
        {...selectProps}
        value={selectedValues}
        disabled={isDisabled}
        onChange={onChange}
        showSearch={true}
        showArrow={true}
        maxTagCount={maxTagCount}
        optionLabelProp="label"
        listHeight={hasDescriptions ? 300 : undefined}
        className={selectClassName}
        dropdownClassName={dropdownClassName}
        dropdownRender={renderDropdown}
        placeholder={localizedPlaceholder || selectProps.placeholder}
        notFoundContent={
          selectProps.notFoundContent ?? t("MultiDropdown.notFound")
        }
      >
        {items.map((item: MultiDropdownOption, index) => (
          <AntdSelect.Option
            key={String(item?.value ?? index)}
            value={item?.value}
            label={renderSelectionContent(item)}
          >
            {renderOptionContent(item)}
          </AntdSelect.Option>
        ))}
      </AntdSelect>
    </span>
  );
};

export const MultiDropdown = connect(
  MultiDropdownInternal,
  mapProps({ loading: true }, (props: any, field: any) => {
    const dataSource =
      props.dataSource ??
      props.enum ??
      props.options ??
      field?.dataSource ??
      [];
    const items = Array.isArray(dataSource) ? dataSource : [];
    return {
      ...props,
      dataSource: items,
      suffixIcon:
        field?.loading || field?.validating ? (
          <LoadingOutlined />
        ) : (
          props.suffixIcon
        ),
    };
  }),
  mapReadPretty(PreviewText.Select),
);
