import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Checkbox, Spin, message } from "antd";
import { useTranslation } from "react-i18next";
import LangMenu from "@/components/common/LangMenu";
import {
  confirmTraining,
  getTrainingConfirmation,
  type TrainingConfirmationData,
  type TrainingConfirmationStatus,
} from "./service";
import applicationDocumentAsset from "./assets/icon-application-document.svg";
import applicationFoldAsset from "./assets/icon-application-fold.svg";
import applicationLineLongAsset from "./assets/icon-application-line-long.svg";
import applicationLineShortAsset from "./assets/icon-application-line-short.svg";
import emailAsset from "./assets/icon-email.svg";
import influencerAsset from "./assets/icon-influencer.svg";
import serviceLineAsset from "./assets/icon-service-line.svg";
import serviceTopAsset from "./assets/icon-service-top.svg";
import toastErrorAsset from "./assets/icon-toast-error.svg";
import toastSuccessAsset from "./assets/icon-toast-success.svg";
import warningAsset from "./assets/icon-warning.svg";
import logoAsset from "./assets/logo-uae-media-council.svg";
import statusSubmittedAsset from "./assets/status-submitted.svg";
import statusUnavailableAsset from "./assets/status-unavailable.svg";
import "./index.less";

type PageStatus = TrainingConfirmationStatus | "loading" | "loadError";

type InformationRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

const ApplicationNumberIcon = () => (
  <span className="training-confirmation__information-icon" aria-hidden="true">
    <img
      className="training-confirmation__information-icon-layer training-confirmation__information-icon-layer--application-document"
      src={applicationDocumentAsset}
      alt=""
    />
    <img
      className="training-confirmation__information-icon-layer training-confirmation__information-icon-layer--application-fold"
      src={applicationFoldAsset}
      alt=""
    />
    <img
      className="training-confirmation__information-icon-layer training-confirmation__information-icon-layer--application-short-line"
      src={applicationLineShortAsset}
      alt=""
    />
    <img
      className="training-confirmation__information-icon-layer training-confirmation__information-icon-layer--application-long-line"
      src={applicationLineLongAsset}
      alt=""
    />
  </span>
);

const ServiceIcon = () => (
  <span className="training-confirmation__information-icon" aria-hidden="true">
    <img
      className="training-confirmation__information-icon-layer training-confirmation__information-icon-layer--service-top"
      src={serviceTopAsset}
      alt=""
    />
    <img
      className="training-confirmation__information-icon-layer training-confirmation__information-icon-layer--service-middle"
      src={serviceLineAsset}
      alt=""
    />
    <img
      className="training-confirmation__information-icon-layer training-confirmation__information-icon-layer--service-bottom"
      src={serviceLineAsset}
      alt=""
    />
  </span>
);

const InformationIcon = ({ src }: { src: string }) => (
  <span className="training-confirmation__information-icon" aria-hidden="true">
    <img className="training-confirmation__information-icon-image" src={src} alt="" />
  </span>
);

const InformationRow = ({ icon, label, value }: InformationRowProps) => (
  <div className="training-confirmation__information-row">
    {icon}
    <span className="training-confirmation__information-label">{label}</span>
    <span className="training-confirmation__information-value">{value}</span>
  </div>
);

