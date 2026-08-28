import {
  type ElementRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Form, Input, Spin } from 'antd';
import type { InputRef } from 'antd/lib/input';
import loginLogo from '@/assets/images/login-logo.png';
import payFinesIcon from '@/assets/images/login/pay-fines.svg';
import enquiriesFeedbackIcon from '@/assets/images/login/enquiries-feedback.svg';
import verifyAdvertiserPermitIcon from '@/assets/images/login/verify-advertiser-permit.svg';
import trackApplicationIcon from '@/assets/images/login/track-application.svg';
import { TIME } from '@/config/constants';
import fingerprint from '@/assets/images/fingerprint.png';
import MobileLoginLogo from '@/assets/images/mobile-login-logo.png';
import NmaLogoMobile from '@/assets/icons/NmaLogoMobile';
import { useTranslation } from 'react-i18next';
import {
  CustomMessage,
  FormErrorPrompt,
  hasForgotPasswordHint,
  isIncorrectCredentialsError,
  isVerificationCodeInlineError,
  NmaCredentialsForm,
} from '@/components/common';
import request from '@/utils/request';
import authStorage from '@/storage/authStorage';
import { useForgotPwdStore } from '@/store/forgot-pwd-store';
import {
  type LoginResponseData,
  type PendingLoginContext,
  useLoginTwoFactorStore,
} from '@/store/login-two-factor-store';
import {
  getVerificationCountdownKey,
  getVerificationCountdownRemaining,
  useVerificationCountdownStore,
} from '@/store/verification-store';
import aesEncrypt from '@/utils/aesEncrypt';
import Loading from '@/components/common/Loading';
import LangMenu from '@/components/common/LangMenu';
import Timer from '@/assets/icons/Timer';
import {
  GetGenerateCode,
  GetVerificationCode,
  type TwoFactorErrorPayload,
  type TwoFactorLockType,
} from '@/services/twoFactorAuth';
import { resolveVerificationLockState } from '@/services/verificationLock';
import './index.less';
import { useHistory, useLocation } from 'react-router-dom';
import { useDeviceType } from '@/hooks/useDeviceType';
import useMediaQuery from '@/hooks/useMediaQuery';
import { IDLE_SESSION_LOGOUT_QUERY_KEY } from '@/utils/history';
import {
  consumeUnauthorizedSessionMessage,
  resetUnauthorizedSessionHandling,
} from '@/utils/unauthorizedSession';
import {
  consumeLogoutNotice,
  resetAuthenticatedLogoutState,
} from '@/utils/authSession';
import {
  AUTH_SESSION_SYNC_ACTION,
  publishAuthSessionSync,
} from '@/utils/authSessionSync';
import SimpleBar from '@/components/SimpleBar';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { startUaePassLoginFlow } from '@/utils/uaePassLoginFlow';
import {
  createUaePassState,
  withUaePassState,
} from '@/utils/security/uaePassState';
import { useUaePassRedirectLoading } from '@/hooks/useUaePassRedirectLoading';
import { type IUser, useUserStore } from '@/store/user';
import LoginEntry from './LoginEntry';

type LoginStep = 'credentials' | 'otp';

interface LoginProps {
  authenticatedRedirectPath: string;
  onEmailLoginComplete: () => void;
}

interface OtpLockState {
  lockType?: TwoFactorLockType;
  remainingSec: number | null;
}

const OTP_LENGTH = 6;
const DEFAULT_RESEND_SECONDS = 60;
const FORGOT_PASSWORD_ATTEMPT_THRESHOLD = 3;

interface CredentialFailureState {
  email: string;
  count: number;
}

const PUBLIC_SERVICES = [
  {
    key: 'pay-fines',
    icon: payFinesIcon,
    titleKey: 'login.title1',
    descriptionKey: 'login.description1',
    actionKey: 'login.checkPay',
    path: '/pay-fines',
  },
  {
    key: 'enquiries-feedback',
    icon: enquiriesFeedbackIcon,
    titleKey: 'login.title2',
    descriptionKey: 'login.description2',
    actionKey: 'login.startService',
    path: '/inquiries',
  },
  {
    key: 'verify-advertiser-permit',
    icon: verifyAdvertiserPermitIcon,
    titleKey: 'login.title3',
    descriptionKey: 'login.description3',
    actionKey: 'login.verifyNow',
    path: '/Verifynow',
  },
  {
    key: 'track-application',
    icon: trackApplicationIcon,
    titleKey: 'login.title4',
    descriptionKey: 'login.description4',
    actionKey: 'login.trackApplication',
    path: '/track-application',
  },
] as const;

function createEmptyOtpCode() {
  return Array.from({ length: OTP_LENGTH }, () => '');
}

function trimTextFieldValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function formatTwoFactorEmail(email: string) {
  const trimmedEmail = email.trim();
  const atIndex = trimmedEmail.indexOf('@');

  if (atIndex <= 0) {
    return trimmedEmail;
  }

  return `${trimmedEmail.slice(0, Math.min(3, atIndex))}********${trimmedEmail.slice(atIndex)}`;
}

