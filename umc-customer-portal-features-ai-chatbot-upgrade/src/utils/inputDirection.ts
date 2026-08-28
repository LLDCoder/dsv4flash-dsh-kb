import type { CSSProperties } from "react";

const rtlInputStyle: CSSProperties = {
  direction: "rtl",
  textAlign: "right",
};

export const getArabicInputStyle = (): CSSProperties => rtlInputStyle;

export const getArabicInputPlaceholderClassName = (isArabicPage: boolean): string =>
  isArabicPage
    ? "arabic-input-placeholder--rtl"
    : "arabic-input-placeholder--ltr";
