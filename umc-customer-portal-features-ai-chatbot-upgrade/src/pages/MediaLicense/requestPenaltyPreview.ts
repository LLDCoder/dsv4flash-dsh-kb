import { useCallback, useRef, useState } from "react";
import type {
  LifecyclePenaltyReference,
} from "@/services/myRequest";
import {
  getPenaltyEvaluate,
  type PenaltyEvaluateEnvelope,
  type PenaltyEvaluateResponse,
} from "@/services/services";
import i18n from "@/localization/config";
import { buildPenaltyEvaluatePayload } from "./penaltyPayload";

type UseMediaLicensePenaltyPreviewParams = {
  serviceCode: string | number | null | undefined;
  applicationId?: number | null;
  rootApplicationId?: number | null;
  applicationNumber?: string | null;
  penaltyFor?: LifecyclePenaltyReference | null;
};

export const useMediaLicensePenaltyPreview = ({
  serviceCode,
  applicationId,
  rootApplicationId,
  applicationNumber,
  penaltyFor,
}: UseMediaLicensePenaltyPreviewParams) => {
  const [penaltyData, setPenaltyData] = useState<PenaltyEvaluateResponse | null>(
    null,
  );
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [penaltyError, setPenaltyError] = useState<string | null>(null);
  const penaltyRequestIdRef = useRef(0);

  const unwrapPenaltyResponse = useCallback(
    (
      response: PenaltyEvaluateResponse | PenaltyEvaluateEnvelope | null | undefined,
    ): PenaltyEvaluateResponse | null => {
      if (!response || typeof response !== "object") {
        return null;
      }

      if ("data" in response && response.data && typeof response.data === "object") {
        return response.data as PenaltyEvaluateResponse;
      }

      return response as PenaltyEvaluateResponse;
    },
    [],
  );

  const resetPenaltyPreview = useCallback(() => {
    setPenaltyData(null);
    setPenaltyLoading(false);
    setPenaltyError(null);
  }, []);

  const requestPenaltyPreview = useCallback(async () => {
    const payload = buildPenaltyEvaluatePayload({
      serviceCode,
      applicationId: rootApplicationId,
      applicationNo: applicationNumber,
      penaltyFor,
    });

    if (!payload) {
      resetPenaltyPreview();
      return false;
    }

    const currentRequestId = penaltyRequestIdRef.current + 1;
    penaltyRequestIdRef.current = currentRequestId;
    setPenaltyData(null);
    setPenaltyLoading(true);
    setPenaltyError(null);

    try {
      const response = await getPenaltyEvaluate(
        payload.request,
        payload.correlationId,
      );

      if (penaltyRequestIdRef.current !== currentRequestId) {
        return false;
      }

      setPenaltyData(unwrapPenaltyResponse(response));
      return true;
    } catch (error: unknown) {
      if (penaltyRequestIdRef.current !== currentRequestId) {
        return false;
      }

      setPenaltyData(null);
      console.error("Penalty evaluation failed:", error);
      setPenaltyError(i18n.t("PenaltyDisplay.unavailable"));
      return false;
    } finally {
      if (penaltyRequestIdRef.current === currentRequestId) {
        setPenaltyLoading(false);
      }
    }
  }, [
    applicationId,
    applicationNumber,
    penaltyFor,
    resetPenaltyPreview,
    rootApplicationId,
    serviceCode,
    unwrapPenaltyResponse,
  ]);

  return {
    penaltyData,
    penaltyLoading,
    penaltyError,
    requestPenaltyPreview,
    resetPenaltyPreview,
  };
};
