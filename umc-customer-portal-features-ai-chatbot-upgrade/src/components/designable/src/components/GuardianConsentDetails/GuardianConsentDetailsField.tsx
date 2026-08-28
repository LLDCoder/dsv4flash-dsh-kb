import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, observer, useField } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Card as AntdCard, Col, DatePicker, Input, Row, Select } from "antd";
import type { RcFile } from "antd/lib/upload";
import moment, { type Moment } from "moment";
import DocumentViewer from "@/components/common/DocumentViewer";
import CustomMessage from "@/components/common/CustomMessage";
import { useServicesStore } from "@/store/services";
import { useUserStore } from "@/store/user";
import {
  getUserIndividual,
  getNationalityList,
  type NationalityInfo,
} from "@/services/userProfile";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { CompositeMobileNumberField } from "../MobileNumberInput";
import "./styles.less";

const { Option } = Select;

const MAX_NAME_LEN = 100;
const MAX_OCCUPATION_LEN = 50;
const MAX_EMAIL_LEN = 100;
const PASSPORT_MIN_LEN = 6;
const PASSPORT_MAX_LEN = 12;
const ELIGIBLE_MIN_AGE = 15;
const ELIGIBLE_MAX_AGE = 18;

export type GuardianConsentDetailsValue = {
  consentFile?: string;
  fullName?: string;
  passportNumber?: string;
  nationalityId?: number;
  guardianDateOfBirth?: string;
  gender?: "Male" | "Female";
  occupation?: string;
  email?: string;
  phoneNumber?: string;
  phoneNumberCountryCode?: string;
  phoneNumberLocalNumber?: string;
};

type GuardianConsentDetailsFieldProps = {
  className?: string;
  disabled?: boolean;
  designMode?: boolean;
  disableAutoVisibility?: boolean;
};

type FormilyFeedback = {
  type: string;
  messages: string[];
};

type ResettableField = {
  setFeedback?: (feedback: FormilyFeedback) => void;
  setValidator?: (validator: (value: unknown) => string) => void;
  setValue?: (value: unknown) => void;
  setState?: (updater: (state: Record<string, unknown>) => void) => void;
};

const GUARDIAN_SUB_FIELD_NAMES: Array<keyof GuardianConsentDetailsValue> = [
  "consentFile",
  "fullName",
  "passportNumber",
  "nationalityId",
  "guardianDateOfBirth",
  "gender",
  "occupation",
  "email",
  "phoneNumber",
  "phoneNumberCountryCode",
  "phoneNumberLocalNumber",
];

const unwrapNationalities = (res: unknown): NationalityInfo[] => {
  if (Array.isArray(res)) return res as NationalityInfo[];
  if (res && typeof res === "object" && "data" in res) {
    const data = (res as { data?: unknown }).data;
    if (Array.isArray(data)) return data as NationalityInfo[];
  }
  return [];
};

const parseDateValue = (value: unknown): Moment | null => {
  if (!value) return null;
  if (moment.isMoment(value)) return value.clone();
  if (value instanceof Date) return moment(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const strictFormats = [
      "YYYY-MM-DD",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "DD/MM/YYYY",
    ];
    for (const format of strictFormats) {
      const parsed = moment(trimmed, format, true);
      if (parsed.isValid()) return parsed;
    }
    const loose = moment(trimmed);
    return loose.isValid() ? loose : null;
  }
  return null;
};

const computeAge = (value: unknown): number | null => {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  return moment().diff(parsed, "years", true);
};

const isEligibleByDob = (value: unknown): boolean => {
  const age = computeAge(value);
  return age != null && age >= ELIGIBLE_MIN_AGE && age < ELIGIBLE_MAX_AGE;
};
 
// Find the nested DateOfBirth value used to update service 8008 guardian visibility.
const findDateOfBirth = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return undefined;
  if ("DateOfBirth" in value) {
    return (value as Record<string, unknown>).DateOfBirth;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const dateOfBirth = findDateOfBirth(child);
    if (dateOfBirth !== undefined) return dateOfBirth;
  }
  return undefined;
};

