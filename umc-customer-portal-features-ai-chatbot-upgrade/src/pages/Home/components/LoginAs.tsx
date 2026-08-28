import { Modal, Spin, Tooltip } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoginAsSearchBar from "@/assets/icons/LoginAsSearchBar";
import avatar1 from "@/assets/images/avatar1.png";
import ArraowRight from "@/assets/images/arrow-right.png";
import { useTranslation } from "react-i18next";
import {
  GLOBAL_PROFILE_ID,
  GLOBAL_USER_TYPE_CODE,
  isExpiredProfileStatus,
  isGlobalProfileId,
  useUserStore,
  type IUser,
} from "@/store/user";
import { userChangeIdentity } from "@/services/userProfile";
import { userEnterGlobalView } from "@/services/globalView";
import { APPLICATION_STATUS_ID } from "@/config/constants";
import debounce from "lodash/debounce";
import { resolveFileUrl } from "@/utils/url";
import {
  getProfileAvatarFallback,
  resolveProfileAvatar,
} from "@/utils/profileAvatar";
import { getPendingAcctions, getPendingActionCounts } from "@/services/homePage";
import CustomStatusTag from "@/components/common/CustomStatusTag";
import { ComfirmModal, CustomButton, CustomMessage } from "@/components/common";
import { useHistory, useLocation } from "react-router-dom";
import { useServicesStore } from "@/store/services";
import { cancelApplication, getApplicationDetail } from "@/services/myRequest";
import {
  getActionNeeded,
  validatePermitAction,
  type LicensePermitActionNeededItemDto,
  type LicensePermitValidateResponse,
} from "@/services/permitsLicense";
import request from "@/utils/request";
import ScrollBox from "../../../components/common/ScrollBox";
import clamp2 from "@/utils/clamp2";
import {
  licensePermitListDisplayName,
  pendingActionServiceDisplayName,
} from "@/utils/bilingualDisplay";
import {
  createPermitActionPath,
  createServiceApplicationActionPath,
  resolvePermitActionApplicationId,
} from "@/utils/permitActionPath";
import {
  createLicenseLifecycleRouteState,
  createLicenseLifecycleSource,
} from "@/utils/licenseLifecycleSource";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import { useUpdateFormStore } from "@/store/update-form";
import {
  isServiceEntryGateEnabled,
  openServiceWithGate,
} from "@/utils/serviceEntryGate";
import { useServiceEntryGateDialogController } from "@/components/ServiceEntryGate";
import SimpleBar from "@/components/SimpleBar";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import { normalizeHomeRenewalDocumentType } from "../utils";
import { resolveLoginAsEntry } from "./loginAsEntry";
import { completeIdentitySwitch } from "@/utils/identitySwitch";
import {
  finishProfileSwitchSession,
  startProfileSwitchSession,
} from "@/utils/profileSwitchSession";
import "./LoginAs.less";
interface ApplicationItem {
  applicationId: number;
  applicationDetailId: number;
  applicationStatusId: number;
  status?: string | null;
  expireLabel?: string | null;
  expiredDate?: string | null;
  applicationStatusEn?: string;
  applicationStatusAr?: string;
  applicationStatusNameEn?: string;
  applicationStatusNameAr?: string;
  serviceId?: number | null;
  serviceCode?: string | null;
  serviceNameEn: string;
  serviceNameAr: string;
  userProfileId?: string | number;
}

interface PendingActionsData {
  pendingPaymentList?: ApplicationItem[] | null;
  pendingModificationList?: ApplicationItem[] | null;
  rejectedList?: ApplicationItem[] | null;
  draftList?: ApplicationItem[] | null;
  pendingDispositionList?: ApplicationItem[] | null;
}

type EstablishmentWithServices = IUser["userEstablishments"][number] & {
  ServicesList: ApplicationItem[];
};

type PendingActionsMap = Record<string, ApplicationItem[]>;
type PendingActionCountsMap = Record<string, number>;
type PendingRenewalActionsMap = Record<
  string,
  LicensePermitActionNeededItemDto[]
>;

type IdentitySwitchParams = {
  userTypeID: string;
  userProFileID: string;
};

type IdentitySwitchInput = {
  userTypeID?: string | number | null;
  userProFileID?: string | number | null;
};

const ACTION_EXPIRE_STATUS = {
  expired: "EXPIRED",
  expireSoon: "EXPIRE_SOON",
} as const;

const LICENSE_PERMIT_NO_REQUIRED_SERVICE_IDS = new Set([
  1802, 802, 804, 806, 1202, 1204, 1205, 80022, 80042, 80021, 80041,
]);