export default function TrainingConfirmation() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [details, setDetails] = useState<TrainingConfirmationData | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoRefreshAttemptedRef = useRef(false);
  const maxWatchedTimeRef = useRef(0);
  const restoringSeekRef = useRef(false);
  const isArabic = i18n.language?.toLowerCase().startsWith("ar");

  const localizedServiceName = useMemo(() => {
    if (!details) return "";
    return (isArabic ? details.serviceNameAr : details.serviceNameEn) || "";
  }, [details, isArabic]);

  const applyDetails = useCallback(
    (nextDetails: TrainingConfirmationData, resetConfirmation = true) => {
      setDetails(nextDetails);
      setPageStatus(nextDetails.status);

      if (nextDetails.status === "Pending") {
        setVideoUnavailable(!nextDetails.trainingVideoUrl);
        if (resetConfirmation) {
          setVideoEnded(false);
          setAcknowledged(false);
          videoRefreshAttemptedRef.current = false;
          maxWatchedTimeRef.current = 0;
          restoringSeekRef.current = false;
        }
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    setPageStatus("loading");

    getTrainingConfirmation(token)
      .then((data) => {
        if (active) applyDetails(data);
      })
      .catch(() => {
        console.error("Failed to load training confirmation.");
        if (active) setPageStatus("loadError");
      });

    return () => {
      active = false;
    };
  }, [applyDetails, token]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const showToast = (kind: "success" | "error", content: string) => {
    message.open({
      key: "training-confirmation-feedback",
      className: `training-confirmation-message training-confirmation-message--${kind}`,
      content,
      icon: (
        <img
          className="training-confirmation-message__icon"
          src={kind === "success" ? toastSuccessAsset : toastErrorAsset}
          alt=""
        />
      ),
    });
  };

  const handleVideoError = async () => {
    if (videoRefreshAttemptedRef.current) {
      setVideoUnavailable(true);
      return;
    }

    videoRefreshAttemptedRef.current = true;
    try {
      const refreshed = await getTrainingConfirmation(token);
      if (
        refreshed.status === "Pending" &&
        refreshed.trainingVideoUrl &&
        refreshed.trainingVideoUrl !== details?.trainingVideoUrl
      ) {
        applyDetails(refreshed, false);
        setVideoUnavailable(false);
        return;
      }

      if (refreshed.status !== "Pending") {
        applyDetails(refreshed, false);
        return;
      }
    } catch {
      console.error("Failed to refresh training video URL.");
    }

    setVideoUnavailable(true);
  };

  const handleVideoTimeUpdate = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const video = event.currentTarget;
    if (!video.seeking && !restoringSeekRef.current) {
      maxWatchedTimeRef.current = Math.max(
        maxWatchedTimeRef.current,
        video.currentTime,
      );
    }
  };

  const handleVideoSeeking = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const video = event.currentTarget;
    if (
      !restoringSeekRef.current &&
      video.currentTime > maxWatchedTimeRef.current
    ) {
      restoringSeekRef.current = true;
      video.currentTime = maxWatchedTimeRef.current;
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (videoUnavailable) {
      showToast("error", t("trainingConfirmation.videoUnavailable"));
      return;
    }

    if (!videoEnded) {
      showToast("error", t("trainingConfirmation.watchVideoBeforeSubmit"));
      return;
    }

    if (!acknowledged) {
      showToast("error", t("trainingConfirmation.acknowledgeBeforeSubmit"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await confirmTraining(token);
      if (result.status === "Completed") {
        showToast("success", t("trainingConfirmation.submissionSuccess"));
        applyDetails(result, false);
        return;
      }

      if (result.status === "Pending") {
        showToast("error", t("trainingConfirmation.submissionFailed"));
        return;
      }

      applyDetails(result, false);
    } catch {
      console.error("Failed to submit training confirmation.");
      showToast("error", t("trainingConfirmation.submissionFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <header className="training-confirmation__header">
      <h1 className="training-confirmation__title">
        {t("trainingConfirmation.title")}
      </h1>
      <div className="training-confirmation__brand">
        <LangMenu lang={i18n.language} onChange={() => undefined} />
        <img
          className="training-confirmation__logo"
          src={logoAsset}
          alt={t("trainingConfirmation.logoAlt")}
        />
      </div>
    </header>
  );

  const getStatusMessage = () => {
    switch (pageStatus) {
      case "Completed":
        return t("trainingConfirmation.completed");
      case "Cancelled":
        return t("trainingConfirmation.cancelled");
      case "Expired":
        return t("trainingConfirmation.expired");
      case "NotFound":
        return t("trainingConfirmation.notFound");
      default:
        return t("trainingConfirmation.loadFailed");
    }
  };

  if (pageStatus === "loading") {
    return (
      <main className="training-confirmation">
        <div className="training-confirmation__shell training-confirmation__shell--status">
          {renderHeader()}
          <section className="training-confirmation__status-card">
            <Spin size="large" />
          </section>
        </div>
      </main>
    );
  }

  if (pageStatus !== "Pending") {
    const isCompleted = pageStatus === "Completed";
    return (
      <main className="training-confirmation">
        <div className="training-confirmation__shell training-confirmation__shell--status">
          {renderHeader()}
          <section className="training-confirmation__status-card">
            <img
              className="training-confirmation__status-icon"
              src={isCompleted ? statusSubmittedAsset : statusUnavailableAsset}
              alt=""
            />
            <p className="training-confirmation__status-message">
              {getStatusMessage()}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const submissionRequirementsMet =
    videoEnded && acknowledged && !videoUnavailable;

  return (
    <main className="training-confirmation">
      <div className="training-confirmation__shell">
        {renderHeader()}
        <div className="training-confirmation__cards">
          <section className="training-confirmation__card training-confirmation__application-card">
            <h2 className="training-confirmation__card-title">
              {t("trainingConfirmation.applicationInformation")}
            </h2>
            <div className="training-confirmation__information-list">
              <InformationRow
                icon={<ApplicationNumberIcon />}
                label={t("trainingConfirmation.applicationNumber")}
                value={details?.applicationNumber || ""}
              />
              <InformationRow
                icon={<InformationIcon src={influencerAsset} />}
                label={t("trainingConfirmation.influencerName")}
                value={details?.recipientName || ""}
              />
              <InformationRow
                icon={<InformationIcon src={emailAsset} />}
                label={t("trainingConfirmation.email")}
                value={details?.recipientEmail || ""}
              />
              <InformationRow
                icon={<ServiceIcon />}
                label={t("trainingConfirmation.serviceName")}
                value={localizedServiceName}
              />
            </div>
          </section>

          <section className="training-confirmation__card training-confirmation__video-card">
            <h2 className="training-confirmation__card-title">
              {t("trainingConfirmation.trainingVideo")}
            </h2>
            <div className="training-confirmation__notice">
              <img
                className="training-confirmation__notice-icon"
                src={warningAsset}
                alt=""
              />
              <p className="training-confirmation__notice-text">
                {t("trainingConfirmation.trainingNotice")}
              </p>
            </div>
            {details?.trainingVideoUrl && !videoUnavailable ? (
              <video
                key={details.trainingVideoUrl}
                ref={videoRef}
                className="training-confirmation__video"
                src={details.trainingVideoUrl}
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onEnded={() => setVideoEnded(true)}
                onError={handleVideoError}
                onSeeking={handleVideoSeeking}
                onSeeked={() => {
                  restoringSeekRef.current = false;
                }}
                onTimeUpdate={handleVideoTimeUpdate}
                aria-label={t("trainingConfirmation.videoAriaLabel")}
              />
            ) : (
              <div className="training-confirmation__video-unavailable">
                {t("trainingConfirmation.videoUnavailable")}
              </div>
            )}
          </section>

          <section className="training-confirmation__card training-confirmation__declaration-card">
            <h2 className="training-confirmation__card-title">
              {t("trainingConfirmation.declarationTitle")}
            </h2>
            <div className="training-confirmation__acknowledgement">
              <Checkbox
                checked={acknowledged}
                disabled={videoUnavailable}
                onChange={(event) => setAcknowledged(event.target.checked)}
              >
                {t("trainingConfirmation.declarationText")}
              </Checkbox>
            </div>
          </section>
        </div>

        <footer className="training-confirmation__footer">
          <Button
            type="primary"
            className={`training-confirmation__submit${
              submissionRequirementsMet
                ? ""
                : " training-confirmation__submit--disabled"
            }`}
            aria-disabled={!submissionRequirementsMet || submitting}
            disabled={submitting}
            loading={submitting}
            onClick={handleSubmit}
          >
            {t("trainingConfirmation.submit")}
          </Button>
        </footer>
      </div>
    </main>
  );
}
