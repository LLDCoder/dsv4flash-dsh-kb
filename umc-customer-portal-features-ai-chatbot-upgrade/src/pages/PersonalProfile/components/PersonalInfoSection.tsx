import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FormInstance } from "antd/lib/form";
import { IndividualIdentityForm } from "@/components/common";
import type { NationalityInfo } from "@/services/userProfile";
import { disabledDate } from "@/utils/date";
import type { PersonalProfilePageMode } from "../utils/expiryUtils";
import {
  isPersonalProfileDocumentExpiredRow,
  isPersonalProfileDocumentsBrowsingOnly,
  isPersonalProfileFormReadOnly,
} from "../utils/expiryUtils";
import type {
  DocumentFieldFlags,
  DocumentExpiryFlags,
  IndividualIdentityOcrApplyResult,
  IndividualIdentityOcrPayloadMapper,
} from "@/components/common/IndividualIdentityForm";
import type { IndividualIdentityFieldName, VerificationMethod } from "@/utils/individualIdentity";
import { VERIFICATION_METHOD } from "@/utils/individualIdentity";

interface PersonalInfoSectionProps {
  form: FormInstance;
  verificationMethod: VerificationMethod;
  pageMode: PersonalProfilePageMode;
  rejectedPassportExpiryEditable: boolean;
  isAddMode: boolean;
  isEditForm: boolean;
  initialVerificationComplete: boolean;
  isIcpVerifying: boolean;
  nationalityList: NationalityInfo[];
  loadingNationalities: boolean;
  isSingleEditForm: boolean;
  isSingleEditForm2: boolean;
  profileData: any;
  isAr: boolean;
  onVerificationMethodChange: (newMethod: number) => void;
  onPersonalFieldsChange: () => void;
  icpReadonlyFieldNames: string[];
  initialMissingRequiredFields: ReadonlySet<string>;
  requireVerificationBeforeShowingRemainingSections?: boolean;
  allowReadonlyIdentityVerification?: boolean;
  hideExtendedFieldsAfterIcpFailure?: boolean;
  expiryDays: number;
  isUnderReview: boolean;
  passportExpiryOverride: boolean | null;
  onOcrApply?: (result?: IndividualIdentityOcrApplyResult) => void;
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  form,
  verificationMethod,
  pageMode,
  rejectedPassportExpiryEditable,
  isAddMode,
  isEditForm,
  initialVerificationComplete,
  isIcpVerifying,
  nationalityList,
  loadingNationalities,
  isSingleEditForm,
  isSingleEditForm2,
  profileData,
  isAr,
  onVerificationMethodChange,
  onPersonalFieldsChange,
  icpReadonlyFieldNames,
  initialMissingRequiredFields,
  requireVerificationBeforeShowingRemainingSections = false,
  allowReadonlyIdentityVerification = false,
  hideExtendedFieldsAfterIcpFailure = false,
  expiryDays,
  isUnderReview,
  passportExpiryOverride,
  onOcrApply,
}) => {
  const { t } = useTranslation();
  const isRejected = pageMode === "rejected";
  const isExpired = pageMode === "expired";
  const rejectedPassportEditable =
    isRejected && verificationMethod === VERIFICATION_METHOD.PASSPORT;
  const expiredPassportNumberEditable =
    isExpired && verificationMethod === VERIFICATION_METHOD.PASSPORT;
  const expiringSoonPassportNumberEditable =
    pageMode === "expiringSoon" &&
    verificationMethod === VERIFICATION_METHOD.PASSPORT;
  const passportNumberEditable =
    rejectedPassportEditable ||
    expiredPassportNumberEditable ||
    expiringSoonPassportNumberEditable;
  const rejectedIdentityLockDemographics =
    isRejected &&
    (verificationMethod === VERIFICATION_METHOD.EMIRATES_ID ||
      verificationMethod === VERIFICATION_METHOD.UID);
  /** ICP-mapped fields stay locked; overrides (e.g. expiringSoon passport) cannot clear this. */
  const icpReadonly = useCallback(
    (field: string) => icpReadonlyFieldNames.includes(field),
    [icpReadonlyFieldNames],
  );

  const handleVerifyMethodChange = (newMethod: VerificationMethod) => {
    const currentValues = form.getFieldsValue();
    const hasContent =
      (verificationMethod === VERIFICATION_METHOD.EMIRATES_ID && currentValues.emiratesId) ||
      (verificationMethod === VERIFICATION_METHOD.UID && currentValues.uidNumber) ||
      (verificationMethod === VERIFICATION_METHOD.PASSPORT && currentValues.passportNumber);

    if (hasContent) {
      onVerificationMethodChange(newMethod);
    } else {
      onVerificationMethodChange((-newMethod) as VerificationMethod);
      form.setFieldsValue({
        emiratesId: undefined,
        uidNumber: undefined,
        passportNumber: undefined,
        verificationMethod: newMethod,
      });
    }
  };

  const showExtendedFields =
    !hideExtendedFieldsAfterIcpFailure &&
    (pageMode === "pendingCompletion" ||
      (requireVerificationBeforeShowingRemainingSections
        ? initialVerificationComplete
        : !isAddMode || initialVerificationComplete));
  const showDocuments = showExtendedFields;

  const isVerifyMethodLocked =
    !isAddMode && [1, 2, 3].includes(Number(profileData?.type));
  const formReadOnly = isPersonalProfileFormReadOnly(pageMode);
  const rejectedPassportFullPersonalEdit = rejectedPassportEditable;
  const pendingCompletionDemographicsEditable =
    !isAddMode && profileData.proFileStatus?.code === "1";
  const extendedDemographicsEditable =
    isAddMode ||
    pendingCompletionDemographicsEditable ||
    (isRejected && verificationMethod === VERIFICATION_METHOD.PASSPORT);
  const extendedDemographicsDisabled =
    formReadOnly ||
    !extendedDemographicsEditable ||
    rejectedIdentityLockDemographics;

  const isFieldDisabled = useCallback(
    (field: IndividualIdentityFieldName): boolean => {
      if (field !== "verificationMethod" && icpReadonly(field)) return true;
      if (
        isIcpVerifying &&
        (field === "emiratesId" ||
          field === "uidNumber" ||
          field === "passportNumber")
      ) {
        return true;
      }
      if (initialMissingRequiredFields.has(field)) return false;

      switch (field) {
        case "verificationMethod":
          // Per-option lock via verifyMethodOptionDisabled; keep selected option enabled visually.
          return false;
        case "dateOfBirth":
          return (
            formReadOnly ||
            rejectedIdentityLockDemographics ||
            (!isEditForm && !rejectedPassportFullPersonalEdit) ||
            icpReadonly("dateOfBirth")
          );
        case "emiratesId":
          return !isAddMode || icpReadonly("emiratesId") || isIcpVerifying;
        case "uidNumber":
          return !isAddMode || icpReadonly("uidNumber") || isIcpVerifying;
        case "passportNumber":
          if (icpReadonly("passportNumber")) return true;
          if (passportNumberEditable) return false;
          return !isAddMode || icpReadonly("passportNumber");
        case "fullNameAr":
          return extendedDemographicsDisabled || icpReadonly("fullNameAr");
        case "fullNameEn":
          return extendedDemographicsDisabled || icpReadonly("fullNameEn");
        case "nationalityId":
          return extendedDemographicsDisabled || icpReadonly("nationalityId");
        case "gender":
          return extendedDemographicsDisabled || icpReadonly("gender");
        case "occupation":
          return formReadOnly || !isEditForm || icpReadonly("occupation");
        case "emiratesIdExpiryDate":
          return (
            isRejected ||
            icpReadonly("emiratesIdExpiryDate") ||
            (formReadOnly ? true : !isSingleEditForm)
          );
        case "passportExpiryDate":
          if (rejectedPassportExpiryEditable) {
            return false;
          }
          return (
            isRejected ||
            icpReadonly("passportExpiryDate") ||
            (formReadOnly
              ? true
              : profileData.type === 2
                ? !isSingleEditForm2
                : !isSingleEditForm)
          );
        case "visaExpiryDate":
          return (
            isRejected ||
            icpReadonly("visaExpiryDate") ||
            (formReadOnly ? true : !isSingleEditForm)
          );
        default:
          return false;
      }
    },
    [
      formReadOnly,
      rejectedIdentityLockDemographics,
      isRejected,
      isEditForm,
      rejectedPassportFullPersonalEdit,
      rejectedPassportExpiryEditable,
      passportNumberEditable,
      isAddMode,
      isIcpVerifying,
      initialMissingRequiredFields,
      extendedDemographicsDisabled,
      isSingleEditForm,
      isSingleEditForm2,
      profileData.type,
      icpReadonly,
    ],
  );

  const verifyMethodOptionDisabled = (value: VerificationMethod) =>
    (formReadOnly || isVerifyMethodLocked) && verificationMethod !== value;

  const documentsBrowsingOnly = isPersonalProfileDocumentsBrowsingOnly(pageMode);
  /** Under Review / Suspended / Approved stable: view + download only, no replace. */
  const documentsViewDownloadOnly = formReadOnly || documentsBrowsingOnly;
  const personalPhotoEditable =
    isAddMode ||
    pageMode === "rejected" ||
    pageMode === "pendingCompletion" ||
    initialMissingRequiredFields.has("personalPhotoUrl");
  const expiryDocumentFlags = useMemo((): DocumentExpiryFlags | undefined => {
    const isExpiry =
      passportExpiryOverride !== null
        ? passportExpiryOverride
        : pageMode === "expired";
    if (isExpiry) {
      return {
        isExpiry: true,
        expiryDays,
        isUnderReview,
      };
    }
    if (pageMode === "expiringSoon") {
      return {
        isLess30: true,
        expiryDays,
        isUnderReview,
      };
    }
    return isUnderReview ? { isUnderReview } : undefined;
  }, [expiryDays, isUnderReview, pageMode, passportExpiryOverride]);

  const getDocumentRowFlags = (rowIsExpiry: boolean, rowIsLess30: boolean): DocumentFieldFlags => {
    if (documentsViewDownloadOnly) {
      return { hasDelete: false, hasDownload: true, disabled: true };
    }
    if (isPersonalProfileDocumentExpiredRow(pageMode, rowIsExpiry)) {
      return { hasDelete: true, hasDownload: false, disabled: false };
    }
    const canReplaceDocument =
      pageMode === "expiringSoon" ||
      pageMode === "expired" ||
      rowIsExpiry ||
      rowIsLess30 ||
      isEditForm;
    return {
      hasDelete: canReplaceDocument,
      hasDownload: !canReplaceDocument,
      disabled: false,
    };
  };

  const personalPhotoFlags = useMemo((): DocumentFieldFlags => {
    if (documentsViewDownloadOnly) {
      return { hasDelete: false, hasDownload: true, disabled: true };
    }
    if (!personalPhotoEditable) {
      return { hasDelete: false, hasDownload: true, disabled: true };
    }
    return { hasDelete: true, hasDownload: false, disabled: false };
  }, [documentsViewDownloadOnly, personalPhotoEditable]);

  const documentExpiry = useMemo(
    () => ({
      personalPhotoUrl: { isUnderReview },
      emiratesIdUrl:
        verificationMethod === VERIFICATION_METHOD.EMIRATES_ID
          ? expiryDocumentFlags
          : { isUnderReview },
      passportUrl:
        verificationMethod === VERIFICATION_METHOD.UID
          ? expiryDocumentFlags
          : { isUnderReview },
      visaUrl:
        verificationMethod === VERIFICATION_METHOD.UID
          ? expiryDocumentFlags
          : { isUnderReview },
      passportScanUrl:
        verificationMethod === VERIFICATION_METHOD.PASSPORT
          ? expiryDocumentFlags
          : { isUnderReview },
    }),
    [expiryDocumentFlags, isUnderReview, verificationMethod],
  );

  const getDocumentFieldFlags = (
    field: IndividualIdentityFieldName,
    expiryFlags?: DocumentExpiryFlags,
  ): DocumentFieldFlags => {
    if (field === "personalPhotoUrl") return personalPhotoFlags;
    return getDocumentRowFlags(!!expiryFlags?.isExpiry, !!expiryFlags?.isLess30);
  };

  const mapOcrApplyPayload = useCallback<IndividualIdentityOcrPayloadMapper>(
    (payload, context) => {
      if (context.previewFileType === "pdf") {
        return payload;
      }

      const {
        eidDocumentOrPassPortSacnUrl: _sharedIdentityDocumentUrl,
        emiratesIdUrl: _emiratesIdUrl,
        passportScanUrl: _passportScanUrl,
        ...ocrFields
      } = payload;

      return ocrFields;
    },
    [],
  );

  return (
    <>
      <div className="profile-section">
        <h2 className="section-title">
          {t("personalProfilePage.sections.personalInformation")}
        </h2>
        <IndividualIdentityForm
          form={form}
          verificationMethod={verificationMethod}
          layout="profile"
          sections={["verification", "demographics"]}
          showExtendedFields={showExtendedFields}
          nationalityList={nationalityList}
          loadingNationalities={loadingNationalities}
          ocrEnabledMethods={[
            VERIFICATION_METHOD.EMIRATES_ID,
            VERIFICATION_METHOD.PASSPORT,
          ]}
          ocrNationalityList={nationalityList}
          verificationLoading={isIcpVerifying}
          allowReadonlyVerificationSearch={allowReadonlyIdentityVerification}
          icpReadonlyFieldNames={icpReadonlyFieldNames}
          isFieldDisabled={isFieldDisabled}
          isVerificationMethodOptionDisabled={verifyMethodOptionDisabled}
          onVerificationMethodChange={handleVerifyMethodChange}
          onVerificationBlur={onPersonalFieldsChange}
          onOcrApply={onOcrApply}
          mapOcrApplyPayload={mapOcrApplyPayload}
          isAr={isAr}
          emiratesIdExpiryDisabledDate={disabledDate}
          passportExpiryDisabledDate={undefined}
          visaExpiryDisabledDate={disabledDate}
        />
      </div>

      {showDocuments && (
        <div className="profile-section">
          <h2 className="section-title">
            {t("personalProfilePage.sections.personalDocuments")}
          </h2>
          <IndividualIdentityForm
            form={form}
            verificationMethod={verificationMethod}
            layout="profile"
            sections={["documents"]}
            showExtendedFields
            nationalityList={nationalityList}
            icpReadonlyFieldNames={icpReadonlyFieldNames}
            isFieldDisabled={isFieldDisabled}
            onVerificationMethodChange={handleVerifyMethodChange}
            onVerificationBlur={onPersonalFieldsChange}
            documentFileNames={{
              personalPhotoUrl: profileData?.personalPhotoUrl,
              emiratesIdUrl: profileData?.emiratesIdCopyUrl,
              passportUrl: profileData?.passportCopyUrl,
              visaUrl: profileData?.visaCopyUrl,
              passportScanUrl: profileData?.passportCopyUrl,
            }}
            getDocumentFieldFlags={getDocumentFieldFlags}
            documentExpiry={documentExpiry}
          />
        </div>
      )}
    </>
  );
};

export default PersonalInfoSection;
