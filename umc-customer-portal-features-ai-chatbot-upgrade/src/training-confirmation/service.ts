import i18n from "@/localization/config";
import request from "@/utils/request";

export type TrainingConfirmationStatus =
  | "Pending"
  | "Completed"
  | "Expired"
  | "Cancelled"
  | "NotFound";

export type TrainingConfirmationData = {
  status: TrainingConfirmationStatus;
  applicationNumber: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  serviceNameEn: string | null;
  serviceNameAr: string | null;
  trainingVideoUrl: string | null;
  confirmedOn: string | null;
};

type TrainingConfirmationResponse = {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: TrainingConfirmationData;
};

const STATUSES = new Set<TrainingConfirmationStatus>([
  "Pending",
  "Completed",
  "Expired",
  "Cancelled",
  "NotFound",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNullableString = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isTrainingConfirmationData = (
  value: unknown,
): value is TrainingConfirmationData => {
  if (!isRecord(value) || !STATUSES.has(value.status as TrainingConfirmationStatus)) {
    return false;
  }

  const hasValidShape = (
    isNullableString(value.applicationNumber) &&
    isNullableString(value.recipientName) &&
    isNullableString(value.recipientEmail) &&
    isNullableString(value.serviceNameEn) &&
    isNullableString(value.serviceNameAr) &&
    isNullableString(value.trainingVideoUrl) &&
    isNullableString(value.confirmedOn)
  );

  if (!hasValidShape) return false;
  if (value.status !== "Pending") return true;

  return (
    isNonEmptyString(value.applicationNumber) &&
    isNonEmptyString(value.recipientEmail) &&
    isNonEmptyString(value.serviceNameEn) &&
    isNonEmptyString(value.serviceNameAr)
  );
};

const unwrapResponse = (response: unknown): TrainingConfirmationData => {
  if (!isRecord(response)) {
    throw new Error("Invalid training confirmation response.");
  }

  const payload = response as TrainingConfirmationResponse;
  if (
    payload.isSuccess !== true ||
    payload.statusCode !== 200 ||
    !isTrainingConfirmationData(payload.data)
  ) {
    throw new Error("Training confirmation request failed.");
  }

  return payload.data;
};

const getRequestConfig = () => ({
  ...(import.meta.env.DEV ? { baseURL: "" } : {}),
  redactUrlInLogs: true,
  skipAuth: true,
  skipErrorToast: true,
  skipUnauthorizedRedirect: true,
  headers: {
    Language: i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en",
  },
});

const getEndpoint = (token: string) =>
  `/api/public/training-confirmation/${token}`;

export const getTrainingConfirmation = async (token: string) => {
  const response = await request.get<TrainingConfirmationResponse, unknown>(
    getEndpoint(token),
    {},
    getRequestConfig(),
  );

  return unwrapResponse(response);
};

export const confirmTraining = async (token: string) => {
  const response = await request.post<TrainingConfirmationResponse, unknown>(
    `${getEndpoint(token)}/confirm`,
    { confirmed: true },
    getRequestConfig(),
  );

  return unwrapResponse(response);
};
