import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useLayoutEffect,
  type TouchEvent,
} from "react";
import useFilterOverflow from "@/hooks/useFilterOverflow";
import { Input, Tabs, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import FilterIcon from "@/assets/icons/FilterIcon";
import MobileFilterModal from "@/components/common/MobileFilterModal";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import type { History } from "history";
import ServiceCard from "./components/ServiceCard";
import "./index.less";
import { CustomButton, AppPagination } from "@/components/common";
import CustomMessage from "@/components/common/CustomMessage";
import {
  getServicePage,
  getServiceCategories,
  GetAllUserType,
  AddFavorite,
  checkServiceEntryGate,
  type ServiceEntryGatePayload,
  type ServiceEntryGateUiHints,
} from "@/services/services";
import throttle from "lodash/throttle";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import CustomCheckboxSelect from "./components/CustomCheckboxSelect";
import {
  ServicesProfileSelectionModal,
  useServiceEntryGateDialogController,
  type ServicesProfileSelectionOption,
  type ServiceEntryGateDialogOpener,
} from "@/components/ServiceEntryGate";
import {
  openServiceGateWithPayload,
  openServiceWithGate,
} from "@/utils/serviceEntryGate";
import { useServicesStore } from "@/store/services";
import { isGlobalProfileId, useUserStore } from "@/store/user";
import { userChangeIdentity } from "@/services/userProfile";
import { completeIdentitySwitch } from "@/utils/identitySwitch";
import {
  finishProfileSwitchSession,
  startProfileSwitchSession,
} from "@/utils/profileSwitchSession";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import useKeepAliveActivated from "@/components/KeepAlive/useKeepAliveActivated";
import useKeepAliveScrollRestoration from "@/components/KeepAlive/useKeepAliveScrollRestoration";
import { createKeepAliveAsyncGuard } from "@/components/KeepAlive/asyncGuard";
import SimpleBar from "@/components/SimpleBar";
import { resolveDefaultServiceUserTypeCodes } from "./serviceProfileFilter";

interface Service {
  id: number;
  title?: string;
  iconUri?: string | null;
  tags?: string[];
  category?: string;
  serviceCategoryNameEn?: string | null;
  serviceCategoryNameAr?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
  code?: string | null;
  isCollect?: boolean;
  isFavorite?: boolean;
  userTypes?: string[];
  userTypeLabels?: Array<{ value: string; label: string }>;
}

interface StartServicePayload {
  id: number;
  code?: string;
  nameEn: string;
  nameAr?: string | null;
}

interface ServicesPageData {
  items?: Service[];
  pageIndex: number;
  pageSize: number;
  total: number;
}

interface ServiceCategory {
  id: number;
  nameEn: string;
  nameAr: string;
}

interface ServiceUserTypeOption {
  id?: string | number | null;
  code?: string;
  nameEn?: string | null;
  nameAr?: string | null;
  value?: string;
  label?: string;
}

interface ServicesStoreSelectorState {
  updateServiceProcessId: (serviceProcessId: number | null) => void;
  updateServiceExpressSupport: (isExpressSupported: boolean | null) => void;
}

const createGuardedHistory = (
  history: History,
  isCurrent: () => boolean,
): History => ({
  ...history,
  push: (
    path: Parameters<History["push"]>[0],
    state?: Parameters<History["push"]>[1],
  ) => {
    if (isCurrent()) {
      history.push(path, state);
    }
  },
  replace: (
    path: Parameters<History["replace"]>[0],
    state?: Parameters<History["replace"]>[1],
  ) => {
    if (isCurrent()) {
      history.replace(path, state);
    }
  },
});

const createGuardedDialogOpener = (
  openDialog: ServiceEntryGateDialogOpener,
  isCurrent: () => boolean,
): ServiceEntryGateDialogOpener => async (dialog) => {
  if (!isCurrent()) {
    return { actionKey: "keep-alive-cancelled" };
  }

  return openDialog(dialog);
};

const ALL_SERVICES_CATEGORY_ID = 0;

const DEFAULT_SERVICE_CATEGORY = {
  id: ALL_SERVICES_CATEGORY_ID,
  nameAr: "",
  nameEn: "",
};

const SERVICES_GRID_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.03,
    },
  },
};

const SERVICE_ITEM_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    x: 32,
    y: 24,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

