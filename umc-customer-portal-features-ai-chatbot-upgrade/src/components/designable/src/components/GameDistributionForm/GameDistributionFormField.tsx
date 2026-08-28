import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Checkbox, Input, Select, Row, Col, Radio, Card as AntdCard, DatePicker, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import {
  getArtistWorkTypesByServiceCode,
  getAgeRatingPermitByProfileId,
  getLookupData,
  type AgeRatingPermitOption,
} from "../../../../../services/services";
import { getNationalityList, type NationalityInfo } from "@/services/userProfile";
import { useUserStore } from "@/store/user";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { toPickerMoment } from "@/utils/dateLocale";
import "./styles.less";

const { Option } = Select;
const { RangePicker } = DatePicker;

type GameDistributionFormValue = {
  ageRatingPermit?: string | number;
  addDigitalVersion?: string;
  title?: string;
  type?: string;
  language?: string;
  source?: string;
  copyrightsType?: string;
  copyrightsValidityPeriod?: [string, string];
  economyCertificate?: unknown;
  gamePlatform?: string[];
  gameMaterialContent?: unknown;
  [key: string]: unknown;
};

type GameDistributionFormFormilyField = {
  address?: string;
  value?: GameDistributionFormValue;
  setValue: (value: GameDistributionFormValue) => void;
  display?: string;
  query?: (path: string) => {
    take: () => GameDistributionFormSubField | undefined;
  };
};

type GameDistributionFormSubFieldState = {
  required?: boolean;
  visible?: boolean;
  display?: string;
  value?: unknown;
  selfErrors?: unknown[];
  selfWarnings?: unknown[];
  selfSuccesses?: unknown[];
  selfValidating?: boolean;
  validating?: boolean;
};

type GameDistributionFormSubField = {
  setFeedback?: (feedback: { type: string; messages: unknown[] }) => void;
  setValue?: (value: unknown) => void;
  setState?: (updater: (state: GameDistributionFormSubFieldState) => void) => void;
};

type OptionType = {
  label: string;
  value: number | string;
  [key: string]: unknown;
};

type ValidationVisibility = boolean | (() => boolean);

type GameDistributionFormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  serviceCode?: string | number;
  [key: string]: unknown;
};

type RawLookupItem = Record<string, unknown>;

type LocalizedPermitField =
  | "label"
  | "title"
  | "type"
  | "language"
  | "source"
  | "copyrightsType";

const LOCALIZED_VALUE_KEYS: Record<string, string> = {
  "Distribution of electronic video games": "distributionOfElectronicVideoGames",
  "Programs Distribution": "programsDistribution",
  USA: "usa",
  English: "english",
  "Arabic, English": "arabicEnglish",
};

