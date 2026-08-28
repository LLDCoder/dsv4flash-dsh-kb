import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CustomButton,
  CustomMessage,
  DEFAULT_EMAIL_FIELD,
  DEFAULT_PASSWORD_FIELD,
  getApiErrorMessage,
  hasForgotPasswordHint,
} from '@/components/common';
import { useForgotPwdStore } from '@/store/forgot-pwd-store';
import aesEncrypt from '@/utils/aesEncrypt';
import authStorage from '@/storage/authStorage';
import { TIME } from '@/config/constants';
import { type IUser, useUserStore } from '@/store/user';
import {
  getCurrentUserInfo,
  postDeclineMerge,
  postMergeAccount,
  postVerifyAccountMergeTarget,
} from '@/services/user';
import {
  getAccountMergeErrorStatus,
  isTargetBlockedStatus,
  normalizeAccountMergeStatus,
  type AccountMergeStatus,
  type MergeAccountSuccessData,
} from '@/pages/Home/utils';
import tishi from '@/assets/images/tishi.png';
import AccountLinkSuccessModal from '../AccountLinkSuccessModal';
import MatchedAccountLinkModal from '../MatchedAccountLinkModal';
import UaePassNmaLinkingModal from '../UaePassNmaLinkingModal';
import './AccountMergeConfirmModal.less';

export type AccountMergeMode = 'optional' | 'forced';

type CurrentUserInfoResponse = {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string | null;
  data?: IUser | null;
};

type Props = {
  visible: boolean;
  mode: AccountMergeMode;
  matchedAccountEmail?: string;
  forcedTargetUserId?: string;
  onComplete: () => void;
  onLogout: () => void;
};

