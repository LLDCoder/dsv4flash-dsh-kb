import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  getApplicationLifecycleActivities,
  type LifecycleActivityContext,
} from "@/services/myRequest";

export type LifecycleDetailResolutionResult = {
  resolvedApplicationId: number;
  lifecycleActivityContext: LifecycleActivityContext | null;
  lifecycleRequestSourceApplicationId: number | null;
};

type UseLifecycleDetailResolverParams = {
  serviceCode: string | number | null | undefined;
  lifecycleSourceApplicationId: number;
  permitLifecycleLicensePermitNo?: string | null;
  lifecycleActivityLoadErrorMessage: string;
  isLifecycleActivityServiceCode: (serviceCode: unknown) => boolean;
  setLifecycleActivityLoading: Dispatch<SetStateAction<boolean>>;
  setLifecycleActivityError: Dispatch<SetStateAction<string>>;
  setLifecycleActivityContext: Dispatch<
    SetStateAction<LifecycleActivityContext | null>
  >;
};

type FetchLifecycleActivityContextOptions = {
  licensePermitNo?: string | null;
  targetServiceCode?: string | number | null;
};

export const useLifecycleDetailResolver = ({
  serviceCode,
  lifecycleSourceApplicationId,
  permitLifecycleLicensePermitNo,
  lifecycleActivityLoadErrorMessage,
  isLifecycleActivityServiceCode,
  setLifecycleActivityLoading,
  setLifecycleActivityError,
  setLifecycleActivityContext,
}: UseLifecycleDetailResolverParams) => {
  const fetchLifecycleActivityContextBySourceApplicationId = useCallback(
    async (
      sourceApplicationId: number,
      options?: FetchLifecycleActivityContextOptions,
    ) => {
      const normalizedServiceCode = String(
        options?.targetServiceCode ?? serviceCode ?? "",
      );
      const requestLicensePermitNo =
        options !== undefined
          ? options.licensePermitNo ?? null
          : permitLifecycleLicensePermitNo;
      const lifecycleResponse = await getApplicationLifecycleActivities(
        sourceApplicationId,
        normalizedServiceCode,
        requestLicensePermitNo,
      );

      return (lifecycleResponse.data || null) as LifecycleActivityContext | null;
    },
    [permitLifecycleLicensePermitNo, serviceCode],
  );

  const resolveLifecycleDetailRequest = useCallback(
    async (
      fallbackApplicationId: number,
      options?: {
        syncLifecycleState?: boolean;
      },
    ): Promise<LifecycleDetailResolutionResult> => {
      const normalizedFallbackApplicationId = Number(fallbackApplicationId);
      const normalizedServiceCode = String(serviceCode || "");
      const hasLifecycleLicensePermitNo =
        permitLifecycleLicensePermitNo !== null &&
        permitLifecycleLicensePermitNo !== undefined &&
        permitLifecycleLicensePermitNo !== "";
      const shouldResolveLifecycleDetail =
        isLifecycleActivityServiceCode(normalizedServiceCode) &&
        lifecycleSourceApplicationId > 0 &&
        hasLifecycleLicensePermitNo;

      if (!shouldResolveLifecycleDetail) {
        return {
          resolvedApplicationId: normalizedFallbackApplicationId,
          lifecycleActivityContext: null,
          lifecycleRequestSourceApplicationId: null,
        };
      }

      if (options?.syncLifecycleState) {
        setLifecycleActivityLoading(true);
        setLifecycleActivityError("");
        setLifecycleActivityContext(null);
      }

      let nextLifecycleActivityContext: LifecycleActivityContext | null = null;
      const resolvedApplicationId = normalizedFallbackApplicationId;

      try {
        nextLifecycleActivityContext =
          await fetchLifecycleActivityContextBySourceApplicationId(
            lifecycleSourceApplicationId,
          );

        if (options?.syncLifecycleState) {
          setLifecycleActivityContext(nextLifecycleActivityContext);
        }
      } catch (error) {
        console.error("Failed to load lifecycle activities:", error);

        if (options?.syncLifecycleState) {
          setLifecycleActivityError(lifecycleActivityLoadErrorMessage);
        }
      } finally {
        if (options?.syncLifecycleState) {
          setLifecycleActivityLoading(false);
        }
      }

      return {
        resolvedApplicationId,
        lifecycleActivityContext: nextLifecycleActivityContext,
        lifecycleRequestSourceApplicationId: lifecycleSourceApplicationId,
      };
    },
    [
      fetchLifecycleActivityContextBySourceApplicationId,
      isLifecycleActivityServiceCode,
      lifecycleActivityLoadErrorMessage,
      lifecycleSourceApplicationId,
      permitLifecycleLicensePermitNo,
      serviceCode,
      setLifecycleActivityContext,
      setLifecycleActivityError,
      setLifecycleActivityLoading,
    ],
  );

  return {
    fetchLifecycleActivityContextBySourceApplicationId,
    resolveLifecycleDetailRequest,
  };
};
