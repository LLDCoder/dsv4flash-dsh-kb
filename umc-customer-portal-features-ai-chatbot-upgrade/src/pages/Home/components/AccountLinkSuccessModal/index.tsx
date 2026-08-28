import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import type { MergeAccountSuccessData } from '@/pages/Home/utils';
import accountLinkSuccess from '@/assets/images/accountLinkSuccess.svg';
import './AccountLinkSuccessModal.less';

function formatLoginMethods(
  v: MergeAccountSuccessData['availableLoginMethods'],
): string {
  if (v == null) return '';
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean).join(', ');
  }
  return String(v).trim();
}

export interface AccountLinkSuccessModalProps {
  visible: boolean;
  mergeData: MergeAccountSuccessData;
  onClose: () => void;
  onContinue: () => void;
}

export default function AccountLinkSuccessModal({
  visible,
  mergeData,
  onClose,
  onContinue,
}: AccountLinkSuccessModalProps) {
  const { t } = useTranslation();
  const loginEmail = mergeData.loginEmail ?? '';
  const emiratesID = mergeData.emiratesID ?? '';
  const fullName = mergeData.fullName ?? '';
  const loginMethodsText = formatLoginMethods(mergeData.availableLoginMethods);

  return (
    <Modal
      visible={visible}
      footer={null}
      closable={false}
      centered
      width={640}
      destroyOnClose
      className="account-link-success-modal"
      wrapClassName="account-link-success-wrap"
    >
      <div className="account-link-success">
        <div className="account-link-success__header">
          <button
            type="button"
            className="account-link-success__close"
            aria-label={t('common.close')}
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
        </div>
        <div className="account-link-success__body">
          <div className="account-link-success__icon" aria-hidden>
            <div className="account-link-success__icon-inner">
              <img src={accountLinkSuccess} alt="" />
            </div>
          </div>
          <div className="account-link-success__titles">
            <h2 className="account-link-success__title">
              {t('accountLinkSuccess.title')}
            </h2>
            <p className="account-link-success__subtitle">
              {t('accountLinkSuccess.subtitle')}
            </p>
          </div>

          <div className="account-link-success__card">
            <div className="account-link-success__row">
              <span className="account-link-success__label">
                {t('accountLinkSuccess.loginEmail')}
              </span>
              <span className="account-link-success__value">{loginEmail}</span>
            </div>
            <div className="account-link-success__divider" />
            <div className="account-link-success__row">
              <span className="account-link-success__label">
                {t('accountLinkSuccess.emiratesId')}
              </span>
              <span className="account-link-success__value">{emiratesID}</span>
            </div>
            <div className="account-link-success__divider" />
            <div className="account-link-success__row">
              <span className="account-link-success__label">
                {t('accountLinkSuccess.fullName')}
              </span>
              <span className="account-link-success__value">{fullName}</span>
            </div>
            <div className="account-link-success__divider" />
            <div className="account-link-success__row">
              <span className="account-link-success__label">
                {t('accountLinkSuccess.loginMethods')}
              </span>
              <span className="account-link-success__value">{loginMethodsText}</span>
            </div>
          </div>

          <div className="account-link-success__cta">
            <button
              type="button"
              className="account-link-success__btn-primary"
              onClick={onContinue}
            >
              {t('accountLinkSuccess.continueCta')}
            </button>
            <p className="account-link-success__footer-note">
              {t('accountLinkSuccess.footerNote')}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
