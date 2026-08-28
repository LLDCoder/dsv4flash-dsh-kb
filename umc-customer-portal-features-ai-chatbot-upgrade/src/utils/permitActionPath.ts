import { resolveActionServiceEntryGateValue } from "@/utils/serviceEntryGateQuery";

export interface ServiceApplicationActionPathOptions {
  serviceId: number;
  action: string;
  serviceCode?: string | null;
  applicationId?: number | null;
  applicationStatusId?: number | null;
  requestType?: number | null;
  includeServiceEntryGate?: boolean;
  sourceSearch?: string | null;
}

export type PermitActionPathOptions = ServiceApplicationActionPathOptions;

export interface PermitActionApplicationRecord {
  applicationId?: number | null;
  sourceApplicationId?: number | null;
}

const isPositiveSafeInteger = (
  value: number | null | undefined,
): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;

export const resolvePermitActionApplicationId = ({
  applicationId,
  sourceApplicationId,
}: PermitActionApplicationRecord) => {
  if (isPositiveSafeInteger(applicationId)) {
    return applicationId;
  }

  return isPositiveSafeInteger(sourceApplicationId)
    ? sourceApplicationId
    : null;
};

export const createServiceApplicationActionPath = ({
  serviceId,
  action,
  serviceCode,
  applicationId,
  applicationStatusId,
  requestType,
  includeServiceEntryGate = false,
  sourceSearch,
}: ServiceApplicationActionPathOptions) => {
  const searchParams = new URLSearchParams();

  searchParams.set("serviceId", String(serviceId));
  searchParams.set("actions", action);

  if (serviceCode) {
    searchParams.set("serviceCode", serviceCode);
  }

  if (isPositiveSafeInteger(applicationId)) {
    searchParams.set("applicationId", String(applicationId));
  }

  if (isPositiveSafeInteger(applicationStatusId)) {
    searchParams.set("status", String(applicationStatusId));
  }

  if (isPositiveSafeInteger(requestType)) {
    searchParams.set("type", String(requestType));
  }

  if (includeServiceEntryGate) {
    const serviceEntryGateValue =
      resolveActionServiceEntryGateValue(sourceSearch);
    if (serviceEntryGateValue !== null) {
      searchParams.set("serviceEntryGate", serviceEntryGateValue);
    }
  }

  return `/services/media-license?${searchParams.toString()}`;
};

export const createPermitActionPath = createServiceApplicationActionPath;
