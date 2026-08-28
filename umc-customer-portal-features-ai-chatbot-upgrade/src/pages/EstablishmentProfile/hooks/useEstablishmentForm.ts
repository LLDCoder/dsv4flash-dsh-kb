import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Form } from "antd";
import CustomMessage from "@/components/common/CustomMessage";
import moment, { type Moment } from "moment";
import {
  getAllUserType,
  getTypeDictionaryList,
  getLicensingAuthority,
  getUserEstablishmentByID,
  addUserProfileEstablishment,
  updateUserProfileEstablishment,
  getRegionList,
  getAreaList,
  postRetrieveLicenseDetailsMOEc,
  type TypeDictionary,
  type AddUserProfileEstablishmentParams,
  type UpdateUserProfileEstablishmentParams,
  type UserEstablishmentProfile,
} from "@/services/userProfile";
import { getUserEmailByUserId } from "@/services/user";
import { useUserStore } from "@/store/user";
import i18n from "@/localization/config";
import type { FormInstance } from "antd";
import {
  GOVERNMENT_PERMANENT_LICENSE_EXPIRY_DATE,
  LICENSE_OWNER_MAX_COUNT,
  isValidCommercialLicenseNumber,
  type EstablishmentPageMode,
} from "../utils/constants";
import {
  collectLicenseOwnerPartnerIds,
  normalizeUserTypeOption,
  formatApiDate,
  formatApiDateEndOfDay,
  getNullableString,
  getNumberOrZero,
  getNumberOrNull,
  pickEstablishmentWorkEmail,
  pickEstablishmentProfileId,
  coalesceEstablishmentAddressId,
  isPlainObject,
  mapPartnerToApiPartner,
  type EstablishmentFormValues,
  type EstablishmentPhoneValue,
  toForm as establishmentToForm,
  mergeEstablishmentDataSources,
  isEstablishmentProfileLocked,
  pickEstablishmentApiStatusFields,
  parseEstablishmentProfileDetailUrlPageMode,
  resolveEstablishmentProfilePageMode,
  extractMoeLicenseDetails,
  extractMoePartnerRows,
  mapMoeLicenseDetailsToFormValues,
  countLicenseOwners,
  mergePartnerLists,
  normalizeEstablishmentPartnersApiRow,
} from "../utils/formHelpers";
import {
  getExpiryAlertDaysFromIsExpiredDays,
  getIsExpiredDaysFromSource,
} from "@/utils/expiry";
import {
  isCommercialGroupSubType,
  isGovernmentGroupSubType,
  isLicenseOwnerApplicableSubType,
} from "../utils/subTypeHelpers";
import type { PartnerData } from "../components/modal/PartnerModal";
import type { UseAddressDataReturn } from "./useAddressData";
import { buildCoordinateParams } from "@/utils/addressCoordinates";
import { isPartnerSectionValid } from "../utils/partnerSectionValidation";

export type PartnerSectionSubmitError =
  | "noPartners"
  | "noOwner"
  | "multipleOwners";

type FormValidationError = {
  errorFields?: Array<{ name?: Array<string | number> }>;
};

const getFormValidationError = (
  error: unknown,
): FormValidationError | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const validationError = error as FormValidationError;
  return Array.isArray(validationError.errorFields)
    ? validationError
    : undefined;
};

type EstablishmentApiFormValues = Omit<
  AddUserProfileEstablishmentParams,
  | "personalMobile"
  | "mobileCountryCode"
  | "mobileLocalNumber"
  | "establishmentMobile"
  | "phoneCountryCode"
  | "phoneLocalNumber"
> & {
  establishmentMobile: EstablishmentPhoneValue;
};

const toApi = (
  values: EstablishmentApiFormValues,
): AddUserProfileEstablishmentParams => {
  const { establishmentMobile, ...rest } = values;
  const phoneCountryCode = String(
    establishmentMobile.phoneCountryCode ?? "",
  ).trim();
  const phoneLocalNumber = String(
    establishmentMobile.phoneLocalNumber ?? "",
  ).trim();
  const hasEstablishmentMobile = phoneLocalNumber.length > 0;

  return {
    ...rest,
    personalMobile: "",
    mobileCountryCode: "",
    mobileLocalNumber: "",
    establishmentMobile: hasEstablishmentMobile
      ? `${phoneCountryCode}${phoneLocalNumber}`
      : "",
    phoneCountryCode: hasEstablishmentMobile ? phoneCountryCode : "",
    phoneLocalNumber: hasEstablishmentMobile ? phoneLocalNumber : "",
  };
};

export interface EstablishmentDataSource {
  /** Lower number = higher precedence when merging field values across sources. */
  priority: number;
  fetchData: (id: string) => Promise<Record<string, unknown> | null>;
}

interface UseEstablishmentFormParams {
  form: FormInstance<EstablishmentFormValues>;
  mode: string | null;
  establishmentId: string | null;
  /** My Account Details link — precedence over API-derived lifecycle while present */
  pageModeSearchParam?: string | null;
  /** My Account Details link — third-party MOE mapping flag when present in query */
  listingIsGethirdPartyApi?: boolean | null;
  addressData: UseAddressDataReturn;
  partners: PartnerData[];
  setPartners: Dispatch<SetStateAction<PartnerData[]>>;
  setOwnerPartnerIds: (ids: string[]) => void;
  /**
   * Optional additional data sources merged with the primary
   * GetUserEstablishmentByID call. Each source supplies a priority number
   * (lower = higher precedence) and an async fetchData function.
   * When omitted, only the primary source is used.
   */
  dataSources?: EstablishmentDataSource[];
}

