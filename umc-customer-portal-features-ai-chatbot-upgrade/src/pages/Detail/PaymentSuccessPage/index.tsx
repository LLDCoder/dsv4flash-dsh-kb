import React, { useState } from "react";
import { Rate } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { CustomButton } from "@/components/common";
import "./index.less";
import successIcon from "@/assets/images/comfirm_success.png";
import { copyToClipboard } from "@/utils/copy";

interface PaymentSuccessPageProps {
  documentNumber?: string;
  onDownloadReceipt?: () => void;
  onViewDocument?: () => void;
  onBackToDetail?: () => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({
  documentNumber = "-",
  onDownloadReceipt,
  onViewDocument,
}) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopyDocumentNumber = async () => {
    copyToClipboard(documentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRatingChange = (value: number) => {
    setRating(value);
    console.log("Rating:", value);
  };

  const handleDownloadReceipt = () => {
    if (onDownloadReceipt) {
      onDownloadReceipt();
    } else {
      console.log("Download receipt");
    }
  };

  const handleViewDocument = () => {
    if (onViewDocument) {
      onViewDocument();
    } else {
      console.log("View document");
    }
  };

  return (
    <div className="payment-success-page">
      <div className="success-content">
        {/* Success Icon */}
        <div className="success-icon-container">
          <img src={successIcon} alt="" className="success-icon" />
        </div>

        {/* Title */}
        <h1 className="success-title">
          {t("myRequestsPage.batchPayment.result.successTitle")}
        </h1>

        {/* Subtitle */}
        <p className="success-subtitle">
          {t("myRequestsPage.paymentSuccess.descriptionLineOne")}
          <br />
          {t("myRequestsPage.paymentSuccess.descriptionLineTwo")}
        </p>

        {/* Document Number */}
        <div className="document-number-container">
          <div className="document-label">
            {t("myRequestsPage.paymentSuccess.documentNumber")}
          </div>
          <div className="document-number">
            <span className="number-text">{documentNumber}</span>
            <button
              className={`copy-button ${copied ? "copied" : ""}`}
              onClick={handleCopyDocumentNumber}
              title={
                copied
                  ? t("myRequestsPage.paymentSuccess.copied")
                  : t("myRequestsPage.paymentSuccess.copyDocumentNumber")
              }
            >
              <CopyOutlined />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-container">
          <CustomButton
            variant="outline"
            size="large"
            onClick={handleDownloadReceipt}
            customClassName="action-button-download"
          >
            {t("myRequestsPage.actions.downloadReceipt")}
          </CustomButton>

          <CustomButton
            variant="primary"
            size="large"
            onClick={handleViewDocument}
            customClassName="action-button-view"
          >
            {t("myRequestsPage.actions.viewDocument")}
          </CustomButton>
        </div>

        <div className="payment-success-page-line"></div>
        {/* Rating Section */}
        <div className="rating-section">
          <div className="rating-title">
            {t("myRequestsPage.batchPayment.result.feedbackTitle")}
          </div>

          <div className="rating-container">
            <Rate
              value={rating}
              onChange={handleRatingChange}
              className="custom-rate"
              character="★"
              count={5}
            />
          </div>

          <div className="rating-labels">
            <span className="rating-label-left">
              {t("myRequestsPage.batchPayment.result.dissatisfied")}
            </span>
            <span className="rating-label-right">
              {t("myRequestsPage.batchPayment.result.satisfied")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
