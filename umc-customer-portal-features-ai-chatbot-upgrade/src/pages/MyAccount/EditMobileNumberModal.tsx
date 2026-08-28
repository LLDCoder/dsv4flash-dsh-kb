import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input } from "antd";
import {
  CloseOutlined,
  CheckOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { CustomButton } from "@/components/common";
import {
  DEFAULT_COUNTRY_DIAL_CODE,
  combineInternationalMobileNumber,
  StandaloneMobileNumberInput,
  validateMobileNumber,
} from "@/components/common/MobileNumberInput";
import { useTranslation } from "react-i18next";
import "./EditMobileNumberModal.less";
import {
  isUserVerificationCodeAccepted,
  postGenerateCodeBySms,
  postUpdateMyAccountInfo,
  postVerificationCodeByPhone,
  type UpdateMyAccountInfoPayload,
  type UserAccountInfo,
} from "@/services/user";
import { useUserStore } from "@/store/user";
import {
  getVerificationCountdownKey,
  getVerificationCountdownRemaining,
  useVerificationCountdownStore,
} from "@/store/verification-store";
import firstIcon from "@/assets/images/first.svg";
import secondIcon from "@/assets/images/second.svg";
import checkIcon from "@/assets/images/check.svg";
import secondGoldIcon from "@/assets/images/secondGold.svg";

interface EditMobileNumberModalProps {
  visible: boolean;
  onClose: () => void;
  currentAccountInfo: UserAccountInfo;
  onSuccess: (countryCode: string, phoneNumber: string) => void;
}

interface EditAccountPhoneNumberValue {
  phoneCountryCode: string;
  phoneLocalNumber: string;
}

type EditAccountFormValues = Omit<
  UserAccountInfo,
  "phoneNumber" | "phoneCountryCode" | "phoneLocalNumber"
> & {
  phoneNumber: EditAccountPhoneNumberValue;
};

interface EditAccountApiValues {
  userId: string;
  phoneNumber: EditAccountPhoneNumberValue;
  verificationCode: string;
}

const toForm = (data: UserAccountInfo): EditAccountFormValues => {
  const {
    mobileNumber,
    phoneNumber,
    phoneCountryCode,
    phoneLocalNumber,
    ...rest
  } = data;
  const legacyPhoneNumber = String(phoneNumber || mobileNumber || "").trim();

  return {
    ...rest,
    phoneNumber: {
      phoneCountryCode: String(phoneCountryCode || "").trim(),
      phoneLocalNumber: String(
        phoneLocalNumber || legacyPhoneNumber,
      ).trim(),
    },
  };
};

const toApi = (
  values: EditAccountApiValues,
): UpdateMyAccountInfoPayload => {
  const { phoneNumber, ...rest } = values;
  const phoneCountryCode = String(phoneNumber.phoneCountryCode ?? "").trim();
  const phoneLocalNumber = String(phoneNumber.phoneLocalNumber ?? "").trim();
  const hasPhoneNumber = phoneLocalNumber.length > 0;

  return {
    ...rest,
    phoneNumber: hasPhoneNumber
      ? `${phoneCountryCode}${phoneLocalNumber}`
      : "",
    phoneCountryCode: hasPhoneNumber ? phoneCountryCode : "",
    phoneLocalNumber: hasPhoneNumber ? phoneLocalNumber : "",
  };
};

const EditMobileNumberModal: React.FC<EditMobileNumberModalProps> = ({
  visible,
  onClose,
  currentAccountInfo,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const currentValues = useMemo(
    () => toForm(currentAccountInfo),
    [currentAccountInfo],
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] =
    useState<EditAccountPhoneNumberValue>({
      phoneCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
      phoneLocalNumber: "",
    });
  const [newVerificationCode, setNewVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [currentMobileNumberError, setCurrentMobileNumberError] = useState("");
  const [newMobileNumberError, setNewMobileNumberError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const userInfo = useUserStore((state) => state.userInfo);
  const currentMobileCountdownKey = getVerificationCountdownKey(
    "my-account-edit-mobile-current",
    `${currentValues.phoneNumber.phoneCountryCode}${currentValues.phoneNumber.phoneLocalNumber}`,
  );
  const newMobileCountdownKey = getVerificationCountdownKey(
    "my-account-edit-mobile-new",
    `${newPhoneNumber.phoneCountryCode}${newPhoneNumber.phoneLocalNumber}`,
  );
  const activeCountdownKey =
    currentStep === 1 ? currentMobileCountdownKey : newMobileCountdownKey;
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
      setCurrentStep(1);
      setVerificationCode("");
      setNewPhoneNumber({
        phoneCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
        phoneLocalNumber: "",
      });
      setNewVerificationCode("");
      setCodeSent(false);
      setShowSuccess(false);
      setCurrentMobileNumberError("");
      setNewMobileNumberError("");
      setVerificationError("");
    }
  }, [visible]);

  const handleSendCode = async () => {
    const phoneNumber =
      currentStep === 1 ? currentValues.phoneNumber : newPhoneNumber;
    const mobileNumberValidation = validateMobileNumber({
      countryCode: phoneNumber.phoneCountryCode,
      phoneNumber: phoneNumber.phoneLocalNumber,
    });
    if (!mobileNumberValidation.isValid) {
      if (currentStep === 1) {
        setCurrentMobileNumberError(mobileNumberValidation.message);
      } else {
        setNewMobileNumberError(mobileNumberValidation.message);
      }
      setVerificationError("");
      return;
    }
    if (currentStep === 1) {
      setCurrentMobileNumberError("");
    } else {
      setNewMobileNumberError("");
    }
    setVerificationError("");
    const phone = combineInternationalMobileNumber(
      phoneNumber.phoneCountryCode,
      phoneNumber.phoneLocalNumber,
    );
    try {
      const result = await postGenerateCodeBySms(phone, userInfo?.firstName);
      if (result?.data !== "Success") {
        console.error("Failed to send the mobile verification code:", result);
        setVerificationError(
          t("myAccountPage.mobileNumberModal.sendCodeFailed"),
        );
        return;
      }
      startCountdown(activeCountdownKey, 60);
      setCodeSent(true);
    } catch (error) {
      console.error("Failed to send the mobile verification code:", error);
      setVerificationError(
        t("myAccountPage.mobileNumberModal.sendCodeFailed"),
      );
    }
  };

  const sendButtonText = useMemo(() => {
    if (countdown > 0) {
      return t("myAccountPage.mobileNumberModal.sendWithCountdown", {
        countdown,
      });
    }
    if (codeSent) {
      return t("myAccountPage.mobileNumberModal.resend");
    }
    return t("myAccountPage.mobileNumberModal.send");
  }, [codeSent, countdown, t]);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (verificationCode.trim()) {
        try {
          setVerificationError("");
          const verifyResult = await postVerificationCodeByPhone(
            combineInternationalMobileNumber(
              currentValues.phoneNumber.phoneCountryCode,
              currentValues.phoneNumber.phoneLocalNumber,
            ),
            verificationCode.trim(),
          );
          if (!isUserVerificationCodeAccepted(verifyResult)) {
            console.error(
              "Current mobile verification code was rejected:",
              verifyResult,
            );
            setVerificationError(
              t("myAccountPage.changePasswordModal.invalidCode"),
            );
            return;
          }
          setCurrentStep(2);
          setCodeSent(false);
          setVerificationCode("");
          clearCountdown(currentMobileCountdownKey);
        } catch (error) {
          console.error(
            "Failed to verify the current mobile number:",
            error,
          );
          setVerificationError(
            t("myAccountPage.changePasswordModal.invalidCode"),
          );
          return;
        }
      }
    } else if (currentStep === 2) {
      if (newVerificationCode.trim().length <= 4) {
        return;
      }

      const mobileNumberValidation = validateMobileNumber({
        countryCode: newPhoneNumber.phoneCountryCode,
        phoneNumber: newPhoneNumber.phoneLocalNumber,
      });

      if (!mobileNumberValidation.isValid) {
        setNewMobileNumberError(mobileNumberValidation.message);
        return;
      }

      setNewMobileNumberError("");

      try {
        setSubmitLoading(true);
        setVerificationError("");
        const verifyResult = await postVerificationCodeByPhone(
          combineInternationalMobileNumber(
            newPhoneNumber.phoneCountryCode,
            newPhoneNumber.phoneLocalNumber,
          ),
          newVerificationCode.trim(),
        );
        if (!isUserVerificationCodeAccepted(verifyResult)) {
          console.error(
            "New mobile verification code was rejected:",
            verifyResult,
          );
          setVerificationError(
            t("myAccountPage.changePasswordModal.invalidCode"),
          );
          return;
        }
        await postUpdateMyAccountInfo(
          toApi({
            userId: userInfo.id,
            phoneNumber: newPhoneNumber,
            verificationCode: newVerificationCode.trim(),
          }),
        );
        clearCountdown(newMobileCountdownKey);
        setShowSuccess(true);
      } catch (error) {
        console.error("Failed to verify the new mobile number:", error);
        setVerificationError(
          t("myAccountPage.changePasswordModal.invalidCode"),
        );
      } finally {
        setSubmitLoading(false);
      }
    }
  };

  const handleCloseSuccess = () => {
    onSuccess(
      newPhoneNumber.phoneCountryCode,
      newPhoneNumber.phoneLocalNumber.trim(),
    );
    onClose();
  };

  const isStep1Valid = verificationCode.trim().length > 4;
  const isStep2Valid =
    newPhoneNumber.phoneLocalNumber.trim().length > 0 &&
    newVerificationCode.trim().length > 4;

  if (showSuccess) {
    return (
      <Modal
        visible={visible}
        onCancel={onClose}
        footer={null}
        closable={false}
        centered
        className="edit-mobile-modal success-modal"
        width={600}
      >
        <div
          className="edit-mobile-modal__content edit-mobile-modal__content--success"
          dir={isAr ? "rtl" : "ltr"}
        >
          <CloseOutlined className="modal-close-icon" onClick={onClose} />
          <div className="success-content">
            <div className="success-icon-wrapper">
              <div className="success-circle">
                <CheckOutlined className="success-check" />
              </div>
            </div>
            <h2 className="success-title">
              {t("myAccountPage.mobileNumberModal.mobileUpdatedTitle")}
            </h2>
            <p className="success-description">
              {t("myAccountPage.mobileNumberModal.mobileUpdatedDescription")}
            </p>
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
      centered
      width=""
      className="edit-mobile-modal"
    >
      <div className="edit-mobile-modal__content" dir={isAr ? "rtl" : "ltr"}>
        <div className="modal-header">
          <h2 className="modal-title">
            {t("myAccountPage.mobileNumberModal.editTitle")}
          </h2>
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
                {t("myAccountPage.mobileNumberModal.verifyCurrentMobileNumber")}
              </span>
            </div>
            <div className={`step-arrow${isAr ? " is-rtl" : ""}`}>
              <RightOutlined />
            </div>

            <div className="step-item">
              {currentStep > 1 ? (
                <img src={secondGoldIcon} alt="" />
              ) : (
                <img src={secondIcon} alt="" />
              )}

              <span className="step-label">
                {t("myAccountPage.mobileNumberModal.verifyNewMobileNumber")}
              </span>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="step-content">
              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.mobileNumberModal.currentMobileNumber")}{" "}
                  <span className="required">*</span>
                </label>
                <StandaloneMobileNumberInput
                  disabled
                  countryCode={currentValues.phoneNumber.phoneCountryCode}
                  phoneNumber={currentValues.phoneNumber.phoneLocalNumber}
                  placeholder={t(
                    "formPlaceholders.pages.myAccount.mobileNumberModal.enterCurrentMobileNumber",
                  )}
                />
                {currentMobileNumberError && (
                  <div className="error-message">{currentMobileNumberError}</div>
                )}
              </div>

              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.mobileNumberModal.verificationCode")}{" "}
                  <span className="required">*</span>
                </label>

                <div className="verification-input-wrapper">
                  <Input
                    placeholder={t(
                      "formPlaceholders.pages.myAccount.enterCode",
                    )}
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, ""));
                      setVerificationError("");
                    }}
                    maxLength={6}
                    inputMode="numeric"
                    className={`form-input verification-input${
                      verificationError ? " error" : ""
                    }`}
                  />
                  <CustomButton
                    text={sendButtonText}
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    customClassName="send-code-btn"
                  />
                </div>
                {verificationError ? (
                  <div className="error-message">{verificationError}</div>
                ) : null}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.mobileNumberModal.newMobileNumber")}{" "}
                  <span className="required">*</span>
                </label>
                <StandaloneMobileNumberInput
                  countryCode={newPhoneNumber.phoneCountryCode}
                  phoneNumber={newPhoneNumber.phoneLocalNumber}
                  placeholder={t(
                    "formPlaceholders.pages.myAccount.mobileNumberModal.enterMobileNumber",
                  )}
                  searchPlaceholder={t("formPlaceholders.common.search")}
                  emptyText={t("multiSelectDropdown.noResults")}
                  hasError={Boolean(newMobileNumberError)}
                  onCountryCodeChange={(value) => {
                    setNewPhoneNumber((current) => ({
                      ...current,
                      phoneCountryCode: value,
                    }));
                    setNewMobileNumberError("");
                  }}
                  onPhoneNumberChange={(value) => {
                    setNewPhoneNumber((current) => ({
                      ...current,
                      phoneLocalNumber: value,
                    }));
                    setNewMobileNumberError("");
                  }}
                />
                {newMobileNumberError && (
                  <div className="error-message">{newMobileNumberError}</div>
                )}
              </div>

              <div className="form-item">
                <label className="form-label">
                  {t("myAccountPage.mobileNumberModal.verificationCode")}{" "}
                  <span className="required">*</span>
                </label>
                <div className="verification-input-wrapper">
                  <Input
                    placeholder={t(
                      "formPlaceholders.pages.myAccount.enterCode",
                    )}
                    value={newVerificationCode}
                    onChange={(e) =>
                      setNewVerificationCode(e.target.value.replace(/\D/g, ""))
                    }
                    className="form-input"
                    inputMode="numeric"
                    maxLength={6}
                  />
                  <CustomButton
                    text={sendButtonText}
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    customClassName="send-code-btn"
                  />
                </div>
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
            text={t("myAccountPage.mobileNumberModal.next")}
            variant="primary"
            onClick={handleNextStep}
            loading={submitLoading}
            disabled={currentStep === 1 ? !isStep1Valid : !isStep2Valid}
            customClassName="next-btn"
          />
        </div>
      </div>
    </Modal>
  );
};

export default EditMobileNumberModal;
