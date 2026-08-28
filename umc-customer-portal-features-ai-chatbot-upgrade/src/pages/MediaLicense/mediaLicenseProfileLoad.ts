export const PERMITS_LICENSE_ACTIONS = new Set([
  "MODIFY",
  "RENEW",
  "CANCEL",
  "TRANSFER",
  "PARTNER_MANAGEMENT",
]);

interface MediaLicenseProfileLoadContext {
  routeAction: string;
  hasRouteApplicationId: boolean;
  applicationId: number | null;
}

export const shouldLoadMediaLicenseProfile = ({
  routeAction,
  hasRouteApplicationId,
  applicationId,
}: MediaLicenseProfileLoadContext): boolean =>
  !(
    PERMITS_LICENSE_ACTIONS.has(routeAction) &&
    !hasRouteApplicationId &&
    !applicationId
  );
