import * as React from "react";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField } from "@formily/react";
import { Input, Select, Row, Col, Card as AntdCard, DatePicker, Alert } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import { CompositeMobileNumberField } from "../MobileNumberInput";
import "./styles.less";
import { toPickerMoment } from "@/utils/dateLocale";

const { Option } = Select;

type IdentityType = "individual" | "entity";

type LicenseTransferFormValue = {
  identityType?: IdentityType;
  verified?: boolean;
  dateOfBirth?: string;
  emiratesId?: string;
  licenseExpiryDate?: string;
  commercialLicenseNumber?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  nationality?: string;
  gender?: string;
  occupation?: string;
  expiryDate?: string;
  personalPhoto?: any;
  emiratesIdFile?: any;
  establishmentNameArabic?: string;
  establishmentNameEnglish?: string;
  emirate?: string;
  licensingAuthority?: string;
  phoneNumber?: string;
  phoneNumberCountryCode?: string;
  phoneNumberLocalNumber?: string;
  tenancyContractEndDate?: string;
  commercialLicenseFile?: any;
  tenancyContract?: any;
  memorandumOfAssociation?: any;
  legalPerson?: string;
  legalPersonContact?: string;
  legalPersonContactCountryCode?: string;
  legalPersonContactLocalNumber?: string;
  legalPersonIdType?: string;
  legalPersonEmiratesId?: string;
  legalPersonDateOfBirth?: string;
  legalPersonEmail?: string;
  addressEmirate?: string;
  addressRegion?: string;
  addressArea?: string;
  addressStreet?: string;
  [key: string]: any;
};

type OptionType = {
  label: string;
  value: string;
};

const MOCK_INDIVIDUAL_DATA = {
  dateOfBirth: "1990-05-15",
  emiratesId: "784-1990-1234567-1",
  fullNameArabic: "أحمد محمد",
  fullNameEnglish: "Ahmed Mohammed",
  nationality: "UAE",
  gender: "Male",
  expiryDate: "2030-05-15",
};

const MOCK_ENTITY_DATA = {
  licenseExpiryDate: "2028-09-08",
  commercialLicenseNumber: "UAEMC-4458",
  establishmentNameArabic: "شركة بانداي نامكو",
  establishmentNameEnglish: "BANDAI NAMCO",
  emirate: "abu_dhabi",
  licensingAuthority: "ad_ded",
  phoneNumber: "0212345678",
  tenancyContractEndDate: "2027-07-07",
};

const LICENSE_TRANSFER_OPTION_KEYS = {
  emirate: [
    "emirate.abu_dhabi",
    "emirate.dubai",
    "emirate.sharjah",
    "emirate.ajman",
    "emirate.umm_al_quwain",
    "emirate.ras_al_khaimah",
    "emirate.fujairah",
  ],
  licensingAuthority: [
    "licensingAuthority.ad_ded",
    "licensingAuthority.dubai_ded",
    "licensingAuthority.sharjah_edd",
  ],
  region: [
    "region.abu_dhabi",
    "region.al_ain",
    "region.western_region",
  ],
  area: [
    "area.map",
    "area.khalifa_city",
    "area.al_reem_island",
  ],
  idType: [
    "idType.emirates_id",
    "idType.passport",
  ],
} as const;

type LicenseTransferOptionTranslationKey =
  (typeof LICENSE_TRANSFER_OPTION_KEYS)[keyof typeof LICENSE_TRANSFER_OPTION_KEYS][number];

const LOCALIZED_VALUE_KEYS: Record<string, string> = {
  UAE: "uae",
  Male: "male",
};

const DEFAULT_ALERT_MESSAGE = "License transfer is subject to approval. The recipient must have a valid UAE Media Council account and meet all eligibility requirements.";

