import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { CustomMessage } from "@/components/common";
import PublicLayout from "@/components/common/PublicLayout";
import {
  confirmNewEmail,
  identifyForgotEmail,
  sendRecoveryEmail,
  sendCurrentEmailOtp,
  sendNewEmailOtp,
  verifyCurrentEmailOtp,
  type ForgotEmailCandidate,
  type IdentifyForgotEmailRequest,
} from "@/services/user";
import IdentityStep from "./components/IdentityStep";
import {
  AccountFoundStep,
  AccountSelectionStep,
  CurrentEmailOtpStep,
  EmailOtpStep,
  NewEmailStep,
} from "./components/FlowSteps";
import {
  createEmptyOtpCode,
  OTP_LENGTH,
  type ForgotEmailIdentityValues,
  type ForgotEmailStep,
} from "./types";
import "./index.less";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RESEND_SECONDS = 60;
const OTP_RATE_LIMIT_MS = OTP_RESEND_SECONDS * 1000;
const FORGOT_EMAIL_SESSION_KEY = "forgot-email-flow";

const getTrimmedValue = (value: unknown) => String(value ?? "").trim();

const normalizeEmiratesId = (value: unknown) =>
  getTrimmedValue(value).replace(/[-\s]/g, "");

const getRequestErrorMessage = (_error: unknown, fallback: string) => fallback;

const getBusinessErrorMessage = (message: unknown, fallback: string) => {
  if (typeof message !== "string") return fallback;

  return message.trim() || fallback;
};

const getNewEmailOtpRequestErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  if (!error || typeof error !== "object") return fallback;

  const source = error as {
    response?: {
      data?: {
        data?: { message?: unknown } | null;
      } | null;
    };
  };

  return getBusinessErrorMessage(
    source.response?.data?.data?.message,
    fallback,
  );
};

const getRequestStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  const source = error as {
    response?: { data?: { statusCode?: unknown }; status?: unknown };
    status?: unknown;
    statusCode?: unknown;
  };
  const status =
    source.response?.status ??
    source.response?.data?.statusCode ??
    source.statusCode ??
    source.status;
  const normalizedStatus = Number(status);

  return Number.isFinite(normalizedStatus) ? normalizedStatus : undefined;
};

const getOtpResendDeadline = () => Date.now() + OTP_RATE_LIMIT_MS;

const getOtpCode = (code: string[]) => {
  const normalizedCode = code.join("");

  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(normalizedCode)
    ? normalizedCode
    : "";
};

const buildIdentifyRequest = (
  values: ForgotEmailIdentityValues,
  noMediaLicense: boolean,
): IdentifyForgotEmailRequest => {
  const hasMediaLicense = !noMediaLicense;
  const commercialLicenseNumber = getTrimmedValue(
    values.commercialLicenseNumber,
  );

  return {
    hasMediaLicense,
    mediaLicenseNumber: hasMediaLicense
      ? getTrimmedValue(values.mediaLicenseNumber) || null
      : null,
    emiratesId: hasMediaLicense
      ? null
      : normalizeEmiratesId(values.emiratesId) || null,
    individualAccount: Boolean(values.individualAccount),
    commercialLicenseNumber: commercialLicenseNumber || null,
  };
};

const getCandidates = (value: unknown): ForgotEmailCandidate[] => {
  if (!Array.isArray(value)) return [];

  return value.reduce<ForgotEmailCandidate[]>((result, candidate) => {
    if (!candidate || typeof candidate !== "object") return result;

    const account = candidate as ForgotEmailCandidate;
    const accountToken = getTrimmedValue(account.accountToken);
    if (!accountToken) return result;

    result.push({ ...account, accountToken });
    return result;
  }, []);
};

const clearForgotEmailSession = () => {
  if (typeof sessionStorage === "undefined") return;

  sessionStorage.removeItem(FORGOT_EMAIL_SESSION_KEY);
};

