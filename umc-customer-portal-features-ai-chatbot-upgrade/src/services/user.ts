import request from "@/utils/request";
import type { RequestConfig } from "@/utils/request";

export interface IdentifyForgotEmailRequest {
  hasMediaLicense: boolean;
  mediaLicenseNumber: string | null;
  emiratesId: string | null;
  individualAccount: boolean;
  commercialLicenseNumber: string | null;
}

export interface ForgotEmailCandidate {
  accountToken: string;
  accountType?: string | null;
  displayNameEn?: string | null;
  displayNameAr?: string | null;
  maskedEmail?: string | null;
}

export interface IdentifyForgotEmailResult {
  matched?: boolean;
  message?: string | null;
  candidates?: ForgotEmailCandidate[] | null;
}

export interface IdentifyForgotEmailResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: IdentifyForgotEmailResult | null;
}

export interface SendRecoveryEmailRequest {
  accountToken: string;
}

export interface SendRecoveryEmailResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: SendRecoveryEmailResult | null;
}

export interface SendRecoveryEmailResult {
  success?: boolean;
  message?: string | null;
  maskedEmail?: string | null;
}

export interface SendCurrentEmailOtpRequest {
  accountToken: string;
}

export interface SendCurrentEmailOtpResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: SendCurrentEmailOtpResult | null;
}

export interface SendCurrentEmailOtpResult {
  success?: boolean;
  message?: string | null;
  currentEmailOtpToken?: string | null;
  maskedEmail?: string | null;
  expiresInSeconds?: number | null;
}

export interface VerifyCurrentEmailOtpRequest {
  currentEmailOtpToken: string;
  code: string;
}

export interface VerifyCurrentEmailOtpResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: VerifyCurrentEmailOtpResult | null;
}

export interface VerifyCurrentEmailOtpResult {
  success?: boolean;
  message?: string | null;
  currentEmailVerifiedToken?: string | null;
  expiresInSeconds?: number | null;
}

export interface SendNewEmailOtpRequest {
  currentEmailVerifiedToken: string;
  newEmail: string;
}

export interface SendNewEmailOtpResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: SendNewEmailOtpResult | null;
}

export interface SendNewEmailOtpResult {
  success?: boolean;
  message?: string | null;
  newEmailOtpToken?: string | null;
  maskedEmail?: string | null;
  expiresInSeconds?: number | null;
}

export interface ConfirmNewEmailRequest {
  newEmailOtpToken: string;
  code: string;
}

export interface ConfirmNewEmailResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: ConfirmNewEmailResult | null;
}

export interface ConfirmNewEmailResult {
  success?: boolean;
  message?: string | null;
}

export function identifyForgotEmail(data: IdentifyForgotEmailRequest) {
  return request.post<IdentifyForgotEmailResponse, IdentifyForgotEmailResponse>(
    "/api/User/ForgotEmail/Identify",
    data,
    { skipErrorToast: true, skipUnauthorizedRedirect: true }
  );
}

export function sendRecoveryEmail(data: SendRecoveryEmailRequest) {
  return request.post<SendRecoveryEmailResponse, SendRecoveryEmailResponse>(
    "/api/User/ForgotEmail/SendRecoveryEmail",
    data,
    { skipErrorToast: true, skipUnauthorizedRedirect: true }
  );
}

export function sendCurrentEmailOtp(data: SendCurrentEmailOtpRequest) {
  return request.post<SendCurrentEmailOtpResponse, SendCurrentEmailOtpResponse>(
    "/api/User/ForgotEmail/SendCurrentEmailOtp",
    data,
    { skipErrorToast: true, skipUnauthorizedRedirect: true }
  );
}

export function verifyCurrentEmailOtp(data: VerifyCurrentEmailOtpRequest) {
  return request.post<
    VerifyCurrentEmailOtpResponse,
    VerifyCurrentEmailOtpResponse
  >("/api/User/ForgotEmail/VerifyCurrentEmailOtp", data, {
    skipErrorToast: true,
    skipUnauthorizedRedirect: true,
  });
}

