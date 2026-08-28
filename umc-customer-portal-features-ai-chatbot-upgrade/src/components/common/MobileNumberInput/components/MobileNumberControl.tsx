import React, { useRef } from "react";
import { Input } from "antd";
import { PHONE_NUMBER_MAX_LENGTH } from "../constants";
import type { MobileNumberValue } from "../types";
import { normalizeEditedMobileLocalNumber } from "../utils";
import CountryDialCodePicker from "./CountryDialCodePicker";
import "../styles.less";

interface MobileNumberControlProps {
  value: MobileNumberValue;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  disabled?: boolean;
  hasError?: boolean;
  onChange: (
    value: MobileNumberValue,
    changedField: keyof MobileNumberValue,
  ) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

const MobileNumberControl: React.FC<MobileNumberControlProps> = ({
  value,
  placeholder,
  searchPlaceholder,
  emptyText,
  getPopupContainer,
  disabled = false,
  hasError = false,
  onChange,
  onBlur,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const handleCountryCodeChange = (countryCode: string) => {
    onChange({
      countryCode,
      phoneNumber: value.phoneNumber,
    }, "countryCode");
  };

  const handlePhoneNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onChange({
      countryCode: value.countryCode,
      phoneNumber: event.target.value.replace(/\s+/g, ""),
    }, "phoneNumber");
  };

  const handlePhoneNumberBlur = (
    event: React.FocusEvent<HTMLInputElement>,
  ) => {
    const phoneNumber = normalizeEditedMobileLocalNumber(
      value.countryCode,
      value.phoneNumber,
    );

    if (phoneNumber !== value.phoneNumber) {
      onChange({
        countryCode: value.countryCode,
        phoneNumber,
      }, "phoneNumber");
    }

    // Focus moving into the country-code picker (or its dropdown) is not a real
    // blur of the field, so it must not fire an onBlur validateTrigger.
    const nextFocusTarget = event.relatedTarget as Node | null;
    if (
      nextFocusTarget &&
      (rootRef.current?.contains(nextFocusTarget) ||
        (nextFocusTarget instanceof Element &&
          nextFocusTarget.closest(".mobile-number-input__country-dropdown")))
    ) {
      return;
    }

    // Forwarded last so an AntD Form.Item onBlur validateTrigger validates the
    // normalized value that the onChange above already wrote to the store.
    onBlur?.(event);
  };

  return (
    <div
    ref={rootRef}
    className={`mobile-number-input${
      hasError ? " mobile-number-input--error" : ""
    }${disabled ? " mobile-number-input--disabled" : ""}`}
    >
      <Input
        addonBefore={
          <CountryDialCodePicker
            value={value.countryCode}
            disabled={disabled}
            onChange={handleCountryCodeChange}
            hasError={hasError}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
            getPopupContainer={getPopupContainer}
          />
        }
        placeholder={placeholder}
        value={value.phoneNumber.replace(/\s+/g, "")}
        disabled={disabled}
        maxLength={PHONE_NUMBER_MAX_LENGTH}
        status={hasError ? "error" : undefined}
        onChange={handlePhoneNumberChange}
        onBlur={handlePhoneNumberBlur}
        className="mobile-number-input__control"
      />
    </div>
  );
};

export default MobileNumberControl;
