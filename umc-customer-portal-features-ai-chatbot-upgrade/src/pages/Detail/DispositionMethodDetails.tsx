import { useMemo, useState } from "react";
import {
  DeleteOutlined,
  GlobalOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import FileUpload, { type FileItem } from "@/components/common/FileUpload";
import PreviewModal from "@/components/common/PreviewModal";
import ReviewProfileInfoCommon from "@/pages/MediaLicense/components/ReviewProfileInfoCommon";
import type { ApplicationDispositionSubmission } from "@/services/myRequest";
import { resolveFileUrl } from "@/utils/url";
import "./DispositionMethodDetails.less";

export type DispositionMethodIcon = "export" | "destroy" | "seized";

export interface DispositionMethodOption {
  icon: DispositionMethodIcon;
  label: string;
  value: string;
}

interface DispositionMethodDetailsProps {
  submission: ApplicationDispositionSubmission;
  methodOptions: ReadonlyArray<DispositionMethodOption>;
}

const EMPTY_VALUE = "-";

const getFileName = (value: string) => {
  const cleanValue = value.split(/[?#]/)[0] || "";
  const pathParts = cleanValue.split(/[/\\]/).filter(Boolean);
  const fileName = pathParts[pathParts.length - 1] || value;

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
};

const parseSupportingDocuments = (
  value: ApplicationDispositionSubmission["supportingDocumentsJson"],
) => {
  let parsedValue: unknown = value;

  if (typeof value === "string") {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return [];
    }

    try {
      parsedValue = JSON.parse(normalizedValue);
    } catch (error) {
      console.error("Failed to parse disposition supporting documents:", error);
      return [];
    }
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  const seen = new Set<string>();
  return parsedValue.reduce<string[]>((result, item) => {
    const normalizedItem = typeof item === "string" ? item.trim() : "";
    if (!normalizedItem || seen.has(normalizedItem)) {
      return result;
    }

    seen.add(normalizedItem);
    result.push(normalizedItem);
    return result;
  }, []);
};

const renderMethodIcon = (icon: DispositionMethodIcon) => {
  if (icon === "export") {
    return <GlobalOutlined />;
  }

  if (icon === "destroy") {
    return <DeleteOutlined />;
  }

  return <WarningOutlined />;
};

const DispositionMethodDetails = ({
  submission,
  methodOptions,
}: DispositionMethodDetailsProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const method = typeof submission.method === "string"
    ? submission.method.trim()
    : "";
  const selectedMethod = methodOptions.find((option) => option.value === method);
  const notes = typeof submission.notes === "string"
    ? submission.notes.trim()
    : "";
  const supportingDocuments = useMemo(
    () => parseSupportingDocuments(submission.supportingDocumentsJson),
    [submission.supportingDocumentsJson],
  );
  const supportingDocumentFiles = useMemo<FileItem[]>(
    () =>
      supportingDocuments.map((document) => ({
        name: getFileName(document),
        url: resolveFileUrl(document),
      })),
    [supportingDocuments],
  );

  return (
    <div className="disposition-method-details">
      <ReviewProfileInfoCommon
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        sectionTitle={t("myRequestsPage.detail.dispositionDetails.title")}
      >
        <div className="disposition-method-details__body">
          <div className="disposition-method-details__method-card">
            {selectedMethod ? (
              <div className="disposition-method-details__method-icon">
                {renderMethodIcon(selectedMethod.icon)}
              </div>
            ) : null}
            <div className="disposition-method-details__method-label">
              {selectedMethod?.label || EMPTY_VALUE}
            </div>
          </div>

          <div className="disposition-method-details__field">
            <div className="disposition-method-details__field-label">
              {t(
                "myRequestsPage.detail.submitProofModal.supportingDocuments",
              )}
            </div>
            {supportingDocumentFiles.length > 0 ? (
              <FileUpload
                value={supportingDocumentFiles}
                readOnly
                showUploadTip={false}
                onPreview={setPreviewFile}
              />
            ) : (
              <div className="disposition-method-details__field-value">
                {EMPTY_VALUE}
              </div>
            )}
          </div>

          <div className="disposition-method-details__field">
            <div className="disposition-method-details__field-label">
              {t("myRequestsPage.detail.submitProofModal.notes")}
            </div>
            <div className="disposition-method-details__field-value disposition-method-details__notes">
              {notes || EMPTY_VALUE}
            </div>
          </div>
        </div>
      </ReviewProfileInfoCommon>

      <PreviewModal
        visible={Boolean(previewFile)}
        fileData={{
          name: previewFile?.name ?? "",
          url: previewFile?.url ?? "",
        }}
        onCancel={() => setPreviewFile(null)}
      />
    </div>
  );
};

export default DispositionMethodDetails;