const sanitizeAlphaNumeric = (value: string, maxLength: number) =>
  value.replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLength);

const sanitizeAlphaNumericWithSpaces = (value: string, maxLength: number) =>
  value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, maxLength);

const hasAnyGuardianValue = (value: GuardianConsentDetailsValue | undefined) => {
  if (!value) return false;
  return [
    value.consentFile,
    value.fullName,
    value.passportNumber,
    value.nationalityId,
    value.guardianDateOfBirth,
    value.gender,
    value.occupation,
    value.email,
    value.phoneNumber,
    value.phoneNumberCountryCode,
    value.phoneNumberLocalNumber,
  ].some((item) => {
    if (typeof item === "number") return true;
    return String(item ?? "").trim() !== "";
  });
};

const validateRequired = (value: unknown, requiredMessage: string): string =>
  String(value ?? "").trim() ? "" : requiredMessage;

const validateFullName = (
  value: unknown,
  messages: { required: string; max: string },
): string => {
  const text = String(value ?? "").trim();
  if (!text) return messages.required;
  if (text.length > MAX_NAME_LEN) {
    return messages.max;
  }
  return "";
};

const validatePassportNumber = (
  value: unknown,
  messages: { required: string; invalid: string },
): string => {
  const passportNumber = String(value ?? "").trim();
  if (!passportNumber) return messages.required;
  if (
    !new RegExp(
      `^[A-Za-z0-9]{${PASSPORT_MIN_LEN},${PASSPORT_MAX_LEN}}$`
    ).test(passportNumber)
  ) {
    return messages.invalid;
  }
  return "";
};

const validateNationality = (value: unknown, requiredMessage: string): string =>
  value == null || Number.isNaN(Number(value)) ? requiredMessage : "";

const validateGuardianDateOfBirth = (
  value: unknown,
  messages: { required: string; invalidDate: string; minAge: string },
): string => {
  if (!value) return messages.required;
  const guardianDob = parseDateValue(value);
  if (!guardianDob) return messages.invalidDate;
  if ((computeAge(value) ?? 0) < 18) {
    return messages.minAge;
  }
  return "";
};

const validateOccupation = (
  value: unknown,
  messages: { max: string; invalid: string },
): string => {
  const occupation = String(value ?? "").trim();
  if (!occupation) return "";
  if (occupation.length > MAX_OCCUPATION_LEN) {
    return messages.max;
  }
  if (!/^[A-Za-z0-9 ]+$/.test(occupation)) {
    return messages.invalid;
  }
  return "";
};

const validateEmail = (
  value: unknown,
  messages: { required: string; max: string; invalid: string },
): string => {
  const email = String(value ?? "").trim();
  if (!email) return messages.required;
  if (email.length > MAX_EMAIL_LEN) {
    return messages.max;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return messages.invalid;
  }
  return "";
};

