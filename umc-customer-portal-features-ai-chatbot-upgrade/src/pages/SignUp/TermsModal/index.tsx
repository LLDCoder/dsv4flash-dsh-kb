import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import SimpleBar from '@/components/SimpleBar';
import TermsContent from '@/components/common/TermsContent';
import './index.less';

interface TermsModalProps {
    visible: boolean;
    confirmed?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function TermsModal({ visible, confirmed = false, onCancel, onConfirm }: TermsModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            className='terms-modal'
            wrapClassName='terms-modal__root'
            title={t('termsModal.title')}
            maskClosable={false}
            centered
            onCancel={onCancel}
            footer={confirmed ? null : (
                <div className='terms-modal-footer'>
                    <button type='button' className='confirm-btn' onClick={onConfirm}>
                        {t('termsModal.confirm')}
                    </button>
                </div>
            )}
            visible={visible}
        >
            <SimpleBar className='terms-modal__scroll'>
                <TermsContent variant="signUp" />
            </SimpleBar>
        </Modal>
    );
}
