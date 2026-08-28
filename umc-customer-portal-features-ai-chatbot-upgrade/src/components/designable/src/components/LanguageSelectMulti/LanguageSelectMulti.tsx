import React, { useEffect, useMemo, useState,useRef } from "react";

import { connect, mapProps, mapReadPretty, useField, useForm } from "@formily/react";
import { Select as AntdSelect, Checkbox } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { PreviewText } from "@formily/antd";
// import { languageOptions } from "./language";
import { getLanguages } from "../../../../../services/services";
import selectedTexts from "../../../../../utils/showTitle";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";
import { useMaxTagCountForFormilyGrid } from "@/components/designable/src/utils/useMaxTagCountForFormilyGrid";
import '@/components/designable/src/components/LanguageSelect/index.less'
type LanguageOption = {
  id?: string | number;
  value?: string | number;
  label?: string;
  nameEn?: string;
  nameAr?: string;
  NameEn?: string;
  NameAr?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLanguageOption(item: LanguageOption, isAr: boolean) {
  const value = item.id ?? item.value ?? item.nameEn ?? item.NameEn ?? item.label;
  const label = preferLocalizedEnAr(
    isAr,
    normalizeText(item.nameEn ?? item.NameEn ?? item.label),
    normalizeText(item.nameAr ?? item.NameAr),
  );

  return {
    ...item,
    label: label || normalizeText(value),
    value,
  };
}

const LanguageSelectComponent = ({ value, onChange, options, ...props }) => {
  const field = useField();
  const form = useForm();
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const [languageOptions, setlanguageOptions] = useState<LanguageOption[]>([]);
  const selectProps = { ...props };
  const hasPlaceholderMarker =
    typeof selectProps.placeholder === "string" &&
    selectProps.placeholder.trim().toLowerCase() === "<placeholder text>";
  const placeholder = hasPlaceholderMarker
    ? undefined
    : selectProps.placeholder;
  const resolvedPlaceholder = resolveI18nPlaceholder({
    isAr,
    i18n,
    t,
    placeholder,
    placeholderEn: selectProps.placeholderEn,
    placeholderAr: selectProps.placeholderAr,
    placeholderKey: selectProps.placeholderKey,
    placeholderParams: selectProps.placeholderParams,
    defaultPlaceholder: hasPlaceholderMarker
      ? t("LanguageSelect.placeholder")
      : t("LanguageSelectMulti.placeholder"),
  });
  delete selectProps.placeholderEn;
  delete selectProps.placeholderAr;
  delete selectProps.placeholderKey;
  delete selectProps.placeholderParams;
  useEffect(() => {
    getLanguages()
      .then((res) => {
        setlanguageOptions(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        setlanguageOptions([]);
      });
  }, []);
  const mergedOptions = useMemo(
    () =>
      (Array.isArray(options) && options.length > 0
        ? options
        : languageOptions
      ).map(
        (item: LanguageOption) => normalizeLanguageOption(item, isAr),
      ),
    [isAr, languageOptions, options],
  );

  const selectedValues: Array<string | number> = Array.isArray(value)
    ? value.filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      )
    : typeof value === "string" || typeof value === "number"
    ? [value]
    : [];

  const optionValues = mergedOptions
    .map((option) => option.value)
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
  const isDisabled =
    Boolean(selectProps.disabled) ||
    field?.pattern === "disabled" ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    form?.pattern === "disabled" ||
    form?.pattern === "readOnly" ||
    form?.pattern === "readPretty";

  const handleSelectAll = (checked: boolean) => {
    if (isDisabled) return;
    if (!onChange) return;
    if (checked) {
      onChange(mergedOptions.map((opt) => opt.value));
    } else {
      onChange([]);
    }
  };

  const optionsWithCheckbox = mergedOptions.map((opt) => {
    const optionValue = opt.value;
    const isSelected =
      (typeof optionValue === "string" || typeof optionValue === "number") &&
      selectedValues.includes(optionValue);

    return {
      ...opt,
      title: normalizeText(opt.label),
      label: (
        <div className="language-multi-option">
          <Checkbox
            className="language-multi-option-checkbox"
            checked={isSelected}
            // disabled
          />
          <span style={{ marginLeft: 8 }}>{opt.label}</span>
        </div>
      ),
      value: optionValue,
    };
  });
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const maxTagCount = useMaxTagCountForFormilyGrid(wrapperRef);
  return (
    <span
      ref={wrapperRef}
      style={{
        display: "inline-block",
        width: "100%",
        verticalAlign: "top",
      }}
      title={selectedTexts(
        selectedValues,
        mergedOptions,
        "label",
        "value",
      )}
      className="Formily-multi-select"
    >
      <AntdSelect
        className="LanguageSelect LanguageSelectMulti"
        value={selectedValues}
        dropdownClassName="LanguageSelectdropdown"
        disabled={isDisabled}
        onChange={onChange}
        showArrow
        mode="multiple"
        maxTagCount={maxTagCount}
        options={optionsWithCheckbox}
        dropdownRender={(menu) => (
          <div>
            <div style={{ padding: "4px 8px" }}>
              <Checkbox
                className={
                  hasSelectedValues
                    ? "language-multi-select-all-checkbox language-multi-select-all-checkbox-has-selection"
                    : "language-multi-select-all-checkbox"
                }
                checked={allSelected}
                disabled={isDisabled}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                {t("LanguageSelectMulti.selectAll")}
              </Checkbox>
            </div>
            <div>{menu}</div>
          </div>
        )}
        {...selectProps}
        showSearch={selectProps.showSearch ?? true}
        optionFilterProp={selectProps.optionFilterProp ?? "title"}
        placeholder={resolvedPlaceholder}
        notFoundContent={selectProps.notFoundContent ?? t("LanguageSelectMulti.notFound")}
      />
    </span>
  );
};

export const LanguageSelectMulti: ReactFC<SelectProps<any, any>> = connect(
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
    return <PreviewText.Select {...props} />;
  }),
);

export default LanguageSelectMulti;
