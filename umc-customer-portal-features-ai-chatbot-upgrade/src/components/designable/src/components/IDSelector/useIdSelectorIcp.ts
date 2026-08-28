import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NationalityInfo } from "@/services/userProfile";
import {
  getEmiratesIdInfo,
  getNationalityList,
  getPassportInfo,
  getPersonByUnifiedNumber,
} from "@/services/userProfile";
import { resolveIcpResponseErrorMessage } from "@/utils/individualIdentity/icpResponse";
import {
  type IDSelectorValue,
  type IdSelectorType,
  type LookupStateMap,
  type NationalityOption,
  QUERY_FIELD_BY_TYPE,
  INITIAL_LOOKUP_STATE_MAP,
  SUB_FIELD_NAMES,
  getErrorMessage,
  getQuerySignature,
  getQueryValidationErrors,
  isQuerySignatureCurrent,
  isLookupFresh,
  mergeIcpProfileIntoValue,
} from "./idSelectorUtils";
import {
  mergeIcpEmiratesIdExpiryIntoValue,
  shouldAutoRefreshEmiratesIdExpiry,
} from "./expiryRefresh";

interface QueryableSubField {
  setValue?: (value: IDSelectorValue[keyof IDSelectorValue]) => void;
  setFeedback: (feedback: { type: string; code?: string; messages: string[] }) => void;
}

interface QueryableField {
  value?: unknown;
  address: string;
  setValue: (value: IDSelectorValue) => void;
  query: (pattern: string) => { take: () => QueryableSubField | undefined };
}

interface UseIdSelectorIcpParams {
  field: QueryableField;
  current: IDSelectorValue;
  currentType: IdSelectorType;
  autoQueryEnabled?: boolean;
  autoRefreshEmiratesIdExpiry?: boolean;
  onIcpLoadedChange?: (loaded: boolean) => void;
  onValueChange?: (value: IDSelectorValue) => void;
}

const AUTO_QUERY_DELAY_MS = 400;

const ERROR_FALLBACK_KEY_BY_TYPE: Record<IdSelectorType, string> = {
  emiratesId: "IDSelector.validation.loadFailedEmiratesId",
  uid: "IDSelector.validation.loadFailedUid",
  passport: "IDSelector.validation.loadFailedPassport",
};

