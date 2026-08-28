import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  observer,
  useField,
  useForm,
  Field,
  FormProvider,
} from "@formily/react";
import { createForm } from "@formily/core";
import { FormItem, Form } from "@formily/antd";
import { Modal, Row, Col, Input, Select, Card } from "antd";
import IDSelectorField from "../IDSelector/IDSelectorField";
import QueryInput from "../IDSelector/components/QueryInput";
import { OcrModal, OCR_DOCUMENT_TYPE } from "@/components/common/ocr";
import type { OcrApplyPayload } from "@/components/common/ocr";
import {
  type IDSelectorValue,
  restoreIcpLookupMetadata,
  stripIcpLookupMetadata,
  validateEmiratesId,
} from "../IDSelector/idSelectorUtils";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import CustomButton from "../../../../../components/common/CustomButton";
import {
  getNationalityList,
} from "../../../../../services/userProfile";
import { CustomMessage } from "../../../../../components/common";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import CompanyProfileIcon from "../../../../../assets/images/profile-company.svg";
import IndividualProfileIcon from "../../../../../assets/images/profile-individual.svg";
import YonghuIcon from "../../../../../assets/images/yonghu.svg";
import NumberIcon from "../../../../../assets/images/number.svg";
import DizhiIcon from "../../../../../assets/images/dizhi.svg";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { getArabicInputStyle } from "@/utils/inputDirection";
import { isStrictArabicNameInputAllowed } from "@/utils/individualIdentity/validation";
import { buildStrictArabicNameRestrictProps } from "@/utils/individualIdentity/restrictedNameInput";
import "./styles.less";
import "@/components/common/CustomStatusTag/index.less";

const { Option } = Select;

const FORMILY_CONTROL_DROPDOWN_CLASS = "formily-control-dropdown";
const SERVICE_905_INITIAL_PARTNER_IDS_FIELD = "partnerManagementInitialPartnerIds";
const PENDING_DELETE_PARTNER_LIST_FIELD = "pendingDeletePartnerList";
const INDIVIDUAL_ATTACHMENT_EDIT_FIELDS = [
  "PersonalPhoto",
  "EmiratesID",
  "PassportScan",
  "Passport",
  "Visa",
] as const;
const DUPLICATE_IDENTIFIER_FIELDS = [
  "emiratesId",
  "uid",
  "passportNumber",
] as const;

export type PartnerItem = IDSelectorValue & {
  id: string;
  isOwner?: boolean;
  partnerType: "individual" | "company";
  partnerTypeCode?: number | string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  fullNameAr?: string;
  fullNameEn?: string;
  establishmentNameArabic?: string;
  establishmentNameEnglish?: string;
  nationality?: number | string;
  nationalityId?: number | string;
  idNumber?: string;
  licenseNumber?: string;
  city?: string;
  cityEn?: string;
  cityAr?: string;
  emirate?: string;
  emirateEn?: string;
  emirateAr?: string;
  location?: string;
  locationEn?: string;
  locationAr?: string;
  status?: string;
  statusEn?: string;
  statusAr?: string;
  statusName?: string;
  statusNameEn?: string;
  statusNameAr?: string;
  personalPhotoUrl?: string;
  partnerPhotoUrl?: string;
  representativeEmiratesId?: string | null;
  representativeNameEn?: string | null;
  representativeNameAr?: string | null;
  PersonalPhoto?: string;
  memorandumOfAssociation?: any;
  powerOfAttorney?: any;
  statement?: any;
};

type DuplicateIdentifierField = (typeof DUPLICATE_IDENTIFIER_FIELDS)[number];

const getIdentifierSourceValue = (
  partner: Record<string, unknown> | null | undefined,
  fieldName: DuplicateIdentifierField,
) => {
  if (!partner) {
    return undefined;
  }

  if (fieldName === "emiratesId") {
    return partner.emiratesId ?? partner.eid;
  }

  if (fieldName === "uid") {
    return partner.uid ?? partner.uaeNumber ?? partner.uidNumber;
  }

  return partner.passportNumber ?? partner.passportNo;
};

const isOwnerPartner = (partner: unknown) =>
  Boolean((partner as { isOwner?: boolean } | null | undefined)?.isOwner);

const resolvePartnerType = (partner: PartnerItem): "individual" | "company" => {
  const partnerTypeCode = String(partner.partnerTypeCode ?? "").trim();

  if (partnerTypeCode === "1") {
    return "company";
  }

  if (partnerTypeCode === "2") {
    return "individual";
  }

  return partner.partnerType === "company" ? "company" : "individual";
};

const normalizePartnerId = (value: unknown) => String(value ?? "").trim();
const REMOVED_PARTNER_LIST_FIELD = "removedPartnerList";

const normalizeIdentifierValue = (
  fieldName: DuplicateIdentifierField,
  value: unknown,
) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (fieldName === "passportNumber") {
    return normalizedValue.toUpperCase();
  }

  return normalizedValue.replace(/\D/g, "");
};

const getPartnerIdentifierValues = (
  partner?: Record<string, unknown> | null,
): Record<DuplicateIdentifierField, string> => ({
  emiratesId: normalizeIdentifierValue(
    "emiratesId",
    getIdentifierSourceValue(partner, "emiratesId"),
  ),
  uid: normalizeIdentifierValue("uid", getIdentifierSourceValue(partner, "uid")),
  passportNumber: normalizeIdentifierValue(
    "passportNumber",
    getIdentifierSourceValue(partner, "passportNumber"),
  ),
});

const hasPartnerIdentifierChanges = (
  previousPartner: PartnerItem | undefined,
  nextPartner: PartnerItem,
) => {
  const previousIdentifiers = getPartnerIdentifierValues(previousPartner);
  const nextIdentifiers = getPartnerIdentifierValues(nextPartner);

  return DUPLICATE_IDENTIFIER_FIELDS.some(
    (fieldName) => previousIdentifiers[fieldName] !== nextIdentifiers[fieldName],
  );
};

