import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import i18next from "i18next";
import { CustomMessage } from "@/components/common";
import {
  isGlobalProfileId,
  useUserStore,
} from "@/store/user";
import { switchServiceProfileIdentity } from "@/utils/serviceEntryGate";
import type { ProfileActionTarget } from "@/utils/profileActionContext";
import ServicesProfileSelectionModal, {
  type ServicesProfileSelectionOption,
} from "./ServicesProfileSelectionModal";

export interface ProfileSelectionRequest {
  profiles: ServicesProfileSelectionOption[];
  initialSelectedProfileId?: string | null;
  showWhenEmpty?: boolean;
  onConfirm?: (
    profile: ServicesProfileSelectionOption,
  ) => void | Promise<void>;
}

const normalizeValue = (value?: string | number | null) =>
  String(value ?? "").trim();

const normalizeUserTypeId = (value?: string | number | null) => {
  const normalizedValue = normalizeValue(value);
  const numericValue = Number(normalizedValue);

  return normalizedValue && Number.isInteger(numericValue) && numericValue > 0
    ? String(numericValue)
    : "";
};

const resolveProfileActionOption = (
  target: ProfileActionTarget,
  userInfo: ReturnType<typeof useUserStore.getState>["userInfo"],
): ServicesProfileSelectionOption | null => {
  const profileId = normalizeValue(target.profileId);

  if (!profileId || isGlobalProfileId(profileId)) {
    return null;
  }

  const personalProfile = userInfo.userInvitation;
  const isPersonalProfile =
    normalizeValue(personalProfile?.userProfileId) === profileId;
  const establishmentProfile = (userInfo.userEstablishments || []).find(
    (profile) => normalizeValue(profile.userProfileId) === profileId,
  );
  const userTypeId =
    normalizeUserTypeId(target.userTypeId) ||
    normalizeUserTypeId(
      isPersonalProfile
        ? personalProfile?.userTypeId
        : establishmentProfile?.userTypeId,
    );

  if (!userTypeId) {
    return null;
  }

  const name =
    normalizeValue(target.profileName) ||
    (isPersonalProfile
      ? normalizeValue(personalProfile?.name) ||
        [userInfo.firstName, userInfo.lastName]
          .map((value) => normalizeValue(value))
          .filter(Boolean)
          .join(" ")
      : normalizeValue(establishmentProfile?.nameEn) ||
        normalizeValue(establishmentProfile?.nameAr)) ||
    `Profile #${profileId}`;

  return {
    profileId,
    userTypeId,
    name,
    avatarUrl: isPersonalProfile
      ? personalProfile?.photoUrl || null
      : establishmentProfile?.establishmentUrl || null,
    searchKeywords: [target.profileName, target.userTypeName]
      .map((value) => normalizeValue(value))
      .filter(Boolean),
    group: isPersonalProfile ? "individual" : "establishment",
  };
};

const resolveProfileActionOptions = (
  target: ProfileActionTarget,
  userInfo: ReturnType<typeof useUserStore.getState>["userInfo"],
) => {
  const targetProfile = resolveProfileActionOption(target, userInfo);

  if (!targetProfile) {
    return null;
  }

  const optionsByProfileId = new Map<string, ServicesProfileSelectionOption>();
  const addProfileOption = (
    option: ServicesProfileSelectionOption,
  ) => {
    const isTargetProfile = option.profileId === targetProfile.profileId;

    optionsByProfileId.set(option.profileId, {
      ...option,
      ...(isTargetProfile ? targetProfile : {}),
      isEligible: isTargetProfile,
      searchKeywords: [
        ...(option.searchKeywords || []),
        ...(isTargetProfile ? targetProfile.searchKeywords || [] : []),
      ].filter(Boolean),
      group: isTargetProfile ? targetProfile.group : option.group,
      name: isTargetProfile ? targetProfile.name : option.name,
      userTypeId: isTargetProfile
        ? targetProfile.userTypeId
        : option.userTypeId,
      avatarUrl: isTargetProfile
        ? targetProfile.avatarUrl
        : option.avatarUrl,
    });
  };

  const personalProfile = userInfo.userInvitation;
  const personalProfileId = normalizeValue(personalProfile?.userProfileId);
  if (personalProfileId) {
    addProfileOption({
      profileId: personalProfileId,
      userTypeId: normalizeUserTypeId(personalProfile?.userTypeId),
      name:
        normalizeValue(personalProfile?.name) ||
        [userInfo.firstName, userInfo.lastName]
          .map((value) => normalizeValue(value))
          .filter(Boolean)
          .join(" ") ||
        `Profile #${personalProfileId}`,
      avatarUrl: personalProfile?.photoUrl || null,
      group: "individual",
    });
  }

  (userInfo.userEstablishments || []).forEach((profile) => {
    const profileId = normalizeValue(profile.userProfileId);
    if (!profileId) {
      return;
    }

    addProfileOption({
      profileId,
      userTypeId: normalizeUserTypeId(profile.userTypeId),
      name:
        normalizeValue(profile.nameEn) ||
        normalizeValue(profile.nameAr) ||
        `Profile #${profileId}`,
      avatarUrl: profile.establishmentUrl || null,
      group: "establishment",
    });
  });

  if (!optionsByProfileId.has(targetProfile.profileId)) {
    optionsByProfileId.set(targetProfile.profileId, {
      ...targetProfile,
      isEligible: true,
    });
  }

  return Array.from(optionsByProfileId.values());
};

