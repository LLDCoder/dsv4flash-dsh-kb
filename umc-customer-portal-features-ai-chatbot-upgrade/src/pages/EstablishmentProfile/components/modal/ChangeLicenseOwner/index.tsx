import React, { useState, useEffect, useMemo, useRef } from "react";
import { Modal, Checkbox, Tooltip } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { type PartnerData } from "../PartnerModal";
import { useTranslation } from "react-i18next";
import { CustomButton } from "@/components/common";
import CustomMessage from "@/components/common/CustomMessage";
import JigouIcon from "@/assets/images/jigou.svg";
import AvatarIcon from "@/assets/images/Avatar.svg";
import { setPartnersNewisOwner } from "@/services/userProfile";
import {
  formatPartnerLicenseOwnerListSubtitle,
  normalizeOwnerPartnerIds,
} from "@/pages/EstablishmentProfile/utils/formHelpers";
import { LICENSE_OWNER_MAX_COUNT } from "@/pages/EstablishmentProfile/utils/constants";
import "./index.less";

const ChangeLicenseOwner: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onOk: (partnerIds: string[]) => void;
  partnerList: PartnerData[];
  ownerPartnerIds: string[];
  title: string;
  subtitle: string;
  skipLicenseOwnerApi?: boolean;
}> = ({
  visible,
  onCancel,
  onOk,
  partnerList,
  ownerPartnerIds,
  title,
  subtitle,
  skipLicenseOwnerApi = false,
}) => {
  const { t, i18n } = useTranslation();
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [touchedPartnerIds, setTouchedPartnerIds] = useState<string[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const isMountedRef = useRef(true);
  const normalizedOwnerPartnerIds = useMemo(
    () => normalizeOwnerPartnerIds(ownerPartnerIds, Number.POSITIVE_INFINITY),
    [ownerPartnerIds],
  );
  const currentOwnerIdSet = useMemo(
    () => new Set(normalizedOwnerPartnerIds),
    [normalizedOwnerPartnerIds],
  );

  const partnerTypeLabels = useMemo(
    () => ({
      company: t("establishmentProfile.partner.companyShort"),
      individual: t("establishmentProfile.partner.individualShort"),
    }),
    [t, i18n.language],
  );

  const sortedPartnerList = useMemo(() => {
    if (currentOwnerIdSet.size === 0) return partnerList;
    const currentOwners = partnerList.filter((partner) =>
      currentOwnerIdSet.has(String(partner.id ?? "").trim()),
    );
    const otherPartners = partnerList.filter(
      (partner) => !currentOwnerIdSet.has(String(partner.id ?? "").trim()),
    );
    return [...currentOwners, ...otherPartners];
  }, [partnerList, currentOwnerIdSet]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      const partnerIdSet = new Set(
        partnerList
          .map((partner) => String(partner.id ?? "").trim())
          .filter((id) => id.length > 0),
      );
      setTouchedPartnerIds([]);
      setSelectedPartnerIds(
        normalizedOwnerPartnerIds.filter((id) => partnerIdSet.has(id)),
      );
    }
  }, [visible, normalizedOwnerPartnerIds, partnerList]);

  const togglePartnerSelection = (partnerId: string) => {
    if (!partnerId) return;
    setTouchedPartnerIds((prev) =>
      prev.includes(partnerId) ? prev : [...prev, partnerId],
    );
    setSelectedPartnerIds((prev) => {
      if (prev.includes(partnerId)) {
        return prev.filter((id) => id !== partnerId);
      }
      if (prev.length >= LICENSE_OWNER_MAX_COUNT) {
        return prev;
      }
      return [...prev, partnerId];
    });
  };

  const handleOk = async () => {
    if (confirmLoading) return;
    if (selectedPartnerIds.length === 0) return;
    const normalizedIds = normalizeOwnerPartnerIds(
      selectedPartnerIds,
      LICENSE_OWNER_MAX_COUNT,
    );

    if (normalizedIds.length === 0) return;

    try {
      setConfirmLoading(true);

      if (!skipLicenseOwnerApi) {
        await setPartnersNewisOwner(normalizedIds);
      }

      onOk(normalizedIds);
      CustomMessage.success(
        t("establishmentProfile.messages.licenseOwnerUpdated"),
      );

      if (isMountedRef.current) {
        setSelectedPartnerIds([]);
        setTouchedPartnerIds([]);
      }
    } catch (error) {
      console.error("Failed to update the license owner:", error);
      CustomMessage.error(t("request.operation.failed"));
    } finally {
      if (isMountedRef.current) {
        setConfirmLoading(false);
      }
    }
  };

  const handleCancel = () => {
    if (confirmLoading) return;
    setSelectedPartnerIds([]);
    setTouchedPartnerIds([]);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      onCancel={handleCancel}
      footer={null}
      closable={false}
      centered
      className="change-license-owner-modal"
      width="800px"
    >
      <div className="modal-header">
        <div>
          <h2 className="modal-title">{title}</h2>
          <p className="modal-subtitle">{subtitle}</p>
        </div>
        <CloseOutlined className="modal-close-icon" onClick={handleCancel} />
      </div>

      <div className="modal-body">
        <div className="partner-list">
          {sortedPartnerList.map((item) => {
            const pid = String(item.id ?? "").trim();
            const isSelected = selectedPartnerIds.includes(pid);
            const isCurrentOwner = currentOwnerIdSet.has(pid);
            const shouldHighlightSelection =
              isSelected &&
              (!isCurrentOwner || touchedPartnerIds.includes(pid));
            const displayName =
              i18n.language.startsWith("en") ? item.fullNameEn ?? "" : item.fullNameAr ?? "";
            return (
              <div
                key={item.id ?? pid}
                className={`partner-item ${shouldHighlightSelection ? "selected-highlighted" : ""} ${isCurrentOwner ? "is-current-owner" : ""}`}
                onClick={() => togglePartnerSelection(pid)}
              >
                <img
                  src={item?.partnerTypeCode === "1" ? JigouIcon : AvatarIcon}
                />
                <div className="partner-info">
                  <div className="partner-name-row">
                    {displayName ? (
                      <Tooltip
                        placement="topLeft"
                        title={displayName}
                        getPopupContainer={() => document.body}
                      >
                        <span className="partner-name">{displayName}</span>
                      </Tooltip>
                    ) : (
                      <span className="partner-name" />
                    )}
                    {isCurrentOwner && (
                      <span className="current-owner-badge">
                        {t("establishmentProfile.actions.currentOwner")}
                      </span>
                    )}
                  </div>
                  <span className="partner-type">
                    {formatPartnerLicenseOwnerListSubtitle(item, partnerTypeLabels)}
                  </span>
                </div>
                <div
                  className="partner-selection"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={
                      !isSelected &&
                      selectedPartnerIds.length >= LICENSE_OWNER_MAX_COUNT
                    }
                    onChange={() => togglePartnerSelection(pid)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="modal-footer">
        <CustomButton
          text={t("common.cancel")}
          variant="outline"
          onClick={handleCancel}
          customClassName="cancel-btn"
        />
        <CustomButton
          text={t("common.confirm")}
          variant="primary"
          onClick={handleOk}
          disabled={selectedPartnerIds.length === 0}
          loading={confirmLoading}
          customClassName="confirm-btn"
        />
      </div>
    </Modal>
  );
};

export default ChangeLicenseOwner;
