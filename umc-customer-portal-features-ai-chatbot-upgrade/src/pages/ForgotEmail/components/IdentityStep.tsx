import { Checkbox, Form, Input } from "antd";
import type { CheckboxChangeEvent } from "antd/lib/checkbox";
import { useTranslation } from "react-i18next";
import { isValidEmiratesId } from "@/utils/individualIdentity/validation";
import type { ForgotEmailIdentityValues } from "../types";
import FlowActions from "./FlowActions";

const LICENSE_NUMBER_PATTERN = /^[A-Za-z0-9-]+$/;
const EMIRATES_ID_MAX_DIGITS = 15;

const getTrimmedValue = (value: unknown) => String(value ?? "").trim();

const isLicenseNumber = (value: unknown) =>
  LICENSE_NUMBER_PATTERN.test(getTrimmedValue(value));

const formatEmiratesId = (value: unknown) => {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, EMIRATES_ID_MAX_DIGITS);
  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 7),
    digits.slice(7, 14),
    digits.slice(14),
  ].filter(Boolean);

  return groups.join("-");
};

interface IdentityStepProps {
  initialValues: ForgotEmailIdentityValues;
  noMediaLicense: boolean;
  isSubmitting?: boolean;
  onBack: () => void;
  onContinue: (values: ForgotEmailIdentityValues) => void | Promise<void>;
  onMediaLicenseChange: (noMediaLicense: boolean) => void;
}

export default function IdentityStep({
  initialValues,
  noMediaLicense,
  isSubmitting = false,
  onBack,
  onContinue,
  onMediaLicenseChange,
}: IdentityStepProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ForgotEmailIdentityValues>();
  const individualAccount = Boolean(Form.useWatch("individualAccount", form));
  const mediaLicenseNumber = Form.useWatch("mediaLicenseNumber", form);
  const emiratesId = Form.useWatch("emiratesId", form);
  const commercialLicenseNumber = Form.useWatch(
    "commercialLicenseNumber",
    form
  );
  const primaryIdentifierValid = noMediaLicense
    ? isValidEmiratesId(emiratesId)
    : isLicenseNumber(mediaLicenseNumber);
  const commercialLicenseValid = individualAccount
    ? true
    : isLicenseNumber(commercialLicenseNumber);
  const canContinue = primaryIdentifierValid && commercialLicenseValid;
  const licenseRules = [
    {
      required: true,
      message: t("forgotEmail.required"),
    },
    {
      validator: (_: unknown, value: unknown) =>
        !getTrimmedValue(value) || isLicenseNumber(value)
          ? Promise.resolve()
          : Promise.reject(new Error(t("forgotEmail.licenseFormat"))),
    },
  ];

  const handleMediaLicenseTabChange = (nextNoMediaLicense: boolean) => {
    if (nextNoMediaLicense === noMediaLicense) return;

    onMediaLicenseChange(nextNoMediaLicense);
    form.setFieldsValue({
      mediaLicenseNumber: undefined,
      emiratesId: undefined,
    });
    form.setFields([
      { name: "mediaLicenseNumber", errors: [] },
      { name: "emiratesId", errors: [] },
    ]);
  };

  const handleIndividualAccountChange = (event: CheckboxChangeEvent) => {
    form.setFieldsValue({ individualAccount: event.target.checked });
    form.setFields([{ name: "commercialLicenseNumber", errors: [] }]);
  };

  return (
    <>
      <div
        aria-label={t("forgotEmail.mediaLicenseSelection")}
        className="forgot-email-license-tabs"
        role="group"
      >
        <button
          aria-pressed={!noMediaLicense}
          className={`forgot-email-license-tab${
            noMediaLicense ? "" : " active"
          }`}
          onClick={() => handleMediaLicenseTabChange(false)}
          type="button"
        >
          {t("forgotEmail.hasMediaLicense")}
        </button>
        <button
          aria-pressed={noMediaLicense}
          className={`forgot-email-license-tab${
            noMediaLicense ? " active" : ""
          }`}
          onClick={() => handleMediaLicenseTabChange(true)}
          type="button"
        >
          {t("forgotEmail.noMediaLicense")}
        </button>
      </div>
      <Form
        className="forgot-email-form custorm-form"
        form={form}
        initialValues={initialValues}
        layout="vertical"
        onFinish={onContinue}
      >
        {noMediaLicense ? (
          <Form.Item
            label={t("forgotEmail.emiratesId")}
            name="emiratesId"
            normalize={formatEmiratesId}
            rules={[
              {
                required: true,
                message: t("forgotEmail.required"),
              },
              {
                validator: (_: unknown, value: unknown) =>
                  !getTrimmedValue(value) || isValidEmiratesId(value)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(t("forgotEmail.invalidEmiratesId"))
                      ),
              },
            ]}
          >
            <Input
              allowClear
              inputMode="numeric"
              maxLength={18}
              placeholder={t("forgotEmail.emiratesIdPlaceholder")}
            />
          </Form.Item>
        ) : (
          <Form.Item
            label={t("forgotEmail.mediaLicenseNumber")}
            name="mediaLicenseNumber"
            rules={licenseRules}
          >
            <Input
              allowClear
              placeholder={t("forgotEmail.mediaLicenseNumberPlaceholder")}
            />
          </Form.Item>
        )}

        <Form.Item
          label={t("forgotEmail.commercialLicenseNumber")}
          name="commercialLicenseNumber"
          rules={individualAccount ? [] : licenseRules}
        >
          <Input
            allowClear
            disabled={individualAccount}
            placeholder={t("forgotEmail.commercialLicenseNumberPlaceholder")}
          />
        </Form.Item>

        <Form.Item
          className="forgot-email-checkbox-item"
          name="individualAccount"
          valuePropName="checked"
        >
          <Checkbox
            className="forgot-email-checkbox"
            onChange={handleIndividualAccountChange}
          >
            {t("forgotEmail.individualAccount")}
          </Checkbox>
        </Form.Item>

        <FlowActions
          backLabel={t("forgotEmail.back")}
          onBack={onBack}
          primaryDisabled={!canContinue || isSubmitting}
          primaryLoading={isSubmitting}
          primaryLabel={t("forgotEmail.continue")}
          primaryType="submit"
        />
      </Form>
    </>
  );
}
