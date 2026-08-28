import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Rate } from "antd";
import CustomButton from "../CustomButton";
import "./index.less";

export interface PaymentSuccessFeedbackProps {
  active?: boolean;
  title: ReactNode;
  dissatisfiedLabel: ReactNode;
  satisfiedLabel: ReactNode;
  submitLabel: ReactNode;
  onSubmit: (rating: number) => Promise<boolean | void> | boolean | void;
}

const PaymentSuccessFeedback: React.FC<PaymentSuccessFeedbackProps> = ({
  active = true,
  title,
  dissatisfiedLabel,
  satisfiedLabel,
  submitLabel,
  onSubmit,
}) => {
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratingLocked, setRatingLocked] = useState(false);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!active) return;

    submittingRef.current = false;
    setRating(0);
    setSubmitting(false);
    setSubmitted(false);
    setRatingLocked(false);
  }, [active]);

  const handleSubmit = async () => {
    if (!rating || submittingRef.current || submitted) return;

    submittingRef.current = true;
    setRatingLocked(true);
    setSubmitting(true);

    try {
      const result = await onSubmit(rating);
      if (mountedRef.current) {
        if (result === false) {
          setRatingLocked(false);
        } else {
          setSubmitted(true);
        }
      }
    } catch {
      // The caller presents the submission error and the selected rating stays retryable.
      if (mountedRef.current) {
        setRatingLocked(false);
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="payment-success-feedback">
      <h3 className="payment-success-feedback__title">{title}</h3>
      <Rate
        className="payment-success-feedback__rate"
        disabled={submitting || submitted || ratingLocked}
        value={rating}
        onChange={setRating}
      />
      <div className="payment-success-feedback__labels">
        <span>{dissatisfiedLabel}</span>
        <span>{satisfiedLabel}</span>
      </div>
      <CustomButton
        customClassName="payment-success-feedback__submit"
        disabled={!rating || submitting || submitted}
        loading={submitting}
        size="small"
        variant="primary"
        onClick={() => void handleSubmit()}
      >
        {submitLabel}
      </CustomButton>
    </div>
  );
};

export default PaymentSuccessFeedback;
