import type { ReactNode } from "react";
import { useCallback } from "react";
import i18next from "i18next";
import type { History } from "history";
import { CustomMessage } from "@/components/common";
import type { ServiceEntryGateDialogOpener } from "@/components/ServiceEntryGate/types";
import {
  checkServiceEntryGate,
  type ServiceEntryGatePayload,
  type ServiceEntryGateUiHints,
} from "@/services/services";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import {
  openServiceGateWithPayload,
  openServiceWithGate,
  switchServiceProfileIdentity,
} from "@/utils/serviceEntryGate";
import useProfileActionConfirmation from "./useProfileActionConfirmation";
import type { ServicesProfileSelectionOption } from "./ServicesProfileSelectionModal";

type QualifyingProfile = NonNullable<
  ServiceEntryGateUiHints["qualifyingProfiles"]
>[number];

export interface GlobalServiceStartRequest {
  history: History;
  serviceId: number;
  serviceCode?: string | null;
  serviceName?: string;
  source: string;
  openDialog: ServiceEntryGateDialogOpener;
}

const normalizeText = (value?: string | number | null) =>
  String(value ?? "").trim();

const SUSPENDED_PROFILE_STATUS_VALUES = new Set([
  "suspended",
  "suspend",
  "profilesuspended",
]);

const isSuspendedQualifyingProfile = (profile?: QualifyingProfile) => {
  if (!profile) {
    return false;
  }

  const profileRecord = profile as Record<string, unknown>;

  if (profileRecord.isSuspended === true || profileRecord.suspended === true) {
    return true;
  }

  return [
    profile.disabledReasonCode,
    profile.profileStatus,
    profile.profileStatusCode,
    profile.profileStatusName,
    profile.status,
    profile.statusCode,
    profile.statusName,
  ].some((value) => {
    const normalizedValue =
      typeof value === "string" || typeof value === "number"
        ? normalizeText(value).toLowerCase().replace(/[\s_-]+/g, "")
        : "";

    return SUSPENDED_PROFILE_STATUS_VALUES.has(normalizedValue);
  });
};

