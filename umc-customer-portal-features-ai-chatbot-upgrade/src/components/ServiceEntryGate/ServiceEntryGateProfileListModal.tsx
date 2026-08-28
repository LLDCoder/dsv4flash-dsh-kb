import { useEffect, useState } from "react";
import { Modal, Radio } from "antd";
import SimpleBar from "@/components/SimpleBar";
import { CustomButton } from "@/components/common";
import {
  getProfileAvatarFallback,
  resolveProfileAvatar,
} from "@/utils/profileAvatar";
import { renderGateDialogIcon } from "./dialogShared";
import type {
  ServiceEntryGateProfileListDialog,
  ServiceEntryGateProfileOption,
} from "./types";
import "./service-entry-gate.less";

interface ServiceEntryGateProfileListModalProps {
  visible: boolean;
  dialog: ServiceEntryGateProfileListDialog;
  onAction: (actionKey: string, selectedProfileId?: string | null) => void;
  onClose: () => void;
}

const isProfileEligible = (profile?: ServiceEntryGateProfileOption | null) =>
  profile?.isEligible !== false;

function ProfileOptionAvatar({
  profile,
}: {
  profile: ServiceEntryGateProfileOption;
}) {
  const fallback = getProfileAvatarFallback({
    kind: profile.group || "establishment",
    userTypeId: profile.userTypeId,
    userTypeCode: profile.userTypeCode,
  });

  return (
    <span className="service-entry-gate-dialog__profile-avatar" aria-hidden="true">
      <img
        src={resolveProfileAvatar(profile.avatarUrl, fallback)}
        alt=""
        className="service-entry-gate-dialog__profile-avatar-image"
        onError={(event) => {
          if (event.currentTarget.dataset.fallbackApplied === "true") {
            return;
          }
          event.currentTarget.dataset.fallbackApplied = "true";
          event.currentTarget.src = fallback;
        }}
      />
    </span>
  );
}

export default function ServiceEntryGateProfileListModal({
  visible,
  dialog,
  onAction,
  onClose,
}: ServiceEntryGateProfileListModalProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    dialog.profiles.some(
      (profile) =>
        profile.profileId === dialog.selectedProfileId &&
        isProfileEligible(profile),
    )
      ? dialog.selectedProfileId || null
      : null,
  );

  useEffect(() => {
    setSelectedProfileId(
      dialog.profiles.some(
        (profile) =>
          profile.profileId === dialog.selectedProfileId &&
          isProfileEligible(profile),
      )
        ? dialog.selectedProfileId || null
        : null,
    );
  }, [dialog.profiles, dialog.selectedProfileId]);

  return (
    <Modal
      visible={visible}
      footer={null}
      centered
      getContainer={() => document.body}
      closable={dialog.closeable ?? true}
      onCancel={onClose}
      width={dialog.width ?? 760}
      className={`service-entry-gate-dialog service-entry-gate-dialog--profile-list service-entry-gate-dialog--${dialog.variant || "default"}`}
    >
      <div className="service-entry-gate-dialog__body service-entry-gate-dialog__body--profile-list">
        <div className="service-entry-gate-dialog__header service-entry-gate-dialog__header--profile-list">
          <div
            className={`service-entry-gate-dialog__icon service-entry-gate-dialog__icon--${dialog.tone || "warning"}`}
          >
            {renderGateDialogIcon(dialog.tone)}
          </div>
          <div className="service-entry-gate-dialog__copy-block service-entry-gate-dialog__copy-block--profile-list">
            <h3 className="service-entry-gate-dialog__title">{dialog.title}</h3>
            <p className="service-entry-gate-dialog__description">
              {dialog.description}
            </p>
          </div>
        </div>
        {dialog.listLabel ? (
          <div className="service-entry-gate-dialog__list-label">
            {dialog.listLabel}
          </div>
        ) : null}
        <SimpleBar
          autoHide={false}
          className="service-entry-gate-dialog__profile-list-scroll"
        >
          <Radio.Group
            value={selectedProfileId || undefined}
            onChange={(event) => {
              const selectedProfile = dialog.profiles.find(
                (profile) => profile.profileId === event.target.value,
              );
              if (isProfileEligible(selectedProfile)) {
                setSelectedProfileId(event.target.value);
              }
            }}
            className="service-entry-gate-dialog__profile-list"
          >
            {dialog.profiles.map((profile) => (
              <Radio
                key={profile.profileId}
                value={profile.profileId}
                disabled={!isProfileEligible(profile)}
                className={`service-entry-gate-dialog__profile-option${
                  isProfileEligible(profile)
                    ? ""
                    : " service-entry-gate-dialog__profile-option--disabled"
                }`}
              >
                <div className="service-entry-gate-dialog__profile-content">
                  <div className="service-entry-gate-dialog__profile-leading">
                    <ProfileOptionAvatar profile={profile} />
                    <div>
                      <span className="service-entry-gate-dialog__profile-title">
                        {profile.title}
                      </span>
                    </div>
                  </div>
                  {profile.badge ? (
                    <span className="service-entry-gate-dialog__profile-badge">
                      {profile.badge}
                    </span>
                  ) : null}
                </div>
              </Radio>
            ))}
          </Radio.Group>
        </SimpleBar>
        {dialog.helperText ? (
          <div className="service-entry-gate-dialog__helper">
            {dialog.helperText}
          </div>
        ) : null}
        <div className="service-entry-gate-dialog__actions service-entry-gate-dialog__actions--profile-list">
          {dialog.actions.map((action) => {
            const selectedActionProfile = dialog.profiles.find(
              (profile) => profile.profileId === selectedProfileId,
            );
            const selectedActionProfileId = isProfileEligible(
              selectedActionProfile,
            )
              ? selectedActionProfile?.profileId || null
              : null;
            const requiresProfileSelection = action.key === "switch-establishment";

            return (
              <CustomButton
                key={action.key}
                variant={action.variant || "outline"}
                disabled={
                  action.disabled ||
                  (requiresProfileSelection && !selectedActionProfileId)
                }
                size="large"
                onClick={() => onAction(action.key, selectedActionProfileId)}
              >
                {action.label}
              </CustomButton>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