export interface EstablishmentFormState {
  showFullCommercialForm: boolean;
  isLoadingCommercialData: boolean;
  isEstablishmentDataLoaded: boolean;
  fetchedCommercialData: any;
  isSubmitting: boolean;
  fieldsDisabled: boolean;
  IDType: string;
  establishmentSubType: number;
  establishmentSubTypeList: TypeDictionary[];
  loadingSubTypes: boolean;
  idTypeList: TypeDictionary[];
  loadingIdTypes: boolean;
  authorityList: TypeDictionary[];
  loadingAuthorities: boolean;
  currentEstablishmentId: number | null;
  currentEstablishment: any;
  isFormValid: boolean;
  emailList: { label: string; value: string }[];
  editEmailModalVisible: boolean;
  successModalShow: boolean;
  isEditForm: boolean;
  isReject: boolean;
  isProfileUnderReview: boolean;
  /** Viewing an existing establishment that must be read-only (under review or approved). */
  isEstablishmentReadOnly: boolean;
  isCommercialGroup: boolean;
  isGovernmentGroup: boolean;
  isExpriry: boolean;
  isLess30: boolean;
  isSingleEditForm: boolean;
  isLicenseExpiryRestricted: boolean;
  expriryDays: number;
  /** UI lifecycle mode: URL `pageMode` before detail load, then derived from API + `IsExpiredDays`. */
  pageMode: EstablishmentPageMode;
  handleSubTypeChange: (value: number) => void;
  handleChangeIDType: (value: string) => void;
  handleLicenseFieldsChange: () => void;
  handleFormValuesChange: (changedValues: any) => void;
  handleSubmit: () => void;
  handleEmailUpdate: (email: string) => void;
  canEditField: (fieldName: string) => boolean;
  setEditEmailModalVisible: (visible: boolean) => void;
  setSuccessModalShow: (visible: boolean) => void;
  loadEstablishmentData: (id: string) => Promise<void>;
  applyEstablishmentData: (data: Record<string, unknown>) => Promise<void>;
  /** Set when commercial submit is blocked: partners exist but none is license owner (drives AlertBanner). */
  partnerSectionSubmitError: PartnerSectionSubmitError | null;
}

