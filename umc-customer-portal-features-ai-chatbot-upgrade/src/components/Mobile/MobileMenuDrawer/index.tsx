import { Drawer } from "antd";
import './index.less';
import MobileMenuLogo from "@/assets/images/mobile-menu-logo.png";
import X from "@/assets/images/X.png";
import Home from "@/assets/icons/Home";
import Services from "@/assets/icons/Services";
import Wallet from "@/assets/icons/Wallet";
import Dir from "@/assets/icons/Dir";
import Database from "@/assets/icons/Database";
import Db from "@/assets/icons/Db";
import Email from "@/assets/icons/Email";
import Edit from "@/assets/icons/Edit";
import { Link, useHistory, useLocation } from "react-router-dom";
import UserCircleGear from "@/assets/images/UserCircleGear.png";
import SignOut from "@/assets/images/SignOut.png";
import { useTranslation } from "react-i18next";
import en from "@/assets/images/en.png";
import ar from "@/assets/images/ar.png";
import { performAuthenticatedLogout } from "@/utils/authSession";

interface IProps{
    visible: boolean;
    onClose: () => void;
}
const MobileMenuList = [
    { path: "/home", titleKey: "menu.home", icon: <Home /> },
    { path: "/services", titleKey: "menu.services", icon: <Services /> },
    { path: "/my-requests", titleKey: "menu.myRequests", icon: <Edit /> },
    { path: "/payments", titleKey: "menu.payments", icon: <Wallet /> },
    { path: "/permits-license", titleKey: "menu.permitsLicense", icon: <Dir /> },
    { path: "/violations-fines", titleKey: "menu.ViolationsFines", icon: <Database /> },
    { path: "/refund", titleKey: "menu.refund", icon: <Db /> },
    { path: "/complaints", titleKey: "menu.complaints", icon: <Email /> },
];

export default function MobileMenuDrawer({ visible, onClose }: IProps){
    const location = useLocation();
    const history = useHistory();
    const { t, i18n } = useTranslation();
    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("language", lang);
        onClose();
    };
    const handleProfileClick = () => {
        history.push("/my-account");
        onClose();
    };
    const handleLogout = () => {
        performAuthenticatedLogout({ onLocalLogout: onClose });
    };
    return <Drawer
      visible={visible}
      onClose={onClose}
      placement="top"
      height="100vh"
      className="mobile-menu-drawer"
    >
        <div className="mobile-menu-drawer-content">
            <div className="mobile-menu-drawer-header">
                <img
                  src={MobileMenuLogo}
                  alt={t("header.aria.logo")}
                  className="mobile-menu-drawer-header-logo"
                />
                <img src={X} onClick={onClose} alt={t("common.close")} className="mobile-menu-drawer-header-close" />
            </div>
            <div className="mobile-menu-drawer-body">
                <div className="mobile-menu-drawer-list">
                    {MobileMenuList.map((item)=>{
                        return <Link key={item.path} to={item.path} onClick={onClose}>
                            <div className={`mobile-menu-drawer-li ${location.pathname === item.path ? "mobile-menu-drawer-li-active" : ""}`}>
                                <div className="mobile-menu-drawer-li-icon">{item.icon}</div>
                                <div className="mobile-menu-drawer-li-title">{t(item.titleKey)}</div>
                            </div>
                        </Link>
                    })}
                </div>
                <div className="mobile-menu-drawer-user">
                    <div className="mobile-menu-drawer-user-item" onClick={handleProfileClick}>
                        <div className="mobile-menu-drawer-user-icon">
                            <img src={UserCircleGear} alt="" />
                        </div>
                        <div className="mobile-menu-drawer-user-text">
                          {t("header.menu.myAccount")}
                        </div>
                    </div>
                    {/* Accessibility menu item — hidden until feature is implemented
                    <div className="mobile-menu-drawer-user-item">
                        <div className="mobile-menu-drawer-user-icon">
                            <img src={PersonSimpleCircle} alt="" />
                        </div>
                        <div className="mobile-menu-drawer-user-text">
                          {t("header.menu.accessibility")}
                        </div>
                    </div>
                    */}
                    <div className="mobile-menu-drawer-user-item" onClick={handleLogout}>
                        <div className="mobile-menu-drawer-user-icon">
                            <img src={SignOut} alt="" />
                        </div>
                        <div className="mobile-menu-drawer-user-text">
                          {t("header.menu.logOut")}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mobile-menu-drawer-footer">
                <div className="mobile-menu-drawer-footer-btns">
                    <div className={`mobile-menu-drawer-footer-btn ${i18n.language.startsWith("en") ? "mobile-menu-drawer-footer-btn-active" : ""}`} onClick={()=>handleLanguageChange("en")}>
                        <img src={en} />
                        <span>EN</span>
                    </div>
                    <div className={`mobile-menu-drawer-footer-btn ${i18n.language.startsWith("ar") ? "mobile-menu-drawer-footer-btn-active" : ""}`} onClick={()=>handleLanguageChange("ar")}>
                        <img src={ar} />
                        <span>AR</span>
                    </div>
                </div>
               
            </div>
        </div>
    </Drawer>   
}
