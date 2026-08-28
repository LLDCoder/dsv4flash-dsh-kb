import React from "react";
import { Form } from "antd";
import { useTranslation } from "react-i18next";
import DocumentViewer from "../DocumentViewer";
import HoverTooltip from "../HoverTooltip";
import PersonalPhotoTooltip from "../PersonalPhotoTooltip";
import ComfirmWarningIcon from "@/assets/images/warning.png";
import { VERIFICATION_METHOD } from "@/utils/individualIdentity";
import type { DocumentExpiryFlags, DocumentFieldFlags, IndividualIdentityFormProps } from "./types";

type DocumentsSectionProps = Pick<
  IndividualIdentityFormProps,
  | "layout"
  | "verificationMethod"
  | "icpReadonlyFieldNames"
  | "isFieldDisabled"
  | "documentFileNames"
  | "getDocumentFieldFlags"
  | "documentExpiry"
>;

const defaultDocumentFlags: DocumentFieldFlags = {
  hasDelete: true,
  hasDownload: false,
  disabled: false,
};

const IdentityDocumentItem: React.FC<{
  name: string;
  label: React.ReactNode;
  requiredMessage: string;
  flags: DocumentFieldFlags;
  fileName?: string;
  accept: string;
  uploadTip: string;
  expiry?: DocumentExpiryFlags;
  localizedUploadMessages?: Record<string, string>;
  layout: "profile" | "modal";
}> = ({
  name,
  label,
  requiredMessage,
  flags,
  fileName,
  accept,
  uploadTip,
  expiry,
  localizedUploadMessages,
  layout,
}) => {
  const { t } = useTranslation();
  const isProfile = layout === "profile";
  const hasWarning =
    expiry &&
    (expiry.isLess30 || expiry.isExpiry) &&
    !expiry.isUnderReview;

  const helpContent =
    expiry?.isUnderReview ? (
      ""
    ) : expiry?.isExpiry ? (
      <div className="warnContainer">
        <img src={ComfirmWarningIcon} className="warnIcon" alt="" />
        {t("personalProfilePage.documentHelp.expired")}
      </div>
    ) : expiry?.isLess30 ? (
      <div className="warnContainer">
        <img src={ComfirmWarningIcon} className="warnIcon" alt="" />
        {t("personalProfilePage.documentHelp.expiringIn", {
          count: expiry.expiryDays ?? 0,
        })}
      </div>
    ) : (
      ""
    );

  const item = (
    <Form.Item
      name={name}
      label={label}
      rules={[{ required: true, message: requiredMessage }]}
      validateStatus={hasWarning ? "error" : ""}
      help={isProfile ? helpContent : undefined}
      extra={isProfile ? uploadTip : undefined}
      className={layout === "modal" ? "individual-identity-form-col" : undefined}
    >
      <DocumentViewer
        key={fileName || "empty"}
        hasDelete={flags.hasDelete}
        hasDownload={flags.hasDownload}
        disabled={flags.disabled}
        uploadConfig={{
          maxCount: 1,
          maxSize: 5,
          uploadTip,
          showUploadTip: !isProfile,
          accept,
          ...localizedUploadMessages,
        }}
        fileName={fileName}
      />
    </Form.Item>
  );

  if (isProfile) {
    return <div className="document-item">{item}</div>;
  }
  return item;
};

