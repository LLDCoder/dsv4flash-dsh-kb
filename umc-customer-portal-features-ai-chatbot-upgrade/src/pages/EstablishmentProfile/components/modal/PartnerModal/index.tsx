import React, { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Form, Input, Select, Spin } from "antd";
import { CustomButton } from "@/components/common";
import type {
  VerificationOption,
  VerificationOptionValue,
} from "@/components/common/IndividualIdentityForm";
import DocumentViewer from "@/components/common/DocumentViewer";
import {
  getTypeDictionaryList,
  getNationalityList,
  type TypeDictionary,
  type NationalityInfo,
} from "@/services/userProfile";
import moment from "moment";
import "./index.less";
import { useTranslation } from "react-i18next";
import { getNullableString, getNumberOrNull } from "../../../utils/formHelpers";
import {
  getArabicInputPlaceholderClassName,
  getArabicInputStyle,
} from "@/utils/inputDirection";
import { useIndividualIcpVerification } from "@/hooks/useIndividualIcpVerification";
import {
  getIndividualSwitchFallbackFieldKeys,
  getIndividualSwitchFallbackResetValues,
  mergeSwitchFallbackValuesIntoIcpMapping,
  mergeIndividualSwitchFallbackHistory,
} from "@/pages/PersonalProfile/utils/icpPersonToForm";
import IndividualPartnerFields from "./IndividualPartnerFields";
import { OcrModal, OCR_DOCUMENT_TYPE } from "@/components/common/ocr";
import type { OcrApplyPayload } from "@/components/common/ocr";
import {
  INDIVIDUAL_IDENTITY_FIELD_KEYS,
  getPartnerIndividualRequiredFields,
  isOccupationLengthValid,
  isValidEmiratesId,
  isValidPassportNumber,
  isValidUid,
  isVerificationInputReady,
  normalizeVerificationMethod,
  VERIFICATION_METHOD,
  type VerificationMethod,
} from "@/utils/individualIdentity";
import type { PersonalProfilePartnerIdentity } from "@/pages/EstablishmentProfile/hooks/usePersonalProfilePartnerIdentity";
import { validateEmiratesId } from "@/components/designable/src/components/IDSelector/idSelectorUtils";
import { buildStrictArabicNameRestrictProps } from "@/utils/individualIdentity/restrictedNameInput";
import { isStrictArabicNameInputAllowed } from "@/utils/individualIdentity/validation";
import QueryInput from "@/components/designable/src/components/IDSelector/components/QueryInput";
const { Option } = Select;

const PERSONAL_INFORMATION_OPTION_VALUE = "personalInformation" as const;

type PartnerVerificationOptionValue =
  | VerificationMethod
  | typeof PERSONAL_INFORMATION_OPTION_VALUE;

type PartnerDocumentFileNames = {
  personalPhotoUrl?: string;
  emiratesIdUrl?: string;
  passportUrl?: string;
  visaUrl?: string;
  passportScanUrl?: string;
};

type PersonalInformationSnapshot = {
  actualMethod: VerificationMethod;
  values: Record<string, unknown>;
  documentFileNames: PartnerDocumentFileNames;
};

const INDIVIDUAL_SNAPSHOT_FIELDS = INDIVIDUAL_IDENTITY_FIELD_KEYS.filter(
  (fieldName) => fieldName !== "verificationMethod",
);

type LocalizedNameSource = {
  nameEn?: string | null;
  nameAr?: string | null;
};

const getLocalizedName = (
  item: LocalizedNameSource | undefined,
  language: string,
) => {
  if (!item) return "";
  return language.startsWith("ar")
    ? item.nameAr || item.nameEn || ""
    : item.nameEn || item.nameAr || "";
};

export interface PartnerData {
  id?: string;
  /** Partner modal save in this browser session; list stays editable even when {@link source} is 1 (verified). */
  managedInSession?: boolean;
  /** Local-only marker for rows created from Personal Information. */
  isPersonalInformation?: boolean;
  source?: number;
  partnerTypeCode: string;
  partnerTypeName?: string;
  verificationMethod?: string;
  verificationMethodCode?: string;
  dateOfBirth?: string;
  dateBirth?: string;
  uidNumber?: string;
  isOwner?: boolean;
  uaeNumber?: string;
  emiratesId?: string;
  fullNameAr?: string;
  fullNameEn?: string;
  representativeNameEn?: string | null;
  representativeNameAr?: string | null;
  representativeEmiratesId?: string | null;
  nationalityId?: number;
  nationalityName?: string;
  gender?: number;
  genderId?: number;
  passportExpiryDate?: string;
  visaExpiryDate?: string;
  occupation?: string;
  personalPhotoUrl?: string;
  passportUrl?: string;
  visaUrl?: string;
  emiratesIdUrl?: string;
  emiratesIdurl?: string;
  expiryDate?: string;
  passportNumber?: string;
  passportScanUrl?: string;
  memorandumOfAssociationUrl?: string;
  powerOfAttorneyUrl?: string;
  statementUrl?: string;
}

interface PartnerModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (data: PartnerData) => void | Promise<void>;
  initialData?: PartnerData | null;
  personalProfileIdentity?: PersonalProfilePartnerIdentity;
  hasPersonalInformationPartner?: boolean;
}

