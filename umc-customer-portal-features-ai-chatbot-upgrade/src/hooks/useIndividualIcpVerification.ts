import { useState, useRef, useCallback, useEffect, type MutableRefObject } from "react";
import moment from "moment";
import type { FormInstance } from "antd/lib/form";
import i18n from "@/localization/config";
import type { NationalityInfo } from "@/services/userProfile";
import {
  checkPersonalIdentityAvailable,
  getEmiratesIdInfo,
  getPassportInfo,
  getPersonByEIDandBirthDate,
  getPersonalProfileEmiratesIdInfo,
  getPersonalProfilePersonByUnifiedNumber,
  getPersonByUnifiedNumber,
} from "@/services/userProfile";
import {
  extractPrimaryIcpAddressContact,
  extractIcpPersonProfile,
  filterIcpMappingToProfileMatchedFields,
  getIcpMappedIndividualFieldValues,
  mergeSwitchFallbackValuesIntoIcpMapping,
  mapIcpPersonToIndividualFormFields,
  type IcpAddressContactInfo,
} from "@/pages/PersonalProfile/utils/icpPersonToForm";
import {
  getIdFieldForVerificationMethod,
  isVerificationInputReady,
  type IndividualIdentityFieldName,
  type VerificationMethod,
  VERIFICATION_METHOD,
} from "@/utils/individualIdentity";
import { resolveIcpResponseErrorMessage } from "@/utils/individualIdentity/icpResponse";
import {
  canRunIdentityVerification,
  shouldReuseCompletedIdentityVerification,
} from "@/pages/PersonalProfile/utils/submissionPolicy";

function getPersonLookupErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg === "-1" || msg === "\u200b") return undefined;
    if (msg && !/^Request failed with status code \d+$/i.test(msg)) return msg;
  }
  const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  const m = data?.message;
  if (typeof m === "string" && m.trim() === "-1") return undefined;
  return typeof m === "string" && m.trim() ? m.trim() : undefined;
}

function isIcpRegisteredAccountMessage(message: unknown): boolean {
  if (typeof message === "number") return message === -1;
  if (typeof message === "string") return message.trim() === "-1";
  return false;
}

function isLinkedAccountResponse(body: unknown): boolean {
  if (body === -1 || body === "-1") return true;
  const envelope = body as { data?: unknown; message?: unknown } | undefined;
  const data = envelope?.data;
  const message = envelope?.message;
  const type =
    data != null && typeof data === "object"
      ? (data as { type?: unknown }).type
      : undefined;
  return (
    Number(type) === 2 ||
    data === -1 ||
    data === "-1" ||
    message === -1 ||
    message === "-1"
  );
}

function getSuccessfulResponseMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | undefined)?.message;
  return typeof message === "string" && message.trim() ? message.trim() : undefined;
}

function isPassportNumberAlreadyLinkedMessage(message: unknown): boolean {
  return (
    typeof message === "string" &&
    /this\s+passport\s+number\s+is\s+already\s+linked\s+to\s+another\s+account\.?/i.test(
      message.trim(),
    )
  );
}

function getBooleanVerificationResult(body: unknown): boolean | undefined {
  const data = (body as { data?: unknown } | undefined)?.data;
  return typeof data === "boolean" ? data : undefined;
}

function isAbortError(e: unknown) {
  return (
    (e as { code?: string }).code === "ERR_CANCELED" ||
    (e as { name?: string }).name === "CanceledError" ||
    (e as { name?: string }).name === "AbortError"
  );
}

export type IndividualIcpContext = "personalProfile" | "partnerModal";

