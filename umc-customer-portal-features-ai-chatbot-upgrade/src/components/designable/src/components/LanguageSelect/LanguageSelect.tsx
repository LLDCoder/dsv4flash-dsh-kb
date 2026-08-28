import React, { useEffect, useMemo, useState } from "react";
import {
  connect,
  mapProps,
  mapReadPretty,
  useField,
  useForm,
} from "@formily/react";
import { Checkbox, Select as AntdSelect } from "antd";
import type { DefaultOptionType, SelectProps } from "antd/es/select";
import { LoadingOutlined } from "@ant-design/icons";
import { PreviewText } from "@formily/antd";
import { languageOptions as localLanguageOptions } from "./language";
import { getLanguages } from "../../../../../services/services";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";
import './index.less'
type LanguageOption = {
  id?: string | number;
  value?: string | number;
  label?: string;
  nameEn?: string;
  nameAr?: string;
  NameEn?: string;
  NameAr?: string;
};

type NormalizedLanguageOption = {
  label: string;
  value: string | number;
};

type LanguageSelectProps = SelectProps<unknown, DefaultOptionType> & {
  readOnly?: boolean;
};

let cachedRemoteLanguageOptions: LanguageOption[] = [];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLanguageOption(item: LanguageOption, isAr: boolean) {
  const value =
    item.id ?? item.value ?? item.nameEn ?? item.NameEn ?? item.label;
  const label = preferLocalizedEnAr(
    isAr,
    normalizeText(item.nameEn ?? item.NameEn ?? item.label),
    normalizeText(item.nameAr ?? item.NameAr),
  );

  return {
    label: label || normalizeText(value),
    value,
  };
}

function buildMergedOptions(
  options: LanguageOption[] | undefined,
  remoteLanguageOptions: LanguageOption[],
  isAr: boolean,
): NormalizedLanguageOption[] {
  const sourceOptions =
    options && options.length > 0
      ? options
      : remoteLanguageOptions.length > 0
      ? remoteLanguageOptions
      : localLanguageOptions;

  return sourceOptions.map((item: LanguageOption) =>
    normalizeLanguageOption(item, isAr),
  );
}

function normalizePrimitiveValue(value: unknown) {
  if (value === undefined || value === null) return undefined;

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) return undefined;
    if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
      return Number(trimmedValue);
    }
    return trimmedValue;
  }

  return value as string | number;
}

function normalizeLanguageValue(value: unknown, multiple?: boolean) {
  if (multiple) {
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizePrimitiveValue(item))
        .filter(
          (item): item is string | number => item !== undefined && item !== "",
        );
    }

    if (typeof value === "string" && value.includes(",")) {
      return value
        .split(",")
        .map((item) => normalizePrimitiveValue(item))
        .filter(
          (item): item is string | number => item !== undefined && item !== "",
        );
    }

    const normalizedValue = normalizePrimitiveValue(value);
    return normalizedValue === undefined ? undefined : [normalizedValue];
  }

  if (Array.isArray(value)) {
    return normalizePrimitiveValue(value[0]);
  }

  return normalizePrimitiveValue(value);
}