function getSearchParamCaseInsensitive(
  params: URLSearchParams,
  name: string,
): string | null {
  const target = name.toLowerCase();
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return null;
}

function getForgotEmailSuccessMessage(state: unknown) {
  if (!state || typeof state !== 'object') return '';

  const message = (state as { forgotEmailSuccessMessage?: unknown })
    .forgotEmailSuccessMessage;
  return typeof message === 'string' ? message.trim() : '';
}

function hasLoginTokenPayload(
  value: unknown,
): value is Partial<LoginResponseData> & { token: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof (value as { token?: unknown }).token === 'string' &&
    String((value as { token?: string }).token || '').trim().length > 0;
}

function resolveOtpLoginResponse(
  verifyData: unknown,
  fallbackLoginResponse: LoginResponseData,
): LoginResponseData {
  if (!hasLoginTokenPayload(verifyData)) {
    return fallbackLoginResponse;
  }

  const verifyTokenExpireMinutes = Number(verifyData.tokenExpireMinutes);
  const fallbackTokenExpireMinutes = Number(
    fallbackLoginResponse.tokenExpireMinutes,
  );

  return {
    ...fallbackLoginResponse,
    ...verifyData,
    token: String(verifyData.token || '').trim(),
    tokenExpireMinutes:
      Number.isFinite(verifyTokenExpireMinutes) &&
      verifyTokenExpireMinutes > 0
        ? verifyTokenExpireMinutes
        : fallbackTokenExpireMinutes,
  };
}

