import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Input, Select, Row, Col, Card as AntdCard, DatePicker, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import { getCirculationMediaMaterialTitles } from "@/services/circulationMediaMaterial";
import { getArtistWorkTypes, getLanguages, getLookupData } from "@/services/services";
import { useUserStore } from "@/store/user";
import { getNationalityList } from "../../../../../services/userProfile";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { toPickerMoment } from "@/utils/dateLocale";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import DurationInput from "../DurationInput/DurationInput";
import { isDurationHmsValue } from "../DurationInput/utils";
import "./styles.less";

const { Option } = Select;
const { RangePicker } = DatePicker;
const SERVICE_CODE_1008 = "1008";

type FilmRescreeningFormValue = {
  title?: string;
  permitNumber?: string;
  mediaMaterialType?: string | number;
  type?: string;
  language?: string;
  durationInMinutes?: string;
  source?: string;
  copyrightsType?: string;
  copyrightsValidityPeriod?: [string, string];
  economyCertificate?: any;
  [key: string]: any;
};

type OptionType = {
  label: string;
  value: number | string;
  [key: string]: any;
};

type ArtistWorkTypeOption = {
  label: string;
  value: number | string;
};

const COPYRIGHTS_TYPE_VALUES = ["1", "2", "3", "4", "5"] as const;

const isDateOnOrBeforeToday = (currentDate?: moment.Moment | null) =>
  Boolean(currentDate && !currentDate.isAfter(moment(), "day"));

const toDateOnly = (value?: string) => (value ? value.slice(0, 10) : undefined);

const sameValue = (left: unknown, right: unknown) => {
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => item === right[index])
    );
  }

  return left === right;
};

const findOptionLabel = (options: OptionType[], value: unknown) => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return undefined;
  }

  return options.find((option) => String(option.value) === normalizedValue)?.label;
};

type FilmPermitOption = OptionType & {
  title?: string;
  applicationNumber?: string | number;
  permitNumber?: string | number;
  mediaMaterialType?: string | number;
  mediaMaterialTypeId?: string | number;
  type?: string | number;
  artistWorkTypeId?: string | number;
  language?: string | number;
  languageId?: string | number;
  durationInMinutes?: string;
  source?: string | number;
  sourceCountryId?: string | number;
  copyrightsType?: string | number;
  copyrightsTypeId?: string | number;
  copyrightsStartDate?: string;
  copyrightsEndDate?: string;
  ministryOfEconomyRegistrationCertificate?: string | null;
};