type QualifyingProfile = NonNullable<
  ServiceEntryGateUiHints["qualifyingProfiles"]
>[number];

const normalizeProfileSelectionText = (value?: string | number | null) =>
  String(value ?? "").trim();

type ProfileIdentitySource = {
  userProfileId?: string | number | null;
  userTypeId?: string | number | null;
};

const normalizeNumericProfileSelectionUserTypeId = (
  value?: string | number | null,
) => {
  const normalizedValue = normalizeProfileSelectionText(value);
  const numericValue = Number(normalizedValue);

  return normalizedValue && Number.isInteger(numericValue) && numericValue > 0
    ? String(numericValue)
    : "";
};

const buildProfileUserTypeIdByProfileId = (
  personalProfile?: ProfileIdentitySource | null,
  establishments?: Array<ProfileIdentitySource | null | undefined> | null,
) => {
  const userTypeIdByProfileId = new Map<string, string>();
  const addProfile = (
    profileId?: string | number | null,
    userTypeId?: string | number | null,
  ) => {
    const normalizedProfileId = normalizeProfileSelectionText(profileId);
    const normalizedUserTypeId =
      normalizeNumericProfileSelectionUserTypeId(userTypeId);

    if (
      normalizedProfileId &&
      normalizedProfileId !== "0" &&
      normalizedUserTypeId
    ) {
      userTypeIdByProfileId.set(normalizedProfileId, normalizedUserTypeId);
    }
  };

  addProfile(personalProfile?.userProfileId, personalProfile?.userTypeId);
  (establishments || []).forEach((establishment) => {
    addProfile(establishment?.userProfileId, establishment?.userTypeId);
  });

  return userTypeIdByProfileId;
};

const SUSPENDED_PROFILE_STATUS_VALUES = new Set([
  "suspended",
  "suspend",
  "profilesuspended",
]);

const isSuspendedProfileStatusValue = (value: unknown) => {
  const normalizedValue = normalizeProfileSelectionText(
    typeof value === "string" || typeof value === "number" ? value : null,
  ).toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return SUSPENDED_PROFILE_STATUS_VALUES.has(
    normalizedValue.replace(/[\s_-]+/g, ""),
  );
};

const isSuspendedQualifyingProfile = (profile: QualifyingProfile) => {
  const profileRecord = profile as Record<string, unknown>;

  if (profileRecord.isSuspended === true || profileRecord.suspended === true) {
    return true;
  }

  return [
    profile.disabledReasonCode,
    profile.profileStatus,
    profile.profileStatusCode,
    profile.profileStatusName,
    profile.status,
    profile.statusCode,
    profile.statusName,
  ].some(isSuspendedProfileStatusValue);
};

const needsProfileIdentityRefresh = (
  profiles: ServiceEntryGateUiHints["qualifyingProfiles"],
  userTypeIdByProfileId: Map<string, string>,
) =>
  (profiles || []).some((profile) => {
    const profileId = normalizeProfileSelectionText(profile.profileId);

    return (
      profile.isEligible !== false &&
      profileId !== "0" &&
      Boolean(profileId) &&
      !isSuspendedQualifyingProfile(profile) &&
      !normalizeNumericProfileSelectionUserTypeId(profile.userTypeId) &&
      !userTypeIdByProfileId.has(profileId)
    );
  });