export function sendNewEmailOtp(data: SendNewEmailOtpRequest) {
  return request.post<SendNewEmailOtpResponse, SendNewEmailOtpResponse>(
    "/api/User/ForgotEmail/SendNewEmailOtp",
    data,
    { skipErrorToast: true, skipUnauthorizedRedirect: true }
  );
}

export function confirmNewEmail(data: ConfirmNewEmailRequest) {
  return request.post<ConfirmNewEmailResponse, ConfirmNewEmailResponse>(
    "/api/User/ForgotEmail/ConfirmNewEmail",
    data,
    { skipErrorToast: true, skipUnauthorizedRedirect: true }
  );
}

export function postEmail(email: string, firstName?: string, type = 1) {
  return request.post("/api/User/GetGenerateCode", {
    type,
    email: email,
    phone: "",
    code: "",
    ...(firstName ? { firstName } : {}),
  });
}
export interface GenerateCodeBySmsResponse {
  data?: "Success" | "Failure" | string;
  message?: string;
}
export function postGenerateCodeBySms(phone: string, firstName?: string) {
  return request.post<GenerateCodeBySmsResponse, GenerateCodeBySmsResponse>(
    "/api/User/GetGenerateCodeBySms",
    {
      phone,
      email: "",
      ...(firstName ? { firstName } : {}),
    },
  );
}
/** Wrapped API body for POST /api/User/VerificationCode (HTTP 200). Success is `data === true`, not top-level `isSuccess`. */
export interface UserVerificationCodeResponseBody {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string;
  data?: boolean;
}

export function isUserVerificationCodeAccepted(
  body: unknown
): body is UserVerificationCodeResponseBody & { data: true } {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as UserVerificationCodeResponseBody).data === true
  );
}

export function postVerificationCode(email: string, code: string, type = 1) {
  return request.post<
    UserVerificationCodeResponseBody,
    UserVerificationCodeResponseBody
  >("/api/User/VerificationCode", { type, email, code });
}

export function postVerificationCodeByPhone(phone: string, code: string) {
  return request.post<
    UserVerificationCodeResponseBody,
    UserVerificationCodeResponseBody
  >("/api/User/VerificationCode", { type: 1, phone, code });
}

/** Logged-in or verified-email flow: set new password (see My Account change password). */
export function postForgetPassword(payload: { pwd: string; email: string }) {
  return request.post("/api/User/ForgetPassWord", payload);
}

/** Logged-in change password: verify current password before ForgetPassWord. */
export function getCheckPassWord(encryptedPwd: string, config?: RequestConfig) {
  return request.get<unknown>(
    "/api/User/CheckPassWord",
    { pwd: encryptedPwd },
    config
  );
}

export interface UpdateMyAccountInfoPayload {
  userId: string;
  email?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  phoneLocalNumber?: string;
  verificationCode?: string;
}

export function postUpdateMyAccountInfo(obj: UpdateMyAccountInfoPayload) {
  return request.post<string | null, string | null>(
    "/api/User/UpdateMyAccountInfo",
    obj
  );
}

export function getCheckUpdateMyAccountInfoRequirement(
  email: string,
  config?: RequestConfig
) {
  return request.post<boolean | { data?: boolean }>(
    "/api/User/CheckUpdateMyAccountInfoRequirement",
    { email },
    config
  );
}

export function checkEmailExist(email: string) {
  return request.post<boolean | { data?: boolean }>("/api/User/EmailExsit", {
    email,
  });
}

export function postUpdatePersonalProfilePhoto(
  photoUrl: string,
  config?: RequestConfig
) {
  return request.post<boolean | { data?: boolean }>(
    "/api/User/UpdatePersonalProfilePhoto",
    { photoUrl },
    config
  );
}

export function adduserEmail(obj: any) {
  return request.post("/api/User/AdduserEmail", {
    ...obj,
  });
}

export function getUserEmailByUserId() {
  return request.get("/api/User/GetUserEmailByUserId");
}

