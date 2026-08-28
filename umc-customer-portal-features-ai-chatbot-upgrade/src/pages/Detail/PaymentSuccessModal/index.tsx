import React, { useState } from 'react';
import { Modal } from 'antd';
import { CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { CustomButton, PaymentSuccessFeedback } from '@/components/common';
import { useTranslation } from 'react-i18next';
import './index.less';
import successIcon from '@/assets/images/comfirm_success.png';

interface PaymentSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  documentNumber: string;
  onDownloadReceipt?: () => void;
  onViewDocument?: () => void;
  onSubmitRating: (rating: number) => Promise<boolean | void>;
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  visible,
  onClose,
  documentNumber,
  onDownloadReceipt,
  onViewDocument,
  onSubmitRating,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyButtonLabel = copied
    ? t('myRequestsPage.paymentSuccess.copied')
    : t('myRequestsPage.paymentSuccess.copyDocumentNumber');

  const handleCopyDocumentNumber = async () => {
    try {
      await navigator.clipboard.writeText(documentNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadReceipt = () => {
    onDownloadReceipt?.();
  };

  const handleViewDocument = () => {
    onViewDocument?.();
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={720}
      className="payment-success-modal"
      closeIcon={<CloseOutlined className="modal-close-icon" />}
      maskClosable={false}
    >
      <div className="modal-content">
        {/* Success Icon */}
        <div className="success-icon-container">
          <img
            src={successIcon}
            alt={t('myRequestsPage.batchPayment.result.successTitle')}
            className="success-icon"
          />
        </div>

        {/* Title */}
        <h2 className="modal-title">
          {t('myRequestsPage.batchPayment.result.successTitle')}
        </h2>
        
        {/* Subtitle */}
        <p className="modal-subtitle">
          {t('myRequestsPage.paymentSuccess.descriptionLineOne')}
          <br />
          {t('myRequestsPage.paymentSuccess.descriptionLineTwo')}
        </p>

        {/* Document Number */}
        <div className="document-number-container">
          <div className="document-label">
            {t('myRequestsPage.paymentSuccess.documentNumber')}
          </div>
          <div className="document-number">
            <span className="number-text">{documentNumber}</span>
            <button 
              className={`copy-button ${copied ? 'copied' : ''}`}
              onClick={handleCopyDocumentNumber}
              title={copyButtonLabel}
              aria-label={copyButtonLabel}
            >
              <CopyOutlined />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-container">
          <CustomButton
            variant="outline"
            size="large"
            onClick={handleDownloadReceipt}
            customClassName="action-button"
          >
            {t('myRequestsPage.actions.downloadReceipt')}
          </CustomButton>
          
          <CustomButton
            variant="primary"
            size="large"
            onClick={handleViewDocument}
            customClassName="action-button"
          >
            {t('myRequestsPage.actions.viewDocument')}
          </CustomButton>
        </div>

        <PaymentSuccessFeedback
          active={visible}
          title={t('myRequestsPage.batchPayment.result.feedbackTitle')}
          dissatisfiedLabel={t(
            'myRequestsPage.batchPayment.result.dissatisfied',
          )}
          satisfiedLabel={t('myRequestsPage.batchPayment.result.satisfied')}
          submitLabel={t('common.submit')}
          onSubmit={onSubmitRating}
        />
      </div>
    </Modal>
  );
};

export default PaymentSuccessModal;
