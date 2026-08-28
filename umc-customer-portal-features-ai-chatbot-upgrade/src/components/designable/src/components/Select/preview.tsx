import React, { useEffect, useMemo, useState } from "react";
import { Checkbox, Select as AntdSelect } from "antd";
import { connect, mapProps, mapReadPretty, useField, useForm } from "@formily/react";
import { PreviewText } from "@formily/antd";
import { LoadingOutlined } from "@ant-design/icons";
import "./preview.less";
import {
  getArtistWorkTypesByServiceCode,
  getLookupData,
} from "@/services/services";
import { getNationalityList } from "@/services/userProfile";
import { useServicesStore } from "@/store/services";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";

interface SelectInternalProps {
  value?: unknown;
  onChange?: (value: unknown) => void;
  dataSource?: SelectOption[];
  Source?: string;
  [key: string]: unknown;
}

type SelectOption = {
  label?: string;
  value: string | number;
  description?: string;
  showDescription?: boolean;
  labelEn?: string;
  labelAr?: string;
  nameEn?: string;
  nameAr?: string;
  NameEn?: string;
  NameAr?: string;
  code?: string | number;
  descriptionEn?: string;
  descriptionAr?: string;
  DescriptionEn?: string;
  DescriptionAr?: string;
};

const FORMILY_CONTROL_DROPDOWN_CLASS = "formily-control-dropdown";

function mergeClassNames(...classNames: unknown[]) {
  return classNames
    .filter(
      (className): className is string =>
        typeof className === "string" && className.trim().length > 0,
    )
    .join(" ");
}

