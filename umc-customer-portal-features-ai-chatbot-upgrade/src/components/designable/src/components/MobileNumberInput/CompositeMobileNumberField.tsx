import type { Field as FormilyField } from "@formily/core";
import { FormItem } from "@formily/antd";
import { Field, useForm } from "@formily/react";
import { useEffect, useRef, useState } from "react";
import {
  buildContactNumberDraft,
  createContactNumberSnapshot,
  resolveContactNumberValidationValue,
  StandaloneMobileNumberInput,
  toContactNumberDraftFields,
  validateMobileNumber,
  type ContactNumberChangedField,
} from "@/components/common/MobileNumberInput";
import { useResolvedMobileNumberDefaultCountryCode } from "./runtimeContext";

export interface CompositeMobileNumberFieldNames {
  fullNumber: string;
  countryCode: string;
  localNumber: string;
}

export interface CompositeMobileNumberFieldProps {
  fieldNames: CompositeMobileNumberFieldNames;
  fullNumber?: unknown;
  countryCode?: unknown;
  localNumber?: unknown;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  defaultCountryCode?: string;
  onChange: (patch: Record<string, string>) => void;
}

export const CompositeMobileNumberField = ({
  fieldNames,
  fullNumber,
  countryCode,
  localNumber,
  disabled = false,
  required = false,
  placeholder,
  searchPlaceholder,
  emptyText,
  defaultCountryCode,
  onChange,
}: CompositeMobileNumberFieldProps) => {
  const form = useForm();
  const resolvedDefaultCountryCode =
    useResolvedMobileNumberDefaultCountryCode(defaultCountryCode);
  const [draftCountryCode, setDraftCountryCode] = useState<string | null>(null);
  const validationFieldRef = useRef<FormilyField | null>(null);
  const validationSequenceRef = useRef(0);
  const validationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const latestValueRef = useRef({
    countryCode: "",
    phoneNumber: "",
  });
  const snapshot = createContactNumberSnapshot({
    countryCode,
    localNumber,
    fullNumber,
  });
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      validationSequenceRef.current += 1;
      validationFieldRef.current = null;
    };
  }, []);

  useEffect(() => {
    const subscription = form.subscribe(({ type }) => {
      if (type === "onFormReset") {
        setDraftCountryCode(null);
      }
    });
    return () => form.unsubscribe(subscription);
  }, [form]);

  useEffect(() => {
    if (snapshot.sourceMode === "empty") {
      if (snapshot.value.countryCode) {
        onChange(
          toContactNumberDraftFields(
            { fullNumber: "", countryCode: "", localNumber: "" },
            fieldNames,
          ),
        );
      }
      return;
    }

    if (snapshot.sourceMode !== "split") return;

    const effectiveCountryCode =
      snapshot.value.countryCode || resolvedDefaultCountryCode;
    const validation = validateMobileNumber({
      countryCode: effectiveCountryCode,
      phoneNumber: snapshot.value.phoneNumber,
    });
    if (!validation.isValid) return;

    const draft = buildContactNumberDraft({
      currentFullNumber: fullNumber,
      countryCode: effectiveCountryCode,
      localNumber: snapshot.value.phoneNumber,
      changedField: "phoneNumber",
      isValid: true,
    });
    const patch = toContactNumberDraftFields(draft, fieldNames);
    const currentValues: Record<string, string> = {
      [fieldNames.fullNumber]: String(fullNumber ?? ""),
      [fieldNames.countryCode]: String(countryCode ?? ""),
      [fieldNames.localNumber]: String(localNumber ?? ""),
    };
    const needsSync = Object.entries(patch).some(
      ([key, value]) => currentValues[key] !== value,
    );

    if (needsSync) {
      onChange(patch);
    }
  }, [
    countryCode,
    fieldNames,
    fieldNames.countryCode,
    fieldNames.fullNumber,
    fieldNames.localNumber,
    fullNumber,
    localNumber,
    onChange,
    resolvedDefaultCountryCode,
    snapshot.sourceMode,
    snapshot.value,
    snapshot.value.countryCode,
    snapshot.value.phoneNumber,
  ]);

  const displayValidationValue = resolveContactNumberValidationValue({
    countryCode: draftCountryCode ?? countryCode,
    localNumber,
    fullNumber,
    defaultCountryCode: resolvedDefaultCountryCode,
  });
  const displayValidationCountryCode =
    typeof displayValidationValue === "string"
      ? ""
      : displayValidationValue.countryCode;
  const displayCountryCode =
    draftCountryCode ||
    displayValidationCountryCode ||
    snapshot.value.countryCode ||
    resolvedDefaultCountryCode;
  const displayLocalNumber = snapshot.value.phoneNumber;
  latestValueRef.current =
    typeof displayValidationValue === "string"
      ? {
          countryCode: "",
          phoneNumber: displayValidationValue,
        }
      : displayValidationValue;
  useEffect(() => {
    if (snapshot.sourceMode !== "empty" && draftCountryCode !== null) {
      setDraftCountryCode(null);
    }
  }, [draftCountryCode, snapshot.sourceMode]);

  const update = (
    nextCountryCode: string,
    nextLocalNumber: string,
    changedField: ContactNumberChangedField,
  ) => {
    if (!nextLocalNumber) {
      setDraftCountryCode(nextCountryCode);
      latestValueRef.current = {
        countryCode: nextCountryCode,
        phoneNumber: "",
      };
      if (changedField === "countryCode") return;
    }

    const validation = validateMobileNumber({
      countryCode: nextCountryCode,
      phoneNumber: nextLocalNumber,
    });
    const draft = buildContactNumberDraft({
      currentFullNumber: fullNumber,
      countryCode: nextCountryCode,
      localNumber: nextLocalNumber,
      changedField,
      isValid: validation.isValid,
    });

    latestValueRef.current = {
      countryCode: nextCountryCode,
      phoneNumber: nextLocalNumber,
    };
    onChange(toContactNumberDraftFields(draft, fieldNames));

    const target = validationFieldRef.current;
    if (target) {
      const validationSequence = validationSequenceRef.current + 1;
      validationSequenceRef.current = validationSequence;
      validationQueueRef.current = validationQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (
            !mountedRef.current ||
            validationSequence !== validationSequenceRef.current
          ) {
            return;
          }
          await target.onInput(nextLocalNumber).catch(() => undefined);
          if (
            !mountedRef.current ||
            validationSequence !== validationSequenceRef.current
          ) {
            return;
          }
          target.setDecoratorProps({
            ...target.decoratorProps,
            feedbackStatus: validation.isValid ? undefined : "error",
            feedbackText: validation.isValid ? undefined : validation.message,
          });
        });
    }
  };

  return (
    <Field
      name={fieldNames.localNumber}
      decorator={[FormItem]}
      required={false}
      validateFirst
      validator={(value) => {
        const currentValue = latestValueRef.current;
        const phoneNumber = String(value || currentValue.phoneNumber || "");
        if (!required && !phoneNumber) {
          return "";
        }
        const validation = validateMobileNumber({
          countryCode: currentValue.countryCode,
          phoneNumber,
        });
        return validation.isValid ? "" : validation.message;
      }}
    >
      {(field: FormilyField) => {
        validationFieldRef.current = field;
        return (
          <StandaloneMobileNumberInput
            countryCode={displayCountryCode}
            phoneNumber={displayLocalNumber}
            defaultCountryCode={resolvedDefaultCountryCode}
            disabled={disabled}
            hasError={field.selfErrors.length > 0}
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
            onCountryCodeChange={(value) =>
              update(value, displayLocalNumber, "countryCode")
            }
            onPhoneNumberChange={(value) =>
              update(displayCountryCode, value, "phoneNumber")
            }
          />
        );
      }}
    </Field>
  );
};
