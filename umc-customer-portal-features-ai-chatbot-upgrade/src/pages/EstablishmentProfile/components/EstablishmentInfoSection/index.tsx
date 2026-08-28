import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Select, DatePicker } from "antd";
import type { FormInstance } from "antd";
import { useTranslation } from "react-i18next";
import { HoverTooltip } from "@/components/common";
import {
  createMobileNumberFormRule,
  DEFAULT_COUNTRY_DIAL_CODE,
  FormMobileNumberInput,
} from "@/components/common/MobileNumberInput";
import { suffixIcon } from "@/utils/date";
import {
  getArabicInputPlaceholderClassName,
  getArabicInputStyle,
} from "@/utils/inputDirection";
import type { EmirateItem, TypeDictionary } from "@/services/userProfile";
import type { LocalizedNameSource } from "../../utils/formHelpers";
import type { EstablishmentFormValues } from "../../utils/formHelpers";
import { disableTodayAndPastDate } from "../../utils/formHelpers";
import { isGovernmentEntitySubType } from "../../utils/subTypeHelpers";
import {
  COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH,
  ESTABLISHMENT_NAME_MAX_LENGTH,
  governmentEmailPattern,
  isValidCommercialLicenseNumber,
} from "../../utils/constants";
import type { EstablishmentPageMode } from "../../utils/constants";
import { truncateFieldValue } from "../../utils/formHelpers";

const { Option } = Select;

const ESTABLISHMENT_PHONE_FIELD_NAMES = {
  countryCode: "phoneCountryCode",
  phoneNumber: "phoneLocalNumber",
} as const;

interface EstablishmentInfoSectionProps {
  form: FormInstance<EstablishmentFormValues>;
  mode: string | null;
  pageMode?: EstablishmentPageMode;
  isCommercialGroup: boolean;
  isGovernmentGroup: boolean;
  showFullCommercialForm: boolean;
  establishmentSubType: number;
  establishmentSubTypeList: TypeDictionary[];
  loadingSubTypes: boolean;
  emirateList: EmirateItem[];
  authorityList: TypeDictionary[];
  loadingAuthorities: boolean;
  emailList: { label: string; value: string }[];
  isAr: boolean;
  canEditField: (fieldName: string) => boolean;
  handleSubTypeChange: (value: number) => void;
  handleLicenseFieldsChange: () => void;
  displayName: (item: LocalizedNameSource | undefined) => string;
  setEditEmailModalVisible: (visible: boolean) => void;
}

