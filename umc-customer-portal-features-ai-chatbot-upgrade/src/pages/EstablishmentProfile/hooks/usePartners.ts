import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import CustomMessage from "@/components/common/CustomMessage";
import type { PartnerData } from "../components/modal/PartnerModal";
import {
  collectLicenseOwnerPartnerIds,
  isPartnerSourceLocked,
  mapPartnerToApiPartner,
  normalizeEstablishmentPartnersApiRow,
  normalizeOwnerPartnerIds,
  partnerIsLicenseOwner,
  pickPartnerRecordFromMutationResponse,
} from "../utils/formHelpers";
import type { EstablishmentPageMode } from "../utils/constants";
import { addPartner, type PartnerParams } from "@/services/userProfile";

export interface UsePartnersReturn {
  partners: PartnerData[];
  setPartners: Dispatch<SetStateAction<PartnerData[]>>;
  loadingPartners: boolean;
  partnerModalVisible: boolean;
  partnerDetailsModalVisible: boolean;
  viewingPartner: PartnerData | null;
  editingPartner: PartnerData | null;
  ownerPartnerIds: string[];
  setOwnerPartnerIds: (ids: string[]) => void;
  changeLicenseOwnerVisible: boolean;
  changeLicenseOwnerTitle: string;
  changeLicenseOwnerSubtitle: string;
  handleViewPartner: (partner: PartnerData) => void;
  handleAddPartner: (mode: string, pageMode: EstablishmentPageMode) => void;
  handleEditPartner: (partner: PartnerData, mode: string) => void;
  handleDeletePartner: (partnerId: string, mode: string) => void;
  handleSavePartner: (
    partnerData: PartnerData,
    mode: string,
    pageMode: EstablishmentPageMode,
    establishmentId: string | null,
  ) => Promise<void>;
  handleCancelPartnerModal: () => void;
  handleSetLicenseOwner: () => void;
  handleChangeLicenseOwner: () => void;
  handleOkLicenseOwner: (ids: string[]) => void;
  setChangeLicenseOwnerVisible: (visible: boolean) => void;
  setPartnerDetailsModalVisible: (visible: boolean) => void;
}

