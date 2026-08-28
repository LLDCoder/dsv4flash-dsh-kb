import { isValidCommercialLicenseNumber } from "../../../../../pages/EstablishmentProfile/utils/constants";
import type {
  AreaItem,
  EmirateItem,
  RegionItem,
} from "../../../../../services/address";
import type { UserEstablishmentProfileDto } from "../../../../../services/services";
import { DEFAULT_COUNTRY_DIAL_CODE } from "../../../../../components/common/MobileNumberInput/constants";
import { resolveContactNumberValidationValue } from "../../../../../components/common/MobileNumberInput/contactNumber";
import { validateMobileNumber } from "../../../../../components/common/MobileNumberInput/utils";

export type TradeLicenseMode = boolean;

export interface ProfileFormAddressPicker {
  emirateId?: number;
  regionId?: number;
  areaId?: number;
  street?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProfileFormSourceAddress {
  emirate?: unknown;
  region?: unknown;
  area?: unknown;
  street?: unknown;
  latitude?: number;
  longitude?: number;
}

export interface ProfileFormValues {
  hasTradeLicense?: TradeLicenseMode;
  commercialLicenseNumber?: unknown;
  reserveTradeNumber?: unknown;
  licenseExpiryDate?: unknown;
  commercialLicense?: unknown;
  reserveTradeName?: unknown;
  phoneNumber?: unknown;
  phoneNumberCountryCode?: unknown;
  phoneNumberLocalNumber?: unknown;
  addressPicker?: ProfileFormAddressPicker;
  [key: string]: unknown;
}

export interface ReserveBranchCache {
  reserveTradeNumber?: unknown;
  reserveTradeName?: unknown;
}

export type ProfileFormSource = Partial<UserEstablishmentProfileDto>;

const LEGACY_ADDRESS_KEYS = [
  "sourceAddress",
  "addressEmirate",
  "addressRegion",
  "addressArea",
  "addressStreet",
] as const;

const stripLegacyAddressValues = (
  values: ProfileFormValues,
): ProfileFormValues => {
  const cleanedValues = { ...values };
  LEGACY_ADDRESS_KEYS.forEach((key) => {
    delete cleanedValues[key];
  });
  return cleanedValues;
};

export const getProfileDraftForContext = (
  draft: ProfileFormValues | undefined,
  draftProfileContextKey: string | undefined,
  currentProfileContextKey: string | undefined,
): ProfileFormValues | undefined =>
  draftProfileContextKey &&
  draftProfileContextKey === currentProfileContextKey
    ? draft
    : undefined;

export const resolveProfileDraftContextKey = (
  capturedContextKey: string | undefined,
  currentContextKey: string | undefined,
): string | undefined =>
  capturedContextKey || currentContextKey?.trim() || undefined;

export const shouldInitializeProfileForm = (
  initializedRevision: number | undefined,
  currentRevision: number,
  profileLoaded: boolean,
  reviewMode: boolean,
): boolean =>
  !reviewMode &&
  profileLoaded &&
  initializedRevision !== currentRevision;

export const getProfileFormFieldClassName = (
  fieldName: string,
  validationFields: readonly string[],
  showValidationHints: boolean,
): string =>
  `profile-form__field profile-form__field--${
    showValidationHints && validationFields.includes(fieldName)
      ? "error"
      : "valid"
  }`;

export const shouldAttemptProfileAddressSourceInitialization = (
  attemptedRevision: number | undefined,
  sourceRevision: number,
  lookupsLoaded: boolean,
  initializeFromSource: boolean,
  hasSourceAddress: boolean,
): boolean =>
  lookupsLoaded &&
  initializeFromSource &&
  hasSourceAddress &&
  attemptedRevision !== sourceRevision;

const isFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const toAddressId = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return undefined;

  const numericValue = Number(value.trim());
  return Number.isSafeInteger(numericValue) ? numericValue : undefined;
};

type AddressCoordinates = {
  latitude?: number | null;
  longitude?: number | null;
};

