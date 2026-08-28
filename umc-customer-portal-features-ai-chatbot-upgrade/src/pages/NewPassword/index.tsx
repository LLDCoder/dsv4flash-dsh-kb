
import { useState } from 'react';
import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { history } from '@/utils/history';
import request from '@/utils/request';
import { useForgotPwdStore } from '@/store/forgot-pwd-store';
import aesEncrypt from '@/utils/aesEncrypt';
import Loading from '@/components/common/Loading';
import PublicLayout from '@/components/common/PublicLayout';
import Eye from '@/assets/icons/Eye';
import EyeView from '@/assets/icons/EyeView';
import './index.less';

export default function NewPassword() {
    const { t } = useTranslation();
    const [pwdValidateRes, setPwdValidateRes] = useState([false, false, false, false, false]);
    const [form] = Form.useForm();
    const [, update] = useState({});
    const [loading, setLoading] = useState(false);
    const email = useForgotPwdStore((state: any) => state.email);
    const reset = useForgotPwdStore((state: any) => state.reset);

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
        if (/[!@#$_.]/.test(password) && !/[^a-zA-Z0-9!@#$_.]/.test(password)) {
            pwdValidateRes[4] = true;
        } else {
            pwdValidateRes[4] = false;
        }
        setPwdValidateRes(pwdValidateRes.slice());
    };

    function handleResetPassword() {
        if (loading) return;
        form.validateFields().then(async (values) => {
            if (pwdValidateRes.filter(Boolean).length !== pwdValidateRes.length) return;
            try {
                setLoading(true);
                const pwd = aesEncrypt(values.password);
                await request.post('/api/User/ForgetPassWord', {
                    pwd,
                    email
                });
                reset();
                history.push('/login?passwordResetSuccess=1');
            } finally {
                setLoading(false);
            }
        });
    }

    const isDisabled = () => {
        const { password, confirmPassword } = form.getFieldsValue();
        if (!password || !confirmPassword || password !== confirmPassword || pwdValidateRes.filter(Boolean).length !== pwdValidateRes.length) {
            return true;
        }
        return false;
    };

    return <PublicLayout className="forgot-password-layout new-password-layout">
        <div className='forgot-password-content'>
            <div className='forgot-password-box'>
                <div className='forgot-password-header'></div>
                <div className='title'>{t('newPassword.pageTitle')}</div>
                <div className='desc'>{t('newPassword.please.description')}</div>
                <Form form={form} className='forgot-password-form custorm-form' layout='vertical'>
                    <Form.Item className='mb-8' label={t('newPassword.password')} name='password' rules={[
                        { required: true, message: t('common.required') },
                        {
                            validator: (rule, value, callback) => {
                                const confirmPassword = form.getFieldValue('confirmPassword');
                                if (!confirmPassword) {
                                    callback();
                                    return;
                                }
                                if (value && value !== confirmPassword) {
                                    callback(t('newPassword.please.twoPassword'));
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
                        <Input.Password onChange={(e) => {
                            validatePassword(e.target.value);
                        }} placeholder={t('formPlaceholders.pages.login.newPassword.password')} allowClear iconRender={(isView) => {
                            return isView ? <EyeView /> : <Eye />;
                        }} />
                    </Form.Item>
                    <div className='pwd-validate'>
                        {[t('newPassword.passwordValidator.charactersLength'), t('newPassword.passwordValidator.lowercase'), t('newPassword.passwordValidator.number'), t('newPassword.passwordValidator.uppercase'), t('newPassword.passwordValidator.special')].map((item, index) => {
                            return <div key={index} className={`pwd-validate-item ${pwdValidateRes[index] ? 'pwd-validate-ok' : ''}`}>{item}</div>;
                        })}
                    </div>
                    <Form.Item label={t('newPassword.confirmPassword')} name='confirmPassword' rules={[
                        { required: true, message: t('common.required') },
                        {
                            validator: (rule, value, callback) => {
                                const password = form.getFieldValue('password');
                                if (!password) {
                                    callback();
                                    return;
                                }
                                if (value && value !== password) {
                                    callback(t('newPassword.please.twoPassword'));
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
                        <Input.Password onChange={() => update({})} placeholder={t('formPlaceholders.pages.login.newPassword.confirmPassword')} allowClear iconRender={(isView) => {
                            return isView ? <EyeView /> : <Eye />;
                        }} />
                    </Form.Item>
                </Form>
                <div className='forgot-password-footer'>
                    <div className='back-btn' onClick={() => history.goBack()}>{t('newPassword.back')}</div>
                    <div className={`next-step-btn ${isDisabled() ? 'disabled' : ''}`} onClick={handleResetPassword}>
                        <Loading loading={loading}>
                            {t('newPassword.continue')}
                        </Loading>
                    </div>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
