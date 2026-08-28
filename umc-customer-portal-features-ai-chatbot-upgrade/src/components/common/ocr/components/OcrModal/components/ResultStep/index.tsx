import React from "react";
import { DatePicker, Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import CustomButton from "@/components/common/CustomButton";
import DocumentCorrectionPreview from "@/components/common/ocr/components/DocumentCorrectionPreview";
import EmiratesIdInput from "@/components/common/EmiratesIdInput";
import type { OcrEditableFieldKey } from "../../../../type";
import type { ResultStepProps } from "../../type";
import { getPopupContainer } from "../../utils";
import "./index.less";

const ResultStep: React.FC<ResultStepProps> = ({
  documentType,
  documentLabel,
  previewUrl,
  previewFileName,
  previewFileType,
  fallbackPreviewImage,
  form,
  fieldConfigs,
  nationalityOptions,
  nationalityLoading,
  isApplyingResult,
  onCancel,
  onConfirm,
  cancelText,
}) => {
  const { t } = useTranslation();

  const renderField = (fieldConfig: ResultStepProps["fieldConfigs"][number]) => {
    const commonItemProps = {
      label: t(fieldConfig.labelKey),
      name: fieldConfig.key,
      required: fieldConfig.required,
      rules: fieldConfig.required
        ? [
            {
              required: true,
              message: t(fieldConfig.labelKey),
            },
          ]
        : undefined,
      className: `identity-ocr-modal__form-item identity-ocr-modal__form-item--${fieldConfig.key}`,
    };

    if (fieldConfig.kind === "date") {
      const dateValidationMessageMap: Partial<Record<OcrEditableFieldKey, string>> = {
        dateOfBirth: t("individualIdentity.validation.dateOfBirthRequired"),
        passportExpiryDate: t("individualIdentity.validation.passportExpiryRequired"),
      };

      return (
        <Form.Item
          {...commonItemProps}
          key={fieldConfig.key}
          rules={
            fieldConfig.required
              ? [
                  {
                    required: true,
                    message:
                      dateValidationMessageMap[fieldConfig.key] ||
                      t(fieldConfig.labelKey),
                  },
                ]
              : undefined
          }
        >
          <DatePicker
            allowClear={false}
            format="DD/MM/YYYY"
            inputReadOnly
            className="identity-ocr-modal__date-picker"
            placeholder={
              fieldConfig.placeholderKey ? t(fieldConfig.placeholderKey) : undefined
            }
            getPopupContainer={getPopupContainer}
          />
        </Form.Item>
      );
    }

    if (fieldConfig.kind === "nationality") {
      return (
        <Form.Item
          {...commonItemProps}
          key={fieldConfig.key}
          rules={
            fieldConfig.required
              ? [
                  {
                    required: true,
                    message: t("individualIdentity.validation.nationalityRequired"),
                  },
                ]
              : undefined
          }
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={nationalityOptions}
            loading={nationalityLoading}
            disabled={nationalityLoading}
            placeholder={
              fieldConfig.placeholderKey ? t(fieldConfig.placeholderKey) : undefined
            }
            getPopupContainer={getPopupContainer}
          />
        </Form.Item>
      );
    }

    if (fieldConfig.kind === "gender") {
      return (
        <Form.Item
          {...commonItemProps}
          key={fieldConfig.key}
          rules={
            fieldConfig.required
              ? [
                  {
                    required: true,
                    message: t("individualIdentity.validation.genderRequired"),
                  },
                ]
              : undefined
          }
        >
          <Select
            options={[
              { label: t("individualIdentity.gender.male"), value: 1 },
              { label: t("individualIdentity.gender.female"), value: 2 },
            ]}
            placeholder={
              fieldConfig.placeholderKey ? t(fieldConfig.placeholderKey) : undefined
            }
            getPopupContainer={getPopupContainer}
          />
        </Form.Item>
      );
    }

    const validationMessageMap: Partial<Record<OcrEditableFieldKey, string>> = {
      emiratesId: t("individualIdentity.validation.emiratesIdRequired"),
      passportNumber: t("individualIdentity.validation.passportRequired"),
      fullNameEn: t("individualIdentity.validation.nameEnglishRequired"),
    };

    return (
      <Form.Item
        {...commonItemProps}
        key={fieldConfig.key}
        rules={
          fieldConfig.required
            ? [
                {
                  required: true,
                  message: validationMessageMap[fieldConfig.key] || t(fieldConfig.labelKey),
                },
              ]
            : undefined
        }
      >
        {fieldConfig.key === "emiratesId" ? (
          <EmiratesIdInput
            placeholder={
              fieldConfig.placeholderKey ? t(fieldConfig.placeholderKey) : undefined
            }
            showInteractiveMask
          />
        ) : (
          <Input
            placeholder={
              fieldConfig.placeholderKey ? t(fieldConfig.placeholderKey) : undefined
            }
          />
        )}
      </Form.Item>
    );
  };

  return (
    <div className="identity-ocr-modal__scene identity-ocr-modal__scene--result">
      <div className="identity-ocr-modal__result">
        <h3 className="identity-ocr-modal__title">
          {t("ocr.result.successTitle")}
        </h3>
        <p className="identity-ocr-modal__description">
          {t("ocr.result.successDescription")}
        </p>
        {/* {warnings.length ? (
          <div className="identity-ocr-modal__warnings">
            {warnings.map((warning) => (
              <div key={warning} className="identity-ocr-modal__warning-item">
                <ExclamationCircleFilled />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        ) : null} */}
        <div className="identity-ocr-modal__capture-preview identity-ocr-modal__capture-preview--result">
          <DocumentCorrectionPreview
            fileUrl={previewUrl}
            fileName={previewFileName}
            fileType={previewFileType}
            documentLabel={documentLabel}
            fallbackPreviewImage={fallbackPreviewImage}
          />
        </div>
        <Form
          form={form}
          layout="vertical"
          className={`identity-ocr-modal__result-form identity-ocr-modal__result-form--${documentType}`}
        >
          <div
            className={`identity-ocr-modal__result-fields identity-ocr-modal__result-fields--${documentType}`}
          >
            {fieldConfigs.map(renderField)}
          </div>
        </Form>
      </div>
      <div className="identity-ocr-modal__actions identity-ocr-modal__actions--result">
        <CustomButton
          variant="outline"
          text={cancelText}
          customClassName="identity-ocr-modal__action-button identity-ocr-modal__action-button--outline"
          onClick={onCancel}
        />
        <CustomButton
          variant="gold"
          text={t("ocr.actions.confirm")}
          loading={isApplyingResult}
          customClassName="identity-ocr-modal__action-button identity-ocr-modal__action-button--primary"
          onClick={onConfirm}
        />
      </div>
    </div>
  );
};

export default ResultStep;
