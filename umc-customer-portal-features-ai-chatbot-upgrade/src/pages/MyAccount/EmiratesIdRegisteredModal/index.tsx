import type { MouseEvent } from "react";
import { Modal } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { CustomButton } from "@/components/common";
import "./EmiratesIdRegisteredModal.less";

export type EmiratesIdRegisteredModalProps = {
  visible: boolean;
  onContinueWithOtherId?: (e: MouseEvent<HTMLButtonElement>) => void;
  onClose?: () => void;
};

export default function EmiratesIdRegisteredModal({
  visible,
  onContinueWithOtherId,
  onClose,
}: EmiratesIdRegisteredModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      footer={null}
      maskClosable={false}
      closable={Boolean(onClose)}
      onCancel={onClose}
      centered
      width={640}
      destroyOnClose
      className="emirates-id-registered-modal"
      wrapClassName="emirates-id-registered-wrap"
    >
      <div className="emirates-id-registered">
        <div className="emirates-id-registered__body">
          <div className="emirates-id-registered__icon-wrap" aria-hidden>
            <span className="emirates-id-registered__icon-circle">
              <CheckOutlined className="emirates-id-registered__check" />
            </span>
          </div>
          <div className="emirates-id-registered__titles">
            <h2 className="emirates-id-registered__title">
              {t("myAccountPage.emiratesIdRegistered.title")}
            </h2>
            <p className="emirates-id-registered__description">
              {t("myAccountPage.emiratesIdRegistered.description")}
            </p>
          </div>
          <div className="emirates-id-registered__actions">
            <CustomButton
              variant="outline"
              size="large"
              text={t("myAccountPage.emiratesIdRegistered.continueOtherId")}
              customClassName="emirates-id-registered__btn emirates-id-registered__btn--secondary"
              onClick={onContinueWithOtherId}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