function Login({
  authenticatedRedirectPath,
  onEmailLoginComplete,
}: LoginProps) {
  const [loading, setLoading] = useUaePassRedirectLoading();
  const [loginLoading, setLoginLoading] = useState(false);
  const [showResetPasswordSuccess, setShowResetPasswordSuccess] = useState(false);
  const [, update] = useState({});
  const { i18n, t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');
  const [form] = Form.useForm();
  const reset = useForgotPwdStore((state: any) => state.reset);
  const setUserData = useUserStore((state) => state.setData);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const history = useHistory();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotPasswordHintReported, setForgotPasswordHintReported] =
    useState(false);
  const [credentialFailureState, setCredentialFailureState] =
    useState<CredentialFailureState>({ email: '', count: 0 });
  const [otpCodeError, setOtpCodeError] = useState('');
  const [otpGeneralError, setOtpGeneralError] = useState('');

  const setOtpError = (message: string) => {
    const text = message.trim();
    if (!text) {
      setOtpCodeError('');
      setOtpGeneralError('');
      return;
    }
    if (isVerificationCodeInlineError(text)) {
      setOtpCodeError(text);
      setOtpGeneralError('');
      return;
    }
    setOtpCodeError('');
    setOtpGeneralError(text);
  };

  const clearOtpErrors = () => {
    setOtpCodeError('');
    setOtpGeneralError('');
  };
  const [otpCode, setOtpCode] = useState<string[]>(createEmptyOtpCode());
  const [otpFocusedIndex, setOtpFocusedIndex] = useState<number | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const pendingLoginContext = useLoginTwoFactorStore(
    (state) => state.pendingLoginContext,
  );
  const loginTwoFactorSessionExpireAt = useLoginTwoFactorStore(
    (state) => state.sessionExpireAt,
  );
  const persistedOtpLockState = useLoginTwoFactorStore(
    (state) => state.lockState,
  );
  const startLoginTwoFactorSession = useLoginTwoFactorStore(
    (state) => state.startSession,
  );
  const clearLoginTwoFactorSession = useLoginTwoFactorStore(
    (state) => state.clearSession,
  );
  const setPersistedOtpLockState = useLoginTwoFactorStore(
    (state) => state.setLockState,
  );
  const startCountdown = useVerificationCountdownStore(
    (state) => state.startCountdown,
  );
  const clearCountdown = useVerificationCountdownStore(
    (state) => state.clearCountdown,
  );
  const otpInputRefs = useRef<Array<InputRef | null>>([]);
  const deviceType = useDeviceType();
  const isMax376 = useMediaQuery('(max-width: 376px)');
  const isSingleColumn = useMediaQuery('(max-width: 1023px)');
  const isSmallLogo = isSingleColumn;
  const [requiresGlobalScroll, setRequiresGlobalScroll] = useState(false);
  const loginViewportRef = useRef<HTMLDivElement>(null);
  const loginPanelHeightProbeRef = useRef<HTMLSpanElement>(null);
  const loginPanelRef = useRef<HTMLElement>(null);
  const loginPanelContentRef = useRef<HTMLDivElement>(null);
  const publicServicesBarRef = useRef<ElementRef<typeof SimpleBar>>(null);
  const isRtl = i18n.dir(currentLang) === 'rtl';
  const resetPasswordSuccessMessage = t('pwdResetSuccess.description');
  const isMountedRef = useRef(true);
  const [, forceOtpStateRefresh] = useState(0);
  const loginStep: LoginStep = pendingLoginContext ? 'otp' : 'credentials';
  const loginOtpCountdownKey = getVerificationCountdownKey(
    'login-two-factor',
    pendingLoginContext?.email,
  );
  const resendDeadline = useVerificationCountdownStore(
    (state) => state.resendDeadlines[loginOtpCountdownKey] ?? null,
  );
  const resendCountdown = getVerificationCountdownRemaining(resendDeadline);
  const twoFactorEmailDisplay = useMemo(
    () => formatTwoFactorEmail(pendingLoginContext?.email || ''),
    [pendingLoginContext?.email],
  );
  const otpLockState = useMemo<OtpLockState | null>(() => {
    if (!persistedOtpLockState) {
      return null;
    }

    return {
      lockType: persistedOtpLockState.lockType,
      remainingSec:
        persistedOtpLockState.lockUntil !== null
          ? Math.max(
              0,
              Math.ceil((persistedOtpLockState.lockUntil - Date.now()) / 1000),
            )
          : null,
    };
  }, [persistedOtpLockState]);

  const otpValue = otpCode.join('');
  const isOtpLocked = Boolean(otpLockState);
  const canSubmitOtp =
    otpValue.length === OTP_LENGTH && !otpSubmitting && !isOtpLocked;
  const canResendOtp =
    resendCountdown <= 0 &&
    !resendLoading &&
    !resendDisabled &&
    !isOtpLocked &&
    !otpSubmitting;

  useEffect(() => {
    const hasActiveLockTimer =
      Boolean(otpLockState) &&
      otpLockState?.remainingSec !== null &&
      (otpLockState?.remainingSec ?? 0) > 0;
    if (resendCountdown <= 0 && !hasActiveLockTimer) {
      return;
    }
    const timer = window.setTimeout(() => {
      forceOtpStateRefresh((value) => value + 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpLockState, resendCountdown]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const logoutNotice = consumeLogoutNotice();
    if (logoutNotice) {
      CustomMessage.error(logoutNotice, 0);
    }

    const unauthorizedMessage = consumeUnauthorizedSessionMessage();
    resetUnauthorizedSessionHandling();
    if (unauthorizedMessage) {
      CustomMessage.error(unauthorizedMessage, 0);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idleLogout = getSearchParamCaseInsensitive(
      params,
      IDLE_SESSION_LOGOUT_QUERY_KEY,
    );
    if (idleLogout !== '1') {
      return;
    }
    CustomMessage.error(t('login.idleSessionLogout'), 0);
    const next = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase() !== IDLE_SESSION_LOGOUT_QUERY_KEY.toLowerCase()) {
        next.append(key, value);
      }
    }
    const search = next.toString();
    history.replace({
      pathname: '/login',
      search: search ? `?${search}` : '',
    });
  }, [history, t]);

  useEffect(() => {
    const successMessage = getForgotEmailSuccessMessage(location.state);
    if (!successMessage) {
      return;
    }

    CustomMessage.success(successMessage);
    const state = location.state as Record<string, unknown>;
    const nextState = { ...state };
    delete nextState.forgotEmailSuccessMessage;

    history.replace({
      hash: location.hash,
      pathname: location.pathname,
      search: location.search,
      state: Object.keys(nextState).length > 0 ? nextState : undefined,
    });
  }, [history, location.hash, location.pathname, location.search, location.state]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailUpdatedSuccess = getSearchParamCaseInsensitive(
      params,
      'emailUpdatedSuccess',
    );

    if (emailUpdatedSuccess !== '1') {
      return;
    }

    CustomMessage.success(t('forgotEmail.emailUpdatedSuccess'));

    const next = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase() !== 'emailupdatedsuccess') {
        next.append(key, value);
      }
    }

    const search = next.toString();
    history.replace({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
    });
  }, [history, location.pathname, location.search, t]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resetPasswordSuccess = getSearchParamCaseInsensitive(
      params,
      'passwordResetSuccess',
    );

    if (resetPasswordSuccess !== '1') {
      return;
    }

    setShowResetPasswordSuccess(true);

    const next = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase() !== 'passwordresetsuccess') {
        next.append(key, value);
      }
    }

    const search = next.toString();
    history.replace({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
    });
  }, [history, location.pathname, location.search]);

  useEffect(() => {
    if (!showResetPasswordSuccess) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowResetPasswordSuccess(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [showResetPasswordSuccess]);

  useEffect(() => {
    if (!persistedOtpLockState || persistedOtpLockState.lockUntil === null) {
      return;
    }

    if (persistedOtpLockState.lockUntil <= Date.now()) {
      setPersistedOtpLockState(null);
    }
  }, [persistedOtpLockState, setPersistedOtpLockState]);

  useEffect(() => {
    if (!loginTwoFactorSessionExpireAt) {
      return;
    }

    const remainingMs = loginTwoFactorSessionExpireAt - Date.now();
    if (remainingMs <= 0) {
      if (pendingLoginContext?.email) {
        clearCountdown(
          getVerificationCountdownKey('login-two-factor', pendingLoginContext.email),
        );
      }
      clearLoginTwoFactorSession();
      return;
    }

    const timer = window.setTimeout(() => {
      if (pendingLoginContext?.email) {
        clearCountdown(
          getVerificationCountdownKey('login-two-factor', pendingLoginContext.email),
        );
      }
      clearLoginTwoFactorSession();
      forceOtpStateRefresh((value) => value + 1);
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [
    clearCountdown,
    clearLoginTwoFactorSession,
    loginTwoFactorSessionExpireAt,
    pendingLoginContext,
  ]);

  const handleLanguageChange = (lng: string) => {
    setCurrentLang(lng);
  };

  const applyLockState = (payload?: {
    locked?: boolean;
    lockType?: TwoFactorLockType;
    lockUntil?: number | null;
    message?: string;
  }) => {
    const lockState = payload ? resolveVerificationLockState(payload) : null;
    if (!lockState) {
      setPersistedOtpLockState(null);
      return;
    }

    setPersistedOtpLockState({
      lockType: lockState.lockType,
      lockUntil: lockState.lockUntil,
    });
  };

  const getLockMessage = () => {
    if (!otpLockState) return '';

    if (otpLockState.remainingSec === null) {
      if (otpLockState.lockType === 'resend') {
        return t('login.twoFactor.resendLocked');
      }

      return t('login.twoFactor.verifyLocked');
    }

    const minutes = Math.max(1, Math.ceil(otpLockState.remainingSec / 60));

    if (otpLockState.lockType === 'resend') {
      return t('login.twoFactor.resendLockedWithMinutes', { minutes });
    }

    return t('login.twoFactor.verifyLockedWithMinutes', { minutes });
  };

  const resetOtpState = () => {
    setOtpCode(createEmptyOtpCode());
    clearOtpErrors();
    setOtpFocusedIndex(null);
    setOtpSubmitting(false);
    setResendLoading(false);
    setResendDisabled(false);
  };

  const completeLogin = async (loginResponse: LoginResponseData) => {
    const token = String(loginResponse.token || '').trim();
    const tokenExpireMinutes = Number(loginResponse.tokenExpireMinutes);

    if (!token) {
      throw new Error(t('common.operationFailed'));
    }

    if (!Number.isFinite(tokenExpireMinutes) || tokenExpireMinutes <= 0) {
      throw new Error(t('common.operationFailed'));
    }

    const expiresIn = tokenExpireMinutes * 60 * 1000;

    onEmailLoginComplete();
    resetUnauthorizedSessionHandling();
    authStorage.clearUaePassSession();
    resetAuthenticatedLogoutState();

    authStorage.setTokenInfo({
      token,
      refreshToken: '',
      expiresIn: TIME.REFRESH_TOKEN_EXPIRE,
      remember: true,
    });
    setUserData(loginResponse as unknown as IUser);
    publishAuthSessionSync(AUTH_SESSION_SYNC_ACTION.LOGIN);
    CustomMessage.success(t('login.twoFactor.loginSuccess'));

    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from) {
      const cookieValue = JSON.stringify({
        token,
        expiresIn,
      });
      document.cookie = `auth_token=${encodeURIComponent(
        cookieValue,
      )}; path=/; max-age=7200`;
      window.location.href = 'http://192.168.2.131:5175/usleadership';
      return;
    }

    history.push(authenticatedRedirectPath);
  };

  const handleBackToCredentials = () => {
    if (pendingLoginContext?.email) {
      clearCountdown(
        getVerificationCountdownKey('login-two-factor', pendingLoginContext.email),
      );
    }
    clearLoginTwoFactorSession();
    resetOtpState();
  };

  const handleVerifyOtp = async () => {
    if (!pendingLoginContext) return;
    if (otpSubmitting || isOtpLocked) return;
    if (otpValue.length !== OTP_LENGTH) return;

    try {
      setOtpSubmitting(true);
      clearOtpErrors();

      const verifyResponse = await GetVerificationCode(
        pendingLoginContext.token,
        pendingLoginContext.email,
        {
          Code: otpValue,
          loginType: deviceType as number,
        },
        3,
      );

      if (verifyResponse.passed) {
        const resolvedLoginResponse = resolveOtpLoginResponse(
          verifyResponse.data,
          pendingLoginContext.loginResponse,
        );
        clearCountdown(
          getVerificationCountdownKey('login-two-factor', pendingLoginContext.email),
        );
        clearLoginTwoFactorSession();
        resetOtpState();
        await completeLogin(resolvedLoginResponse);
        return;
      }

      applyLockState(verifyResponse);

      const errorPayload: TwoFactorErrorPayload | undefined = verifyResponse.error;
      if (verifyResponse.locked) {
        setOtpCode(createEmptyOtpCode());
        setOtpFocusedIndex(null);
        clearOtpErrors();
      } else {
        console.error('OTP verification was rejected:', {
          error: errorPayload,
          message: verifyResponse.message,
        });
        setOtpError(t('login.twoFactor.invalidOtp'));
      }
    } catch (error: unknown) {
      console.error('OTP verification failed:', error);
      setOtpError(t('login.twoFactor.verificationFailed'));
    } finally {
      if (isMountedRef.current) {
        setOtpSubmitting(false);
      }
    }
  };

  const handleResendOtp = async () => {
    if (!pendingLoginContext) return;
    if (!canResendOtp) return;

    try {
      setResendLoading(true);
      const resendResponse = await GetGenerateCode(pendingLoginContext.token,pendingLoginContext.email,3);

      if (resendResponse.locked) {
        applyLockState(resendResponse);
        setOtpCode(createEmptyOtpCode());
        setOtpFocusedIndex(null);
        clearOtpErrors();
        clearCountdown(
          getVerificationCountdownKey('login-two-factor', pendingLoginContext.email),
        );
        return;
      }

      clearOtpErrors();
      setOtpCode(createEmptyOtpCode());
      startCountdown(
        getVerificationCountdownKey('login-two-factor', pendingLoginContext.email),
        resendResponse.cooldownSec || DEFAULT_RESEND_SECONDS,
      );
      otpInputRefs.current[0]?.focus();
    } catch (error: unknown) {
      console.error('OTP resend failed:', error);
      setOtpError(t('login.twoFactor.resendFailed'));
      setResendDisabled(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpInputChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    clearOtpErrors();
    setOtpCode((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData('text');
    const numbers = pastedData.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');

    if (!numbers.length) return;

    clearOtpErrors();
    setOtpCode((prev) => {
      const next = [...prev];
      numbers.forEach((num, idx) => {
        next[idx] = num;
      });
      return next;
    });

    const focusIndex = Math.min(numbers.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleLogin = async () => {
    const email = String(form.getFieldValue('loginProvider') ?? '').trim();
    const pwd = String(form.getFieldValue('providerKey') ?? '').trim();
    if (!email || !pwd) return;
    if (loginLoading) return;
    CustomMessage.destroy();

    let fieldsValue: { loginProvider?: string; providerKey?: string };
    try {
      fieldsValue = await form.validateFields();
    } catch {
      return;
    }

    let loginResponse: LoginResponseData | null = null;
    const normalizedEmail = String(fieldsValue.loginProvider || '')
      .trim()
      .toLowerCase();

    try {
      setLoginLoading(true);
      setPasswordInvalid(false);
      setErrorMsg('');
      setForgotPasswordHintReported(false);
      if (pendingLoginContext?.email) {
        clearCountdown(
          getVerificationCountdownKey('login-two-factor', pendingLoginContext.email),
        );
      }
      clearLoginTwoFactorSession();
      resetOtpState();

      const providerKey = aesEncrypt(fieldsValue.providerKey ?? '');

      const loginData = await request.post<LoginResponseData>('/api/User/Login', {
        ...fieldsValue,
        loginProvider: normalizedEmail,
        providerKey,
        loginType: deviceType,
      });

      loginResponse = loginData.data;

    } catch (e: unknown) {
      setLoginLoading(false);
      const loginError =
        e && typeof e === 'object'
          ? (e as Error & {
              networkErrorType?: string;
              statusCode?: number;
              response?: {
                data?: { message?: unknown; statusCode?: number };
              };
            })
          : null;
      const statusCode =
        loginError?.statusCode ?? loginError?.response?.data?.statusCode;
      const hasHttpBackendMessage =
        typeof loginError?.response?.data?.message === 'string' &&
        loginError.response.data.message.trim().length > 0;
      const hasWrappedBusinessError =
        !loginError?.response && typeof loginError?.statusCode === 'number';
      const backendMessage =
        (hasHttpBackendMessage || hasWrappedBusinessError) &&
        typeof loginError?.message === 'string'
          ? loginError.message.trim()
          : '';
      const isIncorrectCredentials = isIncorrectCredentialsError(backendMessage);
      setForgotPasswordHintReported(hasForgotPasswordHint(backendMessage));
      if (isIncorrectCredentials) {
        setErrorMsg(t('login.emailOrPasswordIncorrect'));
      } else {
        setErrorMsg('');
        if (!loginError?.networkErrorType) {
          CustomMessage.error(backendMessage || t('common.operationFailed'));
        }
      }
      console.error('Login request failed:', e);
      if (isIncorrectCredentials) {
        setCredentialFailureState((current) => ({
          email: normalizedEmail,
          count:
            current.email === normalizedEmail
              ? current.count + 1
              : 1,
        }));
      } else {
        setCredentialFailureState({ email: '', count: 0 });
      }
      if (statusCode === 500) {
        setPasswordInvalid(true);
      }
      return;
    }

    if (!loginResponse) {
      setLoginLoading(false);
      return;
    }

    const requireTwoFactor = Boolean(loginResponse.twoFactorEnabled);

    if (!requireTwoFactor) {
      setLoginLoading(false);
      await completeLogin(loginResponse);
      return;
    }

    const nextPendingLoginContext: PendingLoginContext = {
      email: normalizedEmail,
      token: loginResponse.token,
      loginResponse,
    };
    startLoginTwoFactorSession(nextPendingLoginContext);
    applyLockState();

    try {
      const resendResponse = await GetGenerateCode(loginResponse.token,normalizedEmail,3);

      if (resendResponse.locked) {
        applyLockState(resendResponse);
        clearCountdown(
          getVerificationCountdownKey('login-two-factor', normalizedEmail),
        );
        return;
      }

      startCountdown(
        getVerificationCountdownKey('login-two-factor', normalizedEmail),
        resendResponse.cooldownSec || DEFAULT_RESEND_SECONDS,
      );
    } catch (error: unknown) {
      console.error('Initial OTP delivery failed:', error);
      setOtpError(t('login.twoFactor.resendFailed'));
      setResendDisabled(true);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUAEPassLogin = () => {
    CustomMessage.destroy();
    if (loading) return;
    setLoading(true);

    const uaepassUrl = String(import.meta.env.VITE_UAE_PASS_URL ?? '').trim();
    if (!uaepassUrl) {
      setLoading(false);
      CustomMessage.error(t('common.operationFailed'));
      return;
    }

    const state = createUaePassState();
    const redirectUrl = withUaePassState(uaepassUrl, state);
    const flow = startUaePassLoginFlow(authenticatedRedirectPath, state);
    if (!redirectUrl || !flow) {
      setLoading(false);
      CustomMessage.error(t('common.operationFailed'));
      return;
    }

    window.location.assign(redirectUrl);
  };

  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      if (loginStep === 'credentials') {
        handleLogin();
        return;
      }

      handleVerifyOtp();
    };

    window.addEventListener('keydown', handleEnter);
    return () => {
      window.removeEventListener('keydown', handleEnter);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loginStep,
    loginLoading,
    otpSubmitting,
    otpCode,
    isOtpLocked,
    pendingLoginContext,
    resendCountdown,
  ]);

  useEffect(() => {
    localStorage.setItem('loginAs', 'no');
  }, []);

  useLayoutEffect(() => {
    if (isSingleColumn) {
      setRequiresGlobalScroll(false);
      return;
    }

    const viewport = loginViewportRef.current;
    const panelHeightProbe = loginPanelHeightProbeRef.current;
    const panel = loginPanelRef.current;
    const intrinsicContent = loginPanelContentRef.current;
    const header = viewport?.parentElement?.querySelector(
      '.login-page__header',
    );
    if (
      !viewport ||
      !panelHeightProbe ||
      !panel ||
      !intrinsicContent ||
      !(header instanceof HTMLElement)
    ) {
      return;
    }

    let animationFrame = 0;

    const measure = () => {
      const panelStyles = window.getComputedStyle(panel);
      const headerHeight = header.getBoundingClientRect().height;
      const designPanelHeight =
        panelHeightProbe.getBoundingClientRect().height;
      const panelPadding =
        Number.parseFloat(panelStyles.paddingTop) +
        Number.parseFloat(panelStyles.paddingBottom);
      const availablePanelHeight = Math.min(
        designPanelHeight,
        Math.max(0, window.innerHeight - headerHeight),
      );
      const requiredPanelHeight =
        intrinsicContent.getBoundingClientRect().height + panelPadding;
      const nextRequiresGlobalScroll =
        requiredPanelHeight > availablePanelHeight + 1;

      setRequiresGlobalScroll((current) =>
        current === nextRequiresGlobalScroll
          ? current
          : nextRequiresGlobalScroll,
      );
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('resize', scheduleMeasure);

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleMeasure);
    resizeObserver?.observe(intrinsicContent);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [isSingleColumn, loginStep]);

  useLayoutEffect(() => {
    if (isSingleColumn) {
      return undefined;
    }

    let animationFrame = 0;
    const recalculate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        publicServicesBarRef.current?.recalculate();
      });
    };

    recalculate();
    window.addEventListener('resize', recalculate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', recalculate);
    };
  }, [currentLang, isSingleColumn, loginStep, requiresGlobalScroll]);

  const showForgotPasswordInError =
    forgotPasswordHintReported ||
    credentialFailureState.count >= FORGOT_PASSWORD_ATTEMPT_THRESHOLD;
  const handleForgotPassword = () => {
    reset();
    history.push('/forgot-password');
  };

  const useGlobalPageScroll = isSingleColumn || requiresGlobalScroll;
  const publicServicesGrid = (
    <div className="login-public-services__grid">
      {PUBLIC_SERVICES.map((service) => (
        <article
          className="login-public-service-card"
          key={service.key}
        >
          <div className="login-public-service-card__content">
            <img
              className="login-public-service-card__icon"
              src={service.icon}
              alt=""
              draggable={false}
            />
            <div className="login-public-service-card__copy">
              <OverflowTooltip
                as="h2"
                className="login-public-service-card__title"
                focusableWhenOverflowing
                overlayClassName="login-public-service-card__tooltip"
                title={t(service.titleKey)}
                trigger={['hover', 'focus']}
              >
                {t(service.titleKey)}
              </OverflowTooltip>
              <OverflowTooltip
                as="p"
                className="login-public-service-card__description"
                focusableWhenOverflowing
                overlayClassName="login-public-service-card__tooltip"
                title={t(service.descriptionKey)}
                trigger={['hover', 'focus']}
              >
                {t(service.descriptionKey)}
              </OverflowTooltip>
              {service.key !== 'track-application' ? (
                <span className="login-public-service-card__tag">
                  {t('login.publicService')}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="login-public-service-card__action"
            onClick={() => history.push(service.path)}
          >
            <span className="login-public-service-card__action-text">
              {t(service.actionKey)}
            </span>
          </button>
        </article>
      ))}
    </div>
  );

  return (
    <SimpleBar
      autoHide={false}
      className={`login-page ${
        useGlobalPageScroll
          ? 'login-page--global-scroll'
          : 'login-page--panel-scroll'
      }`}
      data-simplebar-direction={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="login-page__layout">
      <header className="login-page__header">
        {!isMax376 && !isSmallLogo && (
          <div className="login-page__logo">
            <img
              src={loginLogo}
              alt={t("header.aria.logo")}
              draggable={false}
            />
          </div>
        )}
        {!isMax376 && isSmallLogo && (
          <div className="login-page__logo login-page__logo--compact">
            <NmaLogoMobile />
          </div>
        )}
        {isMax376 && (
          <div className="login-page__logo login-page__logo--mobile">
            <img
              src={MobileLoginLogo}
              alt={t("header.aria.logo")}
              draggable={false}
            />
          </div>
        )}
        <LangMenu lang={currentLang} onChange={handleLanguageChange} />
      </header>
      {showResetPasswordSuccess ? (
        <div
          className={`login-page__success-alert-wrap ${isRtl ? 'rtl' : 'ltr'}`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <Alert
            type="success"
            showIcon
            message={resetPasswordSuccessMessage}
            className="login-page__success-alert"
          />
        </div>
      ) : null}
      <div className="login-page__viewport" ref={loginViewportRef}>
        <span
          ref={loginPanelHeightProbeRef}
          className="login-page__panel-height-probe"
          aria-hidden="true"
        />
        <main className="login-page__content">
        <section className="login-public-services">
          <div className="login-public-services__header">
            <h1 className="login-public-services__title">
              {t('login.publicServices')}
            </h1>
            <p className="login-public-services__description">
              {t('login.desc')}
            </p>
          </div>
          {isSingleColumn ? (
            <div className="login-public-services__body">
              {publicServicesGrid}
            </div>
          ) : (
            <SimpleBar
              autoHide
              className="login-public-services__body"
              data-simplebar-direction={isRtl ? 'rtl' : 'ltr'}
              ref={publicServicesBarRef}
            >
              {publicServicesGrid}
            </SimpleBar>
          )}
        </section>

        <section className="login-panel" ref={loginPanelRef}>
          <div className="login-panel__content" ref={loginPanelContentRef}>
          {loginStep === 'credentials' ? (
            <>
              <h1 className="login-panel__title">{t('login.login')}</h1>
              <p className="login-panel__description">{t('login.loginDesc')}</p>
              <div className="login-panel__scroll">
                <div className="login-panel__form">
                  <button
                    type="button"
                    className="login-panel__uae-pass"
                    onClick={handleUAEPassLogin}
                  >
                    <Spin spinning={loading}>
                      <span className="login-panel__uae-pass-content">
                        <img
                          className="login-panel__uae-pass-icon"
                          src={fingerprint}
                          alt=""
                          draggable={false}
                        />
                        <span className="login-panel__uae-pass-text">
                          {t('login.uaePass')}
                        </span>
                      </span>
                    </Spin>
                  </button>
                  <div className="login-panel__divider">
                    <span className="login-panel__divider-text">
                      {t('login.or')}
                    </span>
                  </div>
                  <NmaCredentialsForm
                    form={form}
                    emailNormalize={trimTextFieldValue}
                    onValuesChange={() => {
                      const currentEmail = String(
                        form.getFieldValue('loginProvider') ?? '',
                      )
                        .trim()
                        .toLowerCase();
                      setCredentialFailureState((current) =>
                        current.email && current.email !== currentEmail
                          ? { email: '', count: 0 }
                          : current,
                      );
                      update({});
                      setPasswordInvalid(false);
                      setErrorMsg('');
                      setForgotPasswordHintReported(false);
                    }}
                    emailLabel={t('login.email')}
                    passwordLabel={t('login.password')}
                    emailPlaceholder={t('formPlaceholders.components.nmaCredentialsForm.email')}
                    passwordPlaceholder={t('formPlaceholders.components.nmaCredentialsForm.password')}
                    emailRequiredMessage={t('common.required')}
                    emailPatternMessage={t('login.invalidEmail')}
                    passwordRequiredMessage={t('common.required')}
                    passwordInvalid={passwordInvalid}
                    passwordInvalidMessage={t('login.passwordInvalid')}
                    onSubmit={handleLogin}
                    submitText={t('login.login')}
                    submitLoading={loginLoading}
                    forgotEmailText={t('login.forgotEmail')}
                    onForgotEmail={() => {
                      reset();
                      history.push('/forgot-email');
                    }}
                    forgotPasswordText={t('login.forgotPassword')}
                    onForgotPassword={handleForgotPassword}
                    showSignUp
                    createAccountPrompt={t('login.createAccount')}
                    signUpText={t('login.signUp')}
                    onSignUp={() => history.push('/signup', { from: 'login' })}
                    errorHeader={
                      <FormErrorPrompt
                        message={errorMsg}
                        action={
                          showForgotPasswordInError ? (
                            <a
                              className="form-error-prompt__link"
                              href="/forgot-password"
                              onClick={(event) => {
                                event.preventDefault();
                                handleForgotPassword();
                              }}
                            >
                              {t('login.forgotPassword')}
                            </a>
                          ) : undefined
                        }
                        onActionClick={
                          showForgotPasswordInError
                            ? handleForgotPassword
                            : undefined
                        }
                      />
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="login-otp">
              <h1 className="login-panel__title">{t('login.twoFactor.title')}</h1>
              <p className="login-panel__description login-panel__description--otp">
                {t('login.twoFactor.desc', { email: twoFactorEmailDisplay })}
              </p>

              <div className="login-otp__main">
                <div className="login-otp__content">
                  <div className="login-otp__code-title">
                    {t('login.twoFactor.codeLabel')}
                  </div>
                  <div className="login-otp__input-group">
                    {otpCode.map((value, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        value={value}
                        maxLength={1}
                        inputMode="numeric"
                        className={`login-otp__input ${otpCodeError ? 'login-otp__input--error' : ''
                          } ${otpFocusedIndex === index ? 'login-otp__input--active' : ''}`}
                        onFocus={() => setOtpFocusedIndex(index)}
                        onBlur={() => setOtpFocusedIndex(null)}
                        onChange={(e) => handleOtpInputChange(e.target.value, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        onPaste={handleOtpPaste}
                        disabled={otpSubmitting}
                      />
                    ))}
                  </div>

                  {otpCodeError ? (
                    <div className="login-otp__inline-error" role="alert">
                      {otpCodeError}
                    </div>
                  ) : null}

                  <div className="login-otp__resend">
                    <span className="login-otp__resend-tip">
                      {t('login.twoFactor.notReceived')}
                    </span>
                    <div className="login-otp__resend-action">
                      {resendCountdown > 0 ? (
                        <span className="login-otp__timer">
                          <Timer />
                          {resendCountdown}s
                        </span>
                      ) : null}
                      <span
                        className={`login-otp__resend-text ${
                          canResendOtp
                            ? 'login-otp__resend-text--active'
                            : 'login-otp__resend-text--disabled'
                        }`}
                        onClick={handleResendOtp}
                      >
                        <Loading loading={resendLoading}>
                          {t('login.twoFactor.resend')}
                        </Loading>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="login-otp__actions">
                <div className="login-otp__footer">
                  <button
                    type="button"
                    className="login-otp__back"
                    onClick={handleBackToCredentials}
                  >
                    {t('login.twoFactor.back')}
                  </button>
                  <button
                    type="button"
                    className={`login-otp__submit ${
                      canSubmitOtp ? '' : 'login-otp__submit--disabled'
                    }`}
                    onClick={handleVerifyOtp}
                    disabled={!canSubmitOtp}
                  >
                    <Loading loading={otpSubmitting}>{t('login.twoFactor.loginBtn')}</Loading>
                  </button>
                </div>
                <FormErrorPrompt
                  message={isOtpLocked ? getLockMessage() : otpGeneralError}
                  className="form-error-prompt--after-footer"
                />
              </div>
            </div>
          )}
          </div>
        </section>
        </main>
      </div>
      </div>
    </SimpleBar>
  );
}

export default function LoginPage() {
  return (
    <LoginEntry>
      {(authenticatedRedirectPath, discardUaePassLoginFlow) => (
        <Login
          authenticatedRedirectPath={authenticatedRedirectPath}
          onEmailLoginComplete={discardUaePassLoginFlow}
        />
      )}
    </LoginEntry>
  );
}
