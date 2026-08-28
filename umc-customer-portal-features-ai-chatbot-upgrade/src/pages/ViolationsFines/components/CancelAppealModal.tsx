import React from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import CloseStroke1Icon from "@/assets/violations-fines/cancel-appeal-close-stroke-1.svg";
import CloseStroke2Icon from "@/assets/violations-fines/cancel-appeal-close-stroke-2.svg";
import WarningIcon from "@/assets/violations-fines/cancel-appeal-warning.svg";
import "./CancelAppealModal.less";

export interface CancelAppealModalProps {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const CancelAppealModal: React.FC<CancelAppealModalProps> = ({
  visible,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={null}
      closable={false}
      centered
      className="cancel-appeal-modal"
      wrapClassName="cancel-appeal-modal-wrap"
    >
      <div className="cancel-appeal-modal__root">
        <div className="cancel-appeal-modal__header">
          <button
            aria-label={t("common.close")}
            className="cancel-appeal-modal__close"
            disabled={loading}
            type="button"
            onClick={onCancel}
          >
            <span className="cancel-appeal-modal__close-inner" aria-hidden>
              <img
                alt=""
                className="cancel-appeal-modal__close-stroke"
                src={CloseStroke1Icon}
              />
              <img
                alt=""
                className="cancel-appeal-modal__close-stroke"
                src={CloseStroke2Icon}
              />
            </span>
          </button>
        </div>
        <div className="cancel-appeal-modal__body">
          <div className="cancel-appeal-modal__content">
            <div className="cancel-appeal-modal__icon">
              <img
                alt=""
                aria-hidden="true"
                className="cancel-appeal-modal__icon-image"
                src={WarningIcon}
              />
            </div>
            <div className="cancel-appeal-modal__copy">
              <h3 className="cancel-appeal-modal__title">
                {t("violationsFinesPage.appealDetail.cancelModal.title")}
              </h3>
              <p className="cancel-appeal-modal__description">
                {t("violationsFinesPage.appealDetail.cancelModal.content")}
              </p>
            </div>
            <div className="cancel-appeal-modal__actions">
              <button
                className="cancel-appeal-modal__button cancel-appeal-modal__button--cancel"
                disabled={loading}
                type="button"
                onClick={onCancel}
              >
                {t("violationsFinesPage.common.cancel")}
              </button>
              <button
                className="cancel-appeal-modal__button cancel-appeal-modal__button--confirm"
                disabled={loading}
                type="button"
                onClick={onConfirm}
              >
                {t("violationsFinesPage.common.confirm")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CancelAppealModal;
