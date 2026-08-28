import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input } from "antd";
import { CloseOutlined, CheckOutlined } from "@ant-design/icons";
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
  postUpdateMyAccountInfo,
  postGenerateCodeBySms,
  postVerificationCodeByPhone,
  isUserVerificationCodeAccepted,
  type UpdateMyAccountInfoPayload,
} from "@/services/user";
import { useUserStore } from "@/store/user";
import {
  getVerificationCountdownKey,
  getVerificationCountdownRemaining,
  useVerificationCountdownStore,
} from "@/store/verification-store";

interface AddMobileNumberModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (countryCode: string, phoneNumber: string) => void;
}

interface AddAccountFormValues {
  phoneNumber: {
    phoneCountryCode: string;
    phoneLocalNumber: string;
  };
}

type AddAccountApiValues = AddAccountFormValues & {
  userId: string;
  verificationCode: string;
};

const toApi = (
  values: AddAccountApiValues,
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

const AddMobileNumberModal: React.FC<AddMobileNumberModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const [verificationCode, setVerificationCode] = useState("");
  const [values, setValues] = useState<AddAccountFormValues>({
    phoneNumber: {
      phoneCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
      phoneLocalNumber: "",
    },
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [mobileNumberError, setMobileNumberError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const userInfo = useUserStore((state) => state.userInfo);
  const countdownKey = getVerificationCountdownKey(
    "my-account-add-mobile",
    `${values.phoneNumber.phoneCountryCode}${values.phoneNumber.phoneLocalNumber}`,
  );
  const resendDeadline = useVerificationCountdownStore(
    (state) => state.resendDeadlines[countdownKey] ?? null,
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
    if (
      !visible ||
      !resendDeadline ||
      getVerificationCountdownRemaining(resendDeadline) <= 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      forceRender((value) => value + 1);
      if (getVerificationCountdownRemaining(resendDeadline) <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendDeadline, visible]);

  useEffect(() => {
    if (visible) {
      setVerificationCode("");
      setValues({
        phoneNumber: {
          phoneCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
          phoneLocalNumber: "",
        },
      });
      setShowSuccess(false);
      setCodeSent(false);
      setMobileNumberError("");
      setVerificationError("");
    }
  }, [visible]);
  const handleSendCode = async () => {
    const mobileNumberValidation = validateMobileNumber({
      countryCode: values.phoneNumber.phoneCountryCode,
      phoneNumber: values.phoneNumber.phoneLocalNumber,
    });
    if (!mobileNumberValidation.isValid) {
      setMobileNumberError(mobileNumberValidation.message);
      setVerificationError("");
      return;
    }
    setMobileNumberError("");
    setVerificationError("");
    const phone = combineInternationalMobileNumber(
      values.phoneNumber.phoneCountryCode,
      values.phoneNumber.phoneLocalNumber,
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
      startCountdown(countdownKey, 60);
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

  const handleSubmit = async () => {
    if (verificationCode.trim().length <= 4) {
      return;
    }

    const mobileNumberValidation = validateMobileNumber({
      countryCode: values.phoneNumber.phoneCountryCode,
      phoneNumber: values.phoneNumber.phoneLocalNumber,
    });

    if (!mobileNumberValidation.isValid) {
      setMobileNumberError(mobileNumberValidation.message);
      return;
    }

    setMobileNumberError("");

    try {
      setSubmitLoading(true);
      setVerificationError("");
      const verifyResult = await postVerificationCodeByPhone(
        combineInternationalMobileNumber(
          values.phoneNumber.phoneCountryCode,
          values.phoneNumber.phoneLocalNumber,
        ),
        verificationCode.trim(),
      );
      if (!isUserVerificationCodeAccepted(verifyResult)) {
        console.error("Mobile verification code was rejected:", verifyResult);
        setVerificationError(
          t("myAccountPage.changePasswordModal.invalidCode"),
        );
        return;
      }
      await postUpdateMyAccountInfo(
        toApi({
          ...values,
          userId: userInfo.id,
          verificationCode: verificationCode.trim(),
        }),
      );
      clearCountdown(countdownKey);
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to verify the mobile number:", error);
      setVerificationError(
        t("myAccountPage.changePasswordModal.invalidCode"),
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    onSuccess(
      values.phoneNumber.phoneCountryCode,
      values.phoneNumber.phoneLocalNumber.trim(),
    );
    onClose();
  };

  const isFormValid =
    values.phoneNumber.phoneLocalNumber.trim().length > 0 &&
    verificationCode.trim().length > 4;

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
              {t("myAccountPage.mobileNumberModal.mobileAddedTitle")}
            </h2>
            <p className="success-description">
              {t("myAccountPage.mobileNumberModal.mobileAddedDescription")}
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
            {t("myAccountPage.mobileNumberModal.addTitle")}
          </h2>
          <CloseOutlined className="modal-close-icon" onClick={onClose} />
        </div>

        <div className="modal-body">
          <div className="step-content">
            <div className="form-item">
              <label className="form-label">
                {t("myAccountPage.mobileNumberModal.newMobileNumber")}{" "}
                <span className="required">*</span>
              </label>
              <StandaloneMobileNumberInput
                countryCode={values.phoneNumber.phoneCountryCode}
                phoneNumber={values.phoneNumber.phoneLocalNumber}
                placeholder={t(
                  "formPlaceholders.pages.myAccount.mobileNumberModal.enterMobileNumber",
                )}
                searchPlaceholder={t("formPlaceholders.common.search")}
                emptyText={t("multiSelectDropdown.noResults")}
                hasError={Boolean(mobileNumberError)}
                onCountryCodeChange={(value) => {
                  setValues((current) => ({
                    ...current,
                    phoneNumber: {
                      ...current.phoneNumber,
                      phoneCountryCode: value,
                    },
                  }));
                  setMobileNumberError("");
                }}
                onPhoneNumberChange={(value) => {
                  setValues((current) => ({
                    ...current,
                    phoneNumber: {
                      ...current.phoneNumber,
                      phoneLocalNumber: value,
                    },
                  }));
                  setMobileNumberError("");
                }}
              />
              {mobileNumberError && (
                <div className="error-message">{mobileNumberError}</div>
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
                  className={`form-input ${
                    verificationError ? "error" : ""
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
                />
              </div>
              {verificationError && (
                <div className="error-message">{verificationError}</div>
              )}
            </div>
          </div>
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
            onClick={handleSubmit}
            loading={submitLoading}
            disabled={!isFormValid}
            customClassName="next-btn"
          />
        </div>
      </div>
    </Modal>
  );
};

export default AddMobileNumberModal;
