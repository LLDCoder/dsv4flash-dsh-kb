import { useState, useEffect, useLayoutEffect, useRef } from "react";
import logo from "@/assets/images/logo.png";
import { menuRouteConfig } from "@/routes/routes";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Search from "@/assets/icons/Search";
// import Notifications from "@/assets/icons/Notifications";
import List from "@/assets/icons/List";
import CaretDown from "@/assets/icons/CaretDown";
import GlobalViewIcon from "@/assets/images/global-view-icon.svg";
import NotificationPopover from "@/components/NotificationPopover";
import IdentitysPopover from "@/components/IdentitysPopover";
import UserMenuPopover from "@/components/UserMenuPopover";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import noticeIcon from "@/assets/images/Bell.svg";
import noticeSelectIcon from "@/assets/images/selectBell.svg";
import "./index.less";
import { Input } from "antd";
import sousuo from "@/assets/icons/sousuo.png";
import {
  getProfileAvatarFallback,
  resolveProfileAvatar,
} from "@/utils/profileAvatar";
import { appendPersistentQueryToUrl } from "@/utils/history";
import useMediaQuery from "@/hooks/useMediaQuery";
import MobileMenuDrawer from "@/components/Mobile/MobileMenuDrawer";
import NmaLogoMobile from "@/assets/icons/NmaLogoMobile";
import { OPEN_PROFILE_SELECTOR_EVENT } from "@/utils/profileSelector";
export default function Header() {
  const userInfo = useUserStore((state) => state.userInfo);
  const crrentUser = useUserStore((state) => state.currentProfileId);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showIdentitys, setShowIdentitys] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [val, setVal] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuAnchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [hiddenActionCount, setHiddenActionCount] = useState(0);
  const [layoutMeasureVersion, setLayoutMeasureVersion] = useState(0);
  const [SearchInputValidate, setSearchInputValidate] = useState(true);
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const isSmallLogo = useMediaQuery("(max-width: 1679px)");
  const {
    notifications: allNotifications,
    handleMarkAllRead,
    handleMarkSingleRead,
  } = useNotificationContext();

  // console.log('allNotifications', allNotifications.filter())
   const notifications = allNotifications;

  const handleNotificationClick = (id: string) => {
    handleMarkSingleRead(Number(id));
  };
  useEffect(() => {
    if (showSearch) {
      setVal("");
    }
  }, [showSearch]);
  useEffect(() => {
    const openProfileSelector = () => setShowIdentitys(true);
    window.addEventListener(OPEN_PROFILE_SELECTOR_EVENT, openProfileSelector);
    return () =>
      window.removeEventListener(OPEN_PROFILE_SELECTOR_EVENT, openProfileSelector);
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearch(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  useEffect(() => {
    const resetHiddenActions = () => {
      setHiddenActionCount(0);
      setLayoutMeasureVersion((version) => version + 1);
    };
    window.addEventListener("resize", resetHiddenActions);
    return () => window.removeEventListener("resize", resetHiddenActions);
  }, []);
  useEffect(() => {
    if (isMobile || !showSearch) return;

    const observer = new ResizeObserver(() => {
      setHiddenActionCount(0);
      setLayoutMeasureVersion((version) => version + 1);
    });
    const identity = actionsRef.current?.querySelector(".users");
    if (menuRef.current) observer.observe(menuRef.current);
    if (identity) observer.observe(identity);
    return () => observer.disconnect();
  }, [isMobile, showSearch]);
  useLayoutEffect(() => {
    if (isMobile || !showSearch) {
      setHiddenActionCount(0);
      return;
    }

    const menu = menuRef.current;
    const actions = actionsRef.current;
    if (!menu || !actions) return;

    const menuRect = menu.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const collisionGap = 24;
    const overlaps = isAr
      ? actionsRect.right + collisionGap > menuRect.left
      : menuRect.right + collisionGap > actionsRect.left;

    if (overlaps && hiddenActionCount < 2) {
      setHiddenActionCount(hiddenActionCount + 1);
    }
  }, [
    hiddenActionCount,
    isAr,
    isMobile,
    showSearch,
    layoutMeasureVersion,
    location.pathname,
    crrentUser,
  ]);
  useEffect(() => {
    if (hiddenActionCount >= 2) setShowNotifications(false);
  }, [hiddenActionCount]);
  const getCrrentUserName = () => {
    if (isGlobalProfileId(crrentUser)) {
      return t("identitysPopover.globalView");
    }

    const establishmentItem = userInfo?.userEstablishments?.find(
      (item) => item.userProfileId === crrentUser
    );
    
    if (establishmentItem) {
      return establishmentItem.nameEn;
    } else if (userInfo?.userInvitation?.userProfileId === crrentUser) {
      return userInfo?.userInvitation?.name;
    } else {
      if (userInfo?.firstName && userInfo?.lastName) {
        return `${userInfo.firstName} ${userInfo.lastName}`;
      }
      const enName = [userInfo?.firstnameEN, userInfo?.lastnameEN]
        .filter(Boolean)
        .join(" ");
      const arName = [userInfo?.firstnameAR, userInfo?.lastnameAR]
        .filter(Boolean)
        .join(" ");
      if (isAr && arName) return arName;
      if (!isAr && enName) return enName;
      if (enName) return enName;
      if (arName) return arName;
      return [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(" ");
    }
  };
  const getCrrentUserAvatar = () => {
    if (isGlobalProfileId(crrentUser)) {
      return {
        src: GlobalViewIcon,
        fallback: GlobalViewIcon,
      };
    }

    const establishmentItem = userInfo?.userEstablishments?.find(
      (item) => item.userProfileId === crrentUser
    );
    if (establishmentItem) {
      const fallback = getProfileAvatarFallback({
          kind: "establishment",
          userTypeId: establishmentItem.userTypeId,
          userTypeCode: establishmentItem.userTypeCode,
      });

      return {
        src: resolveProfileAvatar(establishmentItem.establishmentUrl, fallback),
        fallback,
      };
    } else {
      const fallback = getProfileAvatarFallback({ kind: "individual" });

      return {
        src: resolveProfileAvatar(userInfo?.userInvitation?.photoUrl, fallback),
        fallback,
      };
    }
  };
  const currentUserAvatar = getCrrentUserAvatar();
  return <div>
      {showSearch ? (
        <div className="header" dir={isAr ? "rtl" : "ltr"}>
          {isSmallLogo
            ? <div className="logo"><NmaLogoMobile /></div>
            : <img
                className="logo"
                src={logo}
                alt={t("header.aria.logo")}
              />
          }
          {isMobile ? null : <div ref={menuRef} className="menu">
            {menuRouteConfig
              .filter((moss) => {
                return moss.isMenu;
              })
              .map((item) => {
                const isActiveMenu =
                  location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    to={item.path}
                    className={`menu-item ${isActiveMenu ? "menu-item-active" : ""}`}
                    key={item.path}
                  >
                    {item.icon}
                    <span>{item.titleKey ? t(item.titleKey) : item.title}</span>
                  </Link>
                );
              })}
          </div>}
          <div ref={actionsRef} className="actions">
            <div
              ref={searchRef}
              onClick={() => setShowSearch(false)}
              className={`notification-wrapper header__action header__action--search ${
                hiddenActionCount >= 1 ? "header__action--hidden" : ""
              }`}
            >
              <Search />
            </div>
            <div
              className={`${
                showNotifications
                  ? "notification-selectWrapper"
                  : "notification-wrapper"
              } header__action header__action--notification ${
                hiddenActionCount >= 2 ? "header__action--hidden" : ""
              }`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <img src={showNotifications ? noticeSelectIcon : noticeIcon} />
              {notifications.some((n) => !n.isRead) && (
                <span className="notification-badge" />
              )}
            </div>
            <span
              ref={userMenuAnchorRef}
              className={
                showUserMenu
                  ? "notification-selectWrapper"
                  : "notification-wrapper"
              }
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <List />
            </span>
            <div className="users" onClick={() => setShowIdentitys(true)}>
              <div className="avatar">
                <img
                  className={
                    isGlobalProfileId(crrentUser) ? "avatar--global-view" : undefined
                  }
                  src={currentUserAvatar.src}
                  alt={t("header.aria.avatar")}
                  onError={(event) => {
                    if (event.currentTarget.dataset.fallbackApplied === "true") {
                      return;
                    }
                    event.currentTarget.dataset.fallbackApplied = "true";
                    event.currentTarget.src = currentUserAvatar.fallback;
                  }}
                />
              </div>
              <div className="name">{getCrrentUserName()}</div>
              <div className="caret-down">
                <CaretDown />
              </div>
            </div>
          </div>

          <NotificationPopover
            visible={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onNotificationClick={handleNotificationClick}
          />

          <IdentitysPopover
            visible={showIdentitys}
            onClose={() => setShowIdentitys(false)}
          />
          <UserMenuPopover
            anchorRef={userMenuAnchorRef}
            visible={!isMobile ? showUserMenu : false}
            onClose={() => setShowUserMenu(false)}
          />
          <MobileMenuDrawer visible={isMobile ? showUserMenu : false} onClose={() => setShowUserMenu(false)} />
        </div>
      ) : (
        <>
          <div ref={searchRef} className="header GlobalSearch">
            <div className="GlobalSearchInputBox">
              <Input
                maxLength={100}
                className={
                  SearchInputValidate
                    ? `Headerinput`
                    : `Headerinput errorGlobalSearch`
                }
                allowClear
                value={val}
                onChange={(e) => setVal(e.target.value)}
                prefix={<img src={sousuo} />}
                placeholder={t("formPlaceholders.common.search")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && val.length >= 3) {
                    setShowSearch(true);
                    setSearchInputValidate(true);

                    window.location.href = appendPersistentQueryToUrl(
                      `/global-search?keyword=${encodeURIComponent(val)}`,
                    );
                  } else if (e.key === "Enter" && val.length < 3) {
                    setSearchInputValidate(false);
                  }
                }}
              />
              <div
                className="Headercancel"
                onClick={() => {
                  setShowSearch(true); setSearchInputValidate(true);
                }}
              >
                {t("common.cancel")}
              </div>
              {!SearchInputValidate && (
                <span className="Minimum_span">
                  {t("header.search.minLengthHint")}
                </span>
              )}
              <span className="character-count">
                {val.length}/100
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  ;
}
