import React from "react";
import individualIcon from "@/assets/images/profile-name-individual.svg";
import establishmentIcon from "@/assets/images/profile-name-establishment.svg";
import governmentIcon from "@/assets/images/profile-name-government.svg";
import "./index.less";

export interface ProfileNameFields {
  profileId?: string | number | null;
  profileName?: string | null;
  userTypeId?: string | number | null;
  userTypeName?: string | null;
}

type ProfileType = "individual" | "establishment" | "government";

const ICON_BY_PROFILE_TYPE: Record<ProfileType, string> = {
  individual: individualIcon,
  establishment: establishmentIcon,
  government: governmentIcon,
};

const normalizeValue = (value?: string | number | null) =>
  String(value ?? "").trim();

const hasAnyKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const resolveProfileType = (
  userTypeId?: string | number | null,
  userTypeName?: string | null,
): ProfileType => {
  const normalizedUserTypeId = normalizeValue(userTypeId).toLowerCase();
  const normalizedUserTypeName = normalizeValue(userTypeName).toLowerCase();

  if (
    normalizedUserTypeId === "1" ||
    normalizedUserTypeId === "individual" ||
    hasAnyKeyword(normalizedUserTypeName, ["individual", "personal"])
  ) {
    return "individual";
  }

  if (
    normalizedUserTypeId === "government" ||
    hasAnyKeyword(normalizedUserTypeName, [
      "government",
      "governmental",
      "embassy",
      "consulate",
      "authority",
      "ministry",
      "federal",
    ])
  ) {
    return "government";
  }

  return "establishment";
};

const getDisplayName = (profileName?: string | null) => {
  const normalized = normalizeValue(profileName);
  return normalized || "-";
};

const ProfileNameCell: React.FC<ProfileNameFields> = ({
  profileName,
  userTypeId,
  userTypeName,
}) => {
  const displayName = getDisplayName(profileName);

  if (displayName === "-") {
    return <span className="profile-name-cell profile-name-cell--empty">-</span>;
  }

  const profileType = resolveProfileType(userTypeId, userTypeName);

  return (
    <span className={`profile-name-cell profile-name-cell--${profileType}`}>
      <img
        alt=""
        aria-hidden="true"
        className="profile-name-cell__icon"
        src={ICON_BY_PROFILE_TYPE[profileType]}
      />
      <span className="profile-name-cell__text" title={displayName}>
        {displayName}
      </span>
    </span>
  );
};

export default ProfileNameCell;
