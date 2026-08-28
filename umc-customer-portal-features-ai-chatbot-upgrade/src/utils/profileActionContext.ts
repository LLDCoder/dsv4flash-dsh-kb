export interface ProfileActionTarget {
  profileId?: string | number | null;
  userTypeId?: string | number | null;
  profileName?: string | null;
  userTypeName?: string | null;
}

export const PROFILE_ACTION_TARGET_STATE_KEY = "__profileActionTarget";

const normalizeProfileValue = (value?: string | number | null) =>
  String(value ?? "").trim();

export const hasProfileActionTarget = (
  target?: ProfileActionTarget | null,
) => Boolean(normalizeProfileValue(target?.profileId));

export const createProfileActionRouteState = (
  target?: ProfileActionTarget | null,
) => {
  if (!hasProfileActionTarget(target)) {
    return undefined;
  }

  return {
    [PROFILE_ACTION_TARGET_STATE_KEY]: {
      profileId: target?.profileId ?? null,
      userTypeId: target?.userTypeId ?? null,
      profileName: target?.profileName ?? null,
      userTypeName: target?.userTypeName ?? null,
    } as ProfileActionTarget,
  };
};

export const readProfileActionRouteState = (
  state?: unknown,
): ProfileActionTarget | null => {
  if (!state || typeof state !== "object") {
    return null;
  }

  const target = (state as Record<string, unknown>)[
    PROFILE_ACTION_TARGET_STATE_KEY
  ];

  if (!target || typeof target !== "object") {
    return null;
  }

  return target as ProfileActionTarget;
};

export const resolveProfileActionTarget = (
  ...targets: Array<ProfileActionTarget | null | undefined>
): ProfileActionTarget | null =>
  targets.find((target) => hasProfileActionTarget(target)) ?? null;