export const usePartners = (): UsePartnersReturn => {
  const { t } = useTranslation();
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [loadingPartners] = useState(false);
  const [partnerModalVisible, setPartnerModalVisible] = useState(false);
  const [partnerDetailsModalVisible, setPartnerDetailsModalVisible] = useState(false);
  const [viewingPartner, setViewingPartner] = useState<PartnerData | null>(null);
  const [editingPartner, setEditingPartner] = useState<PartnerData | null>(null);
  const [ownerPartnerIds, setOwnerPartnerIds] = useState<string[]>([]);
  const [changeLicenseOwnerVisible, setChangeLicenseOwnerVisible] = useState(false);
  const [changeLicenseOwnerTitle, setChangeLicenseOwnerTitle] = useState(
    () => t("establishmentProfile.actions.setLicenseOwner"),
  );
  const [changeLicenseOwnerSubtitle, setChangeLicenseOwnerSubtitle] = useState(
    () => t("establishmentProfile.actions.setLicenseOwnerSubtitle"),
  );

  useEffect(() => {
    const nextOwnerPartnerIds = collectLicenseOwnerPartnerIds(partners);
    setOwnerPartnerIds((prev) => {
      if (
        prev.length === nextOwnerPartnerIds.length &&
        prev.every((id, index) => id === nextOwnerPartnerIds[index])
      ) {
        return prev;
      }
      return nextOwnerPartnerIds;
    });
  }, [partners]);

  const handleViewPartner = (partner: PartnerData) => {
    setViewingPartner(partner);
    setPartnerDetailsModalVisible(true);
  };

  const handleAddPartner = (mode: string, pageMode: EstablishmentPageMode) => {
    const canAdd =
      mode === "add" ||
      (mode === "edit" &&
        (pageMode === "rejected" || pageMode === "pendingCompletion"));
    if (!canAdd) return;
    setEditingPartner(null);
    setPartnerModalVisible(true);
  };

  const handleEditPartner = (partner: PartnerData, mode: string) => {
    if (mode !== "add" && mode !== "edit") return;
    if (isPartnerSourceLocked(partner)) {
      handleViewPartner(partner);
      return;
    }
    setEditingPartner(partner);
    setPartnerModalVisible(true);
  };

  const handleDeletePartner = (partnerId: string, mode: string) => {
    if (mode !== "add" && mode !== "edit") return;
    const match = partners.find((p) => p.id === partnerId);
    if (match && partnerIsLicenseOwner(match)) {
      return;
    }
    setPartners(
      partners.filter((p) => p.id !== partnerId || isPartnerSourceLocked(p)),
    );
  };

  const handleSavePartner = async (
    partnerData: PartnerData,
    mode: string,
    pageMode: EstablishmentPageMode,
    establishmentId: string | null,
  ) => {
    if (mode !== "add" && mode !== "edit") return;

    if (editingPartner && editingPartner.id) {
      setPartners((prev) =>
        prev.map((p) =>
          p.id === editingPartner.id
            ? {
                ...p,
                ...partnerData,
                isOwner: partnerIsLicenseOwner(p),
                managedInSession: true,
              }
            : p,
        ),
      );
      setPartnerModalVisible(false);
      setEditingPartner(null);
      return;
    }

    const shouldCallAddPartnerApi =
      mode === "edit" &&
      pageMode === "rejected" &&
      Boolean(establishmentId?.trim());

    if (shouldCallAddPartnerApi) {
      const eid = parseInt(String(establishmentId).trim(), 10);
      if (!Number.isFinite(eid)) {
        CustomMessage.error(t("request.operation.failed"));
        return;
      }
      try {
        const params: PartnerParams = {
          ...mapPartnerToApiPartner(partnerData),
          establishmentId: eid,
        };
        const response = await addPartner(params);
        const row = pickPartnerRecordFromMutationResponse(response);
        if (!row) {
          CustomMessage.error(t("request.operation.failed"));
          return;
        }
        const normalized = normalizeEstablishmentPartnersApiRow(row);
        setPartners((prev) => [
          ...prev,
          { ...partnerData, ...normalized, managedInSession: true },
        ]);
      } catch {
        return;
      }
    } else {
      setPartners((prev) => [
        ...prev,
        {
          ...partnerData,
          id: Date.now().toString(),
          managedInSession: true,
        },
      ]);
    }

    setPartnerModalVisible(false);
    setEditingPartner(null);
  };

  const handleCancelPartnerModal = () => {
    setPartnerModalVisible(false);
    setEditingPartner(null);
  };

  const handleSetLicenseOwner = () => {
    setChangeLicenseOwnerVisible(true);
    setChangeLicenseOwnerTitle(t("establishmentProfile.actions.setLicenseOwner"));
    setChangeLicenseOwnerSubtitle(t("establishmentProfile.actions.setLicenseOwnerSubtitle"));
  };

  const handleChangeLicenseOwner = () => {
    setChangeLicenseOwnerVisible(true);
    setChangeLicenseOwnerTitle(t("establishmentProfile.actions.changeLicenseOwner"));
    setChangeLicenseOwnerSubtitle(
      t("establishmentProfile.actions.changeLicenseOwnerSubtitle"),
    );
  };

  const handleOkLicenseOwner = (ids: string[]) => {
    const normalizedOwnerIds = normalizeOwnerPartnerIds(ids);
    const ownerIdSet = new Set(normalizedOwnerIds);
    setOwnerPartnerIds(normalizedOwnerIds);
    setChangeLicenseOwnerVisible(false);
    setPartners((prev) =>
      prev.map((item) => ({
        ...item,
        isOwner: ownerIdSet.has(String(item?.id ?? "").trim()),
      })),
    );
  };

  return {
    partners,
    setPartners,
    loadingPartners,
    partnerModalVisible,
    partnerDetailsModalVisible,
    viewingPartner,
    editingPartner,
    ownerPartnerIds,
    setOwnerPartnerIds,
    changeLicenseOwnerVisible,
    changeLicenseOwnerTitle,
    changeLicenseOwnerSubtitle,
    handleViewPartner,
    handleAddPartner,
    handleEditPartner,
    handleDeletePartner,
    handleSavePartner,
    handleCancelPartnerModal,
    handleSetLicenseOwner,
    handleChangeLicenseOwner,
    handleOkLicenseOwner,
    setChangeLicenseOwnerVisible,
    setPartnerDetailsModalVisible,
  };
};
