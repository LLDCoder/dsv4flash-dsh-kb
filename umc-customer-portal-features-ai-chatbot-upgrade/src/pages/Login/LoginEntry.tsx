import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import AccountMergeConfirmModal from '@/pages/Home/components/AccountMergeConfirmModal';
import { authService } from '@/services/auth';
import {
  AUTH_STORAGE_KEYS,
  AUTH_USER_STORAGE_KEY,
} from '@/storage/authStorage';
import { isAuthSessionLoginPending } from '@/utils/authSessionSync';
import { appendPersistentQueryToUrl } from '@/utils/history';
import {
  clearPendingLoginRedirect,
  readPendingLoginRedirect,
} from '@/utils/pendingLoginRedirect';
import { useUaePassLoginCallback } from './hooks/useUaePassLoginCallback';
import { resolveAuthenticatedLoginRedirectPath } from './loginRedirect';

interface LoginEntryProps {
  children: (
    authenticatedRedirectPath: string,
    discardUaePassLoginFlow: () => void,
  ) => ReactNode;
}

export default function LoginEntry({ children }: LoginEntryProps) {
  const history = useHistory();
  const location = useLocation();
  const authRedirectingRef = useRef(false);
  const authenticatedRedirectPath = useMemo(
    () =>
      resolveAuthenticatedLoginRedirectPath(
        location.search,
        appendPersistentQueryToUrl,
        readPendingLoginRedirect(),
      ),
    [location.search],
  );
  const {
    accountMerge,
    hasUaePassCallback,
    completeAccountMergeFlow,
    logoutAccountMergeFlow,
    discardUaePassLoginFlow,
  } = useUaePassLoginCallback({ authenticatedRedirectPath });

  useEffect(() => {
    if (accountMerge || hasUaePassCallback) {
      return undefined;
    }

    const redirectAuthenticatedUser = () => {
      if (
        authRedirectingRef.current ||
        isAuthSessionLoginPending() ||
        !authService.isAuthenticated()
      ) {
        return;
      }

      authRedirectingRef.current = true;
      clearPendingLoginRedirect();
      history.replace(authenticatedRedirectPath);
    };

    const handleStorageChange = (event: StorageEvent) => {
      const changedKey = String(event.key || '').trim();

      if (
        !changedKey ||
        (!Object.values(AUTH_STORAGE_KEYS).some((key) => key === changedKey) &&
          changedKey !== AUTH_USER_STORAGE_KEY)
      ) {
        return;
      }

      redirectAuthenticatedUser();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      redirectAuthenticatedUser();
    };

    redirectAuthenticatedUser();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', redirectAuthenticatedUser);
    window.addEventListener('auth-changed', redirectAuthenticatedUser);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', redirectAuthenticatedUser);
      window.removeEventListener('auth-changed', redirectAuthenticatedUser);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accountMerge, authenticatedRedirectPath, hasUaePassCallback, history]);

  if (
    authService.isAuthenticated() &&
    !isAuthSessionLoginPending() &&
    !accountMerge &&
    !hasUaePassCallback
  ) {
    return null;
  }

  return (
    <>
      {children(authenticatedRedirectPath, () => {
        clearPendingLoginRedirect();
        discardUaePassLoginFlow();
      })}
      {accountMerge ? (
        <AccountMergeConfirmModal
          visible
          mode={accountMerge.mode}
          matchedAccountEmail={accountMerge.matchedAccountEmail}
          forcedTargetUserId={accountMerge.targetUserId}
          onComplete={completeAccountMergeFlow}
          onLogout={logoutAccountMergeFlow}
        />
      ) : null}
    </>
  );
}
