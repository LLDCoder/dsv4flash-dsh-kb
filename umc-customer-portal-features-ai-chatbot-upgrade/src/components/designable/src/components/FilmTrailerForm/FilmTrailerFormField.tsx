import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, useForm, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Input, Select, Row, Col, Card as AntdCard, DatePicker, Tooltip, Radio } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import {
  TODOpermitApi,
  getArtistWorkTypesByServiceCode,
  getLookupData,
  type TODOPermitOption,
} from "@/services/services";
import {
  getTypeDictionaries,
  type TypeDictionary as FormTypeDictionary,
} from "@/services/form";
import { getNationalityList, type NationalityInfo } from "@/services/userProfile";
import { useUserStore } from "@/store/user";
import { CountryDropdown } from "../CountryDropdown/CountryDropdown";
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import { useServicesStore } from "@/store/services";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { toPickerMoment } from "@/utils/dateLocale";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import DurationInput from "../DurationInput/DurationInput";
import { isDurationHmsValue } from "../DurationInput/utils";
import "./styles.less";

const { Option } = Select;
const { RangePicker } = DatePicker;

type FilmTrailerFormValue = {
  posterTrailerPermit?: string;
  requestType?: string;
  applyingPermitForLocalCinematicFilms?: "Yes" | "No";
  filmDirector?: string;
  filmWriter?: string;
  writerEmiratesId?: string;
  writerNationalityId?: number;
  title?: string;
  category?: string;
  languages?: string;
  originCountry?: string;
  copyrightsType?: string;
  durationInMinutes?: string;
  permitValidityPeriod?: [string, string];
  ministryOfEconomyRegistrationCertificate?: string;
  writerEmiratesIdCopy?: string;
  movieMaterialContent?: unknown;
  [key: string]: unknown;
};

type OptionType = {
  label: string;
  value: number | string;
  rawValue?: number | string;
  aliases?: Array<string | number>;
  [key: string]: unknown;
};

type FilmTrailerFormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  serviceCode?: string | number | null;
};

type FilmTrailerFormValueMap = FilmTrailerFormValue & Record<string, unknown>;

type FilmTrailerFormFormilyField = {
  value?: FilmTrailerFormValue;
  setValue: (value: FilmTrailerFormValue) => void;
  address: string | { toString: () => string };
};
type LocalizedPermitField =
  | "label"
  | "title"
  | "category"
  | "languages"
  | "originCountry"
  | "copyrightsType";

const LOCALIZED_VALUE_KEYS: Record<string, string> = {
  Action: "action",
  Drama: "drama",
  English: "english",
  Arabic: "arabic",
  Japanese: "japanese",
  USA: "usa",
  UAE: "uae",
  Japan: "japan",
  "Cinema Distribution": "cinemaDistribution",
  "Programs Distribution": "programsDistribution",
};

const unwrapNationalities = (res: unknown): NationalityInfo[] => {
  const rows = (res as { data?: unknown[] })?.data;
  return Array.isArray(rows) ? (rows as NationalityInfo[]) : [];
};

const unwrapArtistWorkTypeOptions = (res: unknown, isAr: boolean): OptionType[] => {
  const rows = (res as { data?: unknown[] })?.data;
  const items = Array.isArray(rows) ? rows : [];

  return items.reduce<OptionType[]>((result, row) => {
    const item = row as Record<string, unknown>;
    const label = preferLocalizedEnAr(
      isAr,
      String(item.NameEn ?? item.nameEn ?? "").trim(),
      String(item.NameAr ?? item.nameAr ?? "").trim(),
    );
    const value = String(item.NameEn ?? item.nameEn ?? label ?? "").trim();
    if (!label || !value) {
      return result;
    }

    result.push({
      label,
      value,
      rawValue:
        (item.Id as number | string | undefined) ??
        (item.id as number | string | undefined) ??
        (item.value as number | string | undefined),
      aliases: [
        item.NameEn as string | number | undefined,
        item.nameEn as string | number | undefined,
        item.NameAr as string | number | undefined,
        item.nameAr as string | number | undefined,
      ].filter(
        (candidate): candidate is string | number =>
          candidate !== undefined && candidate !== null && String(candidate).trim() !== "",
      ),
    });
    return result;
  }, []);
};

