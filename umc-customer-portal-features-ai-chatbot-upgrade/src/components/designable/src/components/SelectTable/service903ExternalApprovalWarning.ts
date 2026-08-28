const SERVICE_903_EXTERNAL_APPROVAL_ACTIVITY_IDS = new Set([
  "1",
  "4",
  "1021",
  "16",
  "23",
]);

function normalizeActivityId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

export function shouldShowService903ExternalApprovalWarning(
  selectedActivityIds: readonly unknown[],
  prefilledActivityIds: readonly unknown[],
): boolean {
  const prefilledIdSet = new Set(
    prefilledActivityIds
      .map(normalizeActivityId)
      .filter((id): id is string => id !== null),
  );

  return selectedActivityIds.some((value) => {
    const activityId = normalizeActivityId(value);

    return (
      activityId !== null &&
      SERVICE_903_EXTERNAL_APPROVAL_ACTIVITY_IDS.has(activityId) &&
      !prefilledIdSet.has(activityId)
    );
  });
}
