import React from "react";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import {
  APPEAL_STATUS_ID,
  VIOLATION_STATUS_ID,
  type AppealStatus,
  type ViolationStatus,
} from "../utils/fixtures";

export const StatusTag = ({
  status,
  kind,
}: {
  status: ViolationStatus | AppealStatus;
  kind: "violation" | "appeal";
}) => {
  const id =
    kind === "violation"
      ? VIOLATION_STATUS_ID[status as ViolationStatus]
      : APPEAL_STATUS_ID[status as AppealStatus];
  return <CustomStatusTag status={id} type={kind} />;
};

export const PageShell = ({ children }: React.PropsWithChildren<object>) => {
  return <div className="violations-fines-page">{children}</div>;
};

export const SummaryCard = ({
  items,
  variant = "default",
}: {
  items: Array<{ label: string; value: React.ReactNode; icon?: React.ReactNode }>;
  variant?: "default" | "appeal";
}) => {
  return (
    <div className={`violations-fines-summary-card violations-fines-summary-card--${variant}`}>
      {items.map((item) => (
        <div className="violations-fines-summary-card__item" key={item.label}>
          <div className="violations-fines-summary-card__icon">{item.icon}</div>
          <div className="violations-fines-summary-card__content">
            <div className="violations-fines-summary-card__label">{item.label}</div>
            <div className="violations-fines-summary-card__value">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
