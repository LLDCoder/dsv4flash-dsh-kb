import React, { useState } from "react";
import { Form, Input, Radio, DatePicker, Button } from "antd";
import type { RadioChangeEvent } from "antd";
import { useTranslation } from "react-i18next";
import HoverTooltip from "../HoverTooltip";
import EmiratesIdInput from "../EmiratesIdInput";
import { OcrInput, OcrModal, OCR_DOCUMENT_TYPE_BY_METHOD } from "@/components/common/ocr";
import type {
  OcrApplyPayload,
  OcrDocumentType,
  OcrInputProps,
  OcrPreviewFileType,
} from "@/components/common/ocr";
import Search from "@/assets/icons/Search";
import { suffixIcon } from "@/utils/date";
import UIDImage from "@/assets/images/UID.png";
import {
  disabledDateBeforeToday,
  PASSPORT_NUMBER_PATTERN,
  UID_PATTERN,
  VERIFICATION_METHOD,
  type VerificationMethod,
} from "@/utils/individualIdentity";
import type { IndividualIdentityFormProps } from "./types";

type VerificationSectionProps = Pick<
  IndividualIdentityFormProps,
  | "layout"
  | "form"
  | "verificationMethod"
  | "verificationLoading"
  | "enableVerificationLookup"
  | "allowReadonlyVerificationSearch"
  | "hiddenVerificationSearchMethods"
  | "icpReadonlyFieldNames"
  | "verificationOptions"
  | "selectedVerificationOption"
  | "ocrEnabledMethods"
  | "ocrNationalityList"
  | "mapOcrApplyPayload"
  | "isFieldDisabled"
  | "isVerificationMethodOptionDisabled"
  | "onVerificationMethodChange"
  | "onVerificationOptionChange"
  | "onVerificationBlur"
  | "onOcrApply"
  | "onDateOfBirthChange"
  | "verifyMethodLabel"
> & {
  part?: "all" | "method" | "fields";
};

interface VerificationSearchInputProps {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  placeholder?: string;
  variant?: "emirates" | "text";
  showInteractiveMask?: boolean;
  showInlineSearchAction?: boolean;
  searchActionDisabled?: boolean;
  searchActionLoading?: boolean;
  ocrDisabled?: boolean;
  onOcrClick?: () => void;
  ocrTitle?: string;
  onSearch?: () => void;
}

const VerificationSearchInput: React.FC<VerificationSearchInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder,
  variant = "text",
  showInteractiveMask = false,
  showInlineSearchAction = false,
  searchActionDisabled = false,
  searchActionLoading = false,
  ocrDisabled,
  onOcrClick,
  ocrTitle,
  onSearch,
}) => {
  const { t } = useTranslation();
  const resolvedQueryLabel = t("common.search");

  return (
    <div
      className={`verification-search-field${
        showInlineSearchAction ? " verification-search-field--inline-action" : ""
      }`}
    >
      <div className="verification-search-field__control">
        <OcrInput
          ocrDisabled={ocrDisabled}
          onOcrClick={onOcrClick}
          ocrTitle={ocrTitle}
        >
          {variant === "emirates" ? (
            <EmiratesIdInput
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              showInteractiveMask={showInteractiveMask}
            />
          ) : (
            <Input
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
            />
          )}
        </OcrInput>
      </div>
      {showInlineSearchAction && (
        <Button
          type="primary"
          className="verification-search-field__inline-button"
          disabled={searchActionDisabled}
          loading={searchActionLoading}
          icon={<Search />}
          title={resolvedQueryLabel}
          aria-label={resolvedQueryLabel}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onSearch}
        />
      )}
    </div>
  );
};

interface VerificationSearchActionProps {
  layout: "profile" | "modal";
  disabled?: boolean;
  loading?: boolean;
  onSearch: () => void;
}