const unwrapTypeDictionaries = (res: unknown): FormTypeDictionary[] => {
  if (Array.isArray(res)) {
    return res as FormTypeDictionary[];
  }

  if (res && typeof res === "object" && "data" in res) {
    const rows = (res as { data?: unknown }).data;
    return Array.isArray(rows) ? (rows as FormTypeDictionary[]) : [];
  }

  return [];
};

const mapPosterTrailerTypeOption = (
  item: FormTypeDictionary,
  isAr: boolean,
): OptionType => {
  const value = String(item.code ?? "").trim() || String(item.id ?? "").trim();

  return {
    label:
      preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) ||
      item.code ||
      String(item.id),
    value,
    rawValue: item.code,
    aliases: [
      item.code,
    ].filter(
      (candidate): candidate is string | number =>
        candidate !== undefined && candidate !== null && String(candidate).trim() !== "",
    ),
  };
};

const normalizeComparableValue = (value: unknown) => String(value ?? "").trim().toLowerCase();

const findMatchingOption = (
  options: OptionType[],
  rawValue: unknown,
): OptionType | undefined => {
  const normalizedValue = normalizeComparableValue(rawValue);
  if (!normalizedValue) {
    return undefined;
  }

  return options.find((option) =>
    [option.value, option.rawValue, option.label, ...(option.aliases ?? [])]
      .filter((candidate) => candidate !== undefined && candidate !== null)
      .some((candidate) => normalizeComparableValue(candidate) === normalizedValue),
  );
};

const getOptionDisplayLabel = (
  options: OptionType[],
  rawValue: unknown,
  fallback?: unknown,
) => {
  const matched = findMatchingOption(options, rawValue);
  if (matched?.label) {
    return matched.label;
  }

  const fallbackText = String(fallback ?? "").trim();
  if (fallbackText) {
    return fallbackText;
  }

  const rawText = String(rawValue ?? "").trim();
  return rawText || undefined;
};

