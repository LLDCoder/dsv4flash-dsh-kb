import { useState, useCallback, useEffect, useRef } from "react";
import type { FormInstance } from "antd/lib/form";
import type { NationalityInfo } from "@/services/userProfile";
import { getRequiredFields } from "../utils/profileFormUtils";
import {
  getIdFieldForVerificationMethod,
  isValidEmiratesId,
  normalizeVerificationMethod,
  VERIFICATION_METHOD,
  type VerificationMethod,
} from "@/utils/individualIdentity";
import {
  useIndividualIcpVerification,
  type IdentityVerificationSubmitContext,
} from "@/hooks/useIndividualIcpVerification";
import type { IcpAddressContactInfo } from "../utils/icpPersonToForm";

export interface FormValidityHook {
  isFormValid: boolean;
  initialVerificationComplete: boolean;
  setInitialVerificationComplete: (v: boolean) => void;
  isIcpVerifying: boolean;
  checkFormValidity: () => void;
  handlePersonalFieldsChange: () => void;
  icpReadonlyFieldNames: string[];
  icpAddressContact: IcpAddressContactInfo;
  resetIcpReadonlyFields: () => void;
  clearIcpMappedFields: () => void;
  verifyCurrentIdentity: () => Promise<IdentityVerificationSubmitContext>;
  isGethirdPartyApi: boolean;
}

export function useFormValidity(
  form: FormInstance,
  verificationMethod: VerificationMethod,
  isAddMode: boolean,
  nationalityList: NationalityInfo[],
  setSelectedEmirateId?: (id: number | undefined) => void,
  setSelectedRegionId?: (id: number | undefined) => void,
  detailThirdPartyIcpEnabled?: boolean,
  detailManualVerificationEnabled?: boolean,
  onEmiratesIdRegisteredModalOpen?: () => void,
  icpVerificationFailedMessage?: string,
  onVerificationAttemptComplete?: (complete: boolean) => void,
  getSwitchFallbackValues?: () => Record<string, unknown>,
  onPassportIdentityUnavailable?: () => void,
): FormValidityHook {
  const [isFormValid, setIsFormValid] = useState(false);

  const checkFormValidity = useCallback(() => {
    try {
      const values = form.getFieldsValue();
      const vm = normalizeVerificationMethod(values.verificationMethod ?? verificationMethod);
      const requiredFields = getRequiredFields(vm);

      const allFieldsFilled = requiredFields.every((field) => {
        const value = values[field];
        if (value && typeof value === "object" && value._isAMomentObject) {
          return value.isValid();
        }
        return value !== undefined && value !== null && value !== "";
      });

      let isIdFormatValid = true;
      if (vm === VERIFICATION_METHOD.EMIRATES_ID) {
        isIdFormatValid = isValidEmiratesId(values.emiratesId);
      }

      const currentIdFieldHasErrors =
        (isAddMode || detailManualVerificationEnabled) &&
        form.getFieldError(getIdFieldForVerificationMethod(vm)).length > 0;

      setIsFormValid(
        allFieldsFilled &&
          isIdFormatValid &&
          !currentIdFieldHasErrors,
      );
    } catch {
      setIsFormValid(false);
    }
  }, [form, verificationMethod, isAddMode, detailManualVerificationEnabled]);

  const icp = useIndividualIcpVerification({
    form,
    verificationMethod,
    nationalityList,
    context: "personalProfile",
    isAddMode,
    enablePassportIcp: isAddMode,
    detailThirdPartyIcpEnabled,
    detailManualVerificationEnabled,
    icpVerificationFailedMessage,
    onEmiratesIdRegistered: onEmiratesIdRegisteredModalOpen,
    getSwitchFallbackValues,
    onAddressSelection: (selection) => {
      if (selection.emirateId !== undefined) {
        setSelectedEmirateId?.(selection.emirateId);
      }
      if (selection.regionId !== undefined) {
        setSelectedRegionId?.(selection.regionId);
      }
    },
    onCheckFormValidity: checkFormValidity,
    onVerificationAttemptComplete,
    onPassportIdentityUnavailable,
  });

  const onVerificationBlurRef = useRef(icp.onVerificationBlur);
  onVerificationBlurRef.current = icp.onVerificationBlur;

  const handlePersonalFieldsChange = useCallback(() => {
    onVerificationBlurRef.current();
    setTimeout(() => checkFormValidity(), 350);
  }, [checkFormValidity]);

  useEffect(() => {
    checkFormValidity();
  }, [verificationMethod, icp.initialVerificationComplete, checkFormValidity]);

  return {
    isFormValid,
    initialVerificationComplete: icp.initialVerificationComplete,
    setInitialVerificationComplete: icp.setInitialVerificationComplete,
    isIcpVerifying: icp.verificationLoading,
    checkFormValidity,
    handlePersonalFieldsChange,
    icpReadonlyFieldNames: icp.icpReadonlyFieldNames,
    icpAddressContact: icp.icpAddressContact,
    resetIcpReadonlyFields: icp.resetIcpReadonlyFields,
    clearIcpMappedFields: icp.clearIcpMappedFields,
    verifyCurrentIdentity: icp.verifyCurrentIdentity,
    isGethirdPartyApi: icp.isGethirdPartyApi,
  };
}

export { getIdFieldForVerificationMethod };
