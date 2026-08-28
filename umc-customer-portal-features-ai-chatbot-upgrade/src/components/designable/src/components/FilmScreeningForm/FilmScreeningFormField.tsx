import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Input, Select, Row, Col, Card as AntdCard, DatePicker, Tooltip, Radio } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import {
  getAgeRatingPermitByProfileId,
  getArtistWorkTypesByServiceCode,
  getLookupData,
  type AgeRatingPermitOption,
} from "@/services/services";
import { getNationalityList, type NationalityInfo } from "@/services/userProfile";
import { useServicesStore } from "@/store/services";
import { useUserStore } from "@/store/user";
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import DurationInput from "../DurationInput/DurationInput";
import { isDurationHmsValue } from "../DurationInput/utils";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { toPickerMoment } from "@/utils/dateLocale";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import "./styles.less";

const { Option } = Select;
const { RangePicker } = DatePicker;

type FilmScreeningFormValue = {
  ageRatingPermit?: string;
  applyingPermitForLocalCinematicFilms?: "Yes" | "No";
  filmDirector?: string;
  filmWriter?: string;
  writerEmiratesId?: string;
  nationalityId?: number;
  title?: string;
  type?: string;
  language?: string;
  source?: string;
  copyrightsType?: string;
  durationInMinutes?: string;
  copyrightsValidityPeriod?: [string, string];
  economyCertificate?: string;
  writerEmiratesIdCopy?: string;
  [key: string]: unknown;
};

type OptionType = {
  label: string;
  value: number | string;
  rawValue?: number | string;
  aliases?: Array<string | number>;
  [key: string]: unknown;
};

const NAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z\s.'-]*$/;

const LOCALIZED_VALUE_KEYS: Record<string, string> = {
  "Distribution of electronic video games": "distributionOfElectronicVideoGames",
  "Programs Distribution": "programsDistribution",
  "Cinema Distribution": "cinemaDistribution",
  "Distribution of songs": "distributionOfSongs",
  "Distribution DVD, BD & 3DBD": "distributionDvdBd3dbd",
  USA: "usa",
  English: "english",
  "Arabic, English": "arabicEnglish",
};

type FilmScreeningFormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  serviceCode?: string | number | null;
};

type FilmScreeningFormValueMap = FilmScreeningFormValue & Record<string, unknown>;

