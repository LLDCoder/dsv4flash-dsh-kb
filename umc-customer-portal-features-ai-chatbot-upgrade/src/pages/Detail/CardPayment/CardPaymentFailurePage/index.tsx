import React from "react";
import { CustomButton } from "@/components/common";
import { CloseOutlined } from "@ant-design/icons";
import formatMoney from "@/utils/formatMoney";
import type { CardPaymentFailureDetails, CardPaymentUiStatus } from "../utils";
import CardPaymentResultShell from "../CardPaymentResultShell";
import attemptedAmountIcon from "@/assets/images/AttemptedAmountIcon.svg";
import { useTranslation } from "react-i18next";
import "./index.less";

interface CardPaymentFailurePageProps {
  status: Extract<CardPaymentUiStatus, "failed" | "cancelled">;
  message?: string;
  details?: CardPaymentFailureDetails | null;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

const CardPaymentFailurePage: React.FC<CardPaymentFailurePageProps> = ({
  status,
  message,
  details,
  onPrimaryAction,
  onSecondaryAction,
}) => {
  const { t } = useTranslation();
  const resultDescription = details?.reason || message;
  const content = status === "cancelled"
    ? {
        title: t("payments.cardPaymentFailure.cancelledTitle"),
        description:
          resultDescription ||
          t("payments.cardPaymentFailure.cancelledDescription"),
      }
    : {
        title: t("payments.cardPaymentFailure.failedTitle"),
        description:
          resultDescription || t("payments.cardPaymentFailure.failedDescription"),
      };
  const detailItems = [
    { label: t("payments.cardPaymentFailure.errorCode"), value: details?.errorCode },
    { label: t("payments.cardPaymentFailure.reason"), value: details?.reason },
    { label: t("payments.cardPaymentFailure.transactionNumber"), value: details?.transactionNo },
    {
      label: t("payments.cardPaymentFailure.attemptedAmount"),
      value:
        typeof details?.attemptedAmount === "number" ? (
          <span className="card-payment-failure-page__amount">
            <img
              src={attemptedAmountIcon}
              alt=""
              className="card-payment-failure-page__amount-icon"
            />
            <span>{formatMoney(details.attemptedAmount)}</span>
          </span>
        ) : undefined,
    },
    { label: t("payments.cardPaymentFailure.timestamp"), value: details?.timestamp },
  ].filter((item) => item.value);

  return (
    <div className="card-payment-failure-page">
      <CardPaymentResultShell className="card-payment-failure-page__shell">
        <div className="card-payment-failure-page__body">
          <div className="card-payment-failure-page__icon">
            <CloseOutlined />
          </div>
          <div className="card-payment-failure-page__copy">
            <h1>{content.title}</h1>
            <p>{content.description}</p>
          </div>
          {detailItems.length > 0 && (
            <div className="card-payment-failure-page__details">
              {detailItems.map((item) => (
                <div
                  className="card-payment-failure-page__detail-row"
                  key={item.label}
                >
                  <span className="card-payment-failure-page__detail-label">
                    {item.label}
                  </span>
                  <span className="card-payment-failure-page__detail-value">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="card-payment-failure-page__actions">
            <CustomButton
              variant="outline"
              onClick={onPrimaryAction}
              customClassName="card-payment-failure-page__action card-payment-failure-page__action--secondary"
            >
              {t("payments.cardPaymentFailure.tryAgain")}
            </CustomButton>
            <CustomButton
              variant="primary"
              onClick={onSecondaryAction}
              customClassName="card-payment-failure-page__action card-payment-failure-page__action--primary"
            >
              {t("payments.cardPaymentFailure.differentMethod")}
            </CustomButton>
          </div>
        </div>
      </CardPaymentResultShell>
    </div>
  );
};

export default CardPaymentFailurePage;