export const GameDistributionFormField: React.FC<GameDistributionFormFieldProps> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField() as GameDistributionFormFormilyField | undefined;
  if (!field) {
    return null;
  }

  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const current = useMemo(() => (field.value || {}) as GameDistributionFormValue, [field.value]);
  const [permitRows, setPermitRows] = useState<AgeRatingPermitOption[]>([]);
  const [gamePlatformRows, setGamePlatformRows] = useState<RawLookupItem[]>([]);
  const [artistWorkTypeRows, setArtistWorkTypeRows] = useState<RawLookupItem[]>([]);
  const [copyrightsTypeRows, setCopyrightsTypeRows] = useState<RawLookupItem[]>([]);
  const [sourceRows, setSourceRows] = useState<NationalityInfo[]>([]);

  const getLocalizedStaticDisplay = React.useCallback(
    (value: unknown) => {
      const rawValue = String(value ?? "").trim();
      const key = LOCALIZED_VALUE_KEYS[rawValue];
      return key
        ? t(`GameDistributionForm.value.${key}`)
        : rawValue;
    },
    [t],
  );

  const getLocalizedPermitField = React.useCallback(
    (
      item: AgeRatingPermitOption | undefined,
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

  const permitOptions = useMemo<OptionType[]>(
    () =>
      permitRows.map((item) => ({
        ...item,
        label: getLocalizedPermitField(item, "label") || item.label,
      })),
    [getLocalizedPermitField, permitRows],
  );

  const getLookupLabel = React.useCallback(
    (item: RawLookupItem) =>
      preferLocalizedEnAr(
        isAr,
        String(item.nameEn ?? item.NameEn ?? item.labelEn ?? item.label ?? ""),
        String(item.nameAr ?? item.NameAr ?? item.labelAr ?? ""),
        ) || String(item.id ?? item.Id ?? item.value ?? ""),
    [isAr],
  );

  const gamePlatformOptions = useMemo<OptionType[]>(
    () =>
      gamePlatformRows.map((item) => ({
        label: getLookupLabel(item),
        value:
          (item.code as string | number | undefined) ??
          (item.Code as string | number | undefined) ??
          (item.id as string | number | undefined) ??
          (item.Id as string | number | undefined) ??
          "",
        ...item,
      })),
    [gamePlatformRows, getLookupLabel],
  );

  const getNormalizedValue = React.useCallback(
    (value: unknown) => String(value ?? "").trim().toLowerCase(),
    [],
  );

  const getLookupDisplayByValue = React.useCallback(
    (rows: RawLookupItem[], value: unknown) => {
      const normalizedValue = getNormalizedValue(value);
      if (!normalizedValue) {
        return getLocalizedStaticDisplay(value);
      }

      const matched = rows.find((item) =>
        [
          item.id,
          item.Id,
          item.value,
          item.Value,
          item.code,
          item.Code,
        ].some((candidate) => getNormalizedValue(candidate) === normalizedValue),
      );

      return matched ? getLookupLabel(matched) : getLocalizedStaticDisplay(value);
    },
    [getLocalizedStaticDisplay, getLookupLabel, getNormalizedValue],
  );

  const getSourceDisplayByValue = React.useCallback(
    (value: unknown) => {
      const normalizedValue = getNormalizedValue(value);
      if (!normalizedValue) {
        return getLocalizedStaticDisplay(value);
      }

      const matched = sourceRows.find((item) =>
        [
          item.id,
          item.numericCode,
          item.isocode2,
          item.isocode3,
          item.nameEn,
          item.nameAr,
          item.fullNameEn,
          item.fullNameAr,
        ].some((candidate) => getNormalizedValue(candidate) === normalizedValue),
      );

      return matched
        ? (
            preferLocalizedEnAr(
              isAr,
              matched.nameEn || matched.fullNameEn,
              matched.nameAr || matched.fullNameAr,
            ) || String(matched.id)
          )
        : getLocalizedStaticDisplay(value);
    },
    [getLocalizedStaticDisplay, getNormalizedValue, isAr, sourceRows],
  );

  const getPermitReadonlyDisplay = React.useCallback(
    (
      fieldName: Exclude<LocalizedPermitField, "label" | "language">,
      item: AgeRatingPermitOption | undefined,
      fallback?: unknown,
    ) => {
      if (fieldName === "title") {
        return getLocalizedPermitField(item, fieldName, fallback);
      }

      const record = item as Record<string, unknown> | undefined;
      const hasExplicitLocalizedValue =
        record?.[`${fieldName}En`] !== undefined ||
        record?.[`${fieldName}Ar`] !== undefined;

      if (hasExplicitLocalizedValue) {
        return getLocalizedPermitField(item, fieldName, fallback);
      }

      const rawValue = record?.[fieldName] ?? fallback;
      if (fieldName === "type") {
        return getLookupDisplayByValue(artistWorkTypeRows, rawValue);
      }
      if (fieldName === "source") {
        return getSourceDisplayByValue(rawValue);
      }
      return getLookupDisplayByValue(copyrightsTypeRows, rawValue);
    },
    [
      artistWorkTypeRows,
      copyrightsTypeRows,
      getLocalizedPermitField,
      getLookupDisplayByValue,
      getSourceDisplayByValue,
    ],
  );

  const selectedPermit = useMemo(
    () =>
      permitRows.find(
        (item) => String(item.value) === String(current.ageRatingPermit ?? ""),
      ),
    [current.ageRatingPermit, permitRows],
  );

  const isComponentVisible = field.display !== "none" && field.display !== "hidden";
  const isFieldDisplayed = React.useCallback(
    () => field.display !== "none" && field.display !== "hidden",
    [field],
  );

  const hasValue = React.useCallback((value: unknown) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
    return value !== undefined && value !== null && value !== "";
  }, []);

  const shouldValidateField = React.useCallback(
    (
      required: boolean,
      visible: boolean | (() => boolean) = true,
    ) => {
      const isVisible = typeof visible === "function" ? visible() : visible;
      return required && isVisible && isFieldDisplayed();
    },
    [isFieldDisplayed],
  );

  const clearFields = React.useCallback(
    (
      baseValue: GameDistributionFormValue,
      keys: Array<keyof GameDistributionFormValue>,
    ) => {
      const nextValue = { ...baseValue };
      keys.forEach((item) => {
        delete nextValue[item];
      });
      return nextValue;
    },
    [],
  );

  const getInputValue = React.useCallback((value: unknown) => {
    if (typeof value === "string" || typeof value === "number") return value;
    return "";
  }, []);

  const getStoredRangeValue = React.useCallback((value: unknown) => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const [start, end] = value;
    return [
      start ? toPickerMoment(String(start), "YYYY-MM-DD") : null,
      end ? toPickerMoment(String(end), "YYYY-MM-DD") : null,
    ] as [moment.Moment | null, moment.Moment | null];
  }, []);

  const getUploadValue = React.useCallback((value: unknown) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value as string[];
    }
    return undefined;
  }, []);

  const getSubField = React.useCallback((name: keyof GameDistributionFormValue) => {
    if (!field.query) return undefined;
    const path = field.address ? `${field.address}.${String(name)}` : String(name);
    return field.query(path).take();
  }, [field]);

  const resetSubFieldState = React.useCallback((name: keyof GameDistributionFormValue) => {
    const targetField = getSubField(name);
    if (!targetField) return;

    targetField.setFeedback?.({
      type: "error",
      messages: [],
    });
    targetField.setValue?.(undefined);
    targetField.setState?.((state) => {
      state.required = false;
      state.visible = false;
      state.display = "none";
      state.value = undefined;
      state.selfErrors = [];
      state.selfWarnings = [];
      state.selfSuccesses = [];
      state.selfValidating = false;
      state.validating = false;
    });
  }, [getSubField]);

  const enableSubFieldState = React.useCallback((name: keyof GameDistributionFormValue) => {
    const targetField = getSubField(name);
    if (!targetField) return;

    targetField.setState?.((state) => {
      state.required = true;
      state.visible = true;
      state.display = "visible";
    });
  }, [getSubField]);

  const isDigitalFieldVisible = React.useCallback(
    () => ((field.value || {}) as GameDistributionFormValue).addDigitalVersion === "Yes",
    [field],
  );

  const hasPermitValue = React.useCallback(
    () => Boolean(((field.value || {}) as GameDistributionFormValue).ageRatingPermit),
    [field],
  );

  const isDigitalVersion = current.addDigitalVersion === "Yes";

  useEffect(() => {
    if (!isComponentVisible || current.addDigitalVersion !== undefined) return;
    field.setValue({
      ...current,
      addDigitalVersion: "No",
    });
  }, [current, field, isComponentVisible]);

  useEffect(() => {
    const profileId = String(currentProfileId || "").trim();
    if (!profileId) {
      setPermitRows([]);
      return;
    }

    let cancelled = false;

    getAgeRatingPermitByProfileId(profileId, props.serviceCode)
      .then((rows) => {
        if (!cancelled) {
          setPermitRows(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPermitRows([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, props.serviceCode]);

  useEffect(() => {
    let cancelled = false;

    getLookupData("GamePlatform", props.serviceCode).then((res) => {
      if (!cancelled) {
        const rows = Array.isArray(res?.data)
          ? (res.data as Array<Record<string, unknown>>)
          : [];
        setGamePlatformRows(rows);
      }
    });

    getArtistWorkTypesByServiceCode(props.serviceCode)
      .then((res) => {
        if (!cancelled) {
          const rows = Array.isArray(res?.data)
            ? (res.data as Array<Record<string, unknown>>)
            : [];
          setArtistWorkTypeRows(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setArtistWorkTypeRows([]);
        }
      });

    getLookupData("CopyrightsTypes", props.serviceCode)
      .then((res) => {
        if (!cancelled) {
          const rows = Array.isArray(res?.data)
            ? (res.data as Array<Record<string, unknown>>)
            : [];
          setCopyrightsTypeRows(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCopyrightsTypeRows([]);
        }
      });

    getNationalityList()
      .then((res) => {
        if (!cancelled) {
          setSourceRows(Array.isArray(res?.data) ? res.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSourceRows([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [props.serviceCode]);

  useEffect(() => {
    if (isComponentVisible || !hasValue(current)) return;
    field.setValue({});
  }, [current, field, hasValue, isComponentVisible]);

  useEffect(() => {
    if (isDigitalVersion) {
      enableSubFieldState("gamePlatform");
      enableSubFieldState("gameMaterialContent");
      return;
    }

    resetSubFieldState("gamePlatform");
    resetSubFieldState("gameMaterialContent");
  }, [enableSubFieldState, isDigitalVersion, resetSubFieldState]);

  const handleFieldChange = (key: string, value: unknown) => {
    let newValue: GameDistributionFormValue = {
      ...((field.value || {}) as GameDistributionFormValue),
      [key]: value,
    };

    if (key === "addDigitalVersion" && value === "No") {
      newValue = clearFields(newValue, ["gamePlatform", "gameMaterialContent"]);
    }

    if (key === "ageRatingPermit") {
      const selectedPermit = permitRows.find(
        (p) => String(p.value) === String(value ?? ""),
      );
      if (selectedPermit) {
        newValue.title = selectedPermit.title;
        newValue.type = selectedPermit.type;
        newValue.language = selectedPermit.language;
        newValue.source = selectedPermit.source;
        newValue.copyrightsType = selectedPermit.copyrightsType;
        newValue.copyrightsValidityPeriod = selectedPermit.copyrightsValidityPeriod;
        newValue.economyCertificate = selectedPermit.economyCertificate;
      } else {
        newValue = clearFields(newValue, [
          "title",
          "type",
          "language",
          "source",
          "copyrightsType",
          "copyrightsValidityPeriod",
          "economyCertificate",
        ]);
      }
    }

    field.setValue(newValue);
  };

  const renderLabel = (label: string, required: boolean = true, tooltip?: string) => (
    <div className="game-form-label">
      <span>
        {label}
        {required && <span className="game-form-required">*</span>}
      </span>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="game-form-tooltip" />
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
    visible: ValidationVisibility = true
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (shouldValidateField(required, visible) && !value) {
            return t("GameDistributionForm.validation.required", { label });
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Select
          disabled={props.disabled || disabled}
          placeholder={placeholder || label}
          value={current[name]}
          onChange={(value) => handleFieldChange(name, value)}
          showSearch
          optionFilterProp="children"
          className={disabled ? "game-form-readonly" : ""}
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

  const renderMultiSelect = (
    name: string,
    label: string,
    options: OptionType[],
    required: boolean = true,
    placeholder?: string,
    visible: ValidationVisibility = true
  ) => {
    const selectedValues = Array.isArray(current[name]) ? current[name] : [];
    const allSelected =
      options.length > 0 &&
      options.every((option) => selectedValues.includes(option.value));
    const hasSelectedValues = options.some((option) =>
      selectedValues.includes(option.value),
    );
    const handleSelectAll = (checked: boolean) => {
      if (props.disabled || options.length === 0) return;
      handleFieldChange(name, checked ? options.map((option) => option.value) : []);
    };

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value: unknown) => {
          if (shouldValidateField(required, visible) && (!Array.isArray(value) || value.length === 0))
            return t("GameDistributionForm.validation.required", { label });
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Select
          mode="multiple"
          disabled={props.disabled}
          className="game-distribution-multi-select"
          dropdownClassName="game-distribution-multi-select-dropdown"
          placeholder={
            placeholder ||
            t("GameDistributionForm.placeholder.searchSelect", { label })
          }
          value={current[name]}
          onChange={(value) => handleFieldChange(name, value)}
          showSearch
          optionFilterProp="title"
          dropdownRender={(menu) => (
            <div>
              <div className="game-distribution-multi-select-all">
                <Checkbox
                  className={
                    hasSelectedValues && !allSelected
                      ? "game-distribution-multi-select-all-checkbox has-selection"
                      : "game-distribution-multi-select-all-checkbox"
                  }
                  checked={allSelected}
                  disabled={props.disabled || options.length === 0}
                  onChange={(event) => handleSelectAll(event.target.checked)}
                >
                  {t("LanguageSelectMulti.selectAll")}
                </Checkbox>
              </div>
              <div>{menu}</div>
            </div>
          )}
        >
          {options.map((o) => (
            <Option
              key={o.value}
              value={o.value}
              title={o.label}
              label={
                <div className="game-distribution-multi-selection-item">
                  <Checkbox checked />
                  <span>{o.label}</span>
                </div>
              }
            >
              <div className="game-distribution-multi-option">
                <Checkbox checked={selectedValues.includes(o.value)} />
                <span>{o.label}</span>
              </div>
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
    displayValue?: string,
    visible: ValidationVisibility = true
  ) => {
    const isInputDisabled = props.disabled || disabled;
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (shouldValidateField(required, visible) && !value) {
            return t("GameDistributionForm.validation.required", { label });
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
              : getInputValue(current[name])
          }
          maxLength={maxLength}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          className={disabled ? "game-form-readonly" : ""}
        />
      </Field>
    );
  };

  const renderRadio = (
    name: string,
    label: string,
    options: { label: string; value: string }[],
    required: boolean = true,
    visible: ValidationVisibility = true
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (shouldValidateField(required, visible) && !value) {
            return t("GameDistributionForm.validation.required", { label });
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        <Radio.Group
          disabled={props.disabled}
          value={current[name]}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          className="game-form-radio"
        >
          {options.map((o) => (
            <Radio key={o.value} value={o.value}>
              {o.label}
            </Radio>
          ))}
        </Radio.Group>
      </Field>
    );
  };

  const renderDateRangePicker = (
    name: string,
    label: string,
    required: boolean = true,
    visible: ValidationVisibility = true
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value: unknown) => {
          if (shouldValidateField(required, visible) && (!Array.isArray(value) || value.length !== 2))
            return t("GameDistributionForm.validation.required", { label });
          if (Array.isArray(value) && value.length === 2) {
            const [start, end] = value;
            if (moment(start).isBefore(moment(), "day")) {
              return t("GameDistributionForm.validation.startTodayOrLater");
            }
            if (moment(end).isSameOrBefore(moment(start), "day")) {
              return t("GameDistributionForm.validation.endAfterStart");
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
            t("GameDistributionForm.placeholder.startDate"),
            t("GameDistributionForm.placeholder.endDate"),
          ]}
          value={getStoredRangeValue(current[name])}
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
          disabledDate={(currentDate) => currentDate && currentDate < moment().startOf("day")}
        />
      </Field>
    );
  };

  const renderUpload = (
    name: string,
    label: string,
    required: boolean = true,
    tooltip?: string,
    visible: ValidationVisibility = true
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (shouldValidateField(required, visible) && !value) {
            return t("GameDistributionForm.validation.required", { label });
          }
          return "";
        }}
      >
        {renderLabel(label, required, tooltip)}
        <DocumentViewer
          hasDelete={true}
          disabled={props.disabled}
          value={getUploadValue(current[name])}
          onChange={(value) => handleFieldChange(name, value)}
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("GameDistributionForm.uploadTip.common"),
            accept: ".pdf,.jpg,.jpeg,.png",
          }}
        />
      </Field>
    );
  };

  const renderLanguageSelect = (
    name: string,
    label: string,
    required: boolean = true,
    disabled: boolean = false,
    visible: ValidationVisibility = true
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (shouldValidateField(required, visible) && !value) {
            return t("GameDistributionForm.validation.required", { label });
          }
          return "";
        }}
      >
        {renderLabel(label, required)}
        <LanguageSelectComponent
          className={`game-form-language ${disabled ? "game-form-readonly" : ""}`}
          disabled={props.disabled || disabled}
          multiple={true}
          placeholder={label}
          value={
            current[name]
              ? typeof current[name] === "string"
                ? current[name]
                    .split(",")
                    .map((v: string) => Number(v.trim()) || v.trim())
                : current[name]
              : undefined
          }
          onChange={(value: unknown) => handleFieldChange(name, value)}
        />
      </Field>
    );
  };

  return (
    <div className="game-distribution-form-container" {...props}>
      <AntdCard
        title={
          <span data-content-editable="x-component-props.title">
            {t("GameDistributionForm.title")}
          </span>
        }
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            {renderSelect(
              "ageRatingPermit",
              t("GameDistributionForm.label.ageRatingPermit"),
              permitOptions,
              true,
              false,
              t("GameDistributionForm.placeholder.ageRatingPermit")
            )}
          </Col>
          <Col xs={24} md={12}>
            {renderRadio(
              "addDigitalVersion",
              t("GameDistributionForm.label.addDigitalVersion"),
              [
                { label: t("GameDistributionForm.common.yes"), value: "Yes" },
                { label: t("GameDistributionForm.common.no"), value: "No" },
              ],
              true
            )}
          </Col>

          {isDigitalVersion && (
            <Col xs={24} md={12}>
              {renderMultiSelect(
                "gamePlatform",
                t("GameDistributionForm.label.gamePlatform"),
                gamePlatformOptions,
                true,
                t("GameDistributionForm.placeholder.gamePlatform"),
                isDigitalFieldVisible
              )}
            </Col>
          )}

          <Col xs={24} md={12}>
            {renderTextInput(
              "title",
              t("GameDistributionForm.label.title"),
              true,
              true,
              200,
              t("GameDistributionForm.placeholder.title"),
              getPermitReadonlyDisplay("title", selectedPermit, current.title),
              hasPermitValue
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderTextInput(
              "type",
              t("GameDistributionForm.label.type"),
              true,
              true,
              undefined,
              t("GameDistributionForm.placeholder.type"),
              getPermitReadonlyDisplay("type", selectedPermit, current.type),
              hasPermitValue
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderLanguageSelect(
              "language",
              t("GameDistributionForm.label.languages"),
              true,
              true,
              hasPermitValue
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderTextInput(
              "source",
              t("GameDistributionForm.label.source"),
              true,
              true,
              undefined,
              t("GameDistributionForm.placeholder.source"),
              getPermitReadonlyDisplay("source", selectedPermit, current.source),
              hasPermitValue
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderTextInput(
              "copyrightsType",
              t("GameDistributionForm.label.copyrightsType"),
              true,
              true,
              undefined,
              t("GameDistributionForm.placeholder.copyrightsType"),
              getPermitReadonlyDisplay(
                "copyrightsType",
                selectedPermit,
                current.copyrightsType,
              ),
              hasPermitValue
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderDateRangePicker(
              "copyrightsValidityPeriod",
              t("GameDistributionForm.label.copyrightsValidityPeriod"),
              true
            )}
          </Col>

          <Col xs={24} md={12}>
            {renderUpload(
              "economyCertificate",
              t("GameDistributionForm.label.economyCertificate"),
              true,
              t("GameDistributionForm.tooltip.economyCertificate")
            )}
          </Col>

          {isDigitalVersion && (
            <Col xs={24} md={12}>
              {renderUpload(
                "gameMaterialContent",
                t("GameDistributionForm.label.gameMaterialContent"),
                true,
                t("GameDistributionForm.tooltip.gameMaterialContent"),
                isDigitalFieldVisible
              )}
            </Col>
          )}
        </Row>
      </AntdCard>
    </div>
  );
});

GameDistributionFormField.displayName = "GameDistributionFormField";

export default GameDistributionFormField;
