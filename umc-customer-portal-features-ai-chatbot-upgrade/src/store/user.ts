import create from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserAllApproveProfiles } from '@/services/userProfile'
import { AUTH_USER_STORAGE_KEY } from '@/storage/authStorage'
import { migrateLegacyAuthStorage } from '@/storage/migrateLegacyAuthStorage'

migrateLegacyAuthStorage()

interface IListRole{
    descAr: string | null;
    descEn: string | null;
    discriminator: string;
    id: string;
    isShown: boolean;
    name: string;
    nameAr: string;
    nameEn: string;
    users: unknown[];
}

/** Raw UserProfile.Status returned by the API: "3" approved, "5" expired. */
export const EXPIRED_PROFILE_STATUS = '5';

export const isExpiredProfileStatus = (status?: string | null) =>
  String(status ?? '').trim() === EXPIRED_PROFILE_STATUS;

interface IdentityData {
    id: number;
    name: string;
    photoUrl: string;
    userProfileId: string;
    userTypeId: string;
    email: string;
    profileStatus?: string | null;
}
interface IuserEstablishments{
  establishmentUrl: string | null;
  id: number;
  nameAr: string;
  nameEn: string;
  userProfileId: string;
  userTypeId: string;
  userTypeCode?: string | null;
  email: string;
  profileStatus?: string | null;
}
export interface IUser{
    id: string;
    /** Mirrors `id` when API payloads use camelCase (e.g. after merge). */
    userId?: string;
    /** Mirrors `id` when API payloads use PascalCase. */
    userID?: string;
    email: string;
    firstName: string;
    lastName: string;
    /** UAE Pass / API bilingual name parts (optional). */
    firstnameEN?: string;
    lastnameEN?: string;
    firstnameAR?: string;
    lastnameAR?: string;
    listRoles: IListRole[];
    listUserFilter: null;
    listUserProfile: null;
    phoneNumber: null;
    token: string;
    userInvitation: IdentityData;
    userEstablishments: IuserEstablishments[];
    isFirstLogin: boolean;
    isTestAccount?: boolean;
    createOn: string;
    isGuidePageVisible?: boolean;
    currentUserProfileId?: string | number | null;
    currentUserTypeId?: string | number | null;
}

export interface ApprovedProfilesData {
  userInvitation?: (Partial<IdentityData> & { userProfileId?: string | null }) | null;
  userEstablishments?: IuserEstablishments[];
  pendingModificationList?: unknown[] | null;
  pendingPaymentList?: unknown[] | null;
  rejectedList?: unknown[] | null;
  isFirstLogin?: boolean;
}

const initialUserValues: IUser = {
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    listRoles: [],
    userEstablishments: [],
    userInvitation: {} as IdentityData,
    isFirstLogin: false,
    listUserFilter: null,
    listUserProfile: null,
    phoneNumber: null,
    token: '',
    createOn: ''
}

const normalizeCurrentIdentityValue = (
  value?: string | number | null,
): string => String(value ?? '').trim();

export const GLOBAL_PROFILE_ID = '0';
export const GLOBAL_USER_TYPE_CODE = 'GLOBAL';
const JWT_PROFILE_ID_CLAIM = 'UserProFileId';

