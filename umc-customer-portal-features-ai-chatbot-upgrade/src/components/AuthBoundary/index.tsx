import { Redirect, useHistory, useLocation } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { authService } from "@/services/auth";
import routes, { type IRoute } from "../../routes";
import i18next from "@/localization/config";
import { performAuthenticatedLogout } from "@/utils/authSession";
import {
  isDeepLinkReturnPath,
  savePendingLoginRedirect,
} from "@/utils/pendingLoginRedirect";
import { getCurrentUserInfo } from "@/services/user";
import {
  ACCOUNT_SUSPENSION_EVENT,
  isAccountSuspensionActive,
  resetAccountSuspensionHandling,
} from "@/utils/accountSuspension";
import AccountSuspendedModal from "@/pages/Services/components/AccountSuspendedModal";
import { useUserStore } from "@/store/user";

const AUTO_LOGOUT_TIMEOUT = 60 * 60 * 1000;

const findRouteByPath = (
  routeList: IRoute[],
  path: string,
): IRoute | undefined => {
  for (const route of routeList) {
    if (route.path === path) {
      return route;
    }
    if (route.children?.length) {
      const found = findRouteByPath(route.children, path);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

export default function AuthBoundary({
  children,
}: React.PropsWithChildren<object>) {
  const history = useHistory();
  const location = useLocation();
  const timerRef = useRef<number | null>(null);
  const accountStatusCheckRef = useRef<Promise<unknown> | null>(null);
  const [accountSuspendedVisible, setAccountSuspendedVisible] = useState(false);
  const isAuthenticated = authService.isAuthenticated();

  const handleAccountSuspendedLogout = useCallback(() => {
    performAuthenticatedLogout({
      clearUserStorage: true,
      onLocalLogout: () => {
        resetAccountSuspensionHandling();
        setAccountSuspendedVisible(false);
        useUserStore.getState().resetUserInfo();
      },
    });
  }, []);

  useEffect(() => {
    const checkAccountStatus = () => {
      if (
        document.visibilityState !== "visible" ||
        !authService.isAuthenticated() ||
        isAccountSuspensionActive() ||
        accountStatusCheckRef.current
      ) {
        return;
      }

      const request = getCurrentUserInfo({ skipErrorToast: true })
        .catch(() => undefined)
        .finally(() => {
          if (accountStatusCheckRef.current === request) {
            accountStatusCheckRef.current = null;
          }
        });
      accountStatusCheckRef.current = request;
    };

    document.addEventListener("visibilitychange", checkAccountStatus);
    window.addEventListener("focus", checkAccountStatus);
    return () => {
      document.removeEventListener("visibilitychange", checkAccountStatus);
      window.removeEventListener("focus", checkAccountStatus);
      accountStatusCheckRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleAccountSuspension = () => {
      setAccountSuspendedVisible(true);
    };

    window.addEventListener(
      ACCOUNT_SUSPENSION_EVENT,
      handleAccountSuspension,
    );
    if (isAccountSuspensionActive()) {
      handleAccountSuspension();
    }
    return () => {
      window.removeEventListener(
        ACCOUNT_SUSPENSION_EVENT,
        handleAccountSuspension,
      );
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const searchParams = new URLSearchParams(window.location.search);
      let code: string | null = null;
      let state: string | null = null;
      for (const [key, value] of searchParams.entries()) {
        if (key.toLowerCase() === 'code') code = value;
        if (key.toLowerCase() === 'state') state = value;
      }
      if (code && state) {
        history.replace(
          `/login?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        );
      } else {
      // CP-012 / CP-013: keep the email deep link so login can return to it.
      const deepLinkTarget = `${window.location.pathname}${window.location.search}`;
      if (isDeepLinkReturnPath(deepLinkTarget)) {
      savePendingLoginRedirect(deepLinkTarget);
      }
      performAuthenticatedLogout();
      }
      return undefined;
    }

    const autoLogout = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = null;
      performAuthenticatedLogout({
        loginNotice: i18next.t("login.idleSessionLogout"),
      });
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(autoLogout, AUTO_LOGOUT_TIMEOUT);
    };

    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }; 
  }, [history, isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }


  const currentRoute = findRouteByPath(routes, location.pathname);
  if (currentRoute?.redirect) {
    return <Redirect to={currentRoute.redirect} />;
  }

  return (
    <>
      {children}
      <AccountSuspendedModal
        visible={accountSuspendedVisible}
        onClose={handleAccountSuspendedLogout}
        onConfirm={handleAccountSuspendedLogout}
      />
    </>
  );
}
