import { useEffect, useMemo, useState } from "react";
import { Input, Modal, Radio } from "antd";
import SimpleBar from "@/components/SimpleBar";
import { CustomButton } from "@/components/common";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import closeIcon from "@/assets/images/profile-selection-close.svg";
import licenseIcon from "@/assets/images/profile-selection-license.svg";
import mapPinIcon from "@/assets/images/profile-selection-map-pin.svg";
import searchIcon from "@/assets/images/profile-selection-search.svg";
import {
  getProfileAvatarFallback,
  resolveProfileAvatar,
} from "@/utils/profileAvatar";
import { useTranslation } from "react-i18next";
import "./service-entry-gate.less";

export interface ServicesProfileSelectionOption {
  profileId: string;
  userTypeId: string;
  userTypeCode?: string | null;
  name: string;
  subtitle?: string | null;
  licenseNumber?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  searchKeywords?: string[];
  isEligible?: boolean;
  group: "individual" | "establishment";
}

interface ServicesProfileSelectionModalProps {
  visible: boolean;
  profiles: ServicesProfileSelectionOption[];
  initialSelectedProfileId?: string | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onConfirm: (profile: ServicesProfileSelectionOption) => void;
}

const normalizeSearchText = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const profileMatchesSearch = (
  profile: ServicesProfileSelectionOption,
  searchText: string,
) => {
  if (!searchText) {
    return true;
  }

  return [
    profile.name,
    profile.licenseNumber,
    profile.subtitle,
    ...(profile.searchKeywords || []),
  ].some((value) => normalizeSearchText(value).includes(searchText));
};

const isProfileEligible = (profile?: ServicesProfileSelectionOption | null) =>
  profile?.isEligible !== false;

