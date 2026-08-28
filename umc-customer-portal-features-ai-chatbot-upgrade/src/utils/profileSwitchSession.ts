type ProfileSwitchDebugContext = {
  sessionId: string;
  source: string;
  userId?: string;
  fromProfileId?: string;
  toProfileId?: string;
  toUserTypeId?: string;
  route?: string;
  startedAt: string;
  [key: string]: unknown;
};

type ProfileSwitchSessionInput = {
  source: string;
  userId?: string;
  fromProfileId?: string;
  toProfileId?: string;
  toUserTypeId?: string;
  route?: string;
  [key: string]: unknown;
};

let activeProfileSwitchContext: ProfileSwitchDebugContext | null = null;
const PROFILE_SWITCH_SESSION_TTL_MS = 60 * 1000;
let profileSwitchSessionSequence = 0;

const getNowIsoString = () => new Date().toISOString();

export const startProfileSwitchSession = (
  context: ProfileSwitchSessionInput,
) => {
  const activeSession = getActiveProfileSwitchSession();
  if (activeSession && !activeSession.tokenPersistedAt) {
    return null;
  }
  profileSwitchSessionSequence += 1;
  activeProfileSwitchContext = {
    ...context,
    sessionId: `${Date.now()}-${profileSwitchSessionSequence}`,
    startedAt: getNowIsoString(),
  };
  return activeProfileSwitchContext;
};

export const updateProfileSwitchSession = (
  patch: Partial<ProfileSwitchDebugContext>,
  sessionId?: string,
) => {
  if (
    !activeProfileSwitchContext ||
    (sessionId && activeProfileSwitchContext.sessionId !== sessionId)
  ) {
    return null;
  }

  activeProfileSwitchContext = {
    ...activeProfileSwitchContext,
    ...patch,
  };
  return activeProfileSwitchContext;
};

export const getActiveProfileSwitchSession = () => {
  if (
    activeProfileSwitchContext &&
    Date.now() - Date.parse(activeProfileSwitchContext.startedAt) >
      PROFILE_SWITCH_SESSION_TTL_MS
  ) {
    activeProfileSwitchContext = null;
  }
  return activeProfileSwitchContext;
};

export const finishProfileSwitchSession = (
  status: "cancelled" | "failed" | "completed",
  extra: Record<string, unknown> = {},
  sessionId?: string,
) => {
  if (
    !activeProfileSwitchContext ||
    !sessionId ||
    activeProfileSwitchContext.sessionId !== sessionId
  ) {
    return;
  }

  void status;
  void extra;

  activeProfileSwitchContext = null;
};
