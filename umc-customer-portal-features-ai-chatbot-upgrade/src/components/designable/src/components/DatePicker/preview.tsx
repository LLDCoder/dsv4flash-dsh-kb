import React, { forwardRef, useMemo } from "react";
import { DatePicker as AntdDatePicker } from "antd";
import type {
  DatePickerProps as AntdDatePickerProps,
  RangePickerProps as AntdRangePickerProps,
} from "antd/lib/date-picker";
import { connect, mapReadPretty, useField, useForm } from "@formily/react";
import { PreviewText } from "@formily/antd";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";
import { toPickerMoment } from "@/utils/dateLocale";
import {
  mergeDisabledDateWithRestriction,
  type RestrictionSetterValue,
} from "@/components/designable/src/utils/dateRestriction";

type MomentLike = moment.Moment;
type DateArrayValue = Array<string | null | undefined>;
type DateValue = string | DateArrayValue | null | undefined;
type PickerRangeValue = [moment.Moment | null, moment.Moment | null];
type PickerDateValue = moment.Moment | PickerRangeValue | null;

export const DATE_PICKER_DISPLAY_FORMAT = "DD/MM/YYYY";
export const DATE_PICKER_VALUE_FORMAT = "YYYY-MM-DD";

function formatDisplayValue(
  value: DateValue,
  fromFormat: string,
  toFormat: string,
): DateValue {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item) return item;
      const parsed = moment(item, fromFormat, true);
      return parsed.isValid() ? parsed.format(toFormat) : item;
    });
  }
  if (!value) return value;
  const parsed = moment(value, fromFormat, true);
  return parsed.isValid() ? parsed.format(toFormat) : value;
}

function toPickerDateValue(
  value: DateValue | moment.Moment | PickerRangeValue,
  fromFormat: string,
): PickerDateValue {
  if (Array.isArray(value)) {
    return [
      toPickerMoment(value[0], fromFormat),
      toPickerMoment(value[1], fromFormat),
    ];
  }

  return toPickerMoment(value, fromFormat);
}

function toSubmitDateValue(
  value: PickerDateValue,
  toFormat: string,
): DateValue {
  if (Array.isArray(value)) {
    return value.map((item) => (item ? item.format(toFormat) : null));
  }

  return value ? value.format(toFormat) : null;
}

type NativeDatePickerProps = Omit<
  AntdDatePickerProps,
  "disabledDate" | "onChange" | "placeholder" | "value"
> & {
  disabledDate?: (current: MomentLike) => boolean;
  onChange?: (value: DateValue) => void;
  placeholder?: string | [string, string];
  value?: DateValue | moment.Moment | PickerRangeValue;
  [key: string]: unknown;
};

export type DatePickerWithRestrictionProps = NativeDatePickerProps & {
  restriction?: RestrictionSetterValue;
  valueFormat?: string;
  placeholderEn?: string;
  placeholderAr?: string;
  placeholderKey?: string;
  placeholderParams?: Record<string, unknown>;
  startPlaceholderEn?: string;
  startPlaceholderAr?: string;
  endPlaceholderEn?: string;
  endPlaceholderAr?: string;
};

function isNonEditablePattern(pattern?: string) {
  return (
    pattern === "disabled" ||
    pattern === "readOnly" ||
    pattern === "readPretty"
  );
}

const RestrictedDatePicker = forwardRef<unknown, DatePickerWithRestrictionProps>(
  (props, ref) => {
    const field = useField();
    const form = useForm();
    const { t, i18n } = useTranslation();
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const {
      restriction,
      disabledDate,
      onChange,
      valueFormat,
      placeholderEn,
      placeholderAr,
      placeholderKey,
      placeholderParams,
      ...rest
    } = props;
    const datePickerRest = { ...rest };
    delete datePickerRest.startPlaceholderEn;
    delete datePickerRest.startPlaceholderAr;
    delete datePickerRest.endPlaceholderEn;
    delete datePickerRest.endPlaceholderAr;
    const resolvedPlaceholder = resolveI18nPlaceholder({
      isAr,
      i18n,
      t,
      placeholder: datePickerRest.placeholder,
      placeholderEn,
      placeholderAr,
      placeholderKey,
      placeholderParams,
      defaultPlaceholder: t("formPlaceholders.common.ddmmyyyy"),
    });
    const displayFormat = rest.format ?? DATE_PICKER_DISPLAY_FORMAT;
    const submitFormat = valueFormat ?? DATE_PICKER_VALUE_FORMAT;
    const mergedDisabledDate = useMemo(
      () => mergeDisabledDateWithRestriction(restriction, disabledDate),
      [restriction, disabledDate],
    );
    const isDisabled =
      Boolean(datePickerRest.disabled) ||
      isNonEditablePattern(field?.pattern) ||
      isNonEditablePattern(form?.pattern);
    return (
      <AntdDatePicker
        ref={ref as React.Ref<unknown>}
        {...(datePickerRest as AntdDatePickerProps)}
        disabled={isDisabled}
        placeholder={resolvedPlaceholder}
        value={
          toPickerDateValue(datePickerRest.value as DateValue, submitFormat) as
            | moment.Moment
            | null
        }
        format={displayFormat}
        disabledDate={mergedDisabledDate}
        onChange={(value) => {
          onChange?.(toSubmitDateValue(value as PickerDateValue, submitFormat));
        }}
      />
    );
  },
);

