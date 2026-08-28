import { Form, Input, Radio } from "antd";
import type { RadioChangeEvent } from "antd/lib/radio";
import { useTranslation } from "react-i18next";
import type { ForgotEmailCandidate } from "@/services/user";
import { OTP_LENGTH } from "../types";
import FlowActions from "./FlowActions";
import OtpCodeInput from "./OtpCodeInput";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountSelectionStepProps {
  accounts: ForgotEmailCandidate[];
  isSubmitting?: boolean;
  selectedAccountToken?: string;
  onBack: () => void;
  onContinue: () => void | Promise<void>;
  onSelect: (accountToken: string) => void;
}

const getCandidateName = (account: ForgotEmailCandidate, language: string) => {
  const isArabic = language.toLowerCase().startsWith("ar");

  return isArabic
    ? account.displayNameAr || account.displayNameEn || ""
    : account.displayNameEn || account.displayNameAr || "";
};

export function AccountSelectionStep({
  accounts,
  isSubmitting = false,
  selectedAccountToken,
  onBack,
  onContinue,
  onSelect,
}: AccountSelectionStepProps) {
  const { i18n, t } = useTranslation();

  const handleChange = (event: RadioChangeEvent) => {
    onSelect(String(event.target.value ?? ""));
  };

  return (
    <div className="forgot-email-step">
      <h1 className="forgot-email-title">{t("forgotEmail.title")}</h1>
      <section className="forgot-email-info-panel forgot-email-account-panel">
        <div className="forgot-email-panel-heading">
          <h2>{t("forgotEmail.selectAccountTitle")}</h2>
          <p>{t("forgotEmail.selectAccountDescription")}</p>
        </div>
        <Radio.Group
          className="forgot-email-account-radio-group"
          disabled={isSubmitting}
          onChange={handleChange}
          value={selectedAccountToken}
        >
          {accounts.map((account) => (
            <Radio key={account.accountToken} value={account.accountToken}>
              <span className="forgot-email-account-option">
                <span>
                  {t("forgotEmail.accountType")}: {account.accountType || "-"}
                </span>
                <span>
                  {t("forgotEmail.accountName")}:{" "}
                  {getCandidateName(account, i18n.language) || "-"}
                </span>
                <span className="forgot-email-masked-value" dir="ltr">
                  {account.maskedEmail || "-"}
                </span>
              </span>
            </Radio>
          ))}
        </Radio.Group>
      </section>
      <FlowActions
        backLabel={t("forgotEmail.back")}
        onBack={onBack}
        onPrimary={onContinue}
        primaryDisabled={!selectedAccountToken || isSubmitting}
        primaryLabel={t("forgotEmail.continue")}
        primaryLoading={isSubmitting}
        primaryWide
      />
    </div>
  );
}

interface AccountFoundStepProps {
  isSending?: boolean;
  maskedEmail?: string | null;
  resetDisabled?: boolean;
  onBack: () => void;
  onReset: () => void | Promise<void>;
}

export function AccountFoundStep({
  isSending = false,
  maskedEmail,
  resetDisabled = false,
  onBack,
  onReset,
}: AccountFoundStepProps) {
  const { t } = useTranslation();

  return (
    <div className="forgot-email-step">
      <h1 className="forgot-email-title">{t("forgotEmail.title")}</h1>
      <section className="forgot-email-info-panel forgot-email-result-panel">
        <h2>{t("forgotEmail.accountFoundTitle")}</h2>
        <p>{t("forgotEmail.loginEmailLabel")}</p>
        <div className="forgot-email-result-email" dir="ltr">
          {maskedEmail || "-"}
        </div>
        <p className="forgot-email-result-note">
          {t("forgotEmail.confirmationSent")}
        </p>
      </section>
      <FlowActions
        backLabel={t("forgotEmail.back")}
        onBack={onBack}
        onPrimary={onReset}
        primaryDisabled={resetDisabled}
        primaryLoading={isSending}
        primaryLabel={t("forgotEmail.resetLoginEmail")}
        primaryWide
      />
    </div>
  );
}

interface OtpStepProps {
  code: string[];
  deadline: number | null;
  onBack: () => void;
  onChange: (code: string[]) => void;
  onContinue: () => void | Promise<void>;
  onResend: () => void | Promise<void>;
}

interface CurrentEmailOtpStepProps extends OtpStepProps {
  maskedEmail: string;
  isResending?: boolean;
  isSubmitting?: boolean;
  resendDisabled?: boolean;
}

