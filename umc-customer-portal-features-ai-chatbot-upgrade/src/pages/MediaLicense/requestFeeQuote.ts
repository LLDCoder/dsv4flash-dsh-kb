import { useCallback, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  getFeeStrategyQuote,
  type FeeQuoteEnginePayload,
  type FeeQuoteResponse,
} from "@/services/services";
import type { IUser as PortalUserInfo } from "@/store/user";
import {
  buildMediaLicenseFeeStrategyPayload,
  type MediaLicenseFeeStrategyConfig,
} from "./feeStrategyPayload";
import { attachCustomerEngineRequestContext } from "./customerEngineRequestContext";
import { overrideFeeEnginePayloadApplicationNoForActionType4 } from "./feeStrategyPayload/feeStrategyPayloadUtils";
import i18n from "@/localization/config";
import { getModifyEnginePayloadErrorMessageKey } from "./modifyEnginePayloadError";

type SetState<T> = Dispatch<SetStateAction<T>>;

const ACTION_TYPE4_CONTEXT_FEE_SERVICE_KINDS = new Set([
  "service803",
  "service804",
  "service903",
  "service1203",
  "service1205",
  "service80011",
  "service80012",
]);

type FeeQuoteStateSetters = {
  setQuoteData: SetState<FeeQuoteResponse | null>;
  setQuoteError: SetState<string | null>;
  setQuoteLoading: SetState<boolean>;
  setTotalAmount: SetState<number>;
  // Tracks which form-state key produced the latest successful quote.
  resolvedFeeQuoteKeyRef: MutableRefObject<string>;
};

type ResetFeeQuoteStateOptions = {
  resetTotalAmount?: boolean;
  totalAmount?: number;
  clearResolvedQuoteKey?: boolean;
};

const collectPayloadValuesByKey = (
  value: unknown,
  key: string,
  result: unknown[] = [],
): unknown[] => {
  if (!value || typeof value !== "object") {
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectPayloadValuesByKey(item, key, result));
    return result;
  }

  Object.entries(value as Record<string, unknown>).forEach(
    ([entryKey, entryValue]) => {
      if (entryKey === key) {
        result.push(entryValue);
      }

      collectPayloadValuesByKey(entryValue, key, result);
    },
  );

  return result;
};

const isEmptyValue = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === "";

const isFeeEnginePayloadReady = (
  enginePayload: FeeQuoteEnginePayload,
  applicationId?: number | null,
) => {
  const payload = enginePayload.request?.payload;

  if (!payload) {
    return true;
  }

  const activityIdsValues = collectPayloadValuesByKey(payload, "activityIds");
  if (
    activityIdsValues.some(
      (value) => Array.isArray(value) && value.length === 0,
    )
  ) {
    return false;
  }

  const hasApplicationId =
    typeof applicationId === "number" &&
    Number.isFinite(applicationId) &&
    applicationId > 0;
  const applicationNoValues = collectPayloadValuesByKey(payload, "applicationNo");

  if (hasApplicationId && applicationNoValues.some(isEmptyValue)) {
    return false;
  }

  return true;
};

export type RequestMediaLicenseFeeQuoteParams = FeeQuoteStateSetters & {
  activeFeeStrategyConfig?: MediaLicenseFeeStrategyConfig;
  targetFormilyList: unknown[];
  quoteKey?: string;
  currentProfileId: string;
  userInfo: PortalUserInfo;
  applicationId?: number | null;
  applicationNumber?: string;
  actionType4ApplicationNo?: string;
  licensePermitNo?: string | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  sourceMedialLicenseId?: number | null;
  feeQuoteRequestIdRef: MutableRefObject<number>;
  hasResolvedFormFeeRef: MutableRefObject<boolean>;
};

