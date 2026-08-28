import React, { useMemo } from "react";
import { Form, Input, Select, DatePicker } from "antd";
import { useTranslation } from "react-i18next";
import { selectDownIcon, suffixIcon, disabledDate } from "@/utils/date";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import {
  getArabicInputPlaceholderClassName,
  getArabicInputStyle,
} from "@/utils/inputDirection";
import {
  FULL_NAME_MAX_CHARS,
  OCCUPATION_MAX_CHARS,
  OCCUPATION_MIN_CHARS,
  buildArabicNameRestrictProps,
  buildEnglishNameRestrictProps,
  disabledDateAfterToday,
  truncateFieldValue,
  validateArabicFullName,
  validateEnglishFullName,
  VERIFICATION_METHOD,
} from "@/utils/individualIdentity";
import type { IndividualIdentityFormProps } from "./types";

const { Option } = Select;

type DemographicsSectionProps = Pick<
  IndividualIdentityFormProps,
  | "layout"
  | "verificationMethod"
  | "nationalityList"
  | "loadingNationalities"
  | "icpReadonlyFieldNames"
  | "isFieldDisabled"
  | "isAr"
  | "emiratesIdExpiryDisabledDate"
  | "passportExpiryDisabledDate"
  | "visaExpiryDisabledDate"
> & {
  flat?: boolean;
};

