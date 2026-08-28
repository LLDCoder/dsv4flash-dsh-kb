import {  useRef, useState, useEffect } from 'react';
import { Input } from 'antd';
import type { InputRef } from 'antd/lib/input'
import { useTranslation } from 'react-i18next';
import Timer from '@/assets/icons/Timer';
import { history } from '@/utils/history';
import { useLocation } from 'react-router-dom';
import request from '@/utils/request';
import { postEmail, postVerificationCode, isUserVerificationCodeAccepted } from '@/services/user';
import { resolveVerificationLockState } from '@/services/verificationLock';
import { useForgotPwdStore } from '@/store/forgot-pwd-store';
import {
    getSignupFullName,
    normalizeSignUpPhoneNumber,
    type SignUpPhoneNumberValue,
    useSignupStore,
} from '@/store/signup-store';
import {
    getVerificationCountdownKey,
    getVerificationCountdownRemaining,
    VERIFICATION_RESEND_SECONDS,
    useVerificationCountdownStore,
} from '@/store/verification-store';
import aesEncrypt from '@/utils/aesEncrypt';
import Loading from '@/components/common/Loading';
import FormErrorPrompt, {
    isVerificationCodeInlineError,
} from '@/components/common/FormErrorPrompt';
import PublicLayout from '@/components/common/PublicLayout';

import './index.less';

interface VerificationLockState {
    remainingSec: number | null;
}

interface RegisterFormValues {
    firstName: string;
    lastName: string;
    phoneNumber: SignUpPhoneNumberValue;
    email: string;
    passwordHash: string;
}

interface RegisterRequest {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    phoneCountryCode: string;
    phoneLocalNumber: string;
    email: string;
    passwordHash: string;
}

const toApi = (values: RegisterFormValues): RegisterRequest => {
    const { phoneNumber, ...rest } = values;
    const phoneCountryCode = String(phoneNumber.phoneCountryCode ?? '').trim();
    const phoneLocalNumber = String(phoneNumber.phoneLocalNumber ?? '').trim();
    const hasPhoneNumber = phoneLocalNumber.length > 0;

    return {
        ...rest,
        phoneNumber: hasPhoneNumber ? `${phoneCountryCode}${phoneLocalNumber}` : '',
        phoneCountryCode: hasPhoneNumber ? phoneCountryCode : '',
        phoneLocalNumber: hasPhoneNumber ? phoneLocalNumber : '',
    };
};

