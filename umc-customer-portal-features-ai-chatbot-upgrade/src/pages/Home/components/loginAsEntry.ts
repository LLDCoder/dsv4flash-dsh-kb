export type ApprovedProfilesStatus = "idle" | "loaded" | "failed";

export interface LoginAsEntryState {
  gateVisible: boolean;
  profilesStatus: ApprovedProfilesStatus;
  profilesUserId: string;
  currentUserId: string;
  hasProfiles: boolean;
}

export const resolveLoginAsEntry = ({
  gateVisible,
  profilesStatus,
  profilesUserId,
  currentUserId,
  hasProfiles,
}: LoginAsEntryState) => {
  const belongsToCurrentUser =
    Boolean(currentUserId) && profilesUserId === currentUserId;
  const profilesLoaded =
    belongsToCurrentUser && profilesStatus === "loaded";
  const profilesFailed =
    belongsToCurrentUser && profilesStatus === "failed";

  return {
    visible:
      gateVisible && hasProfiles && (profilesLoaded || profilesFailed),
    enterGlobalView: gateVisible && profilesLoaded && !hasProfiles,
  };
};
