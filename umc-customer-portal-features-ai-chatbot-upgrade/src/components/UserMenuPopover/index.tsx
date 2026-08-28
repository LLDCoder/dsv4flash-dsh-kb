import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserCircleIcon from "@/assets/images/UserCircle.svg";
import SignOutIcon from "@/assets/images/SignOut.svg";
import enIcon from "@/assets/images/topRight-EN.svg";
import arIcon from "@/assets/images/topRight-AR.svg";
import eventEmiiter from "@/utils/EventEmiiter";
import { performAuthenticatedLogout } from "@/utils/authSession";
import "./index.less";

const POPOVER_WIDTH = 230;
const POPOVER_OFFSET = 8;
const VIEWPORT_MARGIN = 16;

interface UserMenuPopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

const UserMenuPopover: React.FC<UserMenuPopoverProps> = ({
  visible,
  onClose,
  anchorRef,
}) => {
  const history = useHistory();
  const { t, i18n } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    top: 90,
    left: VIEWPORT_MARGIN,
  });

  const handleProfileClick = () => {
    history.push("/my-account");
    onClose();
  };

  const handleLogout = () => {
    performAuthenticatedLogout({
      clearUserStorage: true,
      onLocalLogout: onClose,
    });
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    eventEmiiter.emit("onchange:lang");
    onClose();
  };

  useEffect(() => {
    [enIcon, arIcon].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    const updatePopoverPosition = () => {
      const anchor = anchorRef.current;

      if (!anchor) {
        return;
      }

      const triggerRect = anchor.getBoundingClientRect();
      const popoverWidth = popoverRef.current?.offsetWidth || POPOVER_WIDTH;
      const maxLeft = Math.max(
        VIEWPORT_MARGIN,
        window.innerWidth - VIEWPORT_MARGIN - popoverWidth,
      );
      const centeredLeft =
        triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;

      setPopoverStyle({
        top: triggerRect.bottom + POPOVER_OFFSET,
        left: Math.min(Math.max(centeredLeft, VIEWPORT_MARGIN), maxLeft),
      });
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [anchorRef, visible]);

  useEffect(() => {
    const overlay = overlayRef.current;

    if (!overlay) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const scrollContainer = overlay.closest(".simplebar-content-wrapper");
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.scrollTop += event.deltaY;
      }
    };

    overlay.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      overlay.removeEventListener("wheel", handleWheel);
    };
  }, [visible]);

  if (!visible) return null;

  const isAr = i18n.language.startsWith("ar");

  return (
    <>
      <div ref={overlayRef} className="user-menu-overlay" onClick={onClose} />
      <div
        ref={popoverRef}
        className="user-menu-popover"
        dir={isAr ? "rtl" : "ltr"}
        style={popoverStyle}
      >
        <div className="user-menu-content">
          <div className="menu-items">
            <div className="menu-item" onClick={handleProfileClick}>
              <img
                src={UserCircleIcon}
                alt={t("header.aria.profileMenu")}
                className="menu-icon"
              />
              <span className="menu-text">{t("header.menu.profile")}</span>
            </div>
            {/* Accessibility menu item hidden until feature is implemented.
            <div className="menu-item" onClick={handleAccessibilityClick}>
              <img
                src={AccessibilityIcon}
                alt={t("header.aria.accessibilityMenu")}
                className="menu-icon"
              />
              <span className="menu-text">{t("header.menu.accessibility")}</span>
            </div>
            */}
            <div className="menu-item" onClick={handleLogout}>
              <img
                src={SignOutIcon}
                alt={t("header.aria.logOutMenu")}
                className="menu-icon"
              />
              <span className="menu-text">{t("header.menu.logOut")}</span>
            </div>
          </div>

          <div className="language-switcher-shell">
            <div className="language-switcher">
              <button
                className={`lang-btn ${i18n.language.startsWith("en") ? "active" : ""}`}
                onClick={() => handleLanguageChange("en")}
              >
                <span className="flag-wrap">
                  <img src={enIcon} alt="" className="flag" />
                </span>
                <span className="lang-text">EN</span>
              </button>
              <button
                className={`lang-btn ${i18n.language.startsWith("ar") ? "active" : ""}`}
                onClick={() => handleLanguageChange("ar")}
              >
                <span className="flag-wrap">
                  <img src={arIcon} alt="" className="flag" />
                </span>
                <span className="lang-text">AR</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserMenuPopover;


