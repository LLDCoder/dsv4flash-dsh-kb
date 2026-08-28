import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import CustomMessage from '@/components/common/CustomMessage';
import { TIME } from '@/config/constants';
import { useDeviceType } from '@/hooks/useDeviceType';
import { interpretCanMergeResponse } from '@/pages/Home/utils';
import type { AccountMergeMode } from '@/pages/Home/components/AccountMergeConfirmModal';
import {
  getCanMerge,
  postUaepassCallBackGetTokenByCodeMerge,
  postUaepassUserInfoToLogin,
} from '@/services/user';
import { requestUaePassLogout } from '@/services/uaePassLogout';
import authStorage from '@/storage/authStorage';
import { type IUser, useUserStore } from '@/store/user';
import {
  performAuthenticatedLogout,
  resetAuthenticatedLogoutState,
} from '@/utils/authSession';
import {
  AUTH_SESSION_SYNC_ACTION,
  clearAuthSessionLoginPending,
  markAuthSessionLoginPending,
  publishAuthSessionSync,
} from '@/utils/authSessionSync';
import { appendPersistentQueryToUrl } from '@/utils/history';
import { clearPendingLoginRedirect } from '@/utils/pendingLoginRedirect';
import {
  clearUaePassAccountMergeHandoff,
  clearUaePassLoginFlow,
  getUaePassLoginFlow,
  markUaePassAccountMergeHandoffInactive,
  readUaePassAccountMergeHandoff,
  saveUaePassAccountMergeHandoff,
} from '@/utils/uaePassLoginFlow';
import { getUaepassRedirectUriBaseFromAuthorizeUrl } from '@/utils/uaepassRedirectUri';
import { resetUnauthorizedSessionHandling } from '@/utils/unauthorizedSession';

export interface UaePassAccountMergeState {
  mode: AccountMergeMode;
  matchedAccountEmail: string;
  targetUserId: string;
  redirectPath: string;
}

interface UseUaePassLoginCallbackOptions {
  authenticatedRedirectPath: string;
}

/** Business status the API returns when the account exists but has been deactivated. */
const SUSPENDED_ACCOUNT_STATUS_CODE = 403;

/**
 * Reads the API's business status from either shape the request layer produces: it copies the code onto
 * the error when the transport succeeded and only the payload reported a failure, but a real HTTP error
 * status carries the code in the response body instead.
 */
const readBusinessStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const attached = (error as { statusCode?: unknown }).statusCode;
  if (typeof attached === 'number') {
    return attached;
  }

  const body = (error as { response?: { data?: { statusCode?: unknown } } })
    .response?.data;
  return typeof body?.statusCode === 'number' ? body.statusCode : undefined;
};

/**
 * Picks the notice the customer sees when UAE PASS sign-in is refused. A suspended account is named
 * explicitly and in the customer's own language - "UAE PASS login failed. Please try again." sends them
 * into a retry loop for something retrying cannot fix. Any other API rejection shows the server's own
 * reason (already sanitised by the response interceptor), and transport or parsing errors fall back to
 * the generic notice because their messages are written for developers.
 */
const resolveLoginFailureMessage = (
  error: unknown,
  messages: { suspended: string; fallback: string },
) => {
  const statusCode = readBusinessStatusCode(error);
  if (statusCode === SUSPENDED_ACCOUNT_STATUS_CODE) {
    return messages.suspended;
  }

  if (typeof statusCode !== 'number' || !(error instanceof Error)) {
    return messages.fallback;
  }

  return error.message.trim() || messages.fallback;
};

const getSearchParamCaseInsensitive = (
  params: URLSearchParams,
  name: string,
) => {
  const target = name.toLowerCase();
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return null;
};

type InitialAccountMergeState = {
  accountMerge: UaePassAccountMergeState | null;
  expired: boolean;
};

const readAccountMergeHandoff = (): InitialAccountMergeState => {
  const { handoff, expired } = readUaePassAccountMergeHandoff();
  if (
    !handoff ||
    !authStorage.isTokenValid(0) ||
    !authStorage.isUaePassSession()
  ) {
    if (handoff) {
      clearUaePassAccountMergeHandoff();
    }
    return {
      accountMerge: null,
      expired: handoff ? false : expired,
    };
  }

  return {
    accountMerge: {
      mode: handoff.mode,
      matchedAccountEmail: handoff.matchedAccountEmail,
      targetUserId: handoff.targetUserId,
      redirectPath: handoff.redirectPath,
    },
    expired: false,
  };
};

