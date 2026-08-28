import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Field, observer, useField } from "@formily/react";
import { FormPath } from "@formily/shared";
import {
  Card as AntdCard,
  Col,
  DatePicker,
  Input,
  Radio,
  Row,
  Select,
  Spin,
} from "antd";
import { useTranslation } from "react-i18next";
import type { EmirateItem } from "@/services/address";
import { toPickerMoment } from "@/utils/dateLocale";
import { DEFAULT_COUNTRY_DIAL_CODE } from "../../../../../components/common/MobileNumberInput/constants";
import { resolveContactNumberValidationValue } from "../../../../../components/common/MobileNumberInput/contactNumber";
import { validateMobileNumber } from "../../../../../components/common/MobileNumberInput/utils";
import DocumentViewer from "../../../../../components/common/DocumentViewer";
import AddressPicker from "../AddressPicker/AddressPicker";
import { CompositeMobileNumberField } from "../MobileNumberInput";
import {
  applyTradeLicenseMode,
  getProfileFormFieldClassName,
  getOriginalTradeLicenseMode,
  getProfileDraftForContext,
  getProfileFormSourceAddress,
  getProfileFormValidationErrors,
  mapProfileFormSource,
  mergeResolvedProfileFormSourceBaseline,
  shouldInitializeProfileForm,
  type ProfileFormAddressPicker,
  type ProfileFormSource,
  type ProfileFormValues,
  type ReserveBranchCache,
  type TradeLicenseMode,
} from "./profileFormRules";
import "./styles.less";

interface ProfileFormFieldProps {
  disabled?: boolean;
  profileInfo?: ProfileFormSource | null;
  profileLoaded?: boolean;
  profileContextKey?: string;
  draftProfileContextKey?: string;
  initialFormValues?: Record<string, unknown>;
  reviewMode?: boolean;
  formDataRevision?: number;
  onProfileSourceResolved?: (value: ProfileFormValues) => void;
  onProfileSourceResolutionError?: () => void;
}

interface ProfileFormFieldModel {
  value?: ProfileFormValues;
  selfInvalid: boolean;
  address: {
    concat: (name: string) => string;
    toString: () => string;
  };
  setValue: (value: ProfileFormValues) => void;
  setValidator: (
    validator: (value: ProfileFormValues) => string,
  ) => void;
}

type ProfileValidationField =
  | "establishmentSubTypes"
  | "establishmentNameArabic"
  | "establishmentNameEnglish"
  | "establishmentEmirateName"
  | "licensingAuthority"
  | "hasTradeLicense"
  | "commercialLicenseNumber"
  | "licenseExpiryDate"
  | "phoneNumber"
  | "commercialLicense"
  | "reserveTradeNumber"
  | "reserveTradeName";

const hasOwnAddressPicker = (values: ProfileFormValues): boolean =>
  Object.prototype.hasOwnProperty.call(values, "addressPicker");

const PROFILE_PHONE_FIELD_NAMES = {
  fullNumber: "phoneNumber",
  countryCode: "phoneNumberCountryCode",
  localNumber: "phoneNumberLocalNumber",
} as const;

const toInputValue = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value);

const isEmptyValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const ProfileFormField: React.FC<ProfileFormFieldProps> = observer(
  ({
    disabled = false,
    profileInfo = {},
    profileLoaded = false,
    profileContextKey,
    draftProfileContextKey,
    initialFormValues = {},
    reviewMode = false,
    formDataRevision = 0,
    onProfileSourceResolved,
    onProfileSourceResolutionError,
  }) => {
    const { t, i18n } = useTranslation();
    const field = useField<ProfileFormFieldModel>();
    const current = useMemo(() => field.value || {}, [field.value]);
    const initializedRevisionRef = useRef<number>();
    const profileSourceBaselineRef = useRef<ProfileFormValues>();
    const originalModeRef = useRef<TradeLicenseMode | undefined>();
    const reserveCacheRef = useRef<ReserveBranchCache>({});
    const sourceAddressEnabledRef = useRef(false);
    const [emirates, setEmirates] = useState<EmirateItem[]>([]);
    const currentLanguage = i18n.language ?? "";
    const isDisabled = disabled || reviewMode;
    const safeProfileInfo = useMemo(() => profileInfo || {}, [profileInfo]);

    const sourceAddress = useMemo(
      () => getProfileFormSourceAddress(safeProfileInfo),
      [safeProfileInfo],
    );

    useEffect(() => {
      if (reviewMode) return;
      if (!profileLoaded) {
        initializedRevisionRef.current = undefined;
        profileSourceBaselineRef.current = undefined;
        return;
      }
      if (
        !shouldInitializeProfileForm(
          initializedRevisionRef.current,
          formDataRevision,
          profileLoaded,
          reviewMode,
        )
      ) {
        return;
      }

      const initialDraft = FormPath.getIn(
        initialFormValues,
        field.address.toString(),
      ) as ProfileFormValues | undefined;
      const savedValues =
        getProfileDraftForContext(
          initialDraft,
          draftProfileContextKey,
          profileContextKey,
        ) || {};
      const hasSavedAddress = hasOwnAddressPicker(savedValues);
      const originalMode = getOriginalTradeLicenseMode(safeProfileInfo);
      const mappedValues = mapProfileFormSource(safeProfileInfo, savedValues);
      const reserveCache: ReserveBranchCache = {
        reserveTradeNumber: mappedValues.reserveTradeNumber,
        reserveTradeName: mappedValues.reserveTradeName,
      };
      const activeValues =
        typeof mappedValues.hasTradeLicense === "boolean"
          ? applyTradeLicenseMode(
              mappedValues,
              originalMode,
              mappedValues.hasTradeLicense,
              reserveCache,
            )
          : mappedValues;

      initializedRevisionRef.current = formDataRevision;
      originalModeRef.current = originalMode;
      reserveCacheRef.current = reserveCache;
      sourceAddressEnabledRef.current = !hasSavedAddress;
      field.setValue(activeValues);
      profileSourceBaselineRef.current = activeValues;
      onProfileSourceResolved?.(activeValues);
    }, [
      draftProfileContextKey,
      field,
      formDataRevision,
      initialFormValues,
      onProfileSourceResolved,
      profileContextKey,
      profileLoaded,
      reviewMode,
      safeProfileInfo,
    ]);

    const handleSourceAddressResolved = useCallback(
      (addressPicker: ProfileFormAddressPicker) => {
        const resolvedBaseline = mergeResolvedProfileFormSourceBaseline(
          profileSourceBaselineRef.current ||
            mapProfileFormSource(safeProfileInfo),
          addressPicker,
        );
        profileSourceBaselineRef.current = resolvedBaseline;
        onProfileSourceResolved?.(resolvedBaseline);
      },
      [onProfileSourceResolved, safeProfileInfo],
    );

    const validationFields = useMemo(
      () =>
        getProfileFormValidationErrors(
          current,
          emirates,
          originalModeRef.current,
        ) as ProfileValidationField[],
      [current, emirates],
    );

    const getValidationMessage = useCallback(
      (name: ProfileValidationField): string => {
        if (name === "commercialLicenseNumber") {
          return isEmptyValue(current.commercialLicenseNumber)
            ? t("ProfileForm.validation.required")
            : t("ProfileForm.validation.invalidTradeLicenseNumber");
        }
        if (name === "licenseExpiryDate") {
          return isEmptyValue(current.licenseExpiryDate)
            ? t("ProfileForm.validation.required")
            : t("ProfileForm.validation.invalidDate");
        }
        if (name === "phoneNumber") {
          return validateMobileNumber(
            resolveContactNumberValidationValue({
              countryCode: current.phoneNumberCountryCode,
              localNumber: current.phoneNumberLocalNumber,
              fullNumber: current.phoneNumber,
              defaultCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
            }),
          ).message;
        }
        return t("ProfileForm.validation.required");
      },
      [
        current.commercialLicenseNumber,
        current.licenseExpiryDate,
        current.phoneNumber,
        current.phoneNumberCountryCode,
        current.phoneNumberLocalNumber,
        t,
      ],
    );

    useEffect(() => {
      if (reviewMode) return;
      field.setValidator((value: ProfileFormValues) => {
        const errors = getProfileFormValidationErrors(
          value || {},
          emirates,
          originalModeRef.current,
        ) as ProfileValidationField[];
        return errors[0] ? getValidationMessage(errors[0]) : "";
      });
    }, [currentLanguage, emirates, field, getValidationMessage, reviewMode]);

    const showValidationHints = field.selfInvalid;
    const getFieldClassName = (name: string) =>
      getProfileFormFieldClassName(
        name,
        validationFields,
        showValidationHints,
      );
    const renderFieldError = (name: ProfileValidationField) =>
      showValidationHints && validationFields.includes(name) ? (
        <div
          className="profile-form__field-error"
          data-form-validation-error="true"
        >
          {getValidationMessage(name)}
        </div>
      ) : null;

    const updateField = (name: string, value: unknown) => {
      if (isDisabled) return;
      const nextValues = { ...current, [name]: value };
      if (name === "reserveTradeNumber" || name === "reserveTradeName") {
        reserveCacheRef.current = {
          ...reserveCacheRef.current,
          [name]: value,
        };
      }
      field.setValue(nextValues);
    };

    const updateFields = (patch: Record<string, string>) => {
      if (isDisabled) return;
      field.setValue({ ...current, ...patch });
    };

    const handleTradeLicenseChange = (nextMode: TradeLicenseMode) => {
      if (isDisabled) return;
      if (current.hasTradeLicense === false) {
        reserveCacheRef.current = {
          reserveTradeNumber: current.reserveTradeNumber,
          reserveTradeName: current.reserveTradeName,
        };
      }
      field.setValue(
        applyTradeLicenseMode(
          current,
          originalModeRef.current,
          nextMode,
          reserveCacheRef.current,
        ),
      );
    };

    const renderLabel = (label: string, required = true) => (
      <div className="profile-form__label">
        {label}
        {required ? <span className="profile-form__required">*</span> : null}
      </div>
    );

    const renderTextInput = ({
      name,
      label,
      required = true,
      readOnly = false,
      maxLength,
    }: {
      name: string;
      label: string;
      required?: boolean;
      readOnly?: boolean;
      maxLength?: number;
    }) => (
      <div className={getFieldClassName(name)}>
        {renderLabel(label, required)}
        <Input
          disabled={isDisabled || readOnly}
          className={readOnly ? "profile-form__readonly" : undefined}
          value={toInputValue(current[name])}
          maxLength={maxLength}
          placeholder={t("ProfileForm.placeholder.enter", { label })}
          onChange={(event) => updateField(name, event.target.value)}
        />
        {renderFieldError(name as ProfileValidationField)}
      </div>
    );

    const renderValueSelect = ({
      name,
      label,
      required = true,
      readOnly = false,
    }: {
      name: string;
      label: string;
      required?: boolean;
      readOnly?: boolean;
    }) => {
      const value = toInputValue(current[name]);
      return (
        <div className={getFieldClassName(name)}>
          {renderLabel(label, required)}
          <Select
            disabled={isDisabled || readOnly}
            className={readOnly ? "profile-form__readonly" : undefined}
            value={value || undefined}
            placeholder={t("ProfileForm.placeholder.select", { label })}
            showSearch
            optionFilterProp="children"
            onChange={(nextValue) => updateField(name, nextValue)}
          >
            {value ? <Select.Option value={value}>{value}</Select.Option> : null}
          </Select>
          {renderFieldError(name as ProfileValidationField)}
        </div>
      );
    };

    const renderDatePicker = (
      name: string,
      label: string,
      required = true,
    ) => (
      <div className={getFieldClassName(name)}>
        {renderLabel(label, required)}
        <DatePicker
          disabled={isDisabled}
          format="DD/MM/YYYY"
          placeholder={t("ProfileForm.placeholder.selectDate")}
          value={toPickerMoment(current[name] as string | undefined)}
          onChange={(date) =>
            updateField(name, date?.format("YYYY-MM-DD") || undefined)
          }
        />
        {renderFieldError(name as ProfileValidationField)}
      </div>
    );

    const renderUpload = (
      name: string,
      label: string,
      required = true,
    ) => (
      <div className={getFieldClassName(name)}>
        {renderLabel(label, required)}
        <DocumentViewer
          hasDelete
          hasReupload
          disabled={isDisabled}
          value={current[name] as string | string[] | undefined}
          onChange={(value) => updateField(name, value)}
          uploadConfig={{
            maxCount: 1,
            maxSize: 5,
            accept: ".pdf",
            placeholder: t("ProfileForm.placeholder.upload"),
            uploadTip: t("ProfileForm.uploadTip"),
            invalidFileTypeMessage: t("ProfileForm.validation.pdfOnly"),
            maxSizeErrorMessage: t("ProfileForm.validation.maxFileSize"),
          }}
        />
        {renderFieldError(name as ProfileValidationField)}
      </div>
    );

    if (
      !reviewMode &&
      (!profileLoaded || initializedRevisionRef.current === undefined)
    ) {
      return (
        <div className="profile-form profile-form--loading">
          <Spin />
        </div>
      );
    }

    const hasTradeLicense = current.hasTradeLicense === true;
    const originalTradeLicenseIsYes = originalModeRef.current === true;

    return (
      <div className="profile-form">
        <AntdCard
          className="profile-form__card"
          title={t("ProfileForm.section.establishmentInformation")}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              {renderValueSelect({
                name: "establishmentSubTypes",
                label: t("ProfileForm.label.establishmentSubTypes"),
                readOnly: true,
              })}
            </Col>
            <Col xs={24} md={12}>
              {renderTextInput({
                name: "workEmail",
                label: t("ProfileForm.label.workEmail"),
                required: false,
                maxLength: 200,
              })}
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              {renderTextInput({
                name: "establishmentNameArabic",
                label: t("ProfileForm.label.establishmentNameArabic"),
                maxLength: 200,
              })}
            </Col>
            <Col xs={24} md={12}>
              {renderTextInput({
                name: "establishmentNameEnglish",
                label: t("ProfileForm.label.establishmentNameEnglish"),
                maxLength: 200,
              })}
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              {renderValueSelect({
                name: "establishmentEmirateName",
                label: t("ProfileForm.label.emirate"),
                readOnly: true,
              })}
            </Col>
            <Col xs={24} md={12}>
              {renderValueSelect({
                name: "licensingAuthority",
                label: t("ProfileForm.label.licensingAuthority"),
                readOnly: true,
              })}
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <div className={getFieldClassName("hasTradeLicense")}>
                {renderLabel(t("ProfileForm.label.hasTradeLicense"))}
                <Radio.Group
                  className="profile-form__trade-license-radio"
                  value={current.hasTradeLicense}
                  disabled={isDisabled}
                  onChange={(event) =>
                    handleTradeLicenseChange(event.target.value)
                  }
                >
                  <Radio value={true}>{t("ProfileForm.option.yes")}</Radio>
                  <Radio value={false} disabled={originalTradeLicenseIsYes}>
                    {t("ProfileForm.option.no")}
                  </Radio>
                </Radio.Group>
                {renderFieldError("hasTradeLicense")}
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            {current.hasTradeLicense === true ? (
              <>
                <Col xs={24} md={12}>
                  {renderTextInput({
                    name: "commercialLicenseNumber",
                    label: t("ProfileForm.label.tradeLicenseNumber"),
                    readOnly: originalTradeLicenseIsYes,
                    maxLength: 50,
                  })}
                </Col>
                <Col xs={24} md={12}>
                  {renderDatePicker(
                    "licenseExpiryDate",
                    t("ProfileForm.label.licenseExpiryDate"),
                  )}
                </Col>
              </>
            ) : current.hasTradeLicense === false ? (
              <Col xs={24} md={12}>
                {renderTextInput({
                  name: "reserveTradeNumber",
                  label: t("ProfileForm.label.reserveTradeNumber"),
                  readOnly: true,
                  maxLength: 50,
                })}
              </Col>
            ) : null}
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className={getFieldClassName("phoneNumber")}>
                {renderLabel(t("ProfileForm.label.phoneNumber"))}
                <CompositeMobileNumberField
                  key={`${profileContextKey || ""}:${draftProfileContextKey || ""}:${formDataRevision}`}
                  fieldNames={PROFILE_PHONE_FIELD_NAMES}
                  fullNumber={current.phoneNumber}
                  countryCode={current.phoneNumberCountryCode}
                  localNumber={current.phoneNumberLocalNumber}
                  disabled={isDisabled}
                  required
                  placeholder={t("ProfileForm.placeholder.enter", {
                    label: t("ProfileForm.label.phoneNumber"),
                  })}
                  onChange={updateFields}
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              {renderDatePicker(
                "tenancyContractEndDate",
                t("ProfileForm.label.tenancyContractEndDate"),
                false,
              )}
            </Col>
          </Row>
        </AntdCard>

        <AntdCard
          className="profile-form__card"
          title={t("ProfileForm.section.establishmentDocuments")}
        >
          {hasTradeLicense ? (
            <Row gutter={24}>
              <Col xs={24} md={12}>
                {renderUpload(
                  "commercialLicense",
                  t("ProfileForm.label.uploadCommercialLicense"),
                )}
              </Col>
              <Col xs={24} md={12}>
                {renderUpload(
                  "tenancyContract",
                  t("ProfileForm.label.uploadTenancyContract"),
                  false,
                )}
              </Col>
            </Row>
          ) : current.hasTradeLicense === false ? (
            <Row gutter={24}>
              <Col xs={24} md={12}>
                {renderUpload(
                  "reserveTradeName",
                  t("ProfileForm.label.uploadReserveTradeName"),
                )}
              </Col>
            </Row>
          ) : null}

          <Row gutter={24}>
            <Col xs={24} md={12}>
              {renderUpload(
                "memorandumOfAssociation",
                t("ProfileForm.label.memorandumOfAssociation"),
                false,
              )}
            </Col>
            <Col xs={24} md={12}>
              {renderUpload(
                "powerOfAttorney",
                t("ProfileForm.label.powerOfAttorney"),
                false,
              )}
            </Col>
          </Row>
        </AntdCard>

        <AntdCard
          className="profile-form__card"
          title={t("ProfileForm.section.addressInformation")}
        >
          <div className="profile-form__address">
            <Field
              name="addressPicker"
              component={[
                AddressPicker,
                {
                  disabled: isDisabled,
                  initializeFromSource:
                    !reviewMode && sourceAddressEnabledRef.current,
                  sourceReady: profileLoaded,
                  sourceAddress,
                  sourceRevision: initializedRevisionRef.current ?? 0,
                  onSourceAddressResolved: handleSourceAddressResolved,
                  onSourceAddressResolutionError:
                    onProfileSourceResolutionError,
                  onEmiratesLoaded: setEmirates,
                },
              ]}
            />
          </div>
        </AntdCard>
      </div>
    );
  },
);

ProfileFormField.displayName = "ProfileFormField";

export default ProfileFormField;