export const LicenseTransferFormField: React.FC<any> = observer((props) => {
  const { t, i18n } = useTranslation();
  const field = useField<any>();
  const current: LicenseTransferFormValue = field.value || {};
  const currentLanguage = i18n.language ?? "";

  const {
    alertMessage,
    disabled = false,
  } = props;
  const localizedAlertMessage =
    !alertMessage || alertMessage === DEFAULT_ALERT_MESSAGE
      ? t("LicenseTransferForm.alert.default")
      : alertMessage;

  const getLocalizedStaticDisplay = React.useCallback(
    (value: unknown) => {
      const rawValue = String(value ?? "").trim();
      const key = LOCALIZED_VALUE_KEYS[rawValue];
      return key ? t(`LicenseTransferForm.value.${key}`) : rawValue;
    },
    [currentLanguage, t],
  );

  const createOptions = React.useCallback(
    (translationKeys: readonly LicenseTransferOptionTranslationKey[]) =>
      translationKeys.map((translationKey) => {
        const value = translationKey.slice(translationKey.indexOf(".") + 1);
        return {
          value,
          label: t(`LicenseTransferForm.option.${translationKey}`),
        };
      }),
    [currentLanguage, t],
  );

  const emirateOptions = useMemo(
    () => createOptions(LICENSE_TRANSFER_OPTION_KEYS.emirate),
    [createOptions],
  );
  const licensingAuthorityOptions = useMemo(
    () => createOptions(LICENSE_TRANSFER_OPTION_KEYS.licensingAuthority),
    [createOptions],
  );
  const regionOptions = useMemo(
    () => createOptions(LICENSE_TRANSFER_OPTION_KEYS.region),
    [createOptions],
  );
  const areaOptions = useMemo(
    () => createOptions(LICENSE_TRANSFER_OPTION_KEYS.area),
    [createOptions],
  );
  const idTypeOptions = useMemo(
    () => createOptions(LICENSE_TRANSFER_OPTION_KEYS.idType),
    [createOptions],
  );

  // TODO: Fetch identityType from API
  // Replace the default value with API response
  const [identityType, setIdentityType] = useState<IdentityType>("entity");
  
  // Placeholder for API call - uncomment and implement when ready
  // useEffect(() => {
  //   fetchIdentityType().then((type) => setIdentityType(type));
  // }, []);

  const [isVerified, setIsVerified] = useState(current.verified || false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (!current.identityType && identityType) {
      handleFieldChange("identityType", identityType);
    }
  }, [identityType]);

  useEffect(() => {
    if (isVerified) return;

    if (identityType === "individual") {
      if (current.dateOfBirth && current.emiratesId) {
        performVerification();
      }
    } else {
      if (current.licenseExpiryDate && current.commercialLicenseNumber) {
        performVerification();
      }
    }
  }, [current.dateOfBirth, current.emiratesId, current.licenseExpiryDate, current.commercialLicenseNumber, identityType]);

  const handleFieldChange = (key: string, value: any) => {
    const newValue = {
      ...current,
      [key]: value,
    };
    field.setValue(newValue);
  };

  const handleFieldsChange = (patch: Record<string, any>) => {
    field.setValue({
      ...current,
      ...patch,
    });
  };

  const performVerification = () => {
    setVerificationError(null);

    if (identityType === "individual") {
      if (
        current.dateOfBirth === MOCK_INDIVIDUAL_DATA.dateOfBirth &&
        current.emiratesId === MOCK_INDIVIDUAL_DATA.emiratesId
      ) {
        setIsVerified(true);
        const newValue = {
          ...current,
          verified: true,
          fullNameArabic: MOCK_INDIVIDUAL_DATA.fullNameArabic,
          fullNameEnglish: MOCK_INDIVIDUAL_DATA.fullNameEnglish,
          nationality: MOCK_INDIVIDUAL_DATA.nationality,
          gender: MOCK_INDIVIDUAL_DATA.gender,
          expiryDate: MOCK_INDIVIDUAL_DATA.expiryDate,
        };
        field.setValue(newValue);
      } else {
        setVerificationError("LicenseTransferForm.validation.verificationMismatch");
      }
    } else {
      if (
        current.licenseExpiryDate === MOCK_ENTITY_DATA.licenseExpiryDate &&
        current.commercialLicenseNumber === MOCK_ENTITY_DATA.commercialLicenseNumber
      ) {
        setIsVerified(true);
        const newValue = {
          ...current,
          verified: true,
          establishmentNameArabic: MOCK_ENTITY_DATA.establishmentNameArabic,
          establishmentNameEnglish: MOCK_ENTITY_DATA.establishmentNameEnglish,
          emirate: MOCK_ENTITY_DATA.emirate,
          licensingAuthority: MOCK_ENTITY_DATA.licensingAuthority,
          phoneNumber: MOCK_ENTITY_DATA.phoneNumber,
          tenancyContractEndDate: MOCK_ENTITY_DATA.tenancyContractEndDate,
        };
        field.setValue(newValue);
      } else {
        setVerificationError("LicenseTransferForm.validation.verificationMismatch");
      }
    }
  };

  const renderLabel = (label: string, required: boolean = true) => (
    <div className="license-transfer-form-label">
      <span>
        {label}
        {required && <span className="license-transfer-form-required">*</span>}
      </span>
    </div>
  );

  const renderSelect = (
    name: string,
    label: string,
    options: OptionType[],
    required: boolean = true,
    readOnly: boolean = false,
    placeholder?: string
  ) => {
    return (
      <div className="license-transfer-form-field">
        {renderLabel(label, required)}
        <Select
          disabled={disabled || readOnly}
          placeholder={placeholder || t("LicenseTransferForm.placeholder.select", { label })}
          value={current[name]}
          onChange={(value) => handleFieldChange(name, value)}
          showSearch
          optionFilterProp="children"
          className={readOnly ? "license-transfer-form-readonly" : ""}
        >
          {options.map((o) => (
            <Option key={o.value} value={o.value}>
              {o.label}
            </Option>
          ))}
        </Select>
      </div>
    );
  };

  const renderTextInput = (
    name: string,
    label: string,
    required: boolean = true,
    readOnly: boolean = false,
    maxLength?: number,
    placeholder?: string
  ) => {
    return (
      <div className="license-transfer-form-field">
        {renderLabel(label, required)}
        <Input
          disabled={disabled || readOnly}
          placeholder={placeholder || label}
          value={current[name] || ""}
          maxLength={maxLength}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          className={readOnly ? "license-transfer-form-readonly" : ""}
        />
      </div>
    );
  };

  const renderTextDisplay = (
    name: string,
    label: string,
    required: boolean = true,
    displayValue?: string
  ) => {
    return (
      <div className="license-transfer-form-field">
        {renderLabel(label, required)}
        <Input
          disabled
          value={displayValue ?? current[name] ?? ""}
          className="license-transfer-form-readonly"
        />
      </div>
    );
  };

  const renderDatePicker = (
    name: string,
    label: string,
    required: boolean = true,
    readOnly: boolean = false,
    placeholder?: string
  ) => {
    return (
      <div className="license-transfer-form-field">
        {renderLabel(label, required)}
        <DatePicker
          disabled={disabled || readOnly}
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          placeholder={placeholder || t("LicenseTransferForm.placeholder.date")}
          value={toPickerMoment(current[name], "YYYY-MM-DD")}
          onChange={(date) => {
            handleFieldChange(name, date?.format("YYYY-MM-DD") || null);
          }}
          className={readOnly ? "license-transfer-form-readonly" : ""}
        />
      </div>
    );
  };

  const renderUpload = (
    name: string,
    label: string,
    required: boolean = true,
    accept: string = ".pdf",
    uploadTip: string = t("LicenseTransferForm.uploadTip.pdf")
  ) => {
    return (
      <div className="license-transfer-form-field">
        {renderLabel(label, required)}
        <DocumentViewer
          hasDelete={true}
          disabled={disabled}
          value={current[name]}
          onChange={(value) => handleFieldChange(name, value)}
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            uploadTip: uploadTip,
            accept: accept,
          }}
        />
      </div>
    );
  };

  const renderMobileNumber = (
    name: string,
    label: string,
    required: boolean = true,
    readOnly: boolean = false,
    placeholder?: string
  ) => {
    const countryCodeKey = `${name}CountryCode`;
    const localNumberKey = `${name}LocalNumber`;
    return (
      <div className="license-transfer-form-field">
        {renderLabel(label, required)}
        <CompositeMobileNumberField
          fieldNames={{
            fullNumber: name,
            countryCode: countryCodeKey,
            localNumber: localNumberKey,
          }}
          fullNumber={current[name]}
          countryCode={current[countryCodeKey]}
          localNumber={current[localNumberKey]}
          disabled={disabled || readOnly}
          required={required}
          placeholder={placeholder}
          onChange={(patch) => handleFieldsChange(patch)}
        />
      </div>
    );
  };

  const renderVerificationFields = () => {
    if (identityType === "individual") {
      return (
        <Row gutter={24}>
          <Col span={12}>
            {renderDatePicker(
              "dateOfBirth",
              t("LicenseTransferForm.label.dateOfBirth"),
              true,
              isVerified,
              t("LicenseTransferForm.placeholder.date")
            )}
          </Col>
          <Col span={12}>
            {renderTextInput(
              "emiratesId",
              t("LicenseTransferForm.label.emiratesId"),
              true,
              isVerified,
              undefined,
              "784-XXXX-XXXXXXX-X"
            )}
          </Col>
        </Row>
      );
    } else {
      return (
        <Row gutter={24}>
          <Col span={12}>
            {renderDatePicker(
              "licenseExpiryDate",
              t("LicenseTransferForm.label.licenseExpiryDate"),
              true,
              isVerified,
              t("LicenseTransferForm.placeholder.date")
            )}
          </Col>
          <Col span={12}>
            {renderTextInput(
              "commercialLicenseNumber",
              t("LicenseTransferForm.label.commercialLicenseNumber"),
              true,
              isVerified,
              50,
              t("LicenseTransferForm.placeholder.licenseNumber")
            )}
          </Col>
        </Row>
      );
    }
  };

  const renderIndividualExpandedForm = () => (
    <>
      <div className="license-transfer-form-section-title">
        {t("LicenseTransferForm.section.basicInformation")}
      </div>
      <Row gutter={24}>
        <Col span={12}>
          {renderTextDisplay("fullNameArabic", t("LicenseTransferForm.label.fullNameArabic"), true)}
        </Col>
        <Col span={12}>
          {renderTextDisplay("fullNameEnglish", t("LicenseTransferForm.label.fullNameEnglish"), true)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderTextDisplay(
            "nationality",
            t("LicenseTransferForm.label.nationality"),
            true,
            getLocalizedStaticDisplay(current.nationality),
          )}
        </Col>
        <Col span={12}>
          {renderTextDisplay(
            "gender",
            t("LicenseTransferForm.label.gender"),
            true,
            getLocalizedStaticDisplay(current.gender),
          )}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderTextInput("occupation", t("LicenseTransferForm.label.occupation"), false, false, 100)}
        </Col>
        <Col span={12}>
          {renderTextDisplay("expiryDate", t("LicenseTransferForm.label.expiryDate"), true)}
        </Col>
      </Row>

      <div className="license-transfer-form-section-title">
        {t("LicenseTransferForm.section.personalDocuments")}
      </div>
      <Row gutter={24}>
        <Col span={12}>
          {renderUpload(
            "personalPhoto",
            t("LicenseTransferForm.label.personalPhoto"),
            true,
            ".jpg,.jpeg,.png",
            t("LicenseTransferForm.uploadTip.image")
          )}
        </Col>
        <Col span={12}>
          {renderUpload("emiratesIdFile", t("LicenseTransferForm.label.emiratesId"), true)}
        </Col>
      </Row>

      <div className="license-transfer-form-section-title">
        {t("LicenseTransferForm.section.addressInformation")}
      </div>
      <Row gutter={24}>
        <Col span={12}>
          {renderSelect("addressEmirate", t("LicenseTransferForm.label.emirate"), emirateOptions, true)}
        </Col>
        <Col span={12}>
          {renderSelect("addressRegion", t("LicenseTransferForm.label.region"), regionOptions, true)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderSelect("addressArea", t("LicenseTransferForm.label.area"), areaOptions, true)}
        </Col>
        <Col span={12}>
          {renderTextInput("addressStreet", t("LicenseTransferForm.label.street"), true, false, 500)}
        </Col>
      </Row>
    </>
  );

  const renderEntityExpandedForm = () => (
    <>
      <div className="license-transfer-form-section-title">
        {t("LicenseTransferForm.section.basicInformation")}
      </div>
      <Row gutter={24}>
        <Col span={12}>
          {renderTextInput("establishmentNameArabic", t("LicenseTransferForm.label.establishmentNameArabic"), true, false, 200)}
        </Col>
        <Col span={12}>
          {renderTextInput("establishmentNameEnglish", t("LicenseTransferForm.label.establishmentNameEnglish"), false, false, 200)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderSelect("emirate", t("LicenseTransferForm.label.emirate"), emirateOptions, true)}
        </Col>
        <Col span={12}>
          {renderSelect("licensingAuthority", t("LicenseTransferForm.label.licensingAuthority"), licensingAuthorityOptions, true)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderMobileNumber("phoneNumber", t("LicenseTransferForm.label.phoneNumber"), true, false)}
        </Col>
        <Col span={12}>
          {renderDatePicker("tenancyContractEndDate", t("LicenseTransferForm.label.tenancyContractEndDate"), true)}
        </Col>
      </Row>

      <div className="license-transfer-form-section-title">
        {t("LicenseTransferForm.section.establishmentDocuments")}
      </div>
      <Row gutter={24}>
        <Col span={12}>
          {renderUpload("commercialLicenseFile", t("LicenseTransferForm.label.commercialLicenseFile"), true)}
        </Col>
        <Col span={12}>
          {renderUpload("tenancyContract", t("LicenseTransferForm.label.tenancyContract"), false)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderUpload("memorandumOfAssociation", t("LicenseTransferForm.label.memorandumOfAssociation"), false)}
        </Col>
        <Col span={12} />
      </Row>

      <div className="license-transfer-form-section-title">
        {t("LicenseTransferForm.section.legalPersonInformation")}
      </div>
      <Row gutter={24}>
        <Col span={12}>
          {renderTextInput("legalPerson", t("LicenseTransferForm.label.legalPerson"), true, false, 100)}
        </Col>
        <Col span={12}>
          {renderMobileNumber("legalPersonContact", t("LicenseTransferForm.label.legalPersonContact"), true, false)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderSelect("legalPersonIdType", t("LicenseTransferForm.label.idType"), idTypeOptions, true)}
        </Col>
        <Col span={12}>
          {renderTextInput("legalPersonEmiratesId", t("LicenseTransferForm.label.emiratesId"), true, false)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderDatePicker("legalPersonDateOfBirth", t("LicenseTransferForm.label.dateOfBirth"), true)}
        </Col>
        <Col span={12}>
          {renderTextInput("legalPersonEmail", t("LicenseTransferForm.label.email"), true, false)}
        </Col>
      </Row>

      <div className="license-transfer-form-section-title">
        {t("LicenseTransferForm.section.addressInformation")}
      </div>
      <Row gutter={24}>
        <Col span={12}>
          {renderSelect("addressEmirate", t("LicenseTransferForm.label.emirate"), emirateOptions, true)}
        </Col>
        <Col span={12}>
          {renderSelect("addressRegion", t("LicenseTransferForm.label.region"), regionOptions, true)}
        </Col>
      </Row>
      <Row gutter={24}>
        <Col span={12}>
          {renderSelect("addressArea", t("LicenseTransferForm.label.area"), areaOptions, true)}
        </Col>
        <Col span={12}>
          {renderTextInput("addressStreet", t("LicenseTransferForm.label.street"), true, false, 500)}
        </Col>
      </Row>
    </>
  );

  return (
    <div className="license-transfer-form-container" {...props}>
      <AntdCard
        className="license-transfer-form-card"
        title={t("LicenseTransferForm.title")}
      >
        <Alert
          message={localizedAlertMessage}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          className="license-transfer-form-alert"
        />

        {verificationError && (
          <Alert
            message={t(verificationError)}
            type="error"
            showIcon
            className="license-transfer-form-error"
          />
        )}

        {renderVerificationFields()}

        {isVerified && (
          <div className="license-transfer-form-expanded">
            {identityType === "individual"
              ? renderIndividualExpandedForm()
              : renderEntityExpandedForm()}
          </div>
        )}
      </AntdCard>
    </div>
  );
});

LicenseTransferFormField.displayName = "LicenseTransferFormField";

export default LicenseTransferFormField;
