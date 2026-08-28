import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PayIcon from "@/assets/images/pay.svg";
import TotalIcon from "@/assets/images/total.svg";
import ProcessIcon from "@/assets/images/process.svg";
import AED from "@/assets/images/AED.svg";
import "./ServiceDetails.less";
import { useHistory } from "react-router-dom";
import { useServicesStore } from "@/store/services";

export default function ServiceDetails({
  TotalAmount,
  fullDescription,
  ProcessTime,
  PaymentTimeline,
  paymentTimelineDays,
  moreMode = "toggle",
  serviceId,
}: {
  TotalAmount?: number | null;
  fullDescription: string;
  ProcessTime: string;
  PaymentTimeline?: string;
  paymentTimelineDays?: number;
  moreMode?: "toggle" | "link";
  serviceId?: number;
}) {
  const { t } = useTranslation();
  const history = useHistory();

  const ServicesStore = useServicesStore();
  const [expanded, setExpanded] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isDescriptionOverflowing, setIsDescriptionOverflowing] =
    useState(false);
  const processTimeDisplay = String(ProcessTime ?? "").trim() || "-";
  const hasTotalAmount =
    typeof TotalAmount === "number" && Number.isFinite(TotalAmount);
  const showMoreButton =
    Boolean(fullDescription) && (expanded || isDescriptionOverflowing);

  useLayoutEffect(() => {
    if (expanded) return;

    const descriptionElement = descriptionRef.current;
    if (!descriptionElement) return;

    const updateOverflowState = () => {
      setIsDescriptionOverflowing(
        descriptionElement.scrollHeight > descriptionElement.clientHeight,
      );
    };

    updateOverflowState();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateOverflowState);

      return () => {
        window.removeEventListener("resize", updateOverflowState);
      };
    }

    const resizeObserver = new ResizeObserver(updateOverflowState);
    resizeObserver.observe(descriptionElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [expanded, fullDescription]);
  const handleMoreClick = () => {
    if (moreMode === "link") {
      const targetServiceId = serviceId || ServicesStore.userInfo?.servicesId;

      if (targetServiceId) {
        history.push(`/services/service-card?id=${targetServiceId}`);
      }
      return;
    }

    setExpanded((prev) => !prev);
  };

  return (
    <div className="service-details-card">
      <h3 className="card-title">
        {t("serviceApplicationSidebar.serviceDetailsTitle")}
      </h3>

      <div className="details-content">
        <p
          ref={descriptionRef}
          className={`description${expanded ? "" : " description--clamped"}`}
        >
          {fullDescription}
        </p>
        {showMoreButton && (
          <button type="button" className="more-btn" onClick={handleMoreClick}>
            {moreMode === "link" || !expanded
              ? t("serviceApplicationSidebar.more")
              : t("serviceApplicationSidebar.less")}{" "}
            &gt;
          </button>
        )}

        <div className="details-list">
          <div className="detail-item">
            <img src={ProcessIcon} className="detail-icon" />
            <div className="detail-info">
              <span className="detail-label">
                {t("serviceApplicationSidebar.processTime")}
              </span>
              <span className="detail-value">{processTimeDisplay}</span>
            </div>
          </div>

          <div className="detail-item">
            <img src={TotalIcon} className="detail-icon" />
            <div className="detail-info">
              <span className="detail-label">
                {t("serviceApplicationSidebar.totalAmount")}
              </span>
              <span className="detail-value total-amount">
                {hasTotalAmount ? (
                  <>
                    <img src={AED} />
                    {TotalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </>
                ) : (
                  "-"
                )}
              </span>
            </div>
          </div>

          <div className="detail-item">
            <img src={PayIcon} className="detail-icon" />
            <div className="detail-info">
              <span className="detail-label">
                {t("serviceApplicationSidebar.paymentTimelineLabel")}
              </span>
              <span className="detail-value">
                {PaymentTimeline ||
                  t("serviceApplicationSidebar.paymentTimelineValue", {
                    count: paymentTimelineDays ?? 21,
                  })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