export default function ForgotEmail() {
  const { t } = useTranslation();
  const history = useHistory();
  const [step, setStep] = useState<ForgotEmailStep>("identity");
  const [identityValues, setIdentityValues] =
    useState<ForgotEmailIdentityValues>({});
  const [noMediaLicense, setNoMediaLicense] = useState(false);
  const [candidates, setCandidates] = useState<ForgotEmailCandidate[]>([]);
  const [selectedAccountToken, setSelectedAccountToken] = useState("");
  const [selectedAccount, setSelectedAccount] =
    useState<ForgotEmailCandidate | null>(null);
  const [currentEmailOtpToken, setCurrentEmailOtpToken] = useState("");
  const [currentEmailMaskedEmail, setCurrentEmailMaskedEmail] = useState("");
  const [currentEmailDeadline, setCurrentEmailDeadline] = useState<
    number | null
  >(null);
  const [currentEmailOtpCode, setCurrentEmailOtpCode] =
    useState(createEmptyOtpCode);
  const [currentEmailVerifiedToken, setCurrentEmailVerifiedToken] =
    useState("");
  const [recoveryMaskedEmail, setRecoveryMaskedEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailOtpToken, setNewEmailOtpToken] = useState("");
  const [newEmailMaskedEmail, setNewEmailMaskedEmail] = useState("");
  const [newEmailDeadline, setNewEmailDeadline] = useState<number | null>(null);
  const [newEmailOtpCode, setNewEmailOtpCode] = useState(createEmptyOtpCode);
  const [currentOtpBlockedUntil, setCurrentOtpBlockedUntil] = useState<
    number | null
  >(null);
  const [newOtpBlockedUntil, setNewOtpBlockedUntil] = useState<number | null>(
    null,
  );
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSendingCurrentEmailOtp, setIsSendingCurrentEmailOtp] =
    useState(false);
  const [isSendingRecoveryEmail, setIsSendingRecoveryEmail] = useState(false);
  const [isVerifyingCurrentEmailOtp, setIsVerifyingCurrentEmailOtp] =
    useState(false);
  const [isSendingNewEmailOtp, setIsSendingNewEmailOtp] = useState(false);
  const [isConfirmingNewEmail, setIsConfirmingNewEmail] = useState(false);

  const currentOtpRateLimited = Boolean(
    currentOtpBlockedUntil && currentOtpBlockedUntil > Date.now(),
  );
  const newOtpRateLimited = Boolean(
    newOtpBlockedUntil && newOtpBlockedUntil > Date.now(),
  );

  useEffect(() => {
    if (!currentOtpBlockedUntil) return undefined;

    const timeout = window.setTimeout(
      () => setCurrentOtpBlockedUntil(null),
      Math.max(0, currentOtpBlockedUntil - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [currentOtpBlockedUntil]);

  useEffect(() => {
    if (!newOtpBlockedUntil) return undefined;

    const timeout = window.setTimeout(
      () => setNewOtpBlockedUntil(null),
      Math.max(0, newOtpBlockedUntil - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [newOtpBlockedUntil]);

  useEffect(() => {
    clearForgotEmailSession();
  }, []);

  const resetNewEmailOtpState = () => {
    setNewEmailOtpToken("");
    setNewEmailMaskedEmail("");
    setNewEmailDeadline(null);
    setNewEmailOtpCode(createEmptyOtpCode());
    setNewOtpBlockedUntil(null);
  };

  const resetEmailChangeState = () => {
    setCurrentEmailOtpToken("");
    setCurrentEmailMaskedEmail("");
    setCurrentEmailDeadline(null);
    setCurrentEmailOtpCode(createEmptyOtpCode());
    setCurrentEmailVerifiedToken("");
    setCurrentOtpBlockedUntil(null);
    setNewEmail("");
    resetNewEmailOtpState();
  };

  const resetRecoveryEmailState = () => {
    setRecoveryMaskedEmail("");
  };

  const handleCurrentEmailOtpSendError = (error: any) => {
    if (getRequestStatus(error) === 429) {
      setCurrentOtpBlockedUntil(Date.now() + OTP_RATE_LIMIT_MS);
    }
    CustomMessage.error(
      error.response.data.data.message
        ? error.response.data.data.message
        : getRequestErrorMessage(error, t("forgotEmail.operationFailed")),
    );
  };

  const handleNewEmailOtpSendError = (error: unknown) => {
    if (getRequestStatus(error) === 429) {
      setNewOtpBlockedUntil(Date.now() + OTP_RATE_LIMIT_MS);
    }

    CustomMessage.error(
      getNewEmailOtpRequestErrorMessage(
        error,
        t("forgotEmail.operationFailed"),
      ),
    );
  };

  const handleForgotEmailRequestError = (error: unknown) => {
    CustomMessage.error(
      getRequestErrorMessage(error, t("forgotEmail.operationFailed")),
    );
  };

  const handleSendRecoveryEmail = async (accountToken: string) => {
    const normalizedAccountToken = getTrimmedValue(accountToken);
    if (!normalizedAccountToken || isSendingRecoveryEmail) return;

    setIsSendingRecoveryEmail(true);
    try {
      const response = await sendRecoveryEmail({
        accountToken: normalizedAccountToken,
      });
      const result = response?.data;
      const maskedEmail = getTrimmedValue(result?.maskedEmail);

      if (response?.isSuccess !== true || result?.success !== true) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      if (!maskedEmail) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      setRecoveryMaskedEmail(maskedEmail);
      setStep("account-found");
    } catch (error) {
      handleForgotEmailRequestError(error);
    } finally {
      setIsSendingRecoveryEmail(false);
    }
  };

  const handleSendCurrentEmailOtp = async () => {
    const accountToken = getTrimmedValue(selectedAccount?.accountToken);
    if (isSendingCurrentEmailOtp || currentOtpRateLimited) return;

    if (!accountToken) {
      CustomMessage.error(t("forgotEmail.operationFailed"));
      return;
    }

    setIsSendingCurrentEmailOtp(true);
    try {
      const response = await sendCurrentEmailOtp({
        accountToken,
      });
      const result = response?.data;
      const otpToken = getTrimmedValue(result?.currentEmailOtpToken);
      const maskedEmail = getTrimmedValue(result?.maskedEmail);
      const deadline = getOtpResendDeadline();

      if (response?.isSuccess !== true || result?.success !== true) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      if (!otpToken || !maskedEmail || !deadline) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      setCurrentEmailOtpToken(otpToken);
      setCurrentEmailMaskedEmail(maskedEmail);
      setCurrentEmailDeadline(deadline);
      setCurrentEmailOtpCode(createEmptyOtpCode());
      setCurrentEmailVerifiedToken("");
      setNewEmail("");
      resetNewEmailOtpState();
      setStep("current-email-otp");
    } catch (error) {
      handleCurrentEmailOtpSendError(error);
    } finally {
      setIsSendingCurrentEmailOtp(false);
    }
  };

  const handleVerifyCurrentEmailOtp = async () => {
    const otpToken = getTrimmedValue(currentEmailOtpToken);
    const code = getOtpCode(currentEmailOtpCode);
    if (isVerifyingCurrentEmailOtp) return;

    if (!otpToken || !code) {
      CustomMessage.error(t("forgotEmail.invalidOtp"));
      return;
    }

    setIsVerifyingCurrentEmailOtp(true);
    try {
      const response = await verifyCurrentEmailOtp({
        currentEmailOtpToken: otpToken,
        code,
      });
      const result = response?.data;
      const verifiedToken = getTrimmedValue(result?.currentEmailVerifiedToken);

      if (response?.isSuccess !== true || result?.success !== true) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      if (!verifiedToken) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      setCurrentEmailVerifiedToken(verifiedToken);
      setCurrentEmailOtpCode(createEmptyOtpCode());
      setStep("new-email");
    } catch (error) {
      handleForgotEmailRequestError(error);
    } finally {
      setIsVerifyingCurrentEmailOtp(false);
    }
  };

  const handleSendNewEmailOtp = async (email = newEmail) => {
    const verifiedToken = getTrimmedValue(currentEmailVerifiedToken);
    const normalizedEmail = getTrimmedValue(email);
    if (isSendingNewEmailOtp || newOtpRateLimited) return;

    if (!verifiedToken || !EMAIL_PATTERN.test(normalizedEmail)) {
      CustomMessage.error(t("forgotEmail.operationFailed"));
      return;
    }

    setIsSendingNewEmailOtp(true);
    try {
      const response = await sendNewEmailOtp({
        currentEmailVerifiedToken: verifiedToken,
        newEmail: normalizedEmail,
      });
      const result = response?.data;
      const otpToken = getTrimmedValue(result?.newEmailOtpToken);
      const maskedEmail = getTrimmedValue(result?.maskedEmail);
      const deadline = getOtpResendDeadline();

      if (response?.isSuccess !== true || result?.success !== true) {
        CustomMessage.error(
          getBusinessErrorMessage(
            result?.message,
            t("forgotEmail.operationFailed"),
          ),
        );
        return;
      }

      if (!otpToken || !maskedEmail || !deadline) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      setNewEmail(normalizedEmail);
      setNewEmailOtpToken(otpToken);
      setNewEmailMaskedEmail(maskedEmail);
      setNewEmailDeadline(deadline);
      setNewEmailOtpCode(createEmptyOtpCode());
      setStep("email-otp");
    } catch (error) {
      handleNewEmailOtpSendError(error);
    } finally {
      setIsSendingNewEmailOtp(false);
    }
  };

  const handleConfirmNewEmail = async () => {
    const otpToken = getTrimmedValue(newEmailOtpToken);
    const code = getOtpCode(newEmailOtpCode);
    if (isConfirmingNewEmail) return;

    if (!otpToken || !code) {
      CustomMessage.error(t("forgotEmail.invalidOtp"));
      return;
    }

    setIsConfirmingNewEmail(true);
    try {
      const response = await confirmNewEmail({
        newEmailOtpToken: otpToken,
        code,
      });
      const result = response?.data;

      if (response?.isSuccess !== true || result?.success !== true) {
        CustomMessage.error(t("forgotEmail.operationFailed"));
        return;
      }

      const successMessage = t("forgotEmail.emailUpdatedSuccess");
      resetEmailChangeState();
      clearForgotEmailSession();
      history.push("/login", { forgotEmailSuccessMessage: successMessage });
    } catch (error) {
      handleForgotEmailRequestError(error);
    } finally {
      setIsConfirmingNewEmail(false);
    }
  };

  const handleIdentityContinue = async (values: ForgotEmailIdentityValues) => {
    if (isIdentifying || isSendingRecoveryEmail || isSendingCurrentEmailOtp) {
      return;
    }

    setIdentityValues(values);
    setCandidates([]);
    setSelectedAccountToken("");
    setSelectedAccount(null);
    resetRecoveryEmailState();
    resetEmailChangeState();
    setIsIdentifying(true);

    try {
      const response = await identifyForgotEmail(
        buildIdentifyRequest(values, noMediaLicense),
      );
      const result = response?.data;
      const matchedCandidates = getCandidates(result?.candidates);

      if (response?.isSuccess !== true || result?.matched !== true) {
        CustomMessage.error(t("forgotEmail.accountNotFound"));
        return;
      }

      if (matchedCandidates.length === 0) {
        CustomMessage.error(t("forgotEmail.accountNotFound"));
        return;
      }

      if (matchedCandidates.length === 1) {
        setCandidates(matchedCandidates);
        setSelectedAccount(matchedCandidates[0]);
        setSelectedAccountToken(matchedCandidates[0].accountToken);
        await handleSendRecoveryEmail(matchedCandidates[0].accountToken);
        return;
      }

      setCandidates(matchedCandidates);
      setStep("account-selection");
    } catch (error) {
      handleForgotEmailRequestError(error);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSelectAccount = (accountToken: string) => {
    const normalizedAccountToken = getTrimmedValue(accountToken);
    const accountExists = candidates.some(
      (account) => account.accountToken === normalizedAccountToken,
    );
    if (!accountExists) return;

    setSelectedAccountToken(normalizedAccountToken);
  };

  const handleAccountContinue = async () => {
    const account = candidates.find(
      (candidate) => candidate.accountToken === selectedAccountToken,
    );
    if (!account) {
      CustomMessage.error(t("forgotEmail.operationFailed"));
      return;
    }

    setSelectedAccount(account);
    await handleSendRecoveryEmail(account.accountToken);
  };

  const handleBackToLogin = () => {
    clearForgotEmailSession();
    history.push("/login");
  };

  const renderStep = () => {
    switch (step) {
      case "account-selection":
        return (
          <AccountSelectionStep
            accounts={candidates}
            isSubmitting={isSendingRecoveryEmail}
            onBack={() => {
              if (isSendingRecoveryEmail) return;

              resetRecoveryEmailState();
              setCandidates([]);
              setSelectedAccountToken("");
              setSelectedAccount(null);
              setStep("identity");
            }}
            onContinue={handleAccountContinue}
            onSelect={handleSelectAccount}
            selectedAccountToken={selectedAccountToken}
          />
        );
      case "account-found":
        return (
          <AccountFoundStep
            isSending={isSendingCurrentEmailOtp}
            maskedEmail={recoveryMaskedEmail}
            onBack={() => {
              resetEmailChangeState();
              resetRecoveryEmailState();
              if (candidates.length > 1) {
                setStep("account-selection");
                return;
              }

              setSelectedAccount(null);
              setSelectedAccountToken("");
              setCandidates([]);
              setStep("identity");
            }}
            onReset={handleSendCurrentEmailOtp}
            resetDisabled={currentOtpRateLimited}
          />
        );
      case "current-email-otp":
        return (
          <CurrentEmailOtpStep
            code={currentEmailOtpCode}
            deadline={currentEmailDeadline}
            isResending={isSendingCurrentEmailOtp}
            isSubmitting={isVerifyingCurrentEmailOtp}
            maskedEmail={currentEmailMaskedEmail}
            onBack={() => {
              setCurrentEmailOtpToken("");
              setCurrentEmailMaskedEmail("");
              setCurrentEmailDeadline(null);
              setCurrentEmailOtpCode(createEmptyOtpCode());
              setCurrentOtpBlockedUntil(null);
              setStep("account-found");
            }}
            onChange={setCurrentEmailOtpCode}
            onContinue={handleVerifyCurrentEmailOtp}
            onResend={handleSendCurrentEmailOtp}
            resendDisabled={currentOtpRateLimited}
          />
        );
      case "new-email":
        return (
          <NewEmailStep
            isSubmitting={isSendingNewEmailOtp}
            newEmail={newEmail}
            onBack={() => {
              resetEmailChangeState();
              setStep("account-found");
            }}
            onChange={setNewEmail}
            onContinue={handleSendNewEmailOtp}
          />
        );
      case "email-otp":
        return (
          <EmailOtpStep
            code={newEmailOtpCode}
            deadline={newEmailDeadline}
            email={newEmailMaskedEmail}
            isResending={isSendingNewEmailOtp}
            isSubmitting={isConfirmingNewEmail}
            onBack={() => {
              resetNewEmailOtpState();
              setStep("new-email");
            }}
            onChange={setNewEmailOtpCode}
            onContinue={handleConfirmNewEmail}
            onResend={() => handleSendNewEmailOtp()}
            resendDisabled={newOtpRateLimited}
          />
        );
      case "identity":
      default:
        return (
          <div className="forgot-email-step">
            <h1 className="forgot-email-title">{t("forgotEmail.title")}</h1>
            {/* <p className="forgot-email-description">{t('forgotEmail.description')}</p> */}
            <IdentityStep
              initialValues={identityValues}
              isSubmitting={
                isIdentifying ||
                isSendingRecoveryEmail ||
                isSendingCurrentEmailOtp
              }
              noMediaLicense={noMediaLicense}
              onBack={handleBackToLogin}
              onContinue={handleIdentityContinue}
              onMediaLicenseChange={setNoMediaLicense}
            />
          </div>
        );
    }
  };

  return (
    <PublicLayout className="forgot-email-layout">
      <div className="forgot-email-content">
        <div className="forgot-email-box">{renderStep()}</div>
      </div>
    </PublicLayout>
  );
}
