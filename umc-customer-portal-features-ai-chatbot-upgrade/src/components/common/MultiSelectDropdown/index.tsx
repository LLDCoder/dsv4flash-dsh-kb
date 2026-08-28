import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input, Checkbox } from "antd";
import {
  SearchOutlined,
  CloseOutlined,
  CloseCircleFilled,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import "./index.less";
import DownloadIcon from "@/assets/images/down.svg";
import RightIcon from "@/assets/images/right.svg";
export interface OptionItem {
  id: string;
  label: string;
  value: string;
  price?: number;
  category: string;
  hasHierarchy?: boolean;
  nameAr?: string;
  nameEn?: string;
}

export interface CategoryGroup {
  key: string;
  category?: string;
  options: OptionItem[];
  hasHierarchy: boolean;
}

interface MultiSelectDropdownProps {
  value?: string[];
  onChange?: (values: string[]) => void;
  options: OptionItem[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean; // /， true ()
  lockedValues?: string[];
  minSelectedCount?: number;
  maxSelectedCount?: number;
  hideClearAll?: boolean;
  hiddenSelectedValues?: string[];
  autoSelectSingleOption?: boolean;
  showSelectAll?: boolean;
}

function getOptionDisplayLabel(isAr: boolean, option: OptionItem): string {
  const hasPair =
    (option.nameEn != null && String(option.nameEn).trim() !== "") ||
    (option.nameAr != null && String(option.nameAr).trim() !== "");
  if (hasPair) {
    const localized = preferLocalizedEnAr(isAr, option.nameEn, option.nameAr);
    if (localized) return localized;
  }
  return option.label ?? "";
}

function optionMatchesSearch(option: OptionItem, keyword: string): boolean {
  if (!keyword) return true;
  const k = keyword.toLowerCase();
  const haystacks = [option.label, option.nameEn, option.nameAr].filter(
    (x): x is string => x != null && String(x).length > 0,
  );
  return haystacks.some((text) =>
    String(text).toLowerCase().includes(k),
  );
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  value = [],
  onChange,
  options,
  placeholder,
  label,
  required = false,
  disabled = false,
  multiple = true, //
  lockedValues = [],
  minSelectedCount = 0,
  maxSelectedCount,
  hideClearAll = false,
  hiddenSelectedValues = [],
  autoSelectSingleOption = true,
  showSelectAll = false,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const resolvedPlaceholder =
    placeholder ?? t("multiSelectDropdown.selectPlaceholder");

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skipNextAutoSelectRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen && searchText) {
      setSearchText("");
    }
  }, [isOpen, searchText]);

  useEffect(() => {
    if (
      autoSelectSingleOption &&
      options.length === 1 &&
      (!value || value.length === 0) &&
      onChange
    ) {
      if (skipNextAutoSelectRef.current) {
        skipNextAutoSelectRef.current = false;
        return;
      }
      onChange([options[0].value]);
    }
  }, [autoSelectSingleOption, onChange, options, value]);

  // Preserve grouping only when the API actually returns parent-child activities.
  const groupedOptions = useMemo(
    () =>
      options.reduce((acc, option) => {
        const hasHierarchy = option.hasHierarchy !== false;
        const groupKey = hasHierarchy
          ? `group:${option.category}`
          : `option:${option.value}`;
        const existingGroup = acc.find((g) => g.key === groupKey);
        if (existingGroup) {
          existingGroup.options.push(option);
        } else {
          acc.push({
            key: groupKey,
            category: hasHierarchy ? option.category : undefined,
            options: [option],
            hasHierarchy,
          });
        }
        return acc;
      }, [] as CategoryGroup[]),
    [options],
  );

  useEffect(() => {
    const nextExpanded = new Set(
      groupedOptions
        .map((group) => group.category)
        .filter((category): category is string => Boolean(category)),
    );
    setExpandedCategories((prev) => {
      if (prev.size === nextExpanded.size) {
        const isSame = Array.from(nextExpanded).every((item) => prev.has(item));
        if (isSame) {
          return prev;
        }
      }
      return nextExpanded;
    });
  }, [groupedOptions]);

  const filteredGroups = groupedOptions
    .map((group) => {
      const keyword = searchText.toLowerCase();
      const categoryMatched = group.hasHierarchy
        ? group.category?.toLowerCase().includes(keyword)
        : false;

      const filteredOptions = group.options.filter((option) => {
        if (!keyword) return true;
        if (categoryMatched) return true;
        return optionMatchesSearch(option, keyword);
      });

      return {
        ...group,
        options: filteredOptions,
      };
    })
    .filter((group) => group.options.length > 0);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const hiddenSelectedValueSet = useMemo(
    () => new Set((hiddenSelectedValues || []).map((item) => String(item))),
    [hiddenSelectedValues],
  );
  const visibleSelectedOptions = useMemo(
    () =>
      selectedOptions.filter(
        (option) => !hiddenSelectedValueSet.has(String(option.value)),
      ),
    [hiddenSelectedValueSet, selectedOptions],
  );
  const normalizedLockedValues = useMemo(
    () => Array.from(new Set((lockedValues || []).map((item) => String(item)))),
    [lockedValues],
  );
  const lockedValueSet = useMemo(
    () => new Set(normalizedLockedValues),
    [normalizedLockedValues],
  );
  const hasLockedValues = normalizedLockedValues.length > 0;
  const selectableValues = useMemo(
    () => Array.from(new Set(options.map((option) => String(option.value)))),
    [options],
  );
  const selectedSelectableValues = useMemo(
    () => selectableValues.filter((optionValue) => value.includes(optionValue)),
    [selectableValues, value],
  );
  const canShowSelectAll =
    showSelectAll && multiple && selectableValues.length > 0;
  const isAllSelected =
    selectableValues.length > 0 &&
    selectableValues.every((optionValue) => value.includes(optionValue));
  const isPartiallySelected =
    selectedSelectableValues.length > 0 && !isAllSelected;

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionChange = (optionValue: string, checked: boolean) => {
    if (!checked && lockedValueSet.has(optionValue)) {
      return;
    }

    let newValues: string[];
    if (multiple) {
      // ：
      if (checked) {
        if (
          typeof maxSelectedCount === "number" &&
          maxSelectedCount > 0 &&
          !value.includes(optionValue) &&
          value.length >= maxSelectedCount
        ) {
          return;
        }
        newValues = [...new Set([...value, optionValue])];
      } else {
        if (value.includes(optionValue) && value.length <= minSelectedCount) {
          return;
        }
        if (value.includes(optionValue)) {
          skipNextAutoSelectRef.current = true;
        }
        newValues = value.filter((v) => v !== optionValue);
      }
    } else {
      // ：
      if (checked) {
        newValues = [optionValue];
        setIsOpen(false); //
      } else {
        if (value.includes(optionValue) && value.length <= minSelectedCount) {
          return;
        }
        if (value.includes(optionValue)) {
          skipNextAutoSelectRef.current = true;
        }
        newValues = [];
      }
    }
    onChange?.(newValues);
  };

  const handleRemoveTag = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || lockedValueSet.has(optionValue)) {
      return;
    }
    if (value.includes(optionValue) && value.length <= minSelectedCount) {
      return;
    }
    skipNextAutoSelectRef.current = true;
    const newValues = value.filter((v) => v !== optionValue);
    onChange?.(newValues);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || hasLockedValues || hideClearAll || minSelectedCount > 0) {
      return;
    }
    skipNextAutoSelectRef.current = true;
    onChange?.([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!multiple) {
      return;
    }

    let newValues: string[];
    if (checked) {
      const mergedValues = [...new Set([...value, ...selectableValues])];
      newValues =
        typeof maxSelectedCount === "number" && maxSelectedCount > 0
          ? mergedValues.slice(0, maxSelectedCount)
          : mergedValues;
    } else {
      const removableValues = selectableValues.filter(
        (item) => !lockedValueSet.has(item),
      );
      if (
        value.length -
          removableValues.filter((item) => value.includes(item)).length <
        minSelectedCount
      ) {
        return;
      }
      skipNextAutoSelectRef.current = true;
      newValues = value.filter(
        (item) => lockedValueSet.has(item) || !selectableValues.includes(item),
      );
    }

    onChange?.(newValues);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategorySelectAll = (category: string, checked: boolean) => {
    //
    if (!multiple) {
      return;
    }

    const categoryOptions =
      groupedOptions.find((g) => g.category === category)?.options || [];
    const categoryValues = categoryOptions.map((opt) => opt.value);

    let newValues: string[];
    if (checked) {
      const mergedValues = [...new Set([...value, ...categoryValues])];
      newValues =
        typeof maxSelectedCount === "number" && maxSelectedCount > 0
          ? mergedValues.slice(0, maxSelectedCount)
          : mergedValues;
    } else {
      const removableValues = categoryValues.filter(
        (item) => !lockedValueSet.has(item),
      );
      if (
        value.length -
          removableValues.filter((item) => value.includes(item)).length <
        minSelectedCount
      ) {
        return;
      }
      newValues = value.filter(
        (v) => lockedValueSet.has(v) || !categoryValues.includes(v),
      );
    }
    onChange?.(newValues);
  };

  const isCategoryFullySelected = (category: string) => {
    const categoryOptions =
      groupedOptions.find((g) => g.category === category)?.options || [];
    return (
      categoryOptions.length > 0 &&
      categoryOptions.every((opt) => value.includes(opt.value))
    );
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryOptions =
      groupedOptions.find((g) => g.category === category)?.options || [];
    return (
      categoryOptions.some((opt) => value.includes(opt.value)) &&
      !isCategoryFullySelected(category)
    );
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      {label && (
        <div className="dropdown-label">
          {label}
          {required && <span className="required-mark"> *</span>}
        </div>
      )}

      <div
        className={`dropdown-selector ${isOpen ? "open" : ""} ${
          disabled ? "disabled" : ""
        }`}
        onClick={handleToggle}
      >
        <div className="selected-tags">
          {visibleSelectedOptions.length === 0 ? (
            <span className="placeholder">{resolvedPlaceholder}</span>
          ) : (
            visibleSelectedOptions.map((option) => (
              <span
                key={option.value}
                title={
                  lockedValueSet.has(option.value)
                    ? t("multiSelectDropdown.lockedPrefilledTooltip")
                    : undefined
                }
                className={`selected-tag${
                  lockedValueSet.has(option.value) ? " locked" : ""
                }`}
              >
                {getOptionDisplayLabel(isAr, option)}
                {multiple && !disabled && value.length > minSelectedCount && (
                  !lockedValueSet.has(option.value) && (
                    <CloseOutlined
                      className="tag-close"
                      onClick={(e) => handleRemoveTag(option.value, e)}
                    />
                  )
                )}
              </span>
            ))
          )}
        </div>
        {selectedOptions.length > 0 &&
          !disabled &&
          !hasLockedValues &&
          !hideClearAll &&
          minSelectedCount === 0 && (
          <CloseCircleFilled
            className="clear-all-icon"
            onClick={handleClearAll}
          />
          )}
      </div>

      {isOpen && (
        <div className="dropdown-panel">
          <div className="search-box">
            <Input
              prefix={<SearchOutlined />}
              placeholder={t("formPlaceholders.common.search")}
              value={searchText}
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="options-list">
            {canShowSelectAll && (
              <div className="select-all-option">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onChange={(event) => handleSelectAll(event.target.checked)}
                >
                  <span className="select-all-label">
                    {t("LanguageSelectMulti.selectAll")}
                  </span>
                </Checkbox>
                <span className="select-all-count">
                  {selectedSelectableValues.length}/{selectableValues.length}
                </span>
              </div>
            )}

            {filteredGroups.map((group) => {
              if (!group.hasHierarchy) {
                return (
                    <div key={group.key} className="option-group">
                      <div className="group-options group-options-flat">
                      {group.options.map((option) => {
                        const isLocked =
                          lockedValueSet.has(option.value) &&
                          value.includes(option.value);
                        const isMinSelectionProtected =
                          value.includes(option.value) &&
                          value.length <= minSelectedCount;

                        return (
                        <div
                          key={option.value}
                          className={`option-item${isLocked ? " is-locked" : ""}`}
                        >
                          {multiple ? (
                            <Checkbox
                              disabled={isLocked || isMinSelectionProtected}
                              checked={value.includes(option.value)}
                              onChange={(e) =>
                                handleOptionChange(option.value, e.target.checked)
                              }
                            >
                              <span className="option-label">
                                {getOptionDisplayLabel(isAr, option)}
                              </span>
                            </Checkbox>
                          ) : (
                            <div
                              className={`option-radio single ${
                                value.includes(option.value) ? "selected" : ""
                              }${isLocked ? " disabled" : ""}`}
                              onClick={() =>
                                !isLocked &&
                                handleOptionChange(
                                  option.value,
                                  !value.includes(option.value),
                                )
                              }
                            >
                              <span className="option-label">
                                {getOptionDisplayLabel(isAr, option)}
                              </span>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              const category = group.category || "";
              const isExpanded = expandedCategories.has(category);
              const isFullySelected = isCategoryFullySelected(category);
              const isPartiallySelected = isCategoryPartiallySelected(category);

              return (
                <div key={group.key} className="option-group">
                  <>
                    {" "}
                    <div
                      className="group-title"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="group-title-content">
                        <div className="group-title-left">
                          <span className="expand-icon">
                            {isExpanded ? (
                              <img src={DownloadIcon} />
                            ) : (
                              <img src={RightIcon} />
                            )}
                          </span>
                          {multiple ? (
                            <Checkbox
                              checked={isFullySelected}
                              indeterminate={isPartiallySelected}
                              onChange={(e) =>
                                handleCategorySelectAll(category, e.target.checked)
                              }
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="category-label">
                                {category}
                              </span>
                            </Checkbox>
                          ) : (
                            <span className="category-label single">
                              {category}
                            </span>
                          )}
                        </div>
                        {multiple && (
                          <span className="category-count">
                            {
                              group.options.filter((option) =>
                                value.includes(option.value),
                              ).length
                            }
                            /{group.options.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="group-options">
                        {group.options.map((option) => {
                          const isLocked =
                            lockedValueSet.has(option.value) &&
                            value.includes(option.value);
                          const isMinSelectionProtected =
                            value.includes(option.value) &&
                            value.length <= minSelectedCount;

                          return (
                          <div
                            key={option.value}
                            className={`option-item${isLocked ? " is-locked" : ""}`}
                          >
                            {multiple ? (
                              <Checkbox
                                disabled={isLocked || isMinSelectionProtected}
                                checked={value.includes(option.value)}
                                onChange={(e) =>
                                  handleOptionChange(
                                    option.value,
                                    e.target.checked,
                                  )
                                }
                              >
                                <span className="option-label">
                                  {getOptionDisplayLabel(isAr, option)}
                                </span>
                              </Checkbox>
                            ) : (
                              <div
                                className={`option-radio single ${
                                  value.includes(option.value) ? "selected" : ""
                                }${isLocked ? " disabled" : ""}`}
                                onClick={() =>
                                  !isLocked &&
                                  handleOptionChange(
                                    option.value,
                                    !value.includes(option.value),
                                  )
                                }
                              >
                                <span className="option-label">
                                  {getOptionDisplayLabel(isAr, option)}
                                </span>
                              </div>
                            )}
                            {/* {option.price !== undefined && (
                                <span className="option-price">
                                  <img src={AED}></img>
                                  {option.price ? formatPrice(option.price) : 0}
                                </span>
                              )} */}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                </div>
              );
            })}

            {filteredGroups.length === 0 && (
              <div className="no-results">{t("multiSelectDropdown.noResults")}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