export const hasCompleteAddressCoordinates = <T extends AddressCoordinates>(
  source: T | null | undefined,
): source is T & { latitude: number; longitude: number } =>
  typeof source?.latitude === "number" &&
  Number.isFinite(source.latitude) &&
  typeof source?.longitude === "number" &&
  Number.isFinite(source.longitude);

const getCompleteAddressCoordinates = (
  source: AddressCoordinates | null | undefined,
): { latitude: number; longitude: number } | undefined =>
  hasCompleteAddressCoordinates(source)
    ? { latitude: source.latitude, longitude: source.longitude }
    : undefined;

const getAddressPickerValue = (
  source: ProfileFormSource,
): ProfileFormAddressPicker | undefined => {
  const emirateId = toAddressId(source.emirate);
  const regionId = toAddressId(source.region);
  const areaId = toAddressId(source.area);
  const street = typeof source.street === "string" ? source.street : undefined;
  const coordinates = getCompleteAddressCoordinates(source);

  if (emirateId === undefined && regionId === undefined && areaId === undefined) {
    return undefined;
  }

  const addressPicker: ProfileFormAddressPicker = {
    ...(emirateId !== undefined ? { emirateId } : {}),
    ...(emirateId === 1 && regionId !== undefined ? { regionId } : {}),
    ...(areaId !== undefined ? { areaId } : {}),
    ...(street !== undefined ? { street } : {}),
    ...(coordinates || {}),
  };

  return addressPicker;
};

export const getOriginalTradeLicenseMode = (
  source: ProfileFormSource | null | undefined,
): TradeLicenseMode | undefined => {
  if (!source) return undefined;
  if (isFilled(source.licenseNumber)) return true;
  if (isFilled(source.trnumber)) return false;
  return undefined;
};

export const getProfileFormSourceAddress = (
  source: ProfileFormSource | null | undefined,
): ProfileFormSourceAddress => {
  if (!source) return {};

  const coordinates = getCompleteAddressCoordinates(source);
  return {
    emirate: source.emirate,
    region: source.region,
    area: source.area,
    street: source.street,
    ...(coordinates || {}),
  };
};

const normalizeAddressName = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLocaleLowerCase() : "";

const matchesAddressName = (
  sourceName: unknown,
  item: { nameEn?: unknown; nameAr?: unknown },
): boolean => {
  const normalizedSourceName = normalizeAddressName(sourceName);
  if (!normalizedSourceName) return false;
  return [item.nameEn, item.nameAr].some(
    (name) => normalizeAddressName(name) === normalizedSourceName,
  );
};

export const resolveProfileFormAddress = (
  source: ProfileFormSourceAddress,
  emirates: EmirateItem[],
  regions: RegionItem[],
  areas: AreaItem[],
): ProfileFormAddressPicker => {
  const emirate = emirates.find((item) =>
    matchesAddressName(source.emirate, item),
  );
  const region = emirate
    ? regions.find(
        (item) =>
          Number(item.emirateId) === Number(emirate.id) &&
          matchesAddressName(source.region, item),
      )
    : undefined;
  const isAbuDhabi = Number(emirate?.id) === 1;
  const emirateRegionIds = new Set(
    emirate
      ? regions
          .filter(
            (item) => Number(item.emirateId) === Number(emirate.id),
          )
          .map((item) => Number(item.id))
      : [],
  );
  const area = isAbuDhabi
    ? region
      ? areas.find(
          (item) =>
            Number(item.regionId) === Number(region.id) &&
            matchesAddressName(source.area, item),
        )
      : undefined
    : region
      ? areas.find(
          (item) =>
            Number(item.regionId) === Number(region.id) &&
            matchesAddressName(source.area, item),
        )
      : emirate
        ? areas.find(
            (item) =>
              emirateRegionIds.has(Number(item.regionId)) &&
              matchesAddressName(source.area, item),
          )
        : undefined;
  const street =
    typeof source.street === "string" ? source.street : undefined;
  const coordinates = getCompleteAddressCoordinates(source);

  return {
    ...(emirate ? { emirateId: emirate.id } : {}),
    ...(isAbuDhabi && region ? { regionId: region.id } : {}),
    ...(area ? { areaId: area.id } : {}),
    ...(street !== undefined ? { street } : {}),
    ...(coordinates || {}),
  };
};

