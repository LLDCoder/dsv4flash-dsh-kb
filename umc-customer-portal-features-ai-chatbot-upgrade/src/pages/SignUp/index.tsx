import { useEffect, useRef, useState, type ComponentProps } from 'react';
import ReCaptcha from 'react-google-recaptcha';
import { Form, Input, Row, Col, Checkbox, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import youjianto from '@/assets/images/youjianto.svg';
import fingerprint from '@/assets/images/fingerprint.png';
import { history } from '@/utils/history';
import request from '@/utils/request';
import {
    getSignupFullName,
    normalizeSignUpPhoneNumber,
    type ISignUpData,
    useSignupStore,
} from '@/store/signup-store';
import {
    getVerificationCountdownKey,
    VERIFICATION_RESEND_SECONDS,
    useVerificationCountdownStore,
} from '@/store/verification-store';
import Loading from '@/components/common/Loading';
import { FormErrorPrompt, getApiErrorMessage } from '@/components/common';
import {
    createMobileNumberFormRule,
    DEFAULT_COUNTRY_DIAL_CODE,
    FormMobileNumberInput,
    isValidMobileNumber,
} from '@/components/common/MobileNumberInput';
import PublicLayout from "@/components/common/PublicLayout";
import SimpleBar from '@/components/SimpleBar';
import { postEmail } from '@/services/user';
import { startUaePassLoginFlow } from '@/utils/uaePassLoginFlow';
import {
    createUaePassState,
    withUaePassState,
} from '@/utils/security/uaePassState';
import { useUaePassRedirectLoading } from '@/hooks/useUaePassRedirectLoading';
import TermsModal from './TermsModal';
import './index.less';
import EyeIcon from "@/assets/images/Eye.svg";
import EyeViewIcon from "@/assets/images/EyeView.svg";
import { useLocation } from 'react-router-dom';

interface SignUpLocationState {
    from?: string;
}

type SignUpFormValues = ISignUpData;

type ReCaptchaProps = ComponentProps<typeof ReCaptcha>;

const RECAPTCHA_BASE_WIDTH = 304;
const RECAPTCHA_BASE_HEIGHT = 78;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SIGNUP_PHONE_FIELD_NAMES = {
    countryCode: 'phoneCountryCode',
    phoneNumber: 'phoneLocalNumber',
} as const;
const EMPTY_SIGNUP_FORM_VALUES: SignUpFormValues = {
    firstName: '',
    lastName: '',
    phoneNumber: {
        phoneCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
        phoneLocalNumber: '',
    },
    email: '',
    password: '',
    confirmPassword: '',
};

const toForm = (data: ISignUpData): SignUpFormValues => {
    const { phoneNumber, ...rest } = data;

    return {
        ...rest,
        phoneNumber: {
            phoneCountryCode:
                String(phoneNumber?.phoneCountryCode ?? '').trim() ||
                DEFAULT_COUNTRY_DIAL_CODE,
            phoneLocalNumber: String(phoneNumber?.phoneLocalNumber ?? '').trim(),
        },
    };
};


export default function SignUp() {
    const { i18n, t } = useTranslation();
    const isRtl = i18n.language.startsWith('ar');
    const [currentLang, setCurrentLang] = useState(i18n.language || "en");
    const location = useLocation<SignUpLocationState>();
    const openedFromLogin = location.state?.from === 'login';
    const [token, setToken] = useState<string | null>(null);
    const siteKey = String(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '',
    ).trim();
    const [form] = Form.useForm<SignUpFormValues>();
    const [terms, setTerms] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [pwdValidateRes, setPwdValidateRes] = useState([false, false, false, false, false]);
    const [hasErrors, setHasErrors] = useState(false);
    const reset = useSignupStore((state) => state.reset);
    const [reCaptchaKey, setReCaptchaKey] = useState(0);
    const [termsModalOpen, setTermsModalOpen] = useState(false);
    const [apiError, setApiError] = useState('');
    const startCountdown = useVerificationCountdownStore((state) => state.startCountdown);
    const languageInitializedRef = useRef(false);
    const formData = useSignupStore((state: any) => {
        return {
            firstName: state.firstName,
            lastName: state.lastName,
            phoneNumber: normalizeSignUpPhoneNumber(state.phoneNumber),
            email: state.email,
            password: state.password,
            confirmPassword: state.confirmPassword,
        }
    });
    const initialFormValues = openedFromLogin
        ? EMPTY_SIGNUP_FORM_VALUES
        : toForm(formData);
    const [formValues, setFormValues] = useState<SignUpFormValues>(initialFormValues);
    const setData = useSignupStore((state: any) => state.setData);
    const handleReCaptchaChange = (newToken: string | null) => {
        setToken(newToken);
    };

    const normalizeNameValue = (value: unknown) => {
        return typeof value === 'string' ? value.trimStart() : value;
    };

    const NAME_PATTERN = /^[^\s]+$/;

    const validatePassword = (password: string) => {
        if (password && password.length >= 8 && password.length <= 16) {
            pwdValidateRes[0] = true;
        } else {
            pwdValidateRes[0] = false;
        }
        if (/^.*[a-z].*$/.test(password)) {
            pwdValidateRes[1] = true;
        } else {
            pwdValidateRes[1] = false;
        }
        if (/^.*[0-9].*$/.test(password)) {
            pwdValidateRes[2] = true;
        } else {
            pwdValidateRes[2] = false;
        }
        if (/^.*[A-Z].*$/.test(password)) {
            pwdValidateRes[3] = true;
        } else {
            pwdValidateRes[3] = false;
        }
        if (/[!@#$_\.]/.test(password) && !/[^a-zA-Z0-9!@#$_\.]/.test(password)) {
            pwdValidateRes[4] = true;
        } else {
            pwdValidateRes[4] = false;
        }
        setPwdValidateRes(pwdValidateRes.slice());
    };
    useEffect(() => {
        if (openedFromLogin) {
            form.resetFields();
        }

        if (initialFormValues.password) {
            validatePassword(initialFormValues.password);
        }
        setFormValues(initialFormValues);
        const errors = form.getFieldsError(trackedFieldNames as any).some(({ errors }) => errors.length > 0);
        setHasErrors(errors);
    }, [])

    useEffect(() => {
        const nextLang = i18n.language || 'en';

        setCurrentLang(nextLang);

        if (!languageInitializedRef.current) {
            languageInitializedRef.current = true;
            return;
        }

        setReCaptchaKey((prev) => prev + 1);
        setToken(null);
    }, [i18n.language]);

    const handleSignUpCilck = () => {
        if (submitLoading) return;
        if (isDisabled()) return;
        form.validateFields().then(async (values) => {
            const submitValues = {
                ...values,
                firstName: typeof values.firstName === 'string' ? values.firstName.trim() : '',
                lastName: typeof values.lastName === 'string' ? values.lastName.trim() : '',
            };

            try {
                setSubmitLoading(true);
                setApiError('');
                setData(submitValues);
                await postEmail(
                    submitValues.email,
                    getSignupFullName(submitValues.firstName, submitValues.lastName),
                );
                startCountdown(
                    getVerificationCountdownKey('signup', submitValues.email),
                    VERIFICATION_RESEND_SECONDS,
                );
                history.push('/verification?from=signup');
            } catch (error) {
                const message = getApiErrorMessage(error);
                setApiError(message || t('request.operation.failed'));
            } finally {
                setSubmitLoading(false);
            }
        });
    }
    const [loading, setLoading] = useUaePassRedirectLoading();
    const handleUAEPassLogin = () => {
        if (loading) return;
        const uaepassUrl = String(import.meta.env.VITE_UAE_PASS_URL ?? '').trim();
        if (!uaepassUrl) {
            setApiError(t('request.operation.failed'));
            return;
        }

        setLoading(true);
        setApiError('');
        const state = createUaePassState();
        const redirectUrl = withUaePassState(uaepassUrl, state);
        const flow = startUaePassLoginFlow('/', state);
        if (!redirectUrl || !flow) {
            setLoading(false);
            setApiError(t('request.operation.failed'));
            return;
        }
        window.location.assign(redirectUrl);
    };
    const trackedFieldNames = ['firstName', 'lastName', 'email', 'phoneNumber', 'password', 'confirmPassword'] as const;
    const updateHasErrors = () => {
        const errors = form.getFieldsError(trackedFieldNames as any).some(({ errors }) => errors.length > 0);
        setHasErrors(errors);
    };
    const isDisabled = () => {
        const { firstName, lastName, email, phoneNumber, password, confirmPassword } = formValues;
        const phoneLocalNumber = String(phoneNumber?.phoneLocalNumber ?? '');
        const phoneCountryCode = String(phoneNumber?.phoneCountryCode ?? '');
        const trimmedFirstName = typeof firstName === 'string' ? firstName.trim() : '';
        const trimmedLastName = typeof lastName === 'string' ? lastName.trim() : '';

        if (!trimmedFirstName || !trimmedLastName || !email || !password || !confirmPassword) {
            return true;
        }
        if (phoneLocalNumber && !isValidMobileNumber(phoneCountryCode, phoneLocalNumber)) {
            return true;
        }
        if (pwdValidateRes.filter(Boolean).length !== pwdValidateRes.length) {
            return true;
        }
        if (!terms || !token || hasErrors) {
            return true;
        }
        return false;
    };
    const handleGoBack = () => {
        reset();
        history.goBack()
    }
    async function checkEmailExist(email: string) {
        return await request.post('/api/User/EmailExsit', { email });
    }
    return <SimpleBar className="signup-page signup-page__scroll">
        <PublicLayout className="signup-public-layout">
            {/* <div className="signup-wrapper"> */}
            {/* <div className="signup-actions">
            <div className='signup-back' onClick={handleGoBack}><img src={loginBack} alt="back" /></div>
            <LangMenu lang={currentLang} onChange={handleLanguageChange} />
        </div> */}
            <div className="signup-page-isolate" dir="ltr">
                <div className='signup-box' dir={isRtl ? 'rtl' : 'ltr'}>
                    <div className='signup-header'>
                        <img onClick={handleGoBack} className='signup-arrow-left signup-box__back-icon' src={youjianto} alt="" />
                        {/* <img className='signup-logo' src={signupLogo} /> */}
                    </div>
                    <div className='signup-title'>
                        <div className='title'>{t('signup.registerNow')}</div>
                        <div className='desc'>{t('signup.desc')}</div>
                    </div>
                    <div className='uae-btn-wrapper'>
                        <div className='uae-btn' onClick={handleUAEPassLogin}>
                            <Spin spinning={loading}>
                                <div className='uae-btn-inner'>
                                    <img className='uae-btn-icon' src={fingerprint} alt='' />
                                    <span className='uae-btn-text'>{t('signup.uaeLogin')}</span>
                                </div>
                            </Spin>
                        </div>
                    </div>
                    <div className='signup-divider'>
                        <div className='signup-divider-text'>{t('login.or')}</div>
                    </div>
                    <FormErrorPrompt
                        message={apiError}
                        className="form-error-prompt--after-divider"
                    />
                    <Form<SignUpFormValues> layout='vertical' autoComplete="off" initialValues={initialFormValues} onValuesChange={(changedValues, allValues) => {
                        setData(allValues);
                        setFormValues(allValues);
                        if ('email' in changedValues) {
                            setApiError('');
                        }
                    }} onFieldsChange={updateHasErrors} className='custorm-form signup-form' form={form}>
                        <Row gutter={24}>
                            <Col xs={24} lg={12}>
                                <Form.Item
                                    label={t('signup.firstName')}
                                    name='firstName'
                                    normalize={normalizeNameValue}
                                    rules={[
                                        { required: true, whitespace: true, message: t('common.required') },
                                        {
                                            validator: (_, value) => {
                                                const nameValue = typeof value === 'string' ? value.trim() : '';

                                                if (!nameValue) {
                                                    return Promise.resolve();
                                                }

                                                if (!NAME_PATTERN.test(nameValue)) {
                                                    return Promise.reject(new Error(t('common.required'))); 
                                                }

                                                if (nameValue.length > 50 || nameValue.length < 2) {
                                                    return Promise.reject(new Error(t('signup.please.nameLen')));
                                                }

                                                return Promise.resolve();
                                            }
                                        }
                                    ]}
                                >
                                    <Input placeholder={t('formPlaceholders.common.enterFirstName')} maxLength={50} allowClear />
                                </Form.Item>
                            </Col>
                            <Col xs={24} lg={12}>
                                <Form.Item
                                    label={t('signup.lastName')}
                                    name='lastName'
                                    normalize={normalizeNameValue}
                                    rules={[
                                        { required: true, whitespace: true, message: t('common.required') },
                                        {
                                            validator: (_, value) => {
                                                const nameValue = typeof value === 'string' ? value.trim() : '';

                                                if (!nameValue) {
                                                    return Promise.resolve();
                                                }

                                                if (!NAME_PATTERN.test(nameValue)) {
                                                    return Promise.reject(new Error(t('common.required'))); 
                                                }

                                                if (nameValue.length > 50 || nameValue.length < 2) {
                                                    return Promise.reject(new Error(t('signup.please.nameLen')));
                                                }

                                                return Promise.resolve();
                                            }
                                        }
                                    ]}
                                >
                                    <Input placeholder={t('formPlaceholders.common.enterLastName')} maxLength={50} allowClear />
                                </Form.Item>
                            </Col>
                            <Col xs={24} lg={12}>
                                <Form.Item label={t('signup.email')} name='email' rules={[
                                    { required: true, message: t('common.required') },
                                    { pattern: EMAIL_PATTERN, message: t('signup.please.emailFormat') },
                                    {
                                        validator: async (_, value) => {
                                            if (!value) return Promise.resolve();
                                            if (!EMAIL_PATTERN.test(String(value))) return Promise.resolve();
                                            let data;
                                            try {
                                                data = await checkEmailExist(value);
                                            } catch {
                                                return Promise.resolve();
                                            }
                                            if (data.data) {
                                                return Promise.reject(new Error(t('signup.please.existEmail')));
                                            } else {
                                                return Promise.resolve();
                                            }
                                        },
                                    },
                                ]}>
                                    <Input
                                        name="signup-email"
                                        autoComplete="off"
                                        placeholder={t('formPlaceholders.common.enterEmail')}
                                        allowClear
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} lg={12}>
                                <Form.Item
                                    label={t('signup.mobilePhone')}
                                    name='phoneNumber'
                                    rules={[
                                        createMobileNumberFormRule({
                                            fieldNames: SIGNUP_PHONE_FIELD_NAMES,
                                        }),
                                    ]}
                                >
                                    <FormMobileNumberInput
                                        fieldNames={SIGNUP_PHONE_FIELD_NAMES}
                                        placeholder={t('formPlaceholders.pages.signUp.enterMobilePhone')}
                                        searchPlaceholder={t('formPlaceholders.common.search')}
                                        emptyText={t('multiSelectDropdown.noResults')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} lg={12}>
                                <Form.Item className='mb-8' label={t('signup.password')} name='password' rules={[
                                    { required: true, message: t('common.required') },
                                    {
                                        validator: (rule, value, callback) => {
                                            const confirmPassword = form.getFieldValue('confirmPassword');

                                            if (!confirmPassword) {
                                                callback();
                                                return;
                                            }

                                            if (value && value !== confirmPassword) {
                                                callback(t('signup.please.twoPassword'));
                                            } else {
                                                if (value && confirmPassword && value === confirmPassword) {
                                                    form.setFields([
                                                        {
                                                            name: 'confirmPassword',
                                                            errors: [],
                                                        },
                                                    ]);
                                                }
                                                callback();
                                            }
                                        }
                                    }
                                ]}>
                                    <Input.Password
                                        name="signup-password"
                                        autoComplete="new-password"
                                        onChange={(e) => {
                                            validatePassword(e.target.value)
                                        }}
                                        placeholder={t('formPlaceholders.pages.signUp.password')}
                                        allowClear
                                        iconRender={(isView) => {
                                            return !isView ? <img src={EyeViewIcon} alt="" /> : <img src={EyeIcon} alt="" />
                                        }}
                                    />
                                </Form.Item>
                                <div className='pwd-validate'>
                                    {[t('newPassword.passwordValidator.charactersLength'), t('newPassword.passwordValidator.lowercase'), t('newPassword.passwordValidator.number'), t('newPassword.passwordValidator.uppercase'), t('newPassword.passwordValidator.special')].map((item, index) => {
                                        return <div key={item} className={`pwd-validate-item ${pwdValidateRes[index] ? 'pwd-validate-ok' : ''}`}>{item}</div>;
                                    })}
                                </div>
                            </Col>
                            <Col xs={24} lg={12}>
                                <Form.Item className='mb-8' label={t('signup.confirmPassword')} name='confirmPassword' rules={[
                                    { required: true, message: t('common.required') },
                                    {
                                        validator: (rule, value, callback) => {
                                            const password = form.getFieldValue('password');
                                            if (!password) {
                                                callback();
                                                return;
                                            }
                                            if (value && value !== password) {
                                                callback(t('signup.please.twoPassword'));
                                            } else {
                                                if (value && password && value === password) {
                                                    form.setFields([
                                                        {
                                                            name: 'password',
                                                            errors: [],
                                                        },
                                                    ]);
                                                }
                                                callback();
                                            }
                                        }
                                    }
                                ]}>
                                    <Input.Password
                                        name="signup-confirm-password"
                                        autoComplete="new-password"
                                        placeholder={t('formPlaceholders.pages.signUp.confirmPassword')}
                                        allowClear
                                        iconRender={(isView) => {
                                            return !isView ? <img src={EyeViewIcon} alt="" /> : <img src={EyeIcon} alt="" />
                                        }}
                                    />
                                </Form.Item>
                                <ResponsiveReCaptcha
                                    key={reCaptchaKey}
                                    sitekey={siteKey}
                                    onChange={handleReCaptchaChange}
                                    theme="light"
                                    size="normal"
                                    hl={currentLang}
                                />
                            </Col>
                        </Row>

                    </Form>
                    <TermsModal
                        visible={termsModalOpen}
                        confirmed={terms}
                        onCancel={() => setTermsModalOpen(false)}
                        onConfirm={() => {
                            setTerms(true);
                            setTermsModalOpen(false);
                        }}
                    />
                    <div className='signup-footer custorm-form'>
                        <div onClick={handleSignUpCilck} className={`signup-btn ${isDisabled() ? 'disabled' : ''}`}>
                            <Loading loading={submitLoading}>
                                {t('signup.signup')}
                            </Loading>
                        </div>
                        <div>
                            <Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)}>{t('signup.agree')} </Checkbox><span onClick={() => setTermsModalOpen(true)} className='terms'>{t('signup.terms')}</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* </div> */}
        </PublicLayout>
    </SimpleBar>
}

function ResponsiveReCaptcha(props: ReCaptchaProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [availableWidth, setAvailableWidth] = useState(RECAPTCHA_BASE_WIDTH);

    useEffect(() => {
        const node = wrapperRef.current;
        if (!node) {
            return;
        }

        const updateWidth = () => {
            setAvailableWidth(node.clientWidth || RECAPTCHA_BASE_WIDTH);
        };

        updateWidth();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(() => {
            updateWidth();
        });

        observer.observe(node);

        return () => {
            observer.disconnect();
        };
    }, []);

    const scale = Math.min(1, availableWidth / RECAPTCHA_BASE_WIDTH);
    const scaledHeight = Math.ceil(RECAPTCHA_BASE_HEIGHT * scale);

    return (
        <div
            ref={wrapperRef}
            className="signup-recaptcha-wrapper"
            style={{
                maxWidth: '100%',
                width: RECAPTCHA_BASE_WIDTH,
                height: scaledHeight,
            }}
        >
            <div
                className="signup-recaptcha-inner"
                style={{
                    width: RECAPTCHA_BASE_WIDTH,
                    height: RECAPTCHA_BASE_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            >
                <ReCaptcha {...props} />
            </div>
        </div>
    );
}