const readProfileSelectionDetail = (
  profile: QualifyingProfile,
  keys: string[],
) => {
  const profileRecord = profile as Record<string, unknown>;

  for (const key of keys) {
    const value = profileRecord[key];
    const normalizedValue =
      typeof value === "string" || typeof value === "number"
        ? normalizeProfileSelectionText(value)
        : "";

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
};

const resolveProfileSelectionGroup = (
  profile: QualifyingProfile,
): ServicesProfileSelectionOption["group"] => {
  const identityValues = [
    profile.userTypeCode,
    profile.userTypeId,
    profile.title,
    profile.nameEn,
    profile.nameAr,
  ]
    .map((value) => normalizeProfileSelectionText(value).toLowerCase())
    .filter(Boolean);

  if (
    identityValues.some(
      (value) =>
        value === "1" ||
        value === "01" ||
        value === "individual" ||
        value.includes("individual") ||
        value.includes("personal"),
    )
  ) {
    return "individual";
  }

  return "establishment";
};

const shouldUseGateDecisionForEmptyProfileSelection = (
  payload: ServiceEntryGatePayload,
) => {
  const decision = payload.decision;

  if (!decision) {
    return false;
  }

  if (decision.finalAction === "RedirectRenewal") {
    return true;
  }

  if (decision.finalAction !== "Block") {
    return false;
  }

  return Boolean(
    decision.action ||
      decision.promptCode ||
      decision.reasonCode ||
      payload.documentInfo,
  );
};

export default function Services() {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const shouldReduceMotion = useReducedMotion();
  const [filterRef, filtersOverflow] = useFilterOverflow();
  const { openDialog, dialogNode } = useServiceEntryGateDialogController();
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const userInfo = useUserStore((state) => state.userInfo);
  const refreshApprovedProfiles = useUserStore(
    (state) => state.refreshApprovedProfiles,
  );
  const profileUserTypeIdByProfileId = useMemo(
    () =>
      buildProfileUserTypeIdByProfileId(
        userInfo.userInvitation,
        userInfo.userEstablishments,
      ),
    [userInfo.userEstablishments, userInfo.userInvitation],
  );
  const updateServiceProcessId = useServicesStore(
    (state: ServicesStoreSelectorState) => state.updateServiceProcessId,
  );
  const updateServiceExpressSupport = useServicesStore(
    (state: ServicesStoreSelectorState) => state.updateServiceExpressSupport,
  );
  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    String(ALL_SERVICES_CATEGORY_ID),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [{ items: services, animationKey }, setServicesResult] = useState({
    items: [] as Service[],
    animationKey: 0,
  });
  const [servicesLoading, setServicesLoading] = useState(false);
  const [total, setTotal] = useState(100);
  const [selectedUserTypes, setSelectedUserTypes] = useState<string[]>([]);
  const [serviceUserTypesInitialized, setServiceUserTypesInitialized] =
    useState(false);
  const [selectOptions, setSelectOptions] = useState<{ value: string; label: string }[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [pendingUserTypes, setPendingUserTypes] = useState<string[]>([]);
  const [pendingFeatured, setPendingFeatured] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState(false);
  const [gateLoadingServiceId, setGateLoadingServiceId] = useState<number | null>(
    null,
  );
  const [profileSelectionVisible, setProfileSelectionVisible] = useState(false);
  const [profileSelectionLoading, setProfileSelectionLoading] = useState(false);
  const [profileSelectionOptions, setProfileSelectionOptions] = useState<
    ServicesProfileSelectionOption[]
  >([]);
  const [pendingService, setPendingService] =
    useState<StartServicePayload | null>(null);
  const servicePageAbortControllerRef = useRef<AbortController | null>(null);
  const servicePageRequestIdRef = useRef(0);
  const serviceUserTypesRequestIdRef = useRef(0);
  const transientUiGuardRef = useRef(createKeepAliveAsyncGuard());
  const categoryTabsContentRef = useRef<HTMLDivElement>(null);
  const beginTransientUiFlow = useCallback(() => {
    transientUiGuardRef.current.invalidate();
    return transientUiGuardRef.current.capture();
  }, []);
  const [categories, setcategories] = useState<ServiceCategory[]>([
    DEFAULT_SERVICE_CATEGORY,
  ]);

  const FungetServiceCategories = () => {
    getServiceCategories()
      .then((res) => {
        const categoryItems = Array.isArray(res.data)
          ? (res.data as ServiceCategory[])
          : [];
        setcategories([
          DEFAULT_SERVICE_CATEGORY,
          ...categoryItems,
        ]);
      })
      .catch((error) => {
        console.error("[Services] Failed to load service categories:", error);
      });
  };
  useEffect(() => {
    if (activeCategory == null || !serviceUserTypesInitialized) return;
    FungetServicePage(Number(activeCategory), currentPage, pageSize);
  }, [activeCategory, i18n.language, serviceUserTypesInitialized]);

  useEffect(() => {
    if (activeCategory == null || !serviceUserTypesInitialized) return;
    FungetServicePage(Number(activeCategory), 1, pageSize);
  }, [searchValue, i18n.language, serviceUserTypesInitialized]);

  useEffect(() => {
    if (activeCategory == null || !serviceUserTypesInitialized) return;
    FungetServicePage(Number(activeCategory), 1, pageSize);
  }, [selectedUserTypes, serviceUserTypesInitialized]);
  useEffect(() => {
    if (activeCategory == null || !serviceUserTypesInitialized) return;
    FungetServicePage(Number(activeCategory), 1, pageSize);
  }, [isFeatured, serviceUserTypesInitialized]);
  useEffect(() => {
    if (activeCategory == null || !serviceUserTypesInitialized) return;
    FungetServicePage(Number(activeCategory), 1, pageSize);
  }, [isFavorite, serviceUserTypesInitialized]);
  const FungetServicePage = (
    val: number,
    page: number = currentPage,
    size: number = pageSize
  ) => {
    servicePageAbortControllerRef.current?.abort();
    const requestController = new AbortController();
    servicePageAbortControllerRef.current = requestController;
    const requestId = servicePageRequestIdRef.current + 1;
    servicePageRequestIdRef.current = requestId;
    setServicesLoading(true);
    getServicePage({
      pageSize: size,
      pageIndex: page,
      sortBy: "",
      sortDirection: 0,
      nameEn: i18n.language.startsWith("ar") ? "" : searchValue,
      nameAr: i18n.language.startsWith("ar") ? searchValue : "",
      serviceCategoryId: val,
      featured: isFeatured,
      favorite: isFavorite,
      userTypeCodes: selectedUserTypes.length > 0 ? selectedUserTypes : [],
    }, {
      signal: requestController.signal,
    })
      .then((res) => {
        if (requestId !== servicePageRequestIdRef.current) {
          return;
        }
        const pageData = (res.data || {}) as ServicesPageData;
        setServicesResult((currentResult) => ({
          items: pageData.items || [],
          animationKey: currentResult.animationKey + 1,
        }));
        setCurrentPage(pageData.pageIndex);
        setPageSize(pageData.pageSize);
        setTotal(pageData.total);
      })
      .catch((error) => {
        if (
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError"
        ) {
          return;
        }
        console.error("[Services] Failed to load service page:", error);
      })
      .finally(() => {
        if (requestId === servicePageRequestIdRef.current) {
          setServicesLoading(false);
        }
      });
  };

  const tabList = useMemo(() => {
    if (!categories.length) return [];
    const isAr = i18n.language.startsWith("ar");
    return categories.map((cat) => ({
      key: String(cat.id),
      label:
        cat.id === ALL_SERVICES_CATEGORY_ID
          ? t("servicesPage.allServices")
          : isAr
            ? cat.nameAr
            : cat.nameEn,
    }));
  }, [categories, i18n.language, t]);

  useLayoutEffect(() => {
    const content = categoryTabsContentRef.current;
    const navList = content?.querySelector<HTMLElement>(
      ".ant-tabs-nav-list",
    );
    if (!content || !navList) return;

    let disposed = false;
    const updateWidth = () => {
      if (disposed) return;
      const width = Math.ceil(
        Math.max(navList.scrollWidth, navList.getBoundingClientRect().width),
      );
      content.style.width = `${width}px`;
    };
    const observer = new ResizeObserver(updateWidth);

    observer.observe(navList);
    updateWidth();

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [tabList]);

  const GetAllUserTypeFn = useCallback(async () => {
    const requestId = serviceUserTypesRequestIdRef.current + 1;
    serviceUserTypesRequestIdRef.current = requestId;
    setServiceUserTypesInitialized(false);

    try {
      const res = await GetAllUserType();
      if (requestId !== serviceUserTypesRequestIdRef.current) {
        return;
      }
      const userTypeItems = Array.isArray(res.data)
        ? (res.data as ServiceUserTypeOption[])
        : [];
      const isAr = i18n.language.startsWith("ar");
      const newRes = userTypeItems
        .filter((item) => item?.code !== "99")
        .map((item) => {
          const label = isAr
            ? (item?.nameAr ?? item?.nameEn)
            : (item?.nameEn ?? item?.nameAr);

          return {
            ...item,
            label: String(label || ""),
            value: String(item?.code || ""),
          };
        });

      setSelectOptions(newRes || []);
      const currentUserState = useUserStore.getState();
      setSelectedUserTypes(resolveDefaultServiceUserTypeCodes({
        currentUserTypeId: currentUserState.userInfo.currentUserTypeId,
        isGlobalProfile: isGlobalProfileId(currentUserState.currentProfileId),
        userTypes: userTypeItems,
      }));
      setCurrentPage(1);
    } catch (error) {
      if (requestId !== serviceUserTypesRequestIdRef.current) {
        return;
      }
      console.error("[Services] Failed to load service user types:", error);
      setSelectOptions([]);
      setSelectedUserTypes([]);
    } finally {
      if (requestId === serviceUserTypesRequestIdRef.current) {
        setServiceUserTypesInitialized(true);
      }
    }
  }, [i18n.language]);

  useEffect(() => {
    FungetServiceCategories();
  }, []);

  useEffect(() => {
    GetAllUserTypeFn();
  }, [GetAllUserTypeFn]);

  const throttledSetSearchValue = useRef(
    throttle((value: string) => {
      setSearchValue(value);
      setCurrentPage(1);
    }, 500)
  ).current;

  useEffect(() => {
    const transientUiGuard = transientUiGuardRef.current;

    return () => {
      transientUiGuard.invalidate();
      throttledSetSearchValue.cancel();
      servicePageAbortControllerRef.current?.abort();
      servicePageRequestIdRef.current += 1;
      serviceUserTypesRequestIdRef.current += 1;
    };
  }, [throttledSetSearchValue]);

  useKeepAliveActivated({
    onActivated: ({ fromPath }) => {
      if (
        fromPath !== "/services/service-card" &&
        fromPath !== "/services/media-license"
      ) {
        return;
      }

      if (activeCategory !== null) {
        FungetServicePage(Number(activeCategory), currentPage, pageSize);
      }
    },
    onDeactivated: () => {
      transientUiGuardRef.current.invalidate();
      throttledSetSearchValue.cancel();
      servicePageAbortControllerRef.current?.abort();
      servicePageRequestIdRef.current += 1;
      setServicesLoading(false);
      setMobileFilterVisible(false);
      setPendingUserTypes([]);
      setPendingFeatured(false);
      setPendingFavorite(false);
      setGateLoadingServiceId(null);
      setProfileSelectionVisible(false);
      setProfileSelectionLoading(false);
      setProfileSelectionOptions([]);
      setPendingService(null);
    },
  });

  useKeepAliveScrollRestoration();

  const handleSearch = useCallback((value: string) => {
    const trimmedValue = value.trim();
    setInputValue(value);
    // Immediately update search value when clearing (empty string)
    if (trimmedValue === "") {
      setSearchValue("");
      setCurrentPage(1);
      throttledSetSearchValue.cancel();
    } else {
      throttledSetSearchValue(trimmedValue);
    }
  }, [throttledSetSearchValue]);

  const handleCategoryChange = (key: string) => {
    setActiveCategory(key);
    setCurrentPage(1);
  };
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    if (activeCategory == null) return;
    FungetServicePage(Number(activeCategory), page, size);
  };
  const hasServices = services.length > 0;
  const showInitialLoading =
    (!serviceUserTypesInitialized || servicesLoading) && !hasServices;
  const showEmpty = !showInitialLoading && !hasServices;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isArabic = i18n.language.toLowerCase().startsWith("ar");

  const mapQualifyingProfiles = useCallback(
    (
      profiles?: ServiceEntryGateUiHints["qualifyingProfiles"] | null,
      userTypeIdByProfileId?: Map<string, string>,
    ): ServicesProfileSelectionOption[] => {
      const seenProfileIds = new Set<string>();

      return (profiles || [])
        .filter((profile) => profile.isEligible !== false)
        .map((profile) => {
          const profileId = normalizeProfileSelectionText(profile.profileId);
          const userTypeId =
            normalizeNumericProfileSelectionUserTypeId(profile.userTypeId) ||
            userTypeIdByProfileId?.get(profileId) ||
            "";

          if (
            !profileId ||
            profileId === "0" ||
            seenProfileIds.has(profileId) ||
            isSuspendedQualifyingProfile(profile) ||
            !userTypeId
          ) {
            return null;
          }

          seenProfileIds.add(profileId);

          const preferredName = normalizeProfileSelectionText(profile.profileName);
          const localizedName = normalizeProfileSelectionText(
            isArabic ? profile.nameAr : profile.nameEn,
          );
          const fallbackName = normalizeProfileSelectionText(
            isArabic ? profile.nameEn : profile.nameAr,
          );
          const displayName =
            preferredName ||
            localizedName ||
            normalizeProfileSelectionText(profile.title) ||
            fallbackName ||
            t("serviceEntryGate.labels.profileNumber", { id: profileId });

          return {
            profileId,
            userTypeId,
            userTypeCode:
              normalizeProfileSelectionText(profile.userTypeCode) || null,
            group: resolveProfileSelectionGroup(profile),
            name: displayName,
            subtitle: normalizeProfileSelectionText(profile.subtitle) || null,
            isEligible: true,
            searchKeywords: [
              displayName,
              normalizeProfileSelectionText(profile.profileName),
            ].filter(Boolean),
            licenseNumber:
              normalizeProfileSelectionText(profile.commercialLicenseNumber) ||
              null,
            location:
              readProfileSelectionDetail(profile, [
                "location",
                "locationName",
                "city",
                "cityName",
                "emirate",
                "emirateName",
              ]) || null,
            avatarUrl: normalizeProfileSelectionText(profile.avatarUrl) || null,
          };
        })
        .filter(Boolean) as ServicesProfileSelectionOption[];
    },
    [isArabic, t],
  );

  const handleFeaturedClick = () => {

    setIsFeatured(!isFeatured);
  };

  const handleFavoriteClick = () => {
    setIsFavorite(!isFavorite);
  };


  const handleUserTypeChange = (values: string[]) => {
    setSelectedUserTypes(values);
    setCurrentPage(1);
  };

  const onAddFavoriteClick = async (serviceId: number, isCollected: boolean) => {
    await AddFavorite(serviceId);
    if (isCollected) {
      CustomMessage.success(t("servicesPage.favoriteAdded"));
    } else {
      CustomMessage.success(t("servicesPage.favoriteRemoved"));
    }
  };

  const startService = useCallback(async (
    service: StartServicePayload,
    existingFlowVersion?: number,
  ) => {
    const flowVersion = existingFlowVersion ?? beginTransientUiFlow();
    const isCurrentFlow = () =>
      transientUiGuardRef.current.isCurrent(flowVersion);
    setGateLoadingServiceId(service.id);
    try {
      updateServiceProcessId(null);
      updateServiceExpressSupport(null);

      await openServiceWithGate({
        history: createGuardedHistory(history, isCurrentFlow),
        serviceId: service.id,
        serviceCode: service.code || null,
        serviceName:
          i18n.language.startsWith("ar")
            ? service.nameAr ?? service.nameEn
            : service.nameEn ?? service.nameAr,
        source: "services-card",
        openDialog: createGuardedDialogOpener(openDialog, isCurrentFlow),
      });
    } finally {
      if (isCurrentFlow()) {
        setGateLoadingServiceId(null);
      }
    }
  }, [
    beginTransientUiFlow,
    history,
    i18n.language,
    openDialog,
    updateServiceExpressSupport,
    updateServiceProcessId,
  ]);

  const handleStartService = async (service: StartServicePayload) => {
    if (isGlobalProfileId(currentProfileId)) {
      const flowVersion = beginTransientUiFlow();
      const isCurrentFlow = () =>
        transientUiGuardRef.current.isCurrent(flowVersion);
      setGateLoadingServiceId(service.id);
      try {
        const envelope = await checkServiceEntryGate(service.id);
        if (!isCurrentFlow()) {
          return;
        }

        const serviceCheckPayload = envelope?.data;

        if (!serviceCheckPayload) {
          throw new Error("Service check did not return data");
        }

        const qualifyingProfiles =
          serviceCheckPayload.uiHints?.qualifyingProfiles || [];
        let targetUserTypeIdByProfileId = profileUserTypeIdByProfileId;

        if (
          userInfo.id &&
          needsProfileIdentityRefresh(
            qualifyingProfiles,
            targetUserTypeIdByProfileId,
          )
        ) {
          try {
            const approvedProfiles = await refreshApprovedProfiles(userInfo.id);
            if (!isCurrentFlow()) {
              return;
            }

            targetUserTypeIdByProfileId = buildProfileUserTypeIdByProfileId(
              approvedProfiles.userInvitation,
              approvedProfiles.userEstablishments,
            );
          } catch (error) {
            if (isCurrentFlow()) {
              console.error("refreshApprovedProfiles", error);
            }
          }
        }

        const profileSelectionOptions = mapQualifyingProfiles(
          qualifyingProfiles,
          targetUserTypeIdByProfileId,
        );

        if (
          !profileSelectionOptions.length &&
          shouldUseGateDecisionForEmptyProfileSelection(serviceCheckPayload)
        ) {
          await openServiceGateWithPayload({
            history: createGuardedHistory(history, isCurrentFlow),
            payload: serviceCheckPayload,
            serviceCode: service.code || null,
            serviceName:
              i18n.language.startsWith("ar")
                ? service.nameAr ?? service.nameEn
                : service.nameEn ?? service.nameAr,
            source: "services-card",
            openDialog: createGuardedDialogOpener(openDialog, isCurrentFlow),
          });
          return;
        }

        setProfileSelectionOptions(profileSelectionOptions);
        setPendingService(service);
        setProfileSelectionVisible(true);
      } catch (error) {
        if (isCurrentFlow()) {
          console.error("checkServiceEntryGate", error);
          CustomMessage.error(t("common.requestFailed"));
        }
      } finally {
        if (isCurrentFlow()) {
          setGateLoadingServiceId(null);
        }
      }
      return;
    }

    await startService(service);
  };

  const handleProfileSelectionCancel = () => {
    if (profileSelectionLoading) {
      return;
    }

    setProfileSelectionVisible(false);
    setPendingService(null);
    setProfileSelectionOptions([]);
  };

  const handleProfileSelectionConfirm = async (
    profile: ServicesProfileSelectionOption,
  ) => {
    if (
      !pendingService ||
      profileSelectionLoading ||
      profile.isEligible === false
    ) {
      return;
    }

    const flowVersion = beginTransientUiFlow();
    setProfileSelectionLoading(true);
    let keepProfileSwitchSession = false;
    const switchSession = startProfileSwitchSession({
      source: "ServicesProfileSelection",
      userId: userInfo.id,
      fromProfileId: currentProfileId,
      toProfileId: profile.profileId,
      toUserTypeId: profile.userTypeId,
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (!switchSession) {
      setProfileSelectionLoading(false);
      return;
    }

    try {
      const res = await userChangeIdentity({
        userProFileID: profile.profileId,
        userTypeID: profile.userTypeId,
      });
      if (!transientUiGuardRef.current.isCurrent(flowVersion)) {
        return;
      }

      const changeIdentityData = res.data as {
        token?: string;
      };
      const token = String(changeIdentityData.token || "").trim();

      if (!token) {
        throw new Error("ChangeIdentity did not return a token");
      }

      keepProfileSwitchSession = true;
      completeIdentitySwitch({
        token,
        userProfileId: profile.profileId,
        userTypeId: profile.userTypeId,
        sessionId: switchSession.sessionId,
      });
    } catch (error) {
      if (transientUiGuardRef.current.isCurrent(flowVersion)) {
        console.error("handleProfileSelectionConfirm", error);
        CustomMessage.error(t("common.requestFailed"));
      }
    } finally {
      if (!keepProfileSwitchSession) {
        finishProfileSwitchSession("failed", {
          source: "ServicesProfileSelection",
          toProfileId: profile.profileId,
          toUserTypeId: profile.userTypeId,
        }, switchSession.sessionId);
      }
      if (transientUiGuardRef.current.isCurrent(flowVersion)) {
        setProfileSelectionLoading(false);
      }
    }
  };

  return (
    <div className="services-container">
      <div className="services-content">
        <SimpleBar
          className="services-category-tabs"
          scrollableNodeProps={{
            onTouchStartCapture: (event: TouchEvent<HTMLElement>) =>
              event.stopPropagation(),
          }}
        >
          <div
            className="services-category-tabs__content"
            ref={categoryTabsContentRef}
          >
            <Tabs
              activeKey={activeCategory ?? undefined}
              onChange={handleCategoryChange}
              className="category-tabs"
            >
              {tabList.map((item) => (
                <Tabs.TabPane tab={item.label} key={item.key} />
              ))}
            </Tabs>
          </div>
        </SimpleBar>

        <div
          className={`filter-bar${filtersOverflow ? " filter-bar--compact" : ""}`}
          ref={filterRef}
        >
          <Input
            placeholder={t("formPlaceholders.common.search")}
            prefix={<SearchOutlined />}
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            className="search-input"
          />
          {!filtersOverflow && (
            <>
              <CustomCheckboxSelect
                options={selectOptions}
                value={selectedUserTypes}
                maxTagCount={1}
                placeholder={t("formPlaceholders.pages.services.filters.userType")}
                onChange={handleUserTypeChange}
              />
              <div className="filter-buttons">
                <CustomButton
                  variant="outline"
                  customClassName={`featured-btn ${isFeatured ? 'featured_active' : ''}`}
                  onClick={handleFeaturedClick}
                >
                  {t("servicesPage.featured")}
                </CustomButton>
                <CustomButton
                  variant="outline"
                  customClassName={`featured-btn ${isFavorite ? 'favorite_active' : ''}`}
                  onClick={handleFavoriteClick}
                >
                  {t("servicesPage.favorite")}
                </CustomButton>
              </div>
            </>
          )}
          {filtersOverflow && (
            <button
              className="mobile-filter-trigger"
              onClick={() => {
                setPendingUserTypes([...selectedUserTypes]);
                setPendingFeatured(isFeatured);
                setPendingFavorite(isFavorite);
                setMobileFilterVisible(true);
              }}
            >
              <FilterIcon />
              {(selectedUserTypes.length > 0 || isFeatured || isFavorite) && (
                <span className="mobile-filter-trigger__badge" />
              )}
            </button>
          )}
        </div>
        <MobileFilterModal
          visible={mobileFilterVisible}
          onClose={() => setMobileFilterVisible(false)}
          onConfirm={() => {
            setSelectedUserTypes(pendingUserTypes);
            setIsFeatured(pendingFeatured);
            setIsFavorite(pendingFavorite);
            setCurrentPage(1);
            setMobileFilterVisible(false);
          }}
          sections={[
            {
              title: t("formPlaceholders.pages.services.filters.userType"),
              options: selectOptions,
              multiple: true,
              values: pendingUserTypes,
              onChangeMultiple: (v) => setPendingUserTypes(v as string[]),
            },
            {
              title: t("servicesPage.featured"),
              options: [{ label: t("servicesPage.featured"), value: "featured" }],
              multiple: true,
              values: pendingFeatured ? ["featured"] : [],
              onChangeMultiple: (v) => setPendingFeatured(v.includes("featured")),
            },
            {
              title: t("servicesPage.favorite"),
              options: [{ label: t("servicesPage.favorite"), value: "favorite" }],
              multiple: true,
              values: pendingFavorite ? ["favorite"] : [],
              onChangeMultiple: (v) => setPendingFavorite(v.includes("favorite")),
            },
          ]}
        />

        <div className="services-results">
          {showInitialLoading ? (
            <div className="loading-wrapper">
              <Spin size="large" className="loading-spinner" />
            </div>
          ) : showEmpty ? (
            <div className="empty-box-wrapper">
              <EmptyBox title={t("servicesPage.noServiceAvailable")} />
            </div>
          ) : (
            <motion.div
              key={animationKey}
              className="services-grid"
              variants={SERVICES_GRID_VARIANTS}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
            >
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  className="service-card-motion-item"
                  variants={SERVICE_ITEM_VARIANTS}
                >
                  <ServiceCard
                    service={service}
                    selectOptions={selectOptions}
                    onClickFavorite={onAddFavoriteClick}
                    onStartService={handleStartService}
                    gateLoading={gateLoadingServiceId === service.id}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {servicesLoading && hasServices ? (
            <div className="services-loading-overlay">
              <div className="loading-wrapper">
                <Spin size="large" className="loading-spinner" />
              </div>
            </div>
          ) : null}

          {hasServices && total > 0 && (
            <div className="pagination-wrapper">
              <AppPagination
                className="services-pagination"
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                showSizeChanger
                showTotal={(totalValue) => (
                  <div className="services-page-total-wrapper">
                    <div className="services-page-total">
                      {t("servicesPage.total", { count: totalValue })}
                    </div>
                    <div>
                      {t("servicesPage.pageFraction", {
                        current: currentPage,
                        total: totalPages,
                      })}
                    </div>
                  </div>
                )}
                pageSizeOptions={["9", "20", "50", "100"]}
              />
            </div>
          )}
        </div>
      </div>
      <ServicesProfileSelectionModal
        visible={profileSelectionVisible}
        profiles={profileSelectionOptions}
        confirmLoading={profileSelectionLoading}
        onCancel={handleProfileSelectionCancel}
        onConfirm={handleProfileSelectionConfirm}
      />
      {dialogNode}
    </div>
  );
}
