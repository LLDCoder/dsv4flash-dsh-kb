import { useTranslation } from 'react-i18next';
import registrationSuccessfulPng from '@/assets/images/registration-successful.png';
import PublicLayout from '@/components/common/PublicLayout';
import authStorage from '@/storage/authStorage';
import { useUserStore } from '@/store/user';
import { history } from '@/utils/history';

import './index.less';

export default function PwdResetSuccess() {
    const { i18n, t } = useTranslation();
    const isRtl = i18n.language.startsWith('ar');

    const goToLogin = () => {
        authStorage.clearAuth();
        useUserStore.getState().resetUserInfo();
        history.push('/login');
    };

    return (
        <PublicLayout className="pwd-reset-success-layout">
            <div className="pwd-reset-success-page">
                <div className="pwd-reset-success-box" dir={isRtl ? 'rtl' : 'ltr'}>
                    <div className="pwd-reset-success-content">
                        <img
                            className="pwd-reset-success-image"
                            src={registrationSuccessfulPng}
                            alt=""
                        />
                        <div className="title">{t('pwdResetSuccess.title')}</div>
                        <div className="desc">{t('pwdResetSuccess.description')}</div>
                        <div className="login-btn" onClick={goToLogin}>
                            {t('pwdResetSuccess.backToLogin')}
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