const parseJwtPayload = (
  token?: string | null,
): Record<string, unknown> | null => {
  const payload = String(token || '').split('.')[1];

  if (!payload || typeof globalThis.atob !== 'function') {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const decodedPayload = globalThis.atob(paddedPayload);
    const jsonPayload = decodeURIComponent(
      Array.from(decodedPayload)
        .map((character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`,
        )
        .join(''),
    );

    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const isGlobalToken = (token?: string | null): boolean => {
  const claims = parseJwtPayload(token);
  const profileId = normalizeCurrentIdentityValue(
    claims?.[JWT_PROFILE_ID_CLAIM] as string | number | null,
  );

  // Profileless logins use profile ID 0 with a user type code of 0.
  return profileId === GLOBAL_PROFILE_ID;
};

export const isGlobalProfileId = (
  profileId?: string | number | null,
): boolean => normalizeCurrentIdentityValue(profileId) === GLOBAL_PROFILE_ID;

export interface UserStore {
  userInfo: IUser
  currentProfileId: string
  identityVersion: number
  approvedProfilesStatus: 'idle' | 'loaded' | 'failed'
  approvedProfilesUserId: string
  setData: (data: IUser) => void
  setCurrentProfileId: (id: string) => void
  setCurrentIdentity: (
    profileId?: string | number | null,
    userTypeId?: string | number | null,
  ) => void
  setGlobalIdentity: () => void
  refreshIdentityContext: () => void
  refreshApprovedProfiles: (userId?: string) => Promise<ApprovedProfilesData>
  resetUserInfo: () => void
}

const normalizeIdentityData = (
  invitation?: ApprovedProfilesData['userInvitation'],
): IdentityData =>
  ({
    id: invitation?.id || 0,
    name: invitation?.name || '',
    photoUrl: invitation?.photoUrl || '',
    userProfileId: invitation?.userProfileId
      ? String(invitation.userProfileId)
      : '',
    userTypeId: invitation?.userTypeId ? String(invitation.userTypeId) : '',
    email: invitation?.email || '',
    profileStatus: invitation?.profileStatus ?? null,
  }) as IdentityData;

const normalizeEstablishments = (
  establishments?: IuserEstablishments[],
): IuserEstablishments[] =>
  (establishments || []).map((item) => ({
    ...item,
    establishmentUrl: item.establishmentUrl ?? null,
    userProfileId: item.userProfileId ? String(item.userProfileId) : '',
    userTypeId: item.userTypeId ? String(item.userTypeId) : '',
    email: item.email || '',
    profileStatus: item.profileStatus ?? null,
  }));

export const useUserStore = create<UserStore>(
  persist(
    (set, get) => ({
      userInfo: initialUserValues,
      currentProfileId: '',
      identityVersion: 0,
      approvedProfilesStatus: 'idle',
      approvedProfilesUserId: '',
      setData: (data: IUser) =>
        set((state) => {
          const isIncomingGlobalToken = isGlobalToken(data.token);
          const incomingProfileId = normalizeCurrentIdentityValue(
            data.currentUserProfileId,
          );
          const incomingUserTypeId = normalizeCurrentIdentityValue(
            data.currentUserTypeId,
          );
          const currentProfileId =
            (isIncomingGlobalToken ? GLOBAL_PROFILE_ID : incomingProfileId) ||
            normalizeCurrentIdentityValue(state.userInfo.currentUserProfileId) ||
            state.currentProfileId;
          const currentUserTypeId =
            isIncomingGlobalToken || isGlobalProfileId(currentProfileId)
              ? GLOBAL_USER_TYPE_CODE
              : incomingUserTypeId ||
                normalizeCurrentIdentityValue(state.userInfo.currentUserTypeId);
          const isSameUserSession =
            normalizeCurrentIdentityValue(state.userInfo.id) ===
              normalizeCurrentIdentityValue(data.id) &&
            state.userInfo.token === data.token;

          return {
            userInfo: {
              ...data,
              ...(currentProfileId
                ? { currentUserProfileId: currentProfileId }
                : {}),
              ...(currentUserTypeId
                ? { currentUserTypeId: currentUserTypeId }
                : {}),
            },
            currentProfileId: currentProfileId || state.currentProfileId,
            approvedProfilesStatus: isSameUserSession
              ? state.approvedProfilesStatus
              : 'idle',
            approvedProfilesUserId: isSameUserSession
              ? state.approvedProfilesUserId
              : '',
          };
        }),
      setCurrentProfileId: (id: string) =>
        set((state) => ({
          currentProfileId: id,
          userInfo: {
            ...state.userInfo,
            currentUserProfileId: id,
            ...(isGlobalProfileId(id)
              ? { currentUserTypeId: GLOBAL_USER_TYPE_CODE }
              : {}),
          },
        })),
      setCurrentIdentity: (profileId, userTypeId) =>
        set((state) => {
          const currentUserProfileId =
            normalizeCurrentIdentityValue(profileId);
          const currentUserTypeId = normalizeCurrentIdentityValue(userTypeId);

          if (!currentUserProfileId || !currentUserTypeId) {
            return {
              currentProfileId: state.currentProfileId,
              userInfo: state.userInfo,
            };
          }

          return {
            currentProfileId: currentUserProfileId,
            userInfo: {
              ...state.userInfo,
              currentUserProfileId,
              currentUserTypeId,
            },
          };
        }),
      setGlobalIdentity: () =>
        set((state) => ({
          currentProfileId: GLOBAL_PROFILE_ID,
          userInfo: {
            ...state.userInfo,
            currentUserProfileId: GLOBAL_PROFILE_ID,
            currentUserTypeId: GLOBAL_USER_TYPE_CODE,
          },
        })),
      refreshIdentityContext: () =>
        set((state) => ({
          identityVersion: state.identityVersion + 1,
          approvedProfilesStatus: 'idle',
          approvedProfilesUserId: '',
        })),
      refreshApprovedProfiles: async (userId?: string) => {
        const initialState = get();
        const targetUserId = userId || initialState.userInfo.id;
        const targetUserToken = initialState.userInfo.token;

        if (!targetUserId) {
          return {
            userInvitation: initialState.userInfo.userInvitation,
            userEstablishments: initialState.userInfo.userEstablishments,
          };
        }

        try {
          const response = await getUserAllApproveProfiles(targetUserId);
          const responseData = (response.data || {}) as unknown as ApprovedProfilesData;
          const data: ApprovedProfilesData = {
            userInvitation: responseData.userInvitation
              ? normalizeIdentityData(responseData.userInvitation)
              : null,
            userEstablishments: normalizeEstablishments(
              responseData.userEstablishments,
            ),
            pendingModificationList: responseData.pendingModificationList,
            pendingPaymentList: responseData.pendingPaymentList,
            rejectedList: responseData.rejectedList,
          };
          const latestState = get();

          if (
            normalizeCurrentIdentityValue(latestState.userInfo.id) !==
              normalizeCurrentIdentityValue(targetUserId) ||
            latestState.userInfo.token !== targetUserToken
          ) {
            return data;
          }

          const nextUserInfo: IUser = {
            ...latestState.userInfo,
            userInvitation: (data.userInvitation || {}) as IdentityData,
            userEstablishments: data.userEstablishments || [],
            isFirstLogin: responseData?.isFirstLogin || false,
          };

          set({
            userInfo: nextUserInfo,
            approvedProfilesStatus: 'loaded',
            approvedProfilesUserId: targetUserId,
          });

          return data;
        } catch (error) {
          const latestState = get();

          if (
            normalizeCurrentIdentityValue(latestState.userInfo.id) ===
              normalizeCurrentIdentityValue(targetUserId) &&
            latestState.userInfo.token === targetUserToken
          ) {
            set({
              approvedProfilesStatus: 'failed',
              approvedProfilesUserId: targetUserId,
            });
          }

          throw error;
        }
      },
      resetUserInfo: () =>
        set({
          userInfo: initialUserValues,
          currentProfileId: '',
          identityVersion: 0,
          approvedProfilesStatus: 'idle',
          approvedProfilesUserId: '',
        }),
    }),
    {
      name: AUTH_USER_STORAGE_KEY, // name of the item in the storage (must be unique)
      getStorage: () => localStorage, // (optional) by default, 'localStorage' is used
    },
  ),
)
