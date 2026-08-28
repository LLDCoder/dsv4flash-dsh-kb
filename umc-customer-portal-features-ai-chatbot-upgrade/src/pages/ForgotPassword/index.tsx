
import { useState } from 'react';
import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { history } from '@/utils/history';
import request from '@/utils/request';
import { postEmail } from '@/services/user';
import { useForgotPwdStore } from '@/store/forgot-pwd-store';
import {
    getVerificationCountdownKey,
    VERIFICATION_RESEND_SECONDS,
    useVerificationCountdownStore,
} from '@/store/verification-store';
import Loading from '@/components/common/Loading';
import { FormErrorPrompt, getApiErrorMessage } from '@/components/common';
import PublicLayout from '@/components/common/PublicLayout';

import './index.less';
export default function ForgetPassword() { 
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const email = useForgotPwdStore((state) => state.email);
    const setEmail = useForgotPwdStore((state) => state.setEmail);
    const reset = useForgotPwdStore((state) => state.reset);
    const startCountdown = useVerificationCountdownStore((state) => state.startCountdown);
    const [emailNotExist, setEmailNotExist] = useState(false);
    const [emailApiError, setEmailApiError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [needsEmailRevalidation, setNeedsEmailRevalidation] = useState(false);

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isEmailFormatValid = Boolean(email?.trim() && emailPattern.test(email));
    const emailErrorMessage = emailNotExist ? t('forgotPassword.invalidEmail') : emailApiError;
    const isContinueDisabled =
        !isEmailFormatValid ||
        emailNotExist ||
        needsEmailRevalidation;

    async function validateEmailExistence(currentEmail: string) {
        try {
            const data = await checkEmailExist(currentEmail);
            const exists = Boolean(data.data);
            setEmailNotExist(!exists);
            setEmailApiError('');
            if (exists) {
                setNeedsEmailRevalidation(false);
            }
            return exists;
        } catch (error) {
            const message = getApiErrorMessage(error);
            setEmailNotExist(false);
            setEmailApiError(message || t('request.operation.failed'));
            setNeedsEmailRevalidation(true);
            return false;
        }
    }

    async function handleNextStep(){
        if(loading) return ;
        if(isContinueDisabled) return ;
        if(!email?.trim()) return;
        await form.validateFields();
        try{
            setLoading(true);
            setEmailApiError('');
            setGeneralError('');
            const data = await checkEmailExist(email);
            if(data.data){
                try {
                    await postEmail(email, undefined, 3);
                    startCountdown(
                        getVerificationCountdownKey('forgot-password', email),
                        VERIFICATION_RESEND_SECONDS,
                    );
                    history.push('/verification?from=forgot-password');
                } catch (error) {
                    const message = getApiErrorMessage(error);
                    setGeneralError(message || t('request.operation.failed'));
                }
            } else {
                setEmailNotExist(true);
            }
        } catch (error) {
            const message = getApiErrorMessage(error);
            setEmailApiError(message || t('request.operation.failed'));
            setNeedsEmailRevalidation(true);
        } finally{
            setLoading(false);
        }
    }
    const handleGoBack = () => {
        reset();
        history.goBack();
    }
    async function checkEmailExist(email: string){
        return await request.post('/api/User/EmailExsit', { email, type: 3 });
    }
    return <PublicLayout className="forgot-password-layout">
        <div className='forgot-password-content'>
            <div className='forgot-password-box'>
            <div className='forgot-password-header'></div>
           <div className='title'>
                {t('forgotPassword.title')}
           </div>
           <div className='desc'>
                {t('forgotPassword.description')}
           </div>
           <Form form={form} initialValues={{email}} className='forgot-password-form custorm-form' layout='vertical'>
                <Form.Item label={t('forgotPassword.email')} name='email'
                    rules={[
                        { required: true, message: t('common.required')},
                        { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: t('signup.please.emailFormat') }
                    ]}
                    validateStatus={emailErrorMessage ? 'error' : undefined}
                    help={emailErrorMessage || undefined}
                > 
                    <Input placeholder={t('formPlaceholders.common.enterEmail')} onBlur={async () => {
                        try {
                            await form.validateFields(['email']);
                        } catch {
                            return;
                        }
                        const currentEmail = form.getFieldValue('email')?.trim();
                        if(!currentEmail) return;
                        await validateEmailExistence(currentEmail);
                    }} onChange={(e)=>{
                        setEmail(e.target.value);
                        setEmailNotExist(false);
                        setEmailApiError('');
                        setGeneralError('');
                        setNeedsEmailRevalidation(false);
                    }} />
                </Form.Item>
           </Form>
           <div className="forgot-password-actions">
                <div className='forgot-password-footer'>
                    <div className='back-btn' onClick={handleGoBack}>{t('forgotPassword.back')}</div>
                    <div className={`next-step-btn ${isContinueDisabled ? 'disabled': ''}`} onClick={handleNextStep}>
                        <Loading loading={loading}>
                            {t('forgotPassword.continue')}
                        </Loading>
                    </div>
                </div>
                <FormErrorPrompt
                    message={generalError}
                    className="form-error-prompt--after-footer"
                />
            </div>
        </div>
        </div>
    </PublicLayout>
}
