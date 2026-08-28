import React from "react";
import { Form } from "antd";
import type { FormInstance } from "antd/lib/form";
import { useTranslation } from "react-i18next";
import HoverTooltip from "@/components/common/HoverTooltip";
import DocumentViewer from "@/components/common/DocumentViewer";
import ComfirmWarningIcon from "@/assets/images/warning.png";
import { OFFICIAL_LETTER_TEMPLATE_URL } from "../../utils/constants";

interface PdfUploadMessages {
  invalidFileTypeMessage: string;
  maxSizeErrorMessage: string;
}

interface EstablishmentDocumentsData {
  documents?: {
    commercialLicense?: string | null;
    tenancyContract?: string | null;
    memorandum?: string | null;
    powerOfAttorney?: string | null;
    officialLetterUrl?: string | null;
  };
}

interface EstablishmentDocumentsSectionProps {
  form: FormInstance;
  isCommercialGroup: boolean;
  isGovernmentGroup: boolean;
  mode: string | null;
  showFullCommercialForm: boolean;
  fetchedCommercialData: EstablishmentDocumentsData | null;
  isEditForm: boolean;
  isLess30: boolean;
  isExpriry: boolean;
  expriryDays: number;
  canEditField: (fieldName: string) => boolean;
  localizedPdfUploadMessages: PdfUploadMessages;
}

