import React, { useState } from 'react';
// import pulbicLogo from "@/assets/images/public-logo.png";
// import pulbicTitle from "@/assets/images/public-title.png";
import LangMenu from '@/components/common/LangMenu';
import { useTranslation } from 'react-i18next';
import { history } from "@/utils/history";
import "./index.less";
import { useSignupStore } from '@/store/signup-store';
import loginLogo from '@/assets/images/login-logo.png';
import useIsMobile from '@/hooks/useIsMobile';
import UserCircle from '@/assets/icons/UserCircle';
import NmaLogoMobile from '@/assets/icons/NmaLogoMobile';

export default function PublicLayout({ children, logo, title, className }: React.PropsWithChildren<{logo?: string, title?: string, className?: string}>) {
    const { i18n, t } = useTranslation();
    const [currentLang, setCurrentLang] = useState(i18n.language || "en");
    const reset = useSignupStore((state)=>state.reset);
    const isMobile = useIsMobile();
    
    const handleLanguageChange = (lng: string) => {
        setCurrentLang(lng);
    };
    return (
        <div className={`public-layout ${className ? className : ''}`} dir={i18n.language.startsWith("ar") ? "rtl" : "ltr"}>
            <div className="public-layout-header">
                <div className="public-layout-logo">
                    {/* <img className="logo-img" src={logo ? logo : pulbicLogo} alt="" />
                    <img className="logo-title" src={title ? title : pulbicTitle} alt="" /> */}
                    {isMobile ? <NmaLogoMobile /> : <img className='logo_img' src={loginLogo} alt="" />}
                </div>
                <div className='public-layout-right'>
                    <LangMenu lang={currentLang} onChange={handleLanguageChange} />
                    <div
                        className={`public-layout-login${isMobile ? ' public-layout-login--icon' : ''}`}
                        role="button"
                        aria-label={t("payFinesDetail.signupLogin")}
                        onClick={()=>{
                        reset();
                        history.push("/login");
                    }}>
                        {isMobile ? <UserCircle /> : t("payFinesDetail.signupLogin")}
                    </div>
                </div>
            </div>
           <div className='public-layout-content'>
                {children}
           </div>
        </div>
    )
}
