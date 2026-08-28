import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import CustomButton from "../CustomButton";
import { copyToClipboard } from "@/utils/copy";
import CopyIcon from "@/assets/images/copy.svg";
import CheckedIcon from "@/assets/images/comfirm_success.png";
import "./index.less";
import { Rate } from "antd";
export type ResultType =
  | "submission-successful"
  | "under-review"
  | "permit-issued"
  | "permit-expired-grace"
  | "permit-expired-penalty";

interface SubmissionResultProps {
  type: ResultType;
  applicationNumber?: string;
  licenseNumber?: string;
  expiryDate?: string;
  graceDays?: number;
  onBack?: () => void;
  onViewDetails?: () => void;
  onSubmitRating?: (rating: number) => Promise<boolean> | boolean;
}

const SubmissionResult: React.FC<SubmissionResultProps> = ({
  type,
  applicationNumber,
  licenseNumber,
  expiryDate = "15-10-2025",
  graceDays = 15,
  onBack,
  onViewDetails,
  onSubmitRating,
}) => {
  const { t } = useTranslation();
  const displayNumber =
    licenseNumber || applicationNumber || "ML-01-09-8408756";
  const [rating, setRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const ratingSubmittingRef = useRef(false);

  const handleCopy = () => {
    copyToClipboard(displayNumber);
  };

  const handleSubmitRating = async () => {
    if (!rating || !onSubmitRating || ratingSubmittingRef.current) {
      return;
    }

    try {
      ratingSubmittingRef.current = true;
      setRatingSubmitting(true);
      const submitted = await onSubmitRating(rating);
      if (submitted) {
        setRatingSubmitted(true);
      }
    } catch {
      // The caller handles rating submission feedback.
    } finally {
      ratingSubmittingRef.current = false;
      setRatingSubmitting(false);
    }
  };

  const titleKey = (
    {
      "submission-successful": "submissionResult.submissionSuccessful.title",
      "under-review": "submissionResult.underReview.title",
      "permit-issued": "submissionResult.permitIssued.title",
      "permit-expired-grace": "submissionResult.permitExpiredGrace.title",
      "permit-expired-penalty": "submissionResult.permitExpiredPenalty.title",
    } as const
  )[type];

  let descriptionText: string;
  let numberLabel: string;

  switch (type) {
    case "submission-successful":
      descriptionText = t("submissionResult.submissionSuccessful.description");
      numberLabel = t("submissionResult.applicationNumberLabel");
      break;
    case "under-review":
      descriptionText = t("submissionResult.underReview.description");
      numberLabel = t("submissionResult.applicationNumberLabel");
      break;
    case "permit-issued":
      descriptionText = t("submissionResult.permitIssued.description");
      numberLabel = t("submissionResult.licenseNumberLabel");
      break;
    case "permit-expired-grace":
      descriptionText = t("submissionResult.permitExpiredGrace.description", {
        expiryDate,
        graceDays,
      });
      numberLabel = t("submissionResult.licenseNumberLabel");
      break;
    default:
      descriptionText = t("submissionResult.permitExpiredPenalty.description", {
        expiryDate,
      });
      numberLabel = t("submissionResult.licenseNumberLabel");
  }

  return (
    <div className="submission-result">
      <div className="result-content">
        <div className="result-icon">
          <img src={CheckedIcon} />
        </div>

        <h1 className="result-title">{t(titleKey)}</h1>

        <p className="result-description">{descriptionText}</p>

        <div className="result-number-box">
          <span className="number-label">{numberLabel}:</span>
          <span className="number-value">{displayNumber}</span>
          <img src={CopyIcon} className="copy-icon" onClick={handleCopy} />
        </div>

        <div className="result-actions">
          <CustomButton variant="outline" onClick={() => onBack?.()}>
            {t("submissionResult.back")}
          </CustomButton>
          <CustomButton onClick={() => onViewDetails?.()}>
            {t("submissionResult.viewDetails")}
          </CustomButton>
        </div>
        <div className="rating-section">
          <div className="share">
            {t("complaintsPage.addModal.shareFeedback")}
          </div>

          <div className="stars">
            <Rate
              value={rating}
              disabled={ratingSubmitting}
              onChange={setRating}
              className="custom-rate"
              count={5}
            />
          </div>

          <div className="rating-labels">
            <span>{t("submissionResult.rating.extremelyDissatisfied")}</span>
            <span>{t("submissionResult.rating.extremelySatisfied")}</span>
          </div>

          {!ratingSubmitted && (
            <CustomButton
              customClassName="rating-submit"
              disabled={!rating || !onSubmitRating || ratingSubmitting}
              loading={ratingSubmitting}
              onClick={handleSubmitRating}
            >
              {t("submissionResult.rating.submit")}
            </CustomButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionResult;