const VerificationSearchAction: React.FC<VerificationSearchActionProps> = ({
  layout,
  disabled = false,
  loading = false,
  onSearch,
}) => {
  const { t } = useTranslation();
  const resolvedQueryLabel = t("common.search");
  const labelPlaceholder = (
    <span
      className="verification-search-action__label-placeholder"
      aria-hidden="true"
    >
      &nbsp;
    </span>
  );
  const buttonNode = (
    <Form.Item
      label={labelPlaceholder}
      className={
        layout === "modal"
          ? "individual-identity-form-col verification-search-action-form-item verification-search-action-form-item--modal"
          : "form-item verification-search-action-form-item verification-search-action-form-item--profile"
      }
    >
      <Button
        type="primary"
        className="verification-search-action__button"
        disabled={disabled}
        loading={loading}
        title={resolvedQueryLabel}
        aria-label={resolvedQueryLabel}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onSearch}
      >
        {resolvedQueryLabel}
      </Button>
    </Form.Item>
  );

  return buttonNode;
};

const VerificationSection: React.FC<VerificationSectionProps> = ({
  layout,
  form,
  verificationMethod,
  verificationLoading,
  enableVerificationLookup = true,
  allowReadonlyVerificationSearch = false,
  hiddenVerificationSearchMethods,
  icpReadonlyFieldNames,
  verificationOptions,
  selectedVerificationOption,
  ocrEnabledMethods = [],
  ocrNationalityList = [],
  mapOcrApplyPayload,
  isFieldDisabled,
  isVerificationMethodOptionDisabled,
  onVerificationMethodChange,
  onVerificationOptionChange,
  onVerificationBlur,
  onOcrApply,
  onDateOfBirthChange,
  verifyMethodLabel = "howToVerify",
  part = "all",
}) => {
  const { t } = useTranslation();
  const [ocrModalDocumentType, setOcrModalDocumentType] = useState<
    "emiratesId" | "passport" | null
  >(null);
  const icpReadonly = (field: string) => icpReadonlyFieldNames.includes(field);
  const isModal = layout === "modal";
  const canSearchVerification = enableVerificationLookup !== false;
  const hideSearchForCurrentMethod = Boolean(
    hiddenVerificationSearchMethods?.includes(verificationMethod),
  );
  const itemClass = isModal ? "individual-identity-form-col" : "form-item";
  const resolvedVerificationOptions =
    verificationOptions ?? [
      {
        label: t("individualIdentity.verify.emiratesId"),
        value: VERIFICATION_METHOD.EMIRATES_ID,
        disabled: isVerificationMethodOptionDisabled?.(
          VERIFICATION_METHOD.EMIRATES_ID,
        ),
      },
      {
        label: t("individualIdentity.verify.uid"),
        value: VERIFICATION_METHOD.UID,
        disabled: isVerificationMethodOptionDisabled?.(
          VERIFICATION_METHOD.UID,
        ),
      },
      {
        label: t("individualIdentity.verify.passport"),
        value: VERIFICATION_METHOD.PASSPORT,
        disabled: isVerificationMethodOptionDisabled?.(
          VERIFICATION_METHOD.PASSPORT,
        ),
      },
    ];
  const currentOcrDocumentType = OCR_DOCUMENT_TYPE_BY_METHOD[verificationMethod];

  const canOpenOcr = (fieldName: "emiratesId" | "passportNumber"): boolean => {
    if (!currentOcrDocumentType) {
      return false;
    }

    const expectedFieldName =
      currentOcrDocumentType === "emiratesId" ? "emiratesId" : "passportNumber";

    if (expectedFieldName !== fieldName) {
      return false;
    }

    return ocrEnabledMethods.includes(verificationMethod);
  };

  const getOcrInputProps = (
    fieldName: "emiratesId" | "passportNumber",
  ): Pick<OcrInputProps, "ocrDisabled" | "onOcrClick" | "ocrTitle"> | undefined => {
    if (!canOpenOcr(fieldName) || !currentOcrDocumentType) {
      return undefined;
    }

    return {
      ocrDisabled:
        isFieldDisabled(fieldName) ||
        icpReadonly(fieldName) ||
        verificationLoading,
      ocrTitle: t("ocr.trigger"),
      onOcrClick: () => setOcrModalDocumentType(currentOcrDocumentType),
    };
  };

  const handleOcrApply = (
    rawPayload: OcrApplyPayload,
    documentType: OcrDocumentType,
    previewFileType: OcrPreviewFileType,
  ) => {
    const context = {
      documentType,
      previewFileType,
      verificationMethod,
    } as const;
    const nextMappedPayload = mapOcrApplyPayload?.(rawPayload, context);
    const mappedPayload =
      nextMappedPayload && typeof nextMappedPayload === "object"
        ? nextMappedPayload
        : rawPayload;
    const mappedFieldNames = Object.keys(mappedPayload);

    form.setFieldsValue(mappedPayload);
    form.setFields(
      mappedFieldNames.map((fieldName) => ({
        name: fieldName,
        errors: [],
      })),
    );
    onOcrApply?.({
      rawPayload,
      mappedPayload,
      context,
    });
    setOcrModalDocumentType(null);
  };
  const ocrModalNode = ocrModalDocumentType ? (
    <OcrModal
      visible={!!ocrModalDocumentType}
      documentType={ocrModalDocumentType}
      nationalityList={ocrNationalityList}
      onApply={(payload, context) =>
        handleOcrApply(
          payload,
          ocrModalDocumentType,
          context.previewFileType,
        )
      }
      onClose={() => setOcrModalDocumentType(null)}
    />
  ) : null;

  const handleVerifyMethodChange = (e: RadioChangeEvent) => {
    if (onVerificationOptionChange) {
      onVerificationOptionChange(e.target.value);
      return;
    }
    onVerificationMethodChange(Number(e.target.value) as VerificationMethod);
  };

  const handleVerificationSearch = async (
    fieldName: "emiratesId" | "uidNumber" | "passportNumber",
  ) => {
    if (!canSearchVerification) return;
    try {
      await form.validateFields(["dateOfBirth", fieldName]);
      onVerificationBlur();
    } catch {
      // Form validation already renders field-level errors.
    }
  };

  const canRenderVerificationSearchAction = (
    fieldName: "emiratesId" | "uidNumber" | "passportNumber",
  ) => {
    if (!canSearchVerification || hideSearchForCurrentMethod) {
      return false;
    }

    const dateOfBirthReadOnly =
      icpReadonly("dateOfBirth") ||
      (isFieldDisabled("dateOfBirth") && !verificationLoading);
    const verificationFieldReadOnly =
      icpReadonly(fieldName) ||
      (isFieldDisabled(fieldName) && !verificationLoading);

    return (
      !dateOfBirthReadOnly &&
      (!verificationFieldReadOnly || allowReadonlyVerificationSearch)
    );
  };

  const isVerificationSearchActionDisabled = (
    fieldName: "emiratesId" | "uidNumber" | "passportNumber",
  ) =>
    Boolean(verificationLoading) ||
    (
      !allowReadonlyVerificationSearch &&
      (isFieldDisabled(fieldName) || icpReadonly(fieldName))
    );

  const verifyLabelKey =
    verifyMethodLabel === "verificationMethod"
      ? "individualIdentity.verify.verificationMethod"
      : "individualIdentity.verify.howToVerify";
  const verificationMethodRules = isModal
    ? [
        {
          required: true,
          message: t("individualIdentity.validation.selectVerificationMethod"),
        },
      ]
    : undefined;
  const verificationMethodErrors = form.getFieldError("verificationMethod");
  const verificationMethodControl = (
    <Radio.Group
      value={selectedVerificationOption ?? verificationMethod}
      onChange={handleVerifyMethodChange}
      disabled={
        isVerificationMethodOptionDisabled
          ? false
          : isFieldDisabled("verificationMethod")
      }
    >
      {resolvedVerificationOptions.map((option) => (
        <Radio
          key={String(option.value)}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </Radio>
      ))}
    </Radio.Group>
  );

  const methodBlock = (
    <>
      {!isModal && (
        <div className="verify-method" style={{ marginBottom: 8 }}>
          <label className="verify-label">{t(verifyLabelKey)}</label>
        </div>
      )}
      {onVerificationOptionChange ? (
        <Form.Item
          label={isModal ? t("individualIdentity.verify.verificationMethod") : undefined}
          required={Boolean(isModal)}
          validateStatus={verificationMethodErrors.length ? "error" : undefined}
          help={verificationMethodErrors[0]}
          className={
            isModal
              ? `${itemClass} verification-method-form-item`
              : "verification-method-form-item"
          }
        >
          <Form.Item
            name="verificationMethod"
            rules={verificationMethodRules}
            initialValue={verificationMethod}
            noStyle
          >
            <Input type="hidden" />
          </Form.Item>
          {verificationMethodControl}
        </Form.Item>
      ) : (
        <Form.Item
          name="verificationMethod"
          label={isModal ? t("individualIdentity.verify.verificationMethod") : undefined}
          rules={verificationMethodRules}
          initialValue={verificationMethod}
          className={
            isModal
              ? `${itemClass} verification-method-form-item`
              : "verification-method-form-item"
          }
        >
          {verificationMethodControl}
        </Form.Item>
      )}
    </>
  );

  const fieldsBlock = (
    <>
      <Form.Item
        name="dateOfBirth"
        label={t("individualIdentity.fields.dateOfBirth")}
        rules={[
          {
            required: true,
            message: t("individualIdentity.validation.dateOfBirthRequired"),
          },
        ]}
        className={itemClass}
      >
        <DatePicker
          format="DD/MM/YYYY"
          placeholder={t("formPlaceholders.common.ddmmyyyy")}
          style={{ width: "100%" }}
          suffixIcon={suffixIcon}
          disabled={isFieldDisabled("dateOfBirth") || verificationLoading}
          disabledDate={disabledDateBeforeToday}
          onChange={() => {
            onDateOfBirthChange?.();
          }}
        />
      </Form.Item>

      {verificationMethod === VERIFICATION_METHOD.EMIRATES_ID && (
        <>
          <Form.Item
            name="emiratesId"
            label={t("individualIdentity.fields.emiratesId")}
            validateTrigger={["onBlur", "onSubmit"]}
            rules={[
              {
                required: true,
                message: t("individualIdentity.validation.emiratesIdRequired"),
              },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const digits = String(value).replace(/\D/g, "");
                  if (!digits.startsWith("784")) {
                    return Promise.reject(
                      new Error(t("individualIdentity.validation.emiratesIdPrefix")),
                    );
                  }
                  if (digits.length !== 15) {
                    return Promise.reject(
                      new Error(t("individualIdentity.validation.emiratesIdLength")),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            className={itemClass}
          >
            {canSearchVerification && !hideSearchForCurrentMethod ? (
              <VerificationSearchInput
                variant="emirates"
                placeholder={t("formPlaceholders.components.individualIdentityForm.emiratesIdMask")}
                showInteractiveMask
                {...getOcrInputProps("emiratesId")}
                disabled={
                  isFieldDisabled("emiratesId") ||
                  icpReadonly("emiratesId") ||
                  verificationLoading
                }
                showInlineSearchAction={
                  isModal && canRenderVerificationSearchAction("emiratesId")
                }
                searchActionDisabled={isVerificationSearchActionDisabled("emiratesId")}
                searchActionLoading={verificationLoading}
                onSearch={() => {
                  void handleVerificationSearch("emiratesId");
                }}
              />
            ) : (
              <EmiratesIdInput
                placeholder={t("formPlaceholders.components.individualIdentityForm.emiratesIdMask")}
                disabled={isFieldDisabled("emiratesId") || icpReadonly("emiratesId")}
                showInteractiveMask
              />
            )}
          </Form.Item>
          {!isModal && canRenderVerificationSearchAction("emiratesId") && (
            <VerificationSearchAction
              layout={layout}
              disabled={isVerificationSearchActionDisabled("emiratesId")}
              loading={verificationLoading}
              onSearch={() => {
                void handleVerificationSearch("emiratesId");
              }}
            />
          )}
        </>
      )}

      {verificationMethod === VERIFICATION_METHOD.UID && (
        <>
          <Form.Item
            name="uidNumber"
            label={
              <span>
                {t("individualIdentity.fields.uid")}
                <HoverTooltip
                  content={
                    <div className="UID-block">
                      <label>{t("individualIdentity.uidTooltip.whereFind")}</label>
                      <div>
                        {t("individualIdentity.uidTooltip.findOnVisa")}{" "}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(
                              "https://www.gdrfad.gov.ae/en/unified-number-inquiry-service",
                            );
                          }}
                        >
                          {t("individualIdentity.uidTooltip.online")}
                        </a>
                      </div>
                      <div className="UID-block-imgContainer">
                        <img src={UIDImage} alt="" />
                      </div>
                    </div>
                  }
                />
              </span>
            }
            rules={[
              {
                required: true,
                message: t("individualIdentity.validation.uidRequired"),
              },
              {
                pattern: UID_PATTERN,
                message: t("individualIdentity.validation.uidDigits"),
              },
            ]}
            className={itemClass}
          >
            {canSearchVerification && !hideSearchForCurrentMethod ? (
              <VerificationSearchInput
                placeholder={t("formPlaceholders.components.individualIdentityForm.enterUid")}
                disabled={
                  isFieldDisabled("uidNumber") ||
                  icpReadonly("uidNumber") ||
                  verificationLoading
                }
                showInlineSearchAction={
                  isModal && canRenderVerificationSearchAction("uidNumber")
                }
                searchActionDisabled={isVerificationSearchActionDisabled("uidNumber")}
                searchActionLoading={verificationLoading}
                onSearch={() => {
                  void handleVerificationSearch("uidNumber");
                }}
              />
            ) : (
              <Input
                placeholder={t("formPlaceholders.components.individualIdentityForm.enterUid")}
                disabled={isFieldDisabled("uidNumber") || icpReadonly("uidNumber")}
              />
            )}
          </Form.Item>
          {!isModal && canRenderVerificationSearchAction("uidNumber") && (
            <VerificationSearchAction
              layout={layout}
              disabled={isVerificationSearchActionDisabled("uidNumber")}
              loading={verificationLoading}
              onSearch={() => {
                void handleVerificationSearch("uidNumber");
              }}
            />
          )}
        </>
      )}

      {verificationMethod === VERIFICATION_METHOD.PASSPORT && (
        <>
          <Form.Item
            name="passportNumber"
            label={t("individualIdentity.fields.passportNumber")}
            rules={[
              {
                required: true,
                message: t("individualIdentity.validation.passportRequired"),
              },
              {
                pattern: PASSPORT_NUMBER_PATTERN,
                message: t("individualIdentity.validation.passportFormat"),
              },
            ]}
            className={itemClass}
          >
            {canSearchVerification && !hideSearchForCurrentMethod ? (
              <VerificationSearchInput
                placeholder={t("formPlaceholders.components.individualIdentityForm.enterPassportNumber")}
                {...getOcrInputProps("passportNumber")}
                disabled={
                  isFieldDisabled("passportNumber") ||
                  icpReadonly("passportNumber") ||
                  verificationLoading
                }
                showInlineSearchAction={
                  isModal && canRenderVerificationSearchAction("passportNumber")
                }
                searchActionDisabled={isVerificationSearchActionDisabled("passportNumber")}
                searchActionLoading={verificationLoading}
                onSearch={() => {
                  void handleVerificationSearch("passportNumber");
                }}
              />
            ) : (
              <VerificationSearchInput
                placeholder={t("formPlaceholders.components.individualIdentityForm.enterPassportNumber")}
                {...getOcrInputProps("passportNumber")}
                disabled={
                  isFieldDisabled("passportNumber") || icpReadonly("passportNumber")
                }
              />
            )}
          </Form.Item>
          {!isModal && canRenderVerificationSearchAction("passportNumber") && (
            <VerificationSearchAction
              layout={layout}
              disabled={isVerificationSearchActionDisabled("passportNumber")}
              loading={verificationLoading}
              onSearch={() => {
                void handleVerificationSearch("passportNumber");
              }}
            />
          )}
        </>
      )}
    </>
  );

  if (part === "method") {
    return <>{methodBlock}</>;
  }

  if (part === "fields") {
    return (
      <>
        {fieldsBlock}
        {ocrModalNode}
      </>
    );
  }

  if (isModal) {
    return (
      <>
        {methodBlock}
        <div className="individual-identity-form-row">{fieldsBlock}</div>
        {ocrModalNode}
      </>
    );
  }

  return (
    <>
      {methodBlock}
      <div className="form-grid">{fieldsBlock}</div>
      {ocrModalNode}
    </>
  );
};

export default VerificationSection;