const RestrictedRangePicker = forwardRef<unknown, DatePickerWithRestrictionProps>(
  (props, ref) => {
    const field = useField();
    const form = useForm();
    const { t, i18n } = useTranslation();
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const {
      restriction,
      disabledDate,
      onChange,
      valueFormat,
      placeholderEn,
      placeholderAr,
      placeholderKey,
      placeholderParams,
      startPlaceholderEn,
      startPlaceholderAr,
      endPlaceholderEn,
      endPlaceholderAr,
      ...rest
    } = props;
    const displayFormat = rest.format ?? DATE_PICKER_DISPLAY_FORMAT;
    const submitFormat = valueFormat ?? DATE_PICKER_VALUE_FORMAT;
    const sharedPlaceholder = resolveI18nPlaceholder({
      isAr,
      i18n,
      t,
      placeholder: rest.placeholder,
      placeholderEn,
      placeholderAr,
      placeholderKey,
      placeholderParams,
      defaultPlaceholder: t("formPlaceholders.common.ddmmyyyy"),
    });
    const startPlaceholder = preferLocalizedEnAr(
      isAr,
      startPlaceholderEn,
      startPlaceholderAr,
    );
    const endPlaceholder = preferLocalizedEnAr(
      isAr,
      endPlaceholderEn,
      endPlaceholderAr,
    );
    const normalizedPlaceholder =
      startPlaceholder || endPlaceholder
        ? [
            startPlaceholder || (Array.isArray(sharedPlaceholder) ? sharedPlaceholder[0] : sharedPlaceholder),
            endPlaceholder || (Array.isArray(sharedPlaceholder) ? sharedPlaceholder[1] : sharedPlaceholder),
          ]
        : typeof sharedPlaceholder === "string"
          ? [sharedPlaceholder, sharedPlaceholder]
          : sharedPlaceholder;
    const mergedDisabledDate = useMemo(
      () =>
        mergeDisabledDateWithRestriction(restriction, disabledDate, {
          allowTenDaysFromToday: false,
        }),
      [restriction, disabledDate],
    );
    const isDisabled =
      Boolean(rest.disabled) ||
      isNonEditablePattern(field?.pattern) ||
      isNonEditablePattern(form?.pattern);
    return (
      <AntdDatePicker.RangePicker
        ref={ref as React.Ref<unknown>}
        {...(rest as AntdRangePickerProps)}
        disabled={isDisabled}
        placeholder={normalizedPlaceholder}
        value={
          toPickerDateValue(
            rest.value as DateValue,
            submitFormat,
          ) as PickerRangeValue | null
        }
        format={displayFormat}
        disabledDate={mergedDisabledDate}
        onChange={(value) => {
          onChange?.(toSubmitDateValue(value as PickerDateValue, submitFormat));
        }}
      />
    );
  },
);

const ReadPrettyDatePicker = (props: DatePickerWithRestrictionProps) => (
  <PreviewText.Input
    value={formatDisplayValue(
      props.value as DateValue,
      props.valueFormat ?? DATE_PICKER_VALUE_FORMAT,
      props.format ?? DATE_PICKER_DISPLAY_FORMAT,
    )}
  />
);

const ConnectedDatePicker = connect(RestrictedDatePicker, mapReadPretty(ReadPrettyDatePicker));
const ConnectedRangePicker = connect(RestrictedRangePicker, mapReadPretty(ReadPrettyDatePicker));

export const DatePicker = Object.assign(ConnectedDatePicker, {
  RangePicker: ConnectedRangePicker,
});
