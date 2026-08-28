import * as React from "react";
import { useTranslation } from "react-i18next";
import { observer, useField } from "@formily/react";
import { Input, Row, Col, Card as AntdCard } from "antd";
import "./styles.less";

type LicenseInformationFormValue = {
  licenseName?: string;
  licenseNumber?: string;
  expiryDate?: string;
};

const MOCK_LICENSE_DATA: LicenseInformationFormValue = {
  licenseName: "Media License",
  licenseNumber: "ML-2025-00001234",
  expiryDate: "22/05/2025",
};

export const LicenseInformationFormField: React.FC<any> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField<any>();
  const current: LicenseInformationFormValue = field.value || MOCK_LICENSE_DATA;
  const currentLanguage = i18n.language ?? "";

  React.useEffect(() => {
    if (!field.value) {
      field.setValue(MOCK_LICENSE_DATA);
    }
  }, []);

  const getDisplayValue = React.useCallback(
    (value: string | undefined) => {
      if (value === MOCK_LICENSE_DATA.licenseName) {
        return t("LicenseInformationForm.value.mediaLicense");
      }
      return value || "";
    },
    [currentLanguage, t],
  );

  const renderLabel = (label: string) => (
    <div className="license-info-form-label">
      <span>{label}</span>
    </div>
  );

  const renderTextDisplay = (value: string | undefined) => {
    return (
      <Input
        disabled
        value={value || ""}
        className="license-info-form-readonly"
      />
    );
  };

  return (
    <div className="license-info-form-container" {...props}>
      <AntdCard className="license-info-form-card" title={t("LicenseInformationForm.title")}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <div className="license-info-form-field">
              {renderLabel(t("LicenseInformationForm.label.licenseName"))}
              {renderTextDisplay(getDisplayValue(current.licenseName))}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="license-info-form-field">
              {renderLabel(t("LicenseInformationForm.label.licenseNumber"))}
              {renderTextDisplay(current.licenseNumber)}
            </div>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <div className="license-info-form-field">
              {renderLabel(t("LicenseInformationForm.label.expiryDate"))}
              {renderTextDisplay(current.expiryDate)}
            </div>
          </Col>
          <Col span={12} />
        </Row>
      </AntdCard>
    </div>
  );
});

LicenseInformationFormField.displayName = "LicenseInformationFormField";

export default LicenseInformationFormField;