function ProfileAvatar({
  profile,
}: {
  profile: ServicesProfileSelectionOption;
}) {
  const fallback = getProfileAvatarFallback({
    kind: profile.group,
    userTypeId: profile.userTypeId,
    userTypeCode: profile.userTypeCode,
  });

  return (
    <span className="services-profile-selection__avatar" aria-hidden="true">
      <img
        src={resolveProfileAvatar(profile.avatarUrl, fallback)}
        alt=""
        className="services-profile-selection__avatar-image"
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

function ProfileMetadata({
  profile,
}: {
  profile: ServicesProfileSelectionOption;
}) {
  if (profile.group !== "establishment") {
    return null;
  }

  const metadata = [
    {
      icon: licenseIcon,
      text: profile.licenseNumber || profile.subtitle,
    },
    {
      icon: mapPinIcon,
      text: profile.location,
    },
  ].filter((item) => String(item.text || "").trim());

  if (!metadata.length) {
    return null;
  }

  return (
    <span className="services-profile-selection__profile-meta">
      {metadata.map((item, index) => (
        <span
          className="services-profile-selection__profile-meta-item"
          key={`${item.text}-${index}`}
        >
          <img alt="" aria-hidden="true" src={item.icon} />
          <span>{item.text}</span>
        </span>
      ))}
    </span>
  );
}

export default function ServicesProfileSelectionModal({
  visible,
  profiles,
  initialSelectedProfileId = null,
  confirmLoading = false,
  onCancel,
  onConfirm,
}: ServicesProfileSelectionModalProps) {
  const { t } = useTranslation();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState("");

  const filteredProfiles = useMemo(() => {
    const searchText = normalizeSearchText(searchValue);

    return profiles.filter((profile) =>
      profileMatchesSearch(profile, searchText),
    );
  }, [profiles, searchValue]);

  useEffect(() => {
    if (!visible) {
      setSearchValue("");
      setSelectedProfileId(null);
      return;
    }

    setSelectedProfileId((currentProfileId) => {
      if (
        initialSelectedProfileId &&
        profiles.some(
          (profile) =>
            profile.profileId === initialSelectedProfileId &&
            isProfileEligible(profile),
        )
      ) {
        return initialSelectedProfileId;
      }

      if (
        currentProfileId &&
        profiles.some(
          (profile) =>
            profile.profileId === currentProfileId &&
            isProfileEligible(profile),
        )
      ) {
        return currentProfileId;
      }

      return null;
    });
  }, [initialSelectedProfileId, profiles, visible]);

  const selectedProfile = useMemo(
    () =>
      profiles.find(
        (profile) => profile.profileId === selectedProfileId,
      ) ||
      null,
    [profiles, selectedProfileId],
  );

  const groupedProfiles = useMemo(
    () => ({
      individual: filteredProfiles.filter(
        (profile) => profile.group === "individual",
      ),
      establishment: filteredProfiles.filter(
        (profile) => profile.group === "establishment",
      ),
    }),
    [filteredProfiles],
  );

  const handleConfirm = () => {
    if (!selectedProfile || !isProfileEligible(selectedProfile)) {
      return;
    }

    onConfirm(selectedProfile);
  };

  const renderProfileGroup = (
    title: string,
    groupProfiles: ServicesProfileSelectionOption[],
  ) => {
    if (!groupProfiles.length) {
      return null;
    }

    return (
      <div className="services-profile-selection__group">
        <div className="services-profile-selection__group-title">{title}</div>
        <div className="services-profile-selection__list">
          {groupProfiles.map((profile) => (
            <Radio
              key={profile.profileId}
              value={profile.profileId}
              disabled={!isProfileEligible(profile)}
              className={`services-profile-selection__profile-option${
                isProfileEligible(profile)
                  ? ""
                  : " services-profile-selection__profile-option--disabled"
              }`}
            >
              <div className="services-profile-selection__profile-content">
                <ProfileAvatar profile={profile} />
                <div className="services-profile-selection__profile-copy">
                  <span className="services-profile-selection__profile-name">
                    {profile.name}
                  </span>
                  <ProfileMetadata profile={profile} />
                </div>
              </div>
            </Radio>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      visible={visible}
      centered
      destroyOnClose
      getContainer={() => document.body}
      closeIcon={<img alt="" src={closeIcon} />}
      onCancel={confirmLoading ? undefined : onCancel}
      className="services-profile-selection-modal"
      wrapClassName="services-profile-selection-modal-wrap"
      footer={
        <div className="services-profile-selection__footer">
          <CustomButton
            variant="outline"
            size="large"
            disabled={confirmLoading}
            onClick={onCancel}
          >
            {t("common.cancel")}
          </CustomButton>
            <CustomButton
              variant="primary"
              size="large"
              loading={confirmLoading}
              disabled={!selectedProfile || !isProfileEligible(selectedProfile)}
              onClick={handleConfirm}
            >
            {t("common.confirm")}
          </CustomButton>
        </div>
      }
    >
      <div className="services-profile-selection">
        <div className="services-profile-selection__header">
          <h3 className="services-profile-selection__title">
            {t("serviceEntryGate.profileSelection.title")}
          </h3>
          <p className="services-profile-selection__description">
            {t("serviceEntryGate.profileSelection.description")}
          </p>
        </div>

        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          prefix={<img alt="" src={searchIcon} />}
          allowClear
          autoComplete="off"
          className="services-profile-selection__search"
          placeholder={t("serviceEntryGate.profileSelection.searchPlaceholder")}
        />

        <SimpleBar
          className={`services-profile-selection__scroll${
            filteredProfiles.length
              ? ""
              : " services-profile-selection__scroll--empty"
          }`}
        >
          {filteredProfiles.length ? (
            <Radio.Group
              value={selectedProfileId}
              onChange={(event) => setSelectedProfileId(event.target.value)}
              className="services-profile-selection__radio-group"
            >
              {renderProfileGroup(
                t("serviceEntryGate.profileSelection.individualProfile"),
                groupedProfiles.individual,
              )}
              {renderProfileGroup(
                t("serviceEntryGate.profileSelection.establishmentProfile"),
                groupedProfiles.establishment,
              )}
            </Radio.Group>
          ) : (
            <EmptyBox
              title={t("serviceEntryGate.profileSelection.noProfiles")}
              customClassName="services-profile-selection__empty"
            />
          )}
        </SimpleBar>
      </div>
    </Modal>
  );
}
