export type ForgotEmailStep =
  | "identity"
  | "account-selection"
  | "account-found"
  | "current-email-otp"
  | "new-email"
  | "email-otp";

export interface ForgotEmailIdentityValues {
  mediaLicenseNumber?: string;
  emiratesId?: string;
  commercialLicenseNumber?: string;
  individualAccount?: boolean;
}

export interface ForgotEmailAccount {
  id: string;
  maskedEmail: string;
}

export interface ForgotEmailFlowData {
  accounts: ForgotEmailAccount[];
  selectedAccountId?: string;
  maskedMobile: string;
  flowToken?: string;
  flowExpiresAt?: number;
  newEmail: string;
}

export const OTP_LENGTH = 6;

export const createEmptyOtpCode = () =>
  Array.from({ length: OTP_LENGTH }, () => "");
