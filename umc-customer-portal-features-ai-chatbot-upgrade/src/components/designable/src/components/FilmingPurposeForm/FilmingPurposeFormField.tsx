import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Checkbox, Select, Row, Col, DatePicker, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import selectedTexts from "../../../../../utils/showTitle";

import moment from "moment";
import {
  getLookupData,
  getPrintingPermitByProfileId,
} from "@/services/services";
import { useUserStore } from "@/store/user";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import {
  exceedsDateRangeDays,
  getDisabledDateInputValue,
  isDateAfterMonthsFromToday,
  mergeDisabledDateWithRestriction,
  type RestrictionSetterValue,
} from "@/components/designable/src/utils/dateRestriction";
import "./index.less";
const { Option } = Select;

const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const AERIAL_SERVICE_CODE = "14";
const MAXIMUM_START_DATE_MONTHS = 6;
const MAXIMUM_AERIAL_DURATION_MONTHS = 3;
const MAXIMUM_FILMING_DURATION_DAYS = 90;
const MINIMUM_FILMING_DURATION_DAYS = 1;

const clamp = (s: string, max: number) =>
  s.length > max ? s.slice(0, max) : s;

export type FilmingPurposeFormValue = {
  purposeOfPhotography?: string[];
  photographyStartingDate?: string;
  photographyEndingDate?: string;
  textPermit?: string;
  [key: string]: unknown;
};

type PurposePhotographyOption = {
  label: string;
  value: string;
  code: string;
  nameEn: string;
  nameAr?: string;
};

const TEXT_PERMIT_REQUIRED_PURPOSE_IDS = new Set(["1", "4", "5"]);
const TEXT_PERMIT_SERVICE_CODES = new Set(["7", "14", "20"]);

const resolvePrintingPermitPublicationTypeId = (
  serviceCode?: string | number
): number | null => {
  const normalizedServiceCode = String(serviceCode ?? "").trim();

  if (TEXT_PERMIT_SERVICE_CODES.has(normalizedServiceCode)) {
    return 3;
  }

  if (normalizedServiceCode === "203") {
    return 1;
  }

  return null;
};

const normalizePurposeValues = (purpose?: unknown): string[] => {
  if (Array.isArray(purpose)) {
    return purpose
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  const single = String(purpose ?? "").trim();
  return single ? [single] : [];
};

export function needsTextPermit(purpose?: unknown): boolean {
  return normalizePurposeValues(purpose).some((value) =>
    TEXT_PERMIT_REQUIRED_PURPOSE_IDS.has(value)
  );
}

export function getTextPermitServiceType(purpose?: unknown): string[] {
  return normalizePurposeValues(purpose).filter((value) =>
    TEXT_PERMIT_REQUIRED_PURPOSE_IDS.has(value)
  );
}

function getFilmingPurposeValueFromCtx(ctx: any): FilmingPurposeFormValue {
  const form = ctx?.form;
  const leaf = ctx?.field;
  if (!leaf) return {};
  let f: any = leaf.parent;
  let depth = 0;
  while (f && depth++ < 12) {
    let v = f.value;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      if ("purposeOfPhotography" in o || "photographyStartingDate" in o) {
        return v as FilmingPurposeFormValue;
      }
    }
    if (form && f.address != null) {
      v = form.getValuesIn(f.address);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        if ("purposeOfPhotography" in o || "photographyStartingDate" in o) {
          return v as FilmingPurposeFormValue;
        }
      }
    }
    f = f.parent;
  }
  return {};
}

function parseDdMmYyyy(s: string) {
  const m = moment(s, "DD/MM/YYYY", true);
  return m.isValid() ? m : null;
}

