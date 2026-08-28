import type { EmirateItem } from "@/services/address";
import type { MyRequestDeliveryResponse } from "@/services/myRequest";
import type { UserIndividualProfileResponse } from "@/services/userProfile";
import { splitInternationalMobileNumber } from "@/components/common/MobileNumberInput/utils";
import { DEFAULT_COUNTRY_DIAL_CODE } from "@/components/common/MobileNumberInput/constants";

export interface DeliveryMobileValue {
  mobileCountryCode: string;
  mobileLocalNumber: string;
}

export interface DeliveryInformationValues {
  courierService: string | number;
  recipientName: string;
  emirateId?: number;
  regionId?: number;
  areaId?: number;
  street: string;
  mobile: DeliveryMobileValue;
}

export interface DeliveryInformationErrors {
  courierService?: string;
  recipientName?: string;
  emirateId?: string;
  regionId?: string;
  areaId?: string;
  street?: string;
  mobile?: string;
}

export interface DeliveryInformationReadOnlyLabels {
  courierService?: string | null;
  recipientName?: string | null;
  mobileNumber?: string | null;
  address?: string | null;
}

export interface DeliveryInformationDisplay {
  courierService: string;
  recipientName: string;
  mobileNumber: string;
  address: string;
}

export interface ApplicationDeliveryInformationState {
  applicationId: number;
  data: MyRequestDeliveryResponse | null;
}

export const EMPTY_DELIVERY_INFORMATION_VALUES: DeliveryInformationValues = {
  courierService: "",
  recipientName: "",
  emirateId: undefined,
  regionId: undefined,
  areaId: undefined,
  street: "",
  mobile: {
    mobileCountryCode: DEFAULT_COUNTRY_DIAL_CODE,
    mobileLocalNumber: "",
  },
};

export const createDeliveryProfileRequestGuard = () => {
  let latestRequestId = 0;
  let active = true;

  return {
    begin: () => {
      if (!active) {
        return null;
      }

      latestRequestId += 1;
      return latestRequestId;
    },
    isCurrent: (requestId: number) =>
      active && requestId === latestRequestId,
    invalidate: () => {
      active = false;
      latestRequestId += 1;
    },
  };
};

const pickFirstTextValue = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
};

const pickFirstNumericValue = (...values: unknown[]) => {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return undefined;
};

export const resolveApplicationDeliveryInformation = (
  detail: { deliveryInfo?: MyRequestDeliveryResponse | null } | null,
) => detail?.deliveryInfo ?? null;

export const resolveActiveApplicationDeliveryInformation = (
  state: ApplicationDeliveryInformationState | null,
  applicationId: number | null,
) => (state?.applicationId === applicationId ? state.data : null);

export const buildDeliveryInformationDisplay = (
  labels: DeliveryInformationReadOnlyLabels,
): DeliveryInformationDisplay => {
  return {
    courierService: String(labels.courierService || "").trim(),
    recipientName: String(labels.recipientName || "").trim(),
    mobileNumber: String(labels.mobileNumber || "").trim(),
    address: String(labels.address || "").trim(),
  };
};

const resolveDeliveryMobile = (data: MyRequestDeliveryResponse) => {
  const explicitCountryCode = pickFirstTextValue(data.mobileCountryCode);
  const normalizedCountryCode = explicitCountryCode
    ? explicitCountryCode.startsWith("+")
      ? explicitCountryCode
      : `+${explicitCountryCode.replace(/[^\d]/g, "")}`
    : "";
  const explicitLocalNumber = pickFirstTextValue(data.mobileLocalNumber);
  const legacyMobileNumber = pickFirstTextValue(
    data.mobile,
    data.mobileNumber,
    data.phoneNumber,
  );

  if (!explicitLocalNumber && legacyMobileNumber) {
    return {
      mobileCountryCode: "",
      mobileLocalNumber: legacyMobileNumber,
    };
  }

  return {
    mobileCountryCode: normalizedCountryCode,
    mobileLocalNumber: explicitLocalNumber,
  };
};

export const toForm = (
  data: MyRequestDeliveryResponse,
): DeliveryInformationValues => {
  const mobile = resolveDeliveryMobile(data);

  return {
    courierService:
      pickFirstNumericValue(data.courierId, data.courierCompanyId) ?? "",
    recipientName: pickFirstTextValue(data.recipientName, data.receiverName),
    emirateId: pickFirstNumericValue(data.emirateId),
    regionId: pickFirstNumericValue(data.regionId),
    areaId: pickFirstNumericValue(data.areaId),
    street: pickFirstTextValue(data.street),
    mobile,
  };
};

export const toProfileForm = (
  data: UserIndividualProfileResponse,
): DeliveryInformationValues => {
  const explicitLocalNumber = pickFirstTextValue(data.mobileLocalNumber);
  const explicitCountryCode = pickFirstTextValue(data.mobileCountryCode);
  const legacyMobile = pickFirstTextValue(data.mobileNumber);
  const legacyMobileParts = splitInternationalMobileNumber(
    legacyMobile,
    DEFAULT_COUNTRY_DIAL_CODE,
  );

  return {
    courierService: "",
    recipientName: pickFirstTextValue(data.fullNameEn),
    emirateId: pickFirstNumericValue(data.emirateId),
    regionId: pickFirstNumericValue(data.regionId),
    areaId: pickFirstNumericValue(data.areaId),
    street: pickFirstTextValue(data.street),
    mobile: {
      mobileCountryCode:
        explicitCountryCode || legacyMobileParts.countryCode,
      mobileLocalNumber:
        explicitLocalNumber || legacyMobileParts.phoneNumber,
    },
  };
};

export const resolveInitialDeliveryInformation = ({
  applicationId,
  savedDelivery,
  personalProfile,
}: {
  applicationId: number | null;
  savedDelivery: MyRequestDeliveryResponse | null;
  personalProfile: UserIndividualProfileResponse | null;
}): DeliveryInformationValues => {
  if (applicationId) {
    return savedDelivery
      ? toForm(savedDelivery)
      : { ...EMPTY_DELIVERY_INFORMATION_VALUES };
  }

  return personalProfile
    ? toProfileForm(personalProfile)
    : { ...EMPTY_DELIVERY_INFORMATION_VALUES };
};

export const shouldClearDeliveryCourierSelection = ({
  courierService,
  courierLookupResolved,
  courierOptions,
}: {
  courierService: DeliveryInformationValues["courierService"];
  courierLookupResolved: boolean;
  courierOptions: Array<{ value: string | number }>;
}) => {
  if (!courierLookupResolved || !courierService) {
    return false;
  }

  return !courierOptions.some(
    (option) => String(option.value) === String(courierService),
  );
};

export const isAbuDhabiEmirate = (
  emirateId: number | undefined,
  emirates: EmirateItem[],
) => {
  if (!emirateId) {
    return false;
  }

  const matchedEmirate = emirates.find((item) => item.id === emirateId);
  const normalizedName = `${matchedEmirate?.nameEn || ""} ${matchedEmirate?.nameAr || ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return (
    normalizedName.includes("abu dhabi") || normalizedName.includes("أبوظبي")
  );
};
