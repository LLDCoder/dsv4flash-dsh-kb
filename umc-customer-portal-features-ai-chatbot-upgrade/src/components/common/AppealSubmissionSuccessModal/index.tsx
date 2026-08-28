import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import Copy from "@/assets/icons/Copy";
import successIcon from "@/assets/icons/pay-fines/modal-success.svg";
import SimpleBar from "@/components/SimpleBar";
import { copyToClipboard } from "@/utils/copy";
import CustomMessage from "../CustomMessage";
import PaymentSuccessFeedback from "../PaymentSuccessFeedback";
import "./index.less";

export interface AppealSubmissionSuccessModalProps {
  visible: boolean;
  appealNumber: string;
  onClose: () => void;
  onSubmitRating: (rating: number) => Promise<boolean> | boolean;
}

const AppealSubmissionSuccessModal = ({
  visible,
  appealNumber,
  onClose,
  onSubmitRating,
}: AppealSubmissionSuccessModalProps) => {
  const { t } = useTranslation();
  const title = t("violationsFinesPage.submitAppeal.successModal.title");

  const handleCopy = async () => {
    const copied = await copyToClipboard(appealNumber, {
      successMessage: t(
        "violationsFinesPage.submitAppeal.successModal.copySuccess",
      ),
    });

    if (!copied) {
      CustomMessage.error(
        t("violationsFinesPage.submitAppeal.successModal.copyFailed"),
      );
    }
  };

  return (
    <Modal
      centered
      className="appeal-submission-success-modal"
      wrapClassName="appeal-submission-success-modal-root"
      title={
        <span className="appeal-submission-success-modal__accessible-title">
          {title}
        </span>
      }
      footer={null}
      maskClosable={false}
      destroyOnClose
      visible={visible}
      onCancel={onClose}
    >
      <SimpleBar
        className="appeal-submission-success-modal__scroll"
        tabIndex={-1}
        ariaLabel={title}
      >
        <div className="appeal-submission-success-modal__content">
          <div className="appeal-submission-success-modal__summary">
            <div className="appeal-submission-success-modal__icon">
              <img src={successIcon} alt="" />
            </div>
            <div className="appeal-submission-success-modal__message">
              <h2
                className="appeal-submission-success-modal__title"
                aria-hidden="true"
              >
                {title}
              </h2>
              <p className="appeal-submission-success-modal__description">
                {t(
                  "violationsFinesPage.submitAppeal.successModal.description",
                )}
              </p>
            </div>
            <div className="appeal-submission-success-modal__number">
              <span className="appeal-submission-success-modal__number-label">
                {t(
                  "violationsFinesPage.submitAppeal.successModal.appealNumber",
                )}
                :
              </span>
              <strong className="appeal-submission-success-modal__number-value">
                {appealNumber}
              </strong>
              <button
                className="appeal-submission-success-modal__copy"
                type="button"
                aria-label={t(
                  "violationsFinesPage.submitAppeal.successModal.copy",
                )}
                onClick={() => void handleCopy()}
              >
                <Copy />
              </button>
            </div>
          </div>
          <PaymentSuccessFeedback
            active={visible}
            title={t(
              "violationsFinesPage.submitAppeal.successModal.feedbackTitle",
            )}
            dissatisfiedLabel={t(
              "violationsFinesPage.submitAppeal.successModal.dissatisfied",
            )}
            satisfiedLabel={t(
              "violationsFinesPage.submitAppeal.successModal.satisfied",
            )}
            submitLabel={t("violationsFinesPage.common.submit")}
            onSubmit={onSubmitRating}
          />
        </div>
      </SimpleBar>
    </Modal>
  );
};

export default AppealSubmissionSuccessModal;
