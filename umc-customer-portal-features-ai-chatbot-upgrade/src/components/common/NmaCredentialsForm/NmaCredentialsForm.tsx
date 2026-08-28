import { useEffect, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Form, Input } from 'antd';
import type { FormInstance } from 'antd/lib/form';
import EyeIcon from '@/assets/images/Eye.svg';
import EyeViewIcon from '@/assets/images/EyeView.svg';
import Loading from '@/components/common/Loading';
import './NmaCredentialsForm.less';

export const DEFAULT_EMAIL_FIELD = 'loginProvider';
export const DEFAULT_PASSWORD_FIELD = 'providerKey';

/** Shared credentials form (login + UAE PASS linking): HTML input cap. */
export const NMA_EMAIL_MAX_CHARS = 100;
export const NMA_PASSWORD_MAX_CHARS = 50;
export const NMA_EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface NmaCredentialsFormProps {
  form: FormInstance;
  emailFieldName?: string;
  passwordFieldName?: string;
  emailNormalize?: (value: unknown) => unknown;
  emailLabel: string;
  passwordLabel: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  onValuesChange?: () => void;
  passwordInvalid?: boolean;
  /** Shown in the red line under the password field when `passwordInvalid` is true */
  passwordInvalidMessage?: string;
  onSubmit: (
    event?: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) => void | Promise<void>;
  submitText: string;
  submitLoading?: boolean;
  showSignUp?: boolean;
  createAccountPrompt?: string;
  signUpText?: string;
  onSignUp?: () => void;
  forgotPasswordText: string;
  forgotEmailText:string;
  showForgotEmail?: boolean;
  onForgotEmail: () => void;
  onForgotPassword: () => void;
  className?: string;
  /** Rendered above the email field (e.g. API error callout on the Login page) */
  errorHeader?: ReactNode;
  /** Rendered at the bottom */
  errorFooter?: ReactNode;
  emailRequiredMessage: string;
  emailPatternMessage: string;
  passwordRequiredMessage: string;
}

export default function NmaCredentialsForm({
  form,
  emailFieldName = DEFAULT_EMAIL_FIELD,
  passwordFieldName = DEFAULT_PASSWORD_FIELD,
  emailNormalize,
  emailLabel,
  passwordLabel,
  emailPlaceholder,
  passwordPlaceholder,
  onValuesChange,
  passwordInvalid,
  passwordInvalidMessage = '',
  onSubmit,
  submitText,
  submitLoading = false,
  showSignUp = true,
  createAccountPrompt = '',
  signUpText = '',
  onSignUp,
  forgotPasswordText,
  forgotEmailText,
  showForgotEmail = true,
  onForgotEmail,
  onForgotPassword,
  className = '',
  errorHeader,
  errorFooter,
  emailRequiredMessage,
  emailPatternMessage,
  passwordRequiredMessage,
}: NmaCredentialsFormProps) {
  const [inputType, setInputType] = useState<'password' | 'text'>('password');
  const passwordValue = Form.useWatch(passwordFieldName, form);
  const hasPassword = String(passwordValue ?? '').length > 0;

  useEffect(() => {
    if (!hasPassword && inputType === 'text') {
      setInputType('password');
    }
  }, [hasPassword, inputType]);

  const handleEyeClick = () => {
    setInputType((prev) => (prev === 'password' ? 'text' : 'password'));
  };

  const isSubmitDisabled = () => {
    const email = String(form.getFieldValue(emailFieldName) ?? '').trim();
    const pwd = String(form.getFieldValue(passwordFieldName) ?? '').trim();
    return !email || !pwd;
  };

  const handleSubmit = async (
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) => {
    if (isSubmitDisabled() || submitLoading) {
      return;
    }

    try {
      await form.validateFields();
    } catch {
      return;
    }

    await onSubmit(event);
  };

  return (
    <div className={`nma-credentials-form ${className}`.trim()}>
      <Form
        form={form}
        onValuesChange={() => {
          onValuesChange?.();
        }}
        layout="vertical"
        className="custorm-form"
      >
        {errorHeader}
        <Form.Item
          label={emailLabel}
          name={emailFieldName}
          normalize={emailNormalize}
          rules={[
            { required: true, message: emailRequiredMessage },
            {
              pattern: NMA_EMAIL_PATTERN,
              message: emailPatternMessage,
            },
          ]}
        >
          <Input
            placeholder={emailPlaceholder}
            allowClear
            maxLength={NMA_EMAIL_MAX_CHARS}
          />
        </Form.Item>
        <Form.Item
          validateStatus={passwordInvalid ? 'error' : ''}
          className="provider-key"
          label={passwordLabel}
          name={passwordFieldName}
          normalize={(value) => (
            typeof value === 'string' ? value.trim().replace(/\s/g, '') : value
          )}
          rules={[{ required: true, message: passwordRequiredMessage }]}
        >
          <Input
            placeholder={passwordPlaceholder}
            type={inputType}
            maxLength={NMA_PASSWORD_MAX_CHARS}
            suffix={
              hasPassword
                ? inputType === 'password'
                  ? (
                    <img
                      src={EyeViewIcon}
                      alt=""
                      onClick={handleEyeClick}
                      className="icon-eye"
                    />
                  )
                  : (
                    <img
                      src={EyeIcon}
                      alt=""
                      onClick={handleEyeClick}
                      className="icon-eye-view"
                    />
                  )
                : undefined
            }
            allowClear
          />
        </Form.Item>
        {passwordInvalid && passwordInvalidMessage ? (
          <div className="password-invalid">{passwordInvalidMessage}</div>
        ) : null}
        <div className="remember-forget">
          <div className="forget-wrapper">
            {showForgotEmail ? (
              <div className="forget-email" onClick={onForgotEmail}>
                {forgotEmailText}
              </div>
            ) : null}
            <div className="forget-password" onClick={onForgotPassword}>
              {forgotPasswordText}
            </div>
          </div>
        </div>

        <Form.Item shouldUpdate noStyle>
          {() => {
            const disabled = isSubmitDisabled();
            return (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  void handleSubmit(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSubmit(e);
                }}
                className={`login-btn ${disabled ? 'disabled' : ''}`}
              >
                <Loading loading={submitLoading}>{submitText}</Loading>
              </div>
            );
          }}
        </Form.Item>
      </Form>

      {showSignUp ? (
        <div className="sign-up-wrapper">
          {createAccountPrompt}
          {onSignUp ? (
            <span className="sign-up" onClick={onSignUp}>
              {signUpText}
            </span>
          ) : null}
        </div>
      ) : null}
      {errorFooter}
    </div>
  );
}
