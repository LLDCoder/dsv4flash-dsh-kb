/** Extract user-facing message from axios / request wrapper errors. */
export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    const message = response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return '';
}

/** Whether the backend message is a credentials mismatch. */
export function isIncorrectCredentialsError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('email or password is incorrect') ||
    normalized.includes('account or password is incorrect') ||
    normalized.includes('password is incorrect')
  );
}

/** Whether the backend message includes a forgot-password hint (show link in error box). */
export function hasForgotPasswordHint(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('forgot password') ||
    message.includes('نسيت كلمة المرور')
  );
}

/** Split credentials error text so "Forgot password?" appears on its own line. */
export function splitForgotPasswordHint(message: string): {
  mainMessage: string;
  forgotPasswordLine?: string;
} {
  const trimmed = message.trim();
  if (!trimmed) {
    return { mainMessage: '' };
  }

  const enMatch = trimmed.match(
    /^(.+?)[.\s,!]*((?:forgot|reset)\s+password\??)\s*$/i,
  );
  if (enMatch) {
    let mainMessage = enMatch[1].trim();
    if (mainMessage && !/[.!?]$/.test(mainMessage)) {
      mainMessage += '.';
    }
    let forgotPasswordLine = enMatch[2].trim();
    if (!forgotPasswordLine.endsWith('?')) {
      forgotPasswordLine += '?';
    }
    return { mainMessage, forgotPasswordLine };
  }

  const arMatch = trimmed.match(/^(.+?)[.\s,!]*(نسيت\s+كلمة\s+المرور\??)\s*$/);
  if (arMatch) {
    let mainMessage = arMatch[1].trim();
    if (mainMessage && !/[.!?؟]$/.test(mainMessage)) {
      mainMessage += '.';
    }
    let forgotPasswordLine = arMatch[2].trim();
    if (!forgotPasswordLine.endsWith('?') && !forgotPasswordLine.endsWith('؟')) {
      forgotPasswordLine += '؟';
    }
    return { mainMessage, forgotPasswordLine };
  }

  return { mainMessage: trimmed };
}

/** Whether the message should show as plain text under the OTP inputs (not the boxed prompt). */
export function isVerificationCodeInlineError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('incorrect verification code') ||
    normalized.includes('invalid verification code')
  );
}
