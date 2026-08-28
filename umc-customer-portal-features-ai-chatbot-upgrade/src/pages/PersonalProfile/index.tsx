import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Form, Spin } from "antd";
import { useTranslation } from "react-i18next";
import {
  ActionFooter,
  ComfirmModal,
  CustomButton,
  CustomMessage,
} from "@/components/common";
import { useUserStore } from "@/store/user";
import {
  addUserProfileIndividual,
  getUserIndividual,
  updateUserProfileIndividual,
} from "@/services/userProfile";
import EmiratesIdRegisteredModal from "@/pages/MyAccount/EmiratesIdRegisteredModal";
import "./index.less";

import AlertBanners from "@/pages/EstablishmentProfile/components/AlertBanners";
import {
  createPersonalProfileEditPolicy,
  getPersonalAlertExpiryDays,
  getPersonalProfilePageMode,
  isPersonalProfileThirdPartyIcpBlockedPageMode,
  resolvePersonalProfilePageMode,
} from "./utils/expiryUtils";
import { buildExistingPersonalProfileDetailUrl } from "./utils/profileRouteGuard";
import { parseIsGethirdPartyApiQueryParam } from "@/pages/EstablishmentProfile/utils/formHelpers";
import {
  buildSubmitParams,
  buildUpdateSubmitParams,
  getRequiredFields,
} from "./utils/profileFormUtils";
import {
  IGNORE_ICP_VERIFICATION_RESULT_ON_SUBMIT,
  shouldContinueAfterIdentityVerification,
} from "./utils/submissionPolicy";
import { getInitialMissingRequiredFields } from "./utils/initialMissingRequiredFields";
import { useAddressData } from "./hooks/useAddressData";
import { useProfileData } from "./hooks/useProfileData";
import { useFormValidity } from "./hooks/useFormValidity";
import { isDateBeforeToday } from "@/utils/expiry";
import PersonalInfoSection from "./components/PersonalInfoSection";
import AddressSection from "./components/AddressSection";
import {
  getIndividualSwitchFallbackFieldKeys,
  getIndividualSwitchFallbackValues,
  getIndividualSwitchFallbackResetValues,
  mergeIndividualSwitchFallbackHistory,
} from "./utils/icpPersonToForm";
import {
  getIdFieldForVerificationMethod,
  personalProfileApiToFormValues,
  VERIFICATION_METHOD,
  type VerificationMethod,
} from "@/utils/individualIdentity";
import type { IndividualIdentityOcrApplyResult } from "@/components/common/IndividualIdentityForm";

const HiddenFormField: React.FC = () => null;

type FormValidationError = {
  errorFields?: Array<{ name?: Array<string | number> }>;
};

function getFormValidationError(error: unknown): FormValidationError | undefined {
  if (!error || typeof error !== "object") return undefined;
  const validationError = error as FormValidationError;
  return Array.isArray(validationError.errorFields)
    ? validationError
    : undefined;
}