function normalizeIdentityParam(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeActionStatus(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function getActionExpireTag(item: {
  status?: string | null;
  expireLabel?: string | null;
}) {
  const status = normalizeActionStatus(item.status);
  const label = normalizeIdentityParam(item.expireLabel);

  if (!label) {
    return null;
  }

  if (status === ACTION_EXPIRE_STATUS.expired) {
    return {
      label,
      className: "login-as-expire-tag login-as-expire-tag--expired",
    };
  }

  if (status === ACTION_EXPIRE_STATUS.expireSoon) {
    return {
      label,
      className: "login-as-expire-tag login-as-expire-tag--expire-soon",
    };
  }

  return null;
}

function normalizeLicensePermitNo(value?: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized && normalized !== "-" ? normalized : undefined;
}

function isInProgressValidationResult(result: LicensePermitValidateResponse) {
  if (result.inProgressApplicationType) {
    return true;
  }

  const normalizedText = [result.reasonCode, result.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return (
    normalizedText.includes("in progress") ||
    normalizedText.includes("under review") ||
    normalizedText.includes("pending payment")
  );
}

function normalizeProfileId(value: unknown) {
  return String(value ?? "").trim();
}

function buildPendingActionCountsMap(
  items?: Array<{
    profileId?: string | number | null;
    count?: number | null;
  }> | null,
): PendingActionCountsMap {
  return (items || []).reduce<PendingActionCountsMap>((acc, item) => {
    const profileId = normalizeProfileId(item.profileId);

    if (profileId) {
      acc[profileId] = Number(item.count || 0);
    }

    return acc;
  }, {});
}

function buildPendingRenewalActionsMap(
  items?: LicensePermitActionNeededItemDto[] | null,
): PendingRenewalActionsMap {
  return (items || []).reduce<PendingRenewalActionsMap>((acc, item) => {
    const profileId = normalizeProfileId(item.profileId);

    if (profileId) {
      (acc[profileId] ||= []).push(item);
    }

    return acc;
  }, {});
}

function buildIdentitySwitchParams(
  profileId: unknown,
  userTypeId: unknown,
): IdentitySwitchParams | null {
  const userProFileID = normalizeIdentityParam(profileId);
  const userTypeID = normalizeIdentityParam(userTypeId);

  if (!userProFileID || !userTypeID) {
    return null;
  }

  return {
    userTypeID,
    userProFileID,
  };
}

function EllipsisTooltipText({
  className,
  placement = "top",
  text,
  twoLine = false,
}: {
  className: string;
  placement?: "top" | "topLeft";
  text: string;
  twoLine?: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleRef = (node: HTMLDivElement | null) => {
    if (!node) return;

    if (twoLine) {
      node.dataset.originalText = text;
      node.textContent = text;
      clamp2(node);
    }

    const hasEllipsis =
      node.textContent !== text ||
      node.scrollWidth > node.clientWidth ||
      node.scrollHeight > node.clientHeight;

    setShowTooltip((current) =>
      current === hasEllipsis ? current : hasEllipsis,
    );
  };

  return (
    <Tooltip placement={placement} title={showTooltip ? text : null}>
      <div className={className} ref={handleRef}>
        {text}
      </div>
    </Tooltip>
  );
}

function buildEstablishmentsWithServices(
  establishments: IUser["userEstablishments"] = [],
  pendingActionsByProfileId: PendingActionsMap = {},
): EstablishmentWithServices[] {
  return establishments.map((item) => ({
    ...item,
    ServicesList:
      pendingActionsByProfileId[normalizeProfileId(item.userProfileId)] ??
      [
        // {
        //   applicationId: 10,
        //   applicationDetailId: 10,
        //   applicationStatusId: 10,
        //   applicationStatusNameEn: "Expired",
        //   applicationStatusNameAr: "string ar",
        //   serviceNameEn: "Issuing a Magazine/Newspaper License",
        //   serviceNameAr: "string",
        //   userProfileId: 0,
        // },
      ],
  }));
}

function getSafeApplicationList(
  value?: ApplicationItem[] | null,
): ApplicationItem[] {
  return Array.isArray(value)
    ? value.filter((item): item is ApplicationItem => Boolean(item))
    : [];
}

function buildPendingActionsList(
  pendingData?: PendingActionsData | null,
): ApplicationItem[] {
  return [
    ...getSafeApplicationList(pendingData?.pendingPaymentList),
    ...getSafeApplicationList(pendingData?.pendingModificationList),
    ...getSafeApplicationList(pendingData?.rejectedList),
    ...getSafeApplicationList(pendingData?.draftList),
    ...getSafeApplicationList(pendingData?.pendingDispositionList),
  ];
}

function buildPendingProfileIds(userInfo?: IUser | null): string[] {
  const profileIds = [
    normalizeProfileId(userInfo?.userInvitation?.userProfileId),
    ...(userInfo?.userEstablishments ?? []).map((item) =>
      normalizeProfileId(item?.userProfileId),
    ),
  ];

  return Array.from(new Set(profileIds.filter(Boolean)));
}

export type LoginAsProps = {
  /** When set, controls modal visibility; otherwise uses `loginAs` localStorage gate. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function resolveLoginAsVisible(open: boolean | undefined) {
  if (open !== undefined) {
    return open;
  }
  return localStorage.getItem("loginAs") !== "yes";
}

function matchesSearchQuery(
  query: string,
  ...candidates: (string | null | undefined)[]
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return candidates.some((candidate) =>
    String(candidate ?? "")
      .trim()
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export default function LoginAs({ open, onOpenChange }: LoginAsProps = {}) {
  const { t, i18n } = useTranslation();
  const [, update] = useState({});
  const userInfo = useUserStore((state) => state.userInfo);
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const approvedProfilesStatus = useUserStore(
    (state) => state.approvedProfilesStatus,
  );
  const approvedProfilesUserId = useUserStore(
    (state) => state.approvedProfilesUserId,
  );
  const isNotEmpty = (o: object | null | undefined): boolean => {
    return !!o && Object.values(o as Record<string, unknown>).length > 0;
  };

  const setGlobalIdentity = useUserStore((state) => state.setGlobalIdentity);
  const refreshApprovedProfiles = useUserStore(
    (state) => state.refreshApprovedProfiles,
  );
  const [loading, setLoading] = useState(false);
  const [searchWord, setSearchWord] = useState("");
  const debouncedSetSearchWord = useMemo(
    () => debounce((value: string) => setSearchWord(value), 500),
    [],
  );
  useEffect(() => {
    return () => {
      debouncedSetSearchWord.cancel();
    };
  }, [debouncedSetSearchWord]);
  const [pendingActions, setPendingActions] = useState<PendingActionsMap>({});
  const [pendingRenewalActions, setPendingRenewalActions] =
    useState<PendingRenewalActionsMap>({});
  const [pendingActionCounts, setPendingActionCounts] =
    useState<PendingActionCountsMap>({});
  const [pendingCountsLoaded, setPendingCountsLoaded] = useState(false);
  const [pendingCountsFailed, setPendingCountsFailed] = useState(false);
  const [renewingDocumentId, setRenewingDocumentId] = useState<string | null>(
    null,
  );
  const renewingDocumentIdRef = useRef<string | null>(null);
  const loginAsGateVisible = resolveLoginAsVisible(open);
  const pendingProfileIds = useMemo(
    () => buildPendingProfileIds(userInfo),
    [userInfo],
  );
  const loginAsEntry = resolveLoginAsEntry({
    gateVisible: loginAsGateVisible,
    profilesStatus: approvedProfilesStatus,
    profilesUserId: approvedProfilesUserId,
    currentUserId: userInfo.id,
    hasProfiles: pendingProfileIds.length > 0,
  });
  const loginAsVisible = loginAsEntry.visible;
  const pendingDetailProfileIds = useMemo(() => {
    if (!pendingCountsLoaded) {
      return [];
    }

    if (pendingCountsFailed) {
      return [];
    }

    return pendingProfileIds.filter(
      (profileId) => (pendingActionCounts[profileId] ?? 0) > 0,
    );
  }, [
    pendingActionCounts,
    pendingCountsFailed,
    pendingCountsLoaded,
    pendingProfileIds,
  ]);
  const establishmentsWithServices = useMemo(
    () =>
      buildEstablishmentsWithServices(
        userInfo?.userEstablishments ?? [],
        pendingActions,
      ),
    [pendingActions, userInfo?.userEstablishments],
  );
  const history = useHistory();
  const location = useLocation();
  const { openDialog, dialogNode } = useServiceEntryGateDialogController();
  const updateServicesId = useServicesStore((state) => state.updateServicesId);
  const updateServicesCode = useServicesStore(
    (state) => state.updateServicesCode,
  );
  const setLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.setLicenseLifecycleSource,
  );
  const clearLicenseLifecycleSource = useLicenseLifecycleSourceStore(
    (state) => state.clearLicenseLifecycleSource,
  );
  const setUpdateForm = useUpdateFormStore((state) => state.setUpdateForm);
  const isMountedRef = useRef(true);
  const switchingRef = useRef(false);
  const [cancelModal, setCancelModal] = useState<{
    visible: boolean;
    id: string;
  }>({
    visible: false,
    id: "",
  });
  async function handleUserClick(
    params: IdentitySwitchInput,
    _reload = true,
  ) {
    void _reload;
    const normalizedParams = buildIdentitySwitchParams(
      params.userProFileID,
      params.userTypeID,
    );

    if (!normalizedParams) {
      CustomMessage.error(t("common.requestFailed"));
      return false;
    }

    if (switchingRef.current) {
      return false;
    }

    switchingRef.current = true;
    setLoading(true);
    let keepProfileSwitchSession = false;
    const switchSession = startProfileSwitchSession({
      source: "HomeLoginAs",
      userId: userInfo.id,
      fromProfileId: currentProfileId,
      toProfileId: normalizedParams.userProFileID,
      toUserTypeId: normalizedParams.userTypeID,
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (!switchSession) {
      switchingRef.current = false;
      setLoading(false);
      return false;
    }
    try {
      const res = await userChangeIdentity(normalizedParams);
      const changeIdentityData = res.data as { token?: string };
      const token = String(changeIdentityData.token || "").trim();

      if (!token) {
        throw new Error("ChangeIdentity did not return a token");
      }

      localStorage.setItem("loginAs", "yes");
      keepProfileSwitchSession = true;
      completeIdentitySwitch({
        token,
        userProfileId: normalizedParams.userProFileID,
        userTypeId: normalizedParams.userTypeID,
        sessionId: switchSession.sessionId,
      });
      return true;
    } catch (error) {
      console.error("handleUserClick", error);
      CustomMessage.error(t("common.requestFailed"));
      return false;
    } finally {
      if (!keepProfileSwitchSession) {
        finishProfileSwitchSession("failed", {
          source: "HomeLoginAs",
          toProfileId: normalizedParams.userProFileID,
          toUserTypeId: normalizedParams.userTypeID,
        }, switchSession.sessionId);
      }
      switchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }

  const handleEnterGlobalView = useCallback(async (_reload = true) => {
    void _reload;
    if (switchingRef.current) {
      return false;
    }

    if (isGlobalProfileId(currentProfileId)) {
      localStorage.setItem("loginAs", "yes");
      onOpenChange?.(false);
      setGlobalIdentity();
      update({});
      return true;
    }

    switchingRef.current = true;
    setLoading(true);
    let keepProfileSwitchSession = false;
    const switchSession = startProfileSwitchSession({
      source: "HomeLoginAsGlobalView",
      userId: userInfo.id,
      fromProfileId: currentProfileId,
      toProfileId: GLOBAL_PROFILE_ID,
      toUserTypeId: GLOBAL_USER_TYPE_CODE,
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (!switchSession) {
      switchingRef.current = false;
      setLoading(false);
      return false;
    }
    try {
      const res = await userEnterGlobalView();
      const globalViewData = res.data as { token?: string };
      const token = String(globalViewData.token || "").trim();

      if (!token) {
        throw new Error("EnterGlobalView did not return a token");
      }

      localStorage.setItem("loginAs", "yes");
      keepProfileSwitchSession = true;
      completeIdentitySwitch({
        token,
        userProfileId: GLOBAL_PROFILE_ID,
        userTypeId: GLOBAL_USER_TYPE_CODE,
        sessionId: switchSession.sessionId,
      });
      return true;
    } catch (error) {
      console.error("handleEnterGlobalView", error);
      CustomMessage.error(t("common.requestFailed"));
      return false;
    } finally {
      if (!keepProfileSwitchSession) {
        finishProfileSwitchSession("failed", {
          source: "HomeLoginAsGlobalView",
          toProfileId: GLOBAL_PROFILE_ID,
          toUserTypeId: GLOBAL_USER_TYPE_CODE,
        }, switchSession.sessionId);
      }
      switchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    currentProfileId,
    onOpenChange,
    refreshApprovedProfiles,
    setGlobalIdentity,
    t,
    userInfo.id,
  ]);

  useEffect(() => {
    if (loginAsEntry.enterGlobalView) {
      void handleEnterGlobalView();
    }
  }, [handleEnterGlobalView, loginAsEntry.enterGlobalView]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!loginAsVisible || pendingProfileIds.length === 0) {
      setPendingActionCounts({});
      setPendingCountsLoaded(true);
      setPendingCountsFailed(false);
      return () => {
        cancelled = true;
      };
    }

    setPendingCountsLoaded(false);
    setPendingCountsFailed(false);

    getPendingActionCounts()
      .then((response) => {
        if (cancelled || !isMountedRef.current) return;

        setPendingActionCounts(buildPendingActionCountsMap(response.data));
        setPendingCountsFailed(false);
      })
      .catch((error) => {
        console.error("getPendingActionCounts", error);
        if (!cancelled && isMountedRef.current) {
          setPendingCountsFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled && isMountedRef.current) {
          setPendingCountsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loginAsVisible, pendingProfileIds]);

  useEffect(() => {
    let cancelled = false;

    if (!pendingCountsLoaded) {
      return () => {
        cancelled = true;
      };
    }

    if (pendingDetailProfileIds.length === 0) {
      if (!pendingCountsFailed) {
        setPendingActions({});
      }
      return () => {
        cancelled = true;
      };
    }

    const loadPendingActions = async () => {
      const pendingResults = await Promise.allSettled(
        pendingDetailProfileIds.map(async (profileId) =>
          getPendingAcctions(profileId),
        ),
      );

      if (cancelled || !isMountedRef.current) return;

      const nextPendingActions = pendingDetailProfileIds.reduce<PendingActionsMap>(
        (acc, profileId, index) => {
          const result = pendingResults[index];

          if (result.status === "fulfilled") {
            const pendingData = result.value.data as
              | PendingActionsData
              | undefined;
            acc[profileId] = buildPendingActionsList(pendingData);
            return acc;
          }

          console.error("getPendingAcctions", result.reason);
          acc[profileId] = [];
          return acc;
        },
        {},
      );

      setPendingActions(nextPendingActions);
    };

    loadPendingActions().catch((error) => {
      console.error("loadPendingActions", error);
      if (!cancelled && isMountedRef.current) {
        setPendingActions({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pendingCountsFailed, pendingCountsLoaded, pendingDetailProfileIds]);

  useEffect(() => {
    let cancelled = false;

    if (!loginAsVisible || pendingDetailProfileIds.length === 0) {
      setPendingRenewalActions({});
      return () => {
        cancelled = true;
      };
    }

    getActionNeeded()
      .then((response) => {
        if (cancelled || !isMountedRef.current) return;
        setPendingRenewalActions(
          buildPendingRenewalActionsMap(response.data),
        );
      })
      .catch((error) => {
        console.error("getActionNeeded", error);
        if (!cancelled && isMountedRef.current) {
          setPendingRenewalActions({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loginAsVisible, pendingDetailProfileIds]);

  const setData = useUserStore((state) => state.setData);
  const handleConfirmCancel = () => {
    if (cancelModal.id) {
      cancelApplication(cancelModal.id).then(() => {
        CustomMessage.success(t("loginAs.cancelSuccess"));
        request.post("/api/User/GetUserInfo").then((res) => {
          if (res.data) {
            setData(res.data as IUser);
          }
        });
      });
    }
  };

  const filteredEstablishments = useMemo(() => {
    if (!searchWord.trim()) {
      return establishmentsWithServices;
    }

    return establishmentsWithServices.filter((item) =>
      matchesSearchQuery(
        searchWord,
        i18n.language.startsWith("ar") ? item.nameAr : item.nameEn,
        item.nameEn,
        item.nameAr,
        item.email,
      ),
    );
  }, [establishmentsWithServices, i18n.language, searchWord]);

  const showIndividualProfile = useMemo(() => {
    const invitation = userInfo?.userInvitation;
    if (!invitation || !isNotEmpty(invitation)) {
      return false;
    }

    if (!searchWord.trim()) {
      return true;
    }

    const displayName =
      invitation.name ??
      `${userInfo.firstName ?? ""} ${userInfo.lastName ?? ""}`.trim();

    return matchesSearchQuery(searchWord, displayName, invitation.email);
  }, [searchWord, userInfo]);

  const hasEstablishments = filteredEstablishments.length > 0;
  const hasVisibleProfiles = showIndividualProfile || hasEstablishments;
  const handEdit = async (
    record: ApplicationItem,
    params: { userProFileID: string; userTypeID: string },
  ) => {
    const applicationId = Number(record.applicationId || 0);
    if (!applicationId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationEditUnavailable"),
      );
      return;
    }

    const switched = await handleUserClick(params, false);
    if (!switched) {
      return;
    }

    let serviceId = Number(record.serviceId || 0);
    let serviceCode = record.serviceCode || "";
    let applicationStatusId: number | null | undefined =
      record.applicationStatusId;

    if (!serviceId) {
      try {
        const detailRes = await getApplicationDetail(applicationId);
        const detail = detailRes.data;
        serviceId = Number(detail?.serviceId || 0);
        serviceCode = serviceCode || detail?.serviceCode || "";
        applicationStatusId =
          detail?.applicationStatusId ?? applicationStatusId;
      } catch (error) {
        console.error("getApplicationDetail", error);
      }
    }

    if (!serviceId) {
      CustomMessage.error(
        t("myRequestsPage.messages.applicationEditUnavailable"),
      );
      return;
    }

    updateServicesCode(serviceCode);
    updateServicesId(serviceId);

    history.push(
      createServiceApplicationActionPath({
        serviceId,
        action: "edit",
        serviceCode,
        applicationId,
        applicationStatusId,
        includeServiceEntryGate: true,
        sourceSearch: history.location.search,
      }),
    );
  };

  const handleRenew = async (
    record: LicensePermitActionNeededItemDto,
    params: { userProFileID: string; userTypeID: string },
  ) => {
    const documentId = String(record.documentId ?? "").trim();
    if (!documentId || renewingDocumentIdRef.current) {
      if (!documentId) {
        CustomMessage.error(
          t("permitsLicensePage.messages.actionUnavailable"),
        );
      }
      return;
    }

    renewingDocumentIdRef.current = documentId;
    setRenewingDocumentId(documentId);
    try {
      const switched = await handleUserClick(params, false);
      if (!switched) {
        return;
      }

      const action = "RENEW";
      const documentType = normalizeHomeRenewalDocumentType(
        record.documentType,
      );
      const licensePermitNo = normalizeLicensePermitNo(
        record.licensePermitNo,
      );
      const actionApplicationId = resolvePermitActionApplicationId(record);
      const lifecycleSource = createLicenseLifecycleSource({
        action,
        documentId,
        documentType,
        licensePermitNo,
        serviceId: record.serviceId ?? null,
        serviceCode: record.serviceCode ?? null,
        sourceServiceCode: record.sourceServiceCode ?? null,
        sourceMedialLicenseId: record.sourceMedialLicenseId ?? null,
        sourceApplicationId: record.sourceApplicationId ?? null,
        sourceApplicationDetailId: record.sourceApplicationDetailId ?? null,
      });
      const routeState = createLicenseLifecycleRouteState(lifecycleSource);

      if (lifecycleSource) {
        setLicenseLifecycleSource(lifecycleSource);
      } else {
        clearLicenseLifecycleSource();
      }

      const shouldRunGate = isServiceEntryGateEnabled(location.search);
      const result = (
        await validatePermitAction({
          documentId,
          documentType,
          action,
        })
      ).data;

      if (!result.isAllowed) {
        if (shouldRunGate && isInProgressValidationResult(result)) {
          CustomMessage.error(
            t("permitsLicensePage.messages.inProgressApplication"),
          );
          return;
        }

        CustomMessage.error(
          t("permitsLicensePage.messages.actionUnavailable"),
        );
        return;
      }

      if (!result.serviceId) {
        CustomMessage.error(
          t("permitsLicensePage.messages.routingUnavailable"),
        );
        return;
      }

      if (
        LICENSE_PERMIT_NO_REQUIRED_SERVICE_IDS.has(result.serviceId) &&
        !licensePermitNo
      ) {
        CustomMessage.error(
          t("permitsLicensePage.messages.licensePermitNumberRequired"),
        );
        return;
      }

      const nextServiceCode = result.serviceCode ?? null;

      if (shouldRunGate) {
        await openServiceWithGate({
          history,
          serviceId: result.serviceId,
          serviceCode: nextServiceCode,
          source: "login-as-renewal",
          openDialog,
          createAllowPath: (payload) =>
            createPermitActionPath({
              serviceId: payload.serviceId,
              action,
              serviceCode: payload.serviceCode ?? nextServiceCode,
              applicationId: actionApplicationId,
              requestType: record.type ?? null,
              includeServiceEntryGate: true,
              sourceSearch: location.search,
            }),
          onBeforeAllowNavigate: (payload) => {
            updateServicesId(payload.serviceId);
            updateServicesCode(payload.serviceCode ?? nextServiceCode);
            setUpdateForm({
              applicationId: actionApplicationId,
              type: record.type ?? null,
            });
          },
          onInProgressApplication: () => {
            CustomMessage.error(
              t("permitsLicensePage.messages.inProgressApplication"),
            );
          },
          extraState: routeState,
        });
        return;
      }

      updateServicesId(result.serviceId);
      updateServicesCode(nextServiceCode);
      setUpdateForm({
        applicationId: actionApplicationId,
        type: record.type ?? null,
      });
      history.push(
        createPermitActionPath({
          serviceId: result.serviceId,
          action,
          serviceCode: nextServiceCode,
          applicationId: actionApplicationId,
          requestType: record.type ?? null,
          includeServiceEntryGate: true,
          sourceSearch: location.search,
        }),
        routeState,
      );
    } catch (error) {
      console.error("handleRenew", error);
      CustomMessage.error(t("permitsLicensePage.messages.actionUnavailable"));
    } finally {
      if (renewingDocumentIdRef.current === documentId) {
        renewingDocumentIdRef.current = null;
      }
      if (isMountedRef.current) {
        setRenewingDocumentId(null);
      }
    }
  };

  function getAction(
    applicationStatusId: number,
    record: ApplicationItem,
    params: { userProFileID: string; userTypeID: string },
  ) {
    if (applicationStatusId === APPLICATION_STATUS_ID.pendingPayment) {
      return (
        <CustomButton
          text={t("loginAs.payNow")}
          variant="primary"
          size="small"
          customClassName="login-as-action-btn"
          onClick={async () => {
            const switched = await handleUserClick(params, false);
            if (switched) {
              history.push(`/my-requests/detail?id=${record.applicationId}`);
            }
          }}
        />
      );
    }
    if (
      applicationStatusId === APPLICATION_STATUS_ID.pendingModification ||
      applicationStatusId === APPLICATION_STATUS_ID.draft
    ) {
      return (
        <CustomButton
          text={t("loginAs.edit")}
          variant="primary"
          size="small"
          customClassName="login-as-action-btn"
          onClick={() => handEdit(record, params)}
        />
      );
    }
    if (applicationStatusId === APPLICATION_STATUS_ID.underReview) {
      return (
        <CustomButton
          text={t("loginAs.cancel")}
          variant="primary"
          size="small"
          customClassName="login-as-action-btn"
          onClick={() =>
            setCancelModal({ visible: true, id: String(record.applicationId) })
          }
        />
      );
    }
  }

  function renderCard(userProfileId: string, userTypeId: string) {
    if (!userProfileId) return;
    const actions = pendingActions[userProfileId];
    return (
      !!actions &&
      actions
        .filter(
          (item) => item.applicationStatusId !== APPLICATION_STATUS_ID.rejected,
        )
        .map((item) => {
          const expireTag = getActionExpireTag(item);

          return (
            <div
              key={`${item.applicationStatusId}-${item.applicationDetailId}-${item.applicationId}`}
              className={`l1-2-item login-as-card`}
            >
              <div className="payments-talbe-status">
                {expireTag ? (
                  <span className={expireTag.className}>{expireTag.label}</span>
                ) : (
                  <CustomStatusTag
                    type="myRequest"
                    status={item.applicationStatusId}
                  />
                )}
              </div>
              <EllipsisTooltipText
                className="l1-2-item-content"
                text={pendingActionServiceDisplayName(
                  i18n.language.startsWith("ar"),
                  item,
                )}
                twoLine
              />
              <div className="btn-group">
                {item.applicationStatusId === APPLICATION_STATUS_ID.draft ||
                item.applicationStatusId ===
                  APPLICATION_STATUS_ID.pendingPayment ||
                item.applicationStatusId ===
                  APPLICATION_STATUS_ID.pendingModification ? (
                  <CustomButton
                    text={t("loginAs.details")}
                    variant="text"
                    customClassName="login-as-action-btn"
                    onClick={async () => {
                      const switched = await handleUserClick(
                        {
                          userProFileID: userProfileId,
                          userTypeID: userTypeId,
                        },
                        false,
                      );
                      if (switched) {
                        history.push(
                          `/my-requests/detail?id=${item.applicationId}`,
                        );
                      }
                    }}
                  />
                ) : (
                  <CustomButton
                    text={t("loginAs.delete")}
                    variant="text"
                    customClassName="login-as-action-btn"
                    onClick={() => {}}
                  />
                )}
                {getAction(item.applicationStatusId, item, {
                  userProFileID: userProfileId,
                  userTypeID: userTypeId,
                })}
              </div>
            </div>
          );
        })
    );
  }

  function renderRenewalCards(userProfileId: string, userTypeId: string) {
    const normalizedProfileId = normalizeProfileId(userProfileId);
    if ((pendingActionCounts[normalizedProfileId] ?? 0) <= 0) {
      return null;
    }

    const actions = pendingRenewalActions[normalizedProfileId];

    return actions?.map((item) => {
      const expireTag = getActionExpireTag(item);
      const documentId = String(item.documentId ?? "").trim();
      const canRenew = item.allowedActions?.some(
        (allowedAction) => allowedAction.action === "RENEW",
      );

      return (
        <div
          key={`renewal-${item.id ?? documentId}`}
          className="l1-2-item login-as-card"
        >
          <div className="payments-talbe-status">
            {expireTag ? (
              <span className={expireTag.className}>{expireTag.label}</span>
            ) : null}
          </div>
          <EllipsisTooltipText
            className="l1-2-item-content"
            text={licensePermitListDisplayName(
              i18n.language.startsWith("ar"),
              item,
            )}
            twoLine
          />
          <div className="btn-group">
            {canRenew ? (
              <CustomButton
                text={t("loginAs.renew")}
                variant="primary"
                size="small"
                customClassName="login-as-action-btn"
                loading={renewingDocumentId === documentId}
                disabled={Boolean(renewingDocumentId)}
                onClick={() =>
                  handleRenew(item, {
                    userProFileID: userProfileId,
                    userTypeID: userTypeId,
                  })
                }
              />
            ) : null}
          </div>
        </div>
      );
    });
  }

  function getPendingActionCount(profileId?: string | number | null) {
    const normalizedProfileId = normalizeProfileId(profileId);

    if (!normalizedProfileId) {
      return 0;
    }

    return (
      pendingActionCounts[normalizedProfileId] ??
      pendingActions[normalizedProfileId]?.length ??
      0
    );
  }

  function renderPendingActionsText(profileId?: string | number | null) {
    const normalizedProfileId = normalizeProfileId(profileId);
    const hasKnownCount =
      Object.prototype.hasOwnProperty.call(
        pendingActionCounts,
        normalizedProfileId,
      ) ||
      Object.prototype.hasOwnProperty.call(pendingActions, normalizedProfileId);

    if (pendingCountsFailed && !hasKnownCount) {
      return t("common.requestFailed");
    }

    const count = getPendingActionCount(profileId);

    return count > 0
      ? t("loginAs.pendingActions", { num: count })
      : t("loginAs.noPendingActions");
  }

  // Expired profiles (UserProfile.Status "5") stay listed and stay switchable — the owner has to
  // open one to renew it — so they are only dimmed and tagged.
  const renderProfileName = (name?: string | null, profileStatus?: string | null) => {
    const displayName = String(name || "-").trim() || "-";
    return (
      <div className="user-info-name-row">
        <EllipsisTooltipText
          className="user-info-name"
          placement="topLeft"
          text={displayName}
        />
        {isExpiredProfileStatus(profileStatus) ? (
          <span className="expired-tag">{t("identitysPopover.expired")}</span>
        ) : null}
      </div>
    );
  };

  const handleClose = () => {
    void handleEnterGlobalView();
  };

  const closeIcon = (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 6L6 18"
        stroke="#5F646D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6L18 18"
        stroke="#5F646D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <Modal
      wrapClassName="loginas-modal"
      footer={null}
      title={false}
      closable={true}
      closeIcon={closeIcon}
      onCancel={handleClose}
      className="login-as-modal"
      centered
      visible={loginAsVisible}
    >
      <Spin spinning={loading}>
        <div className="login-as-wrapper">
          <div className="login-as-modal__header">
            <div className="login-as-title">{t("loginAs.title")}</div>
            <div className="login-as-desc">{t("loginAs.desc")}</div>
            <div className="login-as-search-wrapper">
              <div className="login-as-search">
                <div className="login-as-search-bar">
                  <LoginAsSearchBar />
                </div>
                <input
                  onChange={(e) => debouncedSetSearchWord(e.target.value)}
                  type="text"
                  autoComplete="off"
                  className="login-as-search-input"
                  placeholder={t("formPlaceholders.pages.home.loginAs.search")}
                />
              </div>
            </div>
          </div>
          <SimpleBar className="login-as-modal__scroll">
            <div className="login-as-modal__content">
              {showIndividualProfile && (
                    <>
                      <div className="login-as-content-title">
                        {t("loginAs.individualProfile")}
                      </div>
                      <div
                        className={`login-as-info ${
                          isExpiredProfileStatus(
                            userInfo?.userInvitation?.profileStatus,
                          )
                            ? "login-as-info--expired"
                            : ""
                        }`}
                      >
                        <div
                          className="user-info-wrapper"
                          onClick={() => {
                            void handleUserClick({
                              userTypeID: userInfo?.userInvitation?.userTypeId,
                              userProFileID:
                                userInfo?.userInvitation?.userProfileId,
                            });
                          }}
                        >
                          <div className="user-info">
                            <div className="user-info-avatar">
                              <img
                                src={
                                  userInfo?.userInvitation?.photoUrl
                                    ? resolveFileUrl(
                                        userInfo?.userInvitation?.photoUrl,
                                      )
                                    : avatar1
                                }
                                alt=""
                              />
                            </div>
                            <div className="user-info-content">
                              {renderProfileName(
                                userInfo?.userInvitation?.name ??
                                  `${userInfo.firstName} ${userInfo.lastName}`,
                                userInfo?.userInvitation?.profileStatus,
                              )}
                              <div className="user-info-email">
                                {userInfo?.userInvitation?.email ?? "-"}
                              </div>
                            </div>
                          </div>
                          <div
                            className="pending-actions"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const switched = await handleUserClick(
                                {
                                  userTypeID:
                                    userInfo?.userInvitation?.userTypeId,
                                  userProFileID:
                                    userInfo?.userInvitation?.userProfileId,
                                },
                                false,
                              );
                              if (switched) {
                                history.push("/my-requests");
                              }
                            }}
                          >
                            {renderPendingActionsText(
                              userInfo?.userInvitation?.userProfileId,
                            )}{" "}
                            <img src={ArraowRight} alt="" />
                          </div>
                        </div>
                        <ScrollBox>
                          {renderCard(
                            userInfo?.userInvitation?.userProfileId,
                            userInfo?.userInvitation?.userTypeId,
                          )}
                          {renderRenewalCards(
                            userInfo?.userInvitation?.userProfileId,
                            userInfo?.userInvitation?.userTypeId,
                          )}
                        </ScrollBox>
                      </div>
                    </>
              )}
              {hasEstablishments && (
                <div className="login-as-content-title">
                  {t("loginAs.establishmentProfile")}
                </div>
              )}
              {filteredEstablishments.map((establishment) => {
                const fallbackAvatar = getProfileAvatarFallback({
                  kind: "establishment",
                  userTypeId: establishment.userTypeId,
                  userTypeCode: establishment.userTypeCode,
                });

                return (
                  <div
                    key={establishment.userProfileId}
                    className={`login-as-info ${
                      isExpiredProfileStatus(establishment.profileStatus)
                        ? "login-as-info--expired"
                        : ""
                    }`}
                  >
                    <div
                      className="user-info-wrapper"
                      onClick={() => {
                        void handleUserClick({
                          userTypeID: establishment?.userTypeId,
                          userProFileID: establishment?.userProfileId,
                        });
                      }}
                    >
                      <div className="user-info">
                        <div className="user-info-avatar">
                          <img
                            src={resolveProfileAvatar(
                              establishment.establishmentUrl,
                              fallbackAvatar,
                            )}
                            alt=""
                            onError={(event) => {
                              if (
                                event.currentTarget.dataset.fallbackApplied ===
                                "true"
                              ) {
                                return;
                              }
                              event.currentTarget.dataset.fallbackApplied =
                                "true";
                              event.currentTarget.src = fallbackAvatar;
                            }}
                          />
                        </div>
                        <div className="user-info-content">
                          {renderProfileName(
                            i18n.language.startsWith("ar")
                              ? establishment.nameAr
                              : establishment.nameEn,
                            establishment.profileStatus,
                          )}
                          <div className="user-info-email">
                            {establishment.email ?? "-"}
                          </div>
                        </div>
                      </div>
                      <div
                        className="pending-actions"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const switched = await handleUserClick(
                            {
                              userTypeID: establishment?.userTypeId,
                              userProFileID: establishment?.userProfileId,
                            },
                            false,
                          );
                          if (switched) {
                            history.push("/my-requests");
                          }
                        }}
                      >
                        {renderPendingActionsText(establishment?.userProfileId)}{" "}
                        <img src={ArraowRight} alt="" />
                      </div>
                    </div>
                    <ScrollBox>
                      {/* {establishment.ServicesList.map((establishmentItem) => (
                        <div className="Profile-Services-list">
                          <div className="Profile-Services-list-status">
                            {establishmentItem.applicationStatusNameEn}
                          </div>
                          <p className="Profile-Services-list-name">
                            {establishmentItem.serviceNameEn}
                          </p>
                          <CustomButton
                            customClassName="Profile-Services-list-button"
                            text={t("loginAs.delete")}
                            onClick={() => {}}
                          />
                        </div>
                      ))} */}
                      {renderCard(
                        establishment.userProfileId,
                        establishment.userTypeId,
                      )}
                      {renderRenewalCards(
                        establishment.userProfileId,
                        establishment.userTypeId,
                      )}
                    </ScrollBox>
                  </div>
                );
              })}
              {!hasVisibleProfiles && (
                <EmptyBox
                  title={t("common.noData")}
                  customClassName="login-as-empty"
                />
              )}
            </div>
          </SimpleBar>
        </div>
      </Spin>
      <ComfirmModal
        title={t("loginAs.cancelComplaintTitle")}
        content={t("loginAs.cancelComplaintContent")}
        show={cancelModal.visible}
        close={() => setCancelModal({ visible: false, id: "" })}
        comfrimHanld={handleConfirmCancel}
        type="warning"
        comfrimText={t("common.confirm")}
        cancelText={t("common.cancel")}
      />
      {dialogNode}
    </Modal>
  );
}
