import { fmt } from "@/utils/gstTime";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { Modal, Spin } from "antd";

import PublicLayout from "@/components/common/PublicLayout";
import ArrowLeft from "@/assets/icons/ArrowLeft";
import { CustomMessage } from "@/components/common";
import WarningRed from "@/assets/images/WarningRed.png";
import BaseNumber from "@/assets/images/info_ticket_number.png";
import BaseEnquiryType from "@/assets/images/info_enquiry_type.png";
import BaseStatus from "@/assets/images/info_status.png";
import BaseSubmissionTime from "@/assets/images/info_submission_time.png";
import facebook from "@/assets/images/facebook.png";
import instagram from "@/assets/images/instagram.png";
import linkedin from "@/assets/images/linkedin.png";
import twitter from "@/assets/images/twitter.png";
import youtube from "@/assets/images/youtube.png";
import {
  getPublicEnquiryDetail,
  postPublicEnquiryCancel,
  type PublicEnquiryDetail,
} from "@/services/complaints";
import { resolveApiEntityLabel } from "@/utils/bilingualDisplay";
import authStorage from "@/storage/authStorage";

import "./index.less";

type NavState = { ticket?: string; email?: string };

// Status ids: <5 = Open/Processing (Under Processing), 5 Resolved, 6 Completed, 7 Cancelled.
const ST_RESOLVED = 5;
const ST_COMPLETED = 6;
const ST_CANCELLED = 7;