export default function Verification() { 
    const { i18n, t } = useTranslation();
    const isRtl = i18n.language.startsWith('ar');
    const [codeYzm, setCodeYzm] = useState(['','','','','','']);
    const inputsRef = useRef<Array<InputRef | null>>([]);
    const location = useLocation();
    const url = new URLSearchParams(location.search);
    const [loading, setLoading] = useState(false);
    const email = useForgotPwdStore((state: any) => state.email);
    const reset = useSignupStore((state: any)=>state.reset);
    const [sendLoading, setSendLoading] = useState(false);
    const [resendDisabled, setResendDisabled] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [lockState, setLockState] = useState<VerificationLockState | null>(null);

    const setVerificationError = (message: string) => {
        const text = message.trim();
        if (!text) {
            setCodeError('');
            setGeneralError('');
            return;
        }
        if (isVerificationCodeInlineError(text)) {
            setCodeError(text);
            setGeneralError('');
            return;
        }
        setCodeError('');
        setGeneralError(text);
    };

    const clearVerificationErrors = () => {
        setCodeError('');
        setGeneralError('');
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
        if (!lockState) return '';
        if (lockState.remainingSec !== null) {
            const minutes = Math.max(1, Math.ceil(lockState.remainingSec / 60));
            return t('login.twoFactor.verifyLockedWithMinutes', { minutes });
        }
        return t('login.twoFactor.verifyLocked');
    };
    const formData = useSignupStore((state:any)=>{
        return {
            firstName: state.firstName,
            lastName: state.lastName,
            phoneNumber: normalizeSignUpPhoneNumber(state.phoneNumber),
            email: state.email,
            password: state.password,
            confirmPassword: state.confirmPassword,
        }
    });
    const isSignupFlow = url.get('from') === 'signup';
    const signupFullName = getSignupFullName(formData.firstName, formData.lastName);
    const currentEmail: string = isSignupFlow ? formData.email : email;
    const verificationType = url.get('from') === 'forgot-password' ? 3 : 1;
    const verificationCountdownKey = getVerificationCountdownKey(
        url.get('from'),
        currentEmail,
    );
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

    function handleInputChange(value: string, index: number){
        if (!/^\d?$/.test(value)) return;

        const nextCode = [...codeYzm];
        nextCode[index] = value;
        setCodeYzm(nextCode);
        clearVerificationErrors();

         if (value && index < codeYzm.length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !codeYzm[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
				
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const numbers = pastedData.replace(/\D/g, '').split('').slice(0, codeYzm.length);
        
        const newCode = [...codeYzm];
        numbers.forEach((num: string, index: number) => {
            newCode[index] = num;
        });
        setCodeYzm(newCode);
        clearVerificationErrors();
        const lastFilledIndex = numbers.length - 1;
        if (lastFilledIndex < codeYzm.length - 1) {
            inputsRef.current[numbers.length]?.focus();
                
        }
    }

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
        if (!lockState || lockState.remainingSec === null || lockState.remainingSec <= 0) {
            return;
        }

        const timer = setTimeout(() => {
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

        return () => clearTimeout(timer);
    }, [lockState]);

    const isLocked = Boolean(lockState);

    async function verifyCodeAndContinue(
        targetEmail: string,
        onSuccess: () => void | Promise<void>,
    ) {
        try {
            setLoading(true);
            clearVerificationErrors();
            const verifyResult = await postVerificationCode(
                targetEmail,
                codeYzm.join(''),
                verificationType,
            );
            if (!isUserVerificationCodeAccepted(verifyResult)) {
                const hasLockState = applyLockState(verifyResult);
                if (hasLockState) {
                    setCodeYzm(['','','','','','']);
                    clearVerificationErrors();
                    return;
                }
                console.error('Verification code was rejected:', verifyResult);
                setVerificationError(t('passwordVerification.invalidCode'));
                return;
            }
            await onSuccess();
            clearCountdown(verificationCountdownKey);
        } catch (error) {
            const hasLockState = applyLockState(error);
            if (hasLockState) {
                setCodeYzm(['','','','','','']);
                clearVerificationErrors();
                return;
            }
            console.error('Verification code request failed:', error);
            setVerificationError(t('passwordVerification.verificationFailed'));
        } finally {
            setLoading(false);
        }
    }

    async function hanldeContinue(){
        if(loading || isLocked) return ;
        if(codeYzm.join('').length === 6){
            if(isSignupFlow){
                await verifyCodeAndContinue(formData.email, async () => {
                    const registerPayload = toApi({
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        phoneNumber: formData.phoneNumber,
                        email: formData.email,
                        passwordHash: aesEncrypt(formData.password),
                    });
                    await request.post('/api/User/Register', registerPayload)
                    reset();
                    history.push('/registration-successful');
                });
            }
            if(url.get('from') === 'forgot-password'){
                await verifyCodeAndContinue(email, () => {
                    history.push('/new-password');
                });
            }
        }
    }

    const [emailString, emailTail] = currentEmail.split('@');
    // const myemail = emailString.slice(0, 3).padEnd(emailString.length, '*');
    const myemail = emailString

    async function resend(){
        if (sendLoading || countdown > 0 || resendDisabled || isLocked) return;
        try {
            setSendLoading(true);
            clearVerificationErrors();
            const resendResult = await postEmail(
                currentEmail,
                isSignupFlow ? signupFullName : undefined,
                verificationType,
            );
            const hasLockState = applyLockState(resendResult);
            if (hasLockState) {
                clearCountdown(verificationCountdownKey);
                return;
            }
            startCountdown(verificationCountdownKey, VERIFICATION_RESEND_SECONDS);
        } catch (error) {
            const hasLockState = applyLockState(error);
            if (hasLockState) {
                clearVerificationErrors();
                clearCountdown(verificationCountdownKey);
                return;
            }
            console.error('Verification code resend failed:', error);
            setVerificationError(t('passwordVerification.resendFailed'));
            setResendDisabled(true);
        } finally {
            setSendLoading(false);
        }
    }

    const countdownLabel = `${countdown}s`;
    
    return <PublicLayout className="verification-layout">
       <div className='verification-content'>
       <div className='verification-box' dir={isRtl ? 'rtl' : 'ltr'}>
            <div className='verification-header'></div>
            <div className='verification-title'>
                {t('passwordVerification.title')}
            </div>
            <div className='verification-desc'>
                {t('passwordVerification.codeSentTo', {
                    email: myemail + '@' + emailTail
                })}
            </div>
            <div className="verification-code-section">
                <div className="verification-input-group">
                    {codeYzm.map((item, index)=>{
                        return <Input
                        className={`verification-otp-input${codeError ? ' error' : ''}`}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onPaste={handlePaste}
                        disabled={loading}
                        ref={(el) => (inputsRef.current[index] = el)} value={item} key={index} onChange={(e)=>handleInputChange(e.target.value, index)} />
                    })}
                </div>
                {codeError ? (
                    <div className="verification-code-inline-error" role="alert">
                        {codeError}
                    </div>
                ) : null}
            </div>
            <div className='verification-resend'>
                <span className='verification-text'>{t('passwordVerification.notReceived')}</span>
                {countdown > 0 ? (
                    <span className='time'>
                        <Timer />{countdownLabel}
                    </span>
                ) : null}
                <span
                    className={`resend ${countdown > 0 || sendLoading || resendDisabled || isLocked ? 'disabled' : ''}`}
                    onClick={resend}
                >
                    <Loading loading={sendLoading}>
                        {t('passwordVerification.resend')}
                    </Loading>
                </span>
            </div>
            <div className="verification-actions">
                <div className='verification-footer' dir="ltr">
                    <div className='verification-back-btn' onClick={()=>history.goBack()}>{t('passwordVerification.back')}</div>
                    <div className={`verification-continue-btn ${codeYzm.filter(Boolean).length !== 6 || isLocked ? 'disabled': ''}`} onClick={hanldeContinue}>
                        <Loading loading={loading}>
                            {t('passwordVerification.continue')}
                        </Loading>
                    </div>
                </div>
                <FormErrorPrompt
                    message={isLocked ? getLockMessage() : generalError}
                    className="form-error-prompt--after-footer"
                />
            </div>
        </div>
       </div>
    </PublicLayout>
}
