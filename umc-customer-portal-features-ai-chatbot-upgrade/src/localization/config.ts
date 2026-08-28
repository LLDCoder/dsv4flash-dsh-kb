import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { buildTranslationResources } from "./resources";

const savedLanguage =
  typeof localStorage === "undefined" ? "en" : localStorage.getItem("language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: buildTranslationResources("en"),
    },
    ar: {
      translation: buildTranslationResources("ar"),
    },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