export function useUaePassLoginCallback({
  authenticatedRedirectPath,
}: UseUaePassLoginCallbackOptions) {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const detectedDeviceType = useDeviceType();
  const deviceType =
    typeof detectedDeviceType === 'number' ? detectedDeviceType : 2;
  const isMountedRef = useRef(true);
  const handledSearchRef = useRef<string | null>(null);
  const callbackRunRef = useRef(0);
  const expiredHandoffHandledRef = useRef(false);
  const [initialAccountMergeState] = useState(readAccountMergeHandoff);
  const [accountMerge, setAccountMerge] =
    useState<UaePassAccountMergeState | null>(
      initialAccountMergeState.accountMerge,
    );

  const callbackParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      code: getSearchParamCaseInsensitive(params, 'code'),
      state: getSearchParamCaseInsensitive(params, 'state'),
    };
  }, [location.search]);
  const hasUaePassCallback = Boolean(
    callbackParams.code && callbackParams.state,
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      !initialAccountMergeState.expired ||
      hasUaePassCallback ||
      expiredHandoffHandledRef.current
    ) {
      return;
    }

    expiredHandoffHandledRef.current = true;
    callbackRunRef.current += 1;
    handledSearchRef.current = location.search;
    clearUaePassLoginFlow();
    localStorage.removeItem('uaepassType');
    resetUnauthorizedSessionHandling();
    performAuthenticatedLogout({
      clearUserStorage: true,
      onLocalLogout: () => useUserStore.getState().resetUserInfo(),
    });
  }, [hasUaePassCallback, initialAccountMergeState.expired, location.search]);

  useEffect(() => {
    if (!accountMerge) {
      return;
    }

    const handlePageHide = () => {
      markUaePassAccountMergeHandoffInactive();
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [accountMerge]);

  useEffect(() => {
    if (!hasUaePassCallback || handledSearchRef.current === location.search) {
      return;
    }
    handledSearchRef.current = location.search;
    const callbackRunId = callbackRunRef.current + 1;
    callbackRunRef.current = callbackRunId;
    const isCurrentCallbackRun = () =>
      isMountedRef.current && callbackRunRef.current === callbackRunId;

    const completeCallback = async () => {
      const loginFlow = getUaePassLoginFlow();
      const redirectPath =
        loginFlow?.redirectPath || appendPersistentQueryToUrl('/home');

      try {
        localStorage.setItem('uaepassType', '1');

        const code = callbackParams.code ?? '';
        const state = callbackParams.state ?? '';
        if (!loginFlow || loginFlow.state !== state) {
          clearUaePassLoginFlow();
          throw new Error('Invalid UAE PASS login state');
        }
        const callbackUrl = getUaepassRedirectUriBaseFromAuthorizeUrl(
          import.meta.env.VITE_UAE_PASS_URL as string | undefined,
        );
        const tokenResponse = await postUaepassCallBackGetTokenByCodeMerge({
          code,
          state,
          url: callbackUrl ?? '',
        });
        if (!isCurrentCallbackRun()) {
          return;
        }
        const accessToken = String(
          tokenResponse?.data?.access_token ?? '',
        ).trim();
        if (!accessToken) {
          throw new Error('Invalid UAE PASS access token response');
        }

        const userInfo = await postUaepassUserInfoToLogin<IUser>(
          accessToken,
          deviceType,
        );
        if (!isCurrentCallbackRun()) {
          return;
        }
        if (!userInfo?.isSuccess || !userInfo.data?.token) {
          throw new Error('Invalid UAE PASS user information response');
        }
        if (!markAuthSessionLoginPending()) {
          throw new Error('Unable to persist UAE PASS login state');
        }

        resetUnauthorizedSessionHandling();
        authStorage.setTokenInfo({
          token: userInfo.data.token,
          refreshToken: '',
          expiresIn: TIME.REFRESH_TOKEN_EXPIRE,
          remember: true,
        });
        authStorage.markUaePassSession();
        resetAuthenticatedLogoutState();
        useUserStore.getState().setData(userInfo.data);

        const canMergeResponse = await getCanMerge({
          skipErrorToast: true,
          skipUnauthorizedRedirect: true,
        });
        if (!isCurrentCallbackRun()) {
          return;
        }
        const mergeEligibility = interpretCanMergeResponse(
          canMergeResponse,
          String(userInfo.data.email ?? ''),
        );
        clearUaePassLoginFlow();

        if (mergeEligibility.mode === 'none') {
          clearUaePassAccountMergeHandoff();
          clearPendingLoginRedirect();
          publishAuthSessionSync(AUTH_SESSION_SYNC_ACTION.LOGIN);
          history.replace(redirectPath);
          return;
        }

        const handoff: UaePassAccountMergeState = {
          mode: mergeEligibility.mode,
          matchedAccountEmail:
            mergeEligibility.mode === 'forced'
              ? mergeEligibility.matchedAccountEmail
              : '',
          targetUserId:
            mergeEligibility.mode === 'forced'
              ? mergeEligibility.targetUserId
              : '',
          redirectPath,
        };
        saveUaePassAccountMergeHandoff(handoff);
        setAccountMerge(handoff);
        history.replace(appendPersistentQueryToUrl('/login'));
      } catch (error) {
        if (!isCurrentCallbackRun()) {
          return;
        }
        console.error('UAE PASS login callback failed.');
        clearUaePassAccountMergeHandoff();
        clearUaePassLoginFlow();
        authStorage.clearAuth();
        clearAuthSessionLoginPending();
        localStorage.removeItem('uaepassType');
        useUserStore.getState().resetUserInfo();

        // UAE PASS is signed in at this point - the customer just authenticated with it - while this app
        // has no session at all. Leaving the identity provider signed in traps the customer in a loop:
        // every retry is approved by UAE PASS without a prompt, fails here again, and never offers the
        // chance to pick a different account. Ending the identity-provider session is therefore part of
        // failing the login, not just part of logging out.
        const failureMessage = resolveLoginFailureMessage(error, {
          suspended: t('uaePassResult.accountSuspended'),
          fallback: t('uaePassResult.loginFailed'),
        });
        const logoutUrl = await requestUaePassLogout();
        if (!isCurrentCallbackRun()) {
          return;
        }

        if (logoutUrl) {
          window.location.assign(logoutUrl);
          return;
        }

        CustomMessage.error(failureMessage, 4.5);
        history.replace(appendPersistentQueryToUrl('/login'));
      }
    };

    void completeCallback();
  }, [
    callbackParams.code,
    callbackParams.state,
    deviceType,
    hasUaePassCallback,
    history,
    location.search,
    t,
  ]);

  const completeAccountMergeFlow = useCallback(() => {
    const redirectPath =
      accountMerge?.redirectPath || authenticatedRedirectPath;
    clearUaePassAccountMergeHandoff();
    clearUaePassLoginFlow();
    clearPendingLoginRedirect();
    setAccountMerge(null);
    publishAuthSessionSync(AUTH_SESSION_SYNC_ACTION.LOGIN);
    history.replace(redirectPath);
  }, [accountMerge?.redirectPath, authenticatedRedirectPath, history]);

  const logoutAccountMergeFlow = useCallback(() => {
    callbackRunRef.current += 1;
    handledSearchRef.current = location.search;
    clearUaePassAccountMergeHandoff();
    clearUaePassLoginFlow();
    setAccountMerge(null);
    localStorage.removeItem('uaepassType');
    resetUnauthorizedSessionHandling();
    performAuthenticatedLogout({
      clearUserStorage: true,
      onLocalLogout: () => useUserStore.getState().resetUserInfo(),
    });
  }, [location.search]);

  const discardUaePassLoginFlow = useCallback(() => {
    callbackRunRef.current += 1;
    handledSearchRef.current = location.search;
    clearUaePassAccountMergeHandoff();
    clearUaePassLoginFlow();
    setAccountMerge(null);
    authStorage.clearUaePassSession();
    clearAuthSessionLoginPending();
    localStorage.removeItem('uaepassType');
    useUserStore.getState().resetUserInfo();
  }, [location.search]);

  return {
    accountMerge,
    hasUaePassCallback,
    completeAccountMergeFlow,
    logoutAccountMergeFlow,
    discardUaePassLoginFlow,
  };
}
