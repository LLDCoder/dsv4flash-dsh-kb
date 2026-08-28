import { useEffect, useMemo, useState, type ReactNode } from "react";
import { connect, mapProps, mapReadPretty, useField, useForm } from "@formily/react";
import { Select as AntdSelect } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { PreviewText } from "@formily/antd";
import { getFlagImage } from './countries';
import './index.less';
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import {
  getNationalityList,
  type NationalityInfo,
} from "@/services/userProfile";

type CachedNationalityOption = Pick<
  NationalityInfo,
  "id" | "isocode2" | "isocode3" | "nameEn" | "nameAr"
> & { label: string; value: number };

// Module-level cache: nationality list is global and immutable per session, so
// fetch it only once even if CountryDropdown remounts (Formily re-registers the
// form schema during page init, which unmounts/remounts field components).
let nationalityOptionsCache: CachedNationalityOption[] | null = null;
let nationalityOptionsPromise: Promise<CachedNationalityOption[]> | null = null;

function loadNationalityOptionsOnce(): Promise<CachedNationalityOption[]> {
  if (nationalityOptionsCache) {
    return Promise.resolve(nationalityOptionsCache);
  }
  if (nationalityOptionsPromise) {
    return nationalityOptionsPromise;
  }
  nationalityOptionsPromise = getNationalityList()
    .then((response) => {
      const options = (response.data ?? [])
        .filter((item) => item.isocode2 && item.nameEn)
        .map<CachedNationalityOption>((item) => ({
          label: item.nameEn,
          value: item.id,
          id: item.id,
          isocode2: item.isocode2,
          isocode3: item.isocode3,
          nameEn: item.nameEn,
          nameAr: item.nameAr,
        }));
      nationalityOptionsCache = options;
      return options;
    })
    .catch((error) => {
      console.error(
        "Failed to load nationality list for CountryDropdown:",
        error,
      );
      // Reset so a later mount can retry after a transient failure.
      nationalityOptionsPromise = null;
      throw error;
    });
  return nationalityOptionsPromise;
}

interface CountryDropdownProps extends Record<string, unknown> {
  value?: CountryDropdownValue | CountryDropdownValue[];
  onChange?: (value: CountryDropdownValue | CountryDropdownValue[]) => void;
  designMode?: boolean;
}

type CountryDropdownValue = number;

type CountryDropdownOption = Pick<NationalityInfo, "id" | "isocode2" | "isocode3" | "nameEn" | "nameAr"> & {
  label: string;
  value: number;
  displayLabel?: string;
};

type CountryTagRenderProps = {
  label: ReactNode;
  value: CountryDropdownValue;
};

type LoadingFieldState = {
  loading?: boolean;
  validating?: boolean;
};

function getCountryDisplayLabel(country: CountryDropdownOption, isAr: boolean) {
  return (
    preferLocalizedEnAr(
      isAr,
      country.nameEn ?? country.label,
      country.nameAr,
    ) || country.label
  );
}

