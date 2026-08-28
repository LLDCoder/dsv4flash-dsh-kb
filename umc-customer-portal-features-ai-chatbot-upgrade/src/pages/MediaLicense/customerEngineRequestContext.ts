type CustomerEngineRequestPayload = {
  request?: object | null;
};

export type CustomerEngineRequestContextParams = {
  licensePermitNo?: string | null;
  mediaLicenseId?: number | null;
};

const normalizeLicensePermitNo = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const normalizeMediaLicenseId = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
};

export const attachCustomerEngineRequestContext = <
  TPayload extends CustomerEngineRequestPayload,
>(
  payload: TPayload,
  { licensePermitNo, mediaLicenseId }: CustomerEngineRequestContextParams,
): TPayload => {
  const currentRequest = payload?.request;

  if (
    !currentRequest ||
    typeof currentRequest !== "object" ||
    Array.isArray(currentRequest)
  ) {
    return payload;
  }

  const normalizedLicensePermitNo = normalizeLicensePermitNo(licensePermitNo);
  const normalizedMediaLicenseId = normalizeMediaLicenseId(mediaLicenseId);

  if (
    normalizedLicensePermitNo === undefined &&
    normalizedMediaLicenseId === undefined
  ) {
    return payload;
  }

  return {
    ...payload,
    request: {
      ...(currentRequest as object),
      ...(normalizedLicensePermitNo !== undefined
        ? { licensePermitNo: normalizedLicensePermitNo }
        : {}),
      ...(normalizedMediaLicenseId !== undefined
        ? { mediaLicenseId: normalizedMediaLicenseId }
        : {}),
    },
  };
};
