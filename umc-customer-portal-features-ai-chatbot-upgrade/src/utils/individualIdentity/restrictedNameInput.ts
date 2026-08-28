import type React from "react";
import type { FormInstance } from "antd/lib/form";
import i18n from "@/localization/config";
import {
  isArabicNameInputAllowed,
  isEnglishNameInputAllowed,
  isStrictArabicNameInputAllowed,
} from "./validation";

interface RestrictedNameInputProps {
  onBeforeInput: (event: React.FormEvent<HTMLInputElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
}

const flagFieldError = (
  form: FormInstance | undefined,
  fieldName: string,
  messageKey: string,
) => {
  if (!form) return;
  try {
    const value = form.getFieldValue(fieldName);
    form.setFields([
      {
        name: fieldName,
        value,
        errors: [i18n.t(messageKey)],
      },
    ]);
  } catch {
    // ignore: form may be unmounted
  }
};

const buildRestrictedNameInputProps = (
  form: FormInstance | undefined,
  fieldName: string,
  messageKey: string,
  isAllowed: (value: unknown) => boolean,
): RestrictedNameInputProps => ({
  onBeforeInput: (event) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    const data = nativeEvent?.data;
    if (data == null || data === "") return;
    if (!isAllowed(data)) {
      event.preventDefault();
      flagFieldError(form, fieldName, messageKey);
    }
  },
  onPaste: (event) => {
    try {
      const text = event.clipboardData?.getData("text") ?? "";
      if (!text) return;
      if (!isAllowed(text)) {
        event.preventDefault();
        flagFieldError(form, fieldName, messageKey);
      }
    } catch {
      // ignore clipboard access errors
    }
  },
});

export const buildArabicNameRestrictProps = (
  form: FormInstance | undefined,
  fieldName: string,
  messageKey = "individualIdentity.validation.arabicOnly",
): RestrictedNameInputProps =>
  buildRestrictedNameInputProps(form, fieldName, messageKey, isArabicNameInputAllowed);
export const buildStrictArabicNameRestrictProps = (
  form: FormInstance | undefined,
  fieldName: string,
  messageKey = "individualIdentity.validation.arabicOnly",
): RestrictedNameInputProps =>
  buildRestrictedNameInputProps(
    form,
    fieldName,
    messageKey,
    isStrictArabicNameInputAllowed,
  );

export const buildEnglishNameRestrictProps = (
  form: FormInstance | undefined,
  fieldName: string,
  messageKey = "individualIdentity.validation.englishOnly",
): RestrictedNameInputProps =>
  buildRestrictedNameInputProps(form, fieldName, messageKey, isEnglishNameInputAllowed);