const CountryDropdownComponent: React.FC<CountryDropdownProps> = ({ value, onChange, ...props }) => {
  const field = useField();
  const form = useForm();
  const [allOptions, setAllOptions] = useState<CountryDropdownOption[]>(
    () => nationalityOptionsCache ?? [],
  );
  const [loading, setLoading] = useState(() => nationalityOptionsCache == null);
  const [searchValue, setSearchValue] = useState('');
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const dropdownProps = { ...props };
  const localizedPlaceholder = preferLocalizedEnAr(
    isAr,
    typeof dropdownProps.placeholderEn === "string"
      ? dropdownProps.placeholderEn
      : undefined,
    typeof dropdownProps.placeholderAr === "string"
      ? dropdownProps.placeholderAr
      : undefined,
  );
  delete dropdownProps.placeholderEn;
  delete dropdownProps.placeholderAr;
  const mergedDropdownClassName = [
    "country-dropdown-menu",
    typeof dropdownProps.dropdownClassName === "string"
      ? dropdownProps.dropdownClassName
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  delete dropdownProps.dropdownClassName;

  useEffect(() => {
    let active = true;

    if (nationalityOptionsCache) {
      setAllOptions(nationalityOptionsCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadNationalityOptionsOnce()
      .then((options) => {
        if (active) {
          setAllOptions(options);
        }
      })
      .catch(() => {
        if (active) {
          setAllOptions([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const localizedOptions = useMemo(
    () =>
      allOptions.map((option) => ({
        ...option,
        displayLabel: getCountryDisplayLabel(option, isAr),
      })),
    [allOptions, isAr],
  );

  const filteredOptions = useMemo(() => {
    const text = searchValue.trim().toLowerCase();

    if (!text) {
      return localizedOptions;
    }

    return localizedOptions.filter((option) => {
      const displayLabel = getCountryDisplayLabel(option, isAr);
      return (
        displayLabel.toLowerCase().includes(text) ||
        option.label.toLowerCase().includes(text) ||
        option.isocode2.toLowerCase().includes(text) ||
        String(option.value).includes(text) ||
        option.nameAr?.toLowerCase().includes(text)
      );
    });
  }, [isAr, localizedOptions, searchValue]);

  const onSearch = (value: string) => {
    if (isDisabled) return;
    setSearchValue(value);
  };

  const onChangeValue = (value: CountryDropdownValue | CountryDropdownValue[]) => {
    if (isDisabled) return;
    if (onChange) {
      onChange(value);
    }
    setSearchValue('');
  };

  const getSelectedCountry = (countryValue: CountryDropdownValue): CountryDropdownOption | undefined => {
    return allOptions.find((country) => country.value === countryValue);
  };

  const tagRender = ({ label, value: tagValue }: CountryTagRenderProps) => {
    const selectedCountry = getSelectedCountry(tagValue);
    
    if (!selectedCountry) {
      return <span>{label}</span>;
    }

    return (
      <div className="country-dropdown-selected-tag">
        <img
          src={getFlagImage(selectedCountry.isocode3)}
          alt={getCountryDisplayLabel(selectedCountry, isAr)}
          className="country-flag-image-selected"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getFlagImage('_unknown');
          }}
        />
        <div className="country-dropdown-selected-label">
          <div className="country-dropdown-selected-label-text">
            {getCountryDisplayLabel(selectedCountry, isAr)}
          </div>
          <div className="country-dropdown-selected-label-description">
            {t("CountryDropdown.countryCode", { code: selectedCountry.isocode2 })}
          </div>
        </div>
      </div>
    );
  };

  const isMultiple = dropdownProps.mode === 'multiple' || dropdownProps.mode === 'tags';
  const isDisabled =
    Boolean(props.designMode) ||
    Boolean(props.disabled) ||
    field?.pattern === "disabled" ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    form?.pattern === "disabled" ||
    form?.pattern === "readOnly" ||
    form?.pattern === "readPretty";
  
  return (
    <AntdSelect
      value={value}
      disabled={isDisabled}
      onChange={onChangeValue}
      loading={loading}
      showSearch={true}
      filterOption={false}
      onSearch={onSearch}
      searchValue={searchValue}
      tagRender={isMultiple ? tagRender : undefined}
      {...dropdownProps}
      dropdownClassName={mergedDropdownClassName}
      placeholder={localizedPlaceholder || dropdownProps.placeholder}
      notFoundContent={dropdownProps.notFoundContent ?? t("CountryDropdown.notFound")}
    >
      {filteredOptions.map((item) => (
        <AntdSelect.Option
          key={item.value}
          value={item.value}
          label={item.displayLabel}
          className="country-dropdown-option-item"
        >
          <div className="country-dropdown-option">
            <img
              src={getFlagImage(item.isocode3)}
              alt={item.displayLabel}
              className="country-flag-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getFlagImage('_unknown');
              }}
            />
            <div className="country-dropdown-option-label">
             <div className="country-dropdown-option-label-text">{item.displayLabel}</div>
             <div className="country-dropdown-option-label-description">
               {t("CountryDropdown.countryCode", { code: item.isocode2 })}
             </div>
            </div>
          </div>
        </AntdSelect.Option>
      ))}
    </AntdSelect>
  );
};

export const CountryDropdown = connect(
  CountryDropdownComponent,
  mapProps(
    {
      loading: true,
    },
    (props, field) => {
      const restProps = { ...props } as Record<string, unknown>;
      delete restProps.options;
      delete restProps.dataSource;
      const fieldState = field as LoadingFieldState | undefined;

      return {
        ...restProps,
        suffixIcon:
          fieldState?.loading || fieldState?.validating ? (
            <LoadingOutlined />
          ) : (
            props.suffixIcon
          ),
      };
    }
  ),
  mapReadPretty((props) => {
    return <PreviewText.Select {...props} />;
  })
);

export default CountryDropdown;
