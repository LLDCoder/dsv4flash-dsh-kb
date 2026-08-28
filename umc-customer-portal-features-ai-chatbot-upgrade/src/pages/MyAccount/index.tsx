import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { Input, Switch, Upload, type UploadProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/lib/upload/interface";
import type { UploadRequestError } from "rc-upload/lib/interface";
import {
  AppPagination,
  CustomButton,
  CustomMessage,
  PersonalPhotoTooltip,
  formatInternationalMobileNumberForDisplay,
} from "@/components/common";
import { useTranslation } from "react-i18next";
import EditIcon from "@/assets/images/PencilSimpleLine.svg";
import DizhiIcon from "@/assets/images/dizhi.svg";
import FlagIcon from "@/assets/images/guoqi.svg";
import YonghuIcon from "@/assets/images/yonghu.svg";
import PersonIcon from "@/assets/images/person.svg";
import NumberIcon from "@/assets/images/number.svg";
import UpdateImg from "@/assets/images/updateImg.png";
import "./index.less";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import EditMobileNumberModal from "./EditMobileNumberModal";
import AddMobileNumberModal from "./AddMobileNumberModal";
import EditEmailModal from "./EditEmailModal";
import ChangePasswordModal from "./ChangePasswordModal";
import { useUserStore } from "@/store/user";
import {
  getUserIndividual,
  getUserEstablishments,
  getUserEstablishmentsPage,
  getNationalityList,
  type UserEstablishmentProfile,
  type GetUserEstablishmentsPageParams,
  type UserEstablishmentPageResponse,
  type NationalityInfo,
} from "@/services/userProfile";
import {
  getCheckUpdateMyAccountInfoRequirement,
  getUserAccountInfo,
  postUpdatePersonalProfilePhoto,
  type UserAccountInfo,
  updateTwoFactorEnabled,
} from "@/services/user";
import { fileUpload, getDocumentUploadResponseUrl } from "@/services/media";
import { resolveFileUrl } from "@/utils/url";
import { formatLastLoginTime } from "@/utils/date";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { getProfileAvatarFallback } from "@/utils/profileAvatar";
import { formatIsGethirdPartyApiQueryParam } from "@/pages/EstablishmentProfile/utils/formHelpers";
import { getPersonalProfilePageMode } from "@/pages/PersonalProfile/utils/expiryUtils";
import { buildExistingPersonalProfileDetailUrl } from "@/pages/PersonalProfile/utils/profileRouteGuard";
import {
  getChangePasswordVerificationKey,
  useChangePasswordVerificationStore,
} from "@/store/change-password-verification-store";

const normalizeStatus = (s?: string | null) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const CHANGE_PASSWORD_VERIFICATION_SESSION_MS = 5 * 60 * 1000;
const MAX_PERSONAL_PHOTO_SIZE_MB = 5;
const PERSONAL_PHOTO_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

interface AccountPhoneNumberValue {
  phoneCountryCode: string;
  phoneLocalNumber: string;
}

type AccountFormValues = Omit<
  UserAccountInfo,
  "phoneNumber" | "phoneCountryCode" | "phoneLocalNumber"
> & {
  phoneNumber: AccountPhoneNumberValue;
};

const toForm = (data: UserAccountInfo): AccountFormValues => {
  const {
    mobileNumber,
    phoneNumber,
    phoneCountryCode,
    phoneLocalNumber,
    ...rest
  } = data;
  const legacyPhoneNumber = String(phoneNumber || mobileNumber || "").trim();

  return {
    ...rest,
    phoneNumber: {
      phoneCountryCode: String(phoneCountryCode || "").trim(),
      phoneLocalNumber: String(
        phoneLocalNumber || legacyPhoneNumber,
      ).trim(),
    },
  };
};

type PersonalStatusRecord = {
  code?: string | number | null;
  name?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
};

type EstablishmentStatusSource = {
  status?: PersonalStatusRecord | string | number | null;
  statusCode?: string | number | null;
  statusName?: string | null;
  statusNameEn?: string | null;
  statusNameAr?: string | null;
  establishmentStatus?: string | null;
  profileStatus?: string | null;
  establishmentProfileStatus?: string | null;
  IsExpiredDays?: string | number | null;
  isExpiredDays?: string | number | null;
};

type PersonalStatusSource = {
  proFileStatus?: PersonalStatusRecord | null;
  profileStatus?: PersonalStatusRecord | string | number | null;
  status?: PersonalStatusRecord | string | number | null;
  statusCode?: string | number | null;
  statusName?: string | null;
  statusNameEn?: string | null;
  statusNameAr?: string | null;
  userProfile?: {
    status?: string | null;
  } | null;
  IsExpiredDays?: string | number | null;
  isExpiredDays?: string | number | null;
} | null | undefined;

type PersonalProfileCardData = PersonalStatusSource & {
  fullNameEn?: string | null;
  fullNameAr?: string | null;
  personalPhotoUrl?: string | null;
  street?: string | null;
  nationalityId?: number | string | null;
  emiratesId?: string | null;
  passportNumber?: string | null;
  uid?: string | null;
  type?: number | null;
  isGethirdPartyApi?: boolean | null;
};

const parseIsExpiredDays = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getProfileIsExpiredDays = (
  profile:
    | {
        IsExpiredDays?: string | number | null;
        isExpiredDays?: string | number | null;
      }
    | null
    | undefined,
): number | null => {
  return parseIsExpiredDays(
    profile?.IsExpiredDays ?? profile?.isExpiredDays ?? null,
  );
};

const isExpiringSoonByIsExpiredDays = (
  profile:
    | {
        IsExpiredDays?: string | number | null;
        isExpiredDays?: string | number | null;
      }
    | null
    | undefined,
): boolean => {
  const isExpiredDays = getProfileIsExpiredDays(profile);
  return (
    isExpiredDays !== null && isExpiredDays >= 0 && isExpiredDays <= 30
  );
};

const isPersonalStatusRecord = (
  value: unknown,
): value is PersonalStatusRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pickEstablishmentStatusFields = (
  profile: EstablishmentStatusSource | null | undefined,
) => {
  const topLevelCode = String(profile?.statusCode ?? "").trim();
  const topLevelNameEn = String(
    profile?.statusNameEn ?? profile?.statusName ?? "",
  ).trim();
  const topLevelNameAr = String(profile?.statusNameAr ?? "").trim();
  const fallbackName = String(
    profile?.establishmentStatus ??
      profile?.profileStatus ??
      profile?.establishmentProfileStatus ??
      "",
  ).trim();
  const status = profile?.status;

  if (isPersonalStatusRecord(status)) {
    const code = String(status.code ?? topLevelCode).trim();
    const nameEn = String(
      status.nameEn ?? status.name ?? topLevelNameEn,
    ).trim();
    const nameAr = String(status.nameAr ?? topLevelNameAr).trim();
    const rawName = String(
      status.name ?? status.nameEn ?? status.nameAr ?? fallbackName,
    ).trim();
    return { code, nameEn, nameAr, rawName };
  }

  if (status !== undefined && status !== null) {
    const normalizedStatus = String(status).trim();
    if (normalizedStatus) {
      if (/^\d+$/.test(normalizedStatus)) {
        return {
          code: normalizedStatus,
          nameEn: topLevelNameEn,
          nameAr: topLevelNameAr,
          rawName: fallbackName,
        };
      }

      return {
        code: topLevelCode,
        nameEn: topLevelNameEn,
        nameAr: topLevelNameAr,
        rawName: normalizedStatus,
      };
    }
  }

  return {
    code: topLevelCode,
    nameEn: topLevelNameEn,
    nameAr: topLevelNameAr,
    rawName: fallbackName,
  };
};

const getEstablishmentStatusDisplayText = (
  profile: EstablishmentStatusSource | null | undefined,
  isAr: boolean,
) => {
  const rawStatus = profile?.status;

  if (typeof rawStatus === "string" || typeof rawStatus === "number") {
    const value = String(rawStatus).trim();
    if (value && !/^\d+$/.test(value)) {
      return value;
    }
  }

  const { nameEn, nameAr, rawName } = pickEstablishmentStatusFields(profile);
  return preferLocalizedEnAr(isAr, nameEn || rawName, nameAr) || rawName || "";
};

const pickPersonalStatusFields = (profile: PersonalStatusSource) => {
  const topLevelCode = String(profile?.statusCode ?? "").trim();
  const topLevelNameEn = String(
    profile?.statusNameEn ?? profile?.statusName ?? "",
  ).trim();
  const topLevelNameAr = String(profile?.statusNameAr ?? "").trim();
  const fallbackName = String(profile?.userProfile?.status ?? "").trim();

  for (const candidate of [
    profile?.proFileStatus,
    profile?.profileStatus,
    profile?.status,
  ]) {
    if (isPersonalStatusRecord(candidate)) {
      const code = String(candidate.code ?? topLevelCode).trim();
      const nameEn = String(
        candidate.nameEn ?? candidate.name ?? topLevelNameEn,
      ).trim();
      const nameAr = String(candidate.nameAr ?? topLevelNameAr).trim();
      const rawName = String(
        candidate.name ?? candidate.nameEn ?? candidate.nameAr ?? fallbackName,
      ).trim();
      return { code, nameEn, nameAr, rawName };
    }

    if (candidate !== undefined && candidate !== null) {
      const normalizedCandidate = String(candidate).trim();
      if (!normalizedCandidate) {
        continue;
      }

      if (/^\d+$/.test(normalizedCandidate)) {
        return {
          code: normalizedCandidate,
          nameEn: topLevelNameEn,
          nameAr: topLevelNameAr,
          rawName: fallbackName,
        };
      }

      return {
        code: topLevelCode,
        nameEn: topLevelNameEn || normalizedCandidate,
        nameAr: topLevelNameAr,
        rawName: normalizedCandidate,
      };
    }
  }

  return {
    code: topLevelCode,
    nameEn: topLevelNameEn || fallbackName,
    nameAr: topLevelNameAr,
    rawName: fallbackName,
  };
};

const getPersonalStatusDisplayText = (
  profile: PersonalStatusSource,
  isAr: boolean,
) => {
  const { nameEn, nameAr, rawName } = pickPersonalStatusFields(profile);
  return preferLocalizedEnAr(isAr, nameEn || rawName, nameAr) || rawName || "-";
};


const personalStatusClassName = (profile: PersonalStatusSource) => {
  const { code, nameEn, rawName } = pickPersonalStatusFields(profile);
  if (code === "1" || code === "2") return "pending";
  if (code === "4" || code === "5" || code === "6") return "reject";
  if (code === "3") return "approved";

  const normalizedStatusName = normalizeStatus(nameEn || rawName);
  if (
    normalizedStatusName === "under review" ||
    normalizedStatusName === "pending" ||
    normalizedStatusName.includes("review")
  ) {
    return "pending";
  }
  if (
    normalizedStatusName === "approved" ||
    normalizedStatusName === "active"
  ) {
    return "approved";
  }
  if (
    normalizedStatusName.includes("reject") ||
    normalizedStatusName.includes("expire") ||
    normalizedStatusName.includes("suspend") ||
    normalizedStatusName.includes("inactive")
  ) {
    return "reject";
  }
  return "approved";
};

const getUploadErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const isPersonalPhotoUpdateAccepted = (response: unknown) => {
  if (response === false) {
    return false;
  }

  if (typeof response === "object" && response !== null && "data" in response) {
    return (response as { data?: boolean }).data !== false;
  }

  return true;
};

const resolveBooleanResponse = (response: unknown, fallback = true) => {
  if (typeof response === "boolean") {
    return response;
  }

  if (typeof response === "object" && response !== null && "data" in response) {
    const { data } = response as { data?: unknown };
    if (typeof data === "boolean") {
      return data;
    }
  }

  return fallback;
};

const MyAccount: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const history = useHistory();
  const userInfo = useUserStore((state: any) => state.userInfo);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [lastLoginDate, setLastLoginDate] = useState<string | undefined>('');
  const [updatingTwoFactor, setUpdatingTwoFactor] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [hasEstablishments, setHasEstablishments] = useState(true);
  const [editMobileModalVisible, setEditMobileModalVisible] = useState(false);
  const [addMobileModalVisible, setAddMobileModalVisible] = useState(false);
  const [editEmailModalVisible, setEditEmailModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [checkUpdateMyAccountInfoRequirement, setCheckUpdateMyAccountInfoRequirement] =
    useState(true);
  const [accountInfo, setAccountInfo] = useState<UserAccountInfo>({ email: "" });
  const accountFormValues = useMemo(() => toForm(accountInfo), [accountInfo]);
  const accountPhoneCountryCode = String(
    accountInfo.phoneCountryCode ?? "",
  ).trim();
  const accountPhoneLocalNumber = String(
    accountInfo.phoneLocalNumber ?? "",
  ).trim();
  const legacyAccountPhoneNumber = String(
    accountInfo.phoneNumber || accountInfo.mobileNumber || "",
  ).trim();
  const accountPhoneDisplay = accountPhoneLocalNumber
    ? [accountPhoneCountryCode, accountPhoneLocalNumber]
        .filter(Boolean)
        .join(" ")
    : formatInternationalMobileNumberForDisplay(legacyAccountPhoneNumber);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [personalProfile, setPersonalProfile] =
    useState<PersonalProfileCardData | null>(null);
  const [nationalityList, setNationalityList] = useState<NationalityInfo[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [uploadingPersonalPhoto, setUploadingPersonalPhoto] = useState(false);
  const [establishmentProfile, setEstablishmentProfile] = useState<any>([]);
  const [filteredEstablishmentProfile, setFilteredEstablishmentProfile] =
    useState<any>([]);
  const [loadingEstablishment, setLoadingEstablishment] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [total, setTotal] = useState(0);
  const isMountedRef = useRef(true);
  const personalPhotoUploadLockRef = useRef(false);
  const changePasswordVerificationKey = getChangePasswordVerificationKey(
    accountInfo?.email || userInfo?.email || "",
  );
  const changePasswordVerificationExpireAt = useChangePasswordVerificationStore(
    (state) => state.sessions[changePasswordVerificationKey] ?? null,
  );
  const startStoredChangePasswordVerificationSession =
    useChangePasswordVerificationStore((state) => state.startSession);
  const clearStoredChangePasswordVerificationSession =
    useChangePasswordVerificationStore((state) => state.clearSession);

  const clearChangePasswordVerificationSession = useCallback(() => {
    clearStoredChangePasswordVerificationSession(changePasswordVerificationKey);
  }, [
    changePasswordVerificationKey,
    clearStoredChangePasswordVerificationSession,
  ]);

  const startChangePasswordVerificationSession = useCallback(() => {
    startStoredChangePasswordVerificationSession(
      changePasswordVerificationKey,
      CHANGE_PASSWORD_VERIFICATION_SESSION_MS,
    );
  }, [
    changePasswordVerificationKey,
    startStoredChangePasswordVerificationSession,
  ]);

  const hasActiveChangePasswordVerificationSession =
    changePasswordVerificationExpireAt !== null &&
    changePasswordVerificationExpireAt > Date.now();

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      personalPhotoUploadLockRef.current = false;
    };
  }, []);

  useEffect(() => {
    getNationalityList()
      .then((response) => {
        if (isMountedRef.current && Array.isArray(response.data)) {
          setNationalityList(response.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load nationality list:", error);
      });
  }, []);

  const accountData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    workEmail: "democommercial@business.ae",
    mobileNumber: mobileNumber,
    workMobileNumber: "-",
    personalProfile: {
      name: "Ahammed Yursef",
      type: "Individual",
      emiratesId: "784-5546-6545654-6",
      nationality: "United Arab Emirates",
      avatar: "",
      status: "Approved",
    },
    lastLoginDate: "Today at 1:47 PM",
    establishments: [
      {
        id: 1,
        name: "A government authority",
        type: "Government",
        location: "Abu Dhabi",
        status: "Approved",
        image: "https://via.placeholder.com/100",
      },
    ],
  };

  const handleEditField = (field: string) => {
    if (field === "mobileNumber") {
      // Check if mobile number is empty or not set
      if (
        !accountFormValues.phoneNumber.phoneLocalNumber ||
        accountFormValues.phoneNumber.phoneLocalNumber === "-"
      ) {
        setAddMobileModalVisible(true);
      } else {
        setEditMobileModalVisible(true);
      }
    } else if (field === "email") {
      setEditEmailModalVisible(true);
    } else {
      console.log("Edit field:", field);
    }
  };

  const handleMobileNumberUpdate = (
    countryCode: string,
    newMobileNumber: string,
  ) => {
    setAccountInfo((prev) => ({
      ...prev,
      phoneNumber: `${countryCode}${newMobileNumber}`,
      phoneCountryCode: countryCode,
      phoneLocalNumber: newMobileNumber,
    }));
    console.log("Mobile number updated:", { countryCode, newMobileNumber });
  };

  const handleEmailUpdate = (newEmail: string) => {
    setAccountInfo((prev) => ({ ...prev, email: newEmail }));
    console.log("Email updated:", newEmail);
  };

  const handleAddPersonalProfile = () => {
    history.push("/my-account/personal-profile?mode=add");
  };

  const handleAddEstablishment = () => {
    history.push("/my-account/establishment-profile?mode=add");
  };

  const handleEditEstablishment = () => {
    history.push("/my-account/establishment-profile?mode=edit");
  };

  function getEstablishmentProfileDetailsPageMode(
    profile: EstablishmentStatusSource | null | undefined,
  ): string {
    const statusKey = resolveEstablishmentStatusKey(profile);

    if (statusKey === "approved") {
      return isExpiringSoonByIsExpiredDays(profile)
        ? "expiringSoon"
        : "approved";
    }

    return statusKey ?? "underReview";
  }

  const canEditPersonalPhoto =
    String(personalProfile?.proFileStatus?.code ?? "").trim() === "1";

  const handlePersonalPhotoImageError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (event.currentTarget.dataset.fallbackApplied === "true") {
        return;
      }

      event.currentTarget.dataset.fallbackApplied = "true";
      event.currentTarget.src = PersonIcon;
    },
    [],
  );

  const beforePersonalPhotoUpload = useCallback(
    (file: RcFile) => {
      const fileExtension = file.name
        .slice(file.name.lastIndexOf("."))
        .toLowerCase();

      if (!PERSONAL_PHOTO_ALLOWED_EXTENSIONS.includes(fileExtension)) {
        CustomMessage.error(
          t("myAccountPage.personalPhoto.invalidFileType"),
        );
        return Upload.LIST_IGNORE;
      }

      if (file.size / 1024 / 1024 > MAX_PERSONAL_PHOTO_SIZE_MB) {
        CustomMessage.error(
          t("myAccountPage.personalPhoto.fileTooLarge", {
            size: MAX_PERSONAL_PHOTO_SIZE_MB,
          }),
        );
        return Upload.LIST_IGNORE;
      }

      return true;
    },
    [t],
  );

  const handlePersonalPhotoUpload: UploadProps["customRequest"] = useCallback(
    async (options) => {
      const { file, onSuccess, onError } = options;

      if (
        personalPhotoUploadLockRef.current ||
        !canEditPersonalPhoto ||
        !isMountedRef.current
      ) {
        return;
      }

      personalPhotoUploadLockRef.current = true;
      if (isMountedRef.current) {
        setUploadingPersonalPhoto(true);
      }

      const formData = new FormData();
      formData.append("files", file);

      try {
        const uploadResponse = await fileUpload(formData);
        const uploadedUrl = getDocumentUploadResponseUrl(uploadResponse);

        if (!uploadedUrl) {
          throw new Error(t("myAccountPage.personalPhoto.uploadFailed"));
        }

        const updateResponse = await postUpdatePersonalProfilePhoto(uploadedUrl);
        if (!isPersonalPhotoUpdateAccepted(updateResponse)) {
          throw new Error(t("myAccountPage.personalPhoto.uploadFailed"));
        }

        if (isMountedRef.current) {
          setPersonalProfile((prevProfile) =>
            prevProfile
              ? {
                  ...prevProfile,
                  personalPhotoUrl: uploadedUrl,
                }
              : prevProfile,
          );
          CustomMessage.success(
            t("myAccountPage.personalPhoto.uploadSuccess"),
          );
        }

        onSuccess?.(uploadedUrl);
      } catch (error) {
        onError?.(error as UploadRequestError);
        console.error("Failed to update personal profile photo:", error);
        CustomMessage.error(t("myAccountPage.personalPhoto.uploadFailed"));
      } finally {
        personalPhotoUploadLockRef.current = false;
        if (isMountedRef.current) {
          setUploadingPersonalPhoto(false);
        }
      }
    },
    [canEditPersonalPhoto, t],
  );

  const renderPersonalPhotoAvatar = () => {
    const avatarNode = (
      <div
        className={`profile-avatar${canEditPersonalPhoto ? " profile-avatar--editable" : ""}${uploadingPersonalPhoto ? " profile-avatar--uploading" : ""}`}
        aria-busy={uploadingPersonalPhoto}
      >
        <img
          src={resolveFileUrl(personalProfile?.personalPhotoUrl) || PersonIcon}
          alt={
            canEditPersonalPhoto
              ? t("myAccountPage.personalPhoto.changeAlt")
              : ""
          }
          onError={handlePersonalPhotoImageError}
        />
        {!uploadingPersonalPhoto ? (
            <span
              className="profile-avatar-upload__overlay"
              aria-hidden="true"
            >
              <img src={UpdateImg} alt="" />
            </span>
          ) : null}
      </div>
    );

    if (!canEditPersonalPhoto) {
      return avatarNode;
    }

    return (
      <Upload
        accept={PERSONAL_PHOTO_ALLOWED_EXTENSIONS.join(",")}
        beforeUpload={beforePersonalPhotoUpload}
        customRequest={handlePersonalPhotoUpload}
        showUploadList={false}
        disabled={uploadingPersonalPhoto}
      >
        <div
          className="profile-avatar-upload"
          aria-label={t("myAccountPage.personalPhoto.changeAlt")}
        >
          {avatarNode}
        </div>
      </Upload>
    );
  };

  const handleViewPersonalProfile = () => {
    if (!personalProfile) return;
    history.push(
      buildExistingPersonalProfileDetailUrl(
        personalProfile,
        getPersonalProfilePageMode(personalProfile),
      ),
    );
  };

  const handleChangePassword = () => {
    setChangePasswordModalVisible(true);
  };

  const handleViewDetails = (id: number) => {
    history.push(`/my-account/establishment-profile/${id}`);
  };

  const handleViewEstablishmentProfile = (
    id: number,
    establishmentCard: EstablishmentStatusSource & Record<string, unknown>,
  ) => {
    const pageMode = getEstablishmentProfileDetailsPageMode(establishmentCard);
    const params = new URLSearchParams({
      mode: "edit",
      id: String(id),
      pageMode: String(pageMode),
    });
    const thirdPartyQP = formatIsGethirdPartyApiQueryParam(
      establishmentCard.isGethirdPartyApi,
    );
    if (thirdPartyQP !== undefined) {
      params.set("isGethirdPartyApi", thirdPartyQP);
    }
    history.push(`/my-account/establishment-profile?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1);
    setHasSearched(true);
    loadEstablishmentProfileWithPagination(1, pageSize, value);
  };

  useEffect(() => {
    if (!changePasswordVerificationExpireAt) {
      return;
    }

    const remainingMs = changePasswordVerificationExpireAt - Date.now();
    if (remainingMs <= 0) {
      clearChangePasswordVerificationSession();
      return;
    }

    const timer = window.setTimeout(() => {
      clearChangePasswordVerificationSession();
    }, remainingMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    changePasswordVerificationExpireAt,
    clearChangePasswordVerificationSession,
  ]);

  const loadAccountInfo = useCallback(async () => {
    if (!userInfo?.id) {
      return;
    }

    const accountInfoResult = await getUserAccountInfo(userInfo.id);
    let resolvedEmail = "";

    if (accountInfoResult?.data) {
      const data = accountInfoResult.data;
      resolvedEmail = data.email ?? "";
      setAccountInfo(data);
      setTwoFactorEnabled(Boolean(data.twoFactorEnabled));
      setLastLoginDate(data.lastLoginDate ?? undefined);
    }

    try {
      if(!resolvedEmail) return;
      const requirementResult = await getCheckUpdateMyAccountInfoRequirement(resolvedEmail);
      console.log(requirementResult, 'requirementResult');
      
      setCheckUpdateMyAccountInfoRequirement(
        resolveBooleanResponse(requirementResult, true),
      );
    } catch (error) {
      console.error(
        "Failed to load update my account info requirement:",
        error,
      );
      setCheckUpdateMyAccountInfoRequirement(true);
    }
  }, [userInfo?.id]);

  useEffect(() => {
    loadAccountInfo();
  }, [loadAccountInfo]);

  useEffect(() => {
    if (userInfo) {
      setFirstName(userInfo.firstName || "");
      setLastName(userInfo.lastName || "");
      setEmail(userInfo.email || "");
      setMobileNumber(userInfo.phoneNumber || "");

      // Load personal profile and establishment profile
      loadPersonalProfile();
      loadEstablishmentProfileWithPagination(
        currentPage,
        pageSize,
        searchKeyword
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userInfo?.id,
    userInfo?.firstName,
    userInfo?.lastName,
    userInfo?.email,
    userInfo?.phoneNumber,
  ]);

  const loadPersonalProfile = async () => {
    console.log("loadPersonalProfile", userInfo);

    if (!userInfo?.id) return;
    try {
      if (isMountedRef.current) {
        setLoadingProfile(true);
      }
      const response = await getUserIndividual(userInfo.id);
      if (!isMountedRef.current) {
        return;
      }

      if (response.data) {
        console.log(response.data, 'response.data');
        setPersonalProfile(response.data);
      } else {
        setPersonalProfile(null);
      }
    } catch (error) {
      console.error("Failed to load personal profile:", error);
      if (isMountedRef.current) {
        setPersonalProfile(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingProfile(false);
      }
    }
  };

  const loadEstablishmentProfile = async () => {
    if (!userInfo?.id) return;

    try {
      setLoadingEstablishment(true);
      const response = await getUserEstablishments(userInfo.id);
      if (response.data && response.data.userEstabishmentListDtos) {
        setEstablishmentProfile(response.data.userEstabishmentListDtos);
        setFilteredEstablishmentProfile(response.data.userEstabishmentListDtos);
      }
    } catch (error) {
      setEstablishmentProfile([]);
      setFilteredEstablishmentProfile([]);
    } finally {
      setLoadingEstablishment(false);
    }
  };

  const loadEstablishmentProfileWithPagination = async (
    page: number = currentPage,
    size: number = pageSize,
    keyword: string = searchKeyword
  ) => {
    if (!userInfo?.id) return;

    try {
      // setLoadingEstablishment(true);
      const params: GetUserEstablishmentsPageParams = {
        userId: userInfo.id,
        pageIndex: page,
        pageSize: size,
        keyword: keyword.trim() || undefined,
      };

      const response = await getUserEstablishmentsPage(params);
      if (response?.data) {
        setFilteredEstablishmentProfile(response.data.items || []);
        setTotal(response.data.totalItems || 0);
        setCurrentPage(response.data.currentPage || page);
        setPageCount(response.data.totalPage || pageCount);
        setPageSize(response.data.itemsPerPage || size);
      } else {
        setFilteredEstablishmentProfile([]);
        setTotal(0);
        setCurrentPage(page);
        setPageCount(pageCount);
        setPageSize(size);
      }
    } catch (error) {
      console.error(
        "Failed to load establishment profile with pagination:",
        error
      );
      setFilteredEstablishmentProfile([]);
      setTotal(0);
    } finally {
      // setLoadingEstablishment(false);
    }
  };

  const handlePageChange = (page: number, size?: number) => {
    const newPageSize = size || pageSize;
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    loadEstablishmentProfileWithPagination(page, newPageSize, searchKeyword);
  };

  const handlePageSizeChange = (current: number, size: number) => {
    setCurrentPage(1);
    setPageSize(size);
    loadEstablishmentProfileWithPagination(1, size, searchKeyword);
  };

  const handleTwoFactorChange = async (checked: boolean) => {
    if (updatingTwoFactor) return;

    setUpdatingTwoFactor(true);
    try {
      await updateTwoFactorEnabled(
        { TwoFactorEnabled: checked },
        { skipErrorToast: true },
      );
      setTwoFactorEnabled(checked);
      CustomMessage.success(
        checked
          ? t("myAccountPage.twoFactor.enabledToast")
          : t("myAccountPage.twoFactor.disabledToast"),
      );
    } catch (error) {
      console.error(error);
      CustomMessage.error(t("myAccountPage.twoFactor.updateError"));
    } finally {
      setUpdatingTwoFactor(false);
    }
  };

  const resolveEstablishmentStatusKey = (
    profile: EstablishmentStatusSource | null | undefined,
  ) => {
    const { code, nameEn, nameAr, rawName } = pickEstablishmentStatusFields(
      profile,
    );
    const localizedRaw = preferLocalizedEnAr(
      isAr,
      nameEn || rawName,
      nameAr,
    );
    const normalizedCandidates = new Set(
      [nameEn, nameAr, rawName, localizedRaw]
        .map((item) => normalizeStatus(item))
        .filter(Boolean),
    );
    const matches = (value?: string) => {
      const normalizedValue = normalizeStatus(value);
      return normalizedValue ? normalizedCandidates.has(normalizedValue) : false;
    };

    if (code === "1") return "pendingCompletion";
    if (code === "2") return "underReview";
    if (code === "3") return "approved";
    if (code === "4") return "rejected";
    if (code === "5") return "expired";
    if (code === "6") return "suspended";

    if (
      matches("Pending Completion") ||
      matches(t("myAccountPage.establishmentStatus.pendingCompletion"))
    ) {
      return "pendingCompletion";
    }
    if (
      matches("Under Review") ||
      matches(t("myAccountPage.establishmentStatus.underReview"))
    ) {
      return "underReview";
    }
    if (
      matches("Pending") ||
      matches(t("myAccountPage.establishmentStatus.pending"))
    ) {
      return "pending";
    }
    if (
      matches("Rejected") ||
      matches(t("myAccountPage.establishmentStatus.rejected"))
    ) {
      return "rejected";
    }
    if (
      matches("Expired") ||
      matches(t("myAccountPage.establishmentStatus.expired"))
    ) {
      return "expired";
    }
    if (
      matches("Suspended") ||
      matches(t("myAccountPage.establishmentStatus.suspended"))
    ) {
      return "suspended";
    }
    if (
      matches("Approved") ||
      matches(t("myAccountPage.establishmentStatus.approved")) ||
      matches("Active")
    ) {
      return "approved";
    }

    return null;
  };

  const establishmentStatusClassName = (
    profile: EstablishmentStatusSource | null | undefined,
  ) => {
    const statusKey = resolveEstablishmentStatusKey(profile);
    if (
      statusKey === "underReview" ||
      statusKey === "pending" ||
      statusKey === "pendingCompletion"
    ) {
      return "pending";
    }
    if (statusKey === "approved") {
      return "approved";
    }
    if (
      statusKey === "rejected" ||
      statusKey === "expired" ||
      statusKey === "suspended"
    ) {
      return "reject";
    }
    return "pending";
  };

  const displayEstablishmentStatus = (
    profile: EstablishmentStatusSource | null | undefined,
  ) => {
    return getEstablishmentStatusDisplayText(profile, isAr);
  };

  const displayPersonalStatus = (profile: PersonalStatusSource) => {
    return getPersonalStatusDisplayText(profile, isAr);
  };

  const personalProfileDisplayName =
    preferLocalizedEnAr(
      isAr,
      personalProfile?.fullNameEn,
      personalProfile?.fullNameAr,
    ) || "-";

  const personalNationalityName = (() => {
    const nationalityId = personalProfile?.nationalityId;
    if (nationalityId === null || nationalityId === undefined || nationalityId === "") {
      return "";
    }
    const match = nationalityList.find(
      (item) => String(item.id) === String(nationalityId),
    );
    return match ? preferLocalizedEnAr(isAr, match.nameEn, match.nameAr) : "";
  })();

  return (
    <div className="my-account">
      <div className="account-section">
        <h2 className="section-title">{t("myAccountPage.sections.accountInformation")}</h2>
        <div className="account-fields">
          <div className="field-row">
            <div className="field-item">
              <label className="field-label">{t("myAccountPage.fields.firstName")}</label>
              <div className="field-value-wrapper no-edit">
                <span className="field-value">{accountInfo.firstName}</span>
              </div>
            </div>
            <div className="field-item">
              <label className="field-label">{t("myAccountPage.fields.lastName")}</label>
              <div className="field-value-wrapper no-edit">
                <span className="field-value">{accountInfo.lastName}</span>
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field-item">
              <label className="field-label">{t("myAccountPage.fields.email")}</label>
              <div className="field-value-wrapper">
                <span className="field-value">{accountInfo?.email || "-"}</span>
                <img
                  src={EditIcon}
                  alt={t("myAccountPage.alt.edit")}
                  className="edit-icon"
                  onClick={() => handleEditField("email")}
                />
              </div>
            </div>

            {/* <div className="field-item">
              <label className="field-label">Work Email</label>
              <div className="field-value-wrapper">
                <span className="field-value">{accountData.workEmail}</span>
                <img
                  src={EditIcon}
                  alt="edit"
                  className="edit-icon"
                  onClick={() => handleEditField("workEmail")}
                />
              </div>
            </div> */}
            <div className="field-item">
              <label className="field-label">{t("myAccountPage.fields.mobileNumber")}</label>
              <div className="field-value-wrapper">
                <span className="field-value field-value-ltr" dir="ltr">
                  {accountPhoneDisplay || "-"}
                </span>
                <img
                  src={EditIcon}
                  alt={t("myAccountPage.alt.edit")}
                  className="edit-icon"
                  onClick={() => handleEditField("mobileNumber")}
                />
              </div>
            </div>

            {/* <div className="field-item">
              <label className="field-label">Work Mobile Number</label>
              <div className="field-value-wrapper">
                <span className="field-value">
                  {accountData.workMobileNumber}
                </span>
                <img
                  src={EditIcon}
                  alt="edit"
                  className="edit-icon"
                  onClick={() => handleEditField("workMobileNumber")}
                />
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Personal Profile */}
      <div className="account-section">
        <h2 className="section-title">{t("myAccountPage.sections.personalProfile")}</h2>

        {loadingProfile ? (
          <div>{t("myAccountPage.loading")}</div>
        ) : personalProfile ? (
          <div className="profile-card">
            <div className="profile-info">
              <div className="profile-details">
                <h3
                  className="profile-name"
                  title={
                    personalProfileDisplayName !== "-"
                      ? personalProfileDisplayName
                      : undefined
                  }
                >
                  {personalProfileDisplayName}
                </h3>
                <div
                  className={`profile-status ${personalStatusClassName(
                    personalProfile,
                  )}`}
                >
                  {displayPersonalStatus(personalProfile)}
                </div>
                <div className="profile-item">
                  <img src={YonghuIcon} alt="" className="profile-icon" />
                  <span>{t("myAccountPage.profileTypes.individual")}</span>
                </div>
                <div className="profile-item">
                  <img src={NumberIcon} alt="" className="profile-icon" />
                  <span>
                    {personalProfile?.emiratesId ||
                      personalProfile?.passportNumber ||
                      personalProfile?.uid ||
                      ""}
                  </span>
                </div>
                <div className="profile-item">
                  <img
                    src={FlagIcon}
                    alt=""
                    className="profile-icon"
                  />
                  <span>{personalNationalityName}</span>
                </div>
              </div>
            </div>
            <div className="profile-right">
              <div className="profile-avatar-with-tooltip">
                {renderPersonalPhotoAvatar()}
                {canEditPersonalPhoto ? <PersonalPhotoTooltip /> : null}
              </div>

              <CustomButton
                customClassName="profile-btn"
                text={t("myAccountPage.actions.details")}
                variant="primary"
                onClick={handleViewPersonalProfile}
              />
            </div>
          </div>
        ) : (
          <EmptyBox
            title={t("myAccountPage.emptyPersonalTitle")}
            buttonText={t("myAccountPage.emptyPersonalButton")}
            onClick={handleAddPersonalProfile}
            hasButton
          />
        )}
      </div>

      {/* Establishment Profile */}
      <div className="account-section">
        <div className="establishment-header">
          <h2 className="section-title">{t("myAccountPage.sections.establishmentProfile")}</h2>
          {(filteredEstablishmentProfile.length > 0 || hasSearched) && (
            <div className="establishment-actions">
              <Input
                placeholder={t("formPlaceholders.common.search")}
                prefix={<SearchOutlined />}
                value={searchKeyword}
                className="account-section-search"
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
              />
              <CustomButton
                text={t("myAccountPage.actions.addEntityEstablishment")}
                variant="outline"
                onClick={handleAddEstablishment}
              />
            </div>
          )}
        </div>

        {loadingEstablishment ? (
          <div>{t("myAccountPage.loading")}</div>
        ) : filteredEstablishmentProfile &&
          filteredEstablishmentProfile.length > 0 ? (
          <div className="establishment-list">
            {filteredEstablishmentProfile.map((establishment: any) => {
              const establishmentDisplayName =
                preferLocalizedEnAr(
                  isAr,
                  establishment.nameEn,
                  establishment.nameAr,
                ) || "-";
              const establishmentAvatar = getProfileAvatarFallback({
                kind: "establishment",
                userTypeId: establishment.establishmentTypeId,
              });

              return (
                <div key={establishment.id} className="profile-card">
                  <div className="profile-info">
                    <div className="profile-details">
                      <h3
                        className="profile-name"
                        title={
                          establishmentDisplayName !== "-"
                            ? establishmentDisplayName
                            : undefined
                        }
                      >
                        {establishmentDisplayName}
                      </h3>
                      <div
                        className={`profile-status ${establishmentStatusClassName(
                          establishment,
                        )}`}
                      >
                        {displayEstablishmentStatus(establishment)}
                      </div>
                      <div className="profile-item">
                        <img
                          src={YonghuIcon}
                          alt=""
                          className="profile-icon"
                        />
                        <span>
                          {preferLocalizedEnAr(
                            isAr,
                            establishment.establishmentTypeNameEn,
                            establishment.establishmentTypeNameAr,
                          ) || establishment.establishmentTypeName || ""}
                        </span>
                      </div>
                      {establishment.licenseNumber && (
                        <div className="profile-item">
                          <img
                            src={NumberIcon}
                            alt=""
                            className="profile-icon"
                          />
                          <span>{establishment.licenseNumber || ""}</span>
                        </div>
                      )}
                      <div className="profile-item">
                        <img
                          src={DizhiIcon}
                          alt=""
                          className="profile-icon"
                        />
                        <span>
                          {establishment.addressName ||
                            preferLocalizedEnAr(
                              isAr,
                              establishment.address?.nameEn,
                              establishment.address?.nameAr,
                            ) ||
                            establishment.address?.street ||
                            ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="profile-right">
                    <div className="profile-avatar">
                      <img src={establishmentAvatar} alt="" />
                    </div>
                    <CustomButton
                      customClassName="profile-btn"
                      text={t("myAccountPage.actions.details")}
                      variant="primary"
                      onClick={() =>
                        handleViewEstablishmentProfile(establishment.id, establishment)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : filteredEstablishmentProfile &&
          filteredEstablishmentProfile.length === 0 &&
          hasSearched ? (
          <EmptyBox
            title={t("myAccountPage.emptyEstablishmentSearchTitle")}
            buttonText={t("myAccountPage.emptySearchClear")}
            onClick={() => handleSearch("")}
            hasButton
          />
        ) : (
          <EmptyBox
            title={t("myAccountPage.emptyEstablishmentTitle")}
            buttonText={t("myAccountPage.actions.addEntityEstablishment")}
            onClick={handleAddEstablishment}
            hasButton
          />
        )}

        {filteredEstablishmentProfile &&
          filteredEstablishmentProfile.length > 0 &&
          total > 6 && (
            <div className="establishment-pagination">
              <AppPagination
                current={currentPage}
                total={total}
                pageSize={pageSize}
                showSizeChanger={true}
                showQuickJumper={false}
                showTotal={(total, range) => `${currentPage}/${pageCount}`}
                pageSizeOptions={["6", "12", "18", "24"]}
                onChange={handlePageChange}
                onShowSizeChange={handlePageSizeChange}
                className="custom-pagination"
              />
            </div>
          )}
      </div>

      {/* Login Settings */}
      <div className="account-section">
        <h2 className="section-title">{t("myAccountPage.sections.loginSettings")}</h2>
        <div className="login-settings">
          <div className="setting-item">
            <div className="setting-info">
              <h4 className="setting-title">
                {t("myAccountPage.loginSettings.twoFactorTitle")}
              </h4>
              <p className="setting-description">
                {t("myAccountPage.loginSettings.twoFactorDescription")}
              </p>
            </div>
            <Switch
              className="two-factor-switch"
              checked={twoFactorEnabled}
              loading={updatingTwoFactor}
              disabled={updatingTwoFactor}
              onChange={handleTwoFactorChange}
            />
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <h4 className="setting-title">{t("myAccountPage.loginSettings.lastLoginTitle")}</h4>
              <p className="setting-description">
                {formatLastLoginTime(
                  lastLoginDate)}
              </p>
            </div>
            <CustomButton
              text={t("myAccountPage.actions.changePassword")}
              variant="outline"
              customClassName="login-settings-change-password-btn"
              onClick={handleChangePassword}
            />
          </div>
        </div>
      </div>

      <EditMobileNumberModal
        visible={editMobileModalVisible}
        onClose={() => setEditMobileModalVisible(false)}
        currentAccountInfo={accountInfo}
        onSuccess={handleMobileNumberUpdate}
      />

      <AddMobileNumberModal
        visible={addMobileModalVisible}
        onClose={() => setAddMobileModalVisible(false)}
        onSuccess={handleMobileNumberUpdate}
      />

      <EditEmailModal
        visible={editEmailModalVisible}
        onClose={() => setEditEmailModalVisible(false)}
        currentEmail={accountInfo?.email || ""}
        checkUpdateMyAccountInfoRequirement={
          checkUpdateMyAccountInfoRequirement
        }
        onSuccess={handleEmailUpdate}
      />

      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
        email={accountInfo?.email || userInfo?.email || ""}
        resumeToVerification={hasActiveChangePasswordVerificationSession}
        onVerificationSessionStart={startChangePasswordVerificationSession}
        onVerificationSessionReset={clearChangePasswordVerificationSession}
      />

    </div>
  );
};

export default MyAccount;