export const useEstablishmentForm = ({
  form,
  mode,
  establishmentId,
  pageModeSearchParam,
  listingIsGethirdPartyApi,
  addressData,
  partners,
  setPartners,
  setOwnerPartnerIds,
  dataSources,
}: UseEstablishmentFormParams): EstablishmentFormState => {
  const userInfo = useUserStore((state: any) => state.userInfo);
  const [showFullCommercialForm, setShowFullCommercialForm] = useState(false);
  const [isLoadingCommercialData, setIsLoadingCommercialData] = useState(false);
  const [isEstablishmentDataLoaded, setIsEstablishmentDataLoaded] = useState(
    () => mode !== "edit" || !establishmentId,
  );
  const [fetchedCommercialData, setFetchedCommercialData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldsDisabled, setFieldsDisabled] = useState(false);
  /** Form keys made read-only by MOE mapping; phone is included only after strict validation. */
  const [moeReadOnlyFields, setMoeReadOnlyFields] = useState<Record<string, boolean>>({});
  /** MOE license details mapped into the form; send `isGethirdPartyApi` on submit. */
  const [moeThirdPartyMappingSucceeded, setMoeThirdPartyMappingSucceeded] = useState(false);
  /** From My Account query and/or GET establishment; OR’d with MOE success for save payload. */
  const [persistedThirdPartyApiFlag, setPersistedThirdPartyApiFlag] = useState(false);
  const [IDType, setIDType] = useState("1");
  const [establishmentSubType, setEstablishmentSubType] = useState<number>(0);
  const [establishmentSubTypeList, setEstablishmentSubTypeList] = useState<TypeDictionary[]>([]);
  const [loadingSubTypes, setLoadingSubTypes] = useState(false);
  const [idTypeList, setIdTypeList] = useState<TypeDictionary[]>([]);
  const [loadingIdTypes, setLoadingIdTypes] = useState(false);
  const [authorityList, setAuthorityList] = useState<TypeDictionary[]>([]);
  const [loadingAuthorities, setLoadingAuthorities] = useState(false);
  const [currentEstablishmentId, setCurrentEstablishmentId] = useState<number | null>(null);
  const [currentEstablishment, setCurrentEstablishment]: any = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [emailList, setEmailList] = useState<{ label: string; value: string }[]>([]);
  const [editEmailModalVisible, setEditEmailModalVisible] = useState(false);
  const [successModalShow, setSuccessModalShow] = useState(false);
  const [partnerSectionSubmitError, setPartnerSectionSubmitError] = useState<
    PartnerSectionSubmitError | null
  >(null);

  const commercialFetchSeqRef = useRef(0);
  /** Ref-based debounce so back-to-back calls in one tick clear the same timer (useState timer id is stale). */
  const licenseFieldsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Same licenseERN + expiry date must not start a second in-flight MOE request (`seq` only ignores response, not duplicate HTTP). */
  const moeLicenseInFlightKeyRef = useRef<string | null>(null);
  /** Current add-mode commercial context keyed by `licenseERN|expiry`; used to avoid clearing partner state on same-key refetches. */
  const activeCommercialLookupKeyRef = useRef<string | null>(null);
  /** Last successfully mapped MOE lookup; identical follow-up blurs can safely skip the same request. */
  const lastSuccessfulMoeLookupKeyRef = useRef<string | null>(null);
  /** After MOE fills the form programmatically, skip one debounced license lookup (avoids duplicate HTTP). */
  const suppressNextLicenseLookupRef = useRef(false);
  const prevEstablishmentEmirateIdRef = useRef<number | undefined>(undefined);
  /** Dedupe console warnings when `checkFormValidity` runs frequently */
  const missingRequiredSignatureRef = useRef<string>("");
  /** One MOE bootstrap per rejected + third-party deeplink establishment load (handles expired-license rejections). */
  const rejectedThirdPartyMoeBootstrapKeyRef = useRef<string | null>(null);

  /** Latest validity check — used by async `loadEmailList` without stale-deps churn */
  const checkFormValidityRef = useRef<() => Promise<void>>(async () => {});

  const establishmentEmirateId = Form.useWatch("emirate", form);

  const { statusCode, statusName } = pickEstablishmentApiStatusFields(
    currentEstablishment as Record<string, unknown>,
  );
  const pageMode = resolveEstablishmentProfilePageMode({
    mode,
    establishmentId,
    pageModeSearchParam,
    statusCode,
    statusName,
    establishment: currentEstablishment,
  });
  /** New commercial profile (`add`) or resubmit after rejection (`edit` + rejected). */
  const allowMoeCommercialLicenseLookup =
    mode === "add" || (mode === "edit" && pageMode === "rejected");

  useEffect(() => {
    const loadIdTypeList = async () => {
      try {
        setLoadingIdTypes(true);
        const response = await getTypeDictionaryList("LegalIdType");
        if (response.data) setIdTypeList(response.data);
      } catch (error) {
        console.error("Failed to load ID types:", error);
      } finally {
        setLoadingIdTypes(false);
      }
    };

    const loadEstablishmentSubTypeList = async () => {
      try {
        setLoadingSubTypes(true);
        const response = await getAllUserType();
        if (response.data) {
          setEstablishmentSubTypeList(
            response.data
              .filter(
                (item) =>
                  item?.isShown !== false &&
                  !["1", "99"].includes(String(item?.code ?? "")),
              )
              .map(normalizeUserTypeOption),
          );
        }
      } catch (error) {
        console.error("Failed to load establishment sub-types:", error);
      } finally {
        setLoadingSubTypes(false);
      }
    };

    loadIdTypeList();
    loadEstablishmentSubTypeList();
  }, []);

  // Licensing authority depends on Establishment Information -> Emirate field and on the
  // establishment sub-type, which decides whether free zone or mainland authorities apply.
  // The already-selected authority does not need clearing here: handleSubTypeChange resets
  // licensingAuthority for every sub-type offered by the picker.
  useEffect(() => {
    const emirateId =
      establishmentEmirateId !== undefined && establishmentEmirateId !== null
        ? Number(establishmentEmirateId)
        : undefined;

    if (!emirateId || Number.isNaN(emirateId)) {
      prevEstablishmentEmirateIdRef.current = undefined;
      setAuthorityList([]);
      form.setFieldsValue({ licensingAuthority: undefined });
      return;
    }

    const prev = prevEstablishmentEmirateIdRef.current;
    if (prev !== undefined && prev !== emirateId) {
      form.setFieldsValue({ licensingAuthority: undefined });
    }
    prevEstablishmentEmirateIdRef.current = emirateId;

    let cancelled = false;
    const load = async () => {
      try {
        setLoadingAuthorities(true);
        const response = await getLicensingAuthority(
          emirateId,
          establishmentSubType || undefined,
        );
        if (!cancelled) setAuthorityList(response.data || []);
      } catch (error) {
        if (!cancelled) setAuthorityList([]);
        console.error("Failed to load licensing authorities:", error);
      } finally {
        if (!cancelled) setLoadingAuthorities(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [establishmentEmirateId, establishmentSubType, form]);

  useEffect(() => {
    setTimeout(() => {
      checkFormValidity();
    }, 500);
  }, [establishmentSubType, IDType]);

  useEffect(() => {
    if (mode === "edit" && establishmentId) {
      loadEstablishmentData(establishmentId);
    }
  }, [mode, establishmentId]);

  useEffect(() => {
    setPersistedThirdPartyApiFlag(listingIsGethirdPartyApi ?? false);
  }, [establishmentId, listingIsGethirdPartyApi]);

  useEffect(() => {
    return () => {
      if (licenseFieldsDebounceRef.current) {
        clearTimeout(licenseFieldsDebounceRef.current);
        licenseFieldsDebounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const partnerSectionVisible =
      isCommercialGroupSubType(
        establishmentSubType,
        establishmentSubTypeList,
      ) &&
      (mode !== "add" || showFullCommercialForm);

    if (!partnerSectionVisible) {
      setPartnerSectionSubmitError(null);
      return;
    }

    const licenseOwnerRulesApply = isLicenseOwnerApplicableSubType(
      establishmentSubType,
      establishmentSubTypeList,
    );
    const ownerCount = countLicenseOwners(partners);
    setPartnerSectionSubmitError((prev) => {
      if (prev === null) return null;
      if (partners.length === 0) return "noPartners";
      if (prev === "noPartners") return null;
      if (!licenseOwnerRulesApply) return null;
      if (prev === "noOwner" && ownerCount >= 1) return null;
      if (
        prev === "multipleOwners" &&
        ownerCount >= 1 &&
        ownerCount <= LICENSE_OWNER_MAX_COUNT
      ) {
        return null;
      }
      return prev;
    });
  }, [
    partners,
    establishmentSubType,
    establishmentSubTypeList,
    mode,
    showFullCommercialForm,
  ]);

  /**
   * Applies a merged raw API data object to form state and form fields.
   * All network calls have already been made before this function is invoked.
   * This is the single place that owns form-field mapping and state synchronization.
   */
  const applyEstablishmentData = async (data: Record<string, unknown>) => {
    setCurrentEstablishment(data);
    setCurrentEstablishmentId(pickEstablishmentProfileId(data));
    setEstablishmentSubType(data.establishmentTypeId as number);
    setShowFullCommercialForm(true);

    const listedThirdParty = data.isGethirdPartyApi;
    if (typeof listedThirdParty === "boolean") {
      setPersistedThirdPartyApiFlag(listedThirdParty);
    }

    const partnersList = Array.isArray(data.partners) ? data.partners : [];
    const partnersInfoList = Array.isArray(data.partnersInfo) ? data.partnersInfo : [];
    /** License owner flags are usually present on richer `partnersInfo` rows. */
    const ownedPartnerIds = collectLicenseOwnerPartnerIds(
      (partnersInfoList.length > 0 ? partnersInfoList : partnersList).filter(
        (item): item is { id?: unknown; isOwner?: unknown } => isPlainObject(item),
      ),
    );
    setOwnerPartnerIds(ownedPartnerIds);

    const dataPartners =
      partnersInfoList.length > 0
        ? partnersInfoList.map((item) => {
            if (!isPlainObject(item)) return item as PartnerData;
            const sparse = partnersList.find(
              (p) => isPlainObject(p) && item.id !== undefined && p.id === item.id,
            );
            const merged =
              sparse && isPlainObject(sparse)
                ? { ...sparse, ...item }
                : item;
            return normalizeEstablishmentPartnersApiRow(merged);
          })
        : partnersList.map((entry) =>
            isPlainObject(entry)
              ? normalizeEstablishmentPartnersApiRow(entry)
              : (entry as PartnerData),
          );
    setPartners((dataPartners || []) as PartnerData[]);

    const emirateId = coalesceEstablishmentAddressId(
      undefined,
      (data.addressEmirate ?? data.addressEmirateId ?? data.emirate ?? data.emirateId) as
        | string | number | null | undefined,
    );
    const regionId = coalesceEstablishmentAddressId(
      undefined,
      (data.region ?? data.regionId ?? data.addressRegion) as
        | string | number | null | undefined,
    );
    const areaId = coalesceEstablishmentAddressId(
      undefined,
      (data.area ?? data.areaId ?? data.addressArea) as
        | string | number | null | undefined,
    );

    const mapped = establishmentToForm(data as UserEstablishmentProfile);
    const idTypeRaw = mapped.idType;
    setIDType(
      idTypeRaw !== undefined && idTypeRaw !== null && idTypeRaw !== ""
        ? String(idTypeRaw)
        : "1",
    );

    if (emirateId) {
      addressData.setSelectedEmirateId(emirateId);
      try {
        const rr = await getRegionList(emirateId);
        if (rr.data) addressData.setFilteredRegionList(rr.data);
      } catch (error) {
        console.error("Failed to load regions for emirate:", emirateId, error);
      }
    }

    if (regionId) {
      addressData.setSelectedRegionId(regionId);
      try {
        const ar = await getAreaList(regionId);
        if (ar.data) addressData.setFilteredAreaList(ar.data);
      } catch (error) {
        console.error("Failed to load areas for region:", regionId, error);
      }
    }

    const documentUrls = {
      commercialLicense: data.licenseCopyUrl ?? data.uploadCommerceLicenseURL,
      tenancyContract: data.tenancyContractCopyUrl ?? data.uploadTenancyContractURL,
      memorandum: data.memorandumOfAssociationCopyUrl ?? data.uploadMemorandumOfAssociationURL,
      powerOfAttorney: data.powerOfAttorneyCopyUrl ?? data.uploadPowerOfAttorneyURL,
      statement: data.statementCopyUrl,
      frequency: data.frequencyUrl,
      officialLetterUrl: data.officialLetterUrl,
    };

    form.setFieldsValue({
      ...mapped,
      licenseExpiryDate: mapped.licenseExpiryDate
        ? moment(mapped.licenseExpiryDate as string)
        : null,
      tenancyContractEndDate: mapped.tenancyContractEndDate
        ? moment(mapped.tenancyContractEndDate as string)
        : null,
      dateOfBirth: mapped.dateOfBirth ? moment(mapped.dateOfBirth as string) : null,
      workEmail: pickEstablishmentWorkEmail(data),
      addressEmirate: emirateId,
      addressRegion: regionId,
      addressArea: areaId,
      street: (typeof data.street === "string" ? data.street : undefined) ?? undefined,
      // Carries a stored pin back into form state so the map can restore it and the
      // next save sends it back rather than clearing it.
      addressLatitude: getNumberOrNull(data.latitude) ?? undefined,
      addressLongitude: getNumberOrNull(data.longitude) ?? undefined,
      commercial: { documents: documentUrls },
    });

    setFetchedCommercialData({ documents: documentUrls });

    const expiryMomentForMoe = mapped.licenseExpiryDate
      ? moment(mapped.licenseExpiryDate as string)
      : null;
    const licenseStrForMoe =
      mapped.licenseNumber != null && String(mapped.licenseNumber).trim() !== ""
        ? String(mapped.licenseNumber).trim()
        : "";

    if (
      listingIsGethirdPartyApi === true &&
      mode === "edit" &&
      establishmentId &&
      parseEstablishmentProfileDetailUrlPageMode(pageModeSearchParam ?? null) ===
        "rejected" &&
      isCommercialGroupSubType(
        data.establishmentTypeId as number,
        establishmentSubTypeList,
      ) &&
      isCommercialLicenseReady(
        licenseStrForMoe,
        expiryMomentForMoe ?? undefined,
        emirateId,
        {
          requireFutureExpiry: false,
        },
      )
    ) {
      const dedupeKey = `rejectedTpMoeBootstrap|${establishmentId}|${licenseStrForMoe}|${
        expiryMomentForMoe?.isValid()
          ? expiryMomentForMoe.format("YYYY-MM-DD")
          : ""
      }`;
      if (rejectedThirdPartyMoeBootstrapKeyRef.current !== dedupeKey) {
        rejectedThirdPartyMoeBootstrapKeyRef.current = dedupeKey;
        fetchCommercialData(
          licenseStrForMoe,
          expiryMomentForMoe ?? undefined,
          emirateId,
          {
            requireFutureExpiry: false,
          },
        );
      }
    }

    checkFormValidity();
  };

  /**
   * Fetches establishment data from all configured data sources in parallel,
   * merges them by priority (lowest priority number wins per field),
   * then applies the merged result to the form.
   */
  const loadEstablishmentData = async (id: string) => {
    setIsEstablishmentDataLoaded(false);
    try {
      setIsLoadingCommercialData(true);

      const primarySource: EstablishmentDataSource = {
        priority: 0,
        fetchData: async (eId: string) => {
          const response: any = await getUserEstablishmentByID(eId);
          return response.data ?? null;
        },
      };

      const allSources = dataSources && dataSources.length > 0
        ? dataSources
        : [primarySource];

      const results = await Promise.all(
        allSources.map(async (source) => ({
          priority: source.priority,
          data: await source.fetchData(id).catch((err) => {
            console.error(`EstablishmentDataSource (priority ${source.priority}) failed:`, err);
            return null;
          }),
        })),
      );

      const merged = mergeEstablishmentDataSources(results);
      if (Object.keys(merged).length > 0) {
        await applyEstablishmentData(merged);
      }
    } catch (error) {
      console.error("Failed to load establishment data:", error);
    } finally {
      setIsLoadingCommercialData(false);
      setIsEstablishmentDataLoaded(true);
    }
  };

  const isCommercialLicenseReady = (
    licenseNumber?: string,
    licenseExpiryDate?: Moment,
    emirateId?: unknown,
    opts?: { requireFutureExpiry?: boolean },
  ) => {
    const requireFutureExpiry = opts?.requireFutureExpiry !== false;
    return (
      isValidCommercialLicenseNumber({
        licenseNumber,
        emirateId,
        emirateList: addressData.emirateList,
      }) &&
      moment.isMoment(licenseExpiryDate) &&
      licenseExpiryDate.isValid() &&
      (requireFutureExpiry ? licenseExpiryDate.isAfter(moment(), "day") : true)
    );
  };

  const fetchCommercialData = (
    licenseNumber: string,
    licenseExpiryDate?: Moment,
    emirateId?: unknown,
    opts?: { requireFutureExpiry?: boolean },
  ) => {
    if (
      !allowMoeCommercialLicenseLookup ||
      !isCommercialLicenseReady(licenseNumber, licenseExpiryDate, emirateId, opts)
    ) {
      return;
    }
    const ern = String(licenseNumber || "").trim();
    const requestKey = `${ern}|${licenseExpiryDate!.format("YYYY-MM-DD")}`;
    const isSameSuccessfulLookup =
      lastSuccessfulMoeLookupKeyRef.current === requestKey &&
      moeThirdPartyMappingSucceeded;
    if (isSameSuccessfulLookup) {
      return;
    }
    if (moeLicenseInFlightKeyRef.current === requestKey) {
      return;
    }
    const isCommercialContextChanged =
      activeCommercialLookupKeyRef.current !== requestKey;
    activeCommercialLookupKeyRef.current = requestKey;
    moeLicenseInFlightKeyRef.current = requestKey;

    const seq = ++commercialFetchSeqRef.current;
    setMoeReadOnlyFields({});
    setMoeThirdPartyMappingSucceeded(false);
    if (mode === "add") {
      setShowFullCommercialForm(true);
      if (isCommercialContextChanged) {
        setFetchedCommercialData(null);
      }
      setFieldsDisabled(false);
    }

    void (async () => {
      try {
        setIsLoadingCommercialData(true);
        const raw = await postRetrieveLicenseDetailsMOEc({
          licenseERN: ern,
          licenseExpiryDate: formatApiDate(licenseExpiryDate!)!,
        });
        if (seq !== commercialFetchSeqRef.current) return;

        const details = extractMoeLicenseDetails(raw);
        const incomingMoePartners = extractMoePartnerRows(raw)
          .map((item) => normalizeEstablishmentPartnersApiRow(item))
          .filter((item) => {
            const hasId = String(item.id ?? "").trim() !== "";
            const hasName =
              String(item.fullNameEn ?? item.fullNameAr ?? "").trim() !== "";
            const hasIdentifier =
              String(
                item.emiratesId ||
                  item.uaeNumber ||
                  item.uidNumber ||
                  item.passportNumber ||
                  "",
              ).trim() !== "";
            return hasId || hasName || hasIdentifier;
          });

        if (incomingMoePartners.length > 0) {
          setPartners((prev) => mergePartnerLists(prev, incomingMoePartners));
          const incomingOwnerIds = collectLicenseOwnerPartnerIds(incomingMoePartners);
          if (incomingOwnerIds.length > 0) {
            setOwnerPartnerIds(incomingOwnerIds);
          }
        }

        if (!details) return;

        const { values, readOnlyFields } = mapMoeLicenseDetailsToFormValues(details);

        if (Object.keys(values).length === 0) return;
        const readOnlyMap = Object.fromEntries(readOnlyFields.map((k) => [k, true]));

        setMoeThirdPartyMappingSucceeded(true);

        const workEmailVal = values.workEmail;
        if (typeof workEmailVal === "string" && workEmailVal.trim() !== "") {
          const emailStr = workEmailVal.trim();
          setEmailList((prev) => {
            if (prev.some((o) => o.value === emailStr)) return prev;
            return [...prev, { label: emailStr, value: emailStr }];
          });
        }

        setMoeReadOnlyFields(readOnlyMap);
        lastSuccessfulMoeLookupKeyRef.current = requestKey;
        suppressNextLicenseLookupRef.current = true;
        form.setFieldsValue(values);

        setFetchedCommercialData((prev: unknown) => (prev != null ? prev : { documents: {} }));

        void checkFormValidity();
      } catch (error) {
        if (seq === commercialFetchSeqRef.current) {
          console.error("Failed to load MOE license details:", error);
        }
      } finally {
        setIsLoadingCommercialData(false);
        if (moeLicenseInFlightKeyRef.current === requestKey) {
          moeLicenseInFlightKeyRef.current = null;
        }
        setTimeout(() => {
          void checkFormValidity();
        }, 0);
      }
    })();
  };

  const handleLicenseFieldsChange = () => {
    if (!allowMoeCommercialLicenseLookup) return;
    if (licenseFieldsDebounceRef.current) {
      clearTimeout(licenseFieldsDebounceRef.current);
    }

    licenseFieldsDebounceRef.current = setTimeout(() => {
      licenseFieldsDebounceRef.current = null;
      if (suppressNextLicenseLookupRef.current) {
        suppressNextLicenseLookupRef.current = false;
        return;
      }
      const licenseNumber = form.getFieldValue("licenseNumber");
      const licenseExpiryDate = form.getFieldValue("licenseExpiryDate");
      const emirateId = form.getFieldValue("emirate");
      if (!isCommercialLicenseReady(licenseNumber, licenseExpiryDate, emirateId)) {
        if (mode === "add") {
          if (!showFullCommercialForm) {
            setShowFullCommercialForm(false);
          }
          setFetchedCommercialData(null);
          setFieldsDisabled(false);
          setMoeReadOnlyFields({});
          setMoeThirdPartyMappingSucceeded(false);
        }
        commercialFetchSeqRef.current += 1;
        return;
      }
      fetchCommercialData(licenseNumber, licenseExpiryDate, emirateId);
    }, 300);
  };

  const handleSubTypeChange = (value: number) => {
    setEstablishmentSubType(value);
    form.setFieldsValue({ establishmentSubType: value });

    if (mode === "add") {
      commercialFetchSeqRef.current += 1;
      setShowFullCommercialForm(false);
      setFieldsDisabled(false);
      setFetchedCommercialData(null);
      setMoeReadOnlyFields({});
      setMoeThirdPartyMappingSucceeded(false);
      setIsLoadingCommercialData(false);

      if (isCommercialGroupSubType(value, establishmentSubTypeList)) {
        form.setFieldsValue({
          licenseNumber: undefined,
          licenseExpiryDate: undefined,
          establishmentNameArabic: undefined,
          establishmentNameEnglish: undefined,
          emirate: undefined,
          licensingAuthority: undefined,
          tenancyContractEndDate: undefined,
          commercial: { documents: { officialLetterUrl: undefined } },
        });
      } else if (isGovernmentGroupSubType(value, establishmentSubTypeList)) {
        form.setFieldsValue({
          licenseNumber: undefined,
          licenseExpiryDate: undefined,
          licensingAuthority: undefined,
          tenancyContractEndDate: undefined,
          commercial: {
            documents: {
              commercialLicense: undefined,
              tenancyContract: undefined,
              memorandum: undefined,
              powerOfAttorney: undefined,
            },
          },
        });
      }

      setTimeout(() => {
        form.validateFields(["workEmail"]).catch(() => undefined);
        checkFormValidity();
      }, 0);
    }
  };

  const handleChangeIDType = (value: string) => {
    setIDType(value);
  };

  const logMissingRequiredFields = (missing: string[]) => {
    const signature = missing.slice().sort().join("|");
    if (missing.length === 0) {
      missingRequiredSignatureRef.current = "";
      return;
    }
    if (signature === missingRequiredSignatureRef.current) return;
    missingRequiredSignatureRef.current = signature;
    console.warn(
      "[EstablishmentProfile] Submit disabled: missing required fields:",
      missing,
    );
  };

  const checkFormValidity = async () => {
    try {
      const values = form.getFieldsValue();
      const subType = values.establishmentSubType;

      const isFieldFilled = (field: string) => {
        const value = values[field];
        if (field === "establishmentMobile") {
          return isPlainObject(value)
            ? String(value.phoneLocalNumber ?? "").trim() !== ""
            : false;
        }
        if (moment.isMoment(value)) {
          return value.isValid();
        }
        return value !== undefined && value !== null && value !== "";
      };

      if (isCommercialGroupSubType(subType, establishmentSubTypeList)) {
        const required = [
          "establishmentSubType",
          "licenseNumber",
          "licenseExpiryDate",
          "emirate",
          "licensingAuthority",
          "establishmentMobile",
          "establishmentNameEnglish",
          "establishmentNameArabic",
          "addressEmirate",
          "addressRegion",
          "addressArea",
          "street",
        ];

        const missingRequired = required.filter((field) => !isFieldFilled(field));
        const missingDocs: string[] = [];
        if (!values.commercial?.documents?.commercialLicense) {
          missingDocs.push("commercial.documents.commercialLicense");
        }
        const missing = [...missingRequired, ...missingDocs];
        const partnerSectionValid = isPartnerSectionValid({
          partnerSectionVisible: mode !== "add" || showFullCommercialForm,
          partnersLength: partners.length,
          licenseOwnerRulesApply: isLicenseOwnerApplicableSubType(
            subType,
            establishmentSubTypeList,
          ),
          ownerCount: countLicenseOwners(partners),
          licenseOwnerMaxCount: LICENSE_OWNER_MAX_COUNT,
        });
        logMissingRequiredFields(missing);
        setIsFormValid(missing.length === 0 && partnerSectionValid);
      } else if (isGovernmentGroupSubType(subType, establishmentSubTypeList)) {
        const required = [
          "establishmentSubType",
          "workEmail",
          "establishmentNameArabic",
          "establishmentNameEnglish",
          "emirate",
          "establishmentMobile",
          "addressEmirate",
          "addressRegion",
          "addressArea",
          "street",
        ];
        const missingRequired = required.filter((field) => !isFieldFilled(field));
        const missingDocs: string[] = [];
        if (!values.commercial?.documents?.officialLetterUrl) {
          missingDocs.push("commercial.documents.officialLetterUrl");
        }
        const missing = [...missingRequired, ...missingDocs];
        logMissingRequiredFields(missing);
        setIsFormValid(missing.length === 0);
      } else {
        const missing = !values.establishmentSubType ? ["establishmentSubType"] : [];
        logMissingRequiredFields(missing);
        setIsFormValid(!!values.establishmentSubType);
      }
    } catch (error) {
      console.error("Form validity check error:", error);
      setIsFormValid(false);
    }
  };

  checkFormValidityRef.current = checkFormValidity;

  const loadEmailList = useCallback(async () => {
    try {
      const response = await getUserEmailByUserId();
      const rows = response.data as { email: string }[] | null | undefined;
      const apiEmails = Array.isArray(rows)
        ? rows.map((item) => ({ label: item.email, value: item.email }))
        : [];
      const merged: { label: string; value: string }[] = [...apiEmails];
      const addIfMissing = (raw?: unknown) => {
        const e = typeof raw === "string" ? raw.trim() : "";
        if (!e) return;
        if (!merged.some((o) => o.value === e)) {
          merged.push({ label: e, value: e });
        }
      };
      addIfMissing(form.getFieldValue("workEmail"));
      setEmailList(merged);
    } catch (error) {
      console.error("Failed to load email list:", error);
    }
  }, [form]);

  useEffect(() => {
    void loadEmailList();
  }, [loadEmailList]);

  useEffect(() => {
    void checkFormValidityRef.current();
  }, [partners, showFullCommercialForm, mode]);

  const handleFormValuesChange = (changedValues: any) => {
    checkFormValidity();
    if (
      allowMoeCommercialLicenseLookup &&
      isCommercialGroupSubType(establishmentSubType, establishmentSubTypeList) &&
      (Object.prototype.hasOwnProperty.call(changedValues, "licenseNumber") ||
        Object.prototype.hasOwnProperty.call(changedValues, "licenseExpiryDate") ||
        Object.prototype.hasOwnProperty.call(changedValues, "emirate"))
    ) {
      handleLicenseFieldsChange();
    }
  };

  const buildBaseParams = (values: EstablishmentFormValues) => {
    const isCommercialLike = isCommercialGroupSubType(
      values.establishmentSubType,
      establishmentSubTypeList,
    );
    const isGovernmentLike = isGovernmentGroupSubType(
      values.establishmentSubType,
      establishmentSubTypeList,
    );
    const isLicenseOwnerApplicable = isLicenseOwnerApplicableSubType(
      values.establishmentSubType,
      establishmentSubTypeList,
    );
    const apiPartners = partners.map(mapPartnerToApiPartner);
    const docs = values.commercial?.documents || {};
    const establishmentMobile = values.establishmentMobile ?? {
      phoneCountryCode: "",
      phoneLocalNumber: "",
    };

    const apiValues: EstablishmentApiFormValues = {
      userId: userInfo?.id || "",
      establishmentTypeId: values.establishmentSubType ?? 0,
      workEmail: getNullableString(values.workEmail),
      licenseExpiryDate: isGovernmentLike
        ? GOVERNMENT_PERMANENT_LICENSE_EXPIRY_DATE
        : formatApiDateEndOfDay(values.licenseExpiryDate),
      establishmentNameAr: values.establishmentNameArabic || "",
      establishmentNameEn: values.establishmentNameEnglish || "",
      parentId: 0,
      establishmentMobile,
      name: values.legalPerson || "",
      idTypeCode: values.idType || "",
      emiratesId: values.emiratesId || "",
      dateBirth: formatApiDate(values.dateOfBirth),
      personalEmail: values.personalEmail || "",
      emirateId: getNumberOrZero(values.addressEmirate),
      regionId: getNumberOrZero(values.addressRegion),
      areaId: getNumberOrZero(values.addressArea),
      street: values.street || "",
      // The pin the form actually holds, never the one implied by how the address was
      // entered — a user can pick a spot and then correct the text by hand, and that
      // pin stays valid. Both axes travel together (the backend rejects a lone one), so
      // an incomplete pair reads as "no pin" and goes as an explicit null, which is
      // also what clears a pin the user removed.
      ...buildCoordinateParams(values),
      establishmentEmirateId: getNumberOrZero(values.emirate),
      passportNumber: getNullableString(values.passportNumber),
      uid: getNullableString(values.uid),
      ...(isCommercialLike
        ? {
            commerceLicenseNumber: getNullableString(values.licenseNumber),
            authorityId: getNumberOrNull(values.licensingAuthority),
            tenancyContractEndDate: formatApiDate(values.tenancyContractEndDate),
            uploadCommerceLicenseURL: getNullableString(docs.commercialLicense),
            uploadTenancyContractURL: getNullableString(docs.tenancyContract),
            uploadMemorandumOfAssociationURL: getNullableString(docs.memorandum),
            uploadPowerOfAttorneyURL: getNullableString(docs.powerOfAttorney),
            parters: isLicenseOwnerApplicable
              ? apiPartners
              : apiPartners.map((partner) => ({ ...partner, isOwner: false })),
          }
        : {}),
      ...(isGovernmentLike
        ? { officialLetterUrl: getNullableString(docs.officialLetterUrl) }
        : {}),
      isGethirdPartyApi:
        moeThirdPartyMappingSucceeded || persistedThirdPartyApiFlag,
    };

    return toApi(apiValues);
  };

  const scrollToFormField = (fieldName: Array<string | number>) => {
    requestAnimationFrame(() => {
      form.scrollToField(fieldName, {
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const scrollToPartnerSection = () => {
    requestAnimationFrame(() => {
      document
        .getElementById("establishment-partner-list-section")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();

      const subTypeForPartnerCheck =
        values.establishmentSubType ?? establishmentSubType;
      const isCommercialLike = isCommercialGroupSubType(
        subTypeForPartnerCheck,
        establishmentSubTypeList,
      );
      const partnerSectionVisible =
        isCommercialLike && (mode !== "add" || showFullCommercialForm);
      const licenseOwnerRulesApply =
        partnerSectionVisible &&
        isLicenseOwnerApplicableSubType(
          subTypeForPartnerCheck,
          establishmentSubTypeList,
        );

      if (partnerSectionVisible && partners.length === 0) {
        setPartnerSectionSubmitError("noPartners");
        scrollToPartnerSection();
        return;
      }

      if (licenseOwnerRulesApply) {
        const ownerCount = countLicenseOwners(partners);
        if (ownerCount < 1 || ownerCount > LICENSE_OWNER_MAX_COUNT) {
          if (ownerCount === 0) {
            setPartnerSectionSubmitError("noOwner");
            if (!partnerSectionVisible) {
              CustomMessage.error(
                `${i18n.t("establishmentProfile.messages.licenseOwnerRequiredTitle")}: ${i18n.t("establishmentProfile.messages.licenseOwnerRequiredDescription")}`,
              );
            }
          } else {
            setPartnerSectionSubmitError("multipleOwners");
            CustomMessage.error(
              `${i18n.t("establishmentProfile.messages.licenseOwnerMultipleTitle")}: ${i18n.t("establishmentProfile.messages.licenseOwnerMultipleDescription")}`,
            );
          }
          scrollToPartnerSection();
          return;
        }
      }
      setPartnerSectionSubmitError(null);
     
      let response;
      if (mode === "edit" && currentEstablishmentId) {
        const updateParams: UpdateUserProfileEstablishmentParams = {
          proFileId: currentEstablishmentId,
          ...buildBaseParams(values),
        } as UpdateUserProfileEstablishmentParams;
        response = await updateUserProfileEstablishment(updateParams);
      } else {
        const addParams: AddUserProfileEstablishmentParams =
          buildBaseParams(values) as AddUserProfileEstablishmentParams;
        response = await addUserProfileEstablishment(addParams);
      }

      if (response.isSuccess) {
        setSuccessModalShow(true);
      }
    } catch (error) {
      const validationError = getFormValidationError(error);
      const firstErrorField = validationError?.errorFields?.[0]?.name;
      if (firstErrorField) {
        scrollToFormField(firstErrorField);
        return;
      }
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailUpdate = async (email: string) => {
    await loadEmailList();
    form.setFieldsValue({ workEmail: email });
    setEditEmailModalVisible(false);
    void checkFormValidity();
  };

  // Derived booleans (single source: resolved `pageMode`, not raw API status codes)
  const isEditForm = mode === "add" || pageMode !== "underReview";
  const isReject = pageMode === "rejected";
  const isProfileUnderReview = mode !== "add" && pageMode === "underReview";
  const isEstablishmentReadOnly = isEstablishmentProfileLocked({
    mode,
    pageMode,
  });
  const isCommercialGroup = isCommercialGroupSubType(
    establishmentSubType,
    establishmentSubTypeList,
  );
  const isGovernmentGroup = isGovernmentGroupSubType(
    establishmentSubType,
    establishmentSubTypeList,
  );

  const expriryDays =
    getExpiryAlertDaysFromIsExpiredDays(
      getIsExpiredDaysFromSource(currentEstablishment),
    ) ?? 1;
  const isExpriry = isCommercialGroup && pageMode === "expired";
  const isLess30 = isCommercialGroup && pageMode === "expiringSoon";
  const isSingleEditForm =
    !!(isLess30 || isExpriry || isEditForm || (fieldsDisabled && mode === "add"));
  const isLicenseExpiryRestricted = !!(isLess30 || isExpriry);

  /**
   * Legacy add-mode flag (kept for `isSingleEditForm`); MOE read-only uses `moeReadOnlyFields`.
   */
  const addModePrefilledLockedFields: string[] = [
    "establishmentNameArabic",
    "establishmentNameEnglish",
  ];

  /** Commercial ACTIVE profiles expiring/expired: only these fields stay editable. */
  const commercialLicenseRenewalFieldNames: string[] = [
    "licenseExpiryDate",
    "tenancyContractEndDate",
    "commercialLicense",
  ];

  /**
   * Fields prefilled from MOE `/api/Moe/GetLicenseDetails` use `moeReadOnlyFields`.
   * After a successful MOE lookup, **license number + expiry stay editable in `add` only**;
   * in edit/detail-style flows (`mode !== "add"`) they are disabled.
   */
  const canEditField = (fieldName: string): boolean => {
    if (isEstablishmentReadOnly) return false;
    if (moeReadOnlyFields[fieldName]) return false;
    if (
      mode !== "add" &&
      moeThirdPartyMappingSucceeded &&
      (fieldName === "licenseNumber" || fieldName === "licenseExpiryDate")
    ) {
      return false;
    }
    /** Rejected profiles: editable like normal edit except establishment sub-type + license number */
    if (isReject) {
      if (fieldName === "establishmentSubType" || fieldName === "licenseNumber")
        return false;
      return !!isEditForm;
    }
    if (isLicenseExpiryRestricted) {
      return commercialLicenseRenewalFieldNames.includes(fieldName);
    }
    if (mode === "add" && fieldsDisabled)
      return !addModePrefilledLockedFields.includes(fieldName);
    return !!isEditForm;
  };

  return {
    showFullCommercialForm,
    isLoadingCommercialData,
    isEstablishmentDataLoaded,
    fetchedCommercialData,
    isSubmitting,
    fieldsDisabled,
    IDType,
    establishmentSubType,
    establishmentSubTypeList,
    loadingSubTypes,
    idTypeList,
    loadingIdTypes,
    authorityList,
    loadingAuthorities,
    currentEstablishmentId,
    currentEstablishment,
    isFormValid,
    emailList,
    editEmailModalVisible,
    successModalShow,
    isEditForm: !!isEditForm,
    isReject: !!isReject,
    isProfileUnderReview: !!isProfileUnderReview,
    isEstablishmentReadOnly: !!isEstablishmentReadOnly,
    isCommercialGroup,
    isGovernmentGroup,
    isExpriry,
    isLess30,
    isSingleEditForm,
    isLicenseExpiryRestricted,
    expriryDays,
    pageMode,
    handleSubTypeChange,
    handleChangeIDType,
    handleLicenseFieldsChange,
    handleFormValuesChange,
    handleSubmit,
    handleEmailUpdate,
    canEditField,
    setEditEmailModalVisible,
    setSuccessModalShow,
    loadEstablishmentData,
    applyEstablishmentData,
    partnerSectionSubmitError,
  };
};