export const FilmTrailerFormField: React.FC<FilmTrailerFormFieldProps> = observer((props) => {
  const { t, i18n } = useTranslation();
  const form = useForm();
  const field = useField() as FilmTrailerFormFormilyField | undefined;
  if (!field) {
    return null;
  }

  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const storeServiceCode = useServicesStore((state) => state.userInfo.servicesCode);
  const serviceCode = props.serviceCode ?? storeServiceCode;
  const isService2201 = Number(serviceCode ?? 0) === 2201;
  const current = ((field.value || {}) as FilmTrailerFormValueMap);
  const [permitOptions, setPermitOptions] = useState<TODOPermitOption[]>([]);
  const [nationalityOptions, setNationalityOptions] = useState<NationalityInfo[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<OptionType[]>([]);
  const [categoryOptionsLoading, setCategoryOptionsLoading] = useState(false);
  const [copyrightsTypeOptions, setCopyrightsTypeOptions] = useState<OptionType[]>([]);
  const [copyrightsTypeOptionsLoading, setCopyrightsTypeOptionsLoading] = useState(false);
  const [requestTypeOptions, setRequestTypeOptions] = useState<OptionType[]>([]);

  const getLocalizedStaticDisplay = React.useCallback(
    (value: unknown) => {
      const rawValue = String(value ?? "").trim();
      const key = LOCALIZED_VALUE_KEYS[rawValue];
      return key ? t(`FilmTrailerForm.value.${key}`) : rawValue;
    },
    [t],
  );

  const getLocalizedPermitField = React.useCallback(
    (
      item: TODOPermitOption | undefined,
      fieldName: LocalizedPermitField,
      fallback?: unknown,
    ) => {
      const record = item as Record<string, unknown> | undefined;
      const en = record?.[`${fieldName}En`] ?? record?.[fieldName] ?? fallback;
      const ar = record?.[`${fieldName}Ar`];
      const localized = preferLocalizedEnAr(
        isAr,
        String(en ?? ""),
        ar === undefined || ar === null ? undefined : String(ar),
      );
      return getLocalizedStaticDisplay(localized || fallback);
    },
    [getLocalizedStaticDisplay, isAr],
  );

  useEffect(() => {
    const profileId = String(currentProfileId || "").trim();
    let cancelled = false;

    if (!profileId) {
      setPermitOptions([]);
    } else {
      TODOpermitApi(profileId, serviceCode)
        .then((res) => {
          if (!cancelled) {
            setPermitOptions(Array.isArray(res.data) ? res.data : []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPermitOptions([]);
          }
        });
    }

    getNationalityList()
      .then((res) => {
        if (!cancelled) {
          setNationalityOptions(unwrapNationalities(res));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNationalityOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, serviceCode]);

  useEffect(() => {
    const normalizedServiceCode = Number(serviceCode ?? 0);
    if (!normalizedServiceCode) {
      setCategoryOptions([]);
      return;
    }

    let cancelled = false;
    setCategoryOptionsLoading(true);

    getArtistWorkTypesByServiceCode(normalizedServiceCode)
      .then((res) => {
        if (!cancelled) {
          setCategoryOptions(unwrapArtistWorkTypeOptions(res, isAr));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCategoryOptionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAr, serviceCode]);

  useEffect(() => {
    const normalizedServiceCode = Number(serviceCode ?? 0);
    if (!normalizedServiceCode) {
      setCopyrightsTypeOptions([]);
      return;
    }

    let cancelled = false;
    setCopyrightsTypeOptionsLoading(true);

    getLookupData("CopyrightsTypes", normalizedServiceCode)
      .then((res) => {
        if (!cancelled) {
          setCopyrightsTypeOptions(normalizeLookupOptions(res, isAr));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCopyrightsTypeOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCopyrightsTypeOptionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAr, serviceCode]);

  useEffect(() => {
    let cancelled = false;

    getTypeDictionaries("PosterTrailerTypes")
      .then((res) => {
        if (!cancelled) {
          setRequestTypeOptions(
            unwrapTypeDictionaries(res).map((item) =>
              mapPosterTrailerTypeOption(item, isAr),
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequestTypeOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAr]);

  const writerNationalitySelectOptions = useMemo(
    () =>
      nationalityOptions.map((item) => ({
        label:
          preferLocalizedEnAr(
            isAr,
            item.nameEn || item.fullNameEn,
            item.nameAr || item.fullNameAr,
          ) || String(item.id),
        value: item.id,
      })),
    [isAr, nationalityOptions]
  );

  const getCountryDisplayLabel = React.useCallback(
    (rawValue: unknown, fallback?: unknown, matchByIdOnly: boolean = false) => {
      const normalizedValue = String(rawValue ?? "").trim();
      if (!normalizedValue) {
        const fallbackText = String(fallback ?? "").trim();
        return fallbackText || undefined;
      }

      const numericValue = Number(normalizedValue);
      const matchedCountry = nationalityOptions.find((item) => {
        if (!Number.isNaN(numericValue)) {
          return item.id === numericValue || (!matchByIdOnly && item.numericCode === numericValue);
        }

        const upperValue = normalizedValue.toUpperCase();
        return [item.isocode2, item.isocode3, item.nameEn, item.nameAr, item.fullNameEn, item.fullNameAr]
          .filter(Boolean)
          .some((candidate) => String(candidate).trim().toUpperCase() === upperValue);
      });

      if (matchedCountry) {
        return (
          preferLocalizedEnAr(
            isAr,
            matchedCountry.nameEn || matchedCountry.fullNameEn,
            matchedCountry.nameAr || matchedCountry.fullNameAr,
          ) || normalizedValue
        );
      }

      const fallbackText = String(fallback ?? "").trim();
      return fallbackText || normalizedValue;
    },
    [isAr, nationalityOptions],
  );

  const permitSelectOptions = useMemo<OptionType[]>(
    () =>
      permitOptions.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [permitOptions]
  );

  const isLocalCinematic = current.applyingPermitForLocalCinematicFilms === "Yes";
  const selectedPermit = useMemo(
    () =>
      permitOptions.find(
        (item) => String(item.value) === String(current.posterTrailerPermit ?? ""),
      ),
    [current.posterTrailerPermit, permitOptions],
  );
  const hydratedPermitValueRef = React.useRef<string | null>(null);
  const categoryDisplayValue = useMemo(
    () =>
      getOptionDisplayLabel(
        categoryOptions,
        current.category,
        getLocalizedPermitField(selectedPermit, "category", current.category),
      ),
    [categoryOptions, current.category, getLocalizedPermitField, selectedPermit],
  );
  const copyrightsTypeDisplayValue = useMemo(
    () =>
      getOptionDisplayLabel(
        copyrightsTypeOptions,
        current.copyrightsType,
        getLocalizedPermitField(selectedPermit, "copyrightsType", current.copyrightsType),
      ),
    [copyrightsTypeOptions, current.copyrightsType, getLocalizedPermitField, selectedPermit],
  );
  const originCountryDisplayValue = useMemo(
    () => {
      const fallback = isService2201
        ? undefined
        : getLocalizedPermitField(selectedPermit, "originCountry", current.originCountry);

      return getCountryDisplayLabel(current.originCountry, fallback, isService2201);
    },
    [
      current.originCountry,
      getCountryDisplayLabel,
      getLocalizedPermitField,
      isService2201,
      selectedPermit,
    ],
  );

  useEffect(() => {
    const fieldBasePath = String(field.address);
    const conditionalFieldNames: Array<keyof FilmTrailerFormValue> = [
      "writerEmiratesId",
      "writerNationalityId",
      "writerEmiratesIdCopy",
    ];

    conditionalFieldNames.forEach((name) => {
      form.setFieldState(`${fieldBasePath}.${String(name)}`, (state) => {
        state.display = isLocalCinematic ? "visible" : "none";
        state.required = isLocalCinematic;
        state.selfErrors = [];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.validating = false;

        if (!isLocalCinematic) {
          state.validator = undefined;
        }
      });
    });
  }, [field.address, form, isLocalCinematic]);

  const applyPermitValue = (selectedPermit?: TODOPermitOption) => {
    if (!selectedPermit) {
      return {
        title: undefined,
        category: undefined,
        languages: undefined,
        originCountry: undefined,
        copyrightsType: undefined,
        durationInMinutes: undefined,
        permitValidityPeriod: undefined,
        applyingPermitForLocalCinematicFilms: undefined,
        filmDirector: undefined,
        filmWriter: undefined,
        writerEmiratesId: undefined,
        writerNationalityId: undefined,
        ministryOfEconomyRegistrationCertificate: undefined,
        writerEmiratesIdCopy: undefined,
      };
    }

    const nextValue: Partial<FilmTrailerFormValue> = {
      requestType: selectedPermit.requestType,
      title: selectedPermit.title,
      category: selectedPermit.category,
      languages: selectedPermit.languages,
      originCountry: isService2201
        ? String(selectedPermit.sourceCountryId ?? "").trim() || undefined
        : selectedPermit.originCountry,
      copyrightsType: selectedPermit.copyrightsType,
      durationInMinutes: selectedPermit.durationInMinutes,
      permitValidityPeriod: selectedPermit.permitValidityPeriod,
      applyingPermitForLocalCinematicFilms:
        selectedPermit.applyingPermitForLocalCinematicFilms,
      filmDirector: selectedPermit.filmDirector,
      filmWriter: selectedPermit.filmWriter,
      ministryOfEconomyRegistrationCertificate:
        selectedPermit.ministryOfEconomyRegistrationCertificate,
    };

    if (selectedPermit.applyingPermitForLocalCinematicFilms === "Yes") {
      nextValue.writerEmiratesId = selectedPermit.writerEmiratesId;
      nextValue.writerNationalityId = selectedPermit.writerNationalityId;
      nextValue.writerEmiratesIdCopy = selectedPermit.writerEmiratesIdCopy;
    } else {
      nextValue.writerEmiratesId = undefined;
      nextValue.writerNationalityId = undefined;
      nextValue.writerEmiratesIdCopy = undefined;
    }

    return nextValue;
  };

  useEffect(() => {
    const permitValue = String(current.posterTrailerPermit ?? "").trim();

    if (!permitValue) {
      hydratedPermitValueRef.current = null;
      return;
    }

    if (!selectedPermit || hydratedPermitValueRef.current === permitValue) {
      return;
    }

    hydratedPermitValueRef.current = permitValue;
    field.setValue({
      ...current,
      ...applyPermitValue(selectedPermit),
    });
  }, [current, field, selectedPermit]);

  const handleFieldChange = (key: string, value: unknown) => {
    const newValue: FilmTrailerFormValue = {
      ...current,
      [key]: value,
    };

    if (key === "posterTrailerPermit") {
      const tempSelectedPermit = permitOptions.find(
        (p) => String(p.value) === String(value ?? ""),
      );
      Object.assign(newValue, applyPermitValue(tempSelectedPermit));
    }

    field.setValue(newValue);
  };

  const renderLabel = (label: string, required: boolean = true, tooltip?: string) => (
    <div className="film-trailer-form-label">
      <span>
        {label}
        {required && <span className="film-trailer-form-required">*</span>}
      </span>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="film-trailer-form-tooltip" />
        </Tooltip>
      )}
    </div>
  );

  const renderSelect = (
    name: string,
    label: string,
    options: OptionType[],
    required: boolean = true,
    disabled: boolean = false,
    placeholder?: string,
    loading: boolean = false,
    displayValue?: string,
  ) => {
    const isReadOnly = props.disabled || disabled;
    const resolvedDisplayValue =
      displayValue ?? getOptionDisplayLabel(options, current[name], current[name]);

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("FilmTrailerForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required)}
        {isReadOnly ? (
          <Input
            disabled
            placeholder={placeholder || t("FilmTrailerForm.placeholder.select", { label })}
            value={resolvedDisplayValue ?? ""}
            className="film-trailer-form-readonly"
          />
        ) : (
          <Select
            disabled={isReadOnly}
            loading={loading}
            placeholder={placeholder || t("FilmTrailerForm.placeholder.select", { label })}
            value={current[name] as string | number | undefined}
            onChange={(value) => handleFieldChange(name, value)}
            showSearch
            optionFilterProp="children"
            allowClear={!required}
            className={disabled ? "film-trailer-form-readonly" : ""}
          >
            {options.map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
          </Select>
        )}
      </Field>
    );
  };

  const renderTextInput = (
    name: string,
    label: string,
    required: boolean = true,
    disabled: boolean = false,
    placeholder?: string,
    displayValue?: string
  ) => {
    const isInputDisabled = props.disabled || disabled;
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !String(value || "").trim())
            return t("FilmTrailerForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Input
          disabled={isInputDisabled}
          placeholder={placeholder || label}
          value={
            isInputDisabled && displayValue !== undefined
              ? displayValue
              : typeof current[name] === "string"
                ? current[name]
                : ""
          }
          onChange={(e) => handleFieldChange(name, e.target.value)}
          className={disabled ? "film-trailer-form-readonly" : ""}
        />
      </Field>
    );
  };

  const renderCountryDropdown = (
    name: string,
    label: string,
    required: boolean = true,
    disabled: boolean = false,
    placeholder?: string,
    displayValue?: string,
  ) => {
    const isReadOnly = props.disabled || disabled;

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !String(value ?? "").trim()) {
            return t("FilmTrailerForm.validation.required");
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        {isReadOnly ? (
          <Input
            disabled
            placeholder={placeholder || label}
            value={displayValue ?? getCountryDisplayLabel(current[name], current[name]) ?? ""}
            className="film-trailer-form-readonly"
          />
        ) : (
          <CountryDropdown
            disabled={isReadOnly}
            placeholder={placeholder || label}
            value={current[name] as number | undefined}
            onChange={(value: number) => handleFieldChange(name, value)}
            className={disabled ? "film-trailer-form-readonly" : ""}
          />
        )}
      </Field>
    );
  };

  const renderDurationInput = (
    name: string,
    label: string,
    required: boolean = true,
    disabled: boolean = false,
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("FilmTrailerForm.validation.required");
          if (value && !isDurationHmsValue(value)) {
            return t("FilmTrailerForm.validation.durationPositive", { label });
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        <DurationInput
          disabled={props.disabled || disabled}
          value={typeof current[name] === "string" ? current[name] : ""}
          onChange={(value) => handleFieldChange(name, value)}
          className={disabled ? "film-trailer-form-readonly" : ""}
        />
      </Field>
    );
  };

  const renderDateRangePicker = (
    name: string,
    label: string,
    required: boolean = true,
    disabled: boolean = false
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && (!value || value.length !== 2))
            return t("FilmTrailerForm.validation.required");
          if (value && value.length === 2) {
            const [start, end] = value;
            if (!disabled && moment(start).isBefore(moment(), "day")) {
              return t("FilmTrailerForm.validation.startTodayOrLater");
            }
            if (!disabled && moment(end).isSameOrBefore(moment(start), "day")) {
              return t("FilmTrailerForm.validation.endAfterStart");
            }
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        {(() => {
          const rangeValue = current[name];
          const normalizedRange =
            Array.isArray(rangeValue) && rangeValue.length === 2
              ? [
                  typeof rangeValue[0] === "string" ? rangeValue[0] : undefined,
                  typeof rangeValue[1] === "string" ? rangeValue[1] : undefined,
                ]
              : null;

          return (
        <RangePicker
          disabled={props.disabled || disabled}
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          placeholder={[
            t("FilmTrailerForm.placeholder.startDate"),
            t("FilmTrailerForm.placeholder.endDate"),
          ]}
          value={
            normalizedRange && normalizedRange.length === 2
              ? [
                  toPickerMoment(normalizedRange[0], "YYYY-MM-DD"),
                  toPickerMoment(normalizedRange[1], "YYYY-MM-DD"),
                ]
              : null
          }
          onChange={(dates) => {
            if (dates && dates.length === 2) {
              handleFieldChange(name, [
                dates[0]?.format("YYYY-MM-DD"),
                dates[1]?.format("YYYY-MM-DD"),
              ]);
            } else {
              handleFieldChange(name, undefined);
            }
          }}
          disabledDate={
            disabled
              ? undefined
              : (currentDate) => currentDate && currentDate < moment().startOf("day")
          }
        />
          );
        })()}
      </Field>
    );
  };

  const renderUpload = (
    name: string,
    label: string,
    required: boolean = true,
    tooltip?: string,
    maxSize: number = 5,
    accept?: string,
    uploadTip: string = t("FilmTrailerForm.uploadTip.common")
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("FilmTrailerForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required, tooltip)}
        <DocumentViewer
          hasDelete={true}
          disabled={props.disabled}
          value={current[name] as string | string[] | undefined}
          onChange={(value) => handleFieldChange(name, value)}
          uploadConfig={{
            maxCount: 1,
            maxSize: maxSize,
            uploadTip,
            accept: accept || ".pdf,.jpg,.jpeg,.png",
          }}
        />
      </Field>
    );
  };

  const renderLanguageSelect = (
    name: string,
    label: string,
    required: boolean = true,
    disabled: boolean = false
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("FilmTrailerForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required)}
        <LanguageSelectComponent
          className={`film-trailer-form-language ${disabled ? "film-trailer-form-readonly" : ""}`}
          disabled={props.disabled || disabled}
          multiple={false}
          placeholder={label}
          value={current[name] as string | number | (string | number)[] | undefined}
          onChange={(value: unknown) => handleFieldChange(name, value)}
        />
      </Field>
    );
  };

  const renderRadioReadonly = (name: string, label: string, required: boolean = true) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("FilmTrailerForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Radio.Group
          disabled
          value={current[name] as string | undefined}
          className="film-trailer-form-readonly"
        >
          <Radio value="Yes">{t("FilmTrailerForm.common.yes")}</Radio>
          <Radio value="No">{t("FilmTrailerForm.common.no")}</Radio>
        </Radio.Group>
      </Field>
    );
  };

  return (
    <div className="film-trailer-form-container" {...props}>
      <AntdCard
        title={
          <span data-content-editable="x-component-props.title">
            {t("FilmTrailerForm.title")}
          </span>
        }
      >
        <Row gutter={[24, 24]}>
          <Col span={12}>
            {renderSelect(
              "posterTrailerPermit",
              t("FilmTrailerForm.label.posterTrailerPermit"),
              permitSelectOptions,
              true,
              false,
              t("FilmTrailerForm.placeholder.posterTrailerPermit")
            )}
          </Col>
          <Col span={12}>
            {renderSelect(
              "requestType",
              t("FilmTrailerForm.label.requestType"),
              requestTypeOptions,
              false,
              true,
              t("FilmTrailerForm.placeholder.requestType")
            )}
          </Col>

          <Col span={12}>
            {renderRadioReadonly(
              "applyingPermitForLocalCinematicFilms",
              t("FilmTrailerForm.label.applyingPermitForLocalCinematicFilms"),
              true
            )}
          </Col>
          <Col span={12}>
            {renderTextInput(
              "filmDirector",
              t("FilmTrailerForm.label.filmDirector"),
              true,
              true,
              t("FilmTrailerForm.placeholder.filmDirector")
            )}
          </Col>

          <Col span={12}>
            {renderTextInput(
              "filmWriter",
              t("FilmTrailerForm.label.filmWriter"),
              true,
              true,
              t("FilmTrailerForm.placeholder.filmWriter")
            )}
          </Col>
          {isLocalCinematic ? (
            <>
              <Col span={12}>
                {renderTextInput(
                  "writerEmiratesId",
                  t("FilmTrailerForm.label.writerEmiratesId"),
                  true,
                  true,
                  t("FilmTrailerForm.placeholder.writerEmiratesId")
                )}
              </Col>
              <Col span={12}>
                {renderSelect(
                  "writerNationalityId",
                  t("FilmTrailerForm.label.writerNationality"),
                  writerNationalitySelectOptions,
                  true,
                  true,
                  t("FilmTrailerForm.placeholder.writerNationality")
                )}
              </Col>
            </>
          ) : null}

          <Col span={12}>
            {renderTextInput(
              "title",
              t("FilmTrailerForm.label.title"),
              true,
              true,
              t("FilmTrailerForm.placeholder.title"),
              getLocalizedPermitField(selectedPermit, "title", current.title)
            )}
          </Col>
          <Col span={12}>
            {renderSelect(
              "category",
              t("FilmTrailerForm.label.category"),
              categoryOptions,
              true,
              true,
              t("FilmTrailerForm.placeholder.category"),
              categoryOptionsLoading,
              categoryDisplayValue,
            )}
          </Col>

          <Col span={12}>
            {renderLanguageSelect(
              "languages",
              t("FilmTrailerForm.label.languages"),
              true,
              true
            )}
          </Col>
          <Col span={12}>
            {renderCountryDropdown(
              "originCountry",
              t("FilmTrailerForm.label.originCountry"),
              true,
              true,
              t("FilmTrailerForm.placeholder.originCountry"),
              originCountryDisplayValue,
            )}
          </Col>

          <Col span={12}>
            {renderSelect(
              "copyrightsType",
              t("FilmTrailerForm.label.copyrightsType"),
              copyrightsTypeOptions,
              true,
              true,
              t("FilmTrailerForm.placeholder.copyrightsType"),
              copyrightsTypeOptionsLoading,
              copyrightsTypeDisplayValue,
            )}
          </Col>
          <Col span={12}>
            {renderDurationInput(
              "durationInMinutes",
              t("FilmTrailerForm.label.durationInMinutes"),
              true,
              true
            )}
          </Col>

          <Col span={12}>
            {renderDateRangePicker(
              "permitValidityPeriod",
              t("FilmTrailerForm.label.permitValidityPeriod"),
              true,
              true
            )}
          </Col>
          <Col span={12}>
            {renderUpload(
              "ministryOfEconomyRegistrationCertificate",
              t("FilmTrailerForm.label.ministryOfEconomyRegistrationCertificate"),
              true
            )}
          </Col>
          {isLocalCinematic ? (
            <Col span={12}>
              {renderUpload(
                "writerEmiratesIdCopy",
                t("FilmTrailerForm.label.writerEmiratesIdCopy"),
                true
              )}
            </Col>
          ) : null}
          <Col span={12}>
            {renderUpload(
              "movieMaterialContent",
              t("FilmTrailerForm.label.movieMaterialContent"),
              false,
              undefined,
              100,
              ".pdf,.jpg,.jpeg,.png,.mp4,.mov",
              t("FilmTrailerForm.uploadTip.movieMaterialContent")
            )}
          </Col>
        </Row>
      </AntdCard>
    </div>
  );
});

FilmTrailerFormField.displayName = "FilmTrailerFormField";

export default FilmTrailerFormField;