function toPlaceholderParams(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function optionalText(value: unknown) {
  const text = normalizeText(value);
  return text || undefined;
}

function localizeOption(item: SelectOption, isAr: boolean): SelectOption {
  const label = preferLocalizedEnAr(
    isAr,
    optionalText(item.labelEn ?? item.nameEn ?? item.NameEn ?? item.label),
    optionalText(item.labelAr ?? item.nameAr ?? item.NameAr),
  );
  const description = preferLocalizedEnAr(
    isAr,
    optionalText(item.descriptionEn ?? item.DescriptionEn ?? item.description),
    optionalText(item.descriptionAr ?? item.DescriptionAr),
  );

  return {
    ...item,
    label: label || normalizeText(item.value),
    description: description || item.description,
  };
}

const normalizeArtistWorkTypeOptions = (input: unknown, isAr: boolean): SelectOption[] => {
  const rows = Array.isArray(input) ? input : [];
  return rows.reduce<SelectOption[]>((result, row) => {
    const item = row as Record<string, unknown>;
    const nameEn = normalizeText(item.NameEn ?? item.nameEn);
    const nameAr = normalizeText(item.NameAr ?? item.nameAr);
    const label = preferLocalizedEnAr(
      isAr,
      nameEn,
      nameAr,
    );

    if (!label) {
      return result;
    }

    const value = item.Id ?? item.id ?? item.value;
    const code = item.Code ?? item.code;
    result.push({
      label,
      nameEn,
      nameAr,
      code:
        typeof code === "string" || typeof code === "number" ? code : undefined,
      value:
        typeof value === "string" || typeof value === "number"
          ? value
          : label,
    });
    return result;
  }, []);
};

const findArtistWorkTypeOption = (items: SelectOption[], value: unknown) => {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (!normalizedValue) return undefined;

  return items.find((item) =>
    [
      item.value,
      item.label,
      item.nameEn,
      item.nameAr,
      item.NameEn,
      item.NameAr,
      item.code,
    ]
      .filter((candidate) => candidate !== undefined && candidate !== null)
      .some(
        (candidate) => normalizeText(candidate).toLowerCase() === normalizedValue,
      ),
  );
};

const unwrapRows = (input: unknown): unknown[] => {
  const data = (input as { data?: unknown })?.data;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeNationalityOptions = (input: unknown, isAr: boolean): SelectOption[] =>
  unwrapRows(input).reduce<SelectOption[]>((result, row) => {
    const item = row as Record<string, unknown>;
    const label = preferLocalizedEnAr(
      isAr,
      normalizeText(item.nameEn),
      normalizeText(item.nameAr),
    );
    const id = item.id;

    if (!label || id === undefined || id === null) {
      return result;
    }

    result.push({
      label,
      value: id as string | number,
    });
    return result;
  }, []);

const SelectInternal: React.FC<SelectInternalProps> = ({
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
  const selectProps = {
    ...(props as SelectInternalProps & {
      options?: SelectOption[];
      placeholderEn?: string;
      placeholderAr?: string;
      notFoundContent?: React.ReactNode;
      showSearch?: boolean;
      optionFilterProp?: string;
    }),
  };
  const dropdownClassName = mergeClassNames(
    selectProps.dropdownClassName,
    FORMILY_CONTROL_DROPDOWN_CLASS,
  );
  delete (selectProps as {
    options?: SelectOption[];
  }).options;
  const resolvedPlaceholder = resolveI18nPlaceholder({
    isAr,
    i18n,
    t,
    placeholder: selectProps.placeholder,
    placeholderEn: selectProps.placeholderEn,
    placeholderAr: selectProps.placeholderAr,
    placeholderKey: selectProps.placeholderKey,
    placeholderParams: toPlaceholderParams(selectProps.placeholderParams),
  });
  delete selectProps.placeholderEn;
  delete selectProps.placeholderAr;
  delete selectProps.placeholderKey;
  delete selectProps.placeholderParams;
  delete selectProps.uniqueValue;
  delete selectProps.titleEn;
  delete selectProps.titleAr;
  const showSearch = selectProps.showSearch ?? true;
  const optionFilterProp = selectProps.optionFilterProp ?? "label";
  const isArtistWorkTypeSource = Source === "ArtistWorkTypes";
  const isNationalitySource = Source === "Nationalities";
  const [remoteItems, setRemoteItems] = useState<SelectOption[]>([]);
  const localItems = useMemo(
    () => (Array.isArray(dataSource) ? dataSource : []),
    [dataSource],
  );

  useEffect(() => {
    if (!Source) {
      setRemoteItems([]);
      return;
    }
    let cancelled = false;
    const loadOptions = async () => {
      try {
        if (isArtistWorkTypeSource) {
          const res = await getArtistWorkTypesByServiceCode(serviceCode);
          if (!cancelled) {
            const normalizedItems = normalizeArtistWorkTypeOptions(res?.data, isAr);
            setRemoteItems(normalizedItems);
          }
          return;
        }

        if (isNationalitySource) {
          const res = await getNationalityList();
          if (!cancelled) {
            const normalizedItems = normalizeNationalityOptions(res, isAr);
            setRemoteItems(normalizedItems);
          }
          return;
        }

        const res = await getLookupData(Source, serviceCode);
        if (!cancelled) {
          const normalizedItems = normalizeLookupOptions(res?.data, isAr);
          setRemoteItems(normalizedItems);
        }
      } catch (error) {
        console.error("[Designable Select] failed to load select options", error);
        if (!cancelled) {
          setRemoteItems([]);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [
    Source,
    isAr,
    isArtistWorkTypeSource,
    isNationalitySource,
    serviceCode,
  ]);

  const rawItems = Source
    ? isArtistWorkTypeSource
      ? remoteItems.length > 0
        ? remoteItems
        : localItems
      : remoteItems.length > 0
        ? remoteItems
        : localItems
    : localItems;
  const items = useMemo(
    () => rawItems.map((item) => localizeOption(item, isAr)),
    [isAr, rawItems],
  );

  useEffect(() => {
    if (!isArtistWorkTypeSource || !onChange) return;

    const matched = findArtistWorkTypeOption(items, value);
    if (matched && matched.value !== value) {
      onChange(matched.value);
    }
  }, [isArtistWorkTypeSource, items, onChange, value]);

  const hasDescriptions = items.some(
    (item) => item?.showDescription && item?.description
  );
  const isDisabled =
    Boolean(selectProps.disabled) ||
    field?.pattern === "disabled" ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    form?.pattern === "disabled" ||
    form?.pattern === "readOnly" ||
    form?.pattern === "readPretty";
  const isMultiple = selectProps.mode === "multiple";
  const selectedValues = Array.isArray(value)
    ? value.filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      )
    : typeof value === "string" || typeof value === "number"
    ? [value]
    : [];
  const optionValues = items
    .map((item) => item.value)
    .filter((optionValue) => optionValue !== undefined && optionValue !== null);
  const allSelected =
    optionValues.length > 0 &&
    optionValues.every((optionValue) => selectedValues.includes(optionValue));
  const hasSelectedValues = optionValues.some((optionValue) =>
    selectedValues.includes(optionValue),
  );
  const handleSelectAll = (checked: boolean) => {
    if (isDisabled || !onChange || optionValues.length === 0) return;
    onChange(checked ? optionValues : []);
  };
  const renderSelectionContent = (label: React.ReactNode) => (
    <div className="designable-select-multi-selection-item">
      <Checkbox checked />
      <span>{label}</span>
    </div>
  );
  const renderDropdown = (menu: React.ReactNode) => (
    <div>
      <div className="designable-select-multi-select-all">
        <Checkbox
          className={
            hasSelectedValues && !allSelected
              ? "designable-select-multi-select-all-checkbox has-selection"
              : "designable-select-multi-select-all-checkbox"
          }
          checked={allSelected}
          disabled={isDisabled || optionValues.length === 0}
          onChange={(event) => handleSelectAll(event.target.checked)}
        >
          {t("LanguageSelectMulti.selectAll")}
        </Checkbox>
      </div>
      <div>{menu}</div>
    </div>
  );
  const multipleDropdownClassName = mergeClassNames(
    dropdownClassName,
    isMultiple && "designable-select-multi-dropdown",
  );
  const multipleClassName = mergeClassNames(
    selectProps.className,
    isMultiple && "designable-select-multi",
  );

  if (!hasDescriptions && !isNationalitySource) {
    return (
      <AntdSelect
        {...selectProps}
        disabled={isDisabled}
        className={multipleClassName || undefined}
        placeholder={resolvedPlaceholder}
        notFoundContent={selectProps.notFoundContent ?? t("Select.notFound")}
        showSearch={showSearch}
        optionFilterProp={isMultiple ? "title" : optionFilterProp}
        value={value}
        onChange={onChange}
        dropdownClassName={multipleDropdownClassName}
        dropdownRender={isMultiple ? renderDropdown : selectProps.dropdownRender}
        options={items.map((item) => ({
          label: isMultiple
            ? (
                <div className="designable-select-multi-option">
                  <Checkbox checked={selectedValues.includes(item.value)} />
                  <span>{item?.label ?? item?.value}</span>
                </div>
              )
            : item?.label ?? item?.value,
          title: item?.label ?? item?.value,
          value: item?.value,
        }))}
      />
    );
  }

  return (
    <AntdSelect
      {...selectProps}
      disabled={isDisabled}
      className={multipleClassName || undefined}
      placeholder={resolvedPlaceholder}
      notFoundContent={selectProps.notFoundContent ?? t("Select.notFound")}
      showSearch={showSearch}
      optionFilterProp={isMultiple ? "title" : optionFilterProp}
      value={value}
      onChange={onChange}
      dropdownClassName={multipleDropdownClassName}
      dropdownRender={isMultiple ? renderDropdown : selectProps.dropdownRender}
      optionLabelProp="label"
      listHeight={300}
    >
      {items.map((item) => (
        <AntdSelect.Option
          key={item?.value}
          value={item?.value}
          label={
            isMultiple
              ? renderSelectionContent(item?.label ?? item?.value)
              : item?.label ?? item?.value
          }
          title={item?.label ?? item?.value}
        >
          {isMultiple ? (
            <div className="designable-select-multi-option">
              <Checkbox checked={selectedValues.includes(item.value)} />
              <span>
                {item?.showDescription && item?.description ? item.label : item?.label ?? item?.value}
              </span>
            </div>
          ) : item?.showDescription && item?.description ? (
            <div className="select-option-with-desc">
              <div className="select-option-title">{item.label}</div>
              <div className="select-option-desc">{item.description}</div>
            </div>
          ) : (
            item?.label ?? item?.value
          )}
        </AntdSelect.Option>
      ))}
    </AntdSelect>
  );
};

export const Select = connect(
  SelectInternal,
  mapProps(
    { loading: true },
    (props, field) => {
      const mappedProps = props as SelectInternalProps & {
        enum?: SelectOption[];
        options?: SelectOption[];
        suffixIcon?: React.ReactNode;
      };
      const mappedField = field as {
        dataSource?: SelectOption[];
        loading?: boolean;
        validating?: boolean;
      };
      const dataSource =
        mappedProps.dataSource ??
        mappedProps.enum ??
        mappedProps.options ??
        mappedField.dataSource ??
        [];
      const items = Array.isArray(dataSource) ? dataSource : [];
      return {
        ...mappedProps,
        dataSource: items,
        suffixIcon:
          mappedField.loading || mappedField.validating ? (
            <LoadingOutlined />
          ) : (
            mappedProps.suffixIcon
          ),
      };
    }
  ),
  mapReadPretty(PreviewText.Select)
);
