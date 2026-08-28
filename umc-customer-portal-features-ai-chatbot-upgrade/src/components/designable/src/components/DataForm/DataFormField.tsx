import * as React from "react";
import { observer, useField, Field } from "@formily/react";
import { FormItem, FormGrid, Select as FormilySelect, Input as FormilyInput } from "@formily/antd";
import { Card, Col, DatePicker, Input, Row, Select } from "antd";
import DocumentViewer from "../../../../../components/common/DocumentViewer";
import "./styles.less";
import AddressPicker from "../AddressPicker/AddressPicker";
import { useTranslation } from "react-i18next";
import { toPickerMoment } from "@/utils/dateLocale";
import { CompositeMobileNumberField } from "../MobileNumberInput";
import PersonalPhotoTooltip from "@/components/common/PersonalPhotoTooltip";

const { Option } = Select;

type KeyOfValue =
  | "personPhoto"
  | "unitedNumber"
  | "dateOfBirth"
  | "nationality"
  | "fullNameEn"
  | "fullNameAr"
  | "passportType"
  | "passportNo"
  | "placeOfIssueEn"
  | "placeOfIssueAr"
  | "dateOfExpiry"
  | "dateOfIssue"
  | "address"
  | "street"
  | "mobileNo"
  | "mobileNoCountryCode"
  | "mobileNoLocalNumber"
  | "telephoneNo"
  | "telephoneNoCountryCode"
  | "telephoneNoLocalNumber"
  | "fax"
  | "workNo"
  | "workNoCountryCode"
  | "workNoLocalNumber"
  | "areaCode"
  | "emailAddress";

type DataFormValue = Partial<Record<KeyOfValue, any>> & {
  addressPicker?: any;
};