export const FilmRescreeningFormField: React.FC<{
  disabled?: boolean;
  artistWorkTypeOptions?: ArtistWorkTypeOption[];
  artistWorkTypeOptionsLoading?: boolean;
  materialTypeId?: number | null;
  serviceCode?: string | number;
}> = observer((props) => {
  const { serviceCode, ...containerProps } = props;
  const { t, i18n } = useTranslation();
  const field = useField<any>();
  if (!field) {
    return null;
  }

  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const currentLanguage = i18n.language ?? "";
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const current: FilmRescreeningFormValue = field.value || {};
  const isService1008 = String(serviceCode ?? "").trim() === SERVICE_CODE_1008;
  const [filmOptions, setFilmOptions] = useState<FilmPermitOption[]>([]);
  const [filmOptionsLoading, setFilmOptionsLoading] = useState(false);
  const [sourceRows, setSourceRows] = useState<any[]>([]);
  const [service1008MediaMaterialTypeOptions, setService1008MediaMaterialTypeOptions] =
    useState<OptionType[]>([]);
  const [service1008TypeOptions, setService1008TypeOptions] = useState<OptionType[]>([]);
  const [service1008CopyrightsTypeOptions, setService1008CopyrightsTypeOptions] =
    useState<OptionType[]>([]);
  const [service1008LanguageOptions, setService1008LanguageOptions] = useState<OptionType[]>([]);
  const [service1008LookupLoading, setService1008LookupLoading] = useState(false);

  const getLocalizedOptionLabel = React.useCallback(
    (item: Record<string, unknown>) =>
      preferLocalizedEnAr(
        isAr,
        String(
          item.labelEn ??
            item.nameEn ??
            item.NameEn ??
            item.fullNameEn ??
            item.label ??
            item.name ??
            "",
        ),
        String(item.labelAr ?? item.nameAr ?? item.NameAr ?? item.fullNameAr ?? ""),
      ) || String(item.value ?? item.id ?? item.Id ?? ""),
    [currentLanguage, isAr],
  );

  const legacyTypeOptions = useMemo(
    () =>
      ((props.artistWorkTypeOptions ?? []) as OptionType[]).map((item) => ({
        ...item,
        label: getLocalizedOptionLabel(item),
      })),
    [getLocalizedOptionLabel, props.artistWorkTypeOptions],
  );
  const typeOptions = isService1008 ? service1008TypeOptions : legacyTypeOptions;
  const typeOptionsLoading = isService1008
    ? service1008LookupLoading
    : !!props.artistWorkTypeOptionsLoading;
  const mediaMaterialTypeOptions = useMemo<OptionType[]>(
    () =>
      isService1008
        ? service1008MediaMaterialTypeOptions
        : [
            { label: t("FilmRescreeningForm.option.mediaMaterialType.cinema"), value: "cinema" },
            { label: t("FilmRescreeningForm.option.mediaMaterialType.clip"), value: "clip" },
          ],
    [currentLanguage, isService1008, service1008MediaMaterialTypeOptions, t],
  );
  const copyrightsTypeOptions = useMemo<OptionType[]>(
    () =>
      isService1008
        ? service1008CopyrightsTypeOptions
        : COPYRIGHTS_TYPE_VALUES.map((value) => ({
            value,
            label: t(`FilmRescreeningForm.option.copyrightsType.${value}`),
          })),
    [currentLanguage, isService1008, service1008CopyrightsTypeOptions, t],
  );
  const filmTitleOptions = useMemo<OptionType[]>(
    () =>
      filmOptions.map((item) => ({
        ...item,
        label: isService1008
          ? [item.title, findOptionLabel(service1008LanguageOptions, item.languageId)]
              .filter((part) => String(part ?? "").trim())
              .join(" | ")
          : preferLocalizedEnAr(
              isAr,
              item.labelEn ?? item.label,
              item.labelAr,
            ) || String(item.value ?? ""),
      })),
    [currentLanguage, filmOptions, isAr, isService1008, service1008LanguageOptions],
  );
  const sourceOptions = useMemo<OptionType[]>(
    () =>
      sourceRows.map((item: any) => ({
        label:
          preferLocalizedEnAr(
            isAr,
            item.nameEn || item.fullNameEn || item.name,
            item.nameAr || item.fullNameAr,
          ) || String(item.id ?? ""),
        value: item.id,
      })),
    [currentLanguage, isAr, sourceRows],
  );

  useEffect(() => {
    const profileId = String(currentProfileId || "").trim();
    if (!profileId) {
      setFilmOptions([]);
      return;
    }

    let cancelled = false;

    const loadFilmOptions = async () => {
      setFilmOptionsLoading(true);
      try {
        const options = await getCirculationMediaMaterialTitles(
          profileId,
          serviceCode,
        );
        if (!cancelled) {
          setFilmOptions(options);
        }
      } finally {
        if (!cancelled) {
          setFilmOptionsLoading(false);
        }
      }
    };

    loadFilmOptions();

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, serviceCode]);

  useEffect(() => {
    if (!isService1008) {
      setService1008MediaMaterialTypeOptions([]);
      setService1008TypeOptions([]);
      setService1008CopyrightsTypeOptions([]);
      setService1008LanguageOptions([]);
      setService1008LookupLoading(false);
      return;
    }

    let cancelled = false;
    setService1008LookupLoading(true);

    Promise.all([
      getLookupData("MediaMaterialTypes", SERVICE_CODE_1008),
      getArtistWorkTypes(1),
      getLookupData("CopyrightsTypes", SERVICE_CODE_1008),
      getLanguages(),
    ])
      .then(([mediaMaterialTypes, artistWorkTypes, copyrightsTypes, languages]) => {
        if (cancelled) {
          return;
        }

        setService1008MediaMaterialTypeOptions(
          normalizeLookupOptions(mediaMaterialTypes, isAr),
        );
        setService1008TypeOptions(
          normalizeLookupOptions(artistWorkTypes, isAr),
        );
        setService1008CopyrightsTypeOptions(
          normalizeLookupOptions(copyrightsTypes, isAr),
        );
        setService1008LanguageOptions(
          normalizeLookupOptions(languages, isAr),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setService1008MediaMaterialTypeOptions([]);
          setService1008TypeOptions([]);
          setService1008CopyrightsTypeOptions([]);
          setService1008LanguageOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setService1008LookupLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAr, isService1008]);

  useEffect(() => {
    getNationalityList().then((res) => {
      if (res?.data) {
        setSourceRows(res.data);
      }
    });
  }, []);

  useEffect(() => {
    if (current.title) {
      return;
    }

    const currentType = String(current.type ?? "").trim();
    if (!currentType || typeOptionsLoading) {
      return;
    }

    const isCurrentTypeValid = typeOptions.some(
      (option) => String(option.value) === currentType,
    );
    if (!isCurrentTypeValid) {
      field.setValue({
        ...(field.value || {}),
        type: undefined,
      });
    }
  }, [current.type, field, typeOptions, typeOptionsLoading]);

  const getSelectedFilm = React.useCallback(
    (titleValue: unknown) =>
      filmOptions.find((film) => String(film.value) === String(titleValue ?? "")),
    [filmOptions],
  );

  const buildAutoFilledValues = React.useCallback(
    (selectedFilm?: FilmPermitOption) => {
      if (!selectedFilm) {
        const emptyValues = {
          permitNumber: undefined,
          mediaMaterialType: undefined,
          type: undefined,
          language: undefined,
          durationInMinutes: undefined,
          source: undefined,
        };

        return isService1008
          ? {
              ...emptyValues,
              copyrightsType: undefined,
              copyrightsValidityPeriod: undefined,
              economyCertificate: undefined,
            }
          : emptyValues;
      }

      if (isService1008) {
        const copyrightStartDate = toDateOnly(selectedFilm.copyrightsStartDate);
        const copyrightEndDate = toDateOnly(selectedFilm.copyrightsEndDate);

        return {
          permitNumber: selectedFilm.applicationNumber,
          mediaMaterialType: selectedFilm.mediaMaterialTypeId,
          type: selectedFilm.artistWorkTypeId,
          language: selectedFilm.languageId,
          durationInMinutes: selectedFilm.durationInMinutes,
          source: selectedFilm.sourceCountryId,
          copyrightsType: selectedFilm.copyrightsTypeId,
          copyrightsValidityPeriod:
            copyrightStartDate && copyrightEndDate
              ? [copyrightStartDate, copyrightEndDate]
              : undefined,
          economyCertificate: selectedFilm.ministryOfEconomyRegistrationCertificate,
        };
      }

      return {
        permitNumber: selectedFilm.permitNumber,
        mediaMaterialType: selectedFilm.mediaMaterialType,
        type: selectedFilm.type,
        language: selectedFilm.language,
        durationInMinutes: selectedFilm.durationInMinutes,
        source: selectedFilm.source,
      };
    },
    [isService1008],
  );

  useEffect(() => {
    const selectedFilm = getSelectedFilm(current.title);
    if (!selectedFilm) {
      return;
    }

    const nextAutoValues = buildAutoFilledValues(selectedFilm);
    const shouldSync = Object.entries(nextAutoValues).some(
      ([key, value]) => !sameValue(current[key], value),
    );

    if (shouldSync) {
      field.setValue({
        ...current,
        ...nextAutoValues,
      });
    }
  }, [buildAutoFilledValues, current, field, getSelectedFilm]);

  const handleFieldChange = (key: string, value: any) => {
    const newValue = {
      ...current,
      [key]: value,
    };

    if (key === "title") {
      Object.assign(newValue, buildAutoFilledValues(getSelectedFilm(value)));
    }

    field.setValue(newValue);
  };

  const renderLabel = (label: string, required: boolean = true, tooltip?: string) => (
    <div className="film-form-label">
      <span>
        {label}
        {required && <span className="film-form-required">*</span>}
      </span>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="film-form-tooltip" />
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
    loading = false
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("FilmRescreeningForm.validation.required", { label });
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Select
          disabled={
            props.disabled ||
            disabled ||
            (name === "type" &&
              (!props.materialTypeId ||
                (!!props.materialTypeId && !loading && options.length === 0)))
          }
          loading={loading}
          placeholder={placeholder || t("FilmRescreeningForm.placeholder.select", { label })}
          value={current[name]}
          onChange={(value: unknown) => handleFieldChange(name, value)}
          showSearch
          optionFilterProp="children"
          className={[
            disabled ? "film-form-readonly" : "",
            name === "title" ? "film-form-title-select" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          dropdownClassName={name === "title" ? "film-form-title-dropdown" : undefined}
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
    placeholder?: string
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("FilmRescreeningForm.validation.required", { label });
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Input
          disabled={props.disabled || disabled}
          placeholder={placeholder || label}
          value={current[name] || ""}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          className={disabled ? "film-form-readonly" : ""}
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
          if (required && !value)
            return t("FilmRescreeningForm.validation.required", { label });
          if (value && !isDurationHmsValue(value)) {
            return t("FilmRescreeningForm.validation.durationPositive", {
              label,
            });
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        <DurationInput
          disabled={props.disabled || disabled}
          value={current[name] || ""}
          onChange={(value) => handleFieldChange(name, value)}
          className={disabled ? "film-form-readonly" : ""}
        />
      </Field>
    );
  };

  const renderDateRangePicker = (
    name: string,
    label: string,
    required: boolean = true,
    enforceFutureStart = true,
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && (!value || value.length !== 2))
            return t("FilmRescreeningForm.validation.required", { label });
          if (value && value.length === 2) {
            const [start, end] = value;
            if (enforceFutureStart && isDateOnOrBeforeToday(moment(start))) {
              return t("FilmRescreeningForm.validation.startAfterToday");
            }
            if (moment(end).isSameOrBefore(moment(start), "day")) {
              return t("FilmRescreeningForm.validation.endAfterStart");
            }
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        <RangePicker
          disabled={props.disabled}
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          placeholder={[
            t("FilmRescreeningForm.placeholder.startDate"),
            t("FilmRescreeningForm.placeholder.endDate"),
          ]}
          value={
            current[name] && current[name].length === 2
              ? [
                  toPickerMoment(current[name][0], "YYYY-MM-DD"),
                  toPickerMoment(current[name][1], "YYYY-MM-DD"),
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
          disabledDate={enforceFutureStart ? isDateOnOrBeforeToday : undefined}
        />
      </Field>
    );
  };

  const renderUpload = (
    name: string,
    label: string,
    required: boolean = true,
    tooltip?: string,
    accept: string = ".pdf,.jpg,.jpeg,.png",
    uploadTip: string = t("FilmRescreeningForm.uploadTip.common")
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("FilmRescreeningForm.validation.required", { label });
          return "";
        }}
      >
        {renderLabel(label, required, tooltip)}
        <DocumentViewer
          hasDelete={true}
          disabled={props.disabled}
          value={current[name]}
          onChange={(value: unknown) => handleFieldChange(name, value)}
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
          if (required && !value)
            return t("FilmRescreeningForm.validation.required", { label });
          return "";
        }}
      >
        {renderLabel(label, required)}
        <LanguageSelectComponent
          className="film-form-language"
          disabled={props.disabled || disabled}
          multiple={false}
          placeholder={t("FilmRescreeningForm.placeholder.select", { label })}
          value={current[name]}
          onChange={(value: unknown) => handleFieldChange(name, value)}
        />
      </Field>
    );
  };

  return (
    <div className="film-rescreening-form-container" {...containerProps}>
      <AntdCard
        title={
          <span data-content-editable="x-component-props.title">
            {t("FilmRescreeningForm.title")}
          </span>
        }
      >
        <Row gutter={[24, 24]}>
          <Col span={12}>
            {renderSelect(
              "title",
              t("FilmRescreeningForm.label.title"),
              filmTitleOptions,
              true,
              false,
              t("FilmRescreeningForm.placeholder.selectMovie"),
              filmOptionsLoading
            )}
          </Col>
          <Col span={12}>
            {renderTextInput(
              "permitNumber",
              t("FilmRescreeningForm.label.permitNumber"),
              true,
              true,
              t("FilmRescreeningForm.placeholder.permitNumber")
            )}
          </Col>

          <Col span={12}>
            {renderSelect(
              "mediaMaterialType",
              t("FilmRescreeningForm.label.mediaMaterialType"),
              mediaMaterialTypeOptions,
              true,
              true,
              t("FilmRescreeningForm.placeholder.mediaMaterialType"),
              isService1008 ? service1008LookupLoading : false
            )}
          </Col>
          <Col span={12}>
            {renderSelect(
              "type",
              t("FilmRescreeningForm.label.type"),
              typeOptions,
              true,
              true,
              t("FilmRescreeningForm.placeholder.type"),
              typeOptionsLoading
            )}
          </Col>

          <Col span={12}>
            {renderLanguageSelect(
              "language",
              t("FilmRescreeningForm.label.language"),
              true,
              true,
            )}
          </Col>
          <Col span={12}>
            {renderDurationInput(
              "durationInMinutes",
              t("FilmRescreeningForm.label.durationInMinutes"),
              true,
              true
            )}
          </Col>

          <Col span={12}>
            {renderSelect(
              "source",
              t("FilmRescreeningForm.label.source"),
              sourceOptions,
              true,
              true,
              t("FilmRescreeningForm.placeholder.source")
            )}
          </Col>
          <Col span={12}>
            {renderSelect(
              "copyrightsType",
              t("FilmRescreeningForm.label.copyrightsType"),
              copyrightsTypeOptions,
              true,
              false,
              t("FilmRescreeningForm.placeholder.copyrightsType"),
              isService1008 ? service1008LookupLoading : false
            )}
          </Col>

          <Col span={12}>
            {renderDateRangePicker(
              "copyrightsValidityPeriod",
              t("FilmRescreeningForm.label.copyrightsValidityPeriod"),
              true,
              !isService1008,
            )}
          </Col>
          <Col span={12}>
            {renderUpload(
              "economyCertificate",
              t("FilmRescreeningForm.label.economyCertificate"),
              false,
              t("FilmRescreeningForm.tooltip.economyCertificate"),
              ".pdf",
              t("FilmRescreeningForm.uploadTip.pdf")
            )}
          </Col>
        </Row>
      </AntdCard>
    </div>
  );
});

FilmRescreeningFormField.displayName = "FilmRescreeningFormField";

export default FilmRescreeningFormField;
