import { Result } from "antd";
import { useTranslation } from "react-i18next";
import LangMenu from "@/components/common/LangMenu";
import logoAsset from "./assets/logo-uae-media-council.svg";
import linkExpiredAsset from "./assets/LinkExpired.svg";
import submittedAsset from "./assets/Submitted.svg";
import "./index.less";

export type DeclarationResultStatus = "submitted" | "linkExpired";

export default function StatusPage({
  status,
}: {
  status: DeclarationResultStatus;
}) {
  const { t, i18n } = useTranslation();
  const isSuccess = status === "submitted";

  return (
    <main className="inspection-declaration">
      <div className="inspection-declaration__shell inspection-declaration__shell--status">
        <header className="inspection-declaration__header">
          <h1 className="inspection-declaration__title">
            {t("inspectionDeclaration.title")}
          </h1>
          <div className="inspection-declaration__brand">
            <LangMenu lang={i18n.language} onChange={() => undefined} />
            <img
              className="inspection-declaration__logo"
              src={logoAsset}
              alt={t("inspectionDeclaration.logoAlt")}
            />
          </div>
        </header>
        <div className="inspection-declaration__status-card">
          <Result
            icon={
              <img
                className="inspection-declaration__status-icon"
                src={isSuccess ? submittedAsset : linkExpiredAsset}
                alt=""
              />
            }
            title={
              isSuccess
                ? t("inspectionDeclaration.status.submittedTitle")
                : t("inspectionDeclaration.status.notFoundTitle")
            }
          />
        </div>
      </div>
    </main>
  );
}