export const GuardianConsentDetailsField: React.FC<GuardianConsentDetailsFieldProps> =
  observer((props) => {
    const { t, i18n } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- align with other designable composite fields
    const field = useField<any>();
    const disabled = !!props.disabled;
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const raw = (field.value || {}) as GuardianConsentDetailsValue;

    const current: GuardianConsentDetailsValue = {
      consentFile: raw.consentFile,
      fullName: raw.fullName ?? "",
      passportNumber: raw.passportNumber ?? "",
      nationalityId: raw.nationalityId,
      guardianDateOfBirth: raw.guardianDateOfBirth,
      gender: raw.gender,
      occupation: raw.occupation ?? "",
      email: raw.email ?? "",
      phoneNumber: raw.phoneNumber ?? "",
      phoneNumberCountryCode: raw.phoneNumberCountryCode ?? "",
      phoneNumberLocalNumber: raw.phoneNumberLocalNumber ?? "",
    };

    const bypassInternalVisibility =
      !!props.designMode || !!props.disableAutoVisibility;
    const serviceCode = String(
      useServicesStore((state) => state.userInfo.servicesCode ?? "")
    ).trim();
    const useFormDateOfBirthForVisibility = serviceCode === "8008";
    const formDateOfBirth = findDateOfBirth(field.form.values);
    const [nationalities, setNationalities] = useState<NationalityInfo[]>([]);
    const [nationalityLoading, setNationalityLoading] = useState(false);
    const [profileResolved, setProfileResolved] =
      useState(bypassInternalVisibility);
    const [shouldShowGuardianByProfile, setShouldShowGuardianByProfile] =
      useState(bypassInternalVisibility);
    const profileUserId = useUserStore.getState().userInfo.id;
    const requiredMessage = t("GuardianConsentDetails.validation.required");

    const shouldShowGuardian = bypassInternalVisibility
      ? true
      : profileResolved && shouldShowGuardianByProfile;
    // Hide the outer Formily decorator as well to prevent an empty FormItem from reserving layout space.
    useEffect(() => {
      const decoratorProps = field.decoratorProps ?? {};
      const decoratorStyle = decoratorProps.style ?? {};
      const display = shouldShowGuardian ? undefined : "none";

      if (decoratorStyle.display === display) return;

      field.setDecoratorProps({
        ...decoratorProps,
        style: {
          ...decoratorStyle,
          display,
        },
      });
    }, [field, shouldShowGuardian]);
    const resetFieldState = React.useCallback((path: string) => {
      const targetField = field.query(path).take() as ResettableField | undefined;
      if (!targetField) return;

      targetField.setFeedback?.({
        type: "error",
        messages: [],
      });
      targetField.setValidator?.(() => "");
      targetField.setValue?.(undefined);
      targetField.setState?.((state) => {
        state.selfErrors = [];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.selfValidating = false;
        state.validating = false;
      });
    }, [field]);

    const clearGuardianValidationState = React.useCallback(() => {
      resetFieldState(field.address);
      GUARDIAN_SUB_FIELD_NAMES.forEach((fieldName) => {
        resetFieldState(`${field.address}.${fieldName}`);
      });
    }, [field.address, resetFieldState]);

    useEffect(() => {
      let cancelled = false;
      setNationalityLoading(true);
      getNationalityList()
        .then((res) => {
          if (!cancelled) {
            setNationalities(unwrapNationalities(res));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNationalities([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setNationalityLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      if (bypassInternalVisibility) return;
      if (useFormDateOfBirthForVisibility) {
        setShouldShowGuardianByProfile(isEligibleByDob(formDateOfBirth));
        setProfileResolved(true);
        return;
      }

      if (!profileUserId) {
        setProfileResolved(true);
        setShouldShowGuardianByProfile(false);
        return;
      }

      let cancelled = false;
      setProfileResolved(false);
      getUserIndividual(profileUserId)
        .then((res) => {
          if (!cancelled) {
            const responseData = res as {
              data?: {
                dateOfBirth?: string;
                userPerson?: { dateOfBirth?: string };
              };
              dateOfBirth?: string;
              userPerson?: { dateOfBirth?: string };
            };
            const dateOfBirth =
              responseData.data?.dateOfBirth ??
              responseData.dateOfBirth ??
              responseData.data?.userPerson?.dateOfBirth ??
              responseData.userPerson?.dateOfBirth;
            setShouldShowGuardianByProfile(isEligibleByDob(dateOfBirth));
            setProfileResolved(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setShouldShowGuardianByProfile(false);
            setProfileResolved(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [
      bypassInternalVisibility,
      formDateOfBirth,
      profileUserId,
      useFormDateOfBirthForVisibility,
    ]);

    useEffect(() => {
      if (bypassInternalVisibility) return;
      if (!profileResolved) return;

      if (!shouldShowGuardian) {
        clearGuardianValidationState();
        if (hasAnyGuardianValue(field.value)) {
          field.setValue({});
        }
      }
    }, [
      bypassInternalVisibility,
      clearGuardianValidationState,
      field,
      profileResolved,
      shouldShowGuardian,
    ]);

    const patch = (partial: Partial<GuardianConsentDetailsValue>) => {
      field.setValue({
        ...current,
        ...partial,
      });
    };

    const renderLabel = (label: string, required = true) => (
      <div className="guardian-consent-details-label">
        <span>
          {label}
          {required && (
            <span className="guardian-consent-details-required">*</span>
          )}
        </span>
      </div>
    );

    const beforeUploadFile = (file: RcFile) => {
      const isPdf = /\.pdf$/i.test(file.name);
      const validSize = file.size / 1024 / 1024 <= 5;
      if (!isPdf || !validSize) {
        CustomMessage.error(t("GuardianConsentDetails.validation.uploadPdf"));
        return false;
      }
      return true;
    };

    const validators = useMemo(
      () => ({
        required: (value: unknown) => validateRequired(value, requiredMessage),
        fullName: (value: unknown) =>
          validateFullName(value, {
            required: requiredMessage,
            max: t("GuardianConsentDetails.validation.fullNameMax"),
          }),
        passportNumber: (value: unknown) =>
          validatePassportNumber(value, {
            required: requiredMessage,
            invalid: t("GuardianConsentDetails.validation.passportNumber"),
          }),
        nationality: (value: unknown) =>
          validateNationality(value, requiredMessage),
        guardianDateOfBirth: (value: unknown) =>
          validateGuardianDateOfBirth(value, {
            required: requiredMessage,
            invalidDate: t("GuardianConsentDetails.validation.invalidDate"),
            minAge: t("GuardianConsentDetails.validation.guardianMinAge"),
          }),
        occupation: (value: unknown) =>
          validateOccupation(value, {
            max: t("GuardianConsentDetails.validation.occupationMax"),
            invalid: t("GuardianConsentDetails.validation.occupationInvalid"),
          }),
        email: (value: unknown) =>
          validateEmail(value, {
            required: requiredMessage,
            max: t("GuardianConsentDetails.validation.emailMax"),
            invalid: t("GuardianConsentDetails.validation.emailInvalid"),
          }),
      }),
      [
        requiredMessage,
        t,
      ],
    );

    const dobValue = useMemo(
      () =>
        current.guardianDateOfBirth
          ? moment(current.guardianDateOfBirth, "YYYY-MM-DD", true)
          : null,
      [current.guardianDateOfBirth]
    );

    if (!bypassInternalVisibility && !profileResolved) {
      return null;
    }

    if (!shouldShowGuardian) {
      return null;
    }

    return (
      <div
        className={`guardian-consent-details-container ${props.className || ""}`}
      >
        <AntdCard
          className="guardian-consent-details-card"
          title={t("GuardianConsentDetails.title")}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field guardian-consent-details-upload">
                {renderLabel(t("GuardianConsentDetails.label.consentFile"))}
                <Field
                  name="consentFile"
                  validator={validators.required}
                  decorator={[FormItem]}
                >
                  <DocumentViewer
                    hasDelete={!disabled}
                    disabled={disabled}
                    value={current.consentFile}
                    onChange={(value) =>
                      patch({
                        consentFile: Array.isArray(value)
                          ? value[0]
                          : (value as string),
                      })
                    }
                    uploadConfig={{
                      maxCount: 1,
                      maxSize: 5,
                      accept: ".pdf",
                      uploadTip: t("GuardianConsentDetails.uploadTip.pdf"),
                      beforeUpload: beforeUploadFile,
                    }}
                  />
                </Field>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.fullName"))}
                <Field
                  name="fullName"
                  validator={validators.fullName}
                  decorator={[FormItem]}
                >
                  <Input
                    disabled={disabled}
                    placeholder={t("GuardianConsentDetails.placeholder.fullName")}
                    maxLength={MAX_NAME_LEN}
                    value={current.fullName}
                    onChange={(event) =>
                      patch({ fullName: event.target.value.slice(0, MAX_NAME_LEN) })
                    }
                  />
                </Field>
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.passportNumber"))}
                <Field
                  name="passportNumber"
                  validator={validators.passportNumber}
                  decorator={[FormItem]}
                >
                  <Input
                    disabled={disabled}
                    placeholder={t("GuardianConsentDetails.placeholder.passportNumber")}
                    maxLength={PASSPORT_MAX_LEN}
                    value={current.passportNumber}
                    onChange={(event) =>
                      patch({
                        passportNumber: sanitizeAlphaNumeric(
                          event.target.value,
                          PASSPORT_MAX_LEN
                        ),
                      })
                    }
                  />
                </Field>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.nationality"))}
                <Field
                  name="nationalityId"
                  validator={validators.nationality}
                  decorator={[FormItem]}
                >
                  <Select
                    disabled={disabled}
                    loading={nationalityLoading}
                    placeholder={t("GuardianConsentDetails.placeholder.nationality")}
                    value={current.nationalityId}
                    onChange={(value) =>
                      patch({ nationalityId: value as number | undefined })
                    }
                    showSearch
                    optionFilterProp="children"
                    allowClear
                  >
                    {nationalities.map((item) => (
                      <Option key={item.id} value={item.id}>
                        {preferLocalizedEnAr(
                          isAr,
                          item.nameEn || item.fullNameEn,
                          item.nameAr || item.fullNameAr,
                        )}
                      </Option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.dateOfBirth"))}
                <Field
                  name="guardianDateOfBirth"
                  validator={validators.guardianDateOfBirth}
                  decorator={[FormItem]}
                >
                  <DatePicker
                    disabled={disabled}
                    style={{ width: "100%" }}
                    placeholder={t("GuardianConsentDetails.placeholder.date")}
                    format="DD/MM/YYYY"
                    value={dobValue && dobValue.isValid() ? dobValue : null}
                    onChange={(value) =>
                      patch({
                        guardianDateOfBirth: value
                          ? value.format("YYYY-MM-DD")
                          : undefined,
                      })
                    }
                  />
                </Field>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.gender"))}
                <Field name="gender" validator={validators.required} decorator={[FormItem]}>
                  <Select
                    disabled={disabled}
                    placeholder={t("GuardianConsentDetails.placeholder.gender")}
                    value={current.gender}
                    onChange={(value) =>
                      patch({ gender: value as "Male" | "Female" | undefined })
                    }
                    allowClear
                  >
                    <Option value="Male">{t("GuardianConsentDetails.option.gender.male")}</Option>
                    <Option value="Female">{t("GuardianConsentDetails.option.gender.female")}</Option>
                  </Select>
                </Field>
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.occupation"), false)}
                <Field
                  name="occupation"
                  validator={validators.occupation}
                  decorator={[FormItem]}
                >
                  <Input
                    disabled={disabled}
                    placeholder={t("GuardianConsentDetails.placeholder.occupation")}
                    maxLength={MAX_OCCUPATION_LEN}
                    value={current.occupation}
                    onChange={(event) =>
                      patch({
                        occupation: sanitizeAlphaNumericWithSpaces(
                          event.target.value,
                          MAX_OCCUPATION_LEN
                        ),
                      })
                    }
                  />
                </Field>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.email"))}
                <Field
                  name="email"
                  validator={validators.email}
                  decorator={[FormItem]}
                >
                  <Input
                    disabled={disabled}
                    placeholder={t("GuardianConsentDetails.placeholder.email")}
                    maxLength={MAX_EMAIL_LEN}
                    value={current.email}
                    onChange={(event) =>
                      patch({ email: event.target.value.slice(0, MAX_EMAIL_LEN) })
                    }
                  />
                </Field>
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="guardian-consent-details-field">
                {renderLabel(t("GuardianConsentDetails.label.phoneNumber"))}
                <CompositeMobileNumberField
                  fieldNames={{
                    fullNumber: "phoneNumber",
                    countryCode: "phoneNumberCountryCode",
                    localNumber: "phoneNumberLocalNumber",
                  }}
                  fullNumber={current.phoneNumber}
                  countryCode={current.phoneNumberCountryCode}
                  localNumber={current.phoneNumberLocalNumber}
                  disabled={disabled}
                  required
                  placeholder={t("GuardianConsentDetails.placeholder.phoneNumber")}
                  onChange={(mobilePatch) =>
                    patch(mobilePatch as Partial<GuardianConsentDetailsValue>)
                  }
                />
              </div>
            </Col>
          </Row>
        </AntdCard>
      </div>
    );
  });

GuardianConsentDetailsField.displayName = "GuardianConsentDetailsField";

export default GuardianConsentDetailsField;
