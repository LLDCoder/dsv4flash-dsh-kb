import request from "@/utils/request";
import type { RequestConfig } from "@/utils/request";
import {
  resolveVerificationLockState,
  type VerificationLockType,
} from "@/services/verificationLock";

export type TwoFactorLockType = VerificationLockType;

export interface TwoFactorErrorPayload {
  code: string;
  message: string;
  locked?: boolean;
  lockType?: TwoFactorLockType;
  lockUntil?: number | null;
}

export interface SendOtpResponse {
  success: boolean;
  cooldownSec: number;
  locked?: boolean;
  lockType?: TwoFactorLockType;
  lockUntil?: number | null;
  message?: string;
}

export interface VerifyTwoFactorLoginData {
  token: string;
  twoFactorEnabled?: boolean;
  tokenExpireMinutes?: number;
  [key: string]: unknown;
}

export interface VerifyOtpResponse {
  success: boolean;
  passed: boolean;
  data?: VerifyTwoFactorLoginData | boolean;
  locked?: boolean;
  lockType?: TwoFactorLockType;
  lockUntil?: number | null;
  message?: string;
  error?: TwoFactorErrorPayload;
}

export interface VerifyTwoFactorPayload {
  Code: string;
  loginType: number;
}

interface ApiEnvelope<T> {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: T;
}

interface ErrorWithResponse {
  response?: {
    data?: unknown;
  };
}

const DEFAULT_RESEND_COOLDOWN = 60;

function getAuthorizedConfig(token: string, config?: RequestConfig): RequestConfig {
  return {
    ...config,
    headers: {
      ...(config?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getServerMessage(payload: unknown) {
  if (!isRecord(payload)) {
    return "";
  }

  const nestedData = payload.data;
  const nestedMessage = isRecord(nestedData) ? nestedData.message : undefined;

  return String(payload.message ?? nestedMessage ?? "").trim();
}

export async function resendTwoFactorCode(
  token: string,
): Promise<SendOtpResponse> {
  try {
    const response = await request.post<string, ApiEnvelope<string>>(
      "/api/User/ResendTwoFactorCode",
      {},
      getAuthorizedConfig(token),
    );

    return {
      success: true,
      cooldownSec: DEFAULT_RESEND_COOLDOWN,
      message: response.data,
    };
  } catch (error: unknown) {
    const requestError = error as ErrorWithResponse;
    const payload = requestError.response?.data;
    const lockState = resolveVerificationLockState(payload, "resend");

    if (lockState) {
      return {
        success: false,
        cooldownSec: 0,
        locked: true,
        lockType: lockState.lockType,
        lockUntil: lockState.lockUntil,
        message: lockState.message,
      };
    }

    throw requestError;
  }
}

export async function verifyTwoFactor(
  token: string,
  payload: VerifyTwoFactorPayload,
): Promise<VerifyOtpResponse> {
  try {
    const response = await request.post<
      VerifyTwoFactorLoginData,
      ApiEnvelope<VerifyTwoFactorLoginData>
    >("/api/User/VerifyTwoFactor", payload, getAuthorizedConfig(token));

    return {
      success: true,
      passed: true,
      data: response.data,
    };
  } catch (error: unknown) {
    const requestError = error as ErrorWithResponse;
    const responsePayload = requestError.response?.data;
    const lockState = resolveVerificationLockState(responsePayload, "verify");
    const message =
      lockState?.message ||
      getServerMessage(responsePayload) ||
      "Incorrect verification code. Please re-enter.";

    return {
      success: false,
      passed: false,
      locked: Boolean(lockState),
      lockType: lockState?.lockType ?? "verify",
      lockUntil: lockState?.lockUntil ?? null,
      error: {
        code: lockState ? "OTP_LOCKED" : "OTP_INVALID",
        message,
        locked: Boolean(lockState),
        lockType: lockState?.lockType ?? "verify",
        lockUntil: lockState?.lockUntil ?? null,
      },
      message,
    };
  }
}


export interface GetGenerateCodeParams {
  email: string;
  type: number;
}
export async function GetGenerateCode(
  token: string,
  email: string,
  type: number
): Promise<SendOtpResponse> {
  try {
    const response = await request.post<string, ApiEnvelope<string>>(
      "/api/User/GetGenerateCode",
      { email, type },
      getAuthorizedConfig(token),
    );

    return {
      success: true,
      cooldownSec: DEFAULT_RESEND_COOLDOWN,
      message: response.data,
    };
  } catch (error: unknown) {
    const requestError = error as ErrorWithResponse;
    const payload = requestError.response?.data;
    const lockState = resolveVerificationLockState(payload, "resend");

    if (lockState) {
      return {
        success: false,
        cooldownSec: 0,
        locked: true,
        lockType: lockState.lockType,
        lockUntil: lockState.lockUntil,
        message: lockState.message,
      };
    }

    throw requestError;
  }
}

export interface GetVerificationCodeParams {
  email: string;
  type: number;
  code: string;
}

export async function GetVerificationCode(
  token: string,
  email: string,
  payload: VerifyTwoFactorPayload,
  type = 1,
): Promise<VerifyOtpResponse> {
  try {
    const requestPayload = {
      ...payload,
      type,
      email,
    };

    const response = await request.post<
      VerifyTwoFactorLoginData | boolean,
      ApiEnvelope<VerifyTwoFactorLoginData | boolean>
    >("/api/User/VerificationCode", requestPayload, getAuthorizedConfig(token));

    return {
      success: true,
      passed: true,
      data: response.data,
    };
  } catch (error: unknown) {
    const requestError = error as ErrorWithResponse;
    const responsePayload = requestError.response?.data;
    const lockState = resolveVerificationLockState(responsePayload, "verify");
    const message =
      lockState?.message ||
      getServerMessage(responsePayload) ||
      "Incorrect verification code. Please re-enter.";

    return {
      success: false,
      passed: false,
      locked: Boolean(lockState),
      lockType: lockState?.lockType ?? "verify",
      lockUntil: lockState?.lockUntil ?? null,
      error: {
        code: lockState ? "OTP_LOCKED" : "OTP_INVALID",
        message,
        locked: Boolean(lockState),
        lockType: lockState?.lockType ?? "verify",
        lockUntil: lockState?.lockUntil ?? null,
      },
      message,
    };
  }
}