type UseMediaLicenseFeeQuoteParams = {
  activeFeeStrategyConfig?: MediaLicenseFeeStrategyConfig;
  currentProfileId: string;
  userInfo: PortalUserInfo;
  applicationId?: number | null;
  applicationNumber?: string;
  actionType4ApplicationNo?: string;
  licensePermitNo?: string | null;
  sourceApplicationId?: number | null;
  sourceApplicationDetailId?: number | null;
  sourceMedialLicenseId?: number | null;
  setTotalAmount: SetState<number>;
};

export const resetFeeQuoteState = (
  {
    setQuoteData,
    setQuoteError,
    setQuoteLoading,
    setTotalAmount,
    resolvedFeeQuoteKeyRef,
  }: FeeQuoteStateSetters,
  options?: ResetFeeQuoteStateOptions,
) => {
  setQuoteData(null);
  setQuoteError(null);
  setQuoteLoading(false);

  // Keep the successful quote key only when the caller explicitly wants to
  // preserve the last resolved fee state across step navigation.
  if (options?.clearResolvedQuoteKey !== false) {
    resolvedFeeQuoteKeyRef.current = "";
  }

  if (options?.resetTotalAmount) {
    setTotalAmount(options.totalAmount ?? 0);
  }
};

export const requestMediaLicenseFeeQuote = async ({
  activeFeeStrategyConfig,
  targetFormilyList,
  quoteKey,
  currentProfileId,
  userInfo,
  applicationId,
  applicationNumber,
  actionType4ApplicationNo,
  licensePermitNo,
  sourceApplicationId,
  sourceApplicationDetailId,
  sourceMedialLicenseId,
  feeQuoteRequestIdRef,
  hasResolvedFormFeeRef,
  setQuoteData,
  setQuoteError,
  setQuoteLoading,
  setTotalAmount,
  resolvedFeeQuoteKeyRef,
}: RequestMediaLicenseFeeQuoteParams) => {
  if (!activeFeeStrategyConfig || targetFormilyList.length === 0) {
    resetFeeQuoteState(
      {
        setQuoteData,
        setQuoteError,
        setQuoteLoading,
        setTotalAmount,
        resolvedFeeQuoteKeyRef,
      },
      {
        resetTotalAmount: true,
        totalAmount: 0,
      },
    );
    return;
  }

  const currentRequestId = feeQuoteRequestIdRef.current + 1;
  feeQuoteRequestIdRef.current = currentRequestId;
  setQuoteError(null);

  try {
    const payload = await buildMediaLicenseFeeStrategyPayload({
      config: activeFeeStrategyConfig,
      formilyList: targetFormilyList,
      currentProfileId,
      userInfo,
      applicationId,
      applicationNo: applicationNumber,
      licensePermitNo,
      sourceApplicationId,
      sourceApplicationDetailId,
      sourceMedialLicenseId,
    });
    const shouldOverrideActionType4ApplicationNo =
      !ACTION_TYPE4_CONTEXT_FEE_SERVICE_KINDS.has(
        activeFeeStrategyConfig.kind,
      );
    const enginePayloadWithLifecycleContext = attachCustomerEngineRequestContext(
      payload.enginePayload,
      {
        licensePermitNo,
        mediaLicenseId: sourceMedialLicenseId,
      },
    );
    const finalEnginePayload =
      shouldOverrideActionType4ApplicationNo
        ? overrideFeeEnginePayloadApplicationNoForActionType4(
            enginePayloadWithLifecycleContext,
            actionType4ApplicationNo,
          ) ?? enginePayloadWithLifecycleContext
        : enginePayloadWithLifecycleContext;

    if (feeQuoteRequestIdRef.current !== currentRequestId) {
      return;
    }

    if (!isFeeEnginePayloadReady(finalEnginePayload, applicationId)) {
      setQuoteData(null);
      setQuoteError(null);
      setTotalAmount(0);
      // The current form state is incomplete, so the previous quote key is no
      // longer valid for dedupe.
      resolvedFeeQuoteKeyRef.current = "";
      return;
    }

    setQuoteLoading(true);
    const response = await getFeeStrategyQuote({
      ...payload,
      enginePayload: finalEnginePayload,
    });

    if (feeQuoteRequestIdRef.current !== currentRequestId) {
      return;
    }

    hasResolvedFormFeeRef.current = true;

    if (response.isSuccess && response.data) {
      setQuoteData(response.data);
      setTotalAmount(response.data.totalAmount || 0);
      // Persist the key for the form state that produced this successful quote.
      resolvedFeeQuoteKeyRef.current = quoteKey || "";
      return;
    }

    setQuoteData(null);
    console.error("Fee quote request was rejected:", response);
    setQuoteError(i18n.t("FeeQuoteDisplay.unavailable"));
    setTotalAmount(0);
    resolvedFeeQuoteKeyRef.current = "";
  } catch (error: unknown) {
    if (feeQuoteRequestIdRef.current !== currentRequestId) {
      return;
    }

    hasResolvedFormFeeRef.current = true;
    const userMessageKey = getModifyEnginePayloadErrorMessageKey(error);
    console.error("Quote API failed:", error);
    setQuoteData(null);
    setQuoteError(
      userMessageKey
        ? i18n.t(userMessageKey)
        : i18n.t("FeeQuoteDisplay.unavailable"),
    );
    setTotalAmount(0);
    resolvedFeeQuoteKeyRef.current = "";
  } finally {
    if (feeQuoteRequestIdRef.current === currentRequestId) {
      setQuoteLoading(false);
    }
  }
};

