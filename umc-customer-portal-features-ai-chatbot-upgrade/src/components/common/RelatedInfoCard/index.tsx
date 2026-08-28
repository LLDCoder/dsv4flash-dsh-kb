import React from "react";
import type { ReactNode } from "react";
import "./index.less";
import CustomButton from "@/components/common/CustomButton";

export type RelatedInfoCardStatusVariant =
  | "success"
  | "warn"
  | "error"
  | "cancelled"
  | "neutral";

export interface RelatedInfoCardProps {
  title: ReactNode;
  number: ReactNode;
  statusLabel?: ReactNode;
  statusVariant?: RelatedInfoCardStatusVariant;
  children: ReactNode;
  viewLabel?: ReactNode;
  onView?: () => void | Promise<void>;
  className?: string;
}
export interface RelatedInfoCardGroupProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}
export interface RelatedInfoCardPanelProps {
  number: ReactNode;
  status?: ReactNode;
  children: ReactNode;
  viewLabel?: ReactNode;
  onView?: () => void | Promise<void>;
  className?: string;
}

const RelatedInfoCard: React.FC<RelatedInfoCardProps> = ({
  title,
  number,
  statusLabel,
  statusVariant,
  children,
  viewLabel,
  onView,
  className,
}) => {
  const pillClass = [
    "related-info-card__status-pill",
    statusVariant
      ? `related-info-card__status-pill--${statusVariant}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={[
        "related-info-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 className="related-info-card__title">{title}</h2>
      <div className="related-info-card__panel">
        <div className="related-info-card__header">
          <div className="related-info-card__number">{number}</div>
          {statusLabel != null ? (
            <span className={pillClass}>{statusLabel}</span>
          ) : null}
        </div>
        {children}
        {onView != null ? (
          <div className="related-info-card__action">
            <CustomButton
              text={viewLabel}
              variant="outline"
              size="medium"
              customClassName="related-info-card__action-button"
              onClick={onView}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
export const RelatedInfoCardGroup: React.FC<RelatedInfoCardGroupProps> = ({
  title,
  children,
  className,
}) => (
  <div
    className={["related-info-card", className].filter(Boolean).join(" ")}
  >
    <h2 className="related-info-card__title">{title}</h2>
    {children}
  </div>
);
export const RelatedInfoCardPanel: React.FC<RelatedInfoCardPanelProps> = ({
  number,
  status,
  children,
  viewLabel,
  onView,
  className,
}) => (
  <div
    className={["related-info-card__panel", className]
      .filter(Boolean)
      .join(" ")}
  >
    <div className="related-info-card__header">
      <div className="related-info-card__number">{number}</div>
      {status != null ? (
        <span className="related-info-card__status">{status}</span>
      ) : null}
    </div>
    {children}
    {onView != null ? (
      <div className="related-info-card__action">
        <CustomButton
          text={viewLabel}
          variant="outline"
          size="medium"
          customClassName="related-info-card__action-button"
          onClick={onView}
        />
      </div>
    ) : null}
  </div>
);

export default RelatedInfoCard;