const PartnerModal: React.FC<PartnerModalProps> = ({
  visible,
  onCancel,
  onSave,
  initialData,
  personalProfileIdentity,
  hasPersonalInformationPartner = false,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const [form] = Form.useForm();
  const partnerTypeCode = Form.useWatch("partnerTypeCode", form) ?? "";
  const dateOfBirthValue = Form.useWatch("dateOfBirth", form);
  const passportNumberValue = Form.useWatch("passportNumber", form);
  const prevVisibleRef = useRef(false);
  const prevPartnerTypeCodeRef = useRef("");
  const switchFallbackValuesRef = useRef<Record<string, unknown>>({});
  const autoEmiratesIdLookupSignatureRef = useRef<string | null>(null);
  const personalInformationSnapshotRef =
    useRef<PersonalInformationSnapshot | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(
    VERIFICATION_METHOD.EMIRATES_ID,
  );
  const [selectedVerificationOption, setSelectedVerificationOption] =
    useState<PartnerVerificationOptionValue>(VERIFICATION_METHOD.EMIRATES_ID);
  const [partnerTypeList, setPartnerTypeList] = useState<TypeDictionary[]>([]);
  const [loadingPartnerTypes, setLoadingPartnerTypes] = useState(false);
  const [nationalityList, setNationalityList] = useState<NationalityInfo[]>([]);
  const [loadingNationalities, setLoadingNationalities] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isOcrModalVisible, setIsOcrModalVisible] = useState(false);
  const [verificationStep, setVerificationStep] = useState<
    "initial" | "verified" | "failed"
  >("initial");
  const [isSaving, setIsSaving] = useState(false);
  const [personalInformationDocumentFileNames, setPersonalInformationDocumentFileNames] =
    useState<PartnerDocumentFileNames>({});

  const personalInformationAvailable = Boolean(
    personalProfileIdentity?.available &&
      personalProfileIdentity?.actualMethod &&
      personalProfileIdentity?.mappedFormValues,
  );
  const isPersonalInformationSelected =
    selectedVerificationOption === PERSONAL_INFORMATION_OPTION_VALUE;
  const shouldShowPersonalInformationOption =
    personalInformationAvailable &&
    (!hasPersonalInformationPartner || Boolean(initialData?.isPersonalInformation));

  const verificationOptions = React.useMemo<VerificationOption[]>(
    () => {
      const baseOptions: VerificationOption[] = [
        {
          label: t("individualIdentity.verify.emiratesId"),
          value: VERIFICATION_METHOD.EMIRATES_ID,
        },
        {
          label: t("individualIdentity.verify.uid"),
          value: VERIFICATION_METHOD.UID,
        },
        {
          label: t("individualIdentity.verify.passport"),
          value: VERIFICATION_METHOD.PASSPORT,
        },
      ];

      if (shouldShowPersonalInformationOption) {
        baseOptions.push({
          label: t("establishmentProfile.partner.personalInformation"),
          value: PERSONAL_INFORMATION_OPTION_VALUE,
        });
      }

      return baseOptions;
    },
    [shouldShowPersonalInformationOption, t],
  );

  const checkFormValidity = useCallback(async () => {
    try {
      const values = form.getFieldsValue(true);
      let requiredFields = ["partnerTypeCode"];

      if (values.partnerTypeCode === "2") {
        const vm = normalizeVerificationMethod(values.verificationMethod);
        requiredFields = ["partnerTypeCode", ...getPartnerIndividualRequiredFields(vm)];
      } else if (values.partnerTypeCode === "1") {
        requiredFields = [
          "partnerTypeCode",
          "fullNameEn",
          "fullNameAr",
          "representativeNameEn",
          "representativeNameAr",
          "representativeEmiratesId",
        ];
      }

      const allFieldsFilled = requiredFields.every((field) => {
        const value = values[field];
        if (value && typeof value === "object" && value._isAMomentObject) {
          return value.isValid();
        }
        return value !== undefined && value !== null && value !== "";
      });

      let isIdFormatValid = true;
      if (values.partnerTypeCode === "2") {
        const vm = normalizeVerificationMethod(values.verificationMethod);
        if (vm === VERIFICATION_METHOD.EMIRATES_ID) {
          isIdFormatValid = isValidEmiratesId(values.emiratesId);
        } else if (vm === VERIFICATION_METHOD.UID) {
          isIdFormatValid = isValidUid(values.uidNumber);
        } else {
          isIdFormatValid = isValidPassportNumber(values.passportNumber);
        }
      } else if (values.partnerTypeCode === "1") {
        isIdFormatValid = !validateEmiratesId(
          String(values.representativeEmiratesId || ""),
        );
      }

      const idFieldHasIcpErrors =
        !initialData &&
        values.partnerTypeCode === "2" &&
        (normalizeVerificationMethod(values.verificationMethod) === VERIFICATION_METHOD.EMIRATES_ID
          ? form.getFieldError("emiratesId").length > 0
          : normalizeVerificationMethod(values.verificationMethod) === VERIFICATION_METHOD.UID
            ? form.getFieldError("uidNumber").length > 0
            : false);
      const isArabicNamesValid =
        values.partnerTypeCode !== "1" ||
        (isStrictArabicNameInputAllowed(values.fullNameAr) &&
          isStrictArabicNameInputAllowed(values.representativeNameAr));

      setIsFormValid(
        allFieldsFilled &&
          isIdFormatValid &&
          isArabicNamesValid &&
          isOccupationLengthValid(values.occupation) &&
          !idFieldHasIcpErrors,
      );
    } catch {
      setIsFormValid(false);
    }
  }, [form, initialData]);

  const handleRepresentativeOcrApply = useCallback(
    (payload: OcrApplyPayload) => {
      if (payload.emiratesId) {
        // setFieldsValue does not trigger onValuesChange; write the value with
        // a cleared error, then refresh the Save availability state.
        form.setFields([
          { name: "representativeEmiratesId", value: payload.emiratesId, errors: [] },
        ]);
        void checkFormValidity();
      }
      setIsOcrModalVisible(false);
    },
    [form, checkFormValidity],
  );

  const clearVerificationErrors = useCallback(() => {
    form.setFields([
      { name: "emiratesId", errors: [] },
      { name: "uidNumber", errors: [] },
      { name: "passportNumber", errors: [] },
    ]);
  }, [form]);

  const capturePersonalInformationSnapshot = useCallback(
    (actualMethod: VerificationMethod) => {
      if (partnerTypeCode !== "2") {
        return;
      }

      personalInformationSnapshotRef.current = {
        actualMethod,
        values: form.getFieldsValue(INDIVIDUAL_SNAPSHOT_FIELDS),
        documentFileNames: personalInformationDocumentFileNames,
      };
    },
    [form, partnerTypeCode, personalInformationDocumentFileNames],
  );

  const applyVerificationMethodValues = useCallback(
    (
      method: VerificationMethod,
      nextValues: Record<string, unknown> | PersonalProfilePartnerIdentity["mappedFormValues"],
    ) => {
      form.setFieldsValue({
        ...getIndividualSwitchFallbackResetValues(),
        ...nextValues,
        verificationMethod: method,
      });
      clearVerificationErrors();
    },
    [clearVerificationErrors, form],
  );

  const {
    verificationLoading: icpVerificationLoading,
    initialVerificationComplete: icpInitialVerificationComplete,
    setInitialVerificationComplete: setIcpInitialVerificationComplete,
    icpReadonlyFieldNames,
    resetIcpReadonlyFields,
    clearIcpMappedFields,
    onVerificationBlur,
    buildIcpLookupSignature,
    icpLookupSignatureRef,
  } = useIndividualIcpVerification({
    form,
    verificationMethod,
    nationalityList,
    context: "partnerModal",
    isAddMode: !initialData,
    isEditWithInitialData: !!initialData,
    enablePassportIcp: false,
    icpVerificationFailedMessage: t("individualIdentity.validation.icpVerificationFailed"),
    onVerificationComplete: (complete) => {
      if (!initialData) {
        setVerificationStep(complete ? "verified" : "initial");
      }
    },
    onIcpVerified: () => {
      setVerificationStep("verified");
    },
    onCheckFormValidity: () => {
      void checkFormValidity();
    },
    getSwitchFallbackValues: () => switchFallbackValuesRef.current,
    getEditSessionReadonlyFields: () =>
      initialData
        ? [
            "partnerTypeCode",
            "verificationMethod",
            "dateOfBirth",
            normalizeVerificationMethod(verificationMethod) === VERIFICATION_METHOD.EMIRATES_ID
              ? "emiratesId"
              : "uidNumber",
          ]
        : [],
  });

  const loadPartnerTypes = async () => {
    try {
      setLoadingPartnerTypes(true);
      const response = await getTypeDictionaryList("PartnerType");
      if (response.data) {
        setPartnerTypeList(response.data);
      }
    } catch (error) {
      console.error("Failed to load partner types:", error);
    } finally {
      setLoadingPartnerTypes(false);
    }
  };

  const loadNationalities = async () => {
    try {
      setLoadingNationalities(true);
      const response = await getNationalityList();
      if (response.data) {
        setNationalityList(response.data);
      }
    } catch (error) {
      console.error("Failed to load nationalities:", error);
    } finally {
      setLoadingNationalities(false);
    }
  };

  const displayName = (item: LocalizedNameSource | undefined) =>
    getLocalizedName(item, i18n.language);

  const localizedPdfUploadMessages = {
    invalidFileTypeMessage: t("individualIdentity.validation.validPdf"),
    maxSizeErrorMessage: t("individualIdentity.validation.fileSizeLessThan5Mb"),
  };

  const isIcpReadonly = (fieldName: string) =>
    icpReadonlyFieldNames.includes(fieldName);

  const mergeSwitchFallbackHistory = useCallback(
    (
      snapshotValues: Record<string, unknown> | undefined,
      method: VerificationMethod,
    ) => {
      switchFallbackValuesRef.current = mergeIndividualSwitchFallbackHistory(
        switchFallbackValuesRef.current,
        snapshotValues,
        method,
      );
      return switchFallbackValuesRef.current;
    },
    [],
  );

  const captureSwitchFallbackValues = useCallback(() => {
    if (partnerTypeCode !== "2") {
      switchFallbackValuesRef.current = {};
      return switchFallbackValuesRef.current;
    }
    return mergeSwitchFallbackHistory(
      form.getFieldsValue(getIndividualSwitchFallbackFieldKeys(verificationMethod)),
      verificationMethod,
    );
  }, [form, mergeSwitchFallbackHistory, partnerTypeCode, verificationMethod]);

  const handleVerificationMethodChange = useCallback(
    (method: VerificationMethod) => {
      const nextHistory =
        selectedVerificationOption === PERSONAL_INFORMATION_OPTION_VALUE
          ? switchFallbackValuesRef.current
          : captureSwitchFallbackValues();
      const nextFallbackValues = mergeSwitchFallbackValuesIntoIcpMapping(
        {
          values: {},
          readonlyFieldNames: [],
          addressSelection: undefined,
        },
        nextHistory,
        method,
      ).values;

      setSelectedVerificationOption(method);
      setVerificationMethod(method);
      resetIcpReadonlyFields();
      icpLookupSignatureRef.current = null;
      if (!initialData) {
        setIcpInitialVerificationComplete(false);
        setVerificationStep("initial");
        clearIcpMappedFields();
      }
      applyVerificationMethodValues(method, nextFallbackValues);
      void checkFormValidity();
    },
    [
      applyVerificationMethodValues,
      captureSwitchFallbackValues,
      checkFormValidity,
      clearIcpMappedFields,
      icpLookupSignatureRef,
      initialData,
      resetIcpReadonlyFields,
      selectedVerificationOption,
      setIcpInitialVerificationComplete,
    ],
  );

  const handlePersonalInformationSelection = useCallback(() => {
    if (
      !personalInformationAvailable ||
      !personalProfileIdentity?.actualMethod ||
      !personalProfileIdentity?.mappedFormValues
    ) {
      return;
    }

    captureSwitchFallbackValues();
    const actualMethod = personalProfileIdentity.actualMethod;
    const snapshot =
      personalInformationSnapshotRef.current?.actualMethod === actualMethod
        ? personalInformationSnapshotRef.current
        : null;
    const nextValues = snapshot?.values ?? personalProfileIdentity.mappedFormValues;
    const nextDocumentFileNames =
      snapshot?.documentFileNames ?? personalProfileIdentity.documentFileNames;

    setSelectedVerificationOption(PERSONAL_INFORMATION_OPTION_VALUE);
    setVerificationMethod(actualMethod);
    setPersonalInformationDocumentFileNames(nextDocumentFileNames);
    resetIcpReadonlyFields();
    icpLookupSignatureRef.current = null;
    if (!initialData) {
      setIcpInitialVerificationComplete(false);
      setVerificationStep("verified");
      clearIcpMappedFields();
    }
    applyVerificationMethodValues(actualMethod, nextValues);
    void checkFormValidity();
  }, [
    applyVerificationMethodValues,
    captureSwitchFallbackValues,
    checkFormValidity,
    clearIcpMappedFields,
    icpLookupSignatureRef,
    initialData,
    personalInformationAvailable,
    personalProfileIdentity,
    resetIcpReadonlyFields,
    setIcpInitialVerificationComplete,
  ]);

  const handleVerificationOptionChange = useCallback(
    (value: VerificationOptionValue) => {
      if (value === PERSONAL_INFORMATION_OPTION_VALUE) {
        handlePersonalInformationSelection();
        return;
      }

      if (
        selectedVerificationOption === PERSONAL_INFORMATION_OPTION_VALUE &&
        personalProfileIdentity?.actualMethod
      ) {
        capturePersonalInformationSnapshot(personalProfileIdentity.actualMethod);
      }

      handleVerificationMethodChange(normalizeVerificationMethod(value));
    },
    [
      capturePersonalInformationSnapshot,
      handlePersonalInformationSelection,
      handleVerificationMethodChange,
      personalProfileIdentity?.actualMethod,
      selectedVerificationOption,
    ],
  );

  const handleVerificationFieldsBlur = () => {
    if (partnerTypeCode !== "2") return;
    onVerificationBlur();
  };

  const handleFormValuesChange = (
    changedValues: Record<string, unknown>,
    allValues: Record<string, unknown>,
  ) => {
    const partnerTypeFromForm = String(allValues.partnerTypeCode ?? "");
    const prevPartnerTypeCode = prevPartnerTypeCodeRef.current;

    if (
      partnerTypeFromForm &&
      prevPartnerTypeCode &&
      partnerTypeFromForm !== prevPartnerTypeCode
    ) {
      form.setFields([
        { name: "fullNameAr", value: undefined, errors: [] },
        { name: "fullNameEn", value: undefined, errors: [] },
        { name: "representativeNameEn", value: undefined, errors: [] },
        { name: "representativeNameAr", value: undefined, errors: [] },
        { name: "representativeEmiratesId", value: undefined, errors: [] },
      ]);
    }
    prevPartnerTypeCodeRef.current = partnerTypeFromForm;

    const currentVerificationMethod = normalizeVerificationMethod(
      allValues.verificationMethod ?? verificationMethod,
    );

    if (
      partnerTypeFromForm === "2" &&
      selectedVerificationOption !== PERSONAL_INFORMATION_OPTION_VALUE
    ) {
      mergeSwitchFallbackHistory(
        form.getFieldsValue(
          getIndividualSwitchFallbackFieldKeys(currentVerificationMethod),
        ),
        currentVerificationMethod,
      );
    } else if (partnerTypeFromForm !== "2") {
      switchFallbackValuesRef.current = {};
    }

    if (!initialData && icpLookupSignatureRef.current) {
      if (partnerTypeFromForm !== "2") {
        switchFallbackValuesRef.current = {};
        icpLookupSignatureRef.current = null;
        resetIcpReadonlyFields();
        setVerificationStep("initial");
        setIcpInitialVerificationComplete(false);
        clearIcpMappedFields();
      } else {
        const nextSig = buildIcpLookupSignature(allValues);
        if (nextSig !== icpLookupSignatureRef.current) {
          icpLookupSignatureRef.current = null;
          resetIcpReadonlyFields();
          setVerificationStep("initial");
          setIcpInitialVerificationComplete(false);
          clearIcpMappedFields();
          form.setFields([
            { name: "emiratesId", errors: [] },
            { name: "uidNumber", errors: [] },
          ]);
        }
      }
    }
    const identityInputChanged =
      Object.prototype.hasOwnProperty.call(changedValues, "dateOfBirth") ||
      Object.prototype.hasOwnProperty.call(changedValues, "emiratesId");
    const canAutoLookupEmiratesId =
      visible &&
      !initialData &&
      partnerTypeFromForm === "2" &&
      selectedVerificationOption !== PERSONAL_INFORMATION_OPTION_VALUE &&
      currentVerificationMethod === VERIFICATION_METHOD.EMIRATES_ID;

    if (identityInputChanged && canAutoLookupEmiratesId) {
      const ready = isVerificationInputReady(
        VERIFICATION_METHOD.EMIRATES_ID,
        allValues.dateOfBirth,
        { emiratesId: allValues.emiratesId },
      );

      if (!ready) {
        autoEmiratesIdLookupSignatureRef.current = null;
      } else {
        const lookupSignature = buildIcpLookupSignature(allValues);
        if (autoEmiratesIdLookupSignatureRef.current !== lookupSignature) {
          autoEmiratesIdLookupSignatureRef.current = lookupSignature;
          onVerificationBlur();
        }
      }
    }

    void checkFormValidity();
  };

  useEffect(() => {
    if (visible) {
      loadPartnerTypes();
      loadNationalities();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      prevVisibleRef.current = false;
      prevPartnerTypeCodeRef.current = "";
      switchFallbackValuesRef.current = {};
      personalInformationSnapshotRef.current = null;
      autoEmiratesIdLookupSignatureRef.current = null;
      setPersonalInformationDocumentFileNames({});
      return;
    }

    const justOpened = !prevVisibleRef.current;
    prevVisibleRef.current = true;

    if (initialData) {
      setVerificationStep("initial");
      resetIcpReadonlyFields();
      personalInformationSnapshotRef.current = null;
      setPersonalInformationDocumentFileNames({});

      const initialVerificationMethod = normalizeVerificationMethod(
        initialData.verificationMethodCode || initialData.verificationMethod || 1,
      );
      const initialDateOfBirth = initialData.dateBirth || initialData.dateOfBirth;
      const initialUidNumber = initialData.uaeNumber || initialData.uidNumber;
      const initialGender = initialData.genderId || initialData.gender;
      const initialEmiratesIdUrl =
        initialData.emiratesIdUrl || initialData.emiratesIdurl;

      setVerificationMethod(initialVerificationMethod);
      setSelectedVerificationOption(
        initialData.isPersonalInformation
          ? PERSONAL_INFORMATION_OPTION_VALUE
          : initialVerificationMethod,
      );
      prevPartnerTypeCodeRef.current = String(initialData.partnerTypeCode ?? "");

      form.setFieldsValue({
        partnerTypeCode: initialData.partnerTypeCode,
        verificationMethod: initialVerificationMethod,
        dateOfBirth: initialDateOfBirth ? moment(initialDateOfBirth) : null,
        uidNumber: initialUidNumber,
        emiratesId: initialData.emiratesId,
        fullNameAr: initialData.fullNameAr,
        fullNameEn: initialData.fullNameEn,
        representativeNameEn: initialData.representativeNameEn,
        representativeNameAr: initialData.representativeNameAr,
        representativeEmiratesId: initialData.representativeEmiratesId,
        nationalityId: getNumberOrNull(initialData.nationalityId) ?? undefined,
        gender: initialGender,
        passportExpiryDate: initialData.passportExpiryDate
          ? moment(initialData.passportExpiryDate)
          : null,
        visaExpiryDate: initialData.visaExpiryDate
          ? moment(initialData.visaExpiryDate)
          : null,
        emiratesIdExpiryDate: initialData.expiryDate
          ? moment(initialData.expiryDate)
          : null,
        occupation: initialData.occupation,
        personalPhotoUrl: initialData.personalPhotoUrl,
        passportUrl: initialData.passportUrl,
        visaUrl: initialData.visaUrl,
        emiratesIdUrl: initialEmiratesIdUrl,
        passportNumber: initialData.passportNumber,
        passportScanUrl: initialData.passportScanUrl,
        memorandumOfAssociationUrl: initialData.memorandumOfAssociationUrl,
        powerOfAttorneyUrl: initialData.powerOfAttorneyUrl,
        statementUrl: initialData.statementUrl,
      });

      if (initialData.partnerTypeCode === "2") {
        setIcpInitialVerificationComplete(
          isVerificationInputReady(initialVerificationMethod, form.getFieldValue("dateOfBirth"), {
            emiratesId: initialData.emiratesId,
            uidNumber: initialUidNumber,
            passportNumber: initialData.passportNumber,
          }),
        );
      }

      setTimeout(() => {
        void checkFormValidity();
      }, 0);
    } else if (justOpened) {
      form.resetFields();
      setVerificationMethod(VERIFICATION_METHOD.EMIRATES_ID);
      setSelectedVerificationOption(VERIFICATION_METHOD.EMIRATES_ID);
      setIsFormValid(false);
      setVerificationStep("initial");
      setIcpInitialVerificationComplete(false);
      resetIcpReadonlyFields();
      prevPartnerTypeCodeRef.current = "";
      autoEmiratesIdLookupSignatureRef.current = null;
      switchFallbackValuesRef.current = {};
      personalInformationSnapshotRef.current = null;
      setPersonalInformationDocumentFileNames({});
    }
  }, [
    visible,
    initialData,
    form,
    checkFormValidity,
    resetIcpReadonlyFields,
    setIcpInitialVerificationComplete,
  ]);

  useEffect(() => {
    if (!visible || !initialData) return;
    if (initialData.partnerTypeCode !== "2") return;
    const vm = normalizeVerificationMethod(
      initialData.verificationMethodCode || initialData.verificationMethod || 1,
    );
    if (vm !== VERIFICATION_METHOD.EMIRATES_ID && vm !== VERIFICATION_METHOD.UID) return;
    if (nationalityList.length === 0) return;

    onVerificationBlur();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialData, nationalityList]);


  useEffect(() => {
    if (!visible || initialData || partnerTypeCode !== "2") return;
    if (selectedVerificationOption === PERSONAL_INFORMATION_OPTION_VALUE) return;
    if (verificationMethod !== VERIFICATION_METHOD.PASSPORT) return;

    const ready = isVerificationInputReady(
      VERIFICATION_METHOD.PASSPORT,
      dateOfBirthValue,
      { passportNumber: passportNumberValue },
    );

    if (!ready) return;

    onVerificationBlur();
  }, [
    dateOfBirthValue,
    initialData,
    onVerificationBlur,
    partnerTypeCode,
    passportNumberValue,
    selectedVerificationOption,
    verificationMethod,
    visible,
  ]);

  useEffect(() => {
    if (!visible) return;
    void checkFormValidity();
  }, [
    checkFormValidity,
    partnerTypeCode,
    selectedVerificationOption,
    verificationMethod,
    visible,
  ]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      const selectedPartnerType = partnerTypeList.find(
        (type) => type.code === values.partnerTypeCode,
      );
      const selectedNationality = nationalityList.find(
        (nat) => nat.id === values.nationalityId,
      );
      const vm = normalizeVerificationMethod(values.verificationMethod);
      const includeVisa = vm === VERIFICATION_METHOD.UID;

      const partnerData: PartnerData = {
        id: initialData?.id,
        isPersonalInformation: isPersonalInformationSelected,
        source:
          selectedVerificationOption === PERSONAL_INFORMATION_OPTION_VALUE
            ? 1
            : initialData?.source ??
              (verificationStep === "verified" ? 1 : 0),
        ...values,
        partnerTypeCode: values.partnerTypeCode,
        partnerTypeName: displayName(selectedPartnerType),
        verificationMethodCode: String(vm),
        verificationMethod: String(vm),
        dateBirth: values.dateOfBirth
          ? moment(values.dateOfBirth).format("YYYY-MM-DDTHH:mm:ss")
          : undefined,
        uaeNumber: values.uidNumber,
        emiratesId: values.emiratesId,
        fullNameAr: values.fullNameAr,
        fullNameEn: values.fullNameEn,
        representativeNameEn:
          values.partnerTypeCode === "1" ? getNullableString(values.representativeNameEn) : null,
        representativeNameAr:
          values.partnerTypeCode === "1" ? getNullableString(values.representativeNameAr) : null,
        representativeEmiratesId:
          values.partnerTypeCode === "1" ? getNullableString(values.representativeEmiratesId) : null,
        nationalityId: values.nationalityId
          ? Number(values.nationalityId)
          : undefined,
        nationalityName: displayName(selectedNationality),
        genderId: values.gender ? Number(values.gender) : undefined,
        passportExpiryDate: values.passportExpiryDate
          ? moment(values.passportExpiryDate).format(
              "YYYY-MM-DDTHH:mm:ss",
            )
          : undefined,
        visaExpiryDate: includeVisa && values.visaExpiryDate
          ? moment(values.visaExpiryDate).format("YYYY-MM-DDTHH:mm:ss")
          : undefined,
        expiryDate: values.emiratesIdExpiryDate
          ? moment(values.emiratesIdExpiryDate).format("YYYY-MM-DDTHH:mm:ss")
          : undefined,
        occupation: values.occupation || undefined,
        personalPhotoUrl: values.personalPhotoUrl || undefined,
        passportUrl: values.passportUrl || undefined,
        visaUrl: includeVisa ? values.visaUrl || undefined : undefined,
        emiratesIdUrl: values.emiratesIdUrl || undefined,
        emiratesIdurl: values.emiratesIdUrl || undefined,
        passportNumber: values.passportNumber || undefined,
        passportScanUrl: values.passportScanUrl || undefined,
        memorandumOfAssociationUrl:
          values.memorandumOfAssociationUrl || undefined,
        powerOfAttorneyUrl: values.powerOfAttorneyUrl || undefined,
        statementUrl: values.statementUrl || undefined,
      };

      setIsSaving(true);
      try {
        await Promise.resolve(onSave(partnerData));
      } finally {
        setIsSaving(false);
      }
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const shouldShowIndividualExtendedFields =
    !!initialData ||
    icpInitialVerificationComplete ||
    selectedVerificationOption === PERSONAL_INFORMATION_OPTION_VALUE ||
    verificationMethod === VERIFICATION_METHOD.PASSPORT;

  return (
    <Modal centered
      title={t("establishmentProfile.partner.modalTitle")}
      visible={visible}
      width={""}
      onCancel={handleCancel}
      footer={
        <div className="modal-footer">
          <CustomButton
            variant="outline"
            customClassName="cancel-btn"
            onClick={handleCancel}
          >
            {t("establishmentProfile.actions.cancel")}
          </CustomButton>
          <CustomButton
            customClassName="save-btn"
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            loading={isSaving}
          >
            {t("establishmentProfile.actions.save")}
          </CustomButton>
        </div>
      }
      className="partner-modal"
      destroyOnClose
    >
      <Spin spinning={icpVerificationLoading}>
      <Form
        form={form}
        layout="vertical"
        className="partner-form custorm-form"
        onValuesChange={handleFormValuesChange}
      >
        <Form.Item
          name="partnerTypeCode"
          label={t("establishmentProfile.partner.partnerType")}
          className="form-item"
          rules={[
            {
              required: true,
              message: t("establishmentProfile.partner.selectPartnerType"),
            },
          ]}
        >
          <Select
            loading={loadingPartnerTypes}
            placeholder={t(
              "formPlaceholders.pages.establishmentProfile.partner.selectPartnerType",
            )}
            disabled={isIcpReadonly("partnerTypeCode")}
          >
            {partnerTypeList.map((type) => (
              <Option key={type.id} value={type.code}>
                {displayName(type)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Company Form Fields */}
        {partnerTypeCode === "1" && (
          <>
            <div className="form-row">
              <Form.Item
                name="nationalityId"
                label={t("establishmentProfile.partner.nationality")}
                className="form-col"
              >
                <Select
                  placeholder={t(
                    "formPlaceholders.pages.establishmentProfile.partner.selectNationality",
                  )}
                  loading={loadingNationalities}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.children ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {nationalityList.map((nationalityId) => (
                    <Option key={nationalityId.id} value={nationalityId.id}>
                      {displayName(nationalityId)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="representativeEmiratesId"
                label={t("establishmentProfile.partner.representativeEmiratesId")}
                rules={[
                  {
                    required: true,
                    message: t("establishmentProfile.partner.enterRepresentativeEmiratesId"),
                  },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const message = validateEmiratesId(String(value));
                      return message
                        ? Promise.reject(new Error(message))
                        : Promise.resolve();
                    },
                  },
                ]}
                className="form-col"
              >
                <QueryInput
                  inputMask="784-9999-9999999-9"
                  maxLength={40}
                  showQueryButton={false}
                  ocrTitle={t("ocr.trigger")}
                  onOcrClick={() => setIsOcrModalVisible(true)}
                  placeholder="784-XXXX-XXXXXXX-X"
                />
              </Form.Item>
            </div>

            <div className="form-row">
              <Form.Item
                name="fullNameEn"
                label={t("establishmentProfile.fields.establishmentNameEnglish")}
                rules={[
                  {
                    required: true,
                    message: t("establishmentProfile.validation.enterNameEnglish"),
                  },
                ]}
                className="form-item"
              >
                <Input
                  placeholder={t(
                    "formPlaceholders.pages.establishmentProfile.enterNameEnglish",
                  )}
                />
              </Form.Item>

              <Form.Item
                name="fullNameAr"
                label={t("establishmentProfile.fields.establishmentNameArabic")}
                rules={[
                  {
                    required: true,
                    message: t("establishmentProfile.validation.enterNameArabic"),
                  },
                  {
                    validator: (_rule, value) =>
                      isStrictArabicNameInputAllowed(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error(t("individualIdentity.validation.arabicOnly"))),
                  },
                ]}
                className="form-col"
                getValueFromEvent={(event) =>
                  isStrictArabicNameInputAllowed(event?.target?.value)
                    ? event.target.value
                    : form.getFieldValue("fullNameAr")
                }
              >
                <Input
                  className={`arabic-input ${getArabicInputPlaceholderClassName(isAr)}`}
                  style={getArabicInputStyle()}
                  placeholder={t(
                    "formPlaceholders.pages.establishmentProfile.enterNameArabic",
                  )}
                  {...buildStrictArabicNameRestrictProps(form, "fullNameAr")}
                  onChange={(event) => {
                    if (isStrictArabicNameInputAllowed(event.target.value)) {
                      form.setFieldValue("fullNameAr", event.target.value);
                      void checkFormValidity();
                    }
                  }}
                />
              </Form.Item>
            </div>

            <div className="form-row">
              <Form.Item
                name="representativeNameEn"
                label={t("establishmentProfile.partner.representativeNameEnglish")}
                rules={[
                  {
                    required: true,
                    message: t("establishmentProfile.partner.enterRepresentativeNameEnglish"),
                  },
                  {
                    max: 512,
                    message: t("establishmentProfile.validation.maxCharacters", { max: 512 }),
                  },
                ]}
                className="form-col"
              >
                <Input
                  maxLength={512}
                  placeholder={t("establishmentProfile.partner.enterRepresentativeNameEnglish")}
                />
              </Form.Item>

              <Form.Item
                name="representativeNameAr"
                label={t("establishmentProfile.partner.representativeNameArabic")}
                rules={[
                  {
                    required: true,
                    message: t("establishmentProfile.partner.enterRepresentativeNameArabic"),
                  },
                  {
                    max: 200,
                    message: t("establishmentProfile.validation.maxCharacters", { max: 200 }),
                  },
                  {
                    validator: (_rule, value) =>
                      isStrictArabicNameInputAllowed(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error(t("individualIdentity.validation.arabicOnly"))),
                  },
                ]}
                className="form-col"
                getValueFromEvent={(event) =>
                  isStrictArabicNameInputAllowed(event?.target?.value)
                    ? event.target.value
                    : form.getFieldValue("representativeNameAr")
                }
              >
                <Input
                  className={`arabic-input ${getArabicInputPlaceholderClassName(isAr)}`}
                  style={getArabicInputStyle()}
                  maxLength={200}
                  placeholder={t("establishmentProfile.partner.enterRepresentativeNameArabic")}
                  {...buildStrictArabicNameRestrictProps(form, "representativeNameAr")}
                  onChange={(event) => {
                    if (isStrictArabicNameInputAllowed(event.target.value)) {
                      form.setFieldValue("representativeNameAr", event.target.value);
                      void checkFormValidity();
                    }
                  }}
                />
              </Form.Item>
            </div>

            <div className="form-row">
              <Form.Item
                name="powerOfAttorneyUrl"
                label={t("establishmentProfile.documents.powerOfAttorney")}
                className="form-item"
              >
                <DocumentViewer
                  hasDelete
                  uploadConfig={{
                    maxCount: 1,
                    maxSize: 5,
                    uploadTip: t("establishmentProfile.uploadTips.pdf"),
                    accept: ".pdf",
                    ...localizedPdfUploadMessages,
                  }}
                  fileName={initialData?.powerOfAttorneyUrl}
                />
              </Form.Item>

              <Form.Item
                name="memorandumOfAssociationUrl"
                label={t(
                  "establishmentProfile.documents.memorandumOfAssociation",
                )}
                className="form-col"
              >
                <DocumentViewer
                  hasDelete
                  uploadConfig={{
                    maxCount: 1,
                    maxSize: 5,
                    uploadTip: t("establishmentProfile.uploadTips.pdf"),
                    accept: ".pdf",
                    ...localizedPdfUploadMessages,
                  }}
                  fileName={initialData?.memorandumOfAssociationUrl}
                />
              </Form.Item>
            </div>

            <div className="form-row">
              <Form.Item
                name="statementUrl"
                label={t("establishmentProfile.documents.statement")}
                className="form-col"
              >
                <DocumentViewer
                  hasDelete
                  uploadConfig={{
                    maxCount: 1,
                    maxSize: 5,
                    uploadTip: t("establishmentProfile.uploadTips.pdf"),
                    accept: ".pdf",
                    ...localizedPdfUploadMessages,
                  }}
                  fileName={initialData?.statementUrl}
                />
              </Form.Item>
            </div>
          </>
        )}

        {partnerTypeCode === "2" && (
          <IndividualPartnerFields
            form={form}
            verificationMethod={verificationMethod}
            showExtendedFields={shouldShowIndividualExtendedFields}
            nationalityList={nationalityList}
            loadingNationalities={loadingNationalities}
            verificationLoading={icpVerificationLoading}
            enableVerificationLookup={
              selectedVerificationOption !== PERSONAL_INFORMATION_OPTION_VALUE
            }
            disableAllFields={isPersonalInformationSelected}
            icpReadonlyFieldNames={icpReadonlyFieldNames}
            isAr={isAr}
            onVerificationMethodChange={handleVerificationMethodChange}
            onVerificationOptionChange={handleVerificationOptionChange}
            onVerificationBlur={handleVerificationFieldsBlur}
            onOcrApply={() => {
              // AntD Form.setFieldsValue does not trigger onValuesChange, so keep
              // the switch fallback cache aligned with the OCR-confirmed values.
              // Otherwise the delayed passport verification can restore stale data.
              captureSwitchFallbackValues();
              void checkFormValidity();
            }}
            verificationOptions={verificationOptions}
            selectedVerificationOption={selectedVerificationOption}
            documentFileNames={
              selectedVerificationOption === PERSONAL_INFORMATION_OPTION_VALUE
                ? personalInformationDocumentFileNames
                : undefined
            }
            initialData={initialData}
          />
        )}
      </Form>
      </Spin>
      <OcrModal
        visible={isOcrModalVisible}
        documentType={OCR_DOCUMENT_TYPE.EMIRATES_ID}
        nationalityList={nationalityList}
        onApply={handleRepresentativeOcrApply}
        onClose={() => setIsOcrModalVisible(false)}
      />
    </Modal>
  );
};

export default PartnerModal;
