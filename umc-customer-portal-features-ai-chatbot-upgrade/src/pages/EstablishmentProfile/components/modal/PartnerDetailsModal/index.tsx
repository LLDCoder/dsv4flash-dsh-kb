import React, { useState, useEffect } from "react";
import { Modal } from "antd";
import FormPanel, {
  type FormPanelSectionConfig,
} from "@/components/common/FormPanel";
import DocumentViewer from "@/components/common/DocumentViewer";
import { type PartnerData } from "../PartnerModal";
import moment from "moment";
import "./index.less";
import { useTranslation } from "react-i18next";

interface PartnerDetailsModalProps {
  visible: boolean;
  onCancel: () => void;
  partner: PartnerData | null;
}


const PartnerDetailsModal: React.FC<PartnerDetailsModalProps> = ({
  visible,
  onCancel,
  partner,
}) => {
  const { t } = useTranslation();
  const [genderName, setGenderName] = useState("");
  const [verificationMethodName, setVerificationMethodName] = useState("");

  useEffect(() => {
    if (partner) {
      const genderMap: Record<number, string> = {
        1: t("establishmentProfile.partner.male"),
        2: t("establishmentProfile.partner.female"),
      };
      setGenderName(genderMap[partner.genderId || 0] || "");
      const verificationMap: Record<string, string> = {
        "1": t("establishmentProfile.partner.emiratesId"),
        "2": t("establishmentProfile.partner.uid"),
        "3": t("establishmentProfile.partner.passport"),
      };
      setVerificationMethodName(
        verificationMap[partner.verificationMethodCode || "1"] || ""
      );
    }
  }, [partner, t]);

  if (!partner) return null;

  const isCompany = partner.partnerTypeCode === "1";

  const companyFields = [
    {
      label: t("establishmentProfile.partner.partnerType"),
      value: t("establishmentProfile.partner.companyLegalEntity"),
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.nationality"),
      value: (partner.nationalityName ?? "").trim() || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.fields.establishmentNameArabic"),
      value: partner.fullNameAr || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.fields.establishmentNameEnglish"),
      value: partner.fullNameEn || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.representativeNameArabic"),
      value: partner.representativeNameAr || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.representativeNameEnglish"),
      value: partner.representativeNameEn || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.representativeEmiratesId"),
      value: partner.representativeEmiratesId || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.memorandumOfAssociation"),
      value: partner.memorandumOfAssociationUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.pdf"),
          }}
          fileName={partner.memorandumOfAssociationUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.powerOfAttorney"),
      value: partner.powerOfAttorneyUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.pdf"),
          }}
          fileName={partner.powerOfAttorneyUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.statement"),
      value: partner.statementUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.pdf"),
          }}
          fileName={partner.statementUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
  ];

  const individualCommonFields = [
    {
      label: t("establishmentProfile.partner.partnerType"),
      value: t("establishmentProfile.partner.individualNaturalPerson"),
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.verificationMethod"),
      value: verificationMethodName,
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.dateOfBirth"),
      value: partner.dateBirth
        ? moment(partner.dateBirth).format("DD/MM/YYYY")
        : "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.fullNameArabic"),
      value: partner.fullNameAr || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.fullNameEnglish"),
      value: partner.fullNameEn || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.nationality"),
      value: (partner.nationalityName ?? "").trim() || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.gender"),
      value: genderName,
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.occupation"),
      value: partner.occupation || "-",
      span: 1,
    },
  ];

  const emiratesSpecificFields = [
    {
      label: t("establishmentProfile.partner.emiratesId"),
      value: partner.emiratesId || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.expiryDate"),
      value: partner.expiryDate
        ? moment(partner.expiryDate).format("DD/MM/YYYY")
        : "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.personalPhoto"),
      value: partner.personalPhotoUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.image"),
          }}
          fileName={partner.personalPhotoUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.emiratesId"),
      value: partner.emiratesIdurl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.pdf"),
          }}
          fileName={partner.emiratesIdurl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
  ];

  const uidSpecificFields = [
    {
      label: t("establishmentProfile.partner.uid"),
      value: partner.uaeNumber || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.passportExpiryDate"),
      value: partner.passportExpiryDate
        ? moment(partner.passportExpiryDate).format("DD/MM/YYYY")
        : "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.visaExpiryDate"),
      value: partner.visaExpiryDate
        ? moment(partner.visaExpiryDate).format("DD/MM/YYYY")
        : "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.personalPhoto"),
      value: partner.personalPhotoUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.image"),
          }}
          fileName={partner.personalPhotoUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.passport"),
      value: partner.passportUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.pdf"),
          }}
          fileName={partner.passportUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.visa"),
      value: partner.visaUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.pdf"),
          }}
          fileName={partner.visaUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
  ];

  const passportSpecificFields = [
    {
      label: t("establishmentProfile.partner.passportNumber"),
      value: partner.passportNumber || "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.partner.passportExpiryDate"),
      value: partner.passportExpiryDate
        ? moment(partner.passportExpiryDate).format("DD/MM/YYYY")
        : "-",
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.personalPhoto"),
      value: partner.personalPhotoUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.image"),
          }}
          fileName={partner.personalPhotoUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
    {
      label: t("establishmentProfile.documents.passportScan"),
      value: partner.passportScanUrl ? (
        <DocumentViewer
          hasDownload
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("establishmentProfile.uploadTips.pdf"),
          }}
          fileName={partner.passportScanUrl}
        />
      ) : (
        "-"
      ),
      span: 1,
    },
  ];

  const individualFields = [
    ...individualCommonFields,
    ...(partner.verificationMethodCode === "1"
      ? emiratesSpecificFields
      : partner.verificationMethodCode === "2"
      ? uidSpecificFields
      : passportSpecificFields),
  ];

  const sections: FormPanelSectionConfig[] = [
    {
      key: "partner-details",
      columns: 2,
      items: (isCompany ? companyFields : individualFields).map((field) => ({
        key: field.label,
        label: field.label,
        renderView: () => field.value,
        colSpan: field.span as 1 | 2 | 3,
      })),
    },
  ];

  return (
    <Modal centered
      title={t("establishmentProfile.partner.detailsTitle")}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      className="partner-details-modal"
      width={""}
      destroyOnClose
    >
      <FormPanel mode="view" sections={sections} />
    </Modal>
  );
};

export default PartnerDetailsModal;