type FilmScreeningFormFormilyField = {
  value?: FilmScreeningFormValue;
  setValue: (value: FilmScreeningFormValue) => void;
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
    const value =
      (item.Id as number | string | undefined) ??
      (item.id as number | string | undefined) ??
      (item.value as number | string | undefined);

    if (!label || value === undefined || value === null || String(value).trim() === "") {
      return result;
    }

    result.push({
      label,
      value,
      rawValue: item.NameEn as number | string | undefined,
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

export const FilmScreeningFormField: React.FC<FilmScreeningFormFieldProps> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField() as FilmScreeningFormFormilyField | undefined;
  if (!field) {
    return null;
  }

  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const storeServiceCode = useServicesStore((state) => state.userInfo.servicesCode);
  const serviceCode = props.serviceCode ?? storeServiceCode;
  const ageRatingServiceCode = String(serviceCode ?? "").trim();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const current = ((field.value || {}) as FilmScreeningFormValueMap);
  const [permitOptions, setPermitOptions] = useState<AgeRatingPermitOption[]>([]);
  const [nationalityOptions, setNationalityOptions] = useState<NationalityInfo[]>([]);
  const [typeOptions, setTypeOptions] = useState<OptionType[]>([]);
  const [typeOptionsLoading, setTypeOptionsLoading] = useState(false);
  const [copyrightsTypeOptions, setCopyrightsTypeOptions] = useState<OptionType[]>([]);
  const [copyrightsTypeOptionsLoading, setCopyrightsTypeOptionsLoading] = useState(false);

  const getLocalizedStaticDisplay = React.useCallback(
    (value: unknown) => {
      const rawValue = String(value ?? "").trim();
      const key = LOCALIZED_VALUE_KEYS[rawValue];
      return key
        ? t(`FilmScreeningForm.value.${key}`)
        : rawValue;
    },
    [t],
  );

  const getLocalizedPermitField = React.useCallback(
    (
      item: AgeRatingPermitOption | undefined,
      fieldName:
        | "label"
        | "title"
        | "type"
        | "language"
        | "source"
        | "copyrightsType",
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
    if (!profileId || !ageRatingServiceCode) {
      setPermitOptions([]);
    }

    let cancelled = false;

    if (profileId && ageRatingServiceCode) {
      getAgeRatingPermitByProfileId(profileId, ageRatingServiceCode)
        .then((rows) => {
          if (!cancelled) {
            setPermitOptions(rows);
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
  }, [currentProfileId, ageRatingServiceCode]);

  useEffect(() => {
    const normalizedServiceCode = Number(serviceCode ?? 0);
    if (!normalizedServiceCode) {
      setTypeOptions([]);
      setTypeOptionsLoading(false);
      return;
    }

    let cancelled = false;
    setTypeOptionsLoading(true);

    getArtistWorkTypesByServiceCode(normalizedServiceCode)
      .then((res) => {
        if (!cancelled) {
          setTypeOptions(unwrapArtistWorkTypeOptions(res, isAr));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTypeOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTypeOptionsLoading(false);
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
      setCopyrightsTypeOptionsLoading(false);
      return;
    }

    let cancelled = false;
    setCopyrightsTypeOptionsLoading(true);

    getLookupData("CopyrightsTypes", normalizedServiceCode)
      .then((res) => {
        if (!cancelled) {
          setCopyrightsTypeOptions(
            normalizeLookupOptions(res, isAr).map((item) => ({
              label: item.label,
              value: item.value,
            })),
          );
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

  const permitSelectOptions = useMemo<OptionType[]>(
    () =>
      permitOptions.map((item) => ({
        label: getLocalizedPermitField(item, "label"),
        value: item.value,
      })),
    [getLocalizedPermitField, permitOptions]
  );

  const writerNationalitySelectOptions = useMemo<OptionType[]>(
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

  const sourceSelectOptions = useMemo<OptionType[]>(
    () =>
      nationalityOptions.map((item) => ({
        label:
          preferLocalizedEnAr(
            isAr,
            item.nameEn || item.fullNameEn,
            item.nameAr || item.fullNameAr,
          ) || String(item.id),
        value: item.id,
        rawValue: item.numericCode,
        aliases: [
          item.numericCode,
          item.isocode2,
          item.isocode3,
          item.nameEn,
          item.nameAr,
          item.fullNameEn,
          item.fullNameAr,
        ].filter(
          (candidate): candidate is string | number =>
            candidate !== undefined && candidate !== null && String(candidate).trim() !== "",
        ),
      })),
    [isAr, nationalityOptions],
  );

  const isLocalCinematic = current.applyingPermitForLocalCinematicFilms === "Yes";

  const selectedPermit = useMemo(
    () =>
      permitOptions.find(
        (item) => String(item.value) === String(current.ageRatingPermit ?? ""),
      ),
    [current.ageRatingPermit, permitOptions],
  );

  const selectedTypeValue = useMemo(
    () => findMatchingOption(typeOptions, current.type)?.value,
    [current.type, typeOptions],
  );

  const selectedSourceValue = useMemo(
    () => findMatchingOption(sourceSelectOptions, current.source)?.value,
    [current.source, sourceSelectOptions],
  );

  const selectedCopyrightsTypeValue = useMemo(
    () => findMatchingOption(copyrightsTypeOptions, current.copyrightsType)?.value,
    [copyrightsTypeOptions, current.copyrightsType],
  );

  const applyPermitValue = (selectedPermit?: AgeRatingPermitOption) => {
    if (!selectedPermit) {
      return {
        applyingPermitForLocalCinematicFilms: undefined,
        filmDirector: undefined,
        filmWriter: undefined,
        writerEmiratesId: undefined,
        nationalityId: undefined,
        title: undefined,
        type: undefined,
        language: undefined,
        source: undefined,
        copyrightsType: undefined,
        durationInMinutes: undefined,
        copyrightsValidityPeriod: undefined,
        economyCertificate: undefined,
        writerEmiratesIdCopy: undefined,
      };
    }

    const nextValue: Partial<FilmScreeningFormValue> = {
      applyingPermitForLocalCinematicFilms:
        selectedPermit.applyingPermitForLocalCinematicFilms,
      filmDirector: selectedPermit.filmDirector,
      filmWriter: selectedPermit.filmWriter,
      title: selectedPermit.title,
      type: selectedPermit.artistWorkTypeId ?? selectedPermit.type,
      language: selectedPermit.language,
      source: selectedPermit.source,
      copyrightsType: selectedPermit.copyrightsType,
      durationInMinutes: selectedPermit.durationInMinutes,
      copyrightsValidityPeriod: selectedPermit.copyrightsValidityPeriod,
      economyCertificate: selectedPermit.economyCertificate,
    };

    if (selectedPermit.applyingPermitForLocalCinematicFilms === "Yes") {
      nextValue.writerEmiratesId = selectedPermit.writerEmiratesId;
      nextValue.nationalityId = selectedPermit.nationalityId;
      nextValue.writerEmiratesIdCopy = selectedPermit.writerEmiratesIdCopy;
    } else {
      nextValue.writerEmiratesId = undefined;
      nextValue.nationalityId = undefined;
      nextValue.writerEmiratesIdCopy = undefined;
    }

    return nextValue;
  };

  const handleFieldChange = (key: string, value: unknown) => {
    const newValue: FilmScreeningFormValue = {
      ...current,
      [key]: value,
    };

    if (key === "ageRatingPermit") {
      const selectedPermit = permitOptions.find(
        (p) => String(p.value) === String(value ?? ""),
      );
      Object.assign(newValue, applyPermitValue(selectedPermit));
    }

    field.setValue(newValue);
  };

  const renderLabel = (label: string, required: boolean = true, tooltip?: string) => (
    <div className="film-screening-form-label">
      <span>
        {label}
        {required && <span className="film-screening-form-required">*</span>}
      </span>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="film-screening-form-tooltip" />
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
    valueOverride?: string | number,
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("FilmScreeningForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Select
          disabled={props.disabled || disabled}
          loading={loading}
          placeholder={placeholder || t("FilmScreeningForm.placeholder.select", { label })}
          value={valueOverride ?? (current[name] as string | number | undefined)}
          onChange={(value) => handleFieldChange(name, value)}
          showSearch
          optionFilterProp="children"
          allowClear={!required}
          className={disabled ? "film-screening-form-readonly" : ""}
        >
          {options.map((o) => (
            <Option key={o.value} value={o.value}>
              {o.label}
            </Option>
          ))}
        </Select>
      </Field>
    );
  };

  const renderTextInput = (
    name: string,
    label: string,
    required: boolean = true,
    disabled: boolean = false,
    maxLength?: number,
    placeholder?: string,
    regex?: RegExp,
    displayValue?: string
  ) => {
    const isInputDisabled = props.disabled || disabled;
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (regex) {
        if (regex.test(value) || value === "") {
          handleFieldChange(name, value);
        }
      } else {
        handleFieldChange(name, value);
      }
    };

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          const trimmedValue = typeof value === "string" ? value.trim() : value;
          if (required && !trimmedValue) return t("FilmScreeningForm.validation.required");
          if (typeof value === "string" && maxLength && value.length > maxLength) {
            return t("FilmScreeningForm.validation.maxChars", {
              label,
              max: maxLength,
            });
          }
          if (typeof value === "string" && value && regex && !regex.test(value)) {
            return t("FilmScreeningForm.validation.invalidCharacters", {
              label,
            });
          }
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
          maxLength={maxLength}
          onChange={handleChange}
          className={disabled ? "film-screening-form-readonly" : ""}
        />
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
          if (required && !value) return t("FilmScreeningForm.validation.required");
          if (value && !isDurationHmsValue(value)) {
            return t("FilmScreeningForm.validation.durationPositive", {
              label,
            });
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        <DurationInput
          disabled={props.disabled || disabled}
          value={typeof current[name] === "string" ? current[name] : ""}
          onChange={(value) => handleFieldChange(name, value)}
          className={disabled ? "film-screening-form-readonly" : ""}
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
            return t("FilmScreeningForm.validation.required");
          if (value && value.length === 2) {
            const [start, end] = value;
            if (!disabled && moment(start).isBefore(moment(), "day")) {
              return t("FilmScreeningForm.validation.startTodayOrLater");
            }
            if (!disabled && moment(end).isSameOrBefore(moment(start), "day")) {
              return t("FilmScreeningForm.validation.endAfterStart");
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
            t("FilmScreeningForm.placeholder.startDate"),
            t("FilmScreeningForm.placeholder.endDate"),
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
    disabled: boolean = false,
    accept: string = ".pdf,.jpg,.jpeg,.png",
    uploadTip: string = t("FilmScreeningForm.uploadTip.common")
  ) => {
    const isDisabled = props.disabled || disabled;

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("FilmScreeningForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required, tooltip)}
        <DocumentViewer
          hasDelete={!isDisabled}
          disabled={isDisabled}
          value={current[name] as string | string[] | undefined}
          onChange={(value) => handleFieldChange(name, value)}
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip,
            accept,
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
          if (required && !value) return t("FilmScreeningForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required)}
        <LanguageSelectComponent
          className={`film-screening-form-language ${disabled ? "film-screening-form-readonly" : ""}`}
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
          if (required && !value) return t("FilmScreeningForm.validation.required");
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Radio.Group
          disabled
          value={current[name] as string | undefined}
          className="film-screening-form-readonly"
        >
          <Radio value="Yes">{t("FilmScreeningForm.common.yes")}</Radio>
          <Radio value="No">{t("FilmScreeningForm.common.no")}</Radio>
        </Radio.Group>
      </Field>
    );
  };

  return (
    <div className="film-screening-form-container" {...props}>
      <AntdCard
        title={
          <span data-content-editable="x-component-props.title">
            {t("FilmScreeningForm.title")}
          </span>
        }
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            {renderSelect(
              "ageRatingPermit",
              t("FilmScreeningForm.label.ageRatingPermit"),
              permitSelectOptions,
              true,
              false,
              t("FilmScreeningForm.placeholder.ageRatingPermit")
            )}
          </Col>
            <Col xs={24} md={12}>
              {renderRadioReadonly(
                "applyingPermitForLocalCinematicFilms",
                t("FilmScreeningForm.label.applyingPermitForLocalCinematicFilms"),
                true
              )}
            </Col>
          <Col xs={24} md={12}>
            {renderTextInput(
              "filmDirector",
              t("FilmScreeningForm.label.filmDirector"),
              true,
                true,
                100,
                t("FilmScreeningForm.placeholder.filmDirector"),
              NAME_REGEX
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderTextInput(
              "filmWriter",
              t("FilmScreeningForm.label.filmWriter"),
              true,
              true,
              100,
              t("FilmScreeningForm.placeholder.filmWriter"),
              NAME_REGEX
            )}
          </Col>
          {isLocalCinematic ? (
            <>
              <Col xs={24} md={12}>
                {renderTextInput(
                  "writerEmiratesId",
                  t("FilmScreeningForm.label.writerEmiratesId"),
                  true,
                  true,
                  undefined,
                  t("FilmScreeningForm.placeholder.writerEmiratesId")
                )}
              </Col>
              <Col xs={24} md={12}>
                {renderSelect(
                  "nationalityId",
                  t("FilmScreeningForm.label.writerNationality"),
                  writerNationalitySelectOptions,
                  true,
                  true,
                  t("FilmScreeningForm.placeholder.writerNationality")
                )}
              </Col>
            </>
          ) : null}
          <Col xs={24} md={12}>
            {renderTextInput(
              "title",
              t("FilmScreeningForm.label.title"),
              true,
              true,
              undefined,
              t("FilmScreeningForm.placeholder.title"),
              undefined,
              getLocalizedPermitField(selectedPermit, "title", current.title)
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderSelect(
              "type",
              t("FilmScreeningForm.label.type"),
              typeOptions,
              true,
              true,
              t("FilmScreeningForm.placeholder.type"),
              typeOptionsLoading,
              selectedTypeValue,
            )}
          </Col>
          <Col xs={24} md={12}>
            {renderLanguageSelect(
              "language",
              t("FilmScreeningForm.label.language"),
              true,
              true
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderSelect(
              "source",
              t("FilmScreeningForm.label.source"),
              sourceSelectOptions,
              true,
              true,
              t("FilmScreeningForm.placeholder.source"),
              false,
              selectedSourceValue,
            )}
          </Col>
          <Col xs={24} md={12}>
            {renderSelect(
              "copyrightsType",
              t("FilmScreeningForm.label.copyrightsType"),
              copyrightsTypeOptions,
              true,
              true,
              t("FilmScreeningForm.placeholder.copyrightsType"),
              copyrightsTypeOptionsLoading,
              selectedCopyrightsTypeValue,
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderDurationInput(
              "durationInMinutes",
              t("FilmScreeningForm.label.durationInMinutes"),
              true,
              true
            )}
          </Col>
          <Col xs={24} md={12}>
            {renderDateRangePicker(
              "copyrightsValidityPeriod",
              t("FilmScreeningForm.label.copyrightsValidityPeriod"),
              true,
              true
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderUpload(
              "economyCertificate",
              t("FilmScreeningForm.label.economyCertificate"),
              true,
              undefined,
              true,
              ".pdf",
              ""
            )}
          </Col>
          {isLocalCinematic ? (
            <Col xs={24} md={12}>
              {renderUpload(
                "writerEmiratesIdCopy",
                t("FilmScreeningForm.label.writerEmiratesIdCopy"),
                true,
                undefined,
                true,
                ".pdf"
              )}
            </Col>
          ) : null}
        </Row>
      </AntdCard>
    </div>
  );
});

FilmScreeningFormField.displayName = "FilmScreeningFormField";

export default FilmScreeningFormField;