export interface UseIndividualIcpVerificationOptions {
  form: FormInstance;
  verificationMethod: VerificationMethod;
  nationalityList: NationalityInfo[];
  context: IndividualIcpContext;
  isAddMode?: boolean;
  isEditWithInitialData?: boolean;
  enablePassportIcp?: boolean;
  /** Detail page with `isGethirdPartyApi`: re-sync ICP and keep matched fields readonly. */
  detailThirdPartyIcpEnabled?: boolean;
  /** Pending completion detail page: allow DOB blur to re-run ICP against loaded identity. */
  detailManualVerificationEnabled?: boolean;
  icpVerificationFailedMessage?: string;
  onEmiratesIdRegistered?: () => void;
  onAddressSelection?: (selection: { emirateId?: number; regionId?: number }) => void;
  onVerificationComplete?: (complete: boolean) => void;
  onIcpVerified?: () => void;
  /** Passport availability reported that the OCR passport is linked to another account. */
  onPassportIdentityUnavailable?: () => void;
  onCheckFormValidity?: () => void;
  onVerificationAttemptComplete?: (complete: boolean) => void;
  getEditSessionReadonlyFields?: () => string[];
  getSwitchFallbackValues?: () => Record<string, unknown>;
}

export interface UseIndividualIcpVerificationResult {
  verificationLoading: boolean;
  initialVerificationComplete: boolean;
  setInitialVerificationComplete: (v: boolean) => void;
  icpReadonlyFieldNames: string[];
  icpAddressContact: IcpAddressContactInfo;
  resetIcpReadonlyFields: () => void;
  clearIcpMappedFields: () => void;
  onVerificationBlur: () => void;
  verifyCurrentIdentity: () => Promise<IdentityVerificationSubmitContext>;
  isGethirdPartyApi: boolean;
  buildIcpLookupSignature: (allValues: Record<string, unknown>) => string;
  icpLookupSignatureRef: MutableRefObject<string | null>;
}

export interface IdentityVerificationSubmitContext {
  succeeded: boolean;
  isGethirdPartyApi: boolean;
  icpAddressContact: IcpAddressContactInfo;
}

