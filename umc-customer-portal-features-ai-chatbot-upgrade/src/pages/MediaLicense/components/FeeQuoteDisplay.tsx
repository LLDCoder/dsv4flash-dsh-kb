import { useState } from "react";
import { Result, Spin } from "antd";
import { useTranslation } from "react-i18next";
import AEDH from "@/assets/images/AEDH.svg";
import AEDG from "@/assets/images/AEDG.svg";
import type { FeeQuoteResponse } from "@/services/services";
import ReviewProfileInfoCommon from "./ReviewProfileInfoCommon";
import { buildFeeRows, formatAmount } from "./quoteDisplayUtils";
import "./FeeQuoteDisplay.less";

export interface FeeQuoteDisplayProps {
  quoteData: FeeQuoteResponse | null;
  quoteLoading: boolean;
  quoteError: string | null;
}

export default function FeeQuoteDisplay({
  quoteData,
  quoteLoading,
  quoteError,
}: FeeQuoteDisplayProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const feeRows = buildFeeRows(quoteData, i18n.language?.startsWith("ar"));
  const currency = quoteData?.currency || "AED";

  if (!quoteLoading && !quoteError && !quoteData) {
    return null;
  }

  return (
    <ReviewProfileInfoCommon
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
      sectionTitle={t("FeeQuoteDisplay.sectionTitle")}
      className="fee-quote-display"
      rootClassName={`fee-quote-display-section${
        expanded ? " fee-quote-display-section--expanded" : ""
      }`}
    >
      {quoteLoading && !quoteData ? (
        <div className="quote-display-loading">
          <Spin tip={t("FeeQuoteDisplay.calculatingFees")} />
        </div>
      ) : quoteError ? (
        <div className="quote-display-error">
          <Result
            status="error"
            title={t("FeeQuoteDisplay.calculationFailed")}
            subTitle={quoteError}
          />
        </div>
      ) : (
        quoteData && (
          <div className="quote-display-table">
            <div className="quote-display-table__header">
              <div className="quote-display-table__number">
                {t("FeeQuoteDisplay.number")}
              </div>
              <div className="quote-display-table__activity">
                <span className="quote-display-table__activity-text">
                  {t("FeeQuoteDisplay.activity")}
                </span>
              </div>
              <div className="quote-display-table__amount">
                <span>{t("FeeQuoteDisplay.fees")}</span>
                <span className="quote-display-table__currency">
                  (
                  {currency === "AED" ? (
                    <img src={AEDH} alt="AED" />
                  ) : (
                    currency
                  )}
                  )
                </span>
              </div>
            </div>

            {feeRows.map((item, index) => (
              <div
                key={`${item.code || "fee"}-${index}`}
                className="quote-display-table__row"
              >
                <div className="quote-display-table__number">{index + 1}</div>
                <div className="quote-display-table__activity">
                  <span className="quote-display-table__activity-text">
                    {item.chargeName || "-"}
                  </span>
                </div>
                <div className="quote-display-table__amount">
                  {formatAmount(item.amount)}
                </div>
              </div>
            ))}

            <div className="quote-display-table__footer">
              <div className="quote-display-table__total-label">
                {t("FeeQuoteDisplay.totalFee")}
              </div>
              <div className="quote-display-table__total-amount">
                <img src={AEDG} alt="AED" />
                {formatAmount(quoteData.totalAmount)}
              </div>
            </div>
          </div>
        )
      )}
    </ReviewProfileInfoCommon>
  );
}
