import { useState, useEffect, useRef, type WheelEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "antd";
import { CustomButton, CustomMessage } from "@/components/common";
import SearchBar from "@/assets/icons/SearchBar";
import GlobalViewIcon from "@/assets/images/global-view-icon.svg";
import {
  GLOBAL_PROFILE_ID,
  GLOBAL_USER_TYPE_CODE,
  isExpiredProfileStatus,
  isGlobalProfileId,
  useUserStore,
} from "@/store/user";
import { useProfileSwitchGuardStore } from "@/store/profileSwitchGuard";
import { userChangeIdentity } from "@/services/userProfile";
import { userEnterGlobalView } from "@/services/globalView";
import { getPendingActionCounts } from "@/services/homePage";
import "./index.less";
import { completeIdentitySwitch } from "@/utils/identitySwitch";
import { useHistory } from "react-router-dom";
import {
  getProfileAvatarFallback,
  resolveProfileAvatar,
} from "@/utils/profileAvatar";
import type { ApprovedProfilesData } from "@/store/user";
import {
  finishProfileSwitchSession,
  startProfileSwitchSession,
} from "@/utils/profileSwitchSession";
import SimpleBar from "@/components/SimpleBar";

interface IdentitysPopoverProps {
  visible: boolean;
  onClose: () => void;
}
interface EstablishmentItem {
  id: number;
  nameEn: string;
  nameAr: string;
  userProfileId: string;
  userTypeId: string;
  userTypeCode?: string | null;
  establishmentUrl?: string | null;
  actionNum?: number;
  profileStatus?: string | null;
}

interface IdentityData {
  id: number;
  name: string;
  photoUrl: string;
  userProfileId: string | null;
  userTypeId: string;
  actionNum?: number;
  profileStatus?: string | null;
}

interface PendingActionsData {
  pendingModificationList?: unknown[] | null;
  pendingPaymentList?: unknown[] | null;
  rejectedList?: unknown[] | null;
}

type PendingActionCountMap = Record<string, number>;

const normalizeProfileId = (value?: string | number | null) =>
  String(value ?? "").trim();

const countPendingActions = (data?: PendingActionsData | null) =>
  (data?.pendingModificationList?.length || 0) +
  (data?.pendingPaymentList?.length || 0) +
  (data?.rejectedList?.length || 0);

const buildPendingActionCountMap = (
  items?: Array<{
    profileId?: string | number | null;
    count?: number | null;
  }> | null,
): PendingActionCountMap =>
  (items || []).reduce<PendingActionCountMap>((acc, item) => {
    const profileId = normalizeProfileId(item.profileId);

    if (profileId) {
      acc[profileId] = Number(item.count || 0);
    }

    return acc;
  }, {});

export default function IdentitysPopover({
  visible,
  onClose,
}: IdentitysPopoverProps) {
  const userInfo = useUserStore((state) => state.userInfo);
  const crrentUser = useUserStore((state) => state.currentProfileId);
  const [establishmentList, setEstablishmentList] = useState<
    EstablishmentItem[]
  >([]);
  const [searchList, setSearchList] = useState<EstablishmentItem[]>([]);
  const [showIndividual, setShowIndividual] = useState(true);
  const [switchingProfileId, setSwitchingProfileId] = useState<string | null>(
    null,
  );
  const [switchingGlobal, setSwitchingGlobal] = useState(false);
  const isMountedRef = useRef(true);
  const [identityData, setIdentityData] = useState<IdentityData>({
    id: 0,
    name: "",
    photoUrl: "",
    userProfileId: "",
    userTypeId: "",
    actionNum: 0,
  });
  const refreshApprovedProfiles = useUserStore(
    (state) => state.refreshApprovedProfiles,
  );
  const confirmProfileSwitch = useProfileSwitchGuardStore(
    (state) => state.confirmSwitch,
  );
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const isArabic = i18n.language.toLowerCase().startsWith("ar");
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getDefaultIdentityName = () =>
    [userInfo?.firstName, userInfo?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  const getEstablishmentDisplayName = (item: Partial<EstablishmentItem>) => {
    const preferredName = isArabic ? item.nameAr : item.nameEn;
    const fallbackName = isArabic ? item.nameEn : item.nameAr;

    return String(preferredName || fallbackName || "").trim();
  };

  const normalizeSearchValue = (value?: string | null) =>
    String(value || "").trim().toLowerCase();

  const applyProfilesToList = async (
    data: ApprovedProfilesData,
    shouldApply = () => true,
  ) => {
    if (!shouldApply()) {
      return;
    }

    let pendingActionCounts: PendingActionCountMap | null = null;

    try {
      const response = await getPendingActionCounts();
      pendingActionCounts = buildPendingActionCountMap(response.data);
    } catch (error) {
      console.error("getPendingActionCounts", error);
      CustomMessage.error(t("common.requestFailed"));
    }

    if (!shouldApply()) {
      return;
    }

    if (data.userInvitation?.userProfileId) {
      const invitation = data.userInvitation;
      const profileId = normalizeProfileId(invitation.userProfileId);

      setIdentityData({
        id: invitation.id || 0,
        name: invitation.name || "",
        photoUrl: invitation.photoUrl || "",
        userProfileId: invitation.userProfileId || null,
        userTypeId: invitation.userTypeId || "",
        profileStatus: invitation.profileStatus ?? null,
        actionNum:
          pendingActionCounts?.[profileId] ??
          identityData.actionNum ??
          countPendingActions({
            pendingModificationList: data.pendingModificationList,
            pendingPaymentList: data.pendingPaymentList,
            rejectedList: data.rejectedList,
          }),
      });
    } else {
      setIdentityData({
        id: 0,
        name: "",
        photoUrl: "",
        userProfileId: null,
        userTypeId: "",
        profileStatus: null,
        actionNum: 0,
      });
    }

    const list = (data.userEstablishments || []).map((item) => {
      const existingItem = establishmentList.find(
        (existing) =>
          normalizeProfileId(existing.userProfileId) ===
          normalizeProfileId(item.userProfileId),
      );
      return {
        ...item,
        actionNum:
          pendingActionCounts?.[normalizeProfileId(item.userProfileId)] ??
          existingItem?.actionNum,
      };
    });
    setEstablishmentList(list);
    setSearchList(list);
  };

  useEffect(() => {
    if (!visible || !userInfo?.id) {
      return;
    }

    let cancelled = false;

    refreshApprovedProfiles(userInfo.id)
      .then((data) => applyProfilesToList(data, () => !cancelled))
      .catch((error) => {
        console.error("refreshApprovedProfiles", error);
        CustomMessage.error(t("common.requestFailed"));
      });

    return () => {
      cancelled = true;
    };
  }, [visible, userInfo?.id, refreshApprovedProfiles, t]);
  if (!visible) return null;
  const establishments = searchList.map((item) => {
    const isSwitching = switchingProfileId === String(item.userProfileId);
    // Expired profiles stay in the list and stay switchable (the owner has to open one to renew it);
    // they are only dimmed and tagged so the state is obvious before switching.
    const isExpired = isExpiredProfileStatus(item.profileStatus);
    const displayName = getEstablishmentDisplayName(item);
    const fallbackAvatar = getProfileAvatarFallback({
      kind: "establishment",
      userTypeId: item.userTypeId,
      userTypeCode: item.userTypeCode,
    });

    return (
      <div
        className={`establishment-item ${
          crrentUser == item.userProfileId ? "active-item" : ""
        } ${isSwitching ? "establishment-item--switching" : ""} ${
          isExpired ? "profile-item--expired" : ""
        }`}
        key={item.id}
        onClick={() => changeIdentity(item.userProfileId, item.userTypeId)}
        aria-disabled={isSwitching}
      >
        <img
          src={resolveProfileAvatar(item.establishmentUrl, fallbackAvatar)}
          alt=""
          onError={(event) => {
            if (event.currentTarget.dataset.fallbackApplied === "true") {
              return;
            }
            event.currentTarget.dataset.fallbackApplied = "true";
            event.currentTarget.src = fallbackAvatar;
          }}
        />
        <div className="item-name">{displayName}</div>
        {isExpired ? (
          <div className="expired-tag">{t("identitysPopover.expired")}</div>
        ) : null}
        {item.actionNum ? (
          <div className="pengding-num">
            {item.actionNum}{" "}
            <span>{t("identitysPopover.pendingActionsLabel")}</span>
          </div>
        ) : null}
      </div>
    );
  });
  const searchProfile = (value: string) => {
    const keyword = normalizeSearchValue(value);

    if (!keyword) {
      setSearchList(establishmentList);
      setShowIndividual(true);
      return;
    }

    const identityName = normalizeSearchValue(
      identityData.name || getDefaultIdentityName(),
    );

    setShowIndividual(identityName.includes(keyword));

    const list = establishmentList.filter((item) =>
      [
        getEstablishmentDisplayName(item),
        item.nameEn,
        item.nameAr,
      ].some((name) => normalizeSearchValue(name).includes(keyword)),
    );

    setSearchList(list);
  };
  const changeIdentity = async (
    userProfileId?: string | null,
    userTypeId?: string | null,
  ) => {
    const targetProfileId = String(userProfileId || "");
    const targetUserTypeId = String(userTypeId || "");

    if (!targetProfileId || !targetUserTypeId || switchingProfileId) {
      return;
    }

    if (String(crrentUser || "") === targetProfileId) {
      onClose();
      return;
    }

    const switchSession = startProfileSwitchSession({
      source: "IdentitysPopover",
      userId: userInfo?.id,
      fromProfileId: String(crrentUser || ""),
      toProfileId: targetProfileId,
      toUserTypeId: targetUserTypeId,
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (!switchSession) {
      return;
    }
    setSwitchingProfileId(targetProfileId);
    let keepProfileSwitchSession = false;

    try {
      const canSwitch = await confirmProfileSwitch({
        profileId: targetProfileId,
        userTypeId: targetUserTypeId,
      });

      if (!canSwitch) {
        finishProfileSwitchSession(
          "cancelled",
          { reason: "switch-guard-returned-false" },
          switchSession.sessionId,
        );
        return;
      }

      const res = await userChangeIdentity({
        userProFileID: targetProfileId,
        userTypeID: targetUserTypeId,
      });
      const changeIdentityData = res.data as { token?: string };
      const token = String(changeIdentityData.token || "").trim();

      if (!token) {
        throw new Error("ChangeIdentity did not return a token");
      }

      keepProfileSwitchSession = true;
      completeIdentitySwitch({
        token,
        userProfileId: targetProfileId,
        userTypeId: targetUserTypeId,
        sessionId: switchSession.sessionId,
      });
      history.replace("/home");
    } catch (error) {
      finishProfileSwitchSession(
        "failed",
        {
          targetProfileId,
          targetUserTypeId,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
        },
        switchSession.sessionId,
      );
      console.error("changeIdentity", error);
      CustomMessage.error(t("common.requestFailed"));
    } finally {
      if (!keepProfileSwitchSession) {
        finishProfileSwitchSession(
          "cancelled",
          {
            reason: "change-identity-finished-without-navigation",
            targetProfileId,
            targetUserTypeId,
          },
          switchSession.sessionId,
        );
      }
      if (isMountedRef.current) {
        setSwitchingProfileId(null);
      }
    }
  };

  const enterGlobalView = async () => {
    if (switchingProfileId || switchingGlobal) {
      return;
    }

    if (isGlobalProfileId(crrentUser)) {
      onClose();
      return;
    }

    const switchSession = startProfileSwitchSession({
      source: "IdentitysPopover",
      userId: userInfo?.id,
      fromProfileId: String(crrentUser || ""),
      toProfileId: GLOBAL_PROFILE_ID,
      toUserTypeId: GLOBAL_USER_TYPE_CODE,
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (!switchSession) {
      return;
    }
    setSwitchingGlobal(true);
    let keepProfileSwitchSession = false;

    try {
      const canSwitch = await confirmProfileSwitch({
        profileId: GLOBAL_PROFILE_ID,
        userTypeId: GLOBAL_USER_TYPE_CODE,
      });

      if (!canSwitch) {
        finishProfileSwitchSession(
          "cancelled",
          { reason: "switch-guard-returned-false" },
          switchSession.sessionId,
        );
        return;
      }

      const res = await userEnterGlobalView();
      const globalViewData = res.data as { token?: string };
      const token = String(globalViewData.token || "").trim();

      if (!token) {
        throw new Error("EnterGlobalView did not return a token");
      }

      keepProfileSwitchSession = true;
      completeIdentitySwitch({
        token,
        userProfileId: GLOBAL_PROFILE_ID,
        userTypeId: GLOBAL_USER_TYPE_CODE,
        sessionId: switchSession.sessionId,
      });
    } catch (error) {
      finishProfileSwitchSession(
        "failed",
        {
          targetProfileId: GLOBAL_PROFILE_ID,
          targetUserTypeId: GLOBAL_USER_TYPE_CODE,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
        },
        switchSession.sessionId,
      );
      console.error("enterGlobalView", error);
      CustomMessage.error(t("common.requestFailed"));
    } finally {
      if (!keepProfileSwitchSession) {
        finishProfileSwitchSession(
          "cancelled",
          {
            reason: "enter-global-view-finished-without-navigation",
            targetProfileId: GLOBAL_PROFILE_ID,
            targetUserTypeId: GLOBAL_USER_TYPE_CODE,
          },
          switchSession.sessionId,
        );
      }
      if (isMountedRef.current) {
        setSwitchingGlobal(false);
      }
    }
  };

  const handleOverlayWheel = (event: WheelEvent<HTMLDivElement>) => {
    const scrollContainer = event.currentTarget.closest(
      ".simplebar-content-wrapper",
    );

    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTop += event.deltaY;
    }
  };

  return (
    <>
      <div
        className="identity-overlay"
        onClick={onClose}
        onWheel={handleOverlayWheel}
      />
      <div className="identity-popover" dir={isArabic ? "rtl" : "ltr"}>
        {/* search */}
        <div className="search-box">
          <Input
            prefix={<SearchBar className="filter-search-bar" />}
            allowClear
            placeholder={t("formPlaceholders.common.search")}
            onChange={(e) => searchProfile(e.target.value)}
          />
        </div>
        <div className="global-view-profile">
          <div className="identity-list">
            <div
              className={`identity-item global-view-item ${
                isGlobalProfileId(crrentUser) ? "active-item" : ""
              } ${switchingGlobal ? "identity-item--switching" : ""}`}
              onClick={() => void enterGlobalView()}
              aria-disabled={switchingGlobal}
            >
              <span className="global-view-icon" aria-hidden="true">
                <img src={GlobalViewIcon} alt="" />
              </span>
              <div className="item-name">
                {t("identitysPopover.globalView")}
              </div>
            </div>
          </div>
        </div>
        <div className="dividing-line"></div>
        {/* Individual Profile */}
        <div className="identity-profile">
          <div className="identity-header">
            <div className="profile-title">
              {t("identitysPopover.identityTitle")}
            </div>
            {!identityData.userProfileId && (
              <CustomButton
                text={t("identitysPopover.addProfile")}
                variant="outline"
                customClassName="add-profile-btn"
                onClick={() => {
                  onClose();
                  history.push("/my-account");
                }}
              />
            )}
          </div>
          {identityData.userProfileId && showIndividual && (
            <div className="identity-list">
              <div
                className={`identity-item ${
                  crrentUser == identityData.userProfileId ? "active-item" : ""
                } ${
                  switchingProfileId === String(identityData.userProfileId)
                    ? "identity-item--switching"
                    : ""
                } ${
                  isExpiredProfileStatus(identityData.profileStatus)
                    ? "profile-item--expired"
                    : ""
                }`}
                onClick={() =>
                  changeIdentity(
                    identityData.userProfileId,
                    identityData.userTypeId,
                  )
                }
                aria-disabled={
                  switchingProfileId === String(identityData.userProfileId)
                }
              >
                <img
                  src={resolveProfileAvatar(
                    identityData.photoUrl,
                    getProfileAvatarFallback({ kind: "individual" }),
                  )}
                  alt=""
                  onError={(event) => {
                    if (event.currentTarget.dataset.fallbackApplied === "true") {
                      return;
                    }
                    event.currentTarget.dataset.fallbackApplied = "true";
                    event.currentTarget.src = getProfileAvatarFallback({
                      kind: "individual",
                    });
                  }}
                />
                <div className="item-name">
                  {identityData.name || getDefaultIdentityName()}
                </div>
                {isExpiredProfileStatus(identityData.profileStatus) ? (
                  <div className="expired-tag">
                    {t("identitysPopover.expired")}
                  </div>
                ) : null}
                {identityData.actionNum ? (
                  <div className="pengding-num">
                    {identityData.actionNum}{" "}
                    <span>{t("identitysPopover.pendingActionsLabel")}</span>
                  </div>
                ) : null}
                {/* {identityData.actionNum ?  : null} */}
              </div>
            </div>
          )}
        </div>
        <div className="dividing-line"></div>
        {/* Establishment Profile */}
        <div className="establishment-profile">
          <div className="establishment-header">
            <div className="profile-title">
              {t("identitysPopover.establishmentTitle")}
            </div>
            <CustomButton
              text={t("identitysPopover.addProfile")}
              variant="outline"
              customClassName="add-profile-btn"
              onClick={() => {
                onClose();
                history.push("/my-account/establishment-profile?mode=add");
              }}
            />
          </div>
          <SimpleBar className="establishment-list">
            {establishments}
          </SimpleBar>
        </div>
      </div>
    </>
  );
}
