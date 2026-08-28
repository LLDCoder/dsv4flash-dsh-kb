import React, { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./index.less";

export interface FilterOption {
  label: string;
  value: number | string;
}

export interface FilterSection {
  title: string;
  options: FilterOption[];
  multiple?: boolean;
  // single-select
  value?: number | string | null;
  onChange?: (value: number | string | null) => void;
  // multi-select
  values?: (number | string)[];
  onChangeMultiple?: (values: (number | string)[]) => void;
}

interface MobileFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sections: FilterSection[];
  title?: string;
  extra?: ReactNode;
}

const MobileFilterModal: React.FC<MobileFilterModalProps> = ({
  visible,
  onClose,
  onConfirm,
  sections,
  title,
  extra,
}) => {
  const { t } = useTranslation();

  if (!visible) return null;

  const handleOptionClick = (section: FilterSection, optValue: number | string) => {
    if (section.multiple) {
      const current = section.values ?? [];
      const next = current.includes(optValue)
        ? current.filter((v) => v !== optValue)
        : [...current, optValue];
      section.onChangeMultiple?.(next);
    } else {
      const isSelected = section.value === optValue;
      section.onChange?.(isSelected ? null : optValue);
    }
  };

  const isSelected = (section: FilterSection, optValue: number | string) => {
    if (section.multiple) return (section.values ?? []).includes(optValue);
    return section.value === optValue;
  };

  return (
    <>
      <div className="mobile-filter-overlay" onClick={onClose} />
      <div className="mobile-filter-modal">
        <div className="mobile-filter-header">
          <span className="mobile-filter-title">{title ?? t("common.filter", "Filter")}</span>
          <button className="mobile-filter-close" onClick={onClose}>✕</button>
        </div>
        <div className="mobile-filter-body">
          {extra && <div className="mobile-filter-extra">{extra}</div>}
          {sections.map((section, idx) => (
            <div key={idx} className="mobile-filter-section">
              <div className="mobile-filter-section-title">{section.title}</div>
              <div className="mobile-filter-options">
                {section.options.map((opt) => {
                  const selected = isSelected(section, opt.value);
                  return (
                    <div
                      key={opt.value}
                      className={`mobile-filter-option${selected ? " selected" : ""}`}
                      onClick={() => handleOptionClick(section, opt.value)}
                    >
                      <span>{opt.label}</span>
                      {selected && <span className="mobile-filter-check">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mobile-filter-footer">
          <button className="mobile-filter-cancel" onClick={onClose}>
            {t("common.cancel", "Cancel")}
          </button>
          <button className="mobile-filter-confirm" onClick={onConfirm}>
            {t("common.confirm", "Confirm")}
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileFilterModal;
