import React from "react";
import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { CustomButton, AlertBanner } from "@/components/common";
import EmptyBoxIcon from "@/assets/images/empty.svg";
import YonghuIcon from "@/assets/images/yonghu.svg";
import DizhiIcon from "@/assets/images/guoqi.svg";
import NumberIcon from "@/assets/images/number.svg";
import JigouIcon from "@/assets/images/jigou.svg";
import AvatarIcon from "@/assets/images/Avatar.svg";
import type { PartnerData } from "../modal/PartnerModal";
import {
  isPartnerSourceLocked,
  partnerIsLicenseOwner,
  partnerListShowsDeleteAndEdit,
  shouldShowLicenseOwnerActions,
} from "../../utils/formHelpers";
import type { EstablishmentPageMode } from "../../utils/constants";
import type { PartnerSectionSubmitError } from "../../hooks/useEstablishmentForm";

const ProfileNameWithTooltip: React.FC<{ name: string }> = ({ name }) => {
  if (!name) {
    return <h3 className="profile-name" />;
  }

  return (
    <Tooltip placement="topLeft" title={name}>
      <h3 className="profile-name">{name}</h3>
    </Tooltip>
  );
};

interface PartnerListSectionProps {
  partners: PartnerData[];
  mode: string | null;
  pageMode?: EstablishmentPageMode;
  licenseOwnerApplicable: boolean;
  ownerPartnerIds: string[];
  isEstablishmentReadOnly: boolean;
  language: string;
  partnerSectionSubmitError?: PartnerSectionSubmitError | null;
  handleViewPartner: (partner: PartnerData) => void;
  handleAddPartner: (mode: string, pageMode: EstablishmentPageMode) => void;
  handleEditPartner: (partner: PartnerData, mode: string) => void;
  handleDeletePartner: (partnerId: string, mode: string) => void;
  handleSetLicenseOwner: () => void;
  handleChangeLicenseOwner: () => void;
}

