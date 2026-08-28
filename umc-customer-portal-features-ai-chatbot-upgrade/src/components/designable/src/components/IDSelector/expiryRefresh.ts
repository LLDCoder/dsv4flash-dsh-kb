import moment from "moment";

export interface EmiratesIdExpiryRefreshValue {
  type?: "emiratesId" | "uid" | "passport";
  _icpLookupType?: "emiratesId" | "uid" | "passport";
  _icpLookupSignature?: string;
  dateOfBirth?: string;
  emiratesId?: string;
  emiratesIdexpiryDate?: string;
  [key: string]: unknown;
}

export interface EmiratesIdExpiryProfile {
  identityCard?: { expiryDate?: string };
}

const getEmiratesIdQuerySignature = (value: EmiratesIdExpiryRefreshValue) =>
  ["emiratesId", value.dateOfBirth || "", value.emiratesId || ""].join("|");

export const formatValidIcpExpiryDate = (value?: string) => {
  if (!value) return undefined;
  const date = moment(
    value,
    [moment.ISO_8601, "YYYY-MM-DD", "DD/MM/YYYY"],
    true,
  );
  return date.isValid() ? date.format("YYYY-MM-DD") : undefined;
};

export const mergeIcpEmiratesIdExpiryIntoValue = <
  T extends EmiratesIdExpiryRefreshValue,
>(
  currentValue: T,
  personProfile: EmiratesIdExpiryProfile,
): T | undefined => {
  const expiryDate = formatValidIcpExpiryDate(
    personProfile.identityCard?.expiryDate,
  );
  if (!expiryDate) return undefined;

  const nextValue = {
    ...currentValue,
    type: "emiratesId" as const,
    emiratesIdexpiryDate: expiryDate,
  };

  return {
    ...nextValue,
    _icpLookupType: "emiratesId",
    _icpLookupSignature: getEmiratesIdQuerySignature(nextValue),
  } as T;
};

export const shouldAutoRefreshEmiratesIdExpiry = (
  enabled: boolean,
  type: EmiratesIdExpiryRefreshValue["type"],
  value: EmiratesIdExpiryRefreshValue,
) => {
  const emiratesIdDigits = String(value.emiratesId || "").replace(/\D/g, "");
  const hasValidDateOfBirth = moment(
    value.dateOfBirth,
    "YYYY-MM-DD",
    true,
  ).isValid();

  return (
    enabled &&
    type === "emiratesId" &&
    hasValidDateOfBirth &&
    /^784\d{12}$/.test(emiratesIdDigits)
  );
};