function resolveMaximumDurationDays(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const duration = Number(value);

  if (!Number.isFinite(duration)) {
    return undefined;
  }

  return Math.min(
    MAXIMUM_FILMING_DURATION_DAYS,
    Math.max(MINIMUM_FILMING_DURATION_DAYS, Math.floor(duration)),
  );
}
function exceedsDateRangeMonths(
  start: moment.Moment,
  end: moment.Moment,
  maximumMonths: number,
): boolean {
  return end.isAfter(start.clone().add(maximumMonths, "months"), "day");
}

export const FilmingPurposeFormField: React.FC<any> = observer((props) => {
  const {
    duration: durationProp,
    restriction: restrictionProp,
    ...containerProps
  } = props;
  const restriction = restrictionProp as RestrictionSetterValue | undefined;
  const { t, i18n } = useTranslation();
  const field = useField<any>();
  if (!field) {
    return null;
  }

  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const currentLanguage = i18n.language ?? "";
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const current: FilmingPurposeFormValue = field.value || {};
  const isAerialService =
    String(props.serviceCode ?? "").trim() === AERIAL_SERVICE_CODE;
  const effectiveRestriction = isAerialService ? undefined : restriction;
  const maximumDurationDays =
    isAerialService
      ? undefined
      : resolveMaximumDurationDays(durationProp);
  const restrictionStartDateDisabled = mergeDisabledDateWithRestriction(
    effectiveRestriction,
    (date) =>
      isAerialService
        ? !date.isAfter(moment(), "day")
        : date.isBefore(moment(), "day"),
    {
      allowWithinSixMonthsFromToday: false,
      replaceDisabledDateWhenRestricted: true,
    },
  );
  const startDateDisabled = (date: moment.Moment) => {
    if (restrictionStartDateDisabled?.(date)) return true;
    return Boolean(
      effectiveRestriction?.withinSixMonthsFromToday &&
        isDateAfterMonthsFromToday(date, MAXIMUM_START_DATE_MONTHS),
    );
  };
  const startDateInputValueRef = useRef("");
  const [searchPurpose, setSearchPurpose] = useState("");
  const [searchPermit, setSearchPermit] = useState("");
  const [PurposePhotography, setPurposePhotography] = useState<
    PurposePhotographyOption[]
  >([]);
  const [permitOptions, setPermitOptions] = useState<
    {
      label: string;
      value: string;
      ApplicationId: string;
      ApplicationNumber: string;
    }[]
  >([]);
  const [permitLoading, setPermitLoading] = useState(false);

  const showTextPermit = needsTextPermit(current.purposeOfPhotography);
  const purposeOptions = React.useMemo(
    () =>
      PurposePhotography.map((item) => ({
        ...item,
        label:
          preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) ||
          item.nameEn ||
          item.code,
      })),
    [PurposePhotography, currentLanguage, isAr],
  );

  useEffect(() => {
    getLookupData("PhotographyPurposes").then((opts: any) => {
      const rows = Array.isArray(opts?.data) ? opts.data : [];
      setPurposePhotography(
        rows.map((item: any) => ({
          label: String(item.NameEn || item.NameAr || item.Id || ""),
          value: String(item.Id ?? ""),
          code: String(item.Id ?? ""),
          nameEn: String(item.NameEn || item.NameAr || item.Id || ""),
          nameAr: item.NameAr,
        }))
      );
    });
  }, []);
  useEffect(() => {
    const v = (field.value || {}) as FilmingPurposeFormValue;
    if (!needsTextPermit(v.purposeOfPhotography) && v.textPermit) {
      field.setValue({ ...v, textPermit: undefined });
    }
  }, [field, current.purposeOfPhotography, current.textPermit]);
  useEffect(() => {
    const photographyPurpose = normalizePurposeValues(current.purposeOfPhotography);
    const profileId = String(currentProfileId || "").trim();
    const publicationTypeId = resolvePrintingPermitPublicationTypeId(
      props.serviceCode
    );

    if (photographyPurpose.length === 0 || !profileId || publicationTypeId === null) {
      setPermitOptions([]);
      return;
    }

    let cancelled = false;
    setPermitLoading(true);
    getPrintingPermitByProfileId(
      profileId,
      publicationTypeId,
      photographyPurpose,
    )
      .then((opts: any) => {
        if (!cancelled) {
          const rows = Array.isArray(opts?.data) ? opts.data : [];
          setPermitOptions(
            rows.map((item: any) => ({
              label: String(
                item.ApplicationNumber ||
                  item.applicationNumber ||
                  item.PermitNumber ||
                  item.permitNumber ||
                  item.NameEn ||
                  item.nameEn ||
                  item.Id ||
                  item.id ||
                  ""
              ),
              value: String(
                item.ApplicationNumber ||
                  item.applicationNumber ||
                  item.PermitNumber ||
                  item.permitNumber ||
                  item.Id ||
                  item.id ||
                  ""
              ),
              ApplicationId: String(
                item.ApplicationId || item.applicationId || item.Id || item.id || ""
              ),
              ApplicationNumber: String(
                item.ApplicationNumber ||
                  item.applicationNumber ||
                  item.PermitNumber ||
                  item.permitNumber ||
                  item.NameEn ||
                  item.nameEn ||
                  ""
              ),
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPermitOptions([]);
      })
      .finally(() => {
        if (!cancelled) setPermitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current.purposeOfPhotography, currentProfileId, props.serviceCode]);

  const handleFieldChange = (key: string, value: unknown) => {
    const base = (field.value || {}) as FilmingPurposeFormValue;
    const newValue: FilmingPurposeFormValue = { ...base, [key]: value };
    const fieldsToValidate = new Set([key]);

    if (key === "purposeOfPhotography") {
      if (
        !needsTextPermit(value) ||
        base.purposeOfPhotography !== value
      ) {
        newValue.textPermit = undefined;
        fieldsToValidate.add("textPermit");
      }
    }

    if (key === "photographyStartingDate") {
      const end = base.photographyEndingDate;
      const startStr = value as string | undefined;
      if (startStr && end) {
        const mStart = parseDdMmYyyy(startStr);
        const mEnd = parseDdMmYyyy(end);
        if (
          mStart &&
          mEnd &&
          (mEnd.isBefore(mStart, "day") ||
            (isAerialService &&
              exceedsDateRangeMonths(
                mStart,
                mEnd,
                MAXIMUM_AERIAL_DURATION_MONTHS,
              )) ||
            (maximumDurationDays !== undefined &&
              exceedsDateRangeDays(
                mStart,
                mEnd,
                maximumDurationDays,
              )))
        ) {
          newValue.photographyEndingDate = undefined;
          fieldsToValidate.add("photographyEndingDate");
        }
      }
    }

    field.setValue(newValue);
    fieldsToValidate.forEach((name) => {
      const validateField = () => {
        const targetField = field.query(`${field.address}.${name}`).take();
        if (!targetField) return false;
        void Promise.resolve(targetField.validate?.("onInput")).catch(
          () => undefined,
        );
        return true;
      };

      if (!validateField()) {
        window.setTimeout(validateField, 0);
      }
    });
  };

  const renderLabel = (
    label: string,
    required: boolean = true,
    tooltip?: string,
  ) => (
    <div className="fp-form-label">
      {label}
      {required && <span className="fp-required">*</span>}
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="fp-form-label__tooltip" />
        </Tooltip>
      )}
    </div>
  );
  const getStartDateRestrictionTooltip = () => {
    if (
      effectiveRestriction?.tenDaysFromToday &&
      effectiveRestriction?.withinSixMonthsFromToday
    ) {
      return t("FilmingPurposeForm.tooltip.startWithinAllowedRange");
    }
    if (effectiveRestriction?.tenDaysFromToday) {
      return t("FilmingPurposeForm.tooltip.startMoreThanTenDays");
    }
    if (effectiveRestriction?.withinSixMonthsFromToday) {
      return t("FilmingPurposeForm.tooltip.startWithinSixMonths");
    }

    return undefined;
  };
  const selectedPurposeValues = normalizePurposeValues(current.purposeOfPhotography);
  const allPurposeSelected =
    purposeOptions.length > 0 &&
    purposeOptions.every((option) => selectedPurposeValues.includes(option.code));
  const hasSelectedPurposeValues = purposeOptions.some((option) =>
    selectedPurposeValues.includes(option.code),
  );
  const handleSelectAllPurposes = (checked: boolean) => {
    if (props.disabled || purposeOptions.length === 0) return;
    handleFieldChange(
      "purposeOfPhotography",
      checked ? purposeOptions.map((option) => option.code) : [],
    );
  };

  return (
    <div className="filming-purpose-form-container" {...containerProps}>
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Field
            name="purposeOfPhotography"
            decorator={[FormItem]}
            validator={(value) => {
              if (normalizePurposeValues(value).length === 0)
                return t("FilmingPurposeForm.validation.required");
              return "";
            }}
          >
            {renderLabel(t("FilmingPurposeForm.label.purposeOfPhotography"), true)}
            <span
              style={{
                display: "inline-block",
                width: "100%",
                verticalAlign: "top",
              }}
              title={selectedTexts(
                current.purposeOfPhotography,
                purposeOptions,
                "label",
                "code",
              )}
              className="Formily-multi-select"
            >
              <Select
                showArrow
                showSearch
                mode="multiple"
                maxTagCount={2}
                allowClear={true}
                disabled={props.disabled}
                className="filming-purpose-multi-select"
                dropdownClassName="filming-purpose-multi-select-dropdown"
                placeholder={t("FilmingPurposeForm.placeholder.purpose")}
                value={current.purposeOfPhotography}
                onChange={(v) => handleFieldChange("purposeOfPhotography", v)}
                optionFilterProp="title"
                filterOption={(input, opt) =>
                  String(opt?.title ?? opt?.value ?? "")
                    .toLowerCase()
                    .includes(String(input).toLowerCase())
                }
                onSearch={(v) => setSearchPurpose(clamp(v, 50))}
                searchValue={searchPurpose}
                onSelect={() => setSearchPurpose("")}
                onDropdownVisibleChange={(open: boolean) => {
                  if (!open) setSearchPurpose("");
                }}
                notFoundContent={null}
                dropdownRender={(menu) => (
                  <div>
                    <div className="filming-purpose-multi-select-all">
                      <Checkbox
                        className={
                          hasSelectedPurposeValues && !allPurposeSelected
                            ? "filming-purpose-multi-select-all-checkbox has-selection"
                            : "filming-purpose-multi-select-all-checkbox"
                        }
                        checked={allPurposeSelected}
                        disabled={props.disabled || purposeOptions.length === 0}
                        onChange={(event) =>
                          handleSelectAllPurposes(event.target.checked)
                        }
                      >
                        {t("LanguageSelectMulti.selectAll")}
                      </Checkbox>
                    </div>
                    <div>{menu}</div>
                  </div>
                )}
              >
                {purposeOptions.map((p) => (
                  <Option
                    key={p.code}
                    value={p.code}
                    title={p.label}
                    label={
                      <div className="filming-purpose-multi-selection-item">
                        <Checkbox checked />
                        <span>{p.label}</span>
                      </div>
                    }
                  >
                    <div className="filming-purpose-multi-option">
                      <Checkbox checked={selectedPurposeValues.includes(p.code)} />
                      <span>{p.label}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </span>
          </Field>
        </Col>

        <Col xs={24} md={12}>
          <Field
            name="photographyStartingDate"
            decorator={[FormItem]}
            validator={(value, _rule, ctx) => {
              const pkg = getFilmingPurposeValueFromCtx(ctx);
              const v = (value ?? pkg.photographyStartingDate) as
                | string
                | undefined;
              if (!v || String(v).trim() === "")
                return t("FilmingPurposeForm.validation.required");
              const s = String(v).trim();
              if (s.length !== 10 || !DATE_REGEX.test(s))
                return t("FilmingPurposeForm.validation.dateInvalid");
              const m = parseDdMmYyyy(s);
              if (!m) return t("FilmingPurposeForm.validation.dateInvalid");
              if (startDateDisabled?.(m)) {
                if (
                  effectiveRestriction?.withinSixMonthsFromToday &&
                  isDateAfterMonthsFromToday(
                    m,
                    MAXIMUM_START_DATE_MONTHS,
                  )
                ) {
                  return t(
                    "FilmingPurposeForm.validation.startWithinSixMonths",
                  );
                }
                if (isAerialService) {
                  return t("FilmingPurposeForm.validation.startAfterToday");
                }
                if (effectiveRestriction?.tenDaysFromToday) {
                  return t(
                    "FilmingPurposeForm.validation.startMoreThanTenDays",
                  );
                }
                if (effectiveRestriction?.beforeToday) {
                  return t("FilmingPurposeForm.validation.startBeforeToday");
                }
                if (effectiveRestriction?.afterToday) {
                  return t("FilmingPurposeForm.validation.startAfterToday");
                }
                return t("FilmingPurposeForm.validation.startPast");
              }
              return "";
            }}
          >
            {renderLabel(
              t("FilmingPurposeForm.label.photographyStartingDate"),
              true,
              getStartDateRestrictionTooltip(),
            )}
            <DatePicker
              disabled={props.disabled}
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder={t("FilmingPurposeForm.placeholder.date")}
              value={
                current.photographyStartingDate
                  ? moment(current.photographyStartingDate, "DD/MM/YYYY", true)
                  : null
              }
              onChange={(d) =>
                handleFieldChange(
                  "photographyStartingDate",
                  d ? d.format("DD/MM/YYYY") : undefined,
                )
              }
              inputRender={(inputProps) => (
                <input
                  {...inputProps}
                  onChange={(event) => {
                    startDateInputValueRef.current = event.currentTarget.value;
                    inputProps.onChange?.(event);
                  }}
                />
              )}
              onBlur={() => {
                const disabledInputValue = getDisabledDateInputValue(
                  startDateInputValueRef.current,
                  startDateDisabled,
                );
                startDateInputValueRef.current = "";
                if (disabledInputValue) {
                  handleFieldChange(
                    "photographyStartingDate",
                    disabledInputValue,
                  );
                }
              }}
              disabledDate={startDateDisabled}
            />
          </Field>
        </Col>

        <Col xs={24} md={12}>
          <Field
            name="photographyEndingDate"
            decorator={[FormItem]}
            validator={(value, _rule, ctx) => {
              const pkg = getFilmingPurposeValueFromCtx(ctx);
              const v = (value ?? pkg.photographyEndingDate) as
                | string
                | undefined;
              if (!v || String(v).trim() === "")
                return t("FilmingPurposeForm.validation.required");
              const s = String(v).trim();
              if (s.length !== 10 || !DATE_REGEX.test(s))
                return t("FilmingPurposeForm.validation.dateInvalid");
              const mEnd = parseDdMmYyyy(s);
              if (!mEnd) return t("FilmingPurposeForm.validation.dateInvalid");
              const startStr = pkg.photographyStartingDate;
              if (startStr) {
                const mStart = parseDdMmYyyy(String(startStr).trim());
                if (mStart && mEnd.isBefore(mStart, "day"))
                  return t("FilmingPurposeForm.validation.endBeforeStart");
                if (
                  mStart &&
                  isAerialService &&
                  exceedsDateRangeMonths(
                    mStart,
                    mEnd,
                    MAXIMUM_AERIAL_DURATION_MONTHS,
                  )
                ) {
                  return t(
                    "FilmingPurposeForm.validation.durationWithinMonths",
                    { count: MAXIMUM_AERIAL_DURATION_MONTHS },
                  );
                }
                if (
                  mStart &&
                  maximumDurationDays !== undefined &&
                  exceedsDateRangeDays(
                    mStart,
                    mEnd,
                    maximumDurationDays,
                  )
                ) {
                  return t(
                    "FilmingPurposeForm.validation.durationWithinDays",
                    { count: maximumDurationDays },
                  );
                }
              }
              return "";
            }}
          >
            {renderLabel(t("FilmingPurposeForm.label.photographyEndingDate"), true)}
            <DatePicker
              disabled={props.disabled}
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder={t("FilmingPurposeForm.placeholder.date")}
              value={
                current.photographyEndingDate
                  ? moment(current.photographyEndingDate, "DD/MM/YYYY", true)
                  : null
              }
              onChange={(d) =>
                handleFieldChange(
                  "photographyEndingDate",
                  d ? d.format("DD/MM/YYYY") : undefined,
                )
              }
              disabledDate={(date) => {
                if (!date) return false;
                if (date < moment().startOf("day")) return true;
                const startStr = current.photographyStartingDate;
                if (startStr) {
                  const mStart = parseDdMmYyyy(startStr);
                  if (mStart && date < mStart.clone().startOf("day"))
                    return true;
                  if (
                    mStart &&
                    isAerialService &&
                    date.isAfter(
                      mStart.clone().add(MAXIMUM_AERIAL_DURATION_MONTHS, "months"),
                      "day",
                    )
                  ) {
                    return true;
                  }
                  if (
                    mStart &&
                    maximumDurationDays !== undefined &&
                    date.isAfter(
                      mStart.clone().add(maximumDurationDays, "days"),
                      "day",
                    )
                  ) {
                    return true;
                  }
                }
                return false;
              }}
            />
          </Field>
        </Col>

        {showTextPermit && (
          <Col span={12} className="filming-purpose-text-permit-wrap">
            <Field
              name="textPermit"
              decorator={[FormItem]}
              validator={(value, _rule, ctx) => {
                const pkg = getFilmingPurposeValueFromCtx(ctx);
                if (!needsTextPermit(pkg.purposeOfPhotography)) return "";
                const v = value as string | undefined;
                if (!v || String(v).trim() === "")
                  return t("FilmingPurposeForm.validation.required");
                return "";
              }}
            >
              {renderLabel(t("FilmingPurposeForm.label.textPermit"), true)}
              <Select
                showSearch
                loading={permitLoading}
                disabled={props.disabled}
                placeholder={t("FilmingPurposeForm.placeholder.textPermit")}
                value={current.textPermit}
                onChange={(v) => handleFieldChange("textPermit", v)}
                optionFilterProp="label"
                filterOption={(input, opt) =>
                  String(opt?.label ?? opt?.value ?? "")
                    .toLowerCase()
                    .includes(String(input).toLowerCase())
                }
                onSearch={(v) => setSearchPermit(clamp(v, 50))}
                searchValue={searchPermit}
                onSelect={() => setSearchPermit("")}
                onDropdownVisibleChange={(open: boolean) => {
                  if (!open) setSearchPermit("");
                }}
                notFoundContent={
                  <span>
                    {t("FilmingPurposeForm.empty.noPermits")}
                  </span>
                }
              >
                {permitOptions.map((o) => (
                  <Option
                    key={o.ApplicationNumber}
                    value={o.ApplicationNumber}
                    label={o.ApplicationNumber}
                  >
                    {o.ApplicationNumber}
                  </Option>
                ))}
              </Select>
            </Field>
          </Col>
        )}
      </Row>
      {/* Designable ObjectField passes droppable children; preset blocks usually omit type:object */}
      {props.children}
    </div>
  );
});

FilmingPurposeFormField.displayName = "FilmingPurposeFormField";

export default FilmingPurposeFormField;