const PartnerListSection: React.FC<PartnerListSectionProps> = ({
  partners,
  mode,
  ownerPartnerIds,
  isEstablishmentReadOnly,
  language,
  partnerSectionSubmitError,
  handleViewPartner,
  handleAddPartner,
  handleEditPartner,
  handleDeletePartner,
  handleSetLicenseOwner,
  handleChangeLicenseOwner,
  pageMode,
  licenseOwnerApplicable,
}) => {
  const { t } = useTranslation();

  const showLicenseOwnerButton = shouldShowLicenseOwnerActions({
    partnersLength: partners.length,
    pageMode: pageMode ?? "add",
    isLicenseOwnerApplicableSubType: licenseOwnerApplicable,
  });
  /** Matches Delete/Edit: create-new (`add`) or resubmit after rejection (`edit` + rejected). */
  const canManagePartnerList = partnerListShowsDeleteAndEdit({
    pageMode: pageMode ?? "add",
    isEstablishmentReadOnly,
  });
  const hasLicenseOwner =
    licenseOwnerApplicable &&
    (ownerPartnerIds.length > 0 ||
      partners.some(partnerIsLicenseOwner));

  return (
    <div
      id="establishment-partner-list-section"
      className="profile-section profile-section-partner"
    >
      <div className="section-header">
        <h2 className="section-title">
          {t("establishmentProfile.sections.partnerList")}
          <span className="partner-list-required-mark" aria-hidden="true">*</span>
        </h2>
        {(showLicenseOwnerButton ||
          (partners.length > 0 && canManagePartnerList)) && (
          <div className="section-header-actions partner-list-header-actions">
            {showLicenseOwnerButton &&
              (hasLicenseOwner ? (
                <CustomButton
                  text={t("establishmentProfile.actions.changeLicenseOwner")}
                  variant="text"
                  onClick={handleChangeLicenseOwner}
                />
              ) : (
                <CustomButton
                  text={t("establishmentProfile.actions.setLicenseOwner")}
                  variant="text"
                  onClick={handleSetLicenseOwner}
                />
              ))}
            {partners.length > 0 && canManagePartnerList && (
              <CustomButton
                text={t("establishmentProfile.actions.addNewPartner")}
                variant="outline"
                onClick={() =>
                  handleAddPartner(mode!, pageMode ?? "add")
                }
              />
            )}
          </div>
        )}
      </div>

      {partnerSectionSubmitError === "noPartners" && (
        <AlertBanner
          type="error"
          className="license-owner-required-banner"
          style={{ borderColor: "transparent" }}
          content={
            <div>
              <div className="license-owner-required-title" style={{ color: "#361E12" }}>
                {t("establishmentProfile.messages.partnerListRequiredTitle")}
              </div>
              <div className="license-owner-required-description" style={{ color: "#5F646D" }}>
                {t(
                  "establishmentProfile.messages.partnerListRequiredDescription",
                )}
              </div>
            </div>
          }
        />
      )}

      {partnerSectionSubmitError === "noOwner" && (
        <AlertBanner
          type="error"
          className="license-owner-required-banner"
          style={{ borderColor: "transparent" }}
          content={
            <div>
              <div className="license-owner-required-title" style={{ color: "#361E12" }}>
                {t("establishmentProfile.messages.licenseOwnerRequiredTitle")}
              </div>
              <div className="license-owner-required-description" style={{ color: "#5F646D" }}>
                {t(
                  "establishmentProfile.messages.licenseOwnerRequiredDescription",
                )}
              </div>
            </div>
          }
        />
      )}

      {partnerSectionSubmitError === "multipleOwners" && (
        <AlertBanner
          type="error"
          className="license-owner-required-banner"
          content={
            <div>
              <div className="license-owner-required-title">
                {t("establishmentProfile.messages.licenseOwnerMultipleTitle")}
              </div>
              <div className="license-owner-required-description">
                {t(
                  "establishmentProfile.messages.licenseOwnerMultipleDescription",
                )}
              </div>
            </div>
          }
        />
      )}

      {partners.length === 0 && canManagePartnerList ? (
        <div className="empty-partner-state">
          <img src={EmptyBoxIcon} alt="empty" className="empty-icon" />
          <p className="empty-text">
            {t("establishmentProfile.messages.noPartners")}
          </p>
          <CustomButton
            text={t("establishmentProfile.actions.addNewPartner")}
            variant="primary"
            onClick={() =>
              handleAddPartner(mode!, pageMode ?? "add")
            }
          />
        </div>
      ) : (
        <div className="partners-grid">
          {partners.map((partner: PartnerData) => {
            const isLicenseOwnerCard =
              licenseOwnerApplicable && partnerIsLicenseOwner(partner);
            const canEditPartnerCard =
              Boolean(mode) &&
              !isEstablishmentReadOnly &&
              !isPartnerSourceLocked(partner);
            const partnerPulledFromApi = isPartnerSourceLocked(partner);
            const showDeleteAndEdit = partnerListShowsDeleteAndEdit({
              pageMode: pageMode ?? "add",
              isEstablishmentReadOnly,
            });
            const partnerDisplayName =
              language.startsWith("ar")
                ? partner?.fullNameAr || partner?.fullNameEn || ""
                : partner?.fullNameEn || partner?.fullNameAr || "";

            return (
              <div
                key={partner.id}
                className={`profile-card${isLicenseOwnerCard ? " profile-card--license-owner" : ""}`}
              >
                {isLicenseOwnerCard && (
                  <div className="service-card-Featured">
                    <div className="service-card-Featured-text">
                      {t("establishmentProfile.actions.licenseOwnerBadge")}
                    </div>
                  </div>
                )}
                <div className="profile-card-content">
                  <div className="profile-info">
                    <div className="profile-details">
                      <ProfileNameWithTooltip name={partnerDisplayName} />
                      <div className="profile-details-content">
                        <div className="profile-item">
                          <img
                            src={YonghuIcon}
                            alt="type"
                            className="profile-icon"
                          />
                          <span>{partner?.partnerTypeName}</span>
                        </div>
                        {(partner.emiratesId ||
                          partner.uaeNumber ||
                          partner.passportNumber) && (
                          <div className="profile-item">
                            <img
                              src={NumberIcon}
                              alt="id"
                              className="profile-icon"
                            />
                            <span>
                              {partner.emiratesId ||
                                partner.uaeNumber ||
                                partner.passportNumber ||
                                ""}
                            </span>
                          </div>
                        )}
                        <div className="profile-item">
                          <img
                            src={DizhiIcon}
                            alt="location"
                            className="profile-icon"
                          />
                          <span>
                            {(partner?.nationalityName ?? "").trim() || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="profile-right">
                    <div className="profile-avatar">
                      <img
                        src={
                          partner?.partnerTypeCode === "1"
                            ? JigouIcon
                            : AvatarIcon
                        }
                        alt="avatar"
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-card-footer">
                  {partnerPulledFromApi ? (
                    <CustomButton
                      customClassName="profile-btn"
                      text={t("establishmentProfile.actions.details")}
                      variant="primary"
                      size="small"
                      onClick={() => handleViewPartner(partner)}
                    />
                  ) : isLicenseOwnerCard ? (
                    <div className="partner-profile-view-actions">
                      {showDeleteAndEdit && canEditPartnerCard && (
                        <CustomButton
                          text={t("establishmentProfile.actions.edit")}
                          size="small"
                          variant="outline"
                          customClassName="partner-profile-view-action-btn"
                          onClick={() => handleEditPartner(partner, mode!)}
                        />
                      )}
                      <CustomButton
                        text={t("establishmentProfile.actions.details")}
                        variant="primary"
                        size="small"
                        customClassName={
                          showDeleteAndEdit && canEditPartnerCard
                            ? "partner-profile-view-action-btn profile-btn"
                            : "profile-btn"
                        }
                        onClick={() => handleViewPartner(partner)}
                      />
                    </div>
                  ) : showDeleteAndEdit && canEditPartnerCard ? (
                    <div className="partner-actions">
                      <CustomButton
                        text={t("establishmentProfile.actions.delete")}
                        size="small"
                        variant="outline"
                        customClassName="partner-action-btn"
                        onClick={() => handleDeletePartner(partner.id!, mode!)}
                      />
                      <CustomButton
                        text={t("establishmentProfile.actions.edit")}
                        size="small"
                        variant="primary"
                        customClassName="partner-action-btn"
                        onClick={() => handleEditPartner(partner, mode!)}
                      />
                    </div>
                  ) : (
                    <CustomButton
                      customClassName="profile-btn"
                      text={t("establishmentProfile.actions.details")}
                      variant="primary"
                      size="small"
                      onClick={() => handleViewPartner(partner)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PartnerListSection;
