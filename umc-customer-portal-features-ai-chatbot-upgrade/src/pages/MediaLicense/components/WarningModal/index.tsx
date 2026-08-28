import React from "react";
import { Modal, Radio } from "antd";
import "./index.less";
import { CustomButton } from "@/components/common";
import WaingGoldIcon from "@/assets/images/WarningGold.png";
import InstitutionHeader from "@/assets/images/institutionHeader.png";

export interface WarningModalProps {
  visible: boolean;
  title: string;
  content: string;
  cancelText?: string;
  confirmText?: string;
  close?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  needConfirm?: boolean;
  needCancel?: boolean;
  loading?: boolean;
  icon?: string;
  supportService?: { id: number; nameEn: string }[];
  ownedProfile?: [];
  hangdleSelectProfile?: (profileId: number, userTypeId: number) => void;
}

const ConfirmModal: React.FC<WarningModalProps> = ({
  visible,
  close,
  title,
  content,
  onCancel,
  onConfirm,
  cancelText,
  confirmText,
  needConfirm = true,
  needCancel = true,
  icon,
  supportService,
  ownedProfile,
  hangdleSelectProfile
}) => {
  
  return (
    <Modal
      visible={visible}
      onCancel={close}
      footer={null}
      closable
      className="confirm-modal"
      centered
    >
      <div className="confirm-modal-content">
        <div className="confirm-modal-header">
          <img className="confirm-modal-icon" src={icon ?? WaingGoldIcon} alt="" />
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        <p className="confirm-modal-text">{content}</p>
        {supportService && <ul>
          {supportService.map((item) => <li key={item.id}>{item.nameEn}</li>)}
        </ul>}
        {ownedProfile && <div className="profile-list">
          <Radio.Group 
            onChange={(e) => {
              const profileId = e.target.value;
              const userTypeId = ownedProfile.find((item) => item.profileId === profileId)?.userTypeId
              if (hangdleSelectProfile) {
                hangdleSelectProfile(profileId, userTypeId)
              }
            }}
          >
          { ownedProfile.map((item) =>
            <div key={item.profileId} className="profile-item">
              <img src={InstitutionHeader} alt="" />
              <div className="profile-name">{item.nameEn}</div>
              <Radio value={item.profileId} />
            </div>
          )}
          </Radio.Group>
        </div>}
        <div className="confirm-modal-footer">
          {needCancel && <CustomButton 
            variant="outline" 
            text={cancelText ?? 'Close'}
            onClick={onCancel}
          />}
          {needConfirm && <CustomButton 
            variant="primary" 
            text={confirmText ?? 'Add Now'}
            onClick={onConfirm}
          />}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
