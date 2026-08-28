import React from "react";
import { AlertBanner } from "@/components/common";
import { useTranslation } from "react-i18next";
import WarningIcon from "@/assets/images/warning_yellow.png";
export type AlertBannersMessageVariant = "establishment" | "personal";
type ExpiryDayContext =
  | "today"
  | "oneDay"
  | "twoDays"
  | "fewDays"
  | "manyDays";

const getExpiryDayContext = (
  days: number,
  includeToday: boolean,
): ExpiryDayContext => {
  if (includeToday && days <= 0) return "today";
  if (days === 1) return "oneDay";
  if (days === 2) return "twoDays";
  if (days <= 10) return "fewDays";
  return "manyDays";
};

interface AlertBannersProps {
  mode: string | null;
  /** Supports establishment or personal lifecycle modes — only expiry/rejection banners read this. */
  pageMode: string;
  expriryDays: number;
  /** Establishment flows pass establishment detail; omit when using `rejectReason`. */
  currentEstablishment?: { rejectReason?: string | null } | null;
  /** Overrides `currentEstablishment.rejectReason` when set (e.g. personal profile API). */
  rejectReason?: string | null;
  /**
   * `establishment` — default copy under `establishmentProfile.messages.*`.
   * `personal` — expiring/expired copy under `personalProfilePage.alerts.*`; rejected title still matches establishment wording via personal bundle.
   */
  messageVariant?: AlertBannersMessageVariant;
  /** Personal add flow — show complete-profile hint when continuing a draft */
  showCompleteProfileBanner?: boolean;
}

const AlertBanners: React.FC<AlertBannersProps> = ({
  mode,
  pageMode,
  expriryDays,
  currentEstablishment,
  rejectReason: rejectReasonProp,
  messageVariant = "establishment",
  showCompleteProfileBanner,
}) => {
  const { t } = useTranslation();

  const resolvedRejectReason =
    rejectReasonProp ?? currentEstablishment?.rejectReason ?? null;

  if (mode === "add") {
    return (
      <>
        {showCompleteProfileBanner && messageVariant === "personal" ? (
          <AlertBanner content={t("personalProfilePage.alerts.completeProfile")} />
        ) : null}
      </>
    );
  }

  const verificationFailedTitleKey =
    messageVariant === "personal"
      ? "personalProfilePage.alerts.verificationFailed"
      : "establishmentProfile.messages.verificationFailed";

  const expiringSoonContext = getExpiryDayContext(expriryDays, true);
  const expiredContext = getExpiryDayContext(expriryDays, false);
  const expirySoonContent =
    messageVariant === "personal"
      ? t("personalProfilePage.alerts.expiringSoon", {
          context: expiringSoonContext,
          count: expriryDays,
        })
      : t("establishmentProfile.messages.identityDocumentExpireIn", {
          context: expiringSoonContext,
          days: expriryDays,
        });

  const expiredContent =
    messageVariant === "personal"
      ? t("personalProfilePage.alerts.expired", {
          context: expiredContext,
          count: expriryDays,
        })
      : t("establishmentProfile.messages.identityDocumentExpiredAgo", {
          context: expiredContext,
          days: expriryDays,
        });

  return (
    <>
      {pageMode === "pendingCompletion" && (
        <AlertBanner
          type="warning"
          icon={<img src={WarningIcon} className="icon" />}
          style={{ color: "#361E12" }}
          content={t("personalProfilePage.alerts.completeProfile")}
        />
      )}
      {pageMode === "expiringSoon" && (
        <AlertBanner 
          type="warning" 
          content={expirySoonContent} 
          icon={<img src={WarningIcon} className="icon" />}
          style={{ color: "#361E12" }}
        />
      )}
      {pageMode === "expired" && (
        <AlertBanner type="error" content={expiredContent} style={{ color: "#361E12" }} />
      )}
      {pageMode === "rejected" && (
        <AlertBanner
          className="verificationFailed-alert-banner"
          type="error"
          style={{ color: "#361E12" }}
          content={
            <div>
              <div className="verificationFailed-title">{t(verificationFailedTitleKey)}</div>
              <div className="verificationFailed-content">{resolvedRejectReason || "-"}</div>
            </div>
          }
        />
      )}
    </>
  );
};

export default AlertBanners;