const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  layout,
  verificationMethod,
  icpReadonlyFieldNames,
  isFieldDisabled,
  documentFileNames,
  getDocumentFieldFlags,
  documentExpiry,
}) => {
  const { t } = useTranslation();
  const icpReadonly = (field: string) => icpReadonlyFieldNames.includes(field);
  const isModal = layout === "modal";
  const rowClass = isModal ? "individual-identity-form-row" : undefined;

  const wrapDocuments = (children: React.ReactNode) => {
    if (rowClass) {
      return <div className={rowClass}>{children}</div>;
    }
    return <>{children}</>;
  };

  const localizedPdfUploadMessages = {
    invalidFileTypeMessage: t("individualIdentity.validation.validPdf"),
    maxSizeErrorMessage: t("individualIdentity.validation.fileSizeLessThan5Mb"),
  };
  const localizedImageUploadMessages = {
    invalidFileTypeMessage: t("individualIdentity.validation.validImage"),
    maxSizeErrorMessage: t("individualIdentity.validation.fileSizeLessThan5Mb"),
  };

  const resolveFlags = (
    field: keyof NonNullable<IndividualIdentityFormProps["documentExpiry"]>,
  ) =>
    getDocumentFieldFlags?.(field as never, documentExpiry?.[field]) ??
    defaultDocumentFlags;

  const personalPhotoLabel = (
    <span>
      {t("individualIdentity.fields.personalPhoto")}{" "}
      <PersonalPhotoTooltip />
    </span>
  );

  const personalPhoto = (
    <IdentityDocumentItem
      name="personalPhotoUrl"
      label={personalPhotoLabel}
      requiredMessage={t("individualIdentity.validation.personalPhotoRequired")}
      flags={{
        ...resolveFlags("personalPhotoUrl"),
        disabled:
          resolveFlags("personalPhotoUrl").disabled ||
          isFieldDisabled("personalPhotoUrl") ||
          icpReadonly("personalPhotoUrl"),
      }}
      fileName={documentFileNames?.personalPhotoUrl}
      accept=".jpg,.jpeg,.png"
      uploadTip={t("individualIdentity.uploadTips.photoFiles")}
      expiry={documentExpiry?.personalPhotoUrl}
      localizedUploadMessages={localizedImageUploadMessages}
      layout={layout}
    />
  );

  if (verificationMethod === VERIFICATION_METHOD.EMIRATES_ID) {
    return wrapDocuments(
      <>
        {personalPhoto}
        <IdentityDocumentItem
          name="emiratesIdUrl"
          label={
            <span>
              {t("individualIdentity.fields.emiratesIdCopy")}
              <HoverTooltip
                content={
                  <div>{t("individualIdentity.uploadTips.emiratesIdTooltip")}</div>
                }
              />
            </span>
          }
          requiredMessage={t("individualIdentity.validation.emiratesUploadRequired")}
          flags={{
            ...resolveFlags("emiratesIdUrl"),
            disabled:
              resolveFlags("emiratesIdUrl").disabled ||
              isFieldDisabled("emiratesIdUrl") ||
              icpReadonly("emiratesIdUrl"),
          }}
          fileName={documentFileNames?.emiratesIdUrl}
          accept=".pdf"
          uploadTip={t("individualIdentity.uploadTips.pdfOnly")}
          expiry={documentExpiry?.emiratesIdUrl}
          localizedUploadMessages={localizedPdfUploadMessages}
          layout={layout}
        />
      </>,
    );
  }

  if (verificationMethod === VERIFICATION_METHOD.UID) {
    return (
      <>
        {wrapDocuments(
          <>
            {personalPhoto}
            <IdentityDocumentItem
            name="passportUrl"
            label={t("individualIdentity.fields.passport")}
            requiredMessage={t("individualIdentity.validation.passportUploadRequired")}
            flags={{
              ...resolveFlags("passportUrl"),
              disabled:
                resolveFlags("passportUrl").disabled ||
                isFieldDisabled("passportUrl") ||
                icpReadonly("passportUrl"),
            }}
            fileName={documentFileNames?.passportUrl}
            accept=".pdf"
            uploadTip={t("individualIdentity.uploadTips.pdfOnly")}
            expiry={documentExpiry?.passportUrl}
            localizedUploadMessages={localizedPdfUploadMessages}
            layout={layout}
          />
          </>,
        )}
        {wrapDocuments(
          <IdentityDocumentItem
            name="visaUrl"
            label={t("individualIdentity.fields.visa")}
            requiredMessage={t("individualIdentity.validation.visaUploadRequired")}
            flags={{
              ...resolveFlags("visaUrl"),
              disabled:
                resolveFlags("visaUrl").disabled ||
                isFieldDisabled("visaUrl") ||
                icpReadonly("visaUrl"),
            }}
            fileName={documentFileNames?.visaUrl}
            accept=".pdf"
            uploadTip={t("individualIdentity.uploadTips.pdfOnly")}
            expiry={documentExpiry?.visaUrl}
            localizedUploadMessages={localizedPdfUploadMessages}
            layout={layout}
          />,
        )}
      </>
    );
  }

  return wrapDocuments(
    <>
      {personalPhoto}
      <IdentityDocumentItem
        name="passportScanUrl"
        label={t("individualIdentity.fields.passportScan")}
        requiredMessage={t("individualIdentity.validation.passportScanRequired")}
        flags={{
          ...resolveFlags("passportScanUrl"),
          disabled:
            resolveFlags("passportScanUrl").disabled ||
            isFieldDisabled("passportScanUrl") ||
            icpReadonly("passportScanUrl"),
        }}
        fileName={documentFileNames?.passportScanUrl}
        accept=".pdf"
        uploadTip={t("individualIdentity.uploadTips.pdfOnly")}
        expiry={documentExpiry?.passportScanUrl}
        localizedUploadMessages={localizedPdfUploadMessages}
        layout={layout}
      />
    </>,
  );
};

export default DocumentsSection;
