import React from "react";
import type { FormInstance } from "antd/lib/form";
import { IndividualIdentityForm } from "@/components/common";
import type {
  VerificationOption,
  VerificationOptionValue,
} from "@/components/common/IndividualIdentityForm";
import type { NationalityInfo } from "@/services/userProfile";
import { disabledDate } from "@/utils/date";
import {
  disabledDateAfterToday,
  type IndividualIdentityFieldName,
  VERIFICATION_METHOD,
  type VerificationMethod,
} from "@/utils/individualIdentity";

interface IndividualPartnerFieldsProps {
  form: FormInstance;
  verificationMethod: VerificationMethod;
  showExtendedFields: boolean;
  nationalityList: NationalityInfo[];
  loadingNationalities: boolean;
  verificationLoading: boolean;
  enableVerificationLookup?: boolean;
  disableAllFields?: boolean;
  icpReadonlyFieldNames: string[];
  isAr: boolean;
  onVerificationMethodChange: (method: VerificationMethod) => void;
  onVerificationOptionChange?: (value: VerificationOptionValue) => void;
  onVerificationBlur: () => void;
  onOcrApply?: () => void;
  verificationOptions?: VerificationOption[];
  selectedVerificationOption?: VerificationOptionValue;
  documentFileNames?: {
    personalPhotoUrl?: string;
    emiratesIdUrl?: string;
    passportUrl?: string;
    visaUrl?: string;
    passportScanUrl?: string;
  };
  initialData?: {
    personalPhotoUrl?: string;
    emiratesIdUrl?: string;
    emiratesIdurl?: string;
    passportUrl?: string;
    visaUrl?: string;
    passportScanUrl?: string;
  } | null;
}

const IndividualPartnerFields: React.FC<IndividualPartnerFieldsProps> = ({
  form,
  verificationMethod,
  showExtendedFields,
  nationalityList,
  loadingNationalities,
  verificationLoading,
  enableVerificationLookup = true,
  disableAllFields = false,
  icpReadonlyFieldNames,
  isAr,
  onVerificationMethodChange,
  onVerificationOptionChange,
  onVerificationBlur,
  onOcrApply,
  verificationOptions,
  selectedVerificationOption,
  documentFileNames,
  initialData,
}) => {
  const icpReadonly = (field: string) => icpReadonlyFieldNames.includes(field);

  const isFieldDisabled = (field: IndividualIdentityFieldName): boolean => {
    if (disableAllFields && field !== "verificationMethod") {
      return true;
    }

    if (field === "verificationMethod") {
      return icpReadonly("verificationMethod");
    }
    if (field === "dateOfBirth") {
      return icpReadonly("dateOfBirth") || verificationLoading;
    }
    if (
      field === "emiratesId" ||
      field === "uidNumber" ||
      field === "passportNumber"
    ) {
      return icpReadonly(field) || verificationLoading;
    }
    return icpReadonly(field);
  };

  const handleVerificationMethodChange = (method: VerificationMethod) => {
    onVerificationMethodChange(method);
    form.setFieldsValue({ verificationMethod: method });
  };

  return (
    <IndividualIdentityForm
      form={form}
      verificationMethod={verificationMethod}
      layout="modal"
      showExtendedFields={showExtendedFields}
      nationalityList={nationalityList}
      loadingNationalities={loadingNationalities}
      verificationLoading={verificationLoading}
      enableVerificationLookup={enableVerificationLookup}
      hiddenVerificationSearchMethods={[VERIFICATION_METHOD.PASSPORT]}
      icpReadonlyFieldNames={icpReadonlyFieldNames}
      verificationOptions={verificationOptions}
      selectedVerificationOption={selectedVerificationOption}
      ocrEnabledMethods={[VERIFICATION_METHOD.EMIRATES_ID, VERIFICATION_METHOD.PASSPORT]}
      ocrNationalityList={nationalityList}
      isFieldDisabled={isFieldDisabled}
      onVerificationMethodChange={handleVerificationMethodChange}
      onVerificationOptionChange={onVerificationOptionChange}
      onVerificationBlur={onVerificationBlur}
      onOcrApply={onOcrApply}
      onDateOfBirthChange={() => {
        form.setFields([
          { name: "emiratesId", errors: [] },
          { name: "uidNumber", errors: [] },
        ]);
      }}
      isAr={isAr}
      verifyMethodLabel="verificationMethod"
      documentFileNames={{
        personalPhotoUrl:
          documentFileNames?.personalPhotoUrl ??
          (initialData?.personalPhotoUrl as string | undefined),
        emiratesIdUrl:
          documentFileNames?.emiratesIdUrl ??
          ((initialData?.emiratesIdUrl || initialData?.emiratesIdurl) as
            | string
            | undefined),
        passportUrl:
          documentFileNames?.passportUrl ??
          (initialData?.passportUrl as string | undefined),
        visaUrl:
          documentFileNames?.visaUrl ??
          (initialData?.visaUrl as string | undefined),
        passportScanUrl:
          documentFileNames?.passportScanUrl ??
          (initialData?.passportScanUrl as string | undefined),
      }}
      emiratesIdExpiryDisabledDate={disabledDate}
      passportExpiryDisabledDate={disabledDateAfterToday}
      visaExpiryDisabledDate={disabledDate}
    />
  );
};

export default IndividualPartnerFields;