export const DataFormField: React.FC<any> = observer((props) => {
  const { t } = useTranslation();
  const field = useField<any>();
  const current: DataFormValue = field.value || {};
  const simpleOptions = React.useMemo(
    () => ({
      nationality: [
        { label: t("DataForm.select.nationality"), value: "" },
        { label: t("DataForm.options.uae"), value: "UAE" },
        { label: t("DataForm.options.india"), value: "India" },
        { label: t("DataForm.options.pakistan"), value: "Pakistan" },
        { label: t("DataForm.options.egypt"), value: "Egypt" },
        { label: t("DataForm.options.saudiArabia"), value: "Saudi Arabia" },
        { label: t("DataForm.options.jordan"), value: "Jordan" },
        { label: t("DataForm.options.lebanon"), value: "Lebanon" },
      ],
      passportType: [
        { label: t("DataForm.select.passportType"), value: "" },
        { label: t("DataForm.options.ordinary"), value: "Ordinary" },
        { label: t("DataForm.options.diplomatic"), value: "Diplomatic" },
        { label: t("DataForm.options.official"), value: "Official" },
        { label: t("DataForm.options.service"), value: "Service" },
      ],
    }),
    [t],
  );

  const handleFieldChange = (key: KeyOfValue, value: any) => {
    field.setValue({
      ...current,
      [key]: value,
    });
  };

  const handleFieldsChange = (patch: Record<string, any>) => {
    field.setValue({
      ...current,
      ...patch,
    });
  };

  const renderTextInput = (name: KeyOfValue, placeholder: string, required?: boolean) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("DataForm.validation.required");
          return "";
        }}
      >
        <Input
          className="ant-input-affix-wrapper"
          placeholder={placeholder}
          disabled={props.disabled}
          value={current[name] || ""}
          onChange={(e) => handleFieldChange(name, e.target.value)}
        />
      </Field>
    );
  };

  const renderSelect = (
    name: KeyOfValue,
    placeholder: string,
    options: { label: string; value: string }[],
    required?: boolean
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("DataForm.validation.required");
          return "";
        }}
      >
        <Select
          placeholder={placeholder}
          disabled={props.disabled}
          value={current[name] ?? ""}
          onChange={(value) => handleFieldChange(name, value)}
          showSearch
          optionFilterProp="children"
        >
          {options
            .filter((o) => o.value !== "" || !required)
            .map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
        </Select>
      </Field>
    );
  };

  const renderDate = (name: KeyOfValue, placeholder: string, required?: boolean) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("DataForm.validation.required");
          return "";
        }}
      >
        <DatePicker
          style={{ width: "100%" }}
          disabled={props.disabled}
          placeholder={placeholder}
          value={toPickerMoment(current[name])}
          onChange={(date) =>
            handleFieldChange(name, date ? date.format("YYYY-MM-DD") : undefined)
          }
        />
      </Field>
    );
  };

  const renderUpload = (name: KeyOfValue, label: string, required?: boolean) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value) return t("DataForm.validation.uploadRequired", { label });
          return "";
        }}
      >
        <DocumentViewer
          label=""
          disabled={props.disabled}
          value={current[name]}
          onChange={(value) => handleFieldChange(name, value)}
          uploadConfig={{
            maxSize: 5,
            maxCount: 1,
            accept: ".pdf,.jpg,.jpeg,.png",
            placeholder: t("DataForm.common.upload"),
          }}
          hasView={true}
          hasDelete={true}
        />
      </Field>
    );
  };

  return (
    <div className="data-form-container" {...props}>
      <Card className="data-form-card" title={t("DataForm.title")}>
        
        {/* Personal Information Section */}
        <Card className="data-form-section" title={t("DataForm.section.personalInformation")}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="data-form-label">
                {t("DataForm.label.personPhoto")} <PersonalPhotoTooltip />
              </div>
              {renderUpload("personPhoto", t("DataForm.label.personPhoto"), true)}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.unitedNumber")}</div>
              {renderTextInput("unitedNumber", t("DataForm.placeholder.enterEmiratesId"), true)}
            </Col>

            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.dateOfBirth")}</div>
              {renderDate("dateOfBirth", t("DataForm.common.datePlaceholder"), true)}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.nationality")}</div>
              {renderSelect(
                "nationality",
                t("DataForm.select.nationality"),
                simpleOptions.nationality,
                true
              )}
            </Col>

            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.fullNameEn")}</div>
              {renderTextInput("fullNameEn", t("DataForm.placeholder.enterFullNameEn"), true)}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.fullNameAr")}</div>
              {renderTextInput("fullNameAr", t("DataForm.placeholder.enterFullNameAr"), true)}
            </Col>
          </Row>
        </Card>

        {/* Passport Details Section */}
        <Card className="data-form-section" title={t("DataForm.section.passportDetails")}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.passportType")}</div>
              {renderSelect(
                "passportType",
                t("DataForm.select.passportType"),
                simpleOptions.passportType,
                true
              )}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.passportNo")}</div>
              {renderTextInput("passportNo", t("DataForm.placeholder.enterPassportNumber"), true)}
            </Col>

            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.placeOfIssueEn")}</div>
              {renderTextInput("placeOfIssueEn", t("DataForm.placeholder.enterPlaceOfIssueEn"), true)}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.placeOfIssueAr")}</div>
              {renderTextInput("placeOfIssueAr", t("DataForm.placeholder.enterPlaceOfIssueAr"), true)}
            </Col>

            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.dateOfExpiry")}</div>
              {renderDate("dateOfExpiry", t("DataForm.common.datePlaceholder"), true)}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.dateOfIssue")}</div>
              {renderDate("dateOfIssue", t("DataForm.common.datePlaceholder"), true)}
            </Col>
          </Row>
        </Card>

        {/* Address Section */}
        <Card className="data-form-section" title={t("DataForm.section.address")}>
          <Field name="addressPicker" decorator={[FormItem]} component={[AddressPicker]}>
            <FormGrid maxColumns={2} minColumns={2} columnGap={24} rowGap={12}>
              <div>
                <div className="data-form-label">{t("DataForm.label.emirate")}</div>
                <Field
                  name="grid.emirate"
                  decorator={[FormItem]}
                  disabled={props.disabled}
                  component={[FormilySelect, { placeholder: t("DataForm.select.emirate") }]}
                />
              </div>

              <div>
                <div className="data-form-label">{t("DataForm.label.region")}</div>
                <Field
                  name="grid.region"
                  decorator={[FormItem]}
                  disabled={props.disabled}
                  component={[FormilySelect, { placeholder: t("DataForm.select.region") }]}
                />
              </div>

              <div>
                <div className="data-form-label">{t("DataForm.label.area")}</div>
                <Field
                  name="grid.area"
                  decorator={[FormItem]}
                  disabled={props.disabled}
                  component={[FormilySelect, { placeholder: t("DataForm.select.area") }]}
                />
              </div>

              <div>
                <div className="data-form-label">{t("DataForm.label.street")}</div>
                <Field
                  name="grid.street"
                  decorator={[FormItem]}
                  disabled={props.disabled}
                  component={[FormilyInput.TextArea, { placeholder: t("DataForm.placeholder.enterStreet"), rows: 4 }]}
                />
              </div>
            </FormGrid>
          </Field>
        </Card>

        {/* Contact Information Section */}
        <Card className="data-form-section" title={t("DataForm.section.contactInformation")}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.mobileNo")}</div>
              <CompositeMobileNumberField
                fieldNames={{
                  fullNumber: "mobileNo",
                  countryCode: "mobileNoCountryCode",
                  localNumber: "mobileNoLocalNumber",
                }}
                fullNumber={current.mobileNo}
                countryCode={current.mobileNoCountryCode}
                localNumber={current.mobileNoLocalNumber}
                disabled={props.disabled}
                required
                placeholder={t("DataForm.placeholder.enterMobileNumber")}
                onChange={(patch) => handleFieldsChange(patch)}
              />
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.telephoneNo")}</div>
              <CompositeMobileNumberField
                fieldNames={{
                  fullNumber: "telephoneNo",
                  countryCode: "telephoneNoCountryCode",
                  localNumber: "telephoneNoLocalNumber",
                }}
                fullNumber={current.telephoneNo}
                countryCode={current.telephoneNoCountryCode}
                localNumber={current.telephoneNoLocalNumber}
                disabled={props.disabled}
                required
                placeholder={t("DataForm.placeholder.enterTelephoneNumber")}
                onChange={(patch) => handleFieldsChange(patch)}
              />
            </Col>

            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.fax")}</div>
              {renderTextInput("fax", t("DataForm.placeholder.enterFax"), true)}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.workNo")}</div>
              <CompositeMobileNumberField
                fieldNames={{
                  fullNumber: "workNo",
                  countryCode: "workNoCountryCode",
                  localNumber: "workNoLocalNumber",
                }}
                fullNumber={current.workNo}
                countryCode={current.workNoCountryCode}
                localNumber={current.workNoLocalNumber}
                disabled={props.disabled}
                required
                placeholder={t("DataForm.placeholder.enterWorkNo")}
                onChange={(patch) => handleFieldsChange(patch)}
              />
            </Col>

            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.area")}</div>
              {renderTextInput("areaCode", t("DataForm.select.area"), true)}
            </Col>
            <Col xs={24} md={12}>
              <div className="data-form-label">{t("DataForm.label.emailAddress")}</div>
              {renderTextInput("emailAddress", t("DataForm.placeholder.enterEmailAddress"), true)}
            </Col>
          </Row>
        </Card>

      </Card>
    </div>
  );
});
