import Header from "@/layout/Header";
import Footer from "@/layout/Footer";
import "./index.less";
import React, { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import AppRoutes from "../routes";
import bread from "../assets/icons/bread.png";
import { Link, useLocation } from "react-router-dom";
import { useActionStore } from "@/store/pengdingAction";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import { useHistory } from "react-router-dom";
import { useServicesStore } from "@/store/services";
import { useMyRequestDetailTitleStore } from "@/store/myRequestDetailTitle";
import { getUserEstablishments } from "@/services/services";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { Tooltip } from "antd";
import SimpleBar from "@/components/SimpleBar";
import AIChatBot from "@/components/AIChatBot";
import { aiChatbotEnabled } from "@/components/AIChatBot/featureFlag";
import { KNOWLEDGE_ITEMS } from "@/pages/Knowledgecenter/knowledgeData";

export default function Layout({ children }: React.PropsWithChildren<object>) {
  const history = useHistory();
  const ServicesStore = useServicesStore();

  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const location = useLocation();
  const { pengdingActionNum } = useActionStore();
  const userInfo = useUserStore((state) => state.userInfo);
  const crrentUser = useUserStore((state) => state.currentProfileId);
  const refreshApprovedProfiles = useUserStore(
    (state) => state.refreshApprovedProfiles,
  );
  const [MediaLocal, setMediaLocal] = useState(false);
  const [ServiceCardLocal, setServiceCardLocal] = useState(false);
  const [serviceTitle, setServiceTitle] = useState("");
  const isMyRequestDetailPage = location.pathname === "/my-requests/detail";
  const detailApplicationId = useMemo(() => {
    if (!isMyRequestDetailPage) {
      return null;
    }

    const idParam = new URLSearchParams(location.search).get("id");

    if (idParam == null) {
      return null;
    }

    const id = Number(idParam);
    return Number.isFinite(id) ? id : null;
  }, [isMyRequestDetailPage, location.search]);
  const detailTitleState = useMyRequestDetailTitleStore((state) =>
    detailApplicationId == null
      ? undefined
      : state.titlesByApplicationId[detailApplicationId],
  );
  const detailServiceTitle = preferLocalizedEnAr(
    i18n.language.startsWith("ar"),
    detailTitleState?.serviceNameEn,
    detailTitleState?.serviceNameAr,
  );
  const isDetailTitlePending =
    isMyRequestDetailPage &&
    detailApplicationId != null &&
    !detailTitleState?.isResolved;

  useEffect(() => {
    if (userInfo.id) {
      refreshApprovedProfiles(userInfo.id).catch((error) => {
        console.error("refreshApprovedProfiles", error);
      });
    }
  }, [userInfo.id, refreshApprovedProfiles]);

  useEffect(() => {
    if (location.pathname=='/services/media-license') {
      setMediaLocal(true);
      setServiceCardLocal(false);
    } else if (location.pathname.startsWith('/services/service-card')) {
      setMediaLocal(false);
      setServiceCardLocal(true);
    } else {
      setMediaLocal(false);
      setServiceCardLocal(false);
    }
  }, [location]);

  useEffect(() => {
    const currentServiceId = Number(ServicesStore.userInfo.servicesId || 0);

    if ((!MediaLocal && !ServiceCardLocal) || !currentServiceId) {
      setServiceTitle("");
      return;
    }

    let cancelled = false;

    getUserEstablishments(currentServiceId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const lang = i18n.language || "en";
        const d = response?.data as
          | { nameEn?: string; nameAr?: string }
          | undefined;
        setServiceTitle(
          lang.startsWith("ar")
            ? (d?.nameAr ?? d?.nameEn ?? "")
            : (d?.nameEn ?? d?.nameAr ?? ""),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setServiceTitle("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    MediaLocal,
    ServiceCardLocal,
    ServicesStore.userInfo.servicesId,
    i18n.language,
  ]);

  const isHomePage =
    location.pathname === "/" || location.pathname === "/home";
  const knowledgeDetailItem = useMemo(() => {
    if (
      location.pathname !==
      "/knowledge-center/knowledge-center-detail"
    ) {
      return null;
    }

    const idParam = new URLSearchParams(location.search).get("id");
    const id = Number(idParam);

    if (!idParam || !Number.isInteger(id)) {
      return null;
    }

    return (
      KNOWLEDGE_ITEMS.find(
        (item) => item.id === id && Boolean(item.detail),
      ) ?? null
    );
  }, [location.pathname, location.search]);

  const getViolationsFinesTrail = () => {
    if (!location.pathname.startsWith("/violations-fines")) {
      return null;
    }

    const trail = [
      { label: t("menu.home"), path: "/" },
      {
        label: t("menu.ViolationsFines"),
        path: "/violations-fines",
      },
    ];

    if (location.pathname.startsWith("/violations-fines/appeals/")) {
      trail.push({
        label: t("violationsFinesPage.breadcrumbs.appealDetails"),
        path: "#",
      });
    } else if (location.pathname.startsWith("/violations-fines/violations/")) {
      trail.push({
        label: t("violationsFinesPage.breadcrumbs.violationDetails"),
        path: "#",
      });
    } else if (location.pathname === "/violations-fines/payment/success") {
      trail.push({
        label: t("violationsFinesPage.breadcrumbs.paymentSuccessful"),
        path: "#",
      });
    } else if (location.pathname === "/violations-fines/payment/failed") {
      trail.push({
        label: t("violationsFinesPage.breadcrumbs.paymentFailed"),
        path: "#",
      });
    }

    return trail;
  };
  const violationsFinesTrail = getViolationsFinesTrail();
  const paymentResultTrail =
    location.pathname === "/payment/result"
      ? [
          { label: t("menu.home"), path: "/" },
          { label: t("menu.payments"), path: "/payments" },
          { label: t("payment.pageTitle"), path: "#" },
        ]
      : null;
  const getKnowledgeCenterTrail = () => {
    if (
      location.pathname !==
      "/knowledge-center/knowledge-center-detail"
    ) {
      return null;
    }

    const title = knowledgeDetailItem?.detail
      ? t(knowledgeDetailItem.detail.titleKey)
      : t("menu.KnowledgecenterDetail");

    return [
      { label: t("menu.home"), path: "/" },
      {
        label: t("homeInitialization.knowledgeCenterTitle"),
        path: "/knowledge-center",
      },
      { label: title, path: "#" },
    ];
  };
  const knowledgeCenterTrail = getKnowledgeCenterTrail();
  const contextualTrail =
    paymentResultTrail ?? violationsFinesTrail ?? knowledgeCenterTrail;

  const breadcrumbs = [
    "Home",
    ...location.pathname.split("/").filter((part) => part !== ""),
  ].map((item) => {

    let translationKey;
    if (item != "Home") {
      translationKey = AppRoutes[AppRoutes.length - 1].children?.filter(
        (moss) => {
          return (
            moss.page?.toLowerCase().replace(/-/g, "") ===
            item.toLowerCase().replace(/-/g, "")
          );
        }
      )[0];
    }
    const displayText =
      item != "Home"
        ? translationKey && translationKey.i18n
          ? t(translationKey.i18n)
          : item
        : t("menu.home");
    let linkPath = "#";
    if (
      item !== "Home" &&
      translationKey &&
      translationKey.path
      // && !translationKey.isMenu
    ) {
      linkPath = translationKey.path;
    }
    return (
      <Link to={linkPath} key={item} className="headerTitle">
        {displayText}
      </Link>
    );
  });

  const getHomeHeader = () => {
    if (userInfo.isFirstLogin) {
      return <div>{t("layoutContent.firstLoginPrompt")}</div>;
    }
    if (pengdingActionNum > 0) {
      return (
        <div className="action-title">
          <Trans
            i18nKey="layoutContent.pendingActions"
            values={{ count: pengdingActionNum }}
            components={{
              highlight: <span />,
            }}
          />
        </div>
      );
    }
    return (
      <div className="action-title">
        <Trans
          i18nKey="layoutContent.allSet"
          components={{
            highlight: <span />,
          }}
        />
      </div>
    );
  };
  const getCrrentUserName = () => {
    if (isGlobalProfileId(crrentUser)) {
      return t("identitysPopover.globalView");
    }

    const establishmentItem = userInfo?.userEstablishments?.find(
      (item) => item.userProfileId === crrentUser
    );
    if (establishmentItem) {
      return isAr
        ? establishmentItem.nameAr || establishmentItem.nameEn
        : establishmentItem.nameEn || establishmentItem.nameAr;
    } else if (userInfo?.userInvitation?.userProfileId === crrentUser) {
      return userInfo?.userInvitation?.name;
    } else {
      if (isAr) {
        const arName = [userInfo.firstnameAR, userInfo.lastnameAR]
          .filter(Boolean)
          .join(" ");
        if (arName) {
          return arName;
        }
      }
      return userInfo.firstName + " " + userInfo.lastName;
    }
  };
  const pageName = contextualTrail
    ? contextualTrail[contextualTrail.length - 1].label
    : breadcrumbs[breadcrumbs.length - 1].props.children;
  const breadcrumbItems = contextualTrail ?? breadcrumbs;
  const greetingText = t("layoutContent.greeting", { name: getCrrentUserName() });

  return (
    <SimpleBar className="layout-scroll">
      <div className="layout">
        <Header />
        <div className="mainbac"></div>
        <div className="layout-content">
          <div
            className="breadcrumbs"
            dir={isAr ? "rtl" : "ltr"}
          >
            {isHomePage ? (
              <Tooltip placement="topLeft" title={greetingText}>
                <div className="greeting">{greetingText}</div>
              </Tooltip>
            ) : (
              breadcrumbItems.map((item, index) => {
                const isViolationsFinesBreadcrumb = "label" in item;
                const isLastBreadcrumb = index === breadcrumbItems.length - 1;
                return (
                  <React.Fragment key={index}>
                    <div
                      onClick={() => {
                        if (!isViolationsFinesBreadcrumb && index == 0) {
                          history.push("/");
                        }
                      }}
                      className={
                        isLastBreadcrumb
                          ? "breadcrumbsItem active"
                          : "breadcrumbsItem"
                      }
                    >
                      {isViolationsFinesBreadcrumb ? (
                        <Link to={item.path} className="headerTitle">
                          {item.label}
                        </Link>
                      ) : (
                        item
                      )}
                    </div>
                    {!isLastBreadcrumb && <img src={bread} />}
                  </React.Fragment>
                );
              })
            )}
          </div>
          <div
            className={`page-name${
              isDetailTitlePending ? " page-name--hidden" : ""
            }`}
            dir={isAr ? "rtl" : "ltr"}
          >
            {MediaLocal || ServiceCardLocal
              ? serviceTitle || ServicesStore.userInfo.servicesName
              : isHomePage
                ? getHomeHeader()
                : isMyRequestDetailPage && detailServiceTitle
                  ? detailServiceTitle
                  : pageName}
          </div>
          {children}
        </div>
        <Footer />
        {aiChatbotEnabled === "true" ? <AIChatBot /> : null}
      </div>
    </SimpleBar>
  );
}
