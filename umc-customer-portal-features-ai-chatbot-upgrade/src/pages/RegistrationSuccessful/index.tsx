import { useTranslation } from 'react-i18next';
import registrationSuccessfulPng from '@/assets/images/registration-successful.png';
import ArrowLeft from '@/assets/icons/ArrowLeft';
import PublicLayout from '@/components/common/PublicLayout';
import { history } from '@/utils/history';
import './index.less';

export default function RegistrationSuccessful() {
    const { i18n, t } = useTranslation();
    const isRtl = i18n.language.startsWith('ar');

    return (
        <PublicLayout className="registration-successful-layout">
            <div className="registration-successful-page">
                <div className="registration-successful-box" dir={isRtl ? 'rtl' : 'ltr'}>
                    <button
                        type="button"
                        className="registration-successful-back-btn"
                        onClick={() => history.goBack()}
                    >
                        <ArrowLeft className="registration-successful-back-icon" />
                    </button>
                    <div className="registration-successful-content">
                        <img
                            className="registration-successful-image"
                            src={registrationSuccessfulPng}
                            alt=""
                        />
                        <div className="registration-successful-title">{t('registerSuccess.title')}</div>
                        <div className="registration-successful-desc">{t('registerSuccess.desc')}</div>
                        <div className="registration-successful-login-btn" onClick={() => history.push('/login')}>
                            {t('registerSuccess.btn')}
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
