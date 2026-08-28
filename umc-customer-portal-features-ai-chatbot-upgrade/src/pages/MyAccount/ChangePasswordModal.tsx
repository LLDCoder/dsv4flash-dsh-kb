import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Form, Input, Modal } from "antd";
import type { InputRef } from "antd/lib/input";
import { useTranslation } from "react-i18next";
import {
  CustomButton,
  CustomMessage,
  FormErrorPrompt,
  isVerificationCodeInlineError,
} from "@/components/common";
import Loading from "@/components/common/Loading";
import Timer from "@/assets/icons/Timer";
import Eye from "@/assets/icons/Eye";
import EyeView from "@/assets/icons/EyeView";
import aesEncrypt from "@/utils/aesEncrypt";
import { performAuthenticatedLogout } from "@/utils/authSession";
import { useUserStore } from "@/store/user";
import {
  getVerificationCountdownKey,
  getVerificationCountdownRemaining,
  VERIFICATION_RESEND_SECONDS,
  useVerificationCountdownStore,
} from "@/store/verification-store";
import {
  postEmail,
  postForgetPassword,
  postVerificationCode,
  getCheckPassWord,
  isUserVerificationCodeAccepted,
} from "@/services/user";
import { resolveVerificationLockState } from "@/services/verificationLock";
import warning_yellow from "@/assets/images/warning_yellow.png";
import "./ChangePasswordModal.less";

type Step = "email" | "verification" | "password";

interface VerificationLockState {
  remainingSec: number | null;
}

const CHANGE_PASSWORD_VERIFICATION_TYPE = 3;

const formatEmailMask = (email: string): string => {
  if (!email) return "";
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return email;

  const prefix = email.substring(0, atIndex);
  const suffix = email.substring(atIndex);

  if (prefix.length <= 3) {
    return `${prefix}**${suffix}`;
  }

  return `${prefix.substring(0, 3)}**${suffix}`;
};

const EMPTY_CODE = ["", "", "", "", "", ""];
const EMPTY_PASSWORD_VALIDATE_RESULT = [false, false, false, false, false];

export interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  resumeToVerification?: boolean;
  onVerificationSessionStart?: () => void;
  onVerificationSessionReset?: () => void;
  /** Plain email used for API calls and masking in the UI. */
  email: string;
  /**
   * When true (My Account / logged-in), step 3 uses current + new password,
   * with CheckPassWord before ForgetPassWord.
   * When false, step 3 is new password only (e.g. first-time password flows).
   */
  requireCurrentPassword?: boolean;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  resumeToVerification = false,
  onVerificationSessionStart,
  onVerificationSessionReset,
  email: rawEmailProp,
  requireCurrentPassword = true,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const [step, setStep] = useState<Step>("email");
  const [form] = Form.useForm();

  const rawEmail = (rawEmailProp || "").trim();
  const displayEmail = useMemo(() => formatEmailMask(rawEmail), [rawEmail]);
  const verificationCountdownKey = getVerificationCountdownKey(
    "change-password",
    rawEmail,
  );

  const [codeYzm, setCodeYzm] = useState(EMPTY_CODE);
  const inputsRef = useRef<Array<InputRef | null>>([]);
  const [sendLoading, setSendLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);

  const [pwdValidateRes, setPwdValidateRes] = useState(
    EMPTY_PASSWORD_VALIDATE_RESULT,
  );
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [emailStepError, setEmailStepError] = useState("");
  const [lockState, setLockState] = useState<VerificationLockState | null>(null);

  const setVerificationError = (message: string) => {
    const text = message.trim();
    if (!text) {
      setCodeError("");
      setGeneralError("");
      return;
    }
    if (isVerificationCodeInlineError(text)) {
      setCodeError(text);
      setGeneralError("");
      return;
    }
    setCodeError("");
    setGeneralError(text);
  };

  const clearVerificationErrors = () => {
    setCodeError("");
    setGeneralError("");
  };

  const applyLockState = (payload: unknown) => {
    const resolved = resolveVerificationLockState(payload);
    if (!resolved) {
      setLockState(null);
      return false;
    }

    setLockState({
      remainingSec: resolved.remainingSec,
    });
    return true;
  };

  const getLockMessage = () => {
    if (!lockState) return "";
    if (lockState.remainingSec !== null) {
      const minutes = Math.max(1, Math.ceil(lockState.remainingSec / 60));
      return t("login.twoFactor.verifyLockedWithMinutes", { minutes });
    }
    return t("login.twoFactor.verifyLocked");
  };

  const password = Form.useWatch("password", form);
  const confirmPassword = Form.useWatch("confirmPassword", form);
  const currentPassword = Form.useWatch("currentPassword", form);
  const resendDeadline = useVerificationCountdownStore(
    (state) => state.resendDeadlines[verificationCountdownKey] ?? null,
  );
  const startCountdown = useVerificationCountdownStore(
    (state) => state.startCountdown,
  );
  const clearCountdown = useVerificationCountdownStore(
    (state) => state.clearCountdown,
  );
  const [, forceRender] = useState(0);
  const countdown = getVerificationCountdownRemaining(resendDeadline);

  const prevOpenRef = useRef(false);

  const resetModalStepState = useCallback(
    (nextStep: Step) => {
      setStep(nextStep);
      setCodeYzm(EMPTY_CODE);
      setSendLoading(false);
      setResendDisabled(false);
      setPwdValidateRes(EMPTY_PASSWORD_VALIDATE_RESULT);
      setLoading(false);
      clearVerificationErrors();
      setEmailStepError("");
      setLockState(null);
      form.resetFields(["currentPassword", "password", "confirmPassword"]);
    },
    [form],
  );

  useEffect(() => {
    if (visible && !prevOpenRef.current) {
      resetModalStepState(resumeToVerification ? "verification" : "email");
    }
    prevOpenRef.current = visible;
  }, [visible, resetModalStepState, resumeToVerification]);

  useEffect(() => {
    if (visible && step === "email") {
      form.setFieldsValue({ email: displayEmail });
    }
  }, [visible, step, displayEmail, form]);

  useEffect(() => {
    if (step !== "verification" || countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      forceRender((value) => value + 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown, step]);

  useEffect(() => {
    if (
      step !== "verification" ||
      !lockState ||
      lockState.remainingSec === null ||
      lockState.remainingSec <= 0
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLockState((prev) => {
        if (!prev) return prev;
        if (prev.remainingSec === null) return prev;
        if (prev.remainingSec <= 1) return null;
        return {
          ...prev,
          remainingSec: prev.remainingSec - 1,
        };
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [lockState, step]);

  const handleModalClose = () => {
    setEmailStepError("");
    onClose();
  };

  const handleSendCode = async () => {
    if (!rawEmail) return;
    try {
      setSendLoading(true);
      setEmailStepError("");
      await postEmail(rawEmail, undefined, CHANGE_PASSWORD_VERIFICATION_TYPE);
      onVerificationSessionStart?.();
      startCountdown(verificationCountdownKey, VERIFICATION_RESEND_SECONDS);
      setStep("verification");
    } catch (error) {
      setEmailStepError(
        t("myAccountPage.changePasswordModal.sendCodeFailed"),
      );
      console.error("Failed to send verification code:", error);
    } finally {
      setSendLoading(false);
    }
  };

  const isLocked = Boolean(lockState);

  const handleVerifyCode = async () => {
    if (codeYzm.join("").length !== 6 || !rawEmail) return;
    try {
      setLoading(true);
      clearVerificationErrors();
      const result = await postVerificationCode(
        rawEmail,
        codeYzm.join(""),
        CHANGE_PASSWORD_VERIFICATION_TYPE,
      );
      if (!isUserVerificationCodeAccepted(result)) {
        const hasLockState = applyLockState(result);
        if (hasLockState) {
          setCodeYzm(EMPTY_CODE);
          clearVerificationErrors();
          return;
        }
        console.error("Verification code was rejected:", result);
        setVerificationError(
          t("myAccountPage.changePasswordModal.invalidCode"),
        );
        return;
      }
      onVerificationSessionReset?.();
      clearCountdown(verificationCountdownKey);
      setStep("password");
    } catch (error) {
      const hasLockState = applyLockState(error);
      if (hasLockState) {
        setCodeYzm(EMPTY_CODE);
        clearVerificationErrors();
        return;
      }
      console.error("Failed to verify code:", error);
      setVerificationError(
        t("myAccountPage.changePasswordModal.verificationFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!rawEmail) return;
    if (pwdValidateRes.filter(Boolean).length !== pwdValidateRes.length) {
      return;
    }
    try {
      const values = await form.validateFields();
      if (
        requireCurrentPassword &&
        (values.currentPassword as string) === (values.password as string)
      ) {
        form.setFields([
          {
            name: "password",
            errors: [
              t("myAccountPage.changePasswordModal.sameAsCurrentPassword"),
            ],
          },
        ]);
        return;
      }
      setLoading(true);
      const encryptedPwd = aesEncrypt(values.password as string);

      if (requireCurrentPassword) {
        const encryptedCurrentPwd = aesEncrypt(
          values.currentPassword as string,
        );
        const checkResult = (await getCheckPassWord(
          encryptedCurrentPwd,
        )) as { isSuccess?: boolean; data?: boolean };
        if (!checkResult?.isSuccess || !checkResult?.data) {
          CustomMessage.error(
            t("myAccountPage.changePasswordModal.currentPasswordIncorrect"),
          );
          return;
        }
      }

      await postForgetPassword({ pwd: encryptedPwd, email: rawEmail });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "errorFields" in error &&
        Array.isArray((error as { errorFields?: unknown }).errorFields)
      ) {
        return;
      }
      CustomMessage.error(t("myAccountPage.changePasswordModal.failed"));
      console.error("Failed to change password:", error);
      return;
    } finally {
      setLoading(false);
    }
    CustomMessage.success(t("myAccountPage.changePasswordModal.success"));
    performAuthenticatedLogout({
      clearUserStorage: true,
      onLocalLogout: () => {
        useUserStore.getState().resetUserInfo();
        handleModalClose();
      },
    });
  };

  const handleResendCode = async () => {
    if (sendLoading || countdown > 0 || resendDisabled || isLocked || !rawEmail) return;
    try {
      setSendLoading(true);
      clearVerificationErrors();
      const result = await postEmail(
        rawEmail,
        undefined,
        CHANGE_PASSWORD_VERIFICATION_TYPE,
      );
      const hasLockState = applyLockState(result);
      if (hasLockState) {
        clearCountdown(verificationCountdownKey);
        return;
      }
      onVerificationSessionStart?.();
      startCountdown(verificationCountdownKey, VERIFICATION_RESEND_SECONDS);
    } catch (error) {
      const hasLockState = applyLockState(error);
      if (hasLockState) {
        clearVerificationErrors();
        clearCountdown(verificationCountdownKey);
        return;
      }
      setVerificationError(
        t("myAccountPage.changePasswordModal.resendCodeFailed"),
      );
      setResendDisabled(true);
      console.error("Failed to resend code:", error);
    } finally {
      setSendLoading(false);
    }
  };

  const handleInputChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    clearVerificationErrors();
    const newCode = [...codeYzm];
    newCode[index] = value;
    setCodeYzm(newCode);
    if (value && index < codeYzm.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !codeYzm[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    clearVerificationErrors();
    const pastedData = e.clipboardData.getData("text");
    const numbers = pastedData
      .replace(/\D/g, "")
      .split("")
      .slice(0, codeYzm.length);
    const newCode = [...codeYzm];
    numbers.forEach((num: string, index: number) => {
      newCode[index] = num;
    });
    setCodeYzm(newCode);
    const lastFilledIndex = numbers.length - 1;
    if (lastFilledIndex < codeYzm.length - 1) {
      inputsRef.current[numbers.length]?.focus();
    }
  };

  const validatePassword = (pwd: string) => {
    const next = [...pwdValidateRes];
    next[0] = Boolean(pwd && pwd.length >= 8 && pwd.length <= 16);
    next[1] = /^.*[a-z].*$/.test(pwd);
    next[2] = /^.*[0-9].*$/.test(pwd);
    next[3] = /^.*[A-Z].*$/.test(pwd);
    next[4] = /[!@#$_.]/.test(pwd) && !/[^a-zA-Z0-9!@#$_.]/.test(pwd);
    setPwdValidateRes(next);
  };

  const validateNewPassword = useCallback(
    (_: unknown, value: string) => {
      const matchedConfirmPassword = form.getFieldValue("confirmPassword");
      const typedCurrentPassword = form.getFieldValue("currentPassword");

      if (
        requireCurrentPassword &&
        value &&
        typedCurrentPassword &&
        value === typedCurrentPassword
      ) {
        return Promise.reject(
          new Error(t("myAccountPage.changePasswordModal.sameAsCurrentPassword")),
        );
      }

      if (!matchedConfirmPassword) {
        return Promise.resolve();
      }

      if (value && value !== matchedConfirmPassword) {
        return Promise.reject(new Error(t("newPassword.please.twoPassword")));
      }

      if (
        value &&
        matchedConfirmPassword &&
        value === matchedConfirmPassword
      ) {
        form.setFields([
          {
            name: "confirmPassword",
            errors: [],
          },
        ]);
      }

      return Promise.resolve();
    },
    [form, requireCurrentPassword, t],
  );

  const handleConfirm = () => {
    if (step === "email") {
      void handleSendCode();
    } else if (step === "verification") {
      void handleVerifyCode();
    } else {
      void handleChangePassword();
    }
  };

  const confirmText = useMemo(() => {
    if (step === "verification") {
      return t("myAccountPage.changePasswordModal.verifyCode");
    }
    return t("myAccountPage.changePasswordModal.confirm");
  }, [step, t]);

  const isConfirmDisabled = useMemo(() => {
    if (step === "email") {
      return !rawEmail;
    }
    if (step === "verification") {
      return (
        codeYzm.join("").length !== 6 ||
        Boolean(codeError) ||
        Boolean(generalError) ||
        isLocked
      );
    }
    if (step === "password") {
      const allReq = pwdValidateRes.filter(Boolean).length === pwdValidateRes.length;
      const hasCurrent = !requireCurrentPassword || Boolean(currentPassword);
      const sameAsCurrent =
        requireCurrentPassword &&
        Boolean(currentPassword) &&
        Boolean(password) &&
        currentPassword === password;
      return (
        !hasCurrent ||
        !password ||
        !confirmPassword ||
        password !== confirmPassword ||
        sameAsCurrent ||
        !allReq
      );
    }
    return false;
  }, [
    step,
    rawEmail,
    codeYzm,
    codeError,
    generalError,
    isLocked,
    password,
    confirmPassword,
    currentPassword,
    pwdValidateRes,
    requireCurrentPassword,
  ]);

  const confirmVariant = isConfirmDisabled ? "secondary" : "primary";

  const renderEmailStep = () => (
    <div className="my-account-cpw__content">
      <div className="my-account-cpw__banner">
        <img src={warning_yellow} className="my-account-cpw__banner-icon" srcSet="" alt="" />
        <span className="my-account-cpw__banner-text">
          {t("myAccountPage.changePasswordModal.emailStepBanner")}
        </span>
      </div>
      <Form
        form={form}
        layout="vertical"
        className="my-account-cpw__form"
        initialValues={{ email: displayEmail }}
      >
        <Form.Item label={t("myAccountPage.fields.email")} name="email">
          <Input disabled className="my-account-cpw__input" />
        </Form.Item>
        {emailStepError ? (
          <div className="my-account-cpw__email-alert">
            <FormErrorPrompt
              message={emailStepError}
              className="form-error-prompt--after-input"
            />
          </div>
        ) : null}
      </Form>
    </div>
  );

  const renderVerificationStep = () => {
    const countdownLabel = `${countdown}s`;
    return (
      <div className="my-account-cpw__content my-account-cpw__content--verification">
        <div className="my-account-cpw__verification-title">
          {t("myAccountPage.changePasswordModal.verificationTitle")}
        </div>
        <div className="my-account-cpw__verification-desc">
          {t("myAccountPage.changePasswordModal.verificationDesc", {
            email: displayEmail,
          })}
        </div>
        <div className="my-account-cpw__code-section">
          <div className="my-account-cpw__code-row">
            {codeYzm.map((item, index) => (
              <Input
                key={index}
                inputMode="numeric"
                maxLength={1}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={item}
                onChange={(e) => handleInputChange(e.target.value, index)}
                disabled={loading}
                className={`my-account-cpw__code-cell${codeError ? " my-account-cpw__code-cell--error" : ""}`}
              />
            ))}
          </div>
          {codeError ? (
            <div className="my-account-cpw__code-error" role="alert">
              {codeError}
            </div>
          ) : null}
        </div>
        <div className="my-account-cpw__resend">
          <span className="my-account-cpw__resend-label">
            {t("myAccountPage.changePasswordModal.notReceived")}
          </span>
          <div className="my-account-cpw__resend-actions">
            {countdown > 0 && (
              <span className="my-account-cpw__resend-time">
                <Timer />
                {countdownLabel}
              </span>
            )}
            <span
              role="button"
              tabIndex={0}
              className={`my-account-cpw__resend-link ${
                countdown > 0 || sendLoading || resendDisabled || isLocked
                  ? "is-disabled"
                  : ""
              }`}
              onClick={() => {
                if (countdown > 0 || sendLoading || resendDisabled || isLocked) return;
                void handleResendCode();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (countdown > 0 || sendLoading || resendDisabled || isLocked) return;
                  void handleResendCode();
                }
              }}
            >
              <Loading loading={sendLoading}>
                {t("myAccountPage.changePasswordModal.resend")}
              </Loading>
            </span>
          </div>
        </div>
        {generalError || isLocked ? (
          <div className="my-account-cpw__verification-alert">
            <FormErrorPrompt
              message={isLocked ? getLockMessage() : generalError}
              className="form-error-prompt--after-footer"
            />
          </div>
        ) : null}
      </div>
    );
  };

  const renderPasswordStep = () => (
    <div className="my-account-cpw__content">
      <div className="my-account-cpw__banner">
        <img src={warning_yellow} alt={t("common.warning")} className="my-account-cpw__banner-icon" />
        <span className="my-account-cpw__banner-text">
          {requireCurrentPassword
            ? t("myAccountPage.changePasswordModal.passwordStepBannerLoggedIn")
            : t("myAccountPage.changePasswordModal.newPasswordBanner")}
        </span>
      </div>
      <Form form={form} layout="vertical" className="my-account-cpw__form">
        {requireCurrentPassword ? (
          <Form.Item
            label={t("myAccountPage.changePasswordModal.currentPassword")}
            name="currentPassword"
            rules={[{ required: true, message: t("common.required") }]}
          >
            <Input.Password
              placeholder={t(
                "formPlaceholders.pages.myAccount.changePassword.enterCurrentPassword",
              )}
              className="my-account-cpw__input"
              allowClear
              iconRender={(visible) => (visible ? <EyeView /> : <Eye />)}
            />
          </Form.Item>
        ) : null}
        <Form.Item
          label={t("myAccountPage.changePasswordModal.newPassword")}
          name="password"
          dependencies={
            requireCurrentPassword
              ? ["currentPassword", "confirmPassword"]
              : ["confirmPassword"]
          }
          rules={[
            { required: true, message: t("common.required") },
            { validator: validateNewPassword },
          ]}
          className="my-account-cpw__form-item-tight"
        >
          <Input.Password
            placeholder={t(
              "formPlaceholders.pages.myAccount.changePassword.enterNewPassword",
            )}
            className="my-account-cpw__input"
            allowClear
            onChange={(e) => validatePassword(e.target.value)}
            iconRender={(visible) => (visible ? <EyeView /> : <Eye />)}
          />
        </Form.Item>
        <div className="my-account-cpw__requirements">
          <div
            className={`my-account-cpw__requirement ${
              pwdValidateRes[0] ? "is-met" : ""
            }`}
          >
            {t("myAccountPage.changePasswordModal.reqLength")}
          </div>
          <div
            className={`my-account-cpw__requirement ${
              pwdValidateRes[1] ? "is-met" : ""
            }`}
          >
            {t("myAccountPage.changePasswordModal.reqLower")}
          </div>
          <div
            className={`my-account-cpw__requirement ${
              pwdValidateRes[2] ? "is-met" : ""
            }`}
          >
            {t("myAccountPage.changePasswordModal.reqNumber")}
          </div>
          <div
            className={`my-account-cpw__requirement ${
              pwdValidateRes[3] ? "is-met" : ""
            }`}
          >
            {t("myAccountPage.changePasswordModal.reqUpper")}
          </div>
          <div
            className={`my-account-cpw__requirement ${
              pwdValidateRes[4] ? "is-met" : ""
            }`}
          >
            {t("myAccountPage.changePasswordModal.reqSpecial")}
          </div>
        </div>
        <Form.Item
          label={t("myAccountPage.changePasswordModal.confirmPasswordLabel")}
          name="confirmPassword"
          rules={[
            { required: true, message: t("common.required") },
            {
              validator: (_, value) => {
                const matchedPassword = form.getFieldValue("password");

                if (!matchedPassword) {
                  return Promise.resolve();
                }

                if (value && value !== matchedPassword) {
                  return Promise.reject(
                    new Error(t("newPassword.please.twoPassword")),
                  );
                }

                if (value && matchedPassword && value === matchedPassword) {
                  form.setFields([
                    {
                      name: "password",
                      errors: [],
                    },
                  ]);
                }

                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password
            placeholder={t(
              "formPlaceholders.pages.myAccount.changePassword.confirmPassword",
            )}
            className="my-account-cpw__input"
            allowClear
            iconRender={(visible) => (visible ? <EyeView /> : <Eye />)}
          />
        </Form.Item>
      </Form>
    </div>
  );

  const footer = (
    <div className="my-account-cpw__footer">
      <CustomButton
        text={confirmText}
        variant={confirmVariant}
        onClick={handleConfirm}
        loading={loading || sendLoading}
        disabled={isConfirmDisabled}
        customClassName="my-account-cpw__confirm-btn"
      />
    </div>
  );

  return (
    <Modal
      visible={visible}
      onCancel={handleModalClose}
      title={t("myAccountPage.changePasswordModal.title")}
      width={640}
      footer={footer}
      closable
      maskClosable={false}
      destroyOnClose
      className="my-account-cpw-modal"
      centered
    >
      <div className="my-account-cpw__root" dir={isAr ? "rtl" : "ltr"}>
        {step === "email" && renderEmailStep()}
        {step === "verification" && renderVerificationStep()}
        {step === "password" && renderPasswordStep()}
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
