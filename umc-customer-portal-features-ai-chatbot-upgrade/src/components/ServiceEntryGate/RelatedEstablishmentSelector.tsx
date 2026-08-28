import { DownOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { CustomButton } from "@/components/common";
import InstitutionHeader from "@/assets/images/institutionHeader.png";
import { ImageBaseUrl } from "@/utils/url";
import type { RelatedEstablishmentOption } from "./types";
import { useTranslation } from "react-i18next";
import "./service-entry-gate.less";

interface RelatedEstablishmentSelectorProps {
  title: string;
  description?: string;
  required?: boolean;
  value?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  dropdownTitle?: string;
  addProfileLabel?: string;
  options: RelatedEstablishmentOption[];
  onChange: (value: string) => void;
  onAddProfile: () => void;
}

const resolveAvatarSrc = (avatarUrl?: string) => {
  if (!avatarUrl) {
    return InstitutionHeader;
  }

  if (
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://") ||
    avatarUrl.startsWith("data:") ||
    avatarUrl.startsWith("blob:") ||
    avatarUrl.startsWith("/")
  ) {
    return avatarUrl;
  }

  return `${ImageBaseUrl}${avatarUrl}`;
};

export default function RelatedEstablishmentSelector({
  title,
  description,
  required = false,
  value,
  placeholder,
  searchPlaceholder,
  dropdownTitle,
  addProfileLabel,
  options,
  onChange,
  onAddProfile,
}: RelatedEstablishmentSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resolvedPlaceholder =
    placeholder || t("formPlaceholders.common.select");
  const resolvedSearchPlaceholder =
    searchPlaceholder || t("formPlaceholders.common.search");
  const resolvedDropdownTitle =
    dropdownTitle || t("serviceEntryGate.selectors.relatedEstablishment.title");
  const resolvedAddProfileLabel =
    addProfileLabel || t("serviceEntryGate.actions.addEstablishmentProfile");
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      [option.label, option.subtitle]
        .filter(Boolean)
        .some((text) => text!.toLowerCase().includes(normalizedSearch)),
    );
  }, [options, searchValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  const handleSelect = (nextValue: string) => {
    setOpen(false);
    setSearchValue("");
    onChange(nextValue);
  };

  return (
    <div className="service-entry-gate-page-selector service-entry-gate-page-selector--field">
      <div className="service-entry-gate-page-selector__label-row">
        <span className="service-entry-gate-page-selector__title">{title}</span>
        {required ? (
          <span className="service-entry-gate-page-selector__required">*</span>
        ) : null}
      </div>
      {description ? (
        <span className="service-entry-gate-page-selector__description">
          {description}
        </span>
      ) : null}
      <div
        className="service-entry-gate-page-selector__dropdown"
        ref={containerRef}
      >
        <button
          type="button"
          className={`service-entry-gate-page-selector__trigger${open ? " service-entry-gate-page-selector__trigger--open" : ""}`}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span
            className={`service-entry-gate-page-selector__trigger-text${selectedOption ? "" : " service-entry-gate-page-selector__trigger-text--placeholder"}`}
          >
            {selectedOption?.label || resolvedPlaceholder}
          </span>
          <DownOutlined className="service-entry-gate-page-selector__trigger-icon" />
        </button>

        {open ? (
          <div className="service-entry-gate-page-selector__panel">
            <div className="service-entry-gate-page-selector__search">
              <SearchOutlined className="service-entry-gate-page-selector__search-icon" />
              <input
                type="text"
                value={searchValue}
                placeholder={resolvedSearchPlaceholder}
                className="service-entry-gate-page-selector__search-input"
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>
            <div className="service-entry-gate-page-selector__panel-header">
              <span className="service-entry-gate-page-selector__panel-title">
                {resolvedDropdownTitle}
              </span>
              <CustomButton
                variant="outline"
                size="small"
                customClassName="service-entry-gate-page-selector__add-profile-button"
                onClick={onAddProfile}
              >
                {resolvedAddProfileLabel}
              </CustomButton>
            </div>
            <div className="service-entry-gate-page-selector__option-list">
              {filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`service-entry-gate-page-selector__option${option.value === value ? " service-entry-gate-page-selector__option--active" : ""}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="service-entry-gate-page-selector__option-avatar">
                      <img
                        src={resolveAvatarSrc(option.avatarUrl)}
                        alt={option.label}
                        className="service-entry-gate-page-selector__option-avatar-image"
                      />
                    </span>
                    <span className="service-entry-gate-page-selector__option-copy">
                      <span className="service-entry-gate-page-selector__option-title">
                        {option.label}
                      </span>
                      {option.subtitle ? (
                        <span className="service-entry-gate-page-selector__option-subtitle">
                          {option.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))
              ) : (
                <div className="service-entry-gate-page-selector__empty-state">
                  {t("multiSelectDropdown.noResults")}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