export const useMediaLicenseFeeQuote = ({
  activeFeeStrategyConfig,
  currentProfileId,
  userInfo,
  applicationId,
  applicationNumber,
  actionType4ApplicationNo,
  licensePermitNo,
  sourceApplicationId,
  sourceApplicationDetailId,
  sourceMedialLicenseId,
  setTotalAmount,
}: UseMediaLicenseFeeQuoteParams) => {
  const [quoteData, setQuoteData] = useState<FeeQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const hasResolvedFormFeeRef = useRef(false);
  const feeQuoteRequestIdRef = useRef(0);
  const resolvedFeeQuoteKeyRef = useRef("");

  const requestFeeQuote = useCallback(
    async (targetFormilyList: unknown[], options?: { quoteKey?: string }) => {
      await requestMediaLicenseFeeQuote({
        activeFeeStrategyConfig,
        targetFormilyList,
        quoteKey: options?.quoteKey,
        currentProfileId,
        userInfo,
        applicationId,
        applicationNumber,
        actionType4ApplicationNo,
        licensePermitNo,
        sourceApplicationId,
        sourceApplicationDetailId,
        sourceMedialLicenseId,
        feeQuoteRequestIdRef,
        hasResolvedFormFeeRef,
        setQuoteData,
        setQuoteError,
        setQuoteLoading,
        setTotalAmount,
        resolvedFeeQuoteKeyRef,
      });
    },
    [
      activeFeeStrategyConfig,
      applicationId,
      applicationNumber,
      actionType4ApplicationNo,
      licensePermitNo,
      currentProfileId,
      sourceApplicationId,
      sourceApplicationDetailId,
      sourceMedialLicenseId,
      setTotalAmount,
      userInfo,
    ],
  );

  const resetFeeQuote = useCallback(
    (options?: ResetFeeQuoteStateOptions) => {
      resetFeeQuoteState(
        {
          setQuoteData,
          setQuoteError,
          setQuoteLoading,
          setTotalAmount,
          resolvedFeeQuoteKeyRef,
        },
        options,
      );
    },
    [setTotalAmount],
  );

  const markFeeResolved = useCallback(() => {
    hasResolvedFormFeeRef.current = true;
  }, []);

  const resetResolvedFormFee = useCallback(() => {
    hasResolvedFormFeeRef.current = false;
  }, []);

  return {
    quoteData,
    quoteLoading,
    quoteError,
    requestFeeQuote,
    resetFeeQuote,
    markFeeResolved,
    resetResolvedFormFee,
    hasResolvedFormFeeRef,
    resolvedFeeQuoteKeyRef,
  };
};