/** After UAE Pass login (Bearer set), whether the account may enter the merge flow. */
export interface CanMergeResponse {
  status?: string;
  canLink?: boolean;
  sourceEligible?: boolean;
  canMerge?: boolean;
  forceMerge?: boolean;
  targetUserId?: string | null;
  targetEmail?: string | null;
  targetCanMerge?: boolean;
}

export function getCanMerge(config?: RequestConfig) {
  return request.get<unknown, CanMergeResponse>(
    "/api/User/CanMerge",
    {},
    config
  );
}

export function getCurrentUserInfo<TUser = unknown>(config?: RequestConfig) {
  return request.post<unknown, TUser>("/api/User/GetUserInfo", {}, config);
}

export interface UaepassCallbackTokenPayload {
  code: string;
  state: string;
  /** Absolute callback URL configured in the UAE PASS authorize request. */
  url: string;
}

export interface UaepassCallbackTokenResponse {
  data?: {
    access_token?: string;
  };
}

export function postUaepassCallBackGetTokenByCodeMerge(
  payload: UaepassCallbackTokenPayload
) {
  return request.post<unknown, UaepassCallbackTokenResponse>(
    "/api/UAEPASS/CallBackGetTokenByCode",
    payload
  );
}

export interface UaepassUserInfoToLoginResponse<TUser = unknown> {
  isSuccess?: boolean;
  data?: TUser;
}

export function postUaepassUserInfoToLogin<TUser = unknown>(
  accessToken: string,
  loginType?: number
) {
  return request.post<unknown, UaepassUserInfoToLoginResponse<TUser>>(
    "/api/UAEPASS/GetUserInfoToLogin",
    {
      accessToken,
      loginType,
    }
  );
}

export interface MergeAccountPayload {
  souceUserId: string;
  targetUserId: string;
  type: number;
}

export interface MergeAccountResponse {
  token?: string;
  email?: string;
  loginEmail?: string;
  emiratesID?: string;
  emiratesId?: string;
  emiratesIdMasked?: string;
  maskedEmiratesId?: string;
  tokenExpireMinutes?: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  availableLoginMethods?: string | string[];
  loginMethods?: string | string[];
}

export interface VerifyAccountMergeTargetPayload {
  email: string;
  password: string;
}

export interface VerifyAccountMergeTargetResponse {
  status?: string;
  canLink?: boolean;
  sourceEligible?: boolean;
  targetUserId?: string;
  targetEmail?: string;
}

export function postVerifyAccountMergeTarget(
  payload: VerifyAccountMergeTargetPayload,
) {
  return request.post<unknown, VerifyAccountMergeTargetResponse>(
    "/api/User/VerifyAccountMergeTarget",
    payload,
    { skipErrorToast: true }
  );
}

export function postMergeAccount(payload: MergeAccountPayload) {
  return request.post<unknown, MergeAccountResponse>(
    "/api/User/MergeAccount",
    payload
  );
}

export function postDeclineMerge(config?: RequestConfig) {
  return request.post<boolean | { data?: boolean }>(
    "/api/User/DeclineMerge",
    {},
    config
  );
}

export const GetCmsEventToIndexProtalAsync = (data: any) => {
  return request.get("/api/News/GetLawsAndRegulations", data);
};
export const GetByIdAsync = (applicationId: number) => {
  return request.get(`/api/News/GetByIdAsync?id=${applicationId}`);
};

export interface UserAccountInfo {
  email: string;
  countryCode?: string | null;
  mobileNumber?: string | null;
  phoneNumber?: string | null;
  phoneCountryCode?: string | null;
  phoneLocalNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  twoFactorEnabled?: boolean | null;
  lastLoginDate?: string | null;
}

export function getUserAccountInfo(userId: string) {
  return request.get<UserAccountInfo>("/api/User/GetUserAccountInfo", {
    userId,
  });
}

export interface UpdateTwoFactorEnabledPayload {
  TwoFactorEnabled: boolean;
}

export function updateTwoFactorEnabled(
  payload: UpdateTwoFactorEnabledPayload,
  config?: RequestConfig
) {
  return request.post("/api/User/UpdateTwoFactorEnabled", payload, config);
}
