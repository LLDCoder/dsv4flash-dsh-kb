import axios from "axios";
import type { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse } from "axios";
import authStorage from "@/storage/authStorage";
import i18next from "@/localization/config";
import { CustomMessage } from "@/components/common";
import i18n from "@/localization/config";
import { performAuthenticatedLogout } from "./authSession";
import { getActiveProfileSwitchSession } from "./profileSwitchSession";
import {
  beginNetworkErrorToastSuppress,
  endNetworkErrorToastSuppress,
} from "./errorToastSuppress";
import {
  handleUnauthorizedSession,
  isLoggedInElsewhereMessage,
} from "./unauthorizedSession";
import { handleAccountSuspension } from "./accountSuspension";

const MAX_SERVER_MESSAGE_LENGTH = 180;
const ACCOUNT_SUSPENDED_MESSAGES = new Set([
  "your account has been suspended",
  "تم تعليق حسابك",
]);

const normalizeServerMessage = (message?: string | null) => {
  return String(message ?? "")
    .replace(/\s+/g, " ")
    .trim();
};

const isAccountSuspendedMessage = (message?: string | null) => {
  const normalizedMessage = normalizeServerMessage(message)
    .replace(/[.!؟]+$/u, "")
    .toLowerCase();

  return ACCOUNT_SUSPENDED_MESSAGES.has(normalizedMessage);
};

const looksLikeServerStackTrace = (message: string) => {
  return (
    message.length > MAX_SERVER_MESSAGE_LENGTH ||
    message.includes(" at ") ||
    message.includes("Microsoft.") ||
    message.includes("System.") ||
    message.includes("SqlException") ||
    message.includes("stack trace")
  );
};

const getFriendlyServerMessage = (
  message: string | null | undefined,
  fallback: string,
) => {
  const normalizedMessage = normalizeServerMessage(message);

  if (!normalizedMessage) {
    return fallback;
  }

  if (looksLikeServerStackTrace(normalizedMessage)) {
    return fallback;
  }

  return normalizedMessage;
};

const getUserFacingErrorMessage = (
  statusCode: number | undefined,
  message: string | null | undefined,
  fallback: string,
) => {
  if (statusCode !== undefined && statusCode >= 500) {
    return "Something went wrong. Please try again later.";
  }

  const safeMessage = getFriendlyServerMessage(message, fallback);
  return safeMessage || fallback;
};

const logRequestError = (
  label: string,
  config: RequestConfig | undefined,
  details: unknown,
) => {
  console.error(label, {
    method: config?.method,
    url: config?.redactUrlInLogs ? "[REDACTED]" : config?.url,
    details,
  });
};

const redactSensitiveRequestData = (data: unknown): unknown => {
  if (typeof data === "string") {
    if (/"(?:accessToken|token|password|secret|authorization)"\s*:/i.test(data)) {
      return "[REDACTED REQUEST BODY]";
    }
    return data;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const record = data as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      /token|password|secret|authorization/i.test(key) ? "[REDACTED]" : value,
    ]),
  );
};

export interface RequestConfig extends AxiosRequestConfig {
  redactUrlInLogs?: boolean;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
  skipUnauthorizedRedirect?: boolean;
  customErrorMessage?: string | boolean;
}

const resolveCustomErrorFallback = (
  customErrorMessage: RequestConfig["customErrorMessage"],
  fallback: string,
) => {
  if (typeof customErrorMessage === "string") {
    const normalizedMessage = normalizeServerMessage(customErrorMessage);
    if (normalizedMessage) {
      return normalizedMessage;
    }
  }

  return fallback;
};

export type NetworkErrorType = "timeout" | "offline" | "network";

const classifyNetworkError = (error: unknown): NetworkErrorType => {
  const code = (error as { code?: string }).code;
  const message = (error as { message?: string }).message ?? "";
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "offline";
  }
  if (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    /timeout/i.test(message)
  ) {
    return "timeout";
  }
  return "network";
};

const NETWORK_ERROR_I18N_KEY: Record<NetworkErrorType, string> = {
  // Timeout and other request failures share the same generic copy; only a true
  // offline state gets a dedicated message.
  timeout: "response.network.error",
  offline: "response.offline.error",
  network: "response.network.error",
};

const NETWORK_ERROR_TOAST_KEY = "network-error-toast";

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
});

