import { useState } from "react";
import { Result, Spin } from "antd";
import { useTranslation } from "react-i18next";
import AEDG from "@/assets/images/AEDG.svg";
import { AlertBanner } from "@/components/common";
import type { PenaltyEvaluateResponse } from "@/services/services";
import ReviewProfileInfoCommon from "./ReviewProfileInfoCommon";
import { buildPenaltyRows, formatAmount } from "./quoteDisplayUtils";
import "./FeeQuoteDisplay.less";

export interface PenaltyDisplayProps {
  penaltyData?: PenaltyEvaluateResponse | null;
  penaltyLoading?: boolean;
  penaltyError?: string | null;
  missingPenaltyContext?: boolean;
}

export default function PenaltyDisplay({
  penaltyData = null,
  penaltyLoading = false,
  penaltyError = null,
  missingPenaltyContext = false,
}: PenaltyDisplayProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const penaltyRows = buildPenaltyRows(penaltyData);
  const currency = penaltyData?.currency || "AED";
  const hasPenaltyAmount = Number(penaltyData?.totalAmount ?? 0) > 0;

  if (
    !penaltyLoading &&
    !penaltyError &&
    !missingPenaltyContext &&
    !hasPenaltyAmount
  ) {
    return null;
  }

  return (
    <ReviewProfileInfoCommon
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
      sectionTitle={t("PenaltyDisplay.sectionTitle")}
      className="penalty-display"
    >
      {penaltyLoading ? (
        <div className="quote-display-loading">
          <Spin tip={t("PenaltyDisplay.calculatingPenalty")} />
        </div>
      ) : penaltyError ? (
        <div className="quote-display-error">
          <Result
            status="error"
            title={t("PenaltyDisplay.calculationFailed")}
            subTitle={penaltyError}
          />
        </div>
      ) : (
        <>
          {missingPenaltyContext && (
            <AlertBanner
              type="warning"
              className="quote-display-inline-banner"
              content={t("PenaltyDisplay.unavailable")}
            />
          )}
          {hasPenaltyAmount && penaltyData && (
            <div className="quote-display-table">
              <div className="quote-display-table__header">
                <div className="quote-display-table__charge-name">
                  {t("PenaltyDisplay.chargeName")}
                </div>
                <div className="quote-display-table__amount">
                  {t("PenaltyDisplay.amount", { currency })}
                </div>
              </div>

              {penaltyRows.map((item, index) => (
                <div
                  key={`${item.code || "penalty"}-${index}`}
                  className="quote-display-table__row quote-display-table__row--penalty"
                >
                  <div className="quote-display-table__charge-name">
                    {item.chargeName || "-"}
                  </div>
                  <div className="quote-display-table__amount">
                    {formatAmount(item.amount)}
                  </div>
                </div>
              ))}

              <div className="quote-display-table__footer">
                <div className="quote-display-table__total-label">
                  {t("PenaltyDisplay.totalPenalty")}
                </div>
                <div className="quote-display-table__total-amount">
                  <img src={AEDG} alt="AED" />
                  {formatAmount(penaltyData.totalAmount)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ReviewProfileInfoCommon>
  );
}
