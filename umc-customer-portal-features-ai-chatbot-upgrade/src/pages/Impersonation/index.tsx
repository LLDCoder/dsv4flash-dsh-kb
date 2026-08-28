import { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import request from '@/utils/request';
import authStorage from '@/storage/authStorage';
import { TIME } from '@/config/constants';
import { useUserStore, type IUser } from '@/store/user';
import {
  resetUnauthorizedSessionHandling,
} from '@/utils/unauthorizedSession';
import { resetAuthenticatedLogoutState } from '@/utils/authSession';
import { appendPersistentQueryToUrl } from '@/utils/history';
import PublicLayout from '@/components/common/PublicLayout';
import './index.less';

/**
 * Same wrapped body as POST /api/User/Login: the impersonation exchange returns
 * the identical UserLoginINDot payload (token, tokenExpireMinutes, ...), so the
 * landing page reuses the normal login-success handling.
 */
interface ImpersonationLoginResponseData {
  token: string;
  tokenExpireMinutes: number;
  [key: string]: unknown;
}

function getSearchParamCaseInsensitive(
  params: URLSearchParams,
  name: string,
): string | null {
  const target = name.toLowerCase();
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return null;
}

export default function Impersonation() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const setData = useUserStore((state) => state.setData);
  // StrictMode double-invokes effects in dev; the code is one-time use, so a
  // second exchange always fails with "Invalid or expired code." Guard it.
  const exchangeStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (exchangeStartedRef.current) {
      return;
    }
    exchangeStartedRef.current = true;

    const params = new URLSearchParams(location.search || '');
    const code = String(
      getSearchParamCaseInsensitive(params, 'code') || '',
    ).trim();

    if (!code) {
      setErrorMessage(t('impersonation.expired'));
      return;
    }

    const exchange = async () => {
      try {
        const response = await request.post<ImpersonationLoginResponseData>(
          '/api/User/ImpersonationLogin',
          { code },
          { skipUnauthorizedRedirect: true },
        );

        const loginResponse = response.data;
        const token = String(loginResponse?.token || '').trim();
        const tokenExpireMinutes = Number(loginResponse?.tokenExpireMinutes);

        if (
          !token ||
          !Number.isFinite(tokenExpireMinutes) ||
          tokenExpireMinutes <= 0
        ) {
          setErrorMessage(t('impersonation.expired'));
          return;
        }

        // Reuse the exact real-login success sequence.
        resetUnauthorizedSessionHandling();
        authStorage.clearUaePassSession();
        resetAuthenticatedLogoutState();

        authStorage.setTokenInfo({
          token,
          refreshToken: '',
          expiresIn: TIME.REFRESH_TOKEN_EXPIRE,
          remember: true,
        });

        setData({
          ...(loginResponse as unknown as IUser),
        });

        history.replace(appendPersistentQueryToUrl('/'));
      } catch {
        // Any failure (expired / already used / not found / just-suspended)
        // returns the same message by design. Never auto-retry.
        setErrorMessage(t('impersonation.expired'));
      }
    };

    void exchange();
  }, [history, location.search, setData, t]);

  if (errorMessage) {
    return (
      <PublicLayout className="impersonation-layout">
        <div className="impersonation-page">
          <div className="impersonation-box">
            <div className="impersonation-title">
              {t('impersonation.failedTitle')}
            </div>
            <div className="impersonation-desc">{errorMessage}</div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout className="impersonation-layout">
      <div className="impersonation-page">
        <div className="impersonation-box">
          <Spin size="large" />
          <div className="impersonation-desc">{t('impersonation.loading')}</div>
        </div>
      </div>
    </PublicLayout>
  );
}