type ProfileFormReviewStep = {
  formData?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeSchemaFieldKey = (value: unknown): string =>
  typeof value === "string"
    ? value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "")
    : "";

const collectProfileFormSchemaKeys = (
  schema: unknown,
  propertyKey?: string,
): string[] => {
  if (!isRecord(schema)) return [];

  const keys =
    schema["x-component"] === "ProfileForm"
      ? [
          propertyKey,
          schema.name,
          schema.uniqueValue,
          schema["x-component"],
        ].filter((value): value is string => typeof value === "string")
      : [];
  const properties = schema.properties;
  if (!isRecord(properties)) return keys;

  return Object.entries(properties).reduce<string[]>(
    (collectedKeys, [key, childSchema]) => [
      ...collectedKeys,
      ...collectProfileFormSchemaKeys(childSchema, key),
    ],
    keys,
  );
};

export const hasProfileFormSchema = (
  formilyList: ProfileFormReviewStep[] | null | undefined,
): boolean => {
  if (!Array.isArray(formilyList)) return false;

  return formilyList.some((step) => {
    if (!step?.formData) return false;

    try {
      const parsedFormData = JSON.parse(step.formData);
      return collectProfileFormSchemaKeys(parsedFormData?.schema).length > 0;
    } catch {
      return false;
    }
  });
};

export const extractCurrentProfileFormValues = (
  formilyList: ProfileFormReviewStep[] | null | undefined,
): ProfileFormValues | undefined => {
  if (!Array.isArray(formilyList)) return undefined;

  for (let index = formilyList.length - 1; index >= 0; index -= 1) {
    const formData = formilyList[index]?.formData;
    if (!formData) continue;

    try {
      const parsedFormData = JSON.parse(formData);
      if (!isRecord(parsedFormData) || !isRecord(parsedFormData.formValues)) {
        continue;
      }

      const schemaKeys = collectProfileFormSchemaKeys(parsedFormData.schema);
      const normalizedSchemaKeys = new Set(
        schemaKeys.map(normalizeSchemaFieldKey).filter(Boolean),
      );
      if (normalizedSchemaKeys.size === 0) continue;

      const matchedEntry = Object.entries(parsedFormData.formValues).find(
        ([key, value]) =>
          normalizedSchemaKeys.has(normalizeSchemaFieldKey(key)) &&
          isRecord(value),
      );
      if (matchedEntry && isRecord(matchedEntry[1])) {
        return matchedEntry[1] as ProfileFormValues;
      }
    } catch {
      continue;
    }
  }

  return undefined;
};

const PROFILE_FORM_REVIEW_FIELD_MAP = {
  hasTradeLicense: "hasTradeLicense",
  reserveTradeNumber: "reserveTradeNumber",
  reserveTradeName: "reserveTradeName",
  establishmentSubTypes: "establishmentTypeName",
  workEmail: "emails",
  commercialLicenseNumber: "licenseNumber",
  licenseExpiryDate: "licenseExpiryDate",
  commercialLicense: "licenseCopyUrl",
  establishmentNameArabic: "nameAr",
  establishmentNameEnglish: "nameEn",
  establishmentEmirateName: "addressName",
  licensingAuthority: "authorityIdName",
  phoneNumber: "establishmentMobile",
  phoneNumberCountryCode: "phoneCountryCode",
  phoneNumberLocalNumber: "phoneLocalNumber",
  tenancyContractEndDate: "tenancyContractEndDate",
  tenancyContract: "tenancyContractCopyUrl",
  memorandumOfAssociation: "memorandumOfAssociationCopyUrl",
  powerOfAttorney: "powerOfAttorneyCopyUrl",
} as const;

export const overlayProfileFormReviewValues = <
  T extends object,
