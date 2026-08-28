export const MODIFY_ENGINE_PAYLOAD_REQUIRED_SERVICE_CODES = new Set([
  "803",
  "903",
  "1203",
  "80011",
  "80012",
]);

interface ModifyEnginePayloads {
  breEnginePayload?: unknown;
  feeEnginePayload?: unknown;
}

export const getMissingRequiredModifyEnginePayload = (
  serviceCode: string | number | null | undefined,
  payloads: ModifyEnginePayloads,
): "bre" | "fee" | null => {
  if (
    !MODIFY_ENGINE_PAYLOAD_REQUIRED_SERVICE_CODES.has(
      String(serviceCode ?? ""),
    )
  ) {
    return null;
  }
  if (payloads.breEnginePayload == null) {
    return "bre";
  }
  if (payloads.feeEnginePayload == null) {
    return "fee";
  }
  return null;
};