export default function useProfileActionConfirmation(): {
  openProfileSelection: (
    request: ProfileSelectionRequest,
  ) => Promise<ServicesProfileSelectionOption | null>;
  ensureProfileAction: (target: ProfileActionTarget) => Promise<boolean>;
  profileSelectionNode: ReactNode;
} {
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const userInfo = useUserStore((state) => state.userInfo);
  const refreshApprovedProfiles = useUserStore(
    (state) => state.refreshApprovedProfiles,
  );
  const [request, setRequest] = useState<ProfileSelectionRequest | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const resolverRef = useRef<
    ((profile: ServicesProfileSelectionOption | null) => void) | null
  >(null);

  const closeProfileSelection = useCallback(
    (profile: ServicesProfileSelectionOption | null) => {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      setConfirmLoading(false);
      setRequest(null);
      resolve?.(profile);
    },
    [],
  );

  useEffect(
    () => () => {
      resolverRef.current?.(null);
      resolverRef.current = null;
    },
    [],
  );

  const openProfileSelection = useCallback(
    (nextRequest: ProfileSelectionRequest) => {
      const profiles = nextRequest.profiles;
      const hasEligibleProfile = profiles.some(
        (profile) => profile.isEligible !== false,
      );

      if (!hasEligibleProfile && !nextRequest.showWhenEmpty) {
        return Promise.resolve(null);
      }

      resolverRef.current?.(null);

      return new Promise<ServicesProfileSelectionOption | null>((resolve) => {
        resolverRef.current = resolve;
        setConfirmLoading(false);
        setRequest({ ...nextRequest, profiles });
      });
    },
    [],
  );

  const ensureProfileAction = useCallback(
    async (target: ProfileActionTarget) => {
      const targetProfileId = normalizeValue(target.profileId);
      const isCurrentProfileGlobal = isGlobalProfileId(currentProfileId);

      // Existing single-profile flows do not need a record-level identity to
      // continue. Global View does: it must never guess which profile owns it.
      if (!targetProfileId) {
        if (!isCurrentProfileGlobal) {
          return true;
        }

        CustomMessage.error(i18next.t("common.requestFailed"));
        return false;
      }

      if (isGlobalProfileId(targetProfileId)) {
        CustomMessage.error(i18next.t("common.requestFailed"));
        return false;
      }

      // Switching is unnecessary when the record already belongs to the
      // active profile, even if the list response omitted userTypeId.
      if (normalizeValue(currentProfileId) === targetProfileId) {
        return true;
      }

      let profileOptions = resolveProfileActionOptions(target, userInfo);
      let profileOption = profileOptions?.find(
        (profile) => profile.isEligible !== false,
      );

      // Login/profile inventory can be stale while a Global View page is open.
      // Retry against the approved-profile source before declaring a known target unavailable.
      if (!profileOption && normalizeValue(target.profileId) && userInfo.id) {
        try {
          await refreshApprovedProfiles(userInfo.id);
          profileOptions = resolveProfileActionOptions(
            target,
            useUserStore.getState().userInfo,
          );
          profileOption = profileOptions?.find(
            (profile) => profile.isEligible !== false,
          );
        } catch (error) {
          console.error("refresh profile action inventory", error);
        }
      }

      if (!profileOption) {
        CustomMessage.error(i18next.t("common.requestFailed"));
        return false;
      }

      const selectedProfile = await openProfileSelection({
        profiles: profileOptions || [],
        initialSelectedProfileId: profileOption.profileId,
        onConfirm: async (profile) => {
          await switchServiceProfileIdentity(
            profile.profileId,
            profile.userTypeId,
          );
        },
      });

      return Boolean(selectedProfile);
    },
    [currentProfileId, openProfileSelection, refreshApprovedProfiles, userInfo],
  );

  const handleConfirm = useCallback(
    async (profile: ServicesProfileSelectionOption) => {
      if (!request || confirmLoading) {
        return;
      }

      setConfirmLoading(true);
      try {
        await request.onConfirm?.(profile);
        closeProfileSelection(profile);
      } catch (error) {
        console.error("profile selection confirmation", error);
        CustomMessage.error(i18next.t("common.requestFailed"));
        setConfirmLoading(false);
      }
    },
    [closeProfileSelection, confirmLoading, request],
  );

  const profileSelectionNode = useMemo(
    () => (
      <ServicesProfileSelectionModal
        visible={Boolean(request)}
        profiles={request?.profiles || []}
        initialSelectedProfileId={request?.initialSelectedProfileId}
        confirmLoading={confirmLoading}
        onCancel={() => closeProfileSelection(null)}
        onConfirm={handleConfirm}
      />
    ),
    [closeProfileSelection, confirmLoading, handleConfirm, request],
  );

  return {
    openProfileSelection,
    ensureProfileAction,
    profileSelectionNode,
  };
}