const EstablishmentDocumentsSection: React.FC<EstablishmentDocumentsSectionProps> = ({
  form,
  isCommercialGroup,
  isGovernmentGroup,
  mode,
  showFullCommercialForm,
  fetchedCommercialData,
  isEditForm,
  isLess30,
  isExpriry,
  expriryDays,
  canEditField,
  localizedPdfUploadMessages,
}) => {
  const { t } = useTranslation();

  const commercialLicenseFormValue = Form.useWatch(
    ["commercial", "documents", "commercialLicense"],
    form,
  );
  const baselineCommercialLicense =
    fetchedCommercialData?.documents?.commercialLicense;
  const baselineLicenseStr =
    baselineCommercialLicense === undefined || baselineCommercialLicense === null
      ? ""
      : String(baselineCommercialLicense);
  const currentLicenseStr =
    commercialLicenseFormValue === undefined || commercialLicenseFormValue === null
      ? ""
      : String(commercialLicenseFormValue);
  const commercialLicenseExpiryNoticeActive =
    (isLess30 || isExpriry) &&
    baselineLicenseStr !== "" &&
    currentLicenseStr === baselineLicenseStr;

  const pdfUploadConfig = {
    maxCount: 1,
    maxSize: 5,
    uploadTip: "",
    accept: ".pdf",
    ...localizedPdfUploadMessages,
  };

  const pdfTooltipContent = (
    <div>{t("establishmentProfile.uploadTips.pdf")}</div>
  );

  const officialLetterUploadConfig = {
    ...pdfUploadConfig,
  };

  const expiryHelp =
    commercialLicenseExpiryNoticeActive && isExpriry ? (
      <div className="warnContainer">
        <img src={ComfirmWarningIcon} className="warnIcon" alt="warning" />
        {t("establishmentProfile.messages.expired")}
      </div>
    ) : commercialLicenseExpiryNoticeActive && isLess30 ? (
      <div className="warnContainer">
        <img src={ComfirmWarningIcon} className="warnIcon" alt="warning" />
        {t("establishmentProfile.messages.expiringInDays", { days: expriryDays })}
      </div>
    ) : undefined;

  return (
    <>
      {isCommercialGroup && (mode !== "add" || showFullCommercialForm) && (
        <div className="profile-section">
          <h2 className="section-title">
            {t("establishmentProfile.sections.establishmentDocuments")}
          </h2>
          <div className="documents-grid">
            <div className="document-item">
              <Form.Item
                name={["commercial", "documents", "commercialLicense"]}
                label={
                  <span>
                    {t("establishmentProfile.documents.commercialLicense")}
                    <HoverTooltip content={pdfTooltipContent} />
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: t(
                      "establishmentProfile.validation.uploadCommercialLicense",
                    ),
                  },
                ]}
                validateStatus={
                  commercialLicenseExpiryNoticeActive ? "error" : ""
                }
                help={expiryHelp}
              >
                <DocumentViewer
                  key={fetchedCommercialData?.documents?.commercialLicense || "empty"}
                  disabled={!canEditField("commercialLicense")}
                  hasDelete={canEditField("commercialLicense")}
                  reuploadTooltip={t(
                    "establishmentProfile.actions.reuploadDocument",
                  )}
                  hasView
                  hasDownload={!isEditForm || !canEditField("commercialLicense")}
                  uploadConfig={pdfUploadConfig}
                  fileName={fetchedCommercialData?.documents?.commercialLicense ?? undefined}
                />
              </Form.Item>
            </div>

            <div className="document-item">
              <Form.Item
                name={["commercial", "documents", "tenancyContract"]}
                label={
                  <span>
                    {t("establishmentProfile.documents.tenancyContract")}
                    <HoverTooltip content={pdfTooltipContent} />
                  </span>
                }
              >
                <DocumentViewer
                  key={fetchedCommercialData?.documents?.tenancyContract || "empty-tenancy"}
                  disabled={!canEditField("tenancyContract")}
                  hasDelete={canEditField("tenancyContract")}
                  hasDownload={!isEditForm || !canEditField("tenancyContract")}
                  uploadConfig={pdfUploadConfig}
                  fileName={fetchedCommercialData?.documents?.tenancyContract ?? undefined}
                />
              </Form.Item>
            </div>

            <div className="document-item">
              <Form.Item
                name={["commercial", "documents", "memorandum"]}
                label={
                  <span>
                    {t("establishmentProfile.documents.memorandumOfAssociation")}
                    <HoverTooltip content={pdfTooltipContent} />
                  </span>
                }
              >
                <DocumentViewer
                  key={fetchedCommercialData?.documents?.memorandum || "empty-memorandum"}
                  disabled={!canEditField("memorandum")}
                  hasDelete={canEditField("memorandum")}
                  hasDownload={!isEditForm || !canEditField("memorandum")}
                  uploadConfig={pdfUploadConfig}
                  fileName={fetchedCommercialData?.documents?.memorandum ?? undefined}
                />
              </Form.Item>
            </div>

            <div className="document-item">
              <Form.Item
                name={["commercial", "documents", "powerOfAttorney"]}
                label={
                  <span>
                    {t("establishmentProfile.documents.powerOfAttorney")}
                    <HoverTooltip content={pdfTooltipContent} />
                  </span>
                }
              >
                <DocumentViewer
                  key={fetchedCommercialData?.documents?.powerOfAttorney || "empty-power"}
                  disabled={!canEditField("powerOfAttorney")}
                  hasDelete={canEditField("powerOfAttorney")}
                  hasDownload={!isEditForm || !canEditField("powerOfAttorney")}
                  uploadConfig={pdfUploadConfig}
                  fileName={fetchedCommercialData?.documents?.powerOfAttorney ?? undefined}
                />
              </Form.Item>
            </div>
          </div>
        </div>
      )}

      {isGovernmentGroup && (
        <div className="profile-section">
          <h2 className="section-title">
            {t("establishmentProfile.sections.establishmentDocuments")}
          </h2>
          <div className="documents-grid">
            <div className="document-item">
              <Form.Item
                name={["commercial", "documents", "officialLetterUrl"]}
                label={
                  <span>
                    {t(
                      "establishmentProfile.documents.officialLetterFromEntityToNma",
                    )}
                    <HoverTooltip
                      content={
                        <div className="officialLetter-hover">
                          {t("establishmentProfile.officialLetter.mustInclude")}
                          <ul>
                            <li>
                              {t(
                                "establishmentProfile.officialLetter.delegatedFullName",
                              )}
                            </li>
                            <li>
                              {t(
                                "establishmentProfile.officialLetter.delegatedEmail",
                              )}
                            </li>
                            <li>
                              {t(
                                "establishmentProfile.officialLetter.delegatedEid",
                              )}
                            </li>
                            <li>
                              {t(
                                "establishmentProfile.officialLetter.stampAndSignature",
                              )}
                            </li>
                            <li>
                              {t(
                                "establishmentProfile.officialLetter.fileSizeAndType",
                              )}
                            </li>
                          </ul>
                        </div>
                      }
                    />
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: t(
                      "establishmentProfile.validation.uploadOfficialLetter",
                    ),
                  },
                ]}
              >
                <DocumentViewer
                  key={
                    fetchedCommercialData?.documents?.officialLetterUrl || "empty"
                  }
                  disabled={!canEditField("officialLetterUrl")}
                  hasDelete={canEditField("officialLetterUrl")}
                  hasDownload={!isEditForm || !canEditField("officialLetterUrl")}
                  uploadConfig={officialLetterUploadConfig}
                  fileName={fetchedCommercialData?.documents?.officialLetterUrl ?? undefined}
                />
              </Form.Item>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EstablishmentDocumentsSection;
