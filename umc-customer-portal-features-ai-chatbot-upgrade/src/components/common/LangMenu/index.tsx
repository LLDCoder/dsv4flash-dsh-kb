import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import "./index.less";

interface ILangMenuProps {
  lang: string;
  onChange: (lang: string) => void;
}

export default function LangMenu({ lang, onChange }: ILangMenuProps) {
  const { t, i18n } = useTranslation();
  const normalizedLang = String(lang || i18n.language || "en").toLowerCase();
  const isAr = normalizedLang.startsWith("ar");
  const nextLang = isAr ? "en" : "ar";
  const currentLabel = isAr ? "ع" : "En";

  useEffect(() => {
    document.documentElement.dir = i18n.language?.startsWith("ar")
      ? "rtl"
      : "ltr";
  }, [i18n.language]);

  const handleLanguageChange = () => {
    document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("language", nextLang);
    onChange(nextLang);
  };

  return (
    <button
      type="button"
      className="lang-selector"
      onClick={handleLanguageChange}
      aria-label={t(
        isAr
          ? "common.switchLanguageToEnglish"
          : "common.switchLanguageToArabic",
      )}
    >
      {currentLabel}
    </button>
  );
}
