import { Switch, Route, useHistory } from "react-router-dom";
import "antd/dist/antd.css";
import renderRoutes from "./routes";
import AuthBoundary from "./components/AuthBoundary";
import { renderKeepAliveAwareRoute } from "./components/KeepAlive/routeHelpers";
import Layout from "./layout";
import { ConfigProvider, Spin } from 'antd';
import { NotificationProvider } from "./contexts/NotificationContext";
import "./App.less";
import i18n from "./localization/config";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAntdLocale } from "@/utils/antdLocale";
import { useCommonStore } from "./store/common-store";
import {
  setValidateLanguage,
  registerValidateLocale,
  registerValidateFormats,
} from "@formily/core";
import { applyDateLocale } from "@/utils/dateLocale";
import { performLocalLogout } from "@/utils/authSession";
import {
  AUTH_SESSION_SYNC_ACTION,
  subscribeAuthSessionSync,
} from "@/utils/authSessionSync";
import { hardRedirectToLogin } from "@/utils/history";
import { useUserStore, type IUser } from "@/store/user";
import { getCurrentUserInfo } from "@/services/user";
import authStorage from "@/storage/authStorage";
import { clearIdentityScopedBusinessContext } from "@/utils/identitySwitch";

registerValidateFormats({
  phone: /^\d{1,15}$/,
});

registerValidateLocale({
  "en-US": {
    required: String(i18n.t("common.formValidation.required", { lng: "en" })),
    number: String(i18n.t("common.formValidation.invalidNumber", { lng: "en" })),
    phone: String(i18n.t("common.formValidation.invalidPhone", { lng: "en" })),
  },
  "ar_EG": {
    required: String(i18n.t("common.formValidation.required", { lng: "ar" })),
    number: String(i18n.t("common.formValidation.invalidNumber", { lng: "ar" })),
    phone: String(i18n.t("common.formValidation.invalidPhone", { lng: "ar" })),
  },
});

const initialLanguage =
  typeof window !== "undefined"
    ? window.localStorage.getItem("language") || "en"
    : "en";

setValidateLanguage(initialLanguage.startsWith("ar") ? "ar_EG" : "en-US");
applyDateLocale(initialLanguage);

function App() {
  const { i18n } = useTranslation();
  const history = useHistory();
  const isRtl = Boolean(i18n.language?.startsWith("ar"));
  const [locale, setLocale] = useState(() => getAntdLocale(i18n.language || "en"));
  const loading = useCommonStore(state => state.loading);
  const identityVersion = useUserStore((state) => state.identityVersion);
  useEffect(
    () =>
      subscribeAuthSessionSync((action) => {
        if (action === AUTH_SESSION_SYNC_ACTION.LOGIN) {
          window.location.reload();
          return;
        }
        if (action === AUTH_SESSION_SYNC_ACTION.SWITCH_IDENTITY) {
          const persistedUserStore = useUserStore as typeof useUserStore & {
            persist: {
              rehydrate: () => Promise<void> | void;
            };
          };
          const previousToken = useUserStore.getState().userInfo.token;
          void Promise.resolve(persistedUserStore.persist.rehydrate())
            .then(async () => {
              const userStore = useUserStore.getState();
              const synchronizedToken = userStore.userInfo.token;
              if (!synchronizedToken || synchronizedToken === previousToken) {
                return;
              }
              const currentUser = await getCurrentUserInfo<IUser>({
                skipErrorToast: true,
                skipUnauthorizedRedirect: true,
              });
              if (authStorage.getToken() !== synchronizedToken) {
                return;
              }
              if (
                currentUser.id &&
                userStore.userInfo.id &&
                String(currentUser.id) !== String(userStore.userInfo.id)
              ) {
                throw new Error("Synchronized identity belongs to another user");
              }
              clearIdentityScopedBusinessContext();
              userStore.refreshIdentityContext();
              history.replace("/home");
            })
            .catch((error) => {
              console.error("Failed to synchronize identity state:", error);
              performLocalLogout({
                clearUserStorage: true,
                onLocalLogout: () => useUserStore.getState().resetUserInfo(),
                syncOtherTabs: false,
              });
              hardRedirectToLogin();
            });
          return;
        }

        performLocalLogout({
          clearUserStorage: true,
          onLocalLogout: () => useUserStore.getState().resetUserInfo(),
          syncOtherTabs: false,
        });
        hardRedirectToLogin();
      }),
    [history],
  );

  useEffect(() => {
    const dir = isRtl ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", isRtl ? "ar" : "en");
    document.title = i18n.t("pageTitle.portal");
    applyDateLocale(i18n.language || "en");
  }, [i18n.language, isRtl]);

  useEffect(()=>{
    const changeLang = () => {
      const nextIsAr = Boolean(i18n.language?.startsWith("ar"));
      applyDateLocale(i18n.language || "en");
      setLocale(getAntdLocale(i18n.language || "en"));
      setValidateLanguage(nextIsAr ? "ar_EG" : "en-US");
      window.location.reload();
    };
    i18n.on("languageChanged", changeLang);
    return ()=>{
      i18n.off("languageChanged", changeLang);
    }
  },[]);

  
  return (
    <ConfigProvider locale={locale} direction={isRtl ? "rtl" : "ltr"}>
      <NotificationProvider>
        <Spin spinning={loading}>
          <Switch>
            {renderRoutes.map((route) => {
              if (!route.root) {
                return renderKeepAliveAwareRoute(route, renderRoutes);
              }

              const rootChildren = route.children ?? [];

              return (
                <Route key={route.path} path={route.path}>
                  <AuthBoundary key={identityVersion}>
                    <Layout>
                      <Switch>
                        {rootChildren.map((child) =>
                          renderKeepAliveAwareRoute(child, rootChildren),
                        )}
                      </Switch>
                    </Layout>
                  </AuthBoundary>
                </Route>
              );
            })}
          </Switch>
        </Spin>
      </NotificationProvider>
    </ConfigProvider>
  );
}

export default App;