const EstablishmentInfoSection: React.FC<EstablishmentInfoSectionProps> = ({
  form,
  mode,
  isCommercialGroup,
  isGovernmentGroup,
  showFullCommercialForm,
  establishmentSubType,
  establishmentSubTypeList,
  loadingSubTypes,
  emirateList,
  authorityList,
  loadingAuthorities,
  emailList,
  isAr,
  canEditField,
  handleSubTypeChange,
  handleLicenseFieldsChange,
  displayName,
  setEditEmailModalVisible,
}) => {
  const { t } = useTranslation();
  const [workEmailDropdownOpen, setWorkEmailDropdownOpen] = useState(false);
  const openEmailModalTimerRef = useRef<number | null>(null);
  const commercialLicenseFormatMessage = t(
    "establishmentProfile.validation.commercialLicenseNumberPrefix",
  );

  useEffect(() => {
    return () => {
      if (openEmailModalTimerRef.current !== null) {
        window.clearTimeout(openEmailModalTimerRef.current);
        openEmailModalTimerRef.current = null;
      }
    };
  }, []);

  const handleAddNewEmailClick = () => {
    if (!canEditField("workEmail")) {
      return;
    }
    if (openEmailModalTimerRef.current !== null) {
      window.clearTimeout(openEmailModalTimerRef.current);
      openEmailModalTimerRef.current = null;
    }
    setWorkEmailDropdownOpen(false);
    openEmailModalTimerRef.current = window.setTimeout(() => {
      setEditEmailModalVisible(true);
      openEmailModalTimerRef.current = null;
    }, 200);
  };

  const workEmailSelect = (isRequired: boolean) => (
    <Form.Item
      name="workEmail"
      label={
        <span>
          {t("establishmentProfile.fields.workEmail")}
          <HoverTooltip content={t("establishmentProfile.messages.autoFillHint")} />
        </span>
      }
      rules={[
        {
          required: isRequired,
          type: "email",
          message: t("establishmentProfile.validation.validEmail"),
        },
        ...(isRequired
          ? [
              {
                validator: (_: any, value: string) => {
                  if (!value) return Promise.resolve();
                  const email = String(value).trim();
                  if (
                    !isGovernmentEntitySubType(
                      establishmentSubType,
                      establishmentSubTypeList,
                    ) ||
                    governmentEmailPattern.test(email)
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      t("establishmentProfile.validation.governmentEmailDomain"),
                    ),
                  );
                },
              },
            ]
          : []),
      ]}
      className="form-item"
    >
      <Select
        placeholder={t("formPlaceholders.common.enterEmail")}
        disabled={!canEditField("workEmail")}
        showSearch
        optionFilterProp="label"
        open={workEmailDropdownOpen}
        onDropdownVisibleChange={setWorkEmailDropdownOpen}
        dropdownRender={(menu) => (
          <>
            {menu}
            {canEditField("workEmail") && (
              <div
                className="addEmailBtn"
                onClick={handleAddNewEmailClick}
              >
                {t("establishmentProfile.actions.addNew")}
              </div>
            )}
          </>
        )}
        options={emailList}
      />
    </Form.Item>
  );

  const emirateSelect = () => (
    <Form.Item
      name="emirate"
      label={t("establishmentProfile.fields.emirate")}
      rules={[
        {
          required: true,
          message: t("establishmentProfile.validation.selectEmirate"),
        },
      ]}
      className="form-item"
    >
      <Select
        placeholder={t("formPlaceholders.common.selectEmirate")}
        disabled={!canEditField("emirate")}
        showSearch
        optionFilterProp="children"
      >
        {emirateList.map((emirate) => (
          <Option key={emirate.id} value={emirate.id}>
            {displayName(emirate)}
          </Option>
        ))}
      </Select>
    </Form.Item>
  );

  const establishmentMobileField = () => (
    <Form.Item
      name="establishmentMobile"
      label={t("establishmentProfile.fields.phoneNumber")}
      required
      rules={[
        createMobileNumberFormRule({
          required: true,
          fieldNames: ESTABLISHMENT_PHONE_FIELD_NAMES,
        }),
      ]}
      validateTrigger={["onChange", "onBlur"]}
      className="form-item"
    >
      <FormMobileNumberInput
        fieldNames={ESTABLISHMENT_PHONE_FIELD_NAMES}
        defaultCountryCode={
          mode === "add" ? DEFAULT_COUNTRY_DIAL_CODE : ""
        }
        placeholder={t("formPlaceholders.common.enterPhoneNumber")}
        searchPlaceholder={t("formPlaceholders.common.search")}
        emptyText={t("multiSelectDropdown.noResults")}
        disabled={!canEditField("establishmentMobile")}
      />
    </Form.Item>
  );

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2 className="section-title">
          {t("establishmentProfile.sections.establishmentInformation")}
        </h2>
      </div>

      <div className="form-grid">
        <Form.Item
          name="establishmentSubType"
          label={t("establishmentProfile.fields.establishmentSubTypes")}
          rules={[
            {
              required: true,
              message: t(
                "establishmentProfile.validation.selectEstablishmentSubTypes",
              ),
            },
          ]}
          className="form-item-first"
        >
          <Select
            value={establishmentSubType}
            onChange={handleSubTypeChange}
            placeholder={t("formPlaceholders.common.selectSubType")}
            loading={loadingSubTypes}
            disabled={!canEditField("establishmentSubType")}
            showSearch
            optionFilterProp="children"
          >
            {establishmentSubTypeList.map((type) => (
              <Option key={type.id} value={type.id}>
                {displayName(type)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {isCommercialGroup && (
          <>
            {workEmailSelect(false)}

            <Form.Item
              name="licenseNumber"
              label={t("establishmentProfile.fields.commercialLicenseNumber")}
              dependencies={["emirate"]}
              normalize={truncateFieldValue(COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH)}
              rules={[
                {
                  required: true,
                  message: t("establishmentProfile.validation.required"),
                },
                {
                  validator: async (_, value) => {
                    const normalizedValue = String(value ?? "").trim();
                    if (!normalizedValue) return;

                    const emirateId = form.getFieldValue("emirate");
                    if (
                      isValidCommercialLicenseNumber({
                        licenseNumber: normalizedValue,
                        emirateId,
                        emirateList,
                      })
                    ) {
                      return;
                    }

                    throw new Error(commercialLicenseFormatMessage);
                  },
                },
                {
                  max: COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH,
                  message: t("establishmentProfile.validation.maxCharacters", {
                    max: COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH,
                  }),
                },
              ]}
              className="form-item"
            >
              <Input
                placeholder={t(
                  "formPlaceholders.pages.establishmentProfile.info.enterLicenseNumber",
                )}
                maxLength={COMMERCIAL_LICENSE_NUMBER_MAX_LENGTH}
                onBlur={handleLicenseFieldsChange}
                disabled={!canEditField("licenseNumber")}
              />
            </Form.Item>

            <Form.Item
              name="licenseExpiryDate"
              label={t("establishmentProfile.fields.licenseExpiryDate")}
              rules={[
                {
                  required: true,
                  message: t("establishmentProfile.validation.selectExpiryDate"),
                },
              ]}
              className="form-item"
            >
              <DatePicker
                disabledDate={disableTodayAndPastDate}
                format="DD/MM/YYYY"
                placeholder={t(
                  "formPlaceholders.pages.establishmentProfile.info.selectLicenseExpiryDate",
                )}
                style={{ width: "100%" }}
                suffixIcon={suffixIcon}
                disabled={!canEditField("licenseExpiryDate")}
              />
            </Form.Item>

            {(mode !== "add" || showFullCommercialForm) && (
              <>
                <Form.Item
                  name="establishmentNameArabic"
                  label={t(
                    "establishmentProfile.fields.establishmentNameArabic",
                  )}
                  normalize={truncateFieldValue(ESTABLISHMENT_NAME_MAX_LENGTH)}
                  rules={[
                    {
                      required: true,
                      message: t(
                        "establishmentProfile.validation.enterNameArabic",
                      ),
                    },
                    {
                      max: ESTABLISHMENT_NAME_MAX_LENGTH,
                      message: t(
                        "establishmentProfile.validation.maxCharacters",
                        { max: ESTABLISHMENT_NAME_MAX_LENGTH },
                      ),
                    },
                  ]}
                  className="form-item"
                >
                  <Input
                    className={`arabic-input ${getArabicInputPlaceholderClassName(isAr)}`}
                    style={getArabicInputStyle()}
                    placeholder={t(
                      "formPlaceholders.pages.establishmentProfile.enterNameArabic",
                    )}
                    maxLength={ESTABLISHMENT_NAME_MAX_LENGTH}
                    disabled={!canEditField("establishmentNameArabic")}
                  />
                </Form.Item>

                <Form.Item
                  name="establishmentNameEnglish"
                  label={t(
                    "establishmentProfile.fields.establishmentNameEnglish",
                  )}
                  normalize={truncateFieldValue(ESTABLISHMENT_NAME_MAX_LENGTH)}
                  rules={[
                    {
                      required: true,
                      message: t(
                        "establishmentProfile.validation.enterNameEnglish",
                      ),
                    },
                    {
                      max: ESTABLISHMENT_NAME_MAX_LENGTH,
                      message: t(
                        "establishmentProfile.validation.maxCharacters",
                        { max: ESTABLISHMENT_NAME_MAX_LENGTH },
                      ),
                    },
                  ]}
                  className="form-item"
                >
                  <Input
                    placeholder={t(
                      "formPlaceholders.pages.establishmentProfile.enterNameEnglish",
                    )}
                    maxLength={ESTABLISHMENT_NAME_MAX_LENGTH}
                    disabled={!canEditField("establishmentNameEnglish")}
                  />
                </Form.Item>

                {emirateSelect()}

                <Form.Item
                  name="licensingAuthority"
                  label={t("establishmentProfile.fields.licensingAuthority")}
                  rules={[
                    {
                      required: true,
                      message: t(
                        "establishmentProfile.validation.selectAuthority",
                      ),
                    },
                  ]}
                  className="form-item"
                >
                  <Select
                    placeholder={t("formPlaceholders.common.selectAuthority")}
                    loading={loadingAuthorities}
                    disabled={!canEditField("licensingAuthority")}
                    showSearch
                    optionFilterProp="children"
                  >
                    {authorityList.map((authority) => (
                      <Option key={authority.id} value={authority.id}>
                        {displayName(authority)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {establishmentMobileField()}

                <Form.Item
                  name="tenancyContractEndDate"
                  label={t("establishmentProfile.fields.tenancyContractEndDate")}
                  className="form-item"
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    placeholder={t(
                      "formPlaceholders.pages.establishmentProfile.info.selectTenancyContractEndDate",
                    )}
                    suffixIcon={suffixIcon}
                    style={{ width: "100%" }}
                    disabledDate={disableTodayAndPastDate}
                    disabled={!canEditField("tenancyContractEndDate")}
                  />
                </Form.Item>
              </>
            )}
          </>
        )}

        {isGovernmentGroup && (
          <>
            {workEmailSelect(true)}

            <Form.Item
              name="establishmentNameArabic"
              label={t(
                "establishmentProfile.fields.entityEstablishmentNameArabic",
              )}
              normalize={truncateFieldValue(ESTABLISHMENT_NAME_MAX_LENGTH)}
              rules={[
                {
                  required: true,
                  message: t(
                    "establishmentProfile.validation.enterEntityEstablishmentNameArabic",
                  ),
                },
                {
                  max: ESTABLISHMENT_NAME_MAX_LENGTH,
                  message: t(
                    "establishmentProfile.validation.maxCharacters",
                    { max: ESTABLISHMENT_NAME_MAX_LENGTH },
                  ),
                },
              ]}
              className="form-item"
            >
              <Input
                className={`arabic-input ${getArabicInputPlaceholderClassName(isAr)}`}
                style={getArabicInputStyle()}
                placeholder={t(
                  "formPlaceholders.pages.establishmentProfile.info.enterEntityEstablishmentNameArabic",
                )}
                maxLength={ESTABLISHMENT_NAME_MAX_LENGTH}
                disabled={!canEditField("establishmentNameArabic")}
              />
            </Form.Item>

            <Form.Item
              name="establishmentNameEnglish"
              label={t(
                "establishmentProfile.fields.entityEstablishmentNameEnglish",
              )}
              normalize={truncateFieldValue(ESTABLISHMENT_NAME_MAX_LENGTH)}
              rules={[
                {
                  required: true,
                  message: t(
                    "establishmentProfile.validation.enterEntityEstablishmentNameEnglish",
                  ),
                },
                {
                  max: ESTABLISHMENT_NAME_MAX_LENGTH,
                  message: t(
                    "establishmentProfile.validation.maxCharacters",
                    { max: ESTABLISHMENT_NAME_MAX_LENGTH },
                  ),
                },
              ]}
              className="form-item"
            >
              <Input
                placeholder={t(
                  "formPlaceholders.pages.establishmentProfile.info.enterEntityEstablishmentNameEnglish",
                )}
                maxLength={ESTABLISHMENT_NAME_MAX_LENGTH}
                disabled={!canEditField("establishmentNameEnglish")}
              />
            </Form.Item>

            {emirateSelect()}

            {establishmentMobileField()}
          </>
        )}
      </div>
    </div>
  );
};

export default EstablishmentInfoSection;
