import { DEFAULT_COUNTRY_DIAL_CODE } from '@/components/common/MobileNumberInput';
import { Modal, Spin } from 'antd';
import { useState, useEffect } from 'react';
import emailPng from '@/assets/images/email.png';
import sms from '@/assets/images/sms.png';
import VerificationInput from '@/components/common/VerificationInput';
import Timer from '@/assets/icons/Timer';
import Loading from '@/components/common/Loading';
import { useTranslation } from 'react-i18next';
import jinggao from '@/assets/images/jinggao.png';
import eyePng from '@/assets/images/eye.png';
import hideEyePng from '@/assets/images/hide-eye.png';
import yellowWarnPng from '@/assets/images/yellow-warn.png';
import { useUserStore } from '@/store/user';
import { getCode, postVerifyCode, putResetPin } from '@/services/payments';
import aesEncrypt from '@/utils/aesEncrypt';
import './ChangePin.less';
import { CustomButton, CustomMessage } from '@/components/common';
import {
    getVerificationCountdownKey,
    getVerificationCountdownRemaining,
    useVerificationCountdownStore,
} from '@/store/verification-store';

interface IChangePinProps {
    visible: boolean;
    onCancel?: () => void;
    walletId?: number;
}

export default function ChangePin({ visible, onCancel, walletId }: IChangePinProps) { 
    const [codeYzm, setCodeYzm] = useState(['','','','','','']);
    const [codeYzm2, setCodeYzm2] = useState(['','','','','','']);
    const [codeYzm3, setCodeYzm3] = useState(['','','','','','']);
    const [eye, setEye] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [chooseMethodLoading, setChooseMethodLoading] = useState(false);
    const [resetPinModalVisible, setResetPinModalVisible] = useState(false);
    const { t } = useTranslation();
    const [verificationVisible, setVerificationVisible] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const [verifyCode, setVerfyCode] = useState('');
    const [postVerifyCodeLoading, setPostVerifyCodeLoading] = useState(false);
    const userInfo = useUserStore(state=>state.userInfo); 
    const email = userInfo?.email;
    const [emailString, emailTail] = email?.split('@') ?? '';
    const myemail = emailString?.slice(0, 3).padEnd(emailString.length, '*') ?? '';
    const fullEmail = myemail + "@" + emailTail;
    const isNotMatch = codeYzm.join('') !== codeYzm2.join('') && codeYzm.join('').length === 6 && codeYzm2.join('').length === 6;
    const isDisabled = isNotMatch || codeYzm.join('').length < 6 || codeYzm2.join('').length < 6;
    const countdownKey = getVerificationCountdownKey('payments-change-pin', email);
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
        if (countdown <= 0) {
            return;
        }

        const timer = window.setTimeout(() => {
            forceRender((value) => value + 1);
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [countdown]);
    function getGenerateCode(){
        return getCode(1);
    } 
    async function resend(){
        if(sendLoading || countdown > 0) return;
        try{
            setSendLoading(true);
            await getGenerateCode();
            startCountdown(countdownKey, 59);
        }finally{
            setSendLoading(false);
        }
       
    }
    async function handleResetPin(){
        if(walletId){
            try{
                setResetLoading(true);
                await putResetPin({
                    walletId,
                    verifyCode,
                    newPIN: aesEncrypt(codeYzm.join(""))
                });
                CustomMessage.success(t("payments.resetPin.success"));
                setVerfyCode("");
                setResetPinModalVisible(false);
                setVerificationVisible(false);
                clearCountdown(countdownKey);
                onCancel?.();
            }finally{
                setResetLoading(false);
            }
        }
    }
    
    return (
        <>
            <Modal centered className='forget-your-pin-modal' maskClosable={false} onCancel={onCancel} footer={false} title={<div className='forget-your-pin-title'>
                <div className='title'>{t("forgotPin.title")}</div>
                <div className='desc'>{t("forgotPin.desc")}</div>
            </div>} visible={visible}>
                <Spin spinning={chooseMethodLoading}>
                    <div className='choose-a-method'>
                        {t("forgotPin.chooseMethod")}
                    </div>
                    <div className='method' onClick={async ()=>{
                        if(chooseMethodLoading) return;
                        try{
                            setChooseMethodLoading(true);
                            await getGenerateCode();
                            setVerificationVisible(true);
                            startCountdown(countdownKey, 59);
                            setCodeYzm3(['','','','','','']);
                        }finally{
                            setChooseMethodLoading(false);
                        }
                    }}>
                        <div className='icon'>
                            <img src={emailPng} alt="" />
                        </div>
                        <div>
                            <div className='method-title'>{t("forgotPin.emailVerification")}</div>
                            <div className='method-target'>{fullEmail}</div>
                        </div>
                    </div>
                    <div className='method'>
                        <div className='icon'>
                            <img src={sms} alt="" />
                        </div>
                        <div>
                            <div className='method-title'>{t("forgotPin.SMSVerification")}</div>
                            <div className='method-target'>{DEFAULT_COUNTRY_DIAL_CODE} ** *** 4567</div>
                        </div>
                    </div>
                </Spin>
            </Modal>
            <Modal centered className='verification-modal' maskClosable={false} title={<div className='verification-title'>
                <div className='title'>{t("forgotPin.verification")}</div>
                <div className='desc'>{t("forgotPin.check")}</div>
            </div>} visible={verificationVisible} onCancel={()=>setVerificationVisible(false)} footer={false}>
                <div className='verification-modal-content'>
                    <div className='desc'>{t("forgotPin.sendTo", {fullEmail})}</div>
                    <div>
                        <VerificationInput codeYzm={codeYzm3} onChange={setCodeYzm3} />
                    </div>
                    <div className='resend-wrappre'>
                        <div className='receive-it'>{t("forgotPin.notReceive")}</div>
                        <div className='timer'><Timer />{countdown}s</div>
                        <div className='resend' onClick= {resend}>
                            <Loading loading={sendLoading}>
                                {t('passwordVerification.resend')}
                            </Loading>
                        </div>
                    </div>
                </div>
                <div className='verification-modal-footer'>
                    <CustomButton variant='outline' text={t("forgotPin.back")} onClick={()=>setVerificationVisible(false)} />
                    <CustomButton text={t("myAccountPage.changePasswordModal.verifyCode")} loading={postVerifyCodeLoading} disabled={codeYzm3.join('').length !== 6} onClick={async() => {
                        if(codeYzm3.join('').length === 6){
                            try{
                                const verifyCode = codeYzm3.join('');
                                setPostVerifyCodeLoading(true)
                                await postVerifyCode({ verifyCode });
                                setVerfyCode(verifyCode);
                                setResetPinModalVisible(true);
                                setCodeYzm(['','','','','','']);
                                setCodeYzm2(['','','','','','']);
                            } finally {
                                setPostVerifyCodeLoading(false)
                            }
                        }
                    }} />
                </div>
            </Modal>
            <Modal centered className='create-pin-modal reset-pin-modal' visible={resetPinModalVisible}  maskClosable={false} onCancel={()=>setResetPinModalVisible(false)} footer={false} title={<div className='create-pin-header'>
                <div className='create-pin-title'>{t('payments.resetPin.title')}</div>
                <div className='create-pin-desc'>{t('payments.resetPin.desc')}</div>
            </div>}>
                <div className='create-pin-content'>
                    <div className='create-pin-item'>
                        <div className='create-pin-item-title'>{t('payments.createPin.enterPIN')}</div>
                        <div className='create-pin-input-group'>
                            <VerificationInput hide={!eye} codeYzm={codeYzm} onChange={setCodeYzm} />
                        </div>
                        {isNotMatch &&<div className='create-pin-jinggao'><img src={jinggao} alt="" /> {t('payments.createPin.noMatch')} </div>}
                    </div>
                    <div className='create-pin-item'>
                        <div className='create-pin-item-title'>{t('payments.createPin.confirmPIN')}</div>
                        <div className='create-pin-input-group'>
                            {<VerificationInput hide={!eye} codeYzm={codeYzm2} onChange={setCodeYzm2} /> }
                        </div>
                        {isNotMatch &&<div className='create-pin-jinggao'><img src={jinggao} alt="" /> {t('payments.createPin.noMatch')} </div>}
                    </div>
                    <div className='eye-icon' onClick={()=>setEye(!eye)}>
                        {eye ? <img className='pwd-eye' src={eyePng} /> : <img className='pwd-eye' src={hideEyePng} />}
                        {eye ? <div className='eye-text'>{t('payments.createPin.showPIN')}</div> : <div className='eye-text'>{t('payments.createPin.hidePIN')}</div>}
                    </div>
                    <div className='create-pin-rule'>
                        <div className='warn-icon'><img src={yellowWarnPng} /></div>
                        <div className='warn-content'>
                            <div className='warn-title'>{t('payments.createPin.requirements')}:</div>
                            <ul className='warn-items'>
                                <li>{t('payments.createPin.pinLength')}</li>
                                <li>{t('payments.createPin.pinComplexity')}</li>
                                <li>{t('payments.createPin.pinSecurity')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className='create-pin-footer'>
                    <CustomButton variant='outline' text={t("forgotPin.back")} onClick={()=>setResetPinModalVisible(false)} />
                    <CustomButton disabled={isDisabled} loading={resetLoading} text={t("common.confirm")} onClick={handleResetPin} />
                </div>
            </Modal>
        </>
    )
}
