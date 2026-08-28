import React from "react";
import { CopyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { CustomButton, PaymentSuccessFeedback } from "@/components/common";
import successIcon from "@/assets/images/comfirm_success.png";
import { copyToClipboard } from "@/utils/copy";
import { resolveCardPaymentSuccessPresentation } from "../utils";
import CardPaymentResultShell from "../CardPaymentResultShell";
import "./index.less";

interface CardPaymentSuccessPageProps {
  applicationNumber: string;
  isContentService: boolean;
  onDownloadReceipt: () => void;
  onViewDocument: () => void;
  onSubmitRating: (rating: number) => Promise<boolean | void>;
  viewDocumentLoading?: boolean;
  viewDocumentDisabled?: boolean;
}

const CardPaymentSuccessPage: React.FC<CardPaymentSuccessPageProps> = ({
  applicationNumber,
  isContentService,
  onDownloadReceipt,
  onViewDocument,
  onSubmitRating,
  viewDocumentLoading = false,
  viewDocumentDisabled = false,
}) => {
  const { t } = useTranslation();
  const displayApplicationNumber = applicationNumber || "-";
  const { descriptionKey, showViewDocument } =
    resolveCardPaymentSuccessPresentation(isContentService);

  return (
    <div className="card-payment-success-page">
      <CardPaymentResultShell className="card-payment-success-page__shell">
        <div className="card-payment-success-page__top">
          <div className="card-payment-success-page__main">
            <div className="card-payment-success-page__icon">
              <img
                src={successIcon}
                alt={t("myRequestsPage.batchPayment.result.successTitle")}
              />
            </div>
            <div className="card-payment-success-page__summary">
              <div className="card-payment-success-page__copy">
                <h1>{t("myRequestsPage.batchPayment.result.successTitle")}</h1>
                <p>
                  {descriptionKey ? (
                    t(descriptionKey)
                  ) : (
                    <>
                      {t("myRequestsPage.paymentSuccess.descriptionLineOne")}{" "}
                      {t("myRequestsPage.paymentSuccess.descriptionLineTwo")}
                    </>
                  )}
                </p>
              </div>
              <div className="card-payment-success-page__document">
                <span className="card-payment-success-page__document-label">
                  {t("myRequestsPage.paymentSuccess.applicationNumber")}
                </span>
                <strong>{displayApplicationNumber}</strong>
                <button
                  type="button"
                  className="card-payment-success-page__copy-button"
                  disabled={!applicationNumber}
                  title={t(
                    "myRequestsPage.paymentSuccess.copyApplicationNumber"
                  )}
                  aria-label={t(
                    "myRequestsPage.paymentSuccess.copyApplicationNumber"
                  )}
                  onClick={() =>
                    void copyToClipboard(applicationNumber, {
                      successMessage: t("myRequestsPage.paymentSuccess.copied"),
                    })
                  }
                >
                  <CopyOutlined />
                </button>
              </div>
            </div>
            <div className="card-payment-success-page__actions">
              <CustomButton
                variant="outline"
                onClick={onDownloadReceipt}
                customClassName="card-payment-success-page__action card-payment-success-page__action--secondary"
              >
                {t("myRequestsPage.actions.downloadReceipt")}
              </CustomButton>
              {showViewDocument ? (
                <CustomButton
                  variant="primary"
                  onClick={onViewDocument}
                  loading={viewDocumentLoading}
                  disabled={viewDocumentDisabled}
                  customClassName="card-payment-success-page__action card-payment-success-page__action--primary"
                >
                  {t("myRequestsPage.actions.viewDocument")}
                </CustomButton>
              ) : null}
            </div>
          </div>
        </div>
        <PaymentSuccessFeedback
          title={t("myRequestsPage.batchPayment.result.feedbackTitle")}
          dissatisfiedLabel={t(
            "myRequestsPage.batchPayment.result.dissatisfied"
          )}
          satisfiedLabel={t("myRequestsPage.batchPayment.result.satisfied")}
          submitLabel={t("common.submit")}
          onSubmit={onSubmitRating}
        />
      </CardPaymentResultShell>
    </div>
  );
};

export default CardPaymentSuccessPage;
