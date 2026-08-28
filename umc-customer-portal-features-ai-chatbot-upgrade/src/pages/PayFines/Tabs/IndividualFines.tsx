import { useState } from "react";
import { Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import type {
  PayFineIndividualMethod,
  PayFineSearchByIndividualParams,
} from "@/services/violationFine";
import {
  isValidEmiratesId,
  isValidPassportNumber,
  isValidUid,
  stripEmiratesIdDigits,
} from "@/utils/individualIdentity/validation";

const EMIRATES_ID_DIGIT_LENGTH = 15;

type IndividualFinesFormValues = {
  Method?: PayFineIndividualMethod;
  Identifier?: string;
  Email?: string;
};

interface MethodConfig {
  value: PayFineIndividualMethod;
  labelKey: string;
  placeholderKey: string;
  requiredKey: string;
  formatKey: string;
  isValid: (value: unknown) => boolean;
}

const METHOD_CONFIGS: MethodConfig[] = [
  {
    value: "EmiratesId",
    labelKey: "individualFines.emiratesId",
    placeholderKey: "individualFines.placeholder.emiratesId",
    requiredKey: "individualFines.please.emiratesId",
    formatKey: "individualFines.please.emiratesIdFormat",
    isValid: isValidEmiratesId,
  },
  {
    value: "UnifiedNumber",
    labelKey: "individualFines.unifiedNumber",
    placeholderKey: "individualFines.placeholder.unifiedNumber",
    requiredKey: "individualFines.please.unifiedNumber",
    formatKey: "individualFines.please.unifiedNumberFormat",
    isValid: isValidUid,
  },
  {
    value: "PassportNumber",
    labelKey: "individualFines.passportNumber",
    placeholderKey: "individualFines.placeholder.passportNumber",
    requiredKey: "individualFines.please.passportNumber",
    formatKey: "individualFines.please.passportNumberFormat",
    isValid: isValidPassportNumber,
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IndividualFinesProps {
  disabled: boolean;
  onValuesChange: (params: PayFineSearchByIndividualParams) => void;
  onSearch: (params: PayFineSearchByIndividualParams) => void;
}

export default function IndividualFines({
  disabled,
  onValuesChange,
  onSearch,
}: IndividualFinesProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<IndividualFinesFormValues>();
  const [method, setMethod] = useState<PayFineIndividualMethod | undefined>();
  const [canSearch, setCanSearch] = useState(false);

  const methodConfig = METHOD_CONFIGS.find((item) => item.value === method);

  const toParams = (
    values: IndividualFinesFormValues,
  ): PayFineSearchByIndividualParams => ({
    Method: (values.Method ?? "EmiratesId") as PayFineIndividualMethod,
    Identifier: values.Identifier ?? "",
    Email: values.Email ?? "",
  });

  const handleValuesChange = (
    _: Partial<IndividualFinesFormValues>,
    values: IndividualFinesFormValues,
  ) => {
    const config = METHOD_CONFIGS.find((item) => item.value === values.Method);
    setCanSearch(
      Boolean(
        config &&
          values.Identifier?.trim() &&
          config.isValid(values.Identifier) &&
          values.Email?.trim() &&
          EMAIL_PATTERN.test(values.Email.trim()),
      ),
    );
    onValuesChange(toParams(values));
  };

  const handleMethodChange = (value?: PayFineIndividualMethod) => {
    setMethod(value);
    form.setFieldsValue({ Identifier: undefined, Email: undefined });
    setCanSearch(false);
  };

  const handleFinish = (values: IndividualFinesFormValues) => {
    if (!disabled && canSearch) onSearch(toParams(values));
  };

  return (
    <div className="individual-fines">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={handleValuesChange}
        className="custorm-form individual-fines-form"
      >
        <Form.Item
          className="individual-fines-method"
          name="Method"
          label={t("individualFines.selectMethod")}
          rules={[
            {
              required: true,
              message: t("individualFines.please.selectMethod"),
            },
          ]}
        >
          <Select
            allowClear
            placeholder={t("individualFines.placeholder.selectMethod")}
            onChange={handleMethodChange}
          >
            {METHOD_CONFIGS.map((item) => (
              <Select.Option key={item.value} value={item.value}>
                {t(item.labelKey)}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {methodConfig ? (
          <div className="individual-fines-input">
            <Form.Item
              name="Identifier"
              label={t(methodConfig.labelKey)}
              normalize={
                methodConfig.value === "EmiratesId"
                  ? (value: unknown) =>
                      stripEmiratesIdDigits(value).slice(
                        0,
                        EMIRATES_ID_DIGIT_LENGTH,
                      )
                  : undefined
              }
              rules={[
                {
                  required: true,
                  message: t(methodConfig.requiredKey),
                },
                {
                  validator: (_rule, value) =>
                    !value || methodConfig.isValid(value)
                      ? Promise.resolve()
                      : Promise.reject(new Error(t(methodConfig.formatKey))),
                },
              ]}
            >
              <Input allowClear placeholder={t(methodConfig.placeholderKey)} />
            </Form.Item>
            <Form.Item
              name="Email"
              label={t("individualFines.email")}
              rules={[
                {
                  required: true,
                  message: t("individualFines.please.email"),
                },
                {
                  type: "email",
                  message: t("individualFines.please.emailFormat"),
                },
              ]}
            >
              <Input allowClear placeholder={t("individualFines.placeholder.email")} />
            </Form.Item>
          </div>
        ) : null}
        <div className="pay-fines-tabs-btns">
          <button
            type="submit"
            className={`pay-fines-tabs-btn-search${
              disabled || !canSearch ? " disabled" : ""
            }`}
          >
            {t("common.search")}
          </button>
        </div>
      </Form>
    </div>
  );
}