const DemographicsSection: React.FC<DemographicsSectionProps> = ({
  layout,
  verificationMethod,
  nationalityList,
  loadingNationalities,
  icpReadonlyFieldNames,
  isFieldDisabled,
  isAr = false,
  emiratesIdExpiryDisabledDate,
  passportExpiryDisabledDate,
  visaExpiryDisabledDate,
  flat = false,
}) => {
  const { t } = useTranslation();
  const isModal = layout === "modal";
  const colClass = isModal ? "individual-identity-form-col" : "form-item";

  const wrapRow = (children: React.ReactNode) => {
    if (flat || !isModal) {
      return <>{children}</>;
    }
    return <div className="individual-identity-form-row">{children}</div>;
  };

  const icpReadonly = (field: string) => icpReadonlyFieldNames.includes(field);

  const occupationFieldRules = useMemo(
    () => [
      {
        required: true,
        message: t("individualIdentity.validation.occupationRequired"),
      },
      {
        validator: (_: unknown, value: unknown) => {
          if (value === undefined || value === null || value === "") {
            return Promise.resolve();
          }
          const len = String(value).length;
          if (len < OCCUPATION_MIN_CHARS) {
            return Promise.reject(
              new Error(t("individualIdentity.validation.occupationTooShort")),
            );
          }
          if (len > OCCUPATION_MAX_CHARS) {
            return Promise.reject(
              new Error(
                t("individualIdentity.validation.occupationTooLong", {
                  max: OCCUPATION_MAX_CHARS,
                }),
              ),
            );
          }
          return Promise.resolve();
        },
      },
    ],
    [t],
  );

  const renderExpiryAndOccupation = () => {
    if (verificationMethod === VERIFICATION_METHOD.EMIRATES_ID) {
      return wrapRow(
        <>
          <Form.Item
            name="emiratesIdExpiryDate"
            label={t("individualIdentity.fields.emiratesIdExpiryDate")}
            rules={[
              {
                required: true,
                message: t("individualIdentity.validation.emiratesExpiryRequired"),
              },
            ]}
            className={colClass}
          >
            <DatePicker
              format="DD/MM/YYYY"
              placeholder={t("formPlaceholders.common.ddmmyyyy")}
              style={{ width: "100%" }}
              suffixIcon={suffixIcon}
              disabled={isFieldDisabled("emiratesIdExpiryDate") || icpReadonly("emiratesIdExpiryDate")}
              disabledDate={emiratesIdExpiryDisabledDate ?? disabledDate}
            />
          </Form.Item>
          <Form.Item
            name="occupation"
            label={t("individualIdentity.fields.occupation")}
            normalize={truncateFieldValue(OCCUPATION_MAX_CHARS)}
            rules={occupationFieldRules}
            className={colClass}
          >
            <Input
              maxLength={OCCUPATION_MAX_CHARS}
              placeholder={t("formPlaceholders.components.individualIdentityForm.enterOccupation")}
              disabled={isFieldDisabled("occupation") || icpReadonly("occupation")}
            />
          </Form.Item>
        </>,
      );
    }

    if (verificationMethod === VERIFICATION_METHOD.UID) {
      return (
        <>
          {wrapRow(
            <>
              <Form.Item
                name="passportExpiryDate"
                label={t("individualIdentity.fields.passportExpiryDate")}
                rules={[
                  {
                    required: true,
                    message: t("individualIdentity.validation.passportExpiryRequired"),
                  },
                ]}
                className={colClass}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder={t("formPlaceholders.common.ddmmyyyy")}
                  style={{ width: "100%" }}
                  suffixIcon={suffixIcon}
                  disabled={isFieldDisabled("passportExpiryDate") || icpReadonly("passportExpiryDate")}
                  disabledDate={passportExpiryDisabledDate ?? disabledDateAfterToday}
                />
              </Form.Item>
              <Form.Item
                name="visaExpiryDate"
                label={t("individualIdentity.fields.visaExpiryDate")}
                rules={[
                  {
                    required: true,
                    message: t("individualIdentity.validation.visaExpiryRequired"),
                  },
                ]}
                className={colClass}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder={t("formPlaceholders.common.ddmmyyyy")}
                  style={{ width: "100%" }}
                  suffixIcon={suffixIcon}
                  disabled={isFieldDisabled("visaExpiryDate") || icpReadonly("visaExpiryDate")}
                  disabledDate={visaExpiryDisabledDate ?? disabledDate}
                />
              </Form.Item>
            </>,
          )}
          {wrapRow(
            <Form.Item
              name="occupation"
              label={t("individualIdentity.fields.occupation")}
              normalize={truncateFieldValue(OCCUPATION_MAX_CHARS)}
              rules={occupationFieldRules}
              className={colClass}
            >
              <Input
                maxLength={OCCUPATION_MAX_CHARS}
                placeholder={t("formPlaceholders.components.individualIdentityForm.enterOccupation")}
                disabled={isFieldDisabled("occupation") || icpReadonly("occupation")}
              />
            </Form.Item>,
          )}
        </>
      );
    }

    return wrapRow(
      <>
        <Form.Item
          name="passportExpiryDate"
          label={t("individualIdentity.fields.passportExpiryDate")}
          rules={[
            {
              required: true,
              message: t("individualIdentity.validation.passportExpiryRequired"),
            },
          ]}
          className={colClass}
        >
          <DatePicker
            format="DD/MM/YYYY"
            placeholder={t("formPlaceholders.common.ddmmyyyy")}
            style={{ width: "100%" }}
            suffixIcon={suffixIcon}
            disabled={isFieldDisabled("passportExpiryDate") || icpReadonly("passportExpiryDate")}
            disabledDate={passportExpiryDisabledDate ?? disabledDateAfterToday}
          />
        </Form.Item>
        <Form.Item
          name="occupation"
          label={t("individualIdentity.fields.occupation")}
          normalize={truncateFieldValue(OCCUPATION_MAX_CHARS)}
          rules={occupationFieldRules}
          className={colClass}
        >
          <Input
            maxLength={OCCUPATION_MAX_CHARS}
            placeholder={t("formPlaceholders.components.individualIdentityForm.enterOccupation")}
            disabled={isFieldDisabled("occupation") || icpReadonly("occupation")}
          />
        </Form.Item>
      </>,
    );
  };

  const fullNameArabicRules = useMemo(
    () => [
      {
        validator: (_: unknown, value: unknown) => {
          const message = validateArabicFullName(value);
          return message ? Promise.reject(new Error(message)) : Promise.resolve();
        },
      },
    ],
    [],
  );

  const fullNameEnglishRules = useMemo(
    () => [
      {
        validator: (_: unknown, value: unknown) => {
          const message = validateEnglishFullName(value);
          return message ? Promise.reject(new Error(message)) : Promise.resolve();
        },
      },
    ],
    [],
  );

  const form = Form.useFormInstance();
  const arabicRestrictProps = useMemo(
    () => buildArabicNameRestrictProps(form, "fullNameAr"),
    [form],
  );
  const englishRestrictProps = useMemo(
    () => buildEnglishNameRestrictProps(form, "fullNameEn"),
    [form],
  );

  return (
    <>
      {wrapRow(
        <>
          <Form.Item
            name="fullNameAr"
            label={t("individualIdentity.fields.fullNameArabic")}
            required
            rules={fullNameArabicRules}
            className={colClass}
          >
            <Input
              className={`arabic-input ${getArabicInputPlaceholderClassName(isAr)}`}
              style={getArabicInputStyle()}
              placeholder={t("formPlaceholders.components.individualIdentityForm.enterFullNameArabic")}
              maxLength={FULL_NAME_MAX_CHARS}
              disabled={isFieldDisabled("fullNameAr") || icpReadonly("fullNameAr")}
              {...arabicRestrictProps}
            />
          </Form.Item>
          <Form.Item
            name="fullNameEn"
            label={t("individualIdentity.fields.fullNameEnglish")}
            required
            rules={fullNameEnglishRules}
            className={colClass}
          >
            <Input
              maxLength={FULL_NAME_MAX_CHARS}
              placeholder={t("formPlaceholders.components.individualIdentityForm.enterFullNameEnglish")}
              disabled={isFieldDisabled("fullNameEn") || icpReadonly("fullNameEn")}
              {...englishRestrictProps}
            />
          </Form.Item>
        </>,
      )}

      {wrapRow(
        <>
          <Form.Item
            name="nationalityId"
            label={t("individualIdentity.fields.nationality")}
            rules={[
              {
                required: true,
                message: t("individualIdentity.validation.nationalityRequired"),
              },
            ]}
            className={colClass}
          >
            <Select
              placeholder={t("formPlaceholders.components.individualIdentityForm.selectNationality")}
              disabled={isFieldDisabled("nationalityId") || icpReadonly("nationalityId")}
              loading={loadingNationalities}
              showSearch
              suffixIcon={selectDownIcon}
              filterOption={(input, option) => {
                const n = nationalityList.find((x) => String(x.id) === String(option?.value));
                if (!n) return false;
                const haystack = `${n.nameEn ?? ""} ${n.nameAr ?? ""}`.toLowerCase().trim();
                return haystack.includes(input.toLowerCase());
              }}
            >
              {nationalityList.map((nationality) => (
                <Option key={nationality.id} value={nationality.id}>
                  {preferLocalizedEnAr(isAr, nationality.nameEn, nationality.nameAr)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="gender"
            label={t("individualIdentity.fields.gender")}
            rules={[
              {
                required: true,
                message: t("individualIdentity.validation.genderRequired"),
              },
            ]}
            className={colClass}
          >
            <Select
              placeholder={t("formPlaceholders.components.individualIdentityForm.selectGender")}
              suffixIcon={selectDownIcon}
              disabled={isFieldDisabled("gender") || icpReadonly("gender")}
            >
              <Option value={1}>{t("individualIdentity.gender.male")}</Option>
              <Option value={2}>{t("individualIdentity.gender.female")}</Option>
            </Select>
          </Form.Item>
        </>,
      )}

      {renderExpiryAndOccupation()}
    </>
  );
};

export default DemographicsSection;
