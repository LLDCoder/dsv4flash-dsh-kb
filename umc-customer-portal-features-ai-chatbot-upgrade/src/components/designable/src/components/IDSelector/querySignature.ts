export type QuerySignatureType = "emiratesId" | "uid" | "passport";

export interface QuerySignatureValue {
  _icpLookupType?: QuerySignatureType;
  _icpLookupSignature?: string;
  dateOfBirth?: string;
  emiratesId?: string;
  uid?: string;
  passportNumber?: string;
}

export const QUERY_FIELD_BY_TYPE: Record<
  QuerySignatureType,
  keyof QuerySignatureValue
> = {
  emiratesId: "emiratesId",
  uid: "uid",
  passport: "passportNumber",
};

export const getQuerySignature = (
  type: QuerySignatureType,
  value: QuerySignatureValue,
) => {
  const identifier = String(value[QUERY_FIELD_BY_TYPE[type]] || "").trim();
  return [type, value.dateOfBirth || "", identifier].join("|");
};

export const isQuerySignatureCurrent = (
  type: QuerySignatureType,
  signature: string,
  value: QuerySignatureValue,
) => signature === getQuerySignature(type, value);

export interface QuerySignatureLookupState {
  status: "idle" | "loading" | "success" | "error";
  signature?: string;
}

export const hasStoredIcpLookup = (
  type: QuerySignatureType,
  value: QuerySignatureValue,
) =>
  value._icpLookupType === type &&
  value._icpLookupSignature === getQuerySignature(type, value);

export const isLookupFresh = (
  type: QuerySignatureType,
  lookupState: QuerySignatureLookupState,
  value: QuerySignatureValue,
) =>
  (lookupState.status === "success" &&
    lookupState.signature === getQuerySignature(type, value)) ||
  (lookupState.status === "idle" && hasStoredIcpLookup(type, value));
