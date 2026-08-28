import React from "react";
import { useTranslation } from "react-i18next";
import "./index.less";

export type ApplicationTimelineItemState =
  | "completed"
  | "active"
  | "pending"
  | "error";

export interface ApplicationTimelineItem {
  key: string;
  label: string;
  state: ApplicationTimelineItemState;
}

interface ApplicationTimelineProps {
  items: ApplicationTimelineItem[];
}

const renderMarker = (state: ApplicationTimelineItemState) => {
  if (state === "completed") {
    return (
      <span className="timeline-head completed" aria-hidden="true">
        <span className="timeline-check" />
      </span>
    );
  }

  if (state === "active") {
    return <span className="timeline-head active" aria-hidden="true" />;
  }

  if (state === "error") {
    return <span className="timeline-head error" aria-hidden="true" />;
  }

  return <span className="timeline-head pending" aria-hidden="true" />;
};

const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({ items }) => {
  const { t } = useTranslation();

  return (
    <div className="application-timeline-card">
      <h3 className="card-title">
        {t("myRequestsPage.detail.timeline.title")}
      </h3>

      {items.length > 0 ? (
        <div className="application-timeline-list">
          {items.map((item, index) => {
            const isLastItem = index === items.length - 1;

            return (
              <div
                className={`application-timeline-item ${item.state}`}
                key={`${item.key}-${index}`}
              >
                <div className="timeline-marker">
                  {renderMarker(item.state)}
                  {!isLastItem && <span className="timeline-trail" />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="application-timeline-empty">
          {t("myRequestsPage.detail.timeline.empty")}
        </div>
      )}
    </div>
  );
};

export default ApplicationTimeline;