const hasDuplicatePartnerIdentifiers = (
  nextPartner: PartnerItem,
  partners: PartnerItem[],
  currentId?: string | null,
) => {
  const nextPartnerIdentifiers = getPartnerIdentifierValues(nextPartner);

  return DUPLICATE_IDENTIFIER_FIELDS.some((fieldName) => {
    const identifierValue = nextPartnerIdentifiers[fieldName];

    if (!identifierValue) {
      return false;
    }

    return partners.some((partner) => {
      if (partner.id === currentId) {
        return false;
      }

      return (
        getPartnerIdentifierValues(partner)[fieldName] === identifierValue
      );
    });
  });
};

const PartnerListFieldDom: React.FC<any> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField<any>();
  const form = useForm();
  const value = React.useMemo(
    () => (Array.isArray(field.value) ? field.value : []) as PartnerItem[],
    [field.value],
  );
  const isAr = Boolean(i18n.language?.startsWith("ar"));

  const {
    labelName,
    addButtonLabel,
    showEmiratesId = true,
    showUID = true,
    showPassport = true,
    service905OwnerPartners = [],
  } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [formInstance, setFormInstance] = useState<any>(null);
  const [nationalityList, setNationalityList] = useState<any[]>([]);
  const [partnerType, setPartnerType] = useState<"individual" | "company">(
    "individual",
  );
  const [companyData, setCompanyData] = useState<any>({});
  const [representativeOcrVisible, setRepresentativeOcrVisible] = useState(false);
  const [isIcpReady, setIsIcpReady] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingPartner, setDeletingPartner] = useState<PartnerItem | null>(null);
  const isEditing = modalMode === "edit";
  const isViewing = modalMode === "view";
  const isReviewMode =
    field.pattern === "readPretty" || form.pattern === "readPretty";
  const isFieldLocked =
    field.pattern === "disabled" || field.pattern === "readOnly";
  const isFormLocked =
    form.pattern === "disabled" ||
    form.pattern === "readOnly";
  const hideActionButtons = isFieldLocked || isFormLocked;
  const isReadonlyPresentation =
    isReviewMode || isFieldLocked || isFormLocked;
  const localizedLabelName = labelName ?? t("PartnerList.title");
  const localizedAddButtonLabel = addButtonLabel ?? t("PartnerList.addNewPartner");
  const partnerTypeOptions = React.useMemo(
    () => [
      { label: t("PartnerList.partnerType.individual"), value: "individual" },
      { label: t("PartnerList.partnerType.company"), value: "company" },
    ],
    [t],
  );

  useEffect(() => {
    const loadNationalityList = async () => {
      try {
        const res = await getNationalityList();
        if (res.data) {
          setNationalityList(res.data);
        }
      } catch (error) {
        console.error("Failed to load nationality list:", error);
      }
    };
    loadNationalityList();
  }, []);

  useEffect(() => {
    if (!Array.isArray(field.value)) {
      return;
    }

    const editablePartners = field.value.filter((partner: PartnerItem) => {
      return !isOwnerPartner(partner);
    });

    if (editablePartners.length !== field.value.length) {
      field.setValue(editablePartners);
    }
  }, [field, field.value]);

  const nationalityMap = React.useMemo(() => {
    const map = new Map<number, any>();
    nationalityList.forEach((item) => map.set(item.id, item));
    return map;
  }, [nationalityList]);

  const ownerPartners = React.useMemo(
    () =>
      Array.isArray(service905OwnerPartners)
        ? (service905OwnerPartners as PartnerItem[])
        : [],
    [service905OwnerPartners],
  );
  const ownerPartnerIdSet = React.useMemo(
    () =>
      new Set(
        ownerPartners.map((partner) => normalizePartnerId(partner.id)).filter(Boolean),
      ),
    [ownerPartners],
  );
  const rawRemovedPartnerList = (form.values as Record<string, unknown> | undefined)?.[
    REMOVED_PARTNER_LIST_FIELD
  ];
  const removedPartnerList = React.useMemo(
    () =>
      Array.isArray(rawRemovedPartnerList)
        ? (rawRemovedPartnerList as PartnerItem[])
        : [],
    [rawRemovedPartnerList],
  );
  const removedOwnerIdSet = React.useMemo(
    () =>
      new Set(
        removedPartnerList
          .map((partner) => normalizePartnerId(partner?.id))
          .filter((id) => id && ownerPartnerIdSet.has(id)),
      ),
    [ownerPartnerIdSet, removedPartnerList],
  );
  const rawPendingDeletePartnerList = (form.values as Record<string, unknown> | undefined)?.[
    PENDING_DELETE_PARTNER_LIST_FIELD
  ];
  const pendingDeletePartnerList = React.useMemo(
    () =>
      Array.isArray(rawPendingDeletePartnerList)
        ? (rawPendingDeletePartnerList as PartnerItem[])
        : [],
    [rawPendingDeletePartnerList],
  );
  const updatePendingDeletePartnerList = React.useCallback(
    (nextPendingDelete: PartnerItem[]) => {
      if (nextPendingDelete.length > 0) {
        form.setValuesIn(PENDING_DELETE_PARTNER_LIST_FIELD, nextPendingDelete);
      } else {
        form.deleteValuesIn(PENDING_DELETE_PARTNER_LIST_FIELD);
      }
    },
    [form],
  );
  const ownerPartnerOverrides = React.useMemo(() => {
    const overrides = new Map<string, PartnerItem>();
    value.forEach((partner) => {
      const normalizedId = normalizePartnerId(partner.id);
      if (normalizedId && ownerPartnerIdSet.has(normalizedId)) {
        overrides.set(normalizedId, partner);
      }
    });
    return overrides;
  }, [ownerPartnerIdSet, value]);
  const displayedOwnerPartners = React.useMemo(
    () =>
      ownerPartners
        .filter((partner) => !removedOwnerIdSet.has(normalizePartnerId(partner.id)))
        .map((partner) => {
          const normalizedId = normalizePartnerId(partner.id);
          const overridePartner = ownerPartnerOverrides.get(normalizedId);

          if (!overridePartner) {
            return partner;
          }

          return {
            ...partner,
            ...overridePartner,
            isOwner: true,
          };
        }),
    [ownerPartnerOverrides, ownerPartners, removedOwnerIdSet],
  );
  const editablePartners = React.useMemo(
    () =>
      value.filter((partner) => {
        const normalizedId = normalizePartnerId(partner.id);

        if (!normalizedId) {
          return true;
        }

        return !ownerPartnerIdSet.has(normalizedId) && !isOwnerPartner(partner);
      }),
    [ownerPartnerIdSet, value],
  );
  const rawInitialPartnerIds = (form.values as Record<string, unknown> | undefined)?.[
    SERVICE_905_INITIAL_PARTNER_IDS_FIELD
  ];
  const initialPartnerIdSet = new Set(
    Array.isArray(rawInitialPartnerIds)
      ? rawInitialPartnerIds.map((id) => normalizePartnerId(id)).filter(Boolean)
      : [],
  );

  const isExistingInitialPartner = (partner: PartnerItem | undefined) => {
    if (!partner) {
      return false;
    }

    return initialPartnerIdSet.has(normalizePartnerId(partner.id));
  };
  const isOwnerPartnerById = React.useCallback(
    (partnerId: unknown) => ownerPartnerIdSet.has(normalizePartnerId(partnerId)),
    [ownerPartnerIdSet],
  );
  const updateRemovedPartnerList = React.useCallback(
    (nextRemovedPartners: PartnerItem[]) => {
      if (nextRemovedPartners.length > 0) {
        form.setValuesIn(REMOVED_PARTNER_LIST_FIELD, nextRemovedPartners);
        return;
      }

      form.deleteValuesIn(REMOVED_PARTNER_LIST_FIELD);
    },
    [form],
  );
  const getPartnerById = React.useCallback(
    (partnerId: string | null | undefined) => {
      const normalizedId = normalizePartnerId(partnerId);
      if (!normalizedId) {
        return undefined;
      }

      return value.find((partner) => normalizePartnerId(partner.id) === normalizedId)
        || ownerPartners.find((partner) => normalizePartnerId(partner.id) === normalizedId);
    },
    [ownerPartners, value],
  );

  const getDisplayName = (partner: PartnerItem): string => {
    if (resolvePartnerType(partner) === "company") {
      return (
        preferLocalizedEnAr(
        isAr,
        partner.establishmentNameEnglish ||
          partner.fullNameEn ||
          partner.fullNameEnglish,
        partner.establishmentNameArabic ||
          partner.fullNameAr ||
          partner.fullNameArabic,
        ) || "-"
      );
    }
    return (
      preferLocalizedEnAr(
        isAr,
        partner.fullNameEnglish ||
          partner.fullNameEn,
        partner.fullNameArabic ||
          partner.fullNameAr,
      ) || "-"
    );
  };

  const getIdNumber = (partner: PartnerItem): string => {
    if (resolvePartnerType(partner) === "company") {
      return partner.licenseNumber || "-";
    }
    const emiratesId = getIdentifierSourceValue(
      partner as Record<string, unknown>,
      "emiratesId",
    );
    if (emiratesId) return String(emiratesId);
    const uid = getIdentifierSourceValue(
      partner as Record<string, unknown>,
      "uid",
    );
    if (uid) return String(uid);
    const passportNumber = getIdentifierSourceValue(
      partner as Record<string, unknown>,
      "passportNumber",
    );
    if (passportNumber) return String(passportNumber);
    return "-";
  };

  const getNationalityName = (nationalityId?: number | string): string => {
    if (!nationalityId) return "-";
    const item = nationalityMap.get(Number(nationalityId));
    if (!item) return "-";
    return (
      preferLocalizedEnAr(
        isAr,
        item.nameEn ?? item.fullNameEn ?? item.name,
        item.nameAr ?? item.fullNameAr,
      ) || "-"
    );
  };

  const getPartnerStatusLabel = (partner: PartnerItem): string | null => {
    const label =
      preferLocalizedEnAr(
        isAr,
        partner.statusNameEn || partner.statusEn || partner.statusName || partner.status,
        partner.statusNameAr || partner.statusAr,
      ) || "";

    return label.trim() || null;
  };

  const getPartnerLocation = (partner: PartnerItem): string => {
    const location =
      preferLocalizedEnAr(
        isAr,
        partner.locationEn || partner.cityEn || partner.emirateEn || partner.location || partner.city || partner.emirate,
        partner.locationAr || partner.cityAr || partner.emirateAr,
      ) || "";

    return location.trim() || getNationalityName(partner.nationality ?? partner.nationalityId);
  };

  const openModal = () => {
    setEditingId(null);
    setModalMode("add");
    setPartnerType("individual");
    setCompanyData({});
    setIsIcpReady(false);
    setModalOpen(true);
    const form = createForm({
      initialValues: {
        idSelector: {},
      },
    });
    setFormInstance(form);
  };

  const openEditModal = (partner: PartnerItem) => {
    setEditingId(partner.id);
    setModalMode("edit");
    setPartnerType(resolvePartnerType(partner));
    setModalOpen(true);
    setIsIcpReady(resolvePartnerType(partner) === "company");

    if (resolvePartnerType(partner) === "company") {
      setCompanyData({
        nationality: partner.nationality,
        representativeEmiratesId: partner.representativeEmiratesId,
        representativeNameEn: partner.representativeNameEn,
        representativeNameAr: partner.representativeNameAr,
        establishmentNameArabic: partner.establishmentNameArabic,
        establishmentNameEnglish: partner.establishmentNameEnglish,
        memorandumOfAssociation: partner.memorandumOfAssociation,
        powerOfAttorney: partner.powerOfAttorney,
        statement: partner.statement,
      });
      setFormInstance(null);
    } else {
      setCompanyData({});
      const form = createForm({
        initialValues: {
          idSelector: restoreIcpLookupMetadata(partner),
        },
      });
      setFormInstance(form);
    }
  };

  const openViewModal = (partner: PartnerItem) => {
    setEditingId(partner.id);
    setModalMode("view");
    setPartnerType(resolvePartnerType(partner));
    setModalOpen(true);
    setIsIcpReady(resolvePartnerType(partner) === "company");

    if (resolvePartnerType(partner) === "company") {
      setCompanyData({
        nationality: partner.nationality,
        representativeEmiratesId: partner.representativeEmiratesId,
        representativeNameEn: partner.representativeNameEn,
        representativeNameAr: partner.representativeNameAr,
        establishmentNameArabic: partner.establishmentNameArabic,
        establishmentNameEnglish: partner.establishmentNameEnglish,
        memorandumOfAssociation: partner.memorandumOfAssociation,
        powerOfAttorney: partner.powerOfAttorney,
        statement: partner.statement,
      });
      setFormInstance(null);
      return;
    }

    setCompanyData({});
    const nextForm = createForm({
      initialValues: {
        idSelector: restoreIcpLookupMetadata(partner),
      },
    });
    nextForm.setPattern("readOnly");
    setFormInstance(nextForm);
  };

  const closeModal = () => {
    setModalOpen(false);
    setRepresentativeOcrVisible(false);
    setEditingId(null);
    setModalMode("add");
    setFormInstance(null);
    setCompanyData({});
    setIsIcpReady(false);
  };
  const handleSave = async () => {
    let newPartner: PartnerItem;
    let idSelectorValue: IDSelectorValue | undefined;
    const existingPartner = editingId ? getPartnerById(editingId) : undefined;
    const partnersForDuplicateCheck = [...ownerPartners, ...value];
    const isEditingOwnerPartner = existingPartner
      ? isOwnerPartnerById(existingPartner.id)
      : false;
    const isEditingExistingInitialPartner =
      isExistingInitialPartner(existingPartner) || isEditingOwnerPartner;

    if (partnerType === "company") {
      if (
        !String(companyData.establishmentNameArabic || "").trim() ||
        !isStrictArabicNameInputAllowed(companyData.establishmentNameArabic) ||
        !String(companyData.establishmentNameEnglish || "").trim() ||
        !String(companyData.representativeEmiratesId || "").trim() ||
        validateEmiratesId(String(companyData.representativeEmiratesId || "")) ||
        !String(companyData.representativeNameEn || "").trim() ||
        !String(companyData.representativeNameAr || "").trim() ||
        !isStrictArabicNameInputAllowed(companyData.representativeNameAr)
      ) {
        return;
      }
      newPartner = {
        ...(existingPartner || {}),
        id:
          editingId ||
          `partner-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        partnerType: "company",
        ...companyData,
        representativeEmiratesId: String(companyData.representativeEmiratesId || "").trim(),
        representativeNameEn: String(companyData.representativeNameEn || "").trim(),
        representativeNameAr: String(companyData.representativeNameAr || "").trim(),
      };
    } else {
      if (!formInstance) return;
      try {
        await formInstance.validate();
        const formValues = formInstance.values;
        idSelectorValue = stripIcpLookupMetadata(
          formValues.idSelector || formValues,
        );
        newPartner = {
          ...(existingPartner || {}),
          id:
            editingId ||
            `partner-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          partnerType: "individual",
          representativeEmiratesId: null,
          representativeNameEn: null,
          representativeNameAr: null,
          ...idSelectorValue,
        };
      } catch (error) {
        console.error("Form validation failed:", error);
        return;
      }

      if (isEditingExistingInitialPartner) {
        newPartner = {
          ...(existingPartner || {}),
          representativeEmiratesId: null,
          representativeNameEn: null,
          representativeNameAr: null,
          PersonalPhoto: idSelectorValue?.PersonalPhoto,
          EmiratesID: idSelectorValue?.EmiratesID,
          PassportScan: idSelectorValue?.PassportScan,
          Passport: idSelectorValue?.Passport,
          Visa: idSelectorValue?.Visa,
        };
      }
    }

    if (partnerType === "company" && isEditingExistingInitialPartner) {
      newPartner = {
        ...(existingPartner || {}),
        representativeEmiratesId: String(companyData.representativeEmiratesId || "").trim(),
        representativeNameEn: String(companyData.representativeNameEn || "").trim(),
        representativeNameAr: String(companyData.representativeNameAr || "").trim(),
        memorandumOfAssociation: companyData.memorandumOfAssociation,
        powerOfAttorney: companyData.powerOfAttorney,
        statement: companyData.statement,
      } as PartnerItem;
    }

    const shouldCheckDuplicate =
      !editingId || hasPartnerIdentifierChanges(existingPartner, newPartner);

    if (
      shouldCheckDuplicate &&
      hasDuplicatePartnerIdentifiers(
        newPartner,
        partnersForDuplicateCheck,
        editingId,
      )
    ) {
      CustomMessage.error(t("PartnerList.duplicatePartner"));
      return;
    }

    if (editingId) {
      const normalizedEditingId = normalizePartnerId(editingId);

      if (isEditingOwnerPartner) {
        const nextOwnerPartner: PartnerItem = {
          ...newPartner,
          isOwner: undefined,
        };
        const nextPartners = value.filter(
          (partner) => normalizePartnerId(partner.id) !== normalizedEditingId,
        );

        nextPartners.push(nextOwnerPartner);
        field.setValue(nextPartners);
        updateRemovedPartnerList(
          removedPartnerList.filter(
            (partner) => normalizePartnerId(partner.id) !== normalizedEditingId,
          ),
        );
      } else {
        const next = value.map((v) => (v.id === editingId ? newPartner : v));
        field.setValue(next);
      }
    } else {
      field.setValue([...value, newPartner]);
    }

    closeModal();
  };

  const openDeleteModal = (partner: PartnerItem) => {
    setDeletingPartner(partner);
    setDeleteModalVisible(true);
  };

  const handleDelete = () => {
    if (deletingPartner) {
      const normalizedDeletingId = normalizePartnerId(deletingPartner.id);

      if (isOwnerPartnerById(deletingPartner.id)) {
        const nextPartners = value.filter(
          (partner) => normalizePartnerId(partner.id) !== normalizedDeletingId,
        );
        const ownerSourcePartner =
          ownerPartners.find(
            (partner) => normalizePartnerId(partner.id) === normalizedDeletingId,
          ) || deletingPartner;
        const nextRemovedPartnerList = removedPartnerList.filter(
          (partner) => normalizePartnerId(partner.id) !== normalizedDeletingId,
        );

        nextRemovedPartnerList.push(ownerSourcePartner);
        field.setValue(nextPartners);
        updateRemovedPartnerList(nextRemovedPartnerList);
      } else {
        const partnerToDelete =
          value.find((partner) => normalizePartnerId(partner.id) === normalizedDeletingId)
          || deletingPartner;
        const next = value.filter(
          (partner) => normalizePartnerId(partner.id) !== normalizedDeletingId,
        );
        field.setValue(next);
        updatePendingDeletePartnerList([...pendingDeletePartnerList, partnerToDelete]);
      }
    }
    setDeleteModalVisible(false);
    setDeletingPartner(null);
  };

  const handleRestoreDeleted = (partner: PartnerItem) => {
    const normalizedId = normalizePartnerId(partner.id);
    updatePendingDeletePartnerList(
      pendingDeletePartnerList.filter((p) => normalizePartnerId(p.id) !== normalizedId),
    );
    field.setValue([...value, partner]);
  };

  const handleRestoreOwner = (partner: PartnerItem) => {
    const normalizedId = normalizePartnerId(partner.id);
    updateRemovedPartnerList(
      removedPartnerList.filter((p) => normalizePartnerId(p.id) !== normalizedId),
    );
  };

  const handleCompanyFieldChange = (key: string, val: any) => {
    setCompanyData((prev: any) => ({ ...prev, [key]: val }));
  };

  const editingPartner = editingId ? getPartnerById(editingId) : undefined;
  const isEditingExistingInitialPartner =
    isExistingInitialPartner(editingPartner)
    || (editingPartner ? isOwnerPartnerById(editingPartner.id) : false);

  const handleRepresentativeOcrApply = (payload: OcrApplyPayload) => {
    if (payload.emiratesId) {
      handleCompanyFieldChange("representativeEmiratesId", payload.emiratesId);
    }
    setRepresentativeOcrVisible(false);
  };
  const renderCompanyForm = () => (
    <div className="partner-company-form">
      <Row gutter={24} className="partner-company-grid">
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.nationality")}</div>
          <Select
            placeholder={t("PartnerList.placeholder.selectNationality")}
            value={companyData.nationality}
            onChange={(val) => handleCompanyFieldChange("nationality", val)}
            showSearch
            optionFilterProp="children"
            disabled={isViewing || isEditingExistingInitialPartner}
            dropdownClassName={FORMILY_CONTROL_DROPDOWN_CLASS}
            style={{ width: "100%" }}
          >
            {nationalityList.map((item) => (
              <Option key={item.id} value={item.id}>
                {preferLocalizedEnAr(isAr, item.nameEn ?? item.fullNameEn ?? item.name, item.nameAr ?? item.fullNameAr)}
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <div className="partner-form-label">
            {t("PartnerList.label.representativeEmiratesId")} <span className="partner-required">*</span>
          </div>
          <QueryInput
            value={companyData.representativeEmiratesId || ""}
            inputMask="784-9999-9999999-9"
            maxLength={18}
            placeholder="784-XXXX-XXXXXXX-X"
            showQueryButton={false}
            disabled={isViewing}
            ocrTitle={t("ocr.trigger")}
            onOcrClick={() => setRepresentativeOcrVisible(true)}
            onChange={(e) => handleCompanyFieldChange("representativeEmiratesId", e.target.value)}
          />
        </Col>
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.establishmentNameEnglish")} <span className="partner-required">*</span></div>
          <Input
            placeholder={t("PartnerList.placeholder.establishmentNameEnglish")}
            value={companyData.establishmentNameEnglish || ""}
            disabled={isViewing || isEditingExistingInitialPartner}
            onChange={(e) => handleCompanyFieldChange("establishmentNameEnglish", e.target.value)}
          />
        </Col>
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.establishmentNameArabic")} <span className="partner-required">*</span></div>
          <Input
            className="arabic-input"
            style={getArabicInputStyle()}
            placeholder={t("PartnerList.placeholder.establishmentNameArabic")}
            value={companyData.establishmentNameArabic || ""}
            disabled={isViewing || isEditingExistingInitialPartner}
            {...buildStrictArabicNameRestrictProps(undefined, "establishmentNameArabic")}
            onChange={(e) => {
              if (isStrictArabicNameInputAllowed(e.target.value)) {
                handleCompanyFieldChange("establishmentNameArabic", e.target.value);
              }
            }}
          />
        </Col>
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.representativeNameEn")} <span className="partner-required">*</span></div>
          <Input
            placeholder={t("PartnerList.placeholder.representativeNameEn")}
            value={companyData.representativeNameEn || ""}
            disabled={isViewing}
            onChange={(e) => handleCompanyFieldChange("representativeNameEn", e.target.value)}
          />
        </Col>
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.representativeNameAr")} <span className="partner-required">*</span></div>
          <Input
            className="arabic-input"
            style={getArabicInputStyle()}
            placeholder={t("PartnerList.placeholder.representativeNameAr")}
            value={companyData.representativeNameAr || ""}
            disabled={isViewing}
            {...buildStrictArabicNameRestrictProps(undefined, "representativeNameAr")}
            onChange={(e) => {
              if (isStrictArabicNameInputAllowed(e.target.value)) {
                handleCompanyFieldChange("representativeNameAr", e.target.value);
              }
            }}
          />
        </Col>
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.powerOfAttorney")}</div>
          <DocumentViewer hasDelete={!isViewing} value={companyData.powerOfAttorney} onChange={(val) => handleCompanyFieldChange("powerOfAttorney", val)} disabled={isViewing} uploadConfig={{ maxCount: 1, maxSize: 5, uploadTip: t("PartnerList.uploadTip.pdf"), accept: ".pdf" }} />
        </Col>
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.memorandumOfAssociation")}</div>
          <DocumentViewer hasDelete={!isViewing} value={companyData.memorandumOfAssociation} onChange={(val) => handleCompanyFieldChange("memorandumOfAssociation", val)} disabled={isViewing} uploadConfig={{ maxCount: 1, maxSize: 5, uploadTip: t("PartnerList.uploadTip.pdf"), accept: ".pdf" }} />
        </Col>
        <Col span={12}>
          <div className="partner-form-label">{t("PartnerList.label.statement")}</div>
          <DocumentViewer hasDelete={!isViewing} value={companyData.statement} onChange={(val) => handleCompanyFieldChange("statement", val)} disabled={isViewing} uploadConfig={{ maxCount: 1, maxSize: 5, uploadTip: t("PartnerList.uploadTip.pdf"), accept: ".pdf" }} />
        </Col>
      </Row>
    </div>
  );

  const renderIndividualForm = () => (
    <div className="partner-individual-form">
      <div className="partner-verify-question">
        {t("PartnerList.verifyQuestion")}
      </div>
      {formInstance && (
        <FormProvider form={formInstance}>
          <Form form={formInstance} layout="vertical">
            <Field
              name="idSelector"
              component={[
                IDSelectorField,
                {
                  showEmiratesId,
                  showUID,
                  showPassport,
                  onIcpLoadedChange: setIsIcpReady,
                  editableFieldKeys: isEditingExistingInitialPartner
                    ? [...INDIVIDUAL_ATTACHMENT_EDIT_FIELDS]
                    : undefined,
                },
              ]}
              decorator={[FormItem]}
            />
          </Form>
        </FormProvider>
      )}
    </div>
  );

  const renderPartnerDetailsAction = (partner: PartnerItem) =>
    (isReadonlyPresentation || (!hideActionButtons && !isOwnerPartner(partner))) ? (
      <CustomButton
        text={isReadonlyPresentation ? t("menu.detail") : t("common.edit")}
        variant="primary"
        size="small"
        customClassName="partner-card-details-button"
        onClick={() =>
          isReadonlyPresentation ? openViewModal(partner) : openEditModal(partner)
        }
      />
    ) : null;

  const renderOwnerCardActions = (partner: PartnerItem) => {
    if (resolvePartnerType(partner) === "individual") {
      return (
        <CustomButton
          text={t("common.view")}
          variant="primary"
          size="small"
          customClassName="partner-card-details-button"
          onClick={() => openViewModal(partner)}
        />
      );
    }

    return (
      <CustomButton
        text={t("PartnerList.details")}
        variant="primary"
        size="small"
        customClassName="partner-card-details-button"
        onClick={() => openViewModal(partner)}
      />
    );
  };

  const renderDeletedCardActions = (partner: PartnerItem) => (
    <div className="partner-card-company-actions">
      <CustomButton
        text={t("PartnerList.restore")}
        variant="outline"
        size="small"
        customClassName="partner-card-company-action-btn partner-card-company-action-btn-delete"
        onClick={() => handleRestoreDeleted(partner)}
      />
      <CustomButton
        text={t("PartnerList.details")}
        variant="primary"
        size="small"
        customClassName="partner-card-company-action-btn"
        onClick={() => openViewModal(partner)}
      />
    </div>
  );

  const renderCompanyCardActions = (partner: PartnerItem) => {
    if (isReadonlyPresentation) {
      return renderPartnerDetailsAction(partner);
    }

    if (hideActionButtons) {
      return null;
    }

    return (
      <div className="partner-card-company-actions">
        <CustomButton
          text={t("PartnerList.delete")}
          variant="outline"
          size="small"
          customClassName="partner-card-company-action-btn partner-card-company-action-btn-delete"
          onClick={() => openDeleteModal(partner)}
        />
        <CustomButton
          text={t("PartnerList.edit")}
          variant="primary"
          size="small"
          customClassName="partner-card-company-action-btn"
          onClick={() => openEditModal(partner)}
        />
      </div>
    );
  };

  const renderIndividualCardActions = (partner: PartnerItem) => {
    if (isReadonlyPresentation) {
      return (
        <CustomButton
          text={t("common.view")}
          variant="primary"
          size="small"
          customClassName="partner-card-details-button"
          onClick={() => openViewModal(partner)}
        />
      );
    }

    if (hideActionButtons) {
      return null;
    }

    return (
      <div className="partner-card-company-actions">
        <CustomButton
          text={t("PartnerList.delete")}
          variant="outline"
          size="small"
          customClassName="partner-card-company-action-btn partner-card-company-action-btn-delete"
          onClick={() => openDeleteModal(partner)}
        />
        <CustomButton
          text={t("PartnerList.edit")}
          variant="primary"
          size="small"
          customClassName="partner-card-company-action-btn"
          onClick={() => openEditModal(partner)}
        />
      </div>
    );
  };

  const handleDeleteFromModal = () => {
    if (!editingPartner) {
      return;
    }

    setModalOpen(false);
    setFormInstance(null);
    setCompanyData({});
    setDeletingPartner(editingPartner);
    setDeleteModalVisible(true);
    setEditingId(null);
    setModalMode("add");
  };

  const renderChangeBadge = (partner: PartnerItem, isPendingDelete = false, isOwner = false) => {
    if (isPendingDelete) {
      return <span className="custom-status-tag custom-status-tag--error">{t("PartnerList.changeTag.deleted")}</span>;
    }
    if (!isOwner && !isExistingInitialPartner(partner)) {
      return <span className="custom-status-tag custom-status-tag--resolved">{t("PartnerList.changeTag.new")}</span>;
    }
    return null;
  };

  const renderDeletedOwnerCardActions = (partner: PartnerItem) => (
    <div className="partner-card-company-actions">
      <CustomButton
        text={t("PartnerList.restore")}
        variant="outline"
        size="small"
        customClassName="partner-card-company-action-btn partner-card-company-action-btn-delete"
        onClick={() => handleRestoreOwner(partner)}
      />
      <CustomButton
        text={t("PartnerList.details")}
        variant="primary"
        size="small"
        customClassName="partner-card-company-action-btn"
        onClick={() => openViewModal(partner)}
      />
    </div>
  );

  const renderIndividualPartnerCard = (
    partner: PartnerItem,
    ownerCard = false,
    isPendingDelete = false,
    isDeletedOwner = false,
  ) => {
    const statusLabel = getPartnerStatusLabel(partner);

    return (
      <div
        key={partner.id}
        className={`partner-card partner-card-individual${
          ownerCard ? " partner-card-owner" : ""
        }${isPendingDelete || isDeletedOwner ? " partner-card-pending-delete" : ""}`}
      >
        {ownerCard && (
          <div className="partner-card-owner-badge">
            {t("establishmentProfile.actions.licenseOwnerBadge")}
          </div>
        )}
        <div className="partner-card-body">
          <div className="partner-card-main">
            <div className="partner-card-name" title={getDisplayName(partner)}>
              {getDisplayName(partner)}
            </div>
            {renderChangeBadge(partner, isPendingDelete || isDeletedOwner, ownerCard)}
            {statusLabel ? (
              <div className="partner-card-status">{statusLabel}</div>
            ) : null}
            <div className="partner-card-meta-list">
              <div className="partner-card-meta-item">
                <img
                  src={YonghuIcon}
                  alt={t("PartnerList.partnerType.individual")}
                  className="partner-card-meta-icon"
                />
                <span>{t("PartnerList.partnerType.individual")}</span>
              </div>
              <div className="partner-card-meta-item">
                <img
                  src={NumberIcon}
                  alt={t("PartnerList.card.id")}
                  className="partner-card-meta-icon"
                />
                <span className="partner-card-meta-value-ltr">
                  {getIdNumber(partner)}
                </span>
              </div>
              <div className="partner-card-meta-item">
                <img
                  src={DizhiIcon}
                  alt={t("PartnerList.card.loc")}
                  className="partner-card-meta-icon"
                />
                <span>{getPartnerLocation(partner)}</span>
              </div>
            </div>
          </div>
          <div className="partner-card-aside">
            <div className="partner-card-avatar">
              <img
                src={IndividualProfileIcon}
                alt={t("PartnerList.partnerType.individual")}
                className="partner-card-avatar-placeholder"
              />
            </div>
            {isDeletedOwner
              ? renderDeletedOwnerCardActions(partner)
              : ownerCard
                ? renderOwnerCardActions(partner)
                : isPendingDelete
                  ? renderDeletedCardActions(partner)
                  : renderIndividualCardActions(partner)}
          </div>
        </div>
      </div>
    );
  };

  const renderCompanyPartnerCard = (
    partner: PartnerItem,
    ownerCard = false,
    isPendingDelete = false,
    isDeletedOwner = false,
  ) => {
    const statusLabel = getPartnerStatusLabel(partner);

    return (
      <div
        key={partner.id}
        className={`partner-card partner-card-company${
          ownerCard ? " partner-card-owner" : ""
        }${isPendingDelete || isDeletedOwner ? " partner-card-pending-delete" : ""}`}
      >
        {ownerCard && (
          <div className="partner-card-owner-badge">
            {t("establishmentProfile.actions.licenseOwnerBadge")}
          </div>
        )}
        <div className="partner-card-body">
          <div className="partner-card-main">
            <div className="partner-card-name" title={getDisplayName(partner)}>
              {getDisplayName(partner)}
            </div>
            {renderChangeBadge(partner, isPendingDelete || isDeletedOwner, ownerCard)}
            {statusLabel ? (
              <div className="partner-card-status">{statusLabel}</div>
            ) : null}
            <div className="partner-card-meta-list">
              <div className="partner-card-meta-item">
                <img
                  src={YonghuIcon}
                  alt={t("PartnerList.partnerType.company")}
                  className="partner-card-meta-icon"
                />
                <span>{t("PartnerList.partnerType.company")}</span>
              </div>
              <div className="partner-card-meta-item">
                <img
                  src={NumberIcon}
                  alt={t("PartnerList.card.id")}
                  className="partner-card-meta-icon"
                />
                <span className="partner-card-meta-value-ltr">
                  {getIdNumber(partner)}
                </span>
              </div>
              <div className="partner-card-meta-item">
                <img
                  src={DizhiIcon}
                  alt={t("PartnerList.card.loc")}
                  className="partner-card-meta-icon"
                />
                <span>{getPartnerLocation(partner)}</span>
              </div>
            </div>
          </div>
          <div className="partner-card-aside">
            <div className="partner-card-avatar">
              <img
                src={CompanyProfileIcon}
                alt={t("PartnerList.partnerType.company")}
                className="partner-card-avatar-placeholder"
              />
            </div>
            {isDeletedOwner
              ? renderDeletedOwnerCardActions(partner)
              : ownerCard
                ? renderOwnerCardActions(partner)
                : isPendingDelete
                  ? renderDeletedCardActions(partner)
                  : renderCompanyCardActions(partner)}
          </div>
        </div>
      </div>
    );
  };

  const renderPartnerCard = (
    partner: PartnerItem,
    ownerCard = false,
    isPendingDelete = false,
    isDeletedOwner = false,
  ) =>
    resolvePartnerType(partner) === "individual"
      ? renderIndividualPartnerCard(partner, ownerCard, isPendingDelete, isDeletedOwner)
      : renderCompanyPartnerCard(partner, ownerCard, isPendingDelete, isDeletedOwner);

  const renderEmptyState = () => (
    <div className="partner-empty-state">
      <EmptyBox
        title={t("PartnerList.emptyText")}
        customClassName="partner-empty-box"
      />
      {!hideActionButtons && !isReadonlyPresentation && (
        <CustomButton
          text={localizedAddButtonLabel}
          variant="gold"
          size="medium"
          onClick={openModal}
        />
      )}
    </div>
  );

  const isSaveDisabled = () => {
    if (isViewing) {
      return true;
    }

    if (partnerType === "company") {
      return (
        !String(companyData.establishmentNameArabic || "").trim() ||
        !isStrictArabicNameInputAllowed(companyData.establishmentNameArabic) ||
        !String(companyData.establishmentNameEnglish || "").trim() ||
        !String(companyData.representativeEmiratesId || "").trim() ||
        Boolean(validateEmiratesId(String(companyData.representativeEmiratesId || ""))) ||
        !String(companyData.representativeNameEn || "").trim() ||
        !String(companyData.representativeNameAr || "").trim() ||
        !isStrictArabicNameInputAllowed(companyData.representativeNameAr)
      );
    }
    return !isIcpReady;
  };

  const hasOwnerSection =
    displayedOwnerPartners.length > 0 || removedPartnerList.length > 0;
  const hasEditableSection =
    editablePartners.length > 0 || pendingDeletePartnerList.length > 0;

  return (
    <div className="partner-list-container">
      <Card className="ant-card ant-card-bordered">
        <div className="partner-list-header">
          <div className="partner-list-title">{localizedLabelName}</div>
          {!hideActionButtons &&
            !isReadonlyPresentation &&
            (editablePartners.length > 0 || displayedOwnerPartners.length > 0) && (
            <CustomButton
              text={localizedAddButtonLabel}
              variant="gold"
              size="medium"
              onClick={openModal}
            />
          )}
        </div>
        <div className="partner-list-content">
          {hasOwnerSection || hasEditableSection ? (
            <div className="partner-cards-container">
              {displayedOwnerPartners.map((partner) =>
                renderPartnerCard(partner, true),
              )}
              {removedPartnerList.map((partner) =>
                renderPartnerCard(partner, true, false, true),
              )}
              {editablePartners.map((partner) => renderPartnerCard(partner))}
              {pendingDeletePartnerList.map((partner) =>
                renderPartnerCard(partner, false, true),
              )}
            </div>
          ) : (
            renderEmptyState()
          )}
        </div>

        <Modal
          title={
            isViewing
              ? t("PartnerList.details")
              : editingId
                ? t("PartnerList.editPartner")
                : t("PartnerList.addNewPartner")
          }
          visible={modalOpen}
          onCancel={closeModal}
          footer={null}
          width={800}
          centered
          destroyOnClose
          className="partner-modal"
        >
          <div className="partner-modal-content formily-control-typography">
            <div className="partner-form-label">
              {t("PartnerList.label.partnerType")} <span className="partner-required">*</span>
            </div>
            <Select
              value={partnerType}
              onChange={(val) => {
                setPartnerType(val);
                setRepresentativeOcrVisible(false);
                setIsIcpReady(val === "company");
                if (val === "individual") {
                  const nextForm = createForm({
                    initialValues: {
                      idSelector: {},
                    },
                  });
                  setFormInstance(nextForm);
                  setCompanyData({});
                } else {
                  setFormInstance(null);
                }
              }}
              disabled={isEditing || isViewing}
              className="partner-type-select"
              dropdownClassName={FORMILY_CONTROL_DROPDOWN_CLASS}
              style={{ width: "100%" }}
            >
              {partnerTypeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>

            {partnerType === "company"
              ? renderCompanyForm()
              : renderIndividualForm()}
          </div>
          <div className="formily-modal-footer">
            {!isViewing && editingPartner && !isOwnerPartnerById(editingPartner.id) ? (
              <CustomButton
                text={t("PartnerList.delete")}
                variant="danger-outline"
                onClick={handleDeleteFromModal}
              />
            ) : null}
            <CustomButton
              text={isViewing ? t("PartnerList.close") : t("PartnerList.cancel")}
              variant="outline"
              onClick={closeModal}
            />
            {!isViewing ? (
              <CustomButton
                text={t("PartnerList.save")}
                variant="primary"
                onClick={handleSave}
                disabled={isSaveDisabled()}
              />
            ) : null}
          </div>
        </Modal>
        <OcrModal
          visible={representativeOcrVisible}
          documentType={OCR_DOCUMENT_TYPE.EMIRATES_ID}
          nationalityList={nationalityList}
          onApply={handleRepresentativeOcrApply}
          onClose={() => setRepresentativeOcrVisible(false)}
        />

        <Modal
          title={t("PartnerList.deletePartner")}
          visible={deleteModalVisible}
          centered
          onCancel={() => {
            setDeleteModalVisible(false);
            setDeletingPartner(null);
          }}
          footer={null}
          className="partner-delete-modal"
        >
          <div className="partner-delete-content">
            {t("PartnerList.deleteConfirm")}
          </div>
          <div className="partner-modal-footer">
            <CustomButton
              text={t("PartnerList.cancel")}
              variant="outline"
              size="medium"
              onClick={() => {
                setDeleteModalVisible(false);
                setDeletingPartner(null);
              }}
            />
            <CustomButton
              text={t("PartnerList.delete")}
              variant="danger"
              size="medium"
              onClick={handleDelete}
            />
          </div>
        </Modal>
      </Card>
    </div>
  );
});

PartnerListFieldDom.displayName = "PartnerListFieldDom";

export const PartnerListField = PartnerListFieldDom;

PartnerListField.displayName = "PartnerListField";

export default PartnerListField;