const readProfileValue = (
  profile: QualifyingProfile | undefined,
  keys: string[],
) => {
  const profileRecord = (profile || {}) as Record<string, unknown>;

  for (const key of keys) {
    const value = profileRecord[key];
    const normalizedValue =
      typeof value === "string" || typeof value === "number"
        ? normalizeText(value)
        : "";

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
};

const resolveProfileGroup = (
  profile: QualifyingProfile | undefined,
  userTypeId: string,
  isPersonalProfile: boolean,
): ServicesProfileSelectionOption["group"] => {
  if (isPersonalProfile) {
    return "individual";
  }

  const identityValues = [
    profile?.userTypeCode,
    profile?.userTypeId,
    userTypeId,
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean);

  return identityValues.some(
    (value) =>
      value === "1" ||
      value === "01" ||
      value === "individual" ||
      value.includes("individual") ||
      value.includes("personal"),
  )
    ? "individual"
    : "establishment";
};

const normalizeUserTypeId = (value?: string | number | null) => {
  const normalizedValue = normalizeText(value);
  const numericValue = Number(normalizedValue);

  return normalizedValue && Number.isInteger(numericValue) && numericValue > 0
    ? String(numericValue)
    : "";
};

const resolveInventoryProfile = (profileId: string) => {
  const userInfo = useUserStore.getState().userInfo;
  const personalProfile = userInfo.userInvitation;

  if (normalizeText(personalProfile?.userProfileId) === profileId) {
    return {
      group: "individual" as const,
      userTypeId: normalizeUserTypeId(personalProfile?.userTypeId),
      name:
        normalizeText(personalProfile?.name) ||
        [userInfo.firstName, userInfo.lastName]
          .map((value) => normalizeText(value))
          .filter(Boolean)
          .join(" "),
      avatarUrl: personalProfile?.photoUrl || null,
    };
  }

  const establishmentProfile = (userInfo.userEstablishments || []).find(
    (profile) => normalizeText(profile.userProfileId) === profileId,
  );

  if (!establishmentProfile) {
    return null;
  }

  return {
    group: "establishment" as const,
    userTypeId: normalizeUserTypeId(establishmentProfile.userTypeId),
    name:
      normalizeText(establishmentProfile.nameEn) ||
      normalizeText(establishmentProfile.nameAr),
    avatarUrl: establishmentProfile.establishmentUrl || null,
  };
};

const shouldUseGateDecisionForEmptyProfileSelection = (
  payload: ServiceEntryGatePayload,
) => {
  const decision = payload.decision;

  if (!decision) {
    return false;
  }

  if (decision.finalAction === "RedirectRenewal") {
    return true;
  }

  return (
    decision.finalAction === "Block" &&
    Boolean(
      decision.action ||
        decision.promptCode ||
        decision.reasonCode ||
        payload.documentInfo,
    )
  );
};

const mapQualifyingProfiles = (
  payload: ServiceEntryGatePayload,
): ServicesProfileSelectionOption[] => {
  const seenProfileIds = new Set<string>();

  return (payload.uiHints?.qualifyingProfiles || [])
    .filter((hint) => hint.isEligible !== false)
    .map((hint) => {
      const profileId = normalizeText(hint.profileId);

      if (
        !profileId ||
        isGlobalProfileId(profileId) ||
        seenProfileIds.has(profileId) ||
        isSuspendedQualifyingProfile(hint)
      ) {
        return null;
      }

      seenProfileIds.add(profileId);

      const inventoryProfile = resolveInventoryProfile(profileId);
      const userTypeId =
        normalizeUserTypeId(hint.userTypeId) ||
        inventoryProfile?.userTypeId ||
        "";

      if (!userTypeId) {
        return null;
      }

      const name =
        readProfileValue(hint, ["profileName"]) ||
        readProfileValue(hint, ["title", "nameEn", "nameAr"]) ||
        inventoryProfile?.name ||
        `Profile #${profileId}`;
      const subtitle = readProfileValue(hint, ["subtitle"]);
      const licenseNumber = readProfileValue(hint, [
        "commercialLicenseNumber",
      ]);
      const location = readProfileValue(hint, [
        "location",
        "locationName",
        "city",
        "cityName",
        "emirate",
        "emirateName",
      ]);

      return {
        profileId,
        userTypeId,
        userTypeCode: readProfileValue(hint, ["userTypeCode"]) || null,
        name,
        subtitle: subtitle || null,
        licenseNumber: licenseNumber || null,
        location: location || null,
        avatarUrl:
          readProfileValue(hint, ["avatarUrl"]) ||
          inventoryProfile?.avatarUrl ||
          null,
        searchKeywords: [name, subtitle, licenseNumber]
          .map((value) => normalizeText(value))
          .filter(Boolean),
        isEligible: true,
        group:
          inventoryProfile?.group ||
          resolveProfileGroup(hint, userTypeId, false),
      };
    })
    .filter(Boolean) as ServicesProfileSelectionOption[];
};

const hasUnresolvedQualifyingProfile = (
  payload: ServiceEntryGatePayload,
  profiles: ServicesProfileSelectionOption[],
) => {
  const resolvedProfileIds = new Set(
    profiles.map((profile) => profile.profileId),
  );

  return (payload.uiHints?.qualifyingProfiles || []).some((profile) => {
    const profileId = normalizeText(profile.profileId);

    return (
      Boolean(profileId) &&
      profile.isEligible !== false &&
      !isSuspendedQualifyingProfile(profile) &&
      !resolvedProfileIds.has(profileId)
    );
  });
};

export default function useGlobalServiceProfileSelection(): {
  startService: (request: GlobalServiceStartRequest) => Promise<void>;
  profileSelectionNode: ReactNode;
} {
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const userId = useUserStore((state) => state.userInfo.id);
  const refreshApprovedProfiles = useUserStore(
    (state) => state.refreshApprovedProfiles,
  );
  const { openProfileSelection, profileSelectionNode } =
    useProfileActionConfirmation();

  const startService = useCallback(
    async (request: GlobalServiceStartRequest) => {
      if (!isGlobalProfileId(currentProfileId)) {
        await openServiceWithGate(request);
        return;
      }

      try {
        const envelope = await checkServiceEntryGate(request.serviceId);
        const payload = envelope?.data;

        if (!payload) {
          throw new Error("Service check did not return data");
        }

        let profiles = mapQualifyingProfiles(payload);

        if (
          userId &&
          hasUnresolvedQualifyingProfile(payload, profiles)
        ) {
          await refreshApprovedProfiles(userId);
          profiles = mapQualifyingProfiles(payload);
        }

        if (
          !profiles.length &&
          shouldUseGateDecisionForEmptyProfileSelection(payload)
        ) {
          await openServiceGateWithPayload({
            ...request,
            payload,
          });
          return;
        }

        const selectedProfile = await openProfileSelection({
          profiles,
          showWhenEmpty: true,
          onConfirm: async (profile) => {
            await switchServiceProfileIdentity(
              profile.profileId,
              profile.userTypeId,
            );
          },
        });

        if (!selectedProfile) {
          return;
        }

        await openServiceWithGate(request);
      } catch (error) {
        console.error("global service profile selection", error);
        CustomMessage.error(i18next.t("common.requestFailed"));
      }
    },
    [
      currentProfileId,
      openProfileSelection,
      refreshApprovedProfiles,
      userId,
    ],
  );

  return {
    startService,
    profileSelectionNode,
  };
}