export default function PublicEnquiryDetails() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const history = useHistory();
  const location = useLocation<NavState>();
  // The breadcrumb (Home / Enquiries & Complaints) is only meaningful inside the
  // authenticated portal; anonymous visitors reach this page from the public flow.
  const isLoggedIn = !!authStorage.getToken();

  const ticket =
    location.state?.ticket ||
    new URLSearchParams(location.search).get("requestNumber") ||
    "";
  const email = location.state?.email || "";

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PublicEnquiryDetail | null>(null);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPublicEnquiryDetail(ticket, email);
      setDetail(((res as any)?.data as PublicEnquiryDetail) ?? null);
    } finally {
      setLoading(false);
    }
  }, [ticket, email]);

  useEffect(() => {
    // No ticket/email (e.g. opened directly / refreshed) -> send the user to the public lookup.
    if (!ticket || !email) {
      history.replace("/track-application");
      return;
    }
    loadDetail();
  }, [ticket, email, history, loadDetail]);

  const statusId = detail?.enquiryStatusId ?? 0;
  const isCancelled = statusId === ST_CANCELLED;
  const isClosed = statusId === ST_RESOLVED || statusId === ST_COMPLETED || isCancelled;
  const canCancel = !isClosed; // Under Processing only

  const statusName =
    (isAr ? detail?.enquiryStatusObj?.nameAr : detail?.enquiryStatusObj?.nameEn) ||
    detail?.enquiryStatusObj?.nameEn ||
    "-";
  const statusClass = isCancelled
    ? "ped-badge-cancelled"
    : isClosed
      ? "ped-badge-done"
      : "ped-badge-processing";

  const fmtTime = (s?: string | null) =>
  fmt(s, "DD/MM/YYYY HH:mm:ss");

  const handleCancel = async () => {
    try {
      setCancelling(true);
      const res = await postPublicEnquiryCancel(ticket, email);
      if ((res as any)?.data) {
        setCancelVisible(false);
        CustomMessage.success(t("publicEnquiryDetails.cancelled"));
        await loadDetail();
      }
    } catch (error) {
      console.error("Failed to cancel public enquiry:", error);
      CustomMessage.error(t("publicEnquiryDetails.cancelFailed"));
    } finally {
      setCancelling(false);
    }
  };

  const dataItem = (label: string, value?: string | null) => (
    <div className="ped-data-item">
      <div className="ped-data-label">{label}</div>
      <div className="ped-data-value" dir="auto">{value || "-"}</div>
    </div>
  );

  return (
    <PublicLayout className="ped-public-layout">
      <div className="public-enquiry-details">
        <Spin spinning={loading}>
          {/* breadcrumb + title */}
          <div className="ped-head">
            {isLoggedIn && (
              <div className="ped-breadcrumb">
                <span className="ped-bc-muted">{t("publicEnquiryDetails.breadcrumbHome")}</span>
                <span className="ped-bc-sep">/</span>
                <span className="ped-bc-muted">{t("publicEnquiryDetails.breadcrumbEnquiries")}</span>
                <span className="ped-bc-sep">/</span>
                <span>{t("publicEnquiryDetails.title")}</span>
              </div>
            )}
            <div className="ped-title">
              <ArrowLeft className="ped-back" onClick={() => history.push("/login")} />
              {t("publicEnquiryDetails.title")}
            </div>
          </div>

          {detail && (
            <>
              {/* status card */}
              <div className="ped-status-card">
                <div className="ped-status-item">
                  <img className="ped-status-ico" src={BaseNumber} alt="" />
                  <div className="ped-status-text">
                    <div className="ped-status-label">{t("publicEnquiryDetails.ticketNumber")}</div>
                    <div className="ped-status-value">{detail.enquiryNumber}</div>
                  </div>
                </div>
                <div className="ped-status-item">
                  <img className="ped-status-ico" src={BaseEnquiryType} alt="" />
                  <div className="ped-status-text">
                    <div className="ped-status-label">{t("publicEnquiryDetails.enquiryType")}</div>
                    <div className="ped-status-value">{resolveApiEntityLabel(isAr, detail.enquiryTypeObj) || "-"}</div>
                  </div>
                </div>
                <div className="ped-status-item">
                  <img className="ped-status-ico" src={BaseStatus} alt="" />
                  <div className="ped-status-text">
                    <div className="ped-status-label">{t("publicEnquiryDetails.status")}</div>
                    <div className={`ped-badge ${statusClass}`}>{statusName}</div>
                  </div>
                </div>
                <div className="ped-status-item">
                  <img className="ped-status-ico" src={BaseSubmissionTime} alt="" />
                  <div className="ped-status-text">
                    <div className="ped-status-label">{t("publicEnquiryDetails.submissionTime")}</div>
                    <div className="ped-status-value">{fmtTime(detail.createdOn)}</div>
                  </div>
                </div>
              </div>

              {/* basic information */}
              <div className="ped-section">
                <div className="ped-section-title">{t("publicEnquiryDetails.basicInformation")}</div>
                <div className="ped-data-grid">
                  {dataItem(t("publicEnquiryDetails.enquirySource"), resolveApiEntityLabel(isAr, detail.enquirySourceObj) || "Customer Portal")}
                  {dataItem(t("publicEnquiryDetails.applicationNumber"), detail.applicationNo)}
                  {dataItem(t("publicEnquiryDetails.serviceName"), resolveApiEntityLabel(isAr, detail.serviceObj))}
                  {dataItem(t("publicEnquiryDetails.fullName"), detail.fullName)}
                  {dataItem(t("publicEnquiryDetails.email"), detail.email)}
                  {dataItem(
                    t("publicEnquiryDetails.attachments"),
                    detail.attachmentUrls && detail.attachmentUrls.length > 0
                      ? detail.attachmentUrls.join(", ")
                      : t("publicEnquiryDetails.noAttachment"),
                  )}
                  {dataItem(t("complaintsPage.detail.problemDescription"), detail.description)}
                </div>
              </div>

              {/* bottom bar */}
              <div className="ped-bottom-bar">
                <button type="button" className="ped-btn ped-btn-outline" onClick={() => history.push("/login")}>
                  {t("publicEnquiryDetails.back")}
                </button>
                {canCancel && (
                  <button type="button" className="ped-btn ped-btn-outline" onClick={() => setCancelVisible(true)}>
                    {t("publicEnquiryDetails.cancelComplaint")}
                  </button>
                )}
              </div>
            </>
          )}
        </Spin>
      </div>

      {/* page-local footer (Figma) */}
      <footer className="ped-footer">
        <div className="ped-footer-copyright">
          {t("publicEnquiryDetails.footer.rights", { year: new Date().getFullYear() })}
        </div>
        <div className="ped-footer-links">
          <span>{t("publicEnquiryDetails.footer.accessibility")}</span>
          <i className="ped-footer-sep" />
          <span>{t("publicEnquiryDetails.footer.customerHappiness")}</span>
          <i className="ped-footer-sep" />
          <span>{t("publicEnquiryDetails.footer.terms")}</span>
          <i className="ped-footer-sep" />
          <span>{t("publicEnquiryDetails.footer.privacy")}</span>
          <i className="ped-footer-sep" />
          <span>{t("publicEnquiryDetails.footer.faqs")}</span>
        </div>
        <div className="ped-footer-social">
          <span className="ped-footer-follow">{t("publicEnquiryDetails.footer.followUs")}</span>
          <img src={facebook} alt="Facebook" />
          <img src={instagram} alt="Instagram" />
          <img src={linkedin} alt="LinkedIn" />
          <img src={twitter} alt="X" />
          <img src={youtube} alt="YouTube" />
        </div>
      </footer>

      <Modal
        className="ped-cancel-modal"
        visible={cancelVisible}
        title={false}
        footer={false}
        maskClosable={false}
        onCancel={() => setCancelVisible(false)}
        centered
      >
        <div className="ped-cancel-body">
          <div className="ped-cancel-content">
            <div className="ped-cancel-icon">
              <img src={WarningRed} alt="warning" />
            </div>
            <div className="ped-cancel-tt">
              <div className="ped-cancel-title">{t("publicEnquiryDetails.cancelComplaint")}</div>
              <div className="ped-cancel-desc">{t("publicEnquiryDetails.cancelConfirm")}</div>
            </div>
            <div className="ped-cancel-actions">
              <button type="button" className="ped-btn ped-btn-danger-outline ped-cancel-cancel" onClick={() => setCancelVisible(false)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="ped-btn ped-btn-danger ped-submit-submit" disabled={cancelling} onClick={handleCancel}>
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </PublicLayout>
  );
}
