import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route } from "react-router-dom";
import { ConfigProvider } from "antd";
import arEG from "antd/lib/locale/ar_EG";
import enUS from "antd/lib/locale/en_US";
import "antd/dist/antd.css";
import "@/index.css";
import i18n from "@/localization/config";
import InspectionDeclaration from "./index";

const INSPECTION_DECLARATION_PATH = "/inspection-declaration";
const INSPECTION_DECLARATION_HTML_PATH = "/inspection-declaration.html";

const normalizePhysicalHtmlUrl = () => {
  if (window.location.pathname !== INSPECTION_DECLARATION_HTML_PATH) return;

  window.history.replaceState(
    null,
    "",
    `${INSPECTION_DECLARATION_PATH}${window.location.search}`,
  );
};

const getLanguageSettings = (language: string) => {
  const isArabic = language.toLowerCase().startsWith("ar");
  return {
    language: isArabic ? "ar" : "en",
    direction: isArabic ? "rtl" as const : "ltr" as const,
    locale: isArabic ? arEG : enUS,
  };
};

const syncDocumentLanguage = (language: string) => {
  const settings = getLanguageSettings(language);
  document.documentElement.lang = settings.language;
  document.documentElement.dir = settings.direction;
  document.title = i18n.t("inspectionDeclaration.title", {
    lng: settings.language,
  });
};

export function InspectionDeclarationApp() {
  const [language, setLanguage] = useState(i18n.language || "en");
  const settings = getLanguageSettings(language);

  useEffect(() => {
    const handleLanguageChanged = (nextLanguage: string) => {
      syncDocumentLanguage(nextLanguage);
      setLanguage(nextLanguage);
    };

    syncDocumentLanguage(language);
    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [language]);

  return (
    <ConfigProvider locale={settings.locale} direction={settings.direction}>
      <BrowserRouter>
        <Route
          exact
          path="/inspection-declaration"
          component={InspectionDeclaration}
        />
      </BrowserRouter>
    </ConfigProvider>
  );
}

normalizePhysicalHtmlUrl();

ReactDOM.render(
  <React.StrictMode>
    <InspectionDeclarationApp />
  </React.StrictMode>,
  document.getElementById("inspection-declaration-root"),
);
