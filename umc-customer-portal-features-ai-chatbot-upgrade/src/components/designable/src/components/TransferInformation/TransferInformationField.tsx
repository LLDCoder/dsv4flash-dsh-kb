import * as React from "react";
import { useTranslation } from "react-i18next";
import { observer, useField } from "@formily/react";
import { Input, Row, Col, Card as AntdCard, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import "./styles.less";

const { TextArea } = Input;

type TransferInformationValue = {
  powerOfAttorney?: any;
  initialApprovalDocument?: any;
  transferReason?: string;
};

export const TransferInformationField: React.FC<any> = observer((props) => {
  const { t } = useTranslation();
  const field = useField<any>();
  const current: TransferInformationValue = field.value || {};
  const { disabled = false } = props;

  const handleFieldChange = (key: string, value: any) => {
    const newValue = {
      ...current,
      [key]: value,
    };
    field.setValue(newValue);
  };

  const renderLabel = (label: string, required: boolean = true, tooltip?: string) => (
    <div className="transfer-info-label">
      <span>
        {label}
        {required && <span className="transfer-info-required">*</span>}
      </span>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="transfer-info-tooltip-icon" />
        </Tooltip>
      )}
    </div>
  );

  const renderUpload = (
    name: string,
    label: string,
    tooltip?: string
  ) => {
    return (
      <div className="transfer-info-field">
        {renderLabel(label, true, tooltip)}
        <DocumentViewer
          hasDelete={true}
          disabled={disabled}
          value={current[name as keyof TransferInformationValue]}
          onChange={(value) => handleFieldChange(name, value)}
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: t("TransferInformation.uploadTip.pdf"),
            accept: ".pdf",
          }}
        />
      </div>
    );
  };

  return (
    <div className="transfer-info-container" {...props}>
      <AntdCard className="transfer-info-card" title={t("TransferInformation.title")}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            {renderUpload(
              "powerOfAttorney",
              t("TransferInformation.label.powerOfAttorney"),
              t("TransferInformation.tooltip.powerOfAttorney")
            )}
          </Col>
          <Col xs={24} md={12}>
            {renderUpload(
              "initialApprovalDocument",
              t("TransferInformation.label.initialApprovalDocument"),
              t("TransferInformation.tooltip.initialApprovalDocument")
            )}
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={24}>
            <div className="transfer-info-field">
              {renderLabel(t("TransferInformation.label.transferReason"), true)}
              <TextArea
                disabled={disabled}
                placeholder={t("TransferInformation.placeholder.enter")}
                value={current.transferReason || ""}
                maxLength={1000}
                rows={4}
                showCount
                onChange={(e) => handleFieldChange("transferReason", e.target.value)}
                className="transfer-info-textarea"
              />
            </div>
          </Col>
        </Row>
      </AntdCard>
    </div>
  );
});

TransferInformationField.displayName = "TransferInformationField";

export default TransferInformationField;
