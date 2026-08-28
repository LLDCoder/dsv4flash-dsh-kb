import { useEffect, useRef, useState } from "react";
import { Input } from "antd";
import type { InputRef } from "antd/lib/input";
import { useTranslation } from "react-i18next";
import Timer from "@/assets/icons/Timer";
import { OTP_LENGTH } from "../types";

interface OtpCodeInputProps {
  code: string[];
  deadline: number | null;
  disabled?: boolean;
  resendDisabled?: boolean;
  isResending?: boolean;
  onChange: (code: string[]) => void;
  onResend: () => void | Promise<void>;
}

const getRemainingSeconds = (deadline: number | null) => {
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
};

export default function OtpCodeInput({
  code,
  deadline,
  disabled = false,
  resendDisabled = false,
  isResending = false,
  onChange,
  onResend,
}: OtpCodeInputProps) {
  const { t } = useTranslation();
  const inputsRef = useRef<Array<InputRef | null>>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(deadline),
  );
  const normalizedCode = Array.from({ length: OTP_LENGTH }, (_, index) => {
    const value = code[index] ?? "";
    return /^\d$/.test(value) ? value : "";
  });

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(deadline));
    if (!deadline) return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(deadline));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [deadline]);

  const handleInputChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextCode = [...normalizedCode];
    nextCode[index] = digit;
    onChange(nextCode);

    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key !== "Backspace" && event.key !== "Delete") return;

    event.preventDefault();
    const nextCode = [...normalizedCode];
    if (nextCode[index]) {
      nextCode[index] = "";
      onChange(nextCode);
      if (index > 0) inputsRef.current[index - 1]?.focus();
      return;
    }

    if (index > 0) {
      nextCode[index - 1] = "";
      onChange(nextCode);
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number,
  ) => {
    event.preventDefault();
    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH - startIndex)
      .split("");
    if (digits.length === 0) return;

    const nextCode = [...normalizedCode];
    digits.forEach((digit, offset) => {
      nextCode[startIndex + offset] = digit;
    });
    onChange(nextCode);

    const nextFocusIndex = Math.min(
      startIndex + digits.length,
      OTP_LENGTH - 1,
    );
    inputsRef.current[nextFocusIndex]?.focus();
  };

  return (
    <>
      <div
        aria-label={t("forgotEmail.otpInputLabel")}
        className="forgot-email-otp-inputs"
        dir="ltr"
        role="group"
      >
        {normalizedCode.map((digit, index) => (
          <Input
            aria-label={t("forgotEmail.otpDigitLabel", {
              index: index + 1,
            })}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            className="forgot-email-otp-input"
            disabled={disabled}
            inputMode="numeric"
            key={index}
            maxLength={1}
            onChange={(event) => handleInputChange(event.target.value, index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={(event) => handlePaste(event, index)}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            value={digit}
          />
        ))}
      </div>
      <div className="forgot-email-resend">
        <span>{t("forgotEmail.didNotReceive")}</span>
        {remainingSeconds > 0 ? (
          <span className="forgot-email-resend-time">
            <Timer />
            {remainingSeconds}s
          </span>
        ) : null}
        <button
          className="forgot-email-resend-button"
          aria-busy={isResending}
          disabled={remainingSeconds > 0 || resendDisabled || isResending}
          onClick={onResend}
          type="button"
        >
          {t("forgotEmail.resend")}
        </button>
      </div>
    </>
  );
}
