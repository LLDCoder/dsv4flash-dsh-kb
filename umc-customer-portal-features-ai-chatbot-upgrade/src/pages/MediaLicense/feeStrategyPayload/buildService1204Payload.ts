import type {
  FeeQuoteEnginePayload,
  FeeQuoteEnvelope,
} from "@/services/services";
import { useLicenseLifecycleSourceStore } from "@/store/licenseLifecycleSource";
import type { BuildServiceFeeStrategyPayloadParams } from "../feeStrategyPayload";
import {
  coerceString,
  createFeeEnginePayload,
  createFeeQuoteEnvelope,
  defaultBooleanValue,
  defaultNumberValue,
  findFirstFormValue,
} from "./feeStrategyPayloadUtils";

const SERVICE_1204_DEFAULT_COURIER_COMPANY_ID = 3;

const resolveRequiredLicensePermitNo = (
  licensePermitNo?: string | null,
) => {
  const lifecycleSource =
    useLicenseLifecycleSourceStore.getState().licenseLifecycleSource;
  const resolved = coerceString(
    licensePermitNo ?? lifecycleSource?.licensePermitNo,
  )?.trim();

  if (!resolved || resolved === "-") {
    throw new Error(
      "Unable to build service 1204 fee payload: licensePermitNo is required.",
    );
  }

  return resolved;
};

export const buildService1204FeePayload = async (
  params: BuildServiceFeeStrategyPayloadParams,
): Promise<FeeQuoteEnvelope> => {
  const enginePayload = await buildService1204FeeEnginePayload(params);
  return createFeeQuoteEnvelope({
    config: params.config,
    applicationId: params.applicationId,
    applicationNo: params.applicationNo,
    enginePayload,
  });
};

export const buildService1204FeeEnginePayload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  applicationId,
  licensePermitNo,
}: BuildServiceFeeStrategyPayloadParams): Promise<FeeQuoteEnginePayload> => {
  const physicalCertificateDeliveryRequested = defaultBooleanValue(
    findFirstFormValue(formValuesList, [
      "physicalCertificateDeliveryRequested",
      "certificateInfo.physicalCertificateDeliveryRequested",
      "deliveryInfo.physicalCertificateDeliveryRequested",
    ]),
  );

  const courierCompanyId = defaultNumberValue(
    findFirstFormValue(formValuesList, [
      "courierCompanyId",
      "certificateInfo.courierCompanyId",
      "deliveryInfo.courierCompanyId",
    ]),
  );

  return createFeeEnginePayload({
    config,
    currentProfileId,
    userInfo,
    actionType: 2,
    applicantOverrides: {
      licensePermitNo: resolveRequiredLicensePermitNo(licensePermitNo),
    },
    requestOverrides: {
      physicalCertificateDeliveryRequested,
      courierCompanyId:
        courierCompanyId > 0
          ? courierCompanyId
          : SERVICE_1204_DEFAULT_COURIER_COMPANY_ID,
    },
    payload: {
      applicationId,
      applicationDetailId:  1204002,
    },
  });
};