service.interceptors.request.use(
  (config) => {
    const requestConfig = config as RequestConfig;
    config.headers["Accept-Language"] = i18n.language;
    if (!requestConfig.skipAuth) {
      const token = authStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // P8 Plan A: per-prefix baseURL rewriting removed. All requests use the shared relative
    // baseURL (VITE_API_BASE_URL = '') and reach the gateway, which owns the routing of
    // /PayFines, /ContentLibrary, /api/customer-engines, etc. to the right downstream service.
    if (config.method?.toUpperCase() === "GET" && config.params) {
      Object.keys(config.params).forEach((key) => {
        if (config.params[key] === undefined || config.params[key] === null) {
          delete config.params[key];
        }
      });
    }

    return config;
  },
  (error) => {
    console.error("Request parameter error:", error);
    CustomMessage.error(i18next.t("request.parameter.error"));
    return Promise.reject(error);
  },
);

service.interceptors.response.use(
  (response) => {
    const { data } = response;

    // If response is an array, return directly
    if (Array.isArray(data)) {
      return { data };
    }

    // If statusCode field exists, check status
    if (data.statusCode !== undefined && data.statusCode !== 200) {
      const requestConfig = response.config as RequestConfig;
      const safeMessage = getUserFacingErrorMessage(
        data.statusCode,
        data.message,
        resolveCustomErrorFallback(
          requestConfig.customErrorMessage,
          (data.statusCode >= 500
            ? i18next.t("response.error.500")
            : i18next.t("request.operation.failed")),
        ),
      );
      logRequestError("Request failed:", requestConfig, {
        statusCode: data.statusCode,
        message: safeMessage,
        response: data,
      });
      const error = new Error(safeMessage || i18next.t("request.error")) as Error & {
        statusCode?: number;
        status?: string;
        businessCode?: string;
        errorCode?: string;
      };
      error.statusCode = data.statusCode;
      error.status = data.status;
      error.businessCode = data.businessCode;
      error.errorCode = data.errorCode;
      return Promise.reject(error);
    }

    return data;
  },
  (error) => {
    const requestConfig = ((error as { config?: RequestConfig }).config ??
      {}) as RequestConfig;
    const isCanceledRequest =
      axios.isCancel(error) ||
      (error as { code?: string }).code === "ERR_CANCELED";

    if (isCanceledRequest) {
      return Promise.reject(error);
    }

    // The browser reports no connectivity. Any response present here (e.g. a
    // dev-proxy 500 produced because the proxy could not reach the backend) is
    // not a genuine business error, so treat it as a network-level failure.
    const isBrowserOffline =
      typeof navigator !== "undefined" && navigator.onLine === false;

    if (isBrowserOffline || !error.response) {
      const networkErrorType = classifyNetworkError(error);
      const networkMessage = resolveCustomErrorFallback(
        requestConfig.customErrorMessage,
        i18next.t(NETWORK_ERROR_I18N_KEY[networkErrorType]),
      );
      logRequestError("Network request failed:", requestConfig, {
        networkErrorType,
        code: (error as { code?: string }).code,
        message: networkMessage,
        requestData: redactSensitiveRequestData(requestConfig.data),
      });

      if (!requestConfig.skipErrorToast) {
        CustomMessage.error(
          networkMessage,
          undefined,
          undefined,
          NETWORK_ERROR_TOAST_KEY,
        );
        beginNetworkErrorToastSuppress();
        setTimeout(endNetworkErrorToastSuppress, 0);
      }

      const finalError = requestConfig.customErrorMessage
        ? new Error(networkMessage)
        : error;
      (
        finalError as Error & { networkErrorType?: NetworkErrorType }
      ).networkErrorType = networkErrorType;
      if (finalError && typeof finalError === "object" && "message" in finalError) {
        (finalError as Error).message = networkMessage;
      }
      return Promise.reject(finalError);
    }

    const responseData = error.response.data ?? {};
    const httpStatus = error.response.status ?? error.status;
    const { statusCode, message: errorMessage } = responseData;
    const activeProfileSwitch = getActiveProfileSwitchSession();
    const safeErrorMessage = getUserFacingErrorMessage(
      httpStatus,
      errorMessage,
      resolveCustomErrorFallback(
        requestConfig.customErrorMessage,
        i18next.t("response.error.default"),
      ),
    );
    logRequestError("Request failed:", requestConfig, {
      httpStatus,
      statusCode,
      message: safeErrorMessage,
      response: responseData,
    });

    if (
      !requestConfig.skipAuth &&
      authStorage.isTokenValid() &&
      isAccountSuspendedMessage(errorMessage)
    ) {
      handleAccountSuspension();
      const accountSuspendedError = error as typeof error & {
        isAccountSuspended?: boolean;
      };
      accountSuspendedError.isAccountSuspended = true;
      return Promise.reject(accountSuspendedError);
    }

    if (httpStatus === 401) {
      if (activeProfileSwitch) {
        return Promise.reject(error);
      }

      if (requestConfig.skipUnauthorizedRedirect) {
        return Promise.reject(error);
      }

      if (isLoggedInElsewhereMessage(errorMessage)) {
        const fallbackMessage = i18next.t("login.sessionLoggedInElsewhere");
        const displayMessage = getFriendlyServerMessage(
          errorMessage,
          fallbackMessage,
        );
        handleUnauthorizedSession(displayMessage);

        const unauthorizedError = error as typeof error & {
          isUnauthorizedSession?: boolean;
        };
        unauthorizedError.isUnauthorizedSession = true;
        return Promise.reject(unauthorizedError);
      }

      const logoutNotice = getFriendlyServerMessage(
        errorMessage,
        i18next.t("response.error.401"),
      );
      performAuthenticatedLogout({ loginNotice: logoutNotice });
      return Promise.reject(error);
    }

    if (requestConfig.customErrorMessage) {
      return Promise.reject(new Error(safeErrorMessage));
    }

    if (error && typeof error === "object" && "message" in error) {
      (error as Error).message = safeErrorMessage;
    }

    return Promise.reject(error);
  },
);

const request = {
  get<T = unknown, R = AxiosResponse<T>>(
    url: string,
    params = {},
    config: RequestConfig = {},
  ) {
    return service.get<T, R>(url, { params, ...config });
  },

  post<T = unknown, R = AxiosResponse<T>>(
    url: string,
    data = {},
    config: RequestConfig = {},
  ) {
    return service.post<T, R>(url, data, config);
  },

  put<T = unknown, R = AxiosResponse<T>>(
    url: string,
    data = {},
    config: RequestConfig = {},
  ) {
    return service.put<T, R>(url, data, config);
  },

  patch<T = unknown, R = AxiosResponse<T>>(
    url: string,
    data = {},
    config: RequestConfig = {},
  ) {
    return service.patch<T, R>(url, data, config);
  },

  delete<T = unknown, R = AxiosResponse<T>>(
    url: string,
    params = {},
    config: RequestConfig = {},
  ) {
    return service.delete<T, R>(url, { params, ...config });
  },

  upload<T = unknown, R = AxiosResponse<T>>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
  ) {
    const formData = new FormData();
    formData.append("file", file);
    return service.post<T, R>(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },
};

export default request;
