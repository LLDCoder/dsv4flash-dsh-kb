import React from "react";
import { Form, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import {
  ActionFooter,
  CustomButton,
  ProfileUnderReviewModal,
} from "@/components/common";
import { useAddressData } from "./hooks/useAddressData";
import { usePartners } from "./hooks/usePartners";
import { useEstablishmentForm } from "./hooks/useEstablishmentForm";
import {
  getLocalizedName,
  parseIsGethirdPartyApiQueryParam,
  type EstablishmentFormValues,
} from "./utils/formHelpers";
import AlertBanners from "./components/AlertBanners";
import EstablishmentInfoSection from "./components/EstablishmentInfoSection";
import EstablishmentDocumentsSection from "./components/EstablishmentDocumentsSection";
import AddressSection from "./components/AddressSection";
import PartnerListSection from "./components/PartnerListSection";
import PartnerModal from "./components/modal/PartnerModal";
import PartnerDetailsModal from "./components/modal/PartnerDetailsModal";
import EditEmailModal from "./components/modal/EditEmailModal";
import ChangeLicenseOwner from "./components/modal/ChangeLicenseOwner";
import type { EstablishmentPageMode } from "./utils/constants";
import { useUserStore } from "@/store/user";
import { usePersonalProfilePartnerIdentity } from "./hooks/usePersonalProfilePartnerIdentity";
import "./index.less";
import { isLicenseOwnerApplicableSubType } from "./utils/subTypeHelpers";
/** Submit footer: renewal / rejection flows and any other editable establishment state */
const FOOTER_VISIBLE_PAGE_MODES: EstablishmentPageMode[] = [
  "expiringSoon",
  "expired",
  "rejected",
];

const EstablishmentProfile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const history = useHistory();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userInfo = useUserStore((state: any) => state.userInfo);
  const mode = searchParams.get("mode");
  const establishmentId = searchParams.get("id");
  const pageModeSearchParam = searchParams.get("pageMode");
  const listingIsGethirdPartyApi =
    parseIsGethirdPartyApiQueryParam(searchParams);

  const [form] = Form.useForm<EstablishmentFormValues>();
  const personalProfilePartnerIdentity = usePersonalProfilePartnerIdentity(
    typeof userInfo?.id === "string" ? userInfo.id : undefined,
  );

  const addressData = useAddressData();
  const partnerData = usePartners();
  const formState = useEstablishmentForm({
    form,
    mode,
    establishmentId,
    pageModeSearchParam,
    listingIsGethirdPartyApi,
    addressData,
    partners: partnerData.partners,
    setPartners: partnerData.setPartners,
    setOwnerPartnerIds: partnerData.setOwnerPartnerIds,
  });

  const displayName = (item: { nameEn?: string | null; nameAr?: string | null } | undefined) =>
    getLocalizedName(item, i18n.language);

  const localizedPdfUploadMessages = {
    invalidFileTypeMessage: t("establishmentProfile.validation.validPdf"),
    maxSizeErrorMessage: t("establishmentProfile.validation.fileSizeLessThan5Mb"),
  };

  const licenseOwnerApplicable = isLicenseOwnerApplicableSubType(
    formState.establishmentSubType,
    formState.establishmentSubTypeList,
  );

  const showSubmitAction =
    !formState.isEstablishmentReadOnly &&
    (FOOTER_VISIBLE_PAGE_MODES.includes(formState.pageMode) ||
      formState.isEditForm);

  const showAddressSection =
    (formState.isCommercialGroup && (mode !== "add" || formState.showFullCommercialForm)) ||
    formState.isGovernmentGroup;

  const showPartnerSection =
    formState.isCommercialGroup &&
    (mode !== "add" || formState.showFullCommercialForm);
  const isProfileContentReady =
    mode !== "edit" || !establishmentId || formState.isEstablishmentDataLoaded;

  return (
    <div className="establishment-profile">
      {isProfileContentReady ? (
        <>
          <AlertBanners
            mode={mode}
            pageMode={formState.pageMode}
            expriryDays={formState.expriryDays}
            currentEstablishment={formState.currentEstablishment}
          />

          <Form
            form={form}
            layout="vertical"
            className="custorm-form"
            onValuesChange={formState.handleFormValuesChange}
          >
            <EstablishmentInfoSection
              form={form}
              mode={mode}
              pageMode={formState.pageMode}
              isCommercialGroup={formState.isCommercialGroup}
              isGovernmentGroup={formState.isGovernmentGroup}
              showFullCommercialForm={formState.showFullCommercialForm}
              establishmentSubType={formState.establishmentSubType}
              establishmentSubTypeList={formState.establishmentSubTypeList}
              loadingSubTypes={formState.loadingSubTypes}
              emirateList={addressData.emirateList}
              authorityList={formState.authorityList}
              loadingAuthorities={formState.loadingAuthorities}
              emailList={formState.emailList}
              isAr={isAr}
              canEditField={formState.canEditField}
              handleSubTypeChange={formState.handleSubTypeChange}
              handleLicenseFieldsChange={formState.handleLicenseFieldsChange}
              displayName={displayName}
              setEditEmailModalVisible={formState.setEditEmailModalVisible}
            />

            <EstablishmentDocumentsSection
              form={form}
              isCommercialGroup={formState.isCommercialGroup}
              isGovernmentGroup={formState.isGovernmentGroup}
              mode={mode}
              showFullCommercialForm={formState.showFullCommercialForm}
              fetchedCommercialData={formState.fetchedCommercialData}
              isEditForm={formState.isEditForm}
              isLess30={formState.isLess30}
              isExpriry={formState.isExpriry}
              expriryDays={formState.expriryDays}
              canEditField={formState.canEditField}
              localizedPdfUploadMessages={localizedPdfUploadMessages}
            />

            {showAddressSection && (
              <AddressSection
                form={form}
                emirateList={addressData.emirateList}
                filteredRegionList={addressData.filteredRegionList}
                filteredAreaList={addressData.filteredAreaList}
                canEditField={formState.canEditField}
                handleEmirateChange={addressData.handleEmirateChange}
                handleRegionChange={addressData.handleRegionChange}
                displayName={displayName}
              />
            )}

            {showPartnerSection && (
              <PartnerListSection
                partners={partnerData.partners}
                mode={mode}
                pageMode={formState.pageMode}
                licenseOwnerApplicable={licenseOwnerApplicable}
                ownerPartnerIds={partnerData.ownerPartnerIds}
                isEstablishmentReadOnly={formState.isEstablishmentReadOnly}
                language={i18n.language}
                partnerSectionSubmitError={formState.partnerSectionSubmitError}
                handleViewPartner={partnerData.handleViewPartner}
                handleAddPartner={partnerData.handleAddPartner}
                handleEditPartner={partnerData.handleEditPartner}
                handleDeletePartner={partnerData.handleDeletePartner}
                handleSetLicenseOwner={partnerData.handleSetLicenseOwner}
                handleChangeLicenseOwner={partnerData.handleChangeLicenseOwner}
              />
            )}
          </Form>

          <ActionFooter
            showBack
            actions={
              showSubmitAction ? (
                <CustomButton
                  text={t("establishmentProfile.actions.submit")}
                  variant="primary"
                  onClick={formState.handleSubmit}
                  loading={formState.isSubmitting}
                />
              ) : null
            }
          />
        </>
      ) : (
        <div className="profile-section establishment-profile__loading">
          <Spin size="large" />
        </div>
      )}

      <ChangeLicenseOwner
        title={partnerData.changeLicenseOwnerTitle}
        subtitle={partnerData.changeLicenseOwnerSubtitle}
        visible={licenseOwnerApplicable && partnerData.changeLicenseOwnerVisible}
        ownerPartnerIds={partnerData.ownerPartnerIds}
        onCancel={() => partnerData.setChangeLicenseOwnerVisible(false)}
        onOk={partnerData.handleOkLicenseOwner}
        partnerList={partnerData.partners}
        skipLicenseOwnerApi={mode === "add"}
      />

      <PartnerModal
        visible={partnerData.partnerModalVisible}
        onCancel={partnerData.handleCancelPartnerModal}
        onSave={(data) =>
          partnerData.handleSavePartner(
            data,
            mode!,
            formState.pageMode,
            establishmentId,
          )
        }
        initialData={partnerData.editingPartner}
        personalProfileIdentity={personalProfilePartnerIdentity}
        hasPersonalInformationPartner={partnerData.partners.some(
          (partner) => partner?.isPersonalInformation === true,
        )}
      />

      <PartnerDetailsModal
        visible={partnerData.partnerDetailsModalVisible}
        onCancel={() => partnerData.setPartnerDetailsModalVisible(false)}
        partner={partnerData.viewingPartner}
      />

      <ProfileUnderReviewModal
        visible={formState.successModalShow}
        onClose={() => history.push("/my-account")}
        title={t("establishmentProfile.messages.profileUnderReviewTitle")}
        description={t(
          "establishmentProfile.messages.profileUnderReviewDescription",
        )}
      />

      <EditEmailModal
        visible={formState.editEmailModalVisible}
        onClose={() => formState.setEditEmailModalVisible(false)}
        onSuccess={formState.handleEmailUpdate}
      />

    </div>
  );
};

export default EstablishmentProfile;
