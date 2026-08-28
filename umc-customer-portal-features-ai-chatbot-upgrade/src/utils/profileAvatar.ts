import establishmentAvatar from "@/assets/images/profile-avatar-establishment.svg";
import governmentAvatar from "@/assets/images/profile-avatar-government.png";
import individualAvatar from "@/assets/images/profile-avatar-individual.svg";
import institutionAvatar from "@/assets/images/profile-avatar-institution.svg";
import {
  commercialGroupSubTypeCodes,
  commercialGroupSubTypeIds,
  governmentGroupSubTypeCodes,
  governmentGroupSubTypeIds,
} from "@/pages/EstablishmentProfile/utils/constants";
import { resolveFileUrl } from "@/utils/url";

export type ProfileAvatarKind = "individual" | "establishment";

const normalizeValue = (value?: string | number | null) =>
  String(value ?? "").trim();

const isInSubTypeGroup = (
  value: string | number | null | undefined,
  ids: Set<number>,
  codes: Set<string>,
) => {
  const normalizedValue = normalizeValue(value);

  return (
    ids.has(Number(normalizedValue)) || codes.has(normalizedValue)
  );
};

export const getProfileAvatarFallback = ({
  kind,
  userTypeId,
  userTypeCode,
}: {
  kind: ProfileAvatarKind;
  userTypeId?: string | number | null;
  userTypeCode?: string | number | null;
}) => {
  if (kind === "individual") {
    return individualAvatar;
  }

  const typeValues = [userTypeId, userTypeCode];

  if (
    typeValues.some((value) =>
      isInSubTypeGroup(
        value,
        governmentGroupSubTypeIds,
        governmentGroupSubTypeCodes,
      ),
    )
  ) {
    return governmentAvatar;
  }

  if (
    typeValues.some((value) =>
      isInSubTypeGroup(
        value,
        commercialGroupSubTypeIds,
        commercialGroupSubTypeCodes,
      ),
    )
  ) {
    return establishmentAvatar;
  }

  return institutionAvatar;
};

export const resolveProfileAvatar = (
  avatarUrl: string | null | undefined,
  fallback: string,
) => resolveFileUrl(avatarUrl) || fallback;