const PersonalProfile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const history = useHistory();
  const location = useLocation();
  const [form] = Form.useForm();
  const userInfo = useUserStore((state: any) => state.userInfo);

  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode");
  const pageModeSearchParam = searchParams.get("pageMode");
  const isAddMode = mode === "add";
  const isDetailEditMode = mode === "edit";

  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(
    VERIFICATION_METHOD.EMIRATES_ID,
  );
  const [originVerificationMethod, setOriginVerificationMethod] =
    useState<VerificationMethod>(VERIFICATION_METHOD.EMIRATES_ID);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [successModalShow, setSuccessModalShow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [switchModal, setSwitchModal] = useState(false);
  const [emiratesIdRegisteredModalVisible, setEmiratesIdRegisteredModalVisible] = useState(false);
  const [pendingCompletionIcpFailed, setPendingCompletionIcpFailed] = useState(false);
  const [addModeProfileCheckKey, setAddModeProfileCheckKey] = useState<
    string | undefined | null
  >(null);
  const [passportExpiryOverride, setPassportExpiryOverride] = useState<
    boolean | null
  >(null);
  const switchFallbackValuesRef = useRef<Record<string, unknown>>({});
  const passportOcrFieldNamesRef = useRef<string[]>([]);
  const isSubmittingRef = useRef(false);

  const addressData = useAddressData(form);
  const {
    profileData,
    loadUserProfile,
    handleSaveAddress,
    profileLoadFinished,
    profileLoadSucceeded,
  } = useProfileData(form);

  const pageMode = resolvePersonalProfilePageMode({
    mode,
    pageModeSearchParam,
    profileData,
  });
  const thirdPartyFromUrl = parseIsGethirdPartyApiQueryParam(searchParams);
  const isThirdPartyApiContext =
    thirdPartyFromUrl === true || profileData?.isGethirdPartyApi === true;
  const profileVerificationMethod = Number(profileData?.type) as VerificationMethod;
  const hasLoadedDetailVerificationMethod = [
    VERIFICATION_METHOD.EMIRATES_ID,
    VERIFICATION_METHOD.UID,
    VERIFICATION_METHOD.PASSPORT,
  ].includes(profileVerificationMethod);
  const currentVerificationMethod =
    isDetailEditMode && hasLoadedDetailVerificationMethod
      ? profileVerificationMethod
      : verificationMethod;
  const isVerificationMethodReady =
    !isDetailEditMode || hasLoadedDetailVerificationMethod || profileLoadFinished;
  const isProfileContentReady = isAddMode
    ? addModeProfileCheckKey === location.key
    : !isDetailEditMode || profileLoadFinished;
  const captureSwitchFallbackValues = useCallback(() => {
    switchFallbackValuesRef.current = mergeIndividualSwitchFallbackHistory(
      switchFallbackValuesRef.current,
      form.getFieldsValue(getIndividualSwitchFallbackFieldKeys(currentVerificationMethod)),
      currentVerificationMethod,
    );
  }, [currentVerificationMethod, form]);
  const detailThirdPartyIcpEnabled =
    isDetailEditMode &&
    isThirdPartyApiContext &&
    hasLoadedDetailVerificationMethod &&
    profileVerificationMethod !== VERIFICATION_METHOD.PASSPORT &&
    !isPersonalProfileThirdPartyIcpBlockedPageMode(pageMode);
  const pendingCompletionDetailIcpVerificationRequired =
    isDetailEditMode &&
    pageMode === "pendingCompletion" &&
    detailThirdPartyIcpEnabled &&
    profileVerificationMethod === VERIFICATION_METHOD.EMIRATES_ID;
  const handlePassportIdentityUnavailable = useCallback(() => {
    const ocrFieldNames = passportOcrFieldNamesRef.current;
    const fieldsToClear = ocrFieldNames.filter(
      (field) => field !== "dateOfBirth" && field !== "passportNumber",
    );

    if (fieldsToClear.length > 0) {
      form.setFieldsValue(
        fieldsToClear.reduce<Record<string, undefined>>((values, field) => {
          values[field] = undefined;
          return values;
        }, {}),
      );
    }

    if (ocrFieldNames.length > 0) {
      switchFallbackValuesRef.current = {};
      passportOcrFieldNamesRef.current = [];
    }
  }, [form]);

  const {
    initialVerificationComplete,
    setInitialVerificationComplete,
    isIcpVerifying,
    checkFormValidity,
    handlePersonalFieldsChange,
    icpReadonlyFieldNames,
    resetIcpReadonlyFields,
    clearIcpMappedFields,
    verifyCurrentIdentity,
  } = useFormValidity(
    form,
    currentVerificationMethod,
    isAddMode,
    addressData.nationalityList,
    addressData.setSelectedEmirateId,
    addressData.setSelectedRegionId,
    detailThirdPartyIcpEnabled,
    pendingCompletionDetailIcpVerificationRequired,
    () => setEmiratesIdRegisteredModalVisible(true),
    t("individualIdentity.validation.icpVerificationFailed"),
    (complete) => {
      if (pendingCompletionDetailIcpVerificationRequired) {
        setPendingCompletionIcpFailed(!complete);
      }
    },
    () => switchFallbackValuesRef.current,
    handlePassportIdentityUnavailable,
  );

  const personalAlertExpiryDays = getPersonalAlertExpiryDays(
    pageMode,
    profileData,
  );
  const editPolicy = createPersonalProfileEditPolicy({
    mode,
    pageMode,
    initialVerificationComplete,
    detailThirdPartyIcpEnabled,
    profileVerificationMethod,
  });
  const isEditForm = editPolicy.canEditMainForm;
  const initialMissingRequiredFields = useMemo(() => {
    if (
      !editPolicy.showFooter ||
      !isDetailEditMode ||
      !profileLoadFinished ||
      !profileLoadSucceeded
    ) {
      return new Set<string>();
    }

    return getInitialMissingRequiredFields(
      getRequiredFields(currentVerificationMethod),
      getIdFieldForVerificationMethod(currentVerificationMethod),
      personalProfileApiToFormValues(profileData),
    );
  }, [
    currentVerificationMethod,
    editPolicy.showFooter,
    isDetailEditMode,
    profileData,
    profileLoadFinished,
    profileLoadSucceeded,
  ]);

  const isExpiryRelatedPageMode =
    pageMode === "expiringSoon" || pageMode === "expired";
  const isSingleEditForm = isExpiryRelatedPageMode || isEditForm;
  const isSingleEditForm2 = isExpiryRelatedPageMode || isEditForm;
  const rejectedPassportExpiryEditable =
    pageMode === "rejected" &&
    currentVerificationMethod === VERIFICATION_METHOD.PASSPORT &&
    thirdPartyFromUrl === false &&
    profileData?.isGethirdPartyApi !== true;

  useEffect(() => {
    if (!editPolicy.addressInlineEditEnabled) {
      setIsEditingAddress(false);
    }
  }, [editPolicy.addressInlineEditEnabled]);

  useEffect(() => {
    if (!isAddMode) return;
    if (!userInfo?.id) return;

    let cancelled = false;
    setAddModeProfileCheckKey(null);

    const checkExistingProfile = async () => {
      try {
        const response = await getUserIndividual(userInfo.id);
        if (cancelled) return;

        if (response.data) {
          const redirectUrl = buildExistingPersonalProfileDetailUrl(
            response.data,
            getPersonalProfilePageMode(response.data),
          );
          history.replace(redirectUrl);
          return;
        }

        setAddModeProfileCheckKey(location.key);
      } catch (error) {
        console.error("Failed to check existing personal profile:", error);
        if (!cancelled) history.replace("/my-account");
      }
    };

    checkExistingProfile();

    return () => {
      cancelled = true;
    };
  }, [history, isAddMode, location.key, userInfo?.id]);

  useEffect(() => {
    if (
      isDetailEditMode &&
      userInfo?.id &&
      addressData.isAddressDataLoaded
    ) {
      loadUserProfile(userInfo.id, {
        setVerificationMethod,
        setSelectedEmirateId: addressData.setSelectedEmirateId,
        setSelectedRegionId: addressData.setSelectedRegionId,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDetailEditMode,
    userInfo,
    addressData.isAddressDataLoaded,
  ]);

  useEffect(() => {
    if (!isVerificationMethodReady) return;
    form.setFieldsValue({ verificationMethod: currentVerificationMethod });
    if (isAddMode) setInitialVerificationComplete(false);
  }, [
    currentVerificationMethod,
    form,
    isAddMode,
    isVerificationMethodReady,
    setInitialVerificationComplete,
  ]);

  useEffect(() => {
    setTimeout(() => checkFormValidity(), 500);
  }, [checkFormValidity, currentVerificationMethod]);

  const buildSwitchResetFormValues = useCallback(
    (nextMethod: VerificationMethod) => ({
      ...getIndividualSwitchFallbackResetValues(),
      ...getIndividualSwitchFallbackValues(
        switchFallbackValuesRef.current,
        nextMethod,
      ),
      verificationMethod: nextMethod,
    }),
    [],
  );

  const handleOcrApply = useCallback(
    (result?: IndividualIdentityOcrApplyResult) => {
      if (currentVerificationMethod === VERIFICATION_METHOD.PASSPORT) {
        passportOcrFieldNamesRef.current = [
          ...new Set([
            ...Object.keys(result?.rawPayload ?? {}),
            ...Object.keys(result?.mappedPayload ?? {}),
          ]),
        ];
        captureSwitchFallbackValues();
        handlePersonalFieldsChange();
        return;
      }

      checkFormValidity();
    },
    [
      captureSwitchFallbackValues,
      checkFormValidity,
      currentVerificationMethod,
      handlePersonalFieldsChange,
    ],
  );

  const handleVerificationMethodChange = (newMethod: number) => {
    const nextMethod = Math.abs(newMethod) as VerificationMethod;
    if (newMethod < 0) {
      captureSwitchFallbackValues();
      resetIcpReadonlyFields();
      clearIcpMappedFields();
      form.setFieldsValue(buildSwitchResetFormValues(nextMethod));
      setInitialVerificationComplete(false);
      form.setFields([
        { name: "dateOfBirth", errors: [] },
        { name: "emiratesId", errors: [] },
        { name: "uidNumber", errors: [] },
        { name: "passportNumber", errors: [] },
      ]);
      setVerificationMethod(nextMethod);
      return;
    }
    setSwitchModal(true);
    setOriginVerificationMethod(nextMethod);
  };

  const scrollToFormField = useCallback(
    (fieldName: string | Array<string | number>) => {
      requestAnimationFrame(() => {
        form.scrollToField(fieldName, {
          behavior: "smooth",
          block: "center",
        });
      });
    },
    [form],
  );

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      setIsSubmitting(true);
      const identityFieldName = getIdFieldForVerificationMethod(
        currentVerificationMethod,
      );
      if (IGNORE_ICP_VERIFICATION_RESULT_ON_SUBMIT) {
        form.setFields([{ name: identityFieldName, errors: [] }]);
      }
      let values = await form.validateFields();
      if (isDateBeforeToday(values.passportExpiryDate)) {
        form.setFields([
          {
            name: "passportExpiryDate",
            errors: [t("personalProfilePage.validation.passportExpiryPast")],
          },
        ]);
        scrollToFormField("passportExpiryDate");
        return;
      }
      const identityVerification = await verifyCurrentIdentity();
      if (
        !shouldContinueAfterIdentityVerification(identityVerification.succeeded)
      ) {
        scrollToFormField(identityFieldName);
        return;
      }
      if (identityVerification.succeeded) {
        values = await form.validateFields();
      }
      const shouldAttachThirdPartyApiFlag =
        isAddMode || (pageMode === "rejected" && isThirdPartyApiContext);
      const submitOptions = shouldAttachThirdPartyApiFlag
        ? {
            isGethirdPartyApi: identityVerification.isGethirdPartyApi,
            icpAddressContact: identityVerification.icpAddressContact,
          }
        : { icpAddressContact: identityVerification.icpAddressContact };

      const response = profileData.proFileId
        ? await updateUserProfileIndividual(
            buildUpdateSubmitParams(values, userInfo, profileData, submitOptions),
          )
        : await addUserProfileIndividual(
            buildSubmitParams(values, userInfo, submitOptions),
          );

      const responseSuccess =
        typeof response === "object" &&
        response !== null &&
        "isSuccess" in response &&
        Boolean((response as { isSuccess?: unknown }).isSuccess);

      if (responseSuccess) {
        if (userInfo?.id) {
          await loadUserProfile(userInfo.id, {
            setVerificationMethod,
            setSelectedEmirateId: addressData.setSelectedEmirateId,
            setSelectedRegionId: addressData.setSelectedRegionId,
          });
        }
        setSuccessModalShow(true);
      }
    } catch (error) {
      const validationError = getFormValidationError(error);
      if (validationError) {
        const firstErrorField = validationError.errorFields?.[0]?.name;
        if (firstErrorField) scrollToFormField(firstErrorField);
        return;
      }
      console.error("Submission failed:", error);
      CustomMessage.error(t("request.operation.failed"));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const showActionFooter = editPolicy.showFooter;

  return (
    <div className="personal-profile">
      {isProfileContentReady ? (
        <>
          <AlertBanners
            mode={mode}
            pageMode={pageMode}
            expriryDays={personalAlertExpiryDays}
            rejectReason={profileData.rejectReason}
            messageVariant="personal"
            showCompleteProfileBanner={isAddMode && !!profileData.proFileStatus}
          />

          <Form
            form={form}
            layout="vertical"
            className="custorm-form"
            onValuesChange={(changedValues) => {
              if (Object.prototype.hasOwnProperty.call(changedValues, "dateOfBirth")) {
                form.setFields([
                  { name: "emiratesId", errors: [] },
                  { name: "uidNumber", errors: [] },
                  { name: "passportNumber", errors: [] },
                ]);
                if (pendingCompletionDetailIcpVerificationRequired) {
                  resetIcpReadonlyFields();
                  setInitialVerificationComplete(false);
                  setPendingCompletionIcpFailed(!changedValues.dateOfBirth);
                }
              }
              if (Object.prototype.hasOwnProperty.call(changedValues, "passportExpiryDate")) {
                const passportExpiryDate = changedValues.passportExpiryDate;
                const expired = isDateBeforeToday(passportExpiryDate);
                setPassportExpiryOverride(passportExpiryDate ? expired : null);
                form.setFields([
                  {
                    name: "passportExpiryDate",
                    errors: expired
                      ? [t("personalProfilePage.validation.passportExpiryPast")]
                      : [],
                  },
                ]);
              }
              checkFormValidity();
            }}
          >
            <Form.Item name="mobileNumber" hidden>
              <HiddenFormField />
            </Form.Item>

            {isVerificationMethodReady && (
              <PersonalInfoSection
                form={form}
                verificationMethod={currentVerificationMethod}
                pageMode={pageMode}
                rejectedPassportExpiryEditable={rejectedPassportExpiryEditable}
                isAddMode={isAddMode}
                isEditForm={isEditForm}
                initialVerificationComplete={initialVerificationComplete}
                isIcpVerifying={isIcpVerifying}
                nationalityList={addressData.nationalityList}
                loadingNationalities={addressData.loadingNationalities}
                isSingleEditForm={isSingleEditForm}
                isSingleEditForm2={isSingleEditForm2}
                profileData={profileData}
                isAr={isAr}
                onVerificationMethodChange={handleVerificationMethodChange}
                onPersonalFieldsChange={handlePersonalFieldsChange}
                icpReadonlyFieldNames={icpReadonlyFieldNames}
                initialMissingRequiredFields={initialMissingRequiredFields}
                requireVerificationBeforeShowingRemainingSections={
                  editPolicy.requiresIcpBeforeContinue
                }
                allowReadonlyIdentityVerification={
                  editPolicy.allowReadonlyIdentityVerification
                }
                hideExtendedFieldsAfterIcpFailure={pendingCompletionIcpFailed}
                expiryDays={personalAlertExpiryDays}
                isUnderReview={editPolicy.isReadOnly}
                passportExpiryOverride={passportExpiryOverride}
                onOcrApply={handleOcrApply}
              />
            )}

            {editPolicy.showSections && !pendingCompletionIcpFailed && (
              <AddressSection
                form={form}
                addressData={addressData}
                pageMode={pageMode}
                isAddMode={isAddMode}
                isEditingAddress={isEditingAddress}
                setIsEditingAddress={setIsEditingAddress}
                onSaveAddress={handleSaveAddress}
                isAr={isAr}
                addressInlineEditEnabled={editPolicy.addressInlineEditEnabled}
                addressEditableWithFooter={editPolicy.addressEditableWithFooter}
              />
            )}
          </Form>

          <ActionFooter
            actions={
              showActionFooter ? (
                <CustomButton
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  text={t("personalProfilePage.actions.submit")}
                />
              ) : undefined
            }
          />
        </>
      ) : (
        <div className="profile-section personal-profile__loading">
          <Spin size="large" />
        </div>
      )}

      <ComfirmModal
        className="profile-modal"
        title={t("personalProfilePage.modals.underReviewTitle")}
        content={t("personalProfilePage.modals.underReviewContent")}
        show={successModalShow}
        close={() => setSuccessModalShow(false)}
        type="default"
        comfrimText={t("personalProfilePage.actions.confirm")}
        cancelText={t("personalProfilePage.actions.cancel")}
        footRender={
          <div>
            <CustomButton
              customClassName="personal-profile-modalBtn"
              onClick={() => history.goBack()}
              variant="outline"
            >
              {t("personalProfilePage.actions.close")}
            </CustomButton>
          </div>
        }
      />

      <ComfirmModal
        title={t("personalProfilePage.modals.switchVerifyTitle")}
        content={t("personalProfilePage.modals.switchVerifyContent")}
        show={switchModal}
        close={() => {
          setSwitchModal(false);
          form.setFieldsValue({ verificationMethod: currentVerificationMethod });
        }}
        comfrimHanld={() => {
          captureSwitchFallbackValues();
          resetIcpReadonlyFields();
          clearIcpMappedFields();
          form.setFieldsValue(buildSwitchResetFormValues(originVerificationMethod));
          setInitialVerificationComplete(false);
          setVerificationMethod(originVerificationMethod);
          form.setFields([
            { name: "dateOfBirth", errors: [] },
            { name: "emiratesId", errors: [] },
            { name: "uidNumber", errors: [] },
            { name: "passportNumber", errors: [] },
          ]);
          setSwitchModal(false);
        }}
        type="warning"
        comfrimText={t("personalProfilePage.actions.confirm")}
        cancelText={t("personalProfilePage.actions.cancel")}
      />

      <EmiratesIdRegisteredModal
        visible={emiratesIdRegisteredModalVisible}
        onClose={() => setEmiratesIdRegisteredModalVisible(false)}
        onContinueWithOtherId={() => {
          setEmiratesIdRegisteredModalVisible(false);
          form.resetFields(["dateOfBirth", "emiratesId"]);
          history.push("/my-account/personal-profile?mode=add");
        }}
      />
    </div>
  );
};

export default PersonalProfile;
