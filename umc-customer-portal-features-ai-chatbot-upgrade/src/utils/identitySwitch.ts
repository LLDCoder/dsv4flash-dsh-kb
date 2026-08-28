import { TIME } from "@/config/constants";
import authStorage from "@/storage/authStorage";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { useUpdateFormStore } from "@/store/update-form";
import { useUserStore } from "@/store/user";
import {
  AUTH_SESSION_SYNC_ACTION,
  publishAuthSessionSync,
} from "@/utils/authSessionSync";
import { toApi } from "@/utils/gstTime";
import { updateProfileSwitchSession } from "@/utils/profileSwitchSession";
 
export interface CompleteIdentitySwitchParams {
  token: string;
  userProfileId: string | number;
  userTypeId: string | number;
  sessionId?: string;
}

export function clearIdentityScopedBusinessContext(): void {
  useUpdateFormStore.getState().resetUpdateForm();
  useLicenseLifecycleSourceStore.getState().clearLicenseLifecycleSource();
}
 
export function completeIdentitySwitch({
  token,
  userProfileId,
  userTypeId,
  sessionId,
}: CompleteIdentitySwitchParams): void {
  const normalizedToken = String(token || "").trim();
  const normalizedProfileId = String(userProfileId ?? "").trim();
  const normalizedUserTypeId = String(userTypeId ?? "").trim();
 
  if (!normalizedToken) {
    throw new Error("ChangeIdentity did not return a token");
  }
 
  if (!normalizedProfileId || !normalizedUserTypeId) {
    throw new Error("Identity switch did not provide a valid identity");
  }
 
  const remember = authStorage.getStorageType() === "local";
  authStorage.setTokenInfo({
    token: normalizedToken,
    refreshToken: "",
    expiresIn: TIME.REFRESH_TOKEN_EXPIRE,
    remember,
  });
 
  const currentUserInfo = useUserStore.getState().userInfo;
  useUserStore.getState().setData({
    ...currentUserInfo,
    token: normalizedToken,
    currentUserProfileId: normalizedProfileId,
    currentUserTypeId: normalizedUserTypeId,
  });
  useUserStore.getState().setCurrentIdentity(
    normalizedProfileId,
    normalizedUserTypeId,
  );
  useUserStore.getState().refreshIdentityContext();

  clearIdentityScopedBusinessContext();
 
  updateProfileSwitchSession({
    tokenPersistedAt: toApi(new Date()),
    toProfileId: normalizedProfileId,
    toUserTypeId: normalizedUserTypeId,
  }, sessionId);
  publishAuthSessionSync(AUTH_SESSION_SYNC_ACTION.SWITCH_IDENTITY);
}