export function CurrentEmailOtpStep({
  code,
  deadline,
  maskedEmail,
  isResending = false,
  isSubmitting = false,
  resendDisabled = false,
  onBack,
  onChange,
  onContinue,
  onResend,
}: CurrentEmailOtpStepProps) {
  const { t } = useTranslation();
  const codeComplete = code.join("").length === OTP_LENGTH;

  return (
    <div className="forgot-email-step forgot-email-otp-step">
      <h1 className="forgot-email-title">{t("forgotEmail.resetTitle")}</h1>
      <section className="forgot-email-info-panel forgot-email-phone-panel">
        <h2>{t("forgotEmail.verifyIdentity")}</h2>
        <p>{t("forgotEmail.currentEmailCodeSent")}</p>
        <div className="forgot-email-phone-value" dir="ltr">
          {maskedEmail || "-"}
        </div>
      </section>
      <p className="forgot-email-code-prompt">
        {t("forgotEmail.enterCodePrompt")}
      </p>
      <OtpCodeInput
        code={code}
        deadline={deadline}
        disabled={isSubmitting}
        isResending={isResending}
        onChange={onChange}
        onResend={onResend}
        resendDisabled={resendDisabled}
      />
      <FlowActions
        backLabel={t("forgotEmail.back")}
        onBack={onBack}
        onPrimary={onContinue}
        primaryDisabled={!codeComplete}
        primaryLoading={isSubmitting}
        primaryLabel={t("forgotEmail.verify")}
      />
    </div>
  );
}

interface NewEmailFormValues {
  newEmail?: string;
}

interface NewEmailStepProps {
  newEmail: string;
  isSubmitting?: boolean;
  onBack: () => void;
  onChange: (email: string) => void;
  onContinue: (email: string) => void | Promise<void>;
}

export function NewEmailStep({
  newEmail,
  isSubmitting = false,
  onBack,
  onChange,
  onContinue,
}: NewEmailStepProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<NewEmailFormValues>();
  const watchedEmail = Form.useWatch("newEmail", form);
  const normalizedEmail = String(watchedEmail ?? newEmail ?? "").trim();
  const canSave = EMAIL_PATTERN.test(normalizedEmail);

  return (
    <div className="forgot-email-step forgot-email-new-email-step">
      <h1 className="forgot-email-title">{t("forgotEmail.resetTitle")}</h1>
      <Form
        className="forgot-email-new-email-form custorm-form"
        disabled={isSubmitting}
        form={form}
        initialValues={{ newEmail }}
        layout="vertical"
        onFinish={(values) => onContinue(String(values.newEmail ?? "").trim())}
        onValuesChange={(_, values) => onChange(String(values.newEmail ?? ""))}
      >
        <Form.Item
          label={t("forgotEmail.newEmailLabel")}
          name="newEmail"
          rules={[
            {
              required: true,
              message: t("forgotEmail.required"),
            },
            {
              pattern: EMAIL_PATTERN,
              message: t("forgotEmail.invalidEmail"),
            },
          ]}
        >
          <Input
            allowClear
            autoComplete="email"
            placeholder={t("forgotEmail.newEmailPlaceholder")}
            type="email"
          />
        </Form.Item>
        <FlowActions
          backLabel={t("forgotEmail.back")}
          onBack={onBack}
          primaryDisabled={!canSave}
          primaryLoading={isSubmitting}
          primaryLabel={t("forgotEmail.continueToVerify")}
          primaryType="submit"
        />
      </Form>
    </div>
  );
}

interface EmailOtpStepProps extends OtpStepProps {
  email: string;
  isResending?: boolean;
  isSubmitting?: boolean;
  resendDisabled?: boolean;
}

export function EmailOtpStep({
  code,
  deadline,
  email,
  isResending = false,
  isSubmitting = false,
  resendDisabled = false,
  onBack,
  onChange,
  onContinue,
  onResend,
}: EmailOtpStepProps) {
  const { t } = useTranslation();
  const codeComplete = code.join("").length === OTP_LENGTH;

  return (
    <div className="forgot-email-step forgot-email-otp-step forgot-email-email-otp-step">
      <h1 className="forgot-email-title">{t("forgotEmail.emailOtpTitle")}</h1>
      <p className="forgot-email-email-otp-description">
        {t("forgotEmail.emailCodeSent")} <strong dir="ltr">{email}</strong>
      </p>
      <OtpCodeInput
        code={code}
        deadline={deadline}
        disabled={isSubmitting}
        isResending={isResending}
        onChange={onChange}
        onResend={onResend}
        resendDisabled={resendDisabled}
      />
      <FlowActions
        backLabel={t("forgotEmail.back")}
        onBack={onBack}
        onPrimary={onContinue}
        primaryDisabled={!codeComplete}
        primaryLoading={isSubmitting}
        primaryLabel={t("forgotEmail.continue")}
      />
    </div>
  );
}
