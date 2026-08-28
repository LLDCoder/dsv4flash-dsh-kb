import type { PersonalProfilePageMode } from "./expiryUtils";

interface ExistingPersonalProfileRouteSource {
  type?: number | string | null;
  isGethirdPartyApi?: boolean | null;
}

export function buildExistingPersonalProfileDetailUrl(
  profile: ExistingPersonalProfileRouteSource,
  pageMode: PersonalProfilePageMode,
): string {
  const params = new URLSearchParams({
    mode: "edit",
    pageMode,
  });
  const thirdPartyApiValue =
    profile.isGethirdPartyApi === true && Number(profile.type) === 3
      ? null
      : profile.isGethirdPartyApi;

  if (thirdPartyApiValue !== undefined) {
    params.set("isGethirdPartyApi", String(thirdPartyApiValue));
  }

  return `/my-account/personal-profile?${params.toString()}`;
}
