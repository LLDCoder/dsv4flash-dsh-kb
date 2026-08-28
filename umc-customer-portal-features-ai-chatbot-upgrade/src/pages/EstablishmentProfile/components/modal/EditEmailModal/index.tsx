import React, { useState, useEffect } from "react";
import { Modal, Input } from "antd";
import { CloseOutlined, CheckOutlined } from "@ant-design/icons";
import { CustomButton } from "@/components/common";
import { useTranslation } from "react-i18next";
import {
  postEmail,
  postVerificationCode,
  postUpdateMyAccountInfo,
  adduserEmail,
  isUserVerificationCodeAccepted,
} from "@/services/user";
import "./index.less";
import { useUserStore } from "@/store/user";

interface EditEmailModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newEmail: string) => void;
}

const EditEmailModal: React.FC<EditEmailModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newVerificationCode, setNewVerificationCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [postEmailLoading, setPostEmailLoading] = useState(false);
  const [postVerificationCodeLoading, setPostVerificationCodeLoading] =
    useState(false);
  const userInfo = useUserStore((state) => state.userInfo);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      setVerificationCode("");
      setNewEmail("");
      setNewVerificationCode("");
      setCountdown(0);
      setShowSuccess(false);
      setErrorMessage("");
      setEmailError("");
      setCodeSent(false);
    }
  }, [visible]);

  const handleSendCode = async () => {
    const email = newEmail.trim();
    if (!email || !validateEmail(email)) {
      setEmailError(t("establishmentProfile.validation.validEmail"));
      return;
    }
    try {
      setPostEmailLoading(true);
      await postEmail(email);
      setCountdown(60);
      setCodeSent(true);
      setErrorMessage("");
      setEmailError("");
    } finally {
      setPostEmailLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      handleSendCode();
    }
  };

  const handleNextStep = async () => {
    if (verificationCode.trim()) {
      try {
        setPostVerificationCodeLoading(true);
        const verifyResult = await postVerificationCode(
          newEmail,
          verificationCode.trim(),
        );
        if (!isUserVerificationCodeAccepted(verifyResult)) {
          setErrorMessage(
            t("establishmentProfile.emailModal.invalidVerificationCode"),
          );
          return;
        }

        await adduserEmail({
          email: newEmail,
        });
        setVerificationCode("");
        setNewVerificationCode("");
        setCountdown(0);
        setErrorMessage("");
        setCodeSent(false);

        onSuccess(newEmail);
        onClose();
      } catch (error) {
        setErrorMessage(
          t("establishmentProfile.emailModal.invalidVerificationCode"),
        );
      } finally {
        setPostVerificationCodeLoading(false);
      }
    }
  };

  const handleCloseSuccess = () => {
    onSuccess(newEmail);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const isStep1Valid =
    verificationCode.trim().length === 6 &&
    newEmail.trim().length > 0 &&
    validateEmail(newEmail.trim()) &&
    !emailError;
  const isStep2Valid =
    newEmail.trim().length > 0 && newVerificationCode.trim().length === 6;

  if (showSuccess) {
    return (
      <Modal
        visible={visible}
        onCancel={onClose}
        footer={null}
        closable={false}
        centered
        className="edit-email-modal success-modal"
      >
        <CloseOutlined className="modal-close-icon" onClick={onClose} />
        <div className="success-content">
          <div className="success-icon-wrapper">
            <div className="success-circle">
              <CheckOutlined className="success-check" />
            </div>
          </div>
          <h2 className="success-title">
            {t("establishmentProfile.emailModal.emailUpdatedTitle")}
          </h2>
          <p className="success-description">
            {t("establishmentProfile.emailModal.emailUpdatedDescription")}
          </p>
          <CustomButton
            text={t("establishmentProfile.actions.close")}
            variant="outline"
            onClick={handleCloseSuccess}
            customClassName="success-close-btn"
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      className="edit-email-modal"
      width={""}
    >
      <div className="modal-header">
        <h2 className="modal-title">
          {t("establishmentProfile.emailModal.title")}
        </h2>
        <CloseOutlined className="modal-close-icon" onClick={onClose} />
      </div>

      <div className="modal-body">
        {currentStep === 1 && (
          <div className="step-content">
            <div className="form-item">
              <label className="form-label">
                {t("establishmentProfile.emailModal.newEmail")}{" "}
                <span className="required">*</span>
              </label>
              <Input
                value={newEmail}
                placeholder={t("formPlaceholders.common.enterEmail")}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewEmail(value);
                  if (!value.trim()) {
                    setEmailError(t("establishmentProfile.validation.validEmail"));
                  } else if (!validateEmail(value.trim())) {
                    setEmailError(t("establishmentProfile.validation.validEmail"));
                  } else {
                    setEmailError("");
                  }
                }}
                className="form-input"
                status={emailError ? "error" : undefined}
              />
              {emailError && (
                <div className="error-message" style={{ marginTop: 4 }}>
                  {emailError}
                </div>
              )}
            </div>

            <div className="form-item">
              <label className="form-label">
                {t("establishmentProfile.emailModal.verificationCode")}{" "}
                <span className="required">*</span>
              </label>
              <div className="verification-input-wrapper">
                <Input
                  placeholder={t(
                    "formPlaceholders.pages.establishmentProfile.emailModal.enterVerificationCode",
                  )}
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, ""));
                    setErrorMessage("");
                  }}
                  className={`form-input verification-input ${
                    errorMessage ? "error" : ""
                  }`}
                  inputMode="numeric"
                  maxLength={6}
                />
                <CustomButton
                  text={
                    countdown > 0
                      ? `${t("establishmentProfile.actions.send")} (${countdown}s)`
                      : t("establishmentProfile.actions.send")
                  }
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  customClassName="send-code-btn"
                  loading={postEmailLoading}
                />
              </div>
              {errorMessage && (
                <div className="error-message">{errorMessage}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <CustomButton
          text={t("establishmentProfile.actions.cancel")}
          variant="outline"
          onClick={onClose}
          customClassName="cancel-btn"
        />
        <CustomButton
          loading={postVerificationCodeLoading}
          text={t("establishmentProfile.actions.save")}
          variant="primary"
          onClick={handleNextStep}
          disabled={!isStep1Valid}
          customClassName="next-btn"
        />
      </div>
    </Modal>
  );
};

export default EditEmailModal;