>(
  source: T,
  values: ProfileFormValues | undefined,
): T => {
  if (!values) return source;

  const result: Record<string, unknown> = { ...source };
  Object.entries(PROFILE_FORM_REVIEW_FIELD_MAP).forEach(
    ([profileFormKey, profileKey]) => {
      if (Object.prototype.hasOwnProperty.call(values, profileFormKey)) {
        result[profileKey] = values[profileFormKey];
      }
    },
  );

  if (values.hasTradeLicense === false) {
    result.licenseNumber = undefined;
    result.licenseExpiryDate = undefined;
    result.licenseCopyUrl = undefined;
  }

  const addressPicker = isRecord(values.addressPicker)
    ? values.addressPicker
    : undefined;
  if (
    addressPicker &&
    Object.prototype.hasOwnProperty.call(addressPicker, "street")
  ) {
    result.street = addressPicker.street;
  }

  if (hasCompleteAddressCoordinates(addressPicker)) {
    result.latitude = addressPicker.latitude;
    result.longitude = addressPicker.longitude;
  } else {
    result.latitude = undefined;
    result.longitude = undefined;
  }

  return result as T;
};

const getAddressReviewName = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

export const resolveProfileFormReviewAddress = <
  T extends object,
>(
  source: T,
  addressPicker: ProfileFormAddressPicker | undefined,
  emirates: EmirateItem[],
  regions: RegionItem[],
  areas: AreaItem[],
  isAr = false,
): T => {
  if (!addressPicker) return source;

  const emirateId = toAddressId(addressPicker.emirateId);
  const regionId = toAddressId(addressPicker.regionId);
  const areaId = toAddressId(addressPicker.areaId);
  const emirate = emirates.find(
    (item) => Number(item.id) === Number(emirateId),
  );
  if (!emirate) {
    return {
      ...source,
      emirate: undefined,
      region: undefined,
      area: undefined,
    };
  }

  const region = emirate
    ? regions.find(
        (item) =>
          Number(item.id) === Number(regionId) &&
          Number(item.emirateId) === Number(emirate.id),
      )
    : undefined;
  const area = region
    ? areas.find(
        (item) =>
          Number(item.id) === Number(areaId) &&
          Number(item.regionId) === Number(region.id),
      )
    : regionId === undefined
      ? areas.find(
          (item) =>
            Number(item.id) === Number(areaId) &&
            regions.some(
              (parentRegion) =>
                Number(parentRegion.id) === Number(item.regionId) &&
                Number(parentRegion.emirateId) === Number(emirate.id),
            ),
        )
      : undefined;
  const getLocalizedName = (item?: { nameEn?: unknown; nameAr?: unknown }) =>
    getAddressReviewName(isAr ? item?.nameAr : item?.nameEn) ||
    getAddressReviewName(isAr ? item?.nameEn : item?.nameAr);
  const emirateName = getLocalizedName(emirate);
  const regionName = getLocalizedName(region);
  const areaName = getLocalizedName(area);

  return {
    ...source,
    emirate: emirateName,
    region: regionName,
    area: areaName,
  };
};

const isValidProfileDate = (value: unknown): boolean => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (
    value &&
    typeof value === "object" &&
    "isValid" in value &&
    typeof (value as { isValid?: unknown }).isValid === "function"
  ) {
    return Boolean((value as { isValid: () => boolean }).isValid());
  }
  if (typeof value !== "string" || !value.trim()) return false;

  const normalizedValue = value.trim();
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(
      normalizedValue,
    )
  ) {
    return false;
  }

  const datePart = normalizedValue.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return false;

  const [, year, month, day] = match;
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  if (numericMonth < 1 || numericMonth > 12) return false;

  const isLeapYear =
    numericYear % 400 === 0 ||
    (numericYear % 4 === 0 && numericYear % 100 !== 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return numericDay >= 1 && numericDay <= daysInMonth[numericMonth - 1];
};