export default function AccountMergeConfirmModal({
  visible,
  mode,
  matchedAccountEmail = '',
  forcedTargetUserId = '',
  onComplete,
  onLogout,
}: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const userInfo = useUserStore((state) => state.userInfo);
  const resetForgotPwd = useForgotPwdStore((state) => state.reset);
  const [linkingOpen, setLinkingOpen] = useState(false);
  const [linkOutcome, setLinkOutcome] = useState<'success' | null>(null);
  const [linkSummary, setLinkSummary] = useState<MergeAccountSuccessData | null>(null);
  const [nmaLinkSubmitting, setNmaLinkSubmitting] = useState(false);
  const [forcedMergeSubmitting, setForcedMergeSubmitting] = useState(false);
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  const [nmaLinkError, setNmaLinkError] = useState('');
  const [showForgotPasswordAction, setShowForgotPasswordAction] = useState(false);
  const [credentialEmail, setCredentialEmail] = useState('');
  const getTargetErrorMessage = useCallback(
    (targetStatus: AccountMergeStatus | '') => {
      switch (targetStatus) {
        case 'TARGET_IDENTITY_MISMATCH':
          return t('accountLinkFailure.blocked.identityMismatch');
        case 'TARGET_HAS_BUSINESS_DATA':
          return t('accountLinkFailure.blocked.hasData');
        case 'TARGET_ALREADY_LINKED':
          return t('accountLinkFailure.blocked.alreadyLinked');
        case 'TARGET_ALREADY_MERGED':
          return t('accountLinkFailure.blocked.alreadyMerged');
        default:
          return t('accountLinkFailure.blocked.notEligible');
      }
    },
    [t],
  );

  useEffect(() => {
    if (!visible) {
      setLinkingOpen(false);
      setLinkOutcome(null);
      setLinkSummary(null);
      setNmaLinkError('');
      setShowForgotPasswordAction(false);
      setCredentialEmail('');
    }
  }, [visible]);

  const openCredentials = (initialEmail = '') => {
    setNmaLinkError('');
    setShowForgotPasswordAction(false);
    setCredentialEmail(initialEmail);
    setLinkingOpen(true);
  };

  const handleNoClick = async () => {
    if (declineSubmitting) return;
    if (mode !== 'optional') {
      onComplete();
      return;
    }

    setDeclineSubmitting(true);
    try {
      await postDeclineMerge({ skipErrorToast: true });
      onComplete();
    } catch {
      console.error('Failed to record merge decline.');
      CustomMessage.error(t('common.operationFailed'));
    } finally {
      setDeclineSubmitting(false);
    }
  };

  const performMergeAccount = async (targetUserId: string) => {
    const sourceUserId = String(userInfo?.id ?? userInfo?.userId ?? '').trim();
    if (!sourceUserId || !targetUserId) {
      CustomMessage.error(t('common.operationFailed'));
      return;
    }

    try {
      const mergeRes = await postMergeAccount({
        souceUserId: sourceUserId,
        targetUserId,
        type: 1,
      });

      const token = String(mergeRes.token ?? '').trim();
      if (!token) {
        throw new Error(t('common.operationFailed'));
      }

      authStorage.setTokenInfo({
        token,
        refreshToken: '',
        expiresIn: TIME.REFRESH_TOKEN_EXPIRE,
        remember: true,
      });
      const currentUserResponse =
        await getCurrentUserInfo<CurrentUserInfoResponse>({
          skipErrorToast: true,
          skipUnauthorizedRedirect: true,
        });
      const mergedUser = currentUserResponse?.data;
      if (!mergedUser?.id) {
        throw new Error(t('common.operationFailed'));
      }
      useUserStore.getState().setData({
        ...mergedUser,
        token,
      });

      setLinkSummary(mergeRes);
      setLinkOutcome('success');
      setLinkingOpen(false);
    } catch (error: unknown) {
      console.error('Failed to merge account.');
      const errorStatus = getAccountMergeErrorStatus(error);
      CustomMessage.error(
        isTargetBlockedStatus(errorStatus)
          ? getTargetErrorMessage(errorStatus)
          : t('common.operationFailed'),
      );
    }
  };

  const handleForcedMerge = async () => {
    if (!forcedTargetUserId || forcedMergeSubmitting) {
      if (!forcedTargetUserId) {
        CustomMessage.error(t('common.operationFailed'));
      }
      return;
    }

    setForcedMergeSubmitting(true);
    try {
      await performMergeAccount(forcedTargetUserId);
    } finally {
      setForcedMergeSubmitting(false);
    }
  };

  const handleNmaLinkSubmit = async (fieldsValue: Record<string, string>) => {
    const normalizedEmail = String(fieldsValue[DEFAULT_EMAIL_FIELD] ?? '')
      .trim()
      .toLowerCase();
    const encryptedPassword = aesEncrypt(
      String(fieldsValue[DEFAULT_PASSWORD_FIELD] ?? ''),
    );

    setNmaLinkSubmitting(true);
    setNmaLinkError('');

    try {
      const verifyRes = await postVerifyAccountMergeTarget({
        email: normalizedEmail,
        password: encryptedPassword,
      });
      const targetStatus = normalizeAccountMergeStatus(verifyRes.status);
      const targetUserId = String(verifyRes.targetUserId ?? '').trim();
      if (
        targetStatus !== 'TARGET_ELIGIBLE' ||
        verifyRes.canLink !== true ||
        !targetUserId
      ) {
        setNmaLinkError(
          getTargetErrorMessage(
            isTargetBlockedStatus(targetStatus)
              ? targetStatus
              : 'TARGET_NOT_ELIGIBLE',
          ),
        );
        return;
      }
      await performMergeAccount(targetUserId);
    } catch (error: unknown) {
      const errorStatus = getAccountMergeErrorStatus(error);
      if (isTargetBlockedStatus(errorStatus)) {
        setNmaLinkError(getTargetErrorMessage(errorStatus));
        return;
      }
      const backendMessage = getApiErrorMessage(error);
      console.error('Failed to verify account merge target.');
      setShowForgotPasswordAction(hasForgotPasswordHint(backendMessage));
      setNmaLinkError(t('login.emailOrPasswordIncorrect'));
    } finally {
      setNmaLinkSubmitting(false);
    }
  };

  const showOptionalConfirm =
    visible &&
    mode === 'optional' &&
    !linkingOpen &&
    linkOutcome === null;
  const showForcedConfirm =
    visible &&
    mode === 'forced' &&
    !linkingOpen &&
    linkOutcome === null;

  return (
    <>
      <Modal
        visible={showOptionalConfirm}
        footer={null}
        closable={false}
        centered
        width={640}
        destroyOnClose={false}
        maskClosable={false}
        onCancel={() => void handleNoClick()}
        className="account-merge-confirm-modal"
        wrapClassName="account-merge-confirm-wrap"
      >
        <div className="account-merge-confirm">
          <header className="account-merge-confirm__header">
            <button
              type="button"
              className="account-merge-confirm__close"
              aria-label={t('common.close')}
              disabled={declineSubmitting}
              onClick={() => void handleNoClick()}
            >
              <svg
                viewBox="0 0 14 14"
                width="14"
                height="14"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12.2929 0.292893C12.6834 -0.0976311 13.3164 -0.0976311 13.707 0.292893C14.0975 0.683418 14.0975 1.31643 13.707 1.70696L1.70696 13.707C1.31643 14.0975 0.683418 14.0975 0.292893 13.707C-0.0976311 13.3164 -0.0976311 12.6834 0.292893 12.2929L12.2929 0.292893Z" />
                <path d="M0.292893 0.292893C0.683418 -0.0976311 1.31643 -0.0976311 1.70696 0.292893L13.707 12.2929C14.0975 12.6834 14.0975 13.3164 13.707 13.707C13.3164 14.0975 12.6834 14.0975 12.2929 13.707L0.292893 1.70696C-0.0976311 1.31643 -0.0976311 0.683418 0.292893 0.292893Z" />
              </svg>
            </button>
          </header>

          <div className="account-merge-confirm__body">
            <div className="account-merge-confirm__intro">
              <div className="account-merge-confirm__icon" aria-hidden>
                <div className="account-merge-confirm__icon-inner">
                  <img src={tishi} alt="" />
                </div>
              </div>
              <div className="account-merge-confirm__titles">
                <h2 className="account-merge-confirm__title">
                  {t('accountMergeConfirm.email.title')}
                </h2>
                <p className="account-merge-confirm__subtitle">
                  {t('accountMergeConfirm.email.subtitle')}
                </p>
              </div>
            </div>

            <div className="account-merge-confirm__cta">
              <CustomButton
                text={t('accountMergeConfirm.yes')}
                variant="primary"
                size="large"
                customClassName="account-merge-confirm__btn-yes"
                onClick={() => openCredentials()}
              />
              <CustomButton
                text={t('accountMergeConfirm.no')}
                variant="outline"
                size="large"
                customClassName="account-merge-confirm__btn-no"
                loading={declineSubmitting}
                disabled={declineSubmitting}
                onClick={() => void handleNoClick()}
              />
            </div>

            <ul className="account-merge-confirm__explanation">
              <li>{t('accountMergeConfirm.email.optionExisting')}</li>
              <li>{t('accountMergeConfirm.optionNew')}</li>
            </ul>

            <p className="account-merge-confirm__note">
              {t('accountMergeConfirm.note')}
            </p>
          </div>
        </div>
      </Modal>

      <MatchedAccountLinkModal
        visible={showForcedConfirm}
        matchedAccountEmail={matchedAccountEmail || userInfo?.email || ''}
        loading={forcedMergeSubmitting}
        onClose={onLogout}
        onLinkAccount={() => void handleForcedMerge()}
      />

      <UaePassNmaLinkingModal
        visible={visible && linkingOpen}
        initialEmail={credentialEmail}
        onClose={() => {
          setNmaLinkError('');
          setShowForgotPasswordAction(false);
          setLinkingOpen(false);
        }}
        onLinkSubmit={handleNmaLinkSubmit}
        submitLoading={nmaLinkSubmitting}
        apiErrorMessage={nmaLinkError}
        onApiErrorClear={() => {
          setNmaLinkError('');
          setShowForgotPasswordAction(false);
        }}
        onApiErrorActionClick={
          showForgotPasswordAction
            ? () => {
                resetForgotPwd();
                history.push('/forgot-password');
              }
            : undefined
        }
      />

      {linkSummary ? (
        <AccountLinkSuccessModal
          visible={visible && linkOutcome === 'success'}
          mergeData={linkSummary}
          onClose={onComplete}
          onContinue={onComplete}
        />
      ) : null}

    </>
  );
}
