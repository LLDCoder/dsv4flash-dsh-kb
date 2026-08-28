import { useCallback, useEffect } from 'react';
import { Form, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import {
  DEFAULT_EMAIL_FIELD,
  FormErrorPrompt,
  NmaCredentialsForm,
} from '@/components/common';
import { useForgotPwdStore } from '@/store/forgot-pwd-store';
import tishi from '@/assets/images/tishi.png';
import './UaePassNmaLinkingModal.less';

export interface UaePassNmaLinkingModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after the form passes validation; parent runs login/merge flow. */
  onLinkSubmit: (fieldsValue: Record<string, string>) => Promise<void>;
  submitLoading?: boolean;
  /** Backend error shown above the email field. */
  apiErrorMessage?: string;
  /** Click handler for forgot-password hint parsed from `apiErrorMessage`. */
  onApiErrorActionClick?: () => void;
  onApiErrorClear?: () => void;
  initialEmail?: string;
}

export default function UaePassNmaLinkingModal({
  visible,
  onClose,
  onLinkSubmit,
  submitLoading = false,
  apiErrorMessage = '',
  onApiErrorActionClick,
  onApiErrorClear,
  initialEmail = '',
}: UaePassNmaLinkingModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const history = useHistory();
  const reset = useForgotPwdStore((state) => state.reset);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (initialEmail && !initialEmail.includes('*')) {
        form.setFieldsValue({ [DEFAULT_EMAIL_FIELD]: initialEmail });
      }
    }
  }, [form, initialEmail, visible]);

  useEffect(() => {
    if (!visible) {
      onApiErrorClear?.();
    }
  }, [visible, onApiErrorClear]);

  const handleFormSubmit = useCallback(async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const fieldsValue = form.getFieldsValue() as Record<string, string>;
    await onLinkSubmit(fieldsValue);
  }, [form, onLinkSubmit]);

  return (
    <Modal
      visible={visible}
      footer={null}
      closable={false}
      centered
      destroyOnClose
      maskClosable={false}
      onCancel={onClose}
      className="nma-linking-modal"
      wrapClassName="nma-linking-wrap"
    >
      <div className="nma-linking">
        <header className="nma-linking__header">
          <button
            type="button"
            className="nma-linking__close"
            aria-label={t('common.close')}
            disabled={submitLoading}
            onClick={onClose}
          >
            <svg
              viewBox="0 0 14 14"
              width="14"
              height="14"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12.2929 0.292893C12.6834 -0.0976311 13.3164 -0.0976311 13.707 0.292893C14.0975 0.683418 14.0975 1.31643 13.707 1.70696L1.70696 13.707C1.31643 14.0975 0.683418 14.0975 0.292893 13.707C-0.0976311 13.3164 -0.0976311 12.6834 0.292893 12.2929L12.2929 0.292893Z" />
              <path d="M0.292893 0.292893C0.683418 -0.0976311 1.31643 -0.0976311 1.70696 0.292893L13.707 12.2929C14.0975 12.6834 14.0975 13.3164 13.707 13.707C13.3164 14.0975 12.6834 14.0975 12.2929 13.707L0.292893 1.70696C-0.0976311 1.31643 -0.0976311 0.683418 0.292893 0.292893Z" />
            </svg>
          </button>
        </header>
        <div className="nma-linking__body">
            <div className="nma-linking__intro">
              <div className="nma-linking__icon" aria-hidden>
                <div className="nma-linking__icon-inner">
                  <img src={tishi} alt="" />
                </div>
              </div>
              <div className="nma-linking__titles">
                <h2 className="nma-linking__title">{t('nmaLinking.title')}</h2>
                <p className="nma-linking__subtitle">{t('nmaLinking.subtitle')}</p>
              </div>
            </div>

            <NmaCredentialsForm
              className="nma-linking__credentials"
              form={form}
              onValuesChange={onApiErrorClear}
              errorHeader={
                <FormErrorPrompt
                  message={apiErrorMessage}
                  onActionClick={onApiErrorActionClick}
                  className="form-error-prompt--compact"
                />
              }
              emailLabel={t('nmaLinking.email')}
              passwordLabel={t('nmaLinking.password')}
              emailPlaceholder={t('formPlaceholders.components.nmaCredentialsForm.email')}
              passwordPlaceholder={t('formPlaceholders.components.nmaCredentialsForm.password')}
              emailRequiredMessage={t('nmaCredentialsForm.emailRequiredMessage')}
              emailPatternMessage={t('nmaCredentialsForm.emailPatternMessage')}
              passwordRequiredMessage={t('nmaCredentialsForm.passwordRequiredMessage')}
              onSubmit={handleFormSubmit}
              submitLoading={submitLoading}
              submitText={t('nmaLinking.linkButton')}
              showForgotEmail={false}
              forgotEmailText={t('login.forgotEmail')}
              onForgotEmail={() => {
                reset();
                history.push('/forgot-email');
              }}
              forgotPasswordText={t('nmaLinking.forgotPassword')}
              onForgotPassword={() => {
                reset();
                history.push('/forgot-password');
              }}
              showSignUp
              createAccountPrompt={t('nmaLinking.createAccount')}
              signUpText={t('nmaLinking.signUp')}
              onSignUp={() => history.push('/signup')}
            />

            <p className="nma-linking__note">{t('nmaLinking.note')}</p>
          </div>
      </div>
    </Modal>
  );
}
