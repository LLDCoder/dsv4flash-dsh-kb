import { Checkbox } from "antd";
import {
  CloseOutlined,
  DownOutlined,
  LoadingOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";

import "./index.less";

export type PlatformMultiSelectOption = {
  label: string;
  value: number;
};

type PlatformMultiSelectProps = {
  allLabel: string;
  maxVisibleTags?: number;
  options: PlatformMultiSelectOption[];
  value: number[];
  onChange: (values: number[]) => void;
  loading?: boolean;
};

export default function PlatformMultiSelect({
  allLabel,
  maxVisibleTags = 3,
  options,
  value,
  onChange,
  loading = false,
}: PlatformMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const optionValues = useMemo(
    () => options.map((option) => option.value),
    [options],
  );
  const selectedValues = useMemo(
    () => value.filter((item) => optionValues.includes(item)),
    [optionValues, value],
  );
  const selectedValueSet = useMemo(
    () => new Set(selectedValues),
    [selectedValues],
  );
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedValueSet.has(option.value)),
    [options, selectedValueSet],
  );
  const visibleTagLimit = Math.max(0, Math.floor(maxVisibleTags));
  const visibleSelectedOptions = selectedOptions.slice(0, visibleTagLimit);
  const hasHiddenSelectedOptions = selectedOptions.length > visibleTagLimit;
  const allSelected = selectedValues.length === optionValues.length;
  const partiallySelected = selectedValues.length > 0 && !allSelected;

  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);

  const toggleAll = (checked: boolean) => {
    if (loading) return;
    onChange(checked ? optionValues : []);
  };

  const toggleOption = (optionValue: number, checked: boolean) => {
    if (loading) return;
    if (checked) {
      onChange([...new Set([...selectedValues, optionValue])]);
      return;
    }
    onChange(selectedValues.filter((item) => item !== optionValue));
  };

  const removeOption = (optionValue: number, event: React.MouseEvent) => {
    if (loading) return;
    event.stopPropagation();
    onChange(selectedValues.filter((item) => item !== optionValue));
  };

  const handleSelectorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (loading) return;
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((previous) => !previous);
    }
  };

  return (
    <div className="platform-multi-select" ref={rootRef}>
      <div
        aria-expanded={open}
        aria-busy={loading}
        aria-disabled={loading}
        aria-haspopup="listbox"
        aria-label={allLabel}
        className={`platform-multi-select__selector${open ? " is-open" : ""}${
          loading ? " is-loading" : ""
        }`}
        onClick={() => {
          if (!loading) setOpen((previous) => !previous);
        }}
        onKeyDown={handleSelectorKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="platform-multi-select__tags">
          {allSelected ? (
            <span className="platform-multi-select__all-value">{allLabel}</span>
          ) : (
            <>
              {visibleSelectedOptions.map((option) => (
                <span className="platform-multi-select__tag" key={option.value}>
                  <span>{option.label}</span>
                  <button
                    aria-label={`Remove ${option.label}`}
                    className="platform-multi-select__tag-remove"
                    onClick={(event) => removeOption(option.value, event)}
                    type="button"
                  >
                    <CloseOutlined />
                  </button>
                </span>
              ))}
              {hasHiddenSelectedOptions && (
                <span
                  aria-hidden="true"
                  className="platform-multi-select__tag platform-multi-select__tag--overflow"
                >
                  ...
                </span>
              )}
            </>
          )}
        </div>
        <span className="platform-multi-select__arrow" aria-hidden="true">
          {loading ? (
            <LoadingOutlined spin />
          ) : open ? (
            <UpOutlined />
          ) : (
            <DownOutlined />
          )}
        </span>
      </div>

      {open && (
        <div className="platform-multi-select__panel" role="listbox">
          <label className="platform-multi-select__option platform-multi-select__option--all">
            <Checkbox
              checked={allSelected}
              indeterminate={partiallySelected}
              onChange={(event) => toggleAll(event.target.checked)}
            >
              {allLabel}
            </Checkbox>
          </label>
          {options.length > 0 && (
            <>
              <div className="platform-multi-select__divider" />
              <div className="platform-multi-select__options">
                {options.map((option) => (
                  <label className="platform-multi-select__option" key={option.value}>
                    <Checkbox
                      checked={selectedValueSet.has(option.value)}
                      onChange={(event) =>
                        toggleOption(option.value, event.target.checked)
                      }
                    >
                      {option.label}
                    </Checkbox>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