export const mapProfileFormSource = (
  source: ProfileFormSource | null | undefined,
  savedValues?: ProfileFormValues,
): ProfileFormValues => {
  const safeSource = source || {};
  const originalMode = getOriginalTradeLicenseMode(safeSource);
  const sourceAddressPicker = getAddressPickerValue(safeSource);
  const savedFormValues = stripLegacyAddressValues(savedValues || {});
  return {
    hasTradeLicense: originalMode,
    commercialLicenseNumber: safeSource.licenseNumber,
    reserveTradeNumber: safeSource.trnumber,
    licenseExpiryDate: safeSource.licenseExpiryDate,
    commercialLicense: safeSource.licenseCopyUrl,
    reserveTradeName: "",
    establishmentSubTypes: safeSource.establishmentTypeName,
    workEmail: safeSource.emails,
    establishmentNameArabic: safeSource.nameAr,
    establishmentNameEnglish: safeSource.nameEn,
    licensingAuthority: safeSource.authorityIdName,
    phoneNumber: safeSource.establishmentMobile,
    phoneNumberCountryCode: safeSource.phoneCountryCode,
    phoneNumberLocalNumber: safeSource.phoneLocalNumber,
    tenancyContractEndDate: safeSource.tenancyContractEndDate,
    tenancyContract: safeSource.tenancyContractCopyUrl,
    memorandumOfAssociation: safeSource.memorandumOfAssociationCopyUrl,
    powerOfAttorney: safeSource.powerOfAttorneyCopyUrl,
    emirate: safeSource.establishmentEmirateId,
    establishmentEmirateName: safeSource.establishmentEmirateName,
    ...(sourceAddressPicker ? { addressPicker: sourceAddressPicker } : {}),
    ...savedFormValues,
    ...(originalMode === true ? { hasTradeLicense: true } : {}),
  };
};

export const mapResolvedProfileFormSource = (
  source: ProfileFormSource,
  addressPicker: ProfileFormAddressPicker,
): ProfileFormValues => {
  return mergeResolvedProfileFormSourceBaseline(
    mapProfileFormSource(source),
    addressPicker,
  );
};

export const mergeResolvedProfileFormSourceBaseline = (
  baseline: ProfileFormValues,
  addressPicker: ProfileFormAddressPicker,
): ProfileFormValues => {
  const mergedAddressPicker = {
    ...(baseline.addressPicker || {}),
    ...addressPicker,
  };
  if (Number(mergedAddressPicker.emirateId) !== 1) {
    delete mergedAddressPicker.regionId;
  }

  return {
    ...baseline,
    addressPicker: mergedAddressPicker,
  };
};

export const requiresProfileFormSourceAddressLookup = (
  source: ProfileFormSource | ProfileFormSourceAddress,
): boolean =>
  [source.emirate, source.region, source.area].some(
    (value) =>
      typeof value === "string" &&
      value.trim() !== "" &&
      toAddressId(value) === undefined,
  );

export const shouldReportProfileAddressResolutionFailure = (
  lookupFailed: boolean,
  sourceReady: boolean,
  source: ProfileFormSourceAddress | undefined,
): boolean =>
  lookupFailed &&
  sourceReady &&
  Boolean(source) &&
  requiresProfileFormSourceAddressLookup(source || {});

export const resolveProfileFormSourceBaseline = (
  source: ProfileFormSource,
  resolvedSource: ProfileFormValues | undefined,
): ProfileFormValues | undefined => {
  if (resolvedSource) return resolvedSource;

  const mappedSource = mapProfileFormSource(source);
  return requiresProfileFormSourceAddressLookup(source)
    ? undefined
    : mappedSource;
};

export const isProfileFormSourceBaselinePending = (
  enabled: boolean,
  profileLoaded: boolean,
  source: ProfileFormSource,
  baseline: ProfileFormValues | undefined,
): boolean =>
  enabled &&
  (!profileLoaded || (Object.keys(source).length > 0 && !baseline));

