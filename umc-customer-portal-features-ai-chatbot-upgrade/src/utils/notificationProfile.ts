export function resolveNotificationProfileId(
  currentProfileId?: string | number | null,
): string | null {
  const normalizedProfileId = String(currentProfileId ?? "").trim();

  if (!normalizedProfileId) {
    return null;
  }

  const profileId = Number(normalizedProfileId);

  return Number.isFinite(profileId) && profileId >= 0
    ? String(profileId)
    : null;
}