export function useIndividualIcpVerification(
  options: UseIndividualIcpVerificationOptions,
): UseIndividualIcpVerificationResult {
  const {
    form,
    verificationMethod,
    nationalityList,
    context,
    isAddMode = false,
    isEditWithInitialData = false,
    enablePassportIcp = false,
    detailThirdPartyIcpEnabled = false,
    detailManualVerificationEnabled = false,
    icpVerificationFailedMessage,
    onEmiratesIdRegistered,
    onAddressSelection,
    onVerificationComplete,
    onIcpVerified,
    onPassportIdentityUnavailable,
    onCheckFormValidity,
    onVerificationAttemptComplete,
    getEditSessionReadonlyFields,
    getSwitchFallbackValues,
  } = options;

  const [verificationLoading, setVerificationLoading] = useState(false);
  const [initialVerificationComplete, setInitialVerificationComplete] = useState(false);
  const [icpReadonlyFieldNames, setIcpReadonlyFieldNames] = useState<string[]>([]);
  const [isGethirdPartyApi, setIsGethirdPartyApi] = useState(false);
  const [icpAddressContact, setIcpAddressContact] = useState<IcpAddressContactInfo>({});
  const isGethirdPartyApiRef = useRef(false);
  const icpAddressContactRef = useRef<IcpAddressContactInfo>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icpAbortRef = useRef<AbortController | null>(null);
  const icpLookupSignatureRef = useRef<string | null>(null);
  const icpLookupRequestRef = useRef<{
    signature: string;
    promise: Promise<boolean>;
  } | null>(null);

  const updateIsGethirdPartyApi = useCallback((value: boolean) => {
    isGethirdPartyApiRef.current = value;
    setIsGethirdPartyApi(value);
  }, []);

  const updateIcpAddressContact = useCallback((value: IcpAddressContactInfo) => {
    icpAddressContactRef.current = value;
    setIcpAddressContact(value);
  }, []);

  const resetIcpReadonlyFields = useCallback(() => {
    icpAbortRef.current?.abort();
    icpAbortRef.current = null;
    icpLookupRequestRef.current = null;
    setIcpReadonlyFieldNames([]);
    updateIsGethirdPartyApi(false);
    updateIcpAddressContact({});
    icpLookupSignatureRef.current = null;
  }, [updateIcpAddressContact, updateIsGethirdPartyApi]);

  const clearIcpMappedFields = useCallback(() => {
    form.setFieldsValue(getIcpMappedIndividualFieldValues());
  }, [form]);

  const applySwitchFallbackValuesToForm = useCallback(
    (currentMethod: VerificationMethod): boolean => {
      if (!getSwitchFallbackValues) return false;
      const fallbackMapping = mergeSwitchFallbackValuesIntoIcpMapping(
        {
          values: {},
          readonlyFieldNames: [],
          addressSelection: undefined,
        },
        getSwitchFallbackValues(),
        currentMethod,
      );

      if (Object.keys(fallbackMapping.values).length === 0) {
        return false;
      }

      form.setFieldsValue(fallbackMapping.values);
      if (fallbackMapping.addressSelection?.emirateId !== undefined) {
        onAddressSelection?.({ emirateId: fallbackMapping.addressSelection.emirateId });
      }
      if (fallbackMapping.addressSelection?.regionId !== undefined) {
        onAddressSelection?.({ regionId: fallbackMapping.addressSelection.regionId });
      }
      return true;
    },
    [form, getSwitchFallbackValues, onAddressSelection],
  );

  useEffect(() => {
    if (isAddMode) {
      resetIcpReadonlyFields();
    } else if (!detailThirdPartyIcpEnabled) {
      resetIcpReadonlyFields();
    }
  }, [verificationMethod, isAddMode, detailThirdPartyIcpEnabled, resetIcpReadonlyFields]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      icpAbortRef.current?.abort();
      icpLookupRequestRef.current = null;
    };
  }, []);

  const buildIcpLookupSignature = useCallback((allValues: Record<string, unknown>) => {
    const vm = Number(allValues.verificationMethod ?? verificationMethod);
    const dob = allValues.dateOfBirth;
    const dateOfBirthIso =
      moment.isMoment(dob) && dob.isValid() ? dob.format("YYYY-MM-DD") : "";
    let idDigits = "";
    if (vm === VERIFICATION_METHOD.EMIRATES_ID) {
      idDigits = String(allValues.emiratesId || "").replace(/\D/g, "");
    } else if (vm === VERIFICATION_METHOD.UID) {
      idDigits = String(allValues.uidNumber || "").replace(/\D/g, "");
    }
    return `${vm}|${dateOfBirthIso}|${idDigits}`;
  }, [verificationMethod]);

  const applyEmiratesIdAlreadyLinkedError = useCallback(() => {
    onEmiratesIdRegistered?.();
    form.setFields([
      {
        name: "emiratesId",
        errors: ["\u200b"],
      },
    ]);
  }, [form, onEmiratesIdRegistered]);

  const applyIcpVerificationFieldError = useCallback(
    (
      method: VerificationMethod,
      error: unknown,
      fieldOverride?: IndividualIdentityFieldName,
    ) => {
      const idField = fieldOverride ?? getIdFieldForVerificationMethod(method);
      const resBody = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
      const rawMessage = resBody?.message ?? (error instanceof Error ? error.message : undefined);

      if (isIcpRegisteredAccountMessage(rawMessage)) {
        if (idField === "emiratesId") {
          applyEmiratesIdAlreadyLinkedError();
        } else {
          onEmiratesIdRegistered?.();
          form.setFields([{ name: idField, errors: ["\u200b"] }]);
        }
        return;
      }

      const apiMsg = getPersonLookupErrorMessage(error);
      form.setFields([
        {
          name: idField,
          errors: [apiMsg || icpVerificationFailedMessage || "Verification failed."],
        },
      ]);
    },
    [
      applyEmiratesIdAlreadyLinkedError,
      form,
      icpVerificationFailedMessage,
      onEmiratesIdRegistered,
    ],
  );

  const fetchIcpAndApplyForm = useCallback(
    async (
      currentMethod: VerificationMethod,
      idForApi: string,
      dateOfBirthIso: string,
      runOpts?: {
        detailAutoSyncFromLoadedForm?: boolean;
        surfaceErrorsOnIdField?: boolean;
        errorFieldName?: IndividualIdentityFieldName;
        isSubmitAttempt?: boolean;
        forceFreshRequest?: boolean;
      },
    ): Promise<boolean> => {
      const detailAutoSyncFromLoadedForm =
        runOpts?.detailAutoSyncFromLoadedForm === true;
      const canRunEditManualVerification =
        !isAddMode &&
        (detailThirdPartyIcpEnabled || detailManualVerificationEnabled);
      const canRunIcp =
        canRunIdentityVerification({
          isAddMode,
          detailAutoSyncFromLoadedForm,
          isEditWithInitialData,
          canRunEditManualVerification,
          isSubmitAttempt: runOpts?.isSubmitAttempt === true,
        }) &&
        dateOfBirthIso &&
        idForApi;

      if (!canRunIcp) return false;

      const requestSignature = `${currentMethod}|${dateOfBirthIso}|${idForApi}`;
      if (
        shouldReuseCompletedIdentityVerification(
          icpLookupSignatureRef.current === requestSignature,
          runOpts?.forceFreshRequest === true,
        )
      ) {
        return true;
      }
      if (icpLookupRequestRef.current?.signature === requestSignature) {
        return icpLookupRequestRef.current.promise;
      }

      if (!detailAutoSyncFromLoadedForm) updateIsGethirdPartyApi(false);

      icpAbortRef.current?.abort();
      const controller = new AbortController();
      icpAbortRef.current = controller;
      const { signal } = controller;

      const requestOpts = {
        signal,
        skipErrorToast: true,
        customErrorMessage: true,
      };
      const usePersonalProfileEndpoints =
        context === "personalProfile" && isAddMode;

      const gatesAddVerification =
        isAddMode &&
        !detailAutoSyncFromLoadedForm &&
        !isEditWithInitialData &&
        (currentMethod === VERIFICATION_METHOD.EMIRATES_ID ||
          currentMethod === VERIFICATION_METHOD.UID ||
          (currentMethod === VERIFICATION_METHOD.PASSPORT && enablePassportIcp));
      const gatesDetailVerification =
        canRunEditManualVerification &&
        !isAddMode &&
        !detailAutoSyncFromLoadedForm &&
        (currentMethod === VERIFICATION_METHOD.EMIRATES_ID ||
          currentMethod === VERIFICATION_METHOD.UID);
      const shouldSurfaceFieldError =
        gatesAddVerification ||
        (context === "partnerModal" && isAddMode) ||
        runOpts?.surfaceErrorsOnIdField === true;

      if (
        gatesAddVerification ||
        gatesDetailVerification ||
        (context === "partnerModal" && isAddMode)
      ) {
        setVerificationLoading(true);
      }

      const requestPromise = (async () => {
        try {
          let body: unknown;
          if (currentMethod === VERIFICATION_METHOD.EMIRATES_ID) {
            if (
              usePersonalProfileEndpoints &&
              isAddMode &&
              !detailAutoSyncFromLoadedForm &&
              !isEditWithInitialData
            ) {
              const linkedAccountBody = await getPersonByEIDandBirthDate(
                idForApi,
                dateOfBirthIso,
                requestOpts,
              );

              if (signal.aborted || icpAbortRef.current !== controller) return false;

              if (isLinkedAccountResponse(linkedAccountBody)) {
                updateIsGethirdPartyApi(false);
                setIcpReadonlyFieldNames([]);
                updateIcpAddressContact({});
                icpLookupSignatureRef.current = null;
                applyEmiratesIdAlreadyLinkedError();
                onCheckFormValidity?.();
                return false;
              }
            }

            body = usePersonalProfileEndpoints
              ? await getPersonalProfileEmiratesIdInfo(
                  idForApi,
                  dateOfBirthIso,
                  requestOpts,
                )
              : await getEmiratesIdInfo(idForApi, dateOfBirthIso, requestOpts);
          } else if (currentMethod === VERIFICATION_METHOD.UID) {
            body = usePersonalProfileEndpoints
              ? await getPersonalProfilePersonByUnifiedNumber(
                  idForApi,
                  dateOfBirthIso,
                  requestOpts,
                )
              : await getPersonByUnifiedNumber(idForApi, dateOfBirthIso, requestOpts);
          } else if (
            currentMethod === VERIFICATION_METHOD.PASSPORT &&
            enablePassportIcp &&
            !detailAutoSyncFromLoadedForm
          ) {
            body = await checkPersonalIdentityAvailable(idForApi, requestOpts);
          } else if (
            currentMethod === VERIFICATION_METHOD.PASSPORT &&
            detailAutoSyncFromLoadedForm
          ) {
            body = await getPassportInfo(idForApi, dateOfBirthIso, requestOpts);
          } else {
            return false;
          }

          if (signal.aborted || icpAbortRef.current !== controller) return false;

          if (
            currentMethod === VERIFICATION_METHOD.PASSPORT &&
            isAddMode &&
            !detailAutoSyncFromLoadedForm &&
            enablePassportIcp
          ) {
            const verified = getBooleanVerificationResult(body);
            if (verified === false) {
              updateIsGethirdPartyApi(false);
              updateIcpAddressContact({});
              if (
                !runOpts?.isSubmitAttempt &&
                isPassportNumberAlreadyLinkedMessage(
                  getSuccessfulResponseMessage(body),
                )
              ) {
                onPassportIdentityUnavailable?.();
              }
              form.setFields([
                {
                  name: getIdFieldForVerificationMethod(currentMethod),
                  errors: [
                    getSuccessfulResponseMessage(body) ||
                      icpVerificationFailedMessage ||
                      "Verification failed.",
                  ],
                },
              ]);
              onCheckFormValidity?.();
              return false;
            }

            if (verified === true) {
              updateIsGethirdPartyApi(false);
              setIcpReadonlyFieldNames([]);
              updateIcpAddressContact({});
              applySwitchFallbackValuesToForm(currentMethod);
              icpLookupSignatureRef.current = `${currentMethod}|${dateOfBirthIso}|${idForApi}`;
              form.setFields([
                {
                  name: getIdFieldForVerificationMethod(currentMethod),
                  errors: [],
                },
              ]);
              onCheckFormValidity?.();
              return true;
            }
          }

          const personProfile = extractIcpPersonProfile(body);
          if (!personProfile) {
            updateIsGethirdPartyApi(false);
            setIcpReadonlyFieldNames([]);
            updateIcpAddressContact({});
            if (shouldSurfaceFieldError) {
              const responseMessage = resolveIcpResponseErrorMessage(
                body,
                i18n.language,
              );
              form.setFields([
                {
                  name:
                    runOpts?.errorFieldName ??
                    getIdFieldForVerificationMethod(currentMethod),
                  errors: [
                    responseMessage ||
                      icpVerificationFailedMessage ||
                      "Verification failed.",
                  ],
                },
              ]);
            }
            onCheckFormValidity?.();
            return false;
          }

          const mapIsAddMode = isAddMode && !detailAutoSyncFromLoadedForm;
          let { values, readonlyFieldNames, addressSelection } =
            mapIcpPersonToIndividualFormFields(
              personProfile,
              currentMethod,
              nationalityList,
              { isAddMode: mapIsAddMode },
            );

          if (detailAutoSyncFromLoadedForm) {
            const snapshot = form.getFieldsValue();
            ({ values, readonlyFieldNames, addressSelection } = filterIcpMappingToProfileMatchedFields(
              { values, readonlyFieldNames, addressSelection },
              snapshot,
            ));
          }

          if (!detailAutoSyncFromLoadedForm && getSwitchFallbackValues) {
            ({ values, readonlyFieldNames, addressSelection } =
              mergeSwitchFallbackValuesIntoIcpMapping(
                {
                  values,
                  readonlyFieldNames,
                  addressSelection,
                },
                getSwitchFallbackValues(),
                currentMethod,
              ));
          }

          const editSessionLocks = getEditSessionReadonlyFields?.() ?? [];
          const mergedReadonly = [...new Set([...readonlyFieldNames, ...editSessionLocks])];

          const mappedSomething =
            Object.keys(values).length > 0 || mergedReadonly.length > 0;
          const usedPersonEndpoint =
            currentMethod === VERIFICATION_METHOD.EMIRATES_ID ||
            currentMethod === VERIFICATION_METHOD.UID;
          const shouldUsePersonalProfileAddressContact =
            usePersonalProfileEndpoints &&
            currentMethod === VERIFICATION_METHOD.EMIRATES_ID;
          updateIcpAddressContact(
            shouldUsePersonalProfileAddressContact
              ? extractPrimaryIcpAddressContact(personProfile)
              : {},
          );

          if (detailAutoSyncFromLoadedForm) {
            updateIsGethirdPartyApi(mappedSomething);
          } else {
            updateIsGethirdPartyApi(usedPersonEndpoint && mappedSomething);
          }

          if (Object.keys(values).length > 0) {
            form.setFieldsValue(values);
          }
          if (addressSelection?.emirateId !== undefined) {
            onAddressSelection?.({ emirateId: addressSelection.emirateId });
          }
          if (addressSelection?.regionId !== undefined) {
            onAddressSelection?.({ regionId: addressSelection.regionId });
          }
          if (mergedReadonly.length > 0) {
            setIcpReadonlyFieldNames(mergedReadonly);
          } else {
            setIcpReadonlyFieldNames([]);
          }

          icpLookupSignatureRef.current = `${currentMethod}|${dateOfBirthIso}|${idForApi}`;
          form.setFields([{ name: getIdFieldForVerificationMethod(currentMethod), errors: [] }]);
          onIcpVerified?.();
          onCheckFormValidity?.();
          return true;
        } catch (e) {
          if (isAbortError(e)) return false;
          console.warn("[IndividualIcp] person lookup failed:", e);
          updateIsGethirdPartyApi(false);
          setIcpReadonlyFieldNames([]);
          updateIcpAddressContact({});
          icpLookupSignatureRef.current = null;
          if (
            currentMethod === VERIFICATION_METHOD.PASSPORT &&
            isAddMode &&
            enablePassportIcp &&
            !runOpts?.isSubmitAttempt &&
            isPassportNumberAlreadyLinkedMessage(getPersonLookupErrorMessage(e))
          ) {
            onPassportIdentityUnavailable?.();
          }
          if (shouldSurfaceFieldError) {
            applyIcpVerificationFieldError(
              currentMethod,
              e,
              runOpts?.errorFieldName,
            );
          }
          onCheckFormValidity?.();
          return false;
        } finally {
          if (icpAbortRef.current === controller) {
            setVerificationLoading(false);
          }
        }
      })();

      icpLookupRequestRef.current = {
        signature: requestSignature,
        promise: requestPromise,
      };

      try {
        return await requestPromise;
      } finally {
        if (icpLookupRequestRef.current?.promise === requestPromise) {
          icpLookupRequestRef.current = null;
        }
      }
    },
    [
      isAddMode,
      isEditWithInitialData,
      detailThirdPartyIcpEnabled,
      detailManualVerificationEnabled,
      context,
      enablePassportIcp,
      applyEmiratesIdAlreadyLinkedError,
      form,
      nationalityList,
      icpVerificationFailedMessage,
      getEditSessionReadonlyFields,
      getSwitchFallbackValues,
      applySwitchFallbackValuesToForm,
      onAddressSelection,
      onIcpVerified,
      onPassportIdentityUnavailable,
      onCheckFormValidity,
      onVerificationAttemptComplete,
      applyIcpVerificationFieldError,
      updateIcpAddressContact,
      updateIsGethirdPartyApi,
    ],
  );

  const runVerification = useCallback(async (isSubmitAttempt = false): Promise<boolean> => {
    if (isEditWithInitialData && context === "partnerModal") {
      const values = form.getFieldsValue([
        "verificationMethod",
        "dateOfBirth",
        "emiratesId",
        "uidNumber",
      ]);
      const vm = Number(values.verificationMethod) as VerificationMethod;
      if (vm !== VERIFICATION_METHOD.EMIRATES_ID && vm !== VERIFICATION_METHOD.UID) {
        const applied = applySwitchFallbackValuesToForm(vm);
        onCheckFormValidity?.();
        return applied;
      }

      const dob = values.dateOfBirth;
      const dateOfBirthIso =
        moment.isMoment(dob) && dob.isValid() ? dob.format("YYYY-MM-DD") : "";
      const idForApi =
        vm === VERIFICATION_METHOD.EMIRATES_ID
          ? String(values.emiratesId || "").replace(/\D/g, "")
          : String(values.uidNumber || "").replace(/\D/g, "");

      return fetchIcpAndApplyForm(vm, idForApi, dateOfBirthIso, {
        isSubmitAttempt,
        forceFreshRequest: isSubmitAttempt,
      });
    }

    if (!isAddMode && detailManualVerificationEnabled) {
      const values = form.getFieldsValue([
        "verificationMethod",
        "dateOfBirth",
        "emiratesId",
        "uidNumber",
      ]);
      const vm = Number(values.verificationMethod ?? verificationMethod) as VerificationMethod;
      const dob = values.dateOfBirth;

      const ready = isVerificationInputReady(vm, dob, values);
      if (!ready) {
        resetIcpReadonlyFields();
        setInitialVerificationComplete(false);
        onVerificationComplete?.(false);
        return false;
      }

      const dateOfBirthIso =
        moment.isMoment(dob) && dob.isValid() ? dob.format("YYYY-MM-DD") : "";
      const idForApi =
        vm === VERIFICATION_METHOD.EMIRATES_ID
          ? String(values.emiratesId || "").replace(/\D/g, "")
          : String(values.uidNumber || "").replace(/\D/g, "");
      const lookupSignature = `${vm}|${dateOfBirthIso}|${idForApi}`;

      if (icpLookupRequestRef.current?.signature === lookupSignature) {
        const verified = await icpLookupRequestRef.current.promise;
        setInitialVerificationComplete(verified);
        onVerificationComplete?.(verified);
        return verified;
      }

      if (
        shouldReuseCompletedIdentityVerification(
          icpLookupSignatureRef.current === lookupSignature,
          isSubmitAttempt,
        )
      ) {
        setInitialVerificationComplete(true);
        onVerificationComplete?.(true);
        onCheckFormValidity?.();
        return true;
      }

      resetIcpReadonlyFields();
      setInitialVerificationComplete(false);
      onVerificationComplete?.(false);

      const verified = await fetchIcpAndApplyForm(vm, idForApi, dateOfBirthIso, {
        detailAutoSyncFromLoadedForm: true,
        surfaceErrorsOnIdField: true,
        errorFieldName: getIdFieldForVerificationMethod(vm),
        isSubmitAttempt,
        forceFreshRequest: isSubmitAttempt,
      });
      setInitialVerificationComplete(verified);
      onVerificationComplete?.(verified);
      onVerificationAttemptComplete?.(verified);
      return verified;
    }

    if (isEditWithInitialData) return true;

    const values = form.getFieldsValue([
      "verificationMethod",
      "dateOfBirth",
      "emiratesId",
      "uidNumber",
      "passportNumber",
    ]);
    const vm = Number(values.verificationMethod ?? verificationMethod) as VerificationMethod;
    const dob = values.dateOfBirth;

    const ready = isVerificationInputReady(vm, dob, values);
    if (!ready) {
      setInitialVerificationComplete(false);
      onVerificationComplete?.(false);
      return false;
    }

    if (vm === VERIFICATION_METHOD.EMIRATES_ID || vm === VERIFICATION_METHOD.UID) {
      const dateOfBirthIso =
        moment.isMoment(dob) && dob.isValid() ? dob.format("YYYY-MM-DD") : "";
      const idForApi =
        vm === VERIFICATION_METHOD.EMIRATES_ID
          ? String(values.emiratesId || "").replace(/\D/g, "")
          : String(values.uidNumber || "").replace(/\D/g, "");
      const lookupSignature = `${vm}|${dateOfBirthIso}|${idForApi}`;

      if (icpLookupRequestRef.current?.signature === lookupSignature) {
        const verified = await icpLookupRequestRef.current.promise;
        setInitialVerificationComplete(verified);
        onVerificationComplete?.(verified);
        return verified;
      }

      if (
        shouldReuseCompletedIdentityVerification(
          icpLookupSignatureRef.current === lookupSignature,
          isSubmitAttempt,
        )
      ) {
        setInitialVerificationComplete(true);
        onVerificationComplete?.(true);
        onCheckFormValidity?.();
        return true;
      }

      resetIcpReadonlyFields();
      if (isAddMode && !isSubmitAttempt) {
        clearIcpMappedFields();
      }
      setInitialVerificationComplete(false);
      onVerificationComplete?.(false);

      const verified = await fetchIcpAndApplyForm(
        vm,
        idForApi,
        dateOfBirthIso,
        isAddMode
          ? {
              isSubmitAttempt,
              forceFreshRequest: isSubmitAttempt,
            }
          : {
              detailAutoSyncFromLoadedForm: true,
              surfaceErrorsOnIdField: true,
              errorFieldName: getIdFieldForVerificationMethod(vm),
              isSubmitAttempt,
              forceFreshRequest: isSubmitAttempt,
            },
      );
      setInitialVerificationComplete(verified);
      onVerificationComplete?.(verified);
      return verified;
    }

    if (
      vm === VERIFICATION_METHOD.PASSPORT &&
      (enablePassportIcp || !isAddMode)
    ) {
      const dateOfBirthIso =
        moment.isMoment(dob) && dob.isValid() ? dob.format("YYYY-MM-DD") : "";
      const passport = String(values.passportNumber || "").trim();
      const lookupSignature = `${vm}|${dateOfBirthIso}|${passport}`;

      if (icpLookupRequestRef.current?.signature === lookupSignature) {
        const verified = await icpLookupRequestRef.current.promise;
        setInitialVerificationComplete(verified);
        onVerificationComplete?.(verified);
        return verified;
      }

      if (
        shouldReuseCompletedIdentityVerification(
          icpLookupSignatureRef.current === lookupSignature,
          isSubmitAttempt,
        )
      ) {
        setInitialVerificationComplete(true);
        onVerificationComplete?.(true);
        onCheckFormValidity?.();
        return true;
      }

      resetIcpReadonlyFields();
      if (isAddMode && !isSubmitAttempt) {
        clearIcpMappedFields();
      }
      setInitialVerificationComplete(false);
      onVerificationComplete?.(false);

      const verified = await fetchIcpAndApplyForm(
        vm,
        passport,
        dateOfBirthIso,
        isAddMode
          ? {
              isSubmitAttempt,
              forceFreshRequest: isSubmitAttempt,
            }
          : {
              detailAutoSyncFromLoadedForm: true,
              surfaceErrorsOnIdField: true,
              errorFieldName: "passportNumber",
              isSubmitAttempt,
              forceFreshRequest: isSubmitAttempt,
            },
      );
      setInitialVerificationComplete(verified);
      onVerificationComplete?.(verified);
      return verified;
    }

    setInitialVerificationComplete(true);
    onVerificationComplete?.(true);
    applySwitchFallbackValuesToForm(vm);
    onCheckFormValidity?.();

    if (enablePassportIcp) {
      const dateOfBirthIso =
        moment.isMoment(dob) && dob.isValid() ? dob.format("YYYY-MM-DD") : "";
      const passport = String(values.passportNumber || "").trim();
      if (dateOfBirthIso && passport) {
        void fetchIcpAndApplyForm(vm, passport, dateOfBirthIso);
      }
    }
    return true;
  }, [
    isEditWithInitialData,
    isAddMode,
    detailManualVerificationEnabled,
    context,
    form,
    verificationMethod,
    resetIcpReadonlyFields,
    clearIcpMappedFields,
    fetchIcpAndApplyForm,
    enablePassportIcp,
    applySwitchFallbackValuesToForm,
    onVerificationComplete,
    onCheckFormValidity,
    onVerificationAttemptComplete,
  ]);

  const onVerificationBlur = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void runVerification();
    }, 300);
  }, [runVerification]);

  const verifyCurrentIdentity = useCallback(
    async (): Promise<IdentityVerificationSubmitContext> => {
      const succeeded = await runVerification(true);
      return {
        succeeded,
        isGethirdPartyApi: isGethirdPartyApiRef.current,
        icpAddressContact: icpAddressContactRef.current,
      };
    },
    [runVerification],
  );

  return {
    verificationLoading,
    initialVerificationComplete,
    setInitialVerificationComplete,
    icpReadonlyFieldNames,
    icpAddressContact,
    resetIcpReadonlyFields,
    clearIcpMappedFields,
    onVerificationBlur,
    verifyCurrentIdentity,
    isGethirdPartyApi,
    buildIcpLookupSignature,
    icpLookupSignatureRef,
  };
}

export { getPersonLookupErrorMessage };