export const applyTradeLicenseMode = (
  values: ProfileFormValues,
  originalMode: TradeLicenseMode | undefined,
  nextMode: TradeLicenseMode,
  reserveCache: ReserveBranchCache,
): ProfileFormValues => {
  if (originalMode === true && nextMode === false) {
    return { ...values, hasTradeLicense: true };
  }

  if (nextMode === true) {
    const activeValues = { ...values };
    delete activeValues.reserveTradeNumber;
    delete activeValues.reserveTradeName;
    return { ...activeValues, hasTradeLicense: true };
  }

  const preservedValues = { ...values };
  delete preservedValues.commercialLicenseNumber;
  delete preservedValues.licenseExpiryDate;
  delete preservedValues.commercialLicense;
  return {
    ...preservedValues,
    hasTradeLicense: false,
    reserveTradeNumber: reserveCache.reserveTradeNumber,
    reserveTradeName: reserveCache.reserveTradeName,
  };
};

export const normalizeProfileFormBranches = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeProfileFormBranches(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const normalizedValue = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(
      ([key, nestedValue]) => [key, normalizeProfileFormBranches(nestedValue)],
    ),
  );

  const fullNumber = String(normalizedValue.phoneNumber ?? "").trim();
  const localNumber = String(
    normalizedValue.phoneNumberLocalNumber ?? "",
  ).trim();
  if (!fullNumber && !localNumber) {
    if (Object.prototype.hasOwnProperty.call(normalizedValue, "phoneNumber")) {
      normalizedValue.phoneNumber = "";
    }
    if (
      Object.prototype.hasOwnProperty.call(
        normalizedValue,
        "phoneNumberCountryCode",
      )
    ) {
      normalizedValue.phoneNumberCountryCode = "";
    }
    if (
      Object.prototype.hasOwnProperty.call(
        normalizedValue,
        "phoneNumberLocalNumber",
      )
    ) {
      normalizedValue.phoneNumberLocalNumber = "";
    }
  }

  if (normalizedValue.hasTradeLicense === true) {
    delete normalizedValue.reserveTradeNumber;
    delete normalizedValue.reserveTradeName;
  } else if (normalizedValue.hasTradeLicense === false) {
    delete normalizedValue.commercialLicenseNumber;
    delete normalizedValue.licenseExpiryDate;
    delete normalizedValue.commercialLicense;
  }

  return normalizedValue;
};

export const getProfileFormValidationErrors = (
  values: ProfileFormValues,
  emirateList: EmirateItem[] = [],
  originalMode?: TradeLicenseMode,
): string[] => {
  const errors = [
    "establishmentSubTypes",
    "establishmentNameArabic",
    "establishmentNameEnglish",
    "establishmentEmirateName",
    "licensingAuthority",
  ].filter((field) => !isFilled(values[field]));

  if (originalMode === true && values.hasTradeLicense !== true) {
    errors.push("hasTradeLicense");
    if (!isValidProfileMobileNumber(values)) errors.push("phoneNumber");
    return errors;
  }
  if (values.hasTradeLicense !== true && values.hasTradeLicense !== false) {
    errors.push("hasTradeLicense");
    if (!isValidProfileMobileNumber(values)) errors.push("phoneNumber");
    return errors;
  }

  if (values.hasTradeLicense === false) {
    if (!isFilled(values.reserveTradeNumber)) {
      errors.push("reserveTradeNumber");
    }
  } else {
    if (
      !isValidCommercialLicenseNumber({
        licenseNumber: values.commercialLicenseNumber,
        emirateId: values.emirate,
        emirateList,
      })
    ) {
      errors.push("commercialLicenseNumber");
    }
    if (!isValidProfileDate(values.licenseExpiryDate)) {
      errors.push("licenseExpiryDate");
    }
  }

  if (!isValidProfileMobileNumber(values)) errors.push("phoneNumber");

  if (values.hasTradeLicense === false) {
    if (!isFilled(values.reserveTradeName)) errors.push("reserveTradeName");
  } else if (!isFilled(values.commercialLicense)) {
    errors.push("commercialLicense");
  }

  return errors;
};

export const isValidProfileMobileNumber = (
  values: ProfileFormValues,
): boolean =>
  validateMobileNumber(
    resolveContactNumberValidationValue({
      countryCode: values.phoneNumberCountryCode,
      localNumber: values.phoneNumberLocalNumber,
      fullNumber: values.phoneNumber,
      defaultCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
    }),
  ).isValid;
