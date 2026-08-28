import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { CustomButton } from '@/components/common';
import { maskEmailLocalForDisplay } from '@/pages/Home/utils';
import tishi from '@/assets/images/tishi.png';
import './MatchedAccountLinkModal.less';

export interface MatchedAccountLinkModalProps {
  visible: boolean;
  matchedAccountEmail: string;
  onClose: () => void;
  onLinkAccount: () => void;
  loading?: boolean;
}

export default function MatchedAccountLinkModal({
  visible,
  matchedAccountEmail,
  onClose,
  onLinkAccount,
  loading = false,
}: MatchedAccountLinkModalProps) {
  const { t } = useTranslation();
  const email = matchedAccountEmail.includes('*')
    ? matchedAccountEmail
    : maskEmailLocalForDisplay(matchedAccountEmail);

  return (
    <Modal
      visible={visible}
      footer={null}
      closable={false}
      centered
      width={640}
      destroyOnClose
      maskClosable={false}
      keyboard={!loading}
      onCancel={onClose}
      className="matched-account-link-modal"
      wrapClassName="matched-account-link-wrap"
    >
      <div className="matched-account-link">
        <header className="matched-account-link__header">
          <button
            type="button"
            className="matched-account-link__close"
              aria-label={t('common.close')}
            disabled={loading}
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
        <div className="matched-account-link__body">
          <div className="matched-account-link__intro">
            <div className="matched-account-link__icon" aria-hidden>
              <img src={tishi} alt="" />
            </div>
            <div className="matched-account-link__titles">
              <h2 className="matched-account-link__title">
                {t('matchedAccountLink.title')}
              </h2>
              <p className="matched-account-link__subtitle">
                {t('matchedAccountLink.subtitle')}
              </p>
            </div>
          </div>

          <div className="matched-account-link__actions">
            <div className="matched-account-link__details">
              <span className="matched-account-link__label">
                {t('matchedAccountLink.emailLabel')}
              </span>
              <span className="matched-account-link__value">{email}</span>
            </div>

            <CustomButton
              text={t('matchedAccountLink.linkCta')}
              variant="primary"
              size="large"
              loading={loading}
              disabled={loading}
              customClassName="matched-account-link__button"
              onClick={onLinkAccount}
            />
          </div>

          <p className="matched-account-link__footnote">
            {t('matchedAccountLink.footerNote')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