const LanguageSelectReadPretty = (props) => {
  const { i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const [remoteLanguageOptions, setRemoteLanguageOptions] = useState<
    LanguageOption[]
  >(cachedRemoteLanguageOptions);

  useEffect(() => {
    if (cachedRemoteLanguageOptions.length > 0) {
      return;
    }

    getLanguages().then((res) => {
      const nextOptions = Array.isArray(res?.data) ? res.data : [];
      cachedRemoteLanguageOptions = nextOptions;
      setRemoteLanguageOptions(nextOptions);
    });
  }, []);

  const mergedOptions = useMemo(
    () => buildMergedOptions(props.options, remoteLanguageOptions, isAr),
    [isAr, props.options, remoteLanguageOptions],
  );

  return (
    <PreviewText.Select
      {...props}
      value={normalizeLanguageValue(props.value, props.multiple)}
      options={mergedOptions}
    />
  );
};

const LanguageSelectComponent = ({
  value,
  onChange,
  options,
  ...props
}: LanguageSelectProps) => {
  const field = useField();
  const form = useForm();
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const [remoteLanguageOptions, setRemoteLanguageOptions] = useState<
    LanguageOption[]
  >(cachedRemoteLanguageOptions);
  const selectProps = { ...props };
  const resolvedPlaceholder = resolveI18nPlaceholder({
    isAr,
    i18n,
    t,
    placeholder: selectProps.placeholder,
    placeholderEn: selectProps.placeholderEn,
    placeholderAr: selectProps.placeholderAr,
    placeholderKey: selectProps.placeholderKey,
    placeholderParams: selectProps.placeholderParams,
    defaultPlaceholder: t("LanguageSelect.placeholder"),
  });
  delete selectProps.placeholderEn;
  delete selectProps.placeholderAr;
  delete selectProps.placeholderKey;
  delete selectProps.placeholderParams;
  delete selectProps.readOnly;
  useEffect(() => {
    getLanguages().then((res) => {
      const nextOptions = Array.isArray(res?.data) ? res.data : [];
      cachedRemoteLanguageOptions = nextOptions;
      setRemoteLanguageOptions(nextOptions);
    });
  }, []);
  const mergedOptions = useMemo(
    () => buildMergedOptions(options, remoteLanguageOptions, isAr),
    [isAr, options, remoteLanguageOptions],
  );
  const isDisabled =
    Boolean(selectProps.disabled) ||
    Boolean(props.readOnly) ||
    field?.pattern === "disabled" ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    form?.pattern === "disabled" ||
    form?.pattern === "readOnly" ||
    form?.pattern === "readPretty";
  const isMultiple = Boolean(props.multiple);
  const selectedValues = Array.isArray(normalizeLanguageValue(value, isMultiple))
    ? (normalizeLanguageValue(value, isMultiple) as Array<string | number>)
    : [];
  const optionValues = mergedOptions
    .map((option) => option.value)
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
  const multipleOptions = mergedOptions.map((option) => {
    const isSelected = selectedValues.includes(option.value);
    return {
      ...option,
      title: option.label,
      label: (
        <div className="language-multi-option">
          <Checkbox
            className="language-multi-option-checkbox"
            checked={isSelected}
          />
          <span>{option.label}</span>
        </div>
      ),
    };
  });

  return (
    <AntdSelect
      mode={isMultiple ? "multiple" : undefined}
      disabled={isDisabled}
      value={normalizeLanguageValue(value, isMultiple)}
      onChange={isDisabled ? undefined : onChange}
      className={isMultiple ? "LanguageSelect LanguageSelectMulti" : "LanguageSelect"}
      dropdownClassName="LanguageSelectdropdown"
      options={isMultiple ? multipleOptions : mergedOptions}
      maxTagCount={isMultiple ? 2 : 0}
      dropdownRender={
        isMultiple
          ? (menu) => (
              <div>
                <div className="language-multi-select-all">
                  <Checkbox
                    className={
                      hasSelectedValues && !allSelected
                        ? "language-multi-select-all-checkbox language-multi-select-all-checkbox-has-selection"
                        : "language-multi-select-all-checkbox"
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
            )
          : undefined
      }
      {...selectProps}
      showSearch={selectProps.showSearch ?? true}
      optionFilterProp={
        selectProps.optionFilterProp ?? (isMultiple ? "title" : "label")
      }
      placeholder={resolvedPlaceholder}
      notFoundContent={
        selectProps.notFoundContent ?? t("LanguageSelect.notFound")
      }
    />
  );
};

export const LanguageSelect: ReactFC<LanguageSelectProps> = connect(
  LanguageSelectComponent,
  mapProps(
    {
      loading: true,
    },
    (props, field) => {
      const { options, dataSource, ...restProps } = props;
      return {
        ...restProps,
        options: options || dataSource,
        suffixIcon:
          field?.["loading"] || field?.["validating"] ? (
            <LoadingOutlined />
          ) : (
            props.suffixIcon
          ),
      };
    },
  ),
  mapReadPretty((props) => {
    return <LanguageSelectReadPretty {...props} />;
  }),
);

export default LanguageSelect;
