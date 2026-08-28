import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Input } from "antd";
import { CloseOutlined, RightOutlined } from "@ant-design/icons";
import { CustomButton } from "@/components/common";
import { useTranslation } from "react-i18next";
import {
  postEmail,
  postVerificationCode,
  postUpdateMyAccountInfo,
  isUserVerificationCodeAccepted,
  checkEmailExist,
} from "@/services/user";
import "./EditEmailModal.less";
import { useUserStore } from "@/store/user";
import {
  getVerificationCountdownKey,
  getVerificationCountdownRemaining,
  useVerificationCountdownStore,
} from "@/store/verification-store";
import firstIcon from "@/assets/images/first.svg";
import checkIcon from "@/assets/images/check.svg";
import modalIcon from "@/assets/images/modalIcon.svg";

interface EditEmailModalProps {
  visible: boolean;
  onClose: () => void;
  currentEmail: string;
  checkUpdateMyAccountInfoRequirement: boolean;
  onSuccess: (newEmail: string) => void;
}

const EditEmailModal: React.FC<EditEmailModalProps> = ({
  visible,
  onClose,
  currentEmail,
  checkUpdateMyAccountInfoRequirement,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newVerificationCode, setNewVerificationCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [postEmailLoading, setPostEmailLoading] = useState(false);
  const [postVerificationCodeLoading, setPostVerificationCodeLoading] =
    useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailExistCheckLoading, setEmailExistCheckLoading] = useState(false);
  const [emailExistCheckPassed, setEmailExistCheckPassed] = useState(false);
  const [emailExistCheckedEmail, setEmailExistCheckedEmail] = useState("");
  const emailExistCheckRequestIdRef = useRef(0);
  const userInfo = useUserStore((state) => state.userInfo);
  const normalizedCurrentEmail = currentEmail.trim();
  const normalizedNewEmail = newEmail.trim();
  const currentEmailCountdownKey = getVerificationCountdownKey(
    "my-account-edit-email-current",
    normalizedCurrentEmail,
  );
  const newEmailCountdownKey = getVerificationCountdownKey(
    "my-account-edit-email-new",
    normalizedNewEmail,
  );
  const activeCountdownKey =
    currentStep === 1 ? currentEmailCountdownKey : newEmailCountdownKey;
  const resendDeadline = useVerificationCountdownStore(
    (state) => state.resendDeadlines[activeCountdownKey] ?? null,
  );
  const startCountdown = useVerificationCountdownStore(
    (state) => state.startCountdown,
  );
  const clearCountdown = useVerificationCountdownStore(
    (state) => state.clearCountdown,
  );
  const [, forceRender] = useState(0);
  const countdown = getVerificationCountdownRemaining(resendDeadline);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getEmailExistValue = (payload: unknown): boolean => {
    if (typeof payload === "boolean") return payload;
    if (payload && typeof payload === "object" && "data" in payload) {
      return Boolean((payload as { data?: boolean }).data);
    }
    return false;
  };

  const resetEmailExistCheck = () => {
    emailExistCheckRequestIdRef.current += 1;
    setEmailExistCheckLoading(false);
    setEmailExistCheckPassed(false);
    setEmailExistCheckedEmail("");
  };

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      forceRender((value) => value + 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (visible) {
      setCurrentStep(checkUpdateMyAccountInfoRequirement ? 1 : 2);
      setVerificationCode("");
      setNewEmail("");
      setNewVerificationCode("");
      setShowSuccess(false);
      setErrorMessage("");
      setEmailError("");
      resetEmailExistCheck();
      setCodeSent(false);
    }
  }, [checkUpdateMyAccountInfoRequirement, visible]);

  const handleSendCode = async () => {
    const email =
      currentStep === 1 ? normalizedCurrentEmail : normalizedNewEmail;
    if (!email.trim()) {
      return;
    }

    if (
      currentStep === 2 &&
      (!emailExistCheckPassed || emailExistCheckedEmail !== normalizedNewEmail)
    ) {
      return;
    }

    try {
      setPostEmailLoading(true);
      setErrorMessage("");
      await postEmail(email);
      startCountdown(activeCountdownKey, 60);
      setCodeSent(true);
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to send email verification code:", error);
      setErrorMessage(t("myAccountPage.emailModal.sendCodeFailed"));
    } finally {
      setPostEmailLoading(false);
    }
  };

  const sendButtonText = useMemo(() => {
    if (countdown > 0) {
      return t("myAccountPage.emailModal.sendWithCountdown", {
        countdown,
      });
    }
    if (codeSent) {
      return t("myAccountPage.emailModal.resend");
    }
    return t("myAccountPage.emailModal.send");
  }, [codeSent, countdown, t]);

  const validateNewEmailExistence = async (email: string) => {
    if (!email || !validateEmail(email)) {
      setEmailExistCheckPassed(false);
      setEmailExistCheckedEmail("");
      return;
    }

    if (email.toLowerCase() === normalizedCurrentEmail.toLowerCase()) {
      setEmailExistCheckPassed(false);
      setEmailExistCheckedEmail("");
      return;
    }

    const requestId = emailExistCheckRequestIdRef.current + 1;
    emailExistCheckRequestIdRef.current = requestId;
    setEmailExistCheckLoading(true);
    setEmailExistCheckPassed(false);
    setEmailExistCheckedEmail("");

    try {
      const result = await checkEmailExist(email);
      if (
        emailExistCheckRequestIdRef.current !== requestId ||
        normalizedNewEmail !== email
      ) {
        return;
      }

      const exists = getEmailExistValue(result);
      if (exists) {
        setEmailError(t("signup.please.existEmail"));
        setEmailExistCheckPassed(false);
        setEmailExistCheckedEmail("");
        return;
      }

      setEmailError("");
      setEmailExistCheckPassed(true);
      setEmailExistCheckedEmail(email);
    } catch (error) {
      if (
        emailExistCheckRequestIdRef.current !== requestId ||
        normalizedNewEmail !== email
      ) {
        return;
      }

      console.error("Failed to check whether the email exists:", error);
      setEmailError(t("myAccountPage.failed"));
      setEmailExistCheckPassed(false);
      setEmailExistCheckedEmail("");
    } finally {
      if (emailExistCheckRequestIdRef.current === requestId) {
        setEmailExistCheckLoading(false);
      }
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (verificationCode.trim()) {
        try {
          setPostVerificationCodeLoading(true);
          const verifyResult = await postVerificationCode(
            normalizedCurrentEmail,
            verificationCode.trim(),
          );
          if (!isUserVerificationCodeAccepted(verifyResult)) {
            console.error("Current email verification was rejected:", verifyResult);
            setErrorMessage(
              t("myAccountPage.emailModal.invalidVerificationCode"),
            );
            return;
          }
          setCurrentStep(2);
          setVerificationCode("");
          setNewVerificationCode("");
          clearCountdown(currentEmailCountdownKey);
          setErrorMessage("");
          setCodeSent(false);
        } catch (error) {
          console.error("Current email verification failed:", error);
          setErrorMessage(t("myAccountPage.emailModal.verificationFailed"));
        } finally {
          setPostVerificationCodeLoading(false);
        }
      }
    } else if (currentStep === 2) {
      if (normalizedNewEmail && newVerificationCode.trim()) {
        if (!userInfo?.id) {
          setErrorMessage(t("myAccountPage.failed"));
          return;
        }

        try {
          setPostVerificationCodeLoading(true);
          const verifyResult = await postVerificationCode(
            normalizedNewEmail,
            newVerificationCode.trim(),
          );
          if (!isUserVerificationCodeAccepted(verifyResult)) {
            console.error("New email verification was rejected:", verifyResult);
            setErrorMessage(
              t("myAccountPage.emailModal.invalidVerificationCode"),
            );
            return;
          }
          await postUpdateMyAccountInfo({
            email: normalizedNewEmail,
            userId: userInfo.id,
            verificationCode: newVerificationCode.trim(),
          });
          clearCountdown(newEmailCountdownKey);
          setNewEmail(normalizedNewEmail);
          setShowSuccess(true);
        } catch (error) {
          console.error("New email verification or update failed:", error);
          setErrorMessage(t("myAccountPage.emailModal.verificationFailed"));
        } finally {
          setPostVerificationCodeLoading(false);
        }
      }
    }
  };

  const handleCloseSuccess = () => {
    onSuccess(newEmail);
    onClose();
    window.location.reload();
  };

  const isStep1Valid = verificationCode.trim().length === 6;
  const isStep2Valid =
    normalizedNewEmail.length > 0 &&
    newVerificationCode.trim().length === 6 &&
    !emailError &&
    emailExistCheckPassed &&
    emailExistCheckedEmail === normalizedNewEmail &&
    validateEmail(normalizedNewEmail) &&
    normalizedNewEmail.toLowerCase() !== normalizedCurrentEmail.toLowerCase();

  if (showSuccess) {
    return (
      <Modal
        visible={visible}
        onCancel={onClose}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        className="edit-email-modal edit-email-modal--success"
        wrapClassName="edit-email-modal-success-root"
      >
        <div
          className="edit-email-modal__content edit-email-modal__content--success"
          dir={isAr ? "rtl" : "ltr"}
        >
          <CloseOutlined className="modal-close-icon" onClick={onClose} />
          <div className="success-content">
            <div className="success-icon-wrapper">
              <img className="success-icon" src={modalIcon} alt="" />
            </div>
            <div className="success-copy">
              <h2 className="success-title">
                {t("myAccountPage.emailModal.emailUpdatedTitle")}
              </h2>
              <p className="success-description">
                {t("myAccountPage.emailModal.emailUpdatedDescription")}
              </p>
            </div>
            <CustomButton
              text={t("common.close")}
              variant="outline"
              onClick={handleCloseSuccess}
              customClassName="success-close-btn"
            />
          </div>
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
      maskClosable={false}
      centered
      className="edit-email-modal"
      width={""}
    >
      <div className="edit-email-modal__content" dir={isAr ? "rtl" : "ltr"}>
        <div className="modal-header">
          <h2 className="modal-title">{t("myAccountPage.emailModal.title")}</h2>
          <CloseOutlined className="modal-close-icon" onClick={onClose} />
        </div>

        <div className="modal-body">
          <div className="steps-indicator">
            <div className="step-item">
              {currentStep > 1 ? (
                <img src={checkIcon} alt="" />
              ) : (
                <img src={firstIcon} alt="" />
              )}
              <span className="step-label">
                {t("myAccountPage.emailModal.verifyCurrentEmail")}
              </span>
            </div>
            {currentStep >= 1 && (
              <div className={`step-arrow${isAr ? " is-rtl" : ""}`}>
                <RightOutlined style={{ color: "#505363", fontWeight: 800 }} />
              </div>
            )}

            <div className={`step-item ${currentStep >= 2 ? "active" : ""}`}>
              <span className="step-label">
                {t("myAccountPage.emailModal.verifyNewEmail")}
              </span>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="step-content">
              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.emailModal.currentEmail")}{" "}
                  <span className="required">*</span>
                </label>
                <Input
                  value={currentEmail}
                  disabled
                  className="form-input disabled-input is-ltr-input"
                />
              </div>

              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.emailModal.verificationCode")}{" "}
                  <span className="required">*</span>
                </label>
                <div className="verification-input-wrapper">
                  <Input
                    placeholder={t("formPlaceholders.pages.myAccount.enterCode")}
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, ""));
                      setErrorMessage("");
                    }}
                    className={`form-input verification-input is-ltr-input ${
                      errorMessage ? "error" : ""
                    }`}
                    inputMode="numeric"
                    maxLength={6}
                  />
                  <CustomButton
                    text={sendButtonText}
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

          {currentStep === 2 && (
            <div className="step-content">
              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.emailModal.newEmail")}{" "}
                  <span className="required">*</span>
                </label>
                <div className="verification-input-wrapper">
                  <Input
                    placeholder={t("formPlaceholders.pages.myAccount.emailModal.enterNewEmail")}
                    value={newEmail}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewEmail(value);
                      setNewVerificationCode("");
                      setErrorMessage("");
                      resetEmailExistCheck();

                      if (value.trim() && !validateEmail(value.trim())) {
                        setEmailError(t("myAccountPage.emailModal.invalidEmail"));
                      } else if (
                        value.trim() &&
                        value.trim().toLowerCase() ===
                          normalizedCurrentEmail.toLowerCase()
                      ) {
                        setEmailError(
                          t("myAccountPage.emailModal.differentFromCurrentEmail"),
                        );
                      } else {
                        setEmailError("");
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value && !validateEmail(value)) {
                        setEmailError(t("myAccountPage.emailModal.invalidEmail"));
                        setEmailExistCheckPassed(false);
                        setEmailExistCheckedEmail("");
                      } else if (
                        value &&
                        value.toLowerCase() ===
                          normalizedCurrentEmail.toLowerCase()
                      ) {
                        setEmailError(
                          t("myAccountPage.emailModal.differentFromCurrentEmail"),
                        );
                        setEmailExistCheckPassed(false);
                        setEmailExistCheckedEmail("");
                      } else {
                        setEmailError("");
                        void validateNewEmailExistence(value);
                      }
                    }}
                    className={`form-input verification-input is-ltr-input ${
                      emailError ? "error" : ""
                    }`}
                    type="email"
                  />
                </div>
                {emailError && (
                  <div className="error-message">{emailError}</div>
                )}
              </div>

              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.emailModal.verificationCode")}{" "}
                  <span className="required">*</span>
                </label>

                <div className="verification-input-wrapper">
                  <Input
                    placeholder={t("formPlaceholders.pages.myAccount.enterCode")}
                    value={newVerificationCode}
                    onChange={(e) => {
                      setNewVerificationCode(e.target.value.replace(/\D/g, ""));
                      setErrorMessage("");
                    }}
                    className={`form-input verification-input is-ltr-input ${
                      errorMessage ? "error" : ""
                    }`}
                    inputMode="numeric"
                    maxLength={6}
                  />
                  <CustomButton
                    text={sendButtonText}
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={
                      countdown > 0 ||
                      emailExistCheckLoading ||
                      !emailExistCheckPassed ||
                      emailExistCheckedEmail !== normalizedNewEmail ||
                      !normalizedNewEmail ||
                      !validateEmail(normalizedNewEmail) ||
                      normalizedNewEmail.toLowerCase() ===
                        normalizedCurrentEmail.toLowerCase()
                    }
                    customClassName="send-code-btn"
                    loading={postEmailLoading || emailExistCheckLoading}
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
            text={t("common.cancel")}
            variant="outline"
            onClick={onClose}
            customClassName="cancel-btn"
          />
          <CustomButton
            loading={postVerificationCodeLoading}
            text={t("myAccountPage.emailModal.next")}
            variant="primary"
            onClick={handleNextStep}
            disabled={currentStep === 1 ? !isStep1Valid : !isStep2Valid}
            customClassName="next-btn"
          />
        </div>
      </div>
    </Modal>
  );
};

export default EditEmailModal;