export const useIdSelectorIcp = ({
  field,
  current,
  currentType,
  autoQueryEnabled = true,
  autoRefreshEmiratesIdExpiry = false,
  onIcpLoadedChange,
  onValueChange,
}: UseIdSelectorIcpParams) => {
  const { t, i18n } = useTranslation();
  const [nationalityList, setNationalityList] = useState<NationalityInfo[]>([]);
  const [lookupStateMap, setLookupStateMap] =
    useState<LookupStateMap>(INITIAL_LOOKUP_STATE_MAP);
  const nationalityListRef = useRef<NationalityInfo[]>([]);
  const controllerRef = useRef<Partial<Record<IdSelectorType, AbortController>>>({});
  const lastQuerySignatureRef = useRef<string>();

  const setFieldError = useCallback(
    (fieldName: keyof IDSelectorValue, message: string) => {
      const subField = field.query(`${field.address}.${fieldName}`).take();
      if (!subField) return;
      subField.setFeedback({
        type: "error",
        code: "icp_error",
        messages: message ? [message] : [],
      });
    },
    [field],
  );

  const syncSubFields = useCallback(
    (nextValue: IDSelectorValue) => {
      SUB_FIELD_NAMES.forEach((fieldName) => {
        const value = nextValue[fieldName];
        if (value === undefined || value === null || value === "") return;

        const subField = field.query(`${field.address}.${fieldName}`).take();
        if (!subField) return;

        subField.setValue?.(value);
        subField.setFeedback({
          type: "error",
          code: "icp_error",
          messages: [],
        });
      });
    },
    [field],
  );

  useEffect(() => {
    syncSubFields(current);
  }, [current, syncSubFields]);

  const setLookupState = useCallback(
    (type: IdSelectorType, nextState: LookupStateMap[IdSelectorType]) => {
      setLookupStateMap((prev) => ({
        ...prev,
        [type]: nextState,
      }));
    },
    [],
  );

  const resetLookupState = useCallback(() => {
    Object.values(controllerRef.current).forEach((controller) => {
      controller?.abort();
    });
    controllerRef.current = {};
    lastQuerySignatureRef.current = undefined;
    setLookupStateMap(INITIAL_LOOKUP_STATE_MAP);
  }, []);

  useEffect(() => {
    const loadNationalityList = async () => {
      try {
        const response = await getNationalityList();
        if (response.data) {
          setNationalityList(response.data);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadNationalityList();
  }, []);

  useEffect(() => {
    nationalityListRef.current = nationalityList;
  }, [nationalityList]);

  useEffect(() => {
    if (
      currentType !== "emiratesId" ||
      !current.nationality ||
      nationalityList.length === 0
    ) {
      return;
    }

    const hasMatchedId = nationalityList.some(
      (nationality) => nationality.id === current.nationality,
    );
    if (hasMatchedId) {
      return;
    }

    const mappedNationalityId = nationalityList.find(
      (nationality) =>
        String(nationality.numericCode) === String(current.nationality),
    )?.id;

    if (!mappedNationalityId) {
      return;
    }

    const nextValue = {
      ...(field.value as IDSelectorValue),
      nationality: mappedNationalityId,
    };

    field.setValue(nextValue);
    onValueChange?.(nextValue);
  }, [current.nationality, currentType, field, nationalityList, onValueChange]);

  useEffect(() => {
    return () => {
      Object.values(controllerRef.current).forEach((controller) => {
        controller?.abort();
      });
    };
  }, []);

  const triggerQuery = useCallback(
    async (type: IdSelectorType) => {
      const signature = getQuerySignature(type, current);
      const queryFieldName = QUERY_FIELD_BY_TYPE[type];
      const fallbackMessage = t(ERROR_FALLBACK_KEY_BY_TYPE[type]);

      setFieldError("dateOfBirth", "");
      setFieldError(queryFieldName, "");

      const validationErrors = getQueryValidationErrors(type, current);
      const hasValidationError = Object.keys(validationErrors).length > 0;
      if (hasValidationError) {
        Object.entries(validationErrors).forEach(([fieldName, message]) => {
          if (message) {
            setFieldError(fieldName as keyof IDSelectorValue, message);
          }
        });
        setLookupState(type, {
          status: "error",
          signature,
          message: validationErrors[queryFieldName],
        });
        return false;
      }

      lastQuerySignatureRef.current = signature;

      controllerRef.current[type]?.abort();
      const controller = new AbortController();
      controllerRef.current[type] = controller;

      setLookupState(type, { status: "loading", signature });

      try {
        const requestConfig = {
          signal: controller.signal,
          skipErrorToast: true,
          customErrorMessage: fallbackMessage,
        };

        let response:
          | { data?: { personProfile?: unknown } }
          | undefined;

        if (type === "emiratesId") {
          response = (await getEmiratesIdInfo(
            String(current.emiratesId || "").replace(/\D/g, ""),
            String(current.dateOfBirth || ""),
            requestConfig,
          )) as { data?: { personProfile?: unknown } };
        } else if (type === "uid") {
          response = (await getPersonByUnifiedNumber(
            String(current.uid || "").replace(/\D/g, ""),
            String(current.dateOfBirth || ""),
            requestConfig,
          )) as { data?: { personProfile?: unknown } };
        } else {
          response = (await getPassportInfo(
            String(current.passportNumber || "").trim(),
            String(current.dateOfBirth || ""),
            requestConfig,
          )) as { data?: { personProfile?: unknown } };
        }

        const personProfile = response?.data?.personProfile;
        if (controllerRef.current[type] !== controller) {
          return false;
        }
        if (
          !isQuerySignatureCurrent(
            type,
            signature,
            (field.value || {}) as IDSelectorValue,
          )
        ) {
          return false;
        }

        if (!personProfile) {
          const message = resolveIcpResponseErrorMessage(
            response,
            i18n.language,
            fallbackMessage,
          );
          setFieldError(queryFieldName, message || fallbackMessage);
          setLookupState(type, {
            status: "error",
            signature,
            message: message || fallbackMessage,
          });
          return false;
        }

        const currentValue = (field.value || {}) as IDSelectorValue;
        const nextValue =
          autoRefreshEmiratesIdExpiry && type === "emiratesId"
            ? mergeIcpEmiratesIdExpiryIntoValue(
                currentValue,
                personProfile as never,
              )
            : mergeIcpProfileIntoValue(
                type,
                currentValue,
                personProfile as never,
                nationalityListRef.current as NationalityOption[],
              );

        if (!nextValue) {
          const message = resolveIcpResponseErrorMessage(
            response,
            i18n.language,
            fallbackMessage,
          );
          setFieldError(queryFieldName, message || fallbackMessage);
          setLookupState(type, {
            status: "error",
            signature,
            message: message || fallbackMessage,
          });
          return false;
        }
        field.setValue(nextValue);
        onValueChange?.(nextValue);
        syncSubFields(nextValue);
        setFieldError(queryFieldName, "");
        setLookupState(type, {
          status: "success",
          signature: getQuerySignature(type, nextValue),
        });
        return true;
      } catch (error) {
        if (controllerRef.current[type] !== controller) {
          return false;
        }
        if (
          !isQuerySignatureCurrent(
            type,
            signature,
            (field.value || {}) as IDSelectorValue,
          )
        ) {
          return false;
        }

        if (
          (error as { code?: string; name?: string })?.code === "ERR_CANCELED" ||
          (error as { code?: string; name?: string })?.name === "CanceledError" ||
          (error as { code?: string; name?: string })?.name === "AbortError"
        ) {
          return false;
        }

        const message = getErrorMessage(error, fallbackMessage);
        setFieldError(queryFieldName, message);
        setLookupState(type, { status: "error", signature, message });
        console.error(`Failed to load ${type} info:`, error);
        return false;
      }
    },
    [
      current,
      autoRefreshEmiratesIdExpiry,
      field,
      i18n.language,
      onValueChange,
      setFieldError,
      setLookupState,
      syncSubFields,
      t,
    ],
  );

  useEffect(() => {
    const shouldRefreshExpiry = shouldAutoRefreshEmiratesIdExpiry(
      autoRefreshEmiratesIdExpiry,
      currentType,
      current,
    );

    if ((!autoQueryEnabled && !shouldRefreshExpiry) || currentType === "passport") {
      lastQuerySignatureRef.current = undefined;
      return;
    }

    const validationErrors = getQueryValidationErrors(currentType, current);
    if (Object.keys(validationErrors).length > 0) {
      lastQuerySignatureRef.current = undefined;
      return;
    }

    const signature = getQuerySignature(currentType, current);
    const lookupState = lookupStateMap[currentType];
    const isCurrentQueryLoading =
      lookupState.status === "loading" && lookupState.signature === signature;

    if (
      isCurrentQueryLoading ||
      (!shouldRefreshExpiry &&
        isLookupFresh(currentType, lookupState, current)) ||
      lastQuerySignatureRef.current === signature
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void triggerQuery(currentType);
    }, AUTO_QUERY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    autoQueryEnabled,
    autoRefreshEmiratesIdExpiry,
    current,
    currentType,
    lookupStateMap,
    triggerQuery,
  ]);

  const isIcpInfoLoaded = isLookupFresh(
    currentType,
    lookupStateMap[currentType],
    current,
  );

  useEffect(() => {
    if (typeof onIcpLoadedChange !== "function") return;
    if (currentType === "passport") {
      onIcpLoadedChange(true);
      return;
    }
    onIcpLoadedChange(isIcpInfoLoaded);
  }, [currentType, isIcpInfoLoaded, onIcpLoadedChange]);

  return {
    nationalityList,
    lookupStateMap,
    isIcpInfoLoaded,
    triggerQuery,
    resetLookupState,
    setFieldError,
  };
};

export default useIdSelectorIcp;
