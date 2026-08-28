import React from "react";
import { Modal } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import CustomButton from "../CustomButton";
import SuccessImg from "@/assets/images/comfirm_success.png";
import "./index.less";

interface ProfileUnderReviewModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

const ProfileUnderReviewModal: React.FC<ProfileUnderReviewModalProps> = ({
  visible,
  onClose,
  title,
  description,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("profileUnderReviewModal.defaultTitle");
  const resolvedDescription =
    description ?? t("profileUnderReviewModal.defaultDescription");
  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={""}
      className="profile-under-review-modal"
    >
      <CloseOutlined className="modal-close-icon" onClick={onClose} />
      <div className="modal-content">
        <div className="icon-wrapper">
          <img src={SuccessImg} className="success-check" />
        </div>
        <h2 className="modal-title">{resolvedTitle}</h2>
        <p className="modal-description">{resolvedDescription}</p>
        <CustomButton
          text={t("profileUnderReviewModal.close")}
          variant="outline"
          onClick={onClose}
          customClassName="close-btn"
        />
      </div>
    </Modal>
  );
};

export default ProfileUnderReviewModal;
