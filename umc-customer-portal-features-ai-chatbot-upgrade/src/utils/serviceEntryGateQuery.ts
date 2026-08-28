export const SERVICE_ENTRY_GATE_QUERY_KEY = "serviceEntryGate";

const SERVICE_ENTRY_GATE_DEFAULT_ENABLED =
  import.meta.env.VITE_SERVICE_ENTRY_GATE_DEFAULT_ENABLED === "true";
const SERVICE_ENTRY_GATE_ON_VALUES = new Set(["1", "true", "on", "enabled"]);
const SERVICE_ENTRY_GATE_OFF_VALUES = new Set([
  "0",
  "false",
  "off",
  "disabled",
]);

export const resolveServiceEntryGateQueryOverride = (
  search?: string | null,
) => {
  const rawValue = new URLSearchParams(search || "").get(
    SERVICE_ENTRY_GATE_QUERY_KEY,
  );

  if (rawValue === null) {
    return null;
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (SERVICE_ENTRY_GATE_ON_VALUES.has(normalizedValue)) {
    return true;
  }
  if (SERVICE_ENTRY_GATE_OFF_VALUES.has(normalizedValue)) {
    return false;
  }

  return null;
};

export const isServiceEntryGateEnabled = (search?: string | null) => {
  if (SERVICE_ENTRY_GATE_DEFAULT_ENABLED) {
    return true;
  }

  const override = resolveServiceEntryGateQueryOverride(search);
  if (override !== null) {
    return override;
  }
  return SERVICE_ENTRY_GATE_DEFAULT_ENABLED;
};

export const resolveActionServiceEntryGateValue = (
  sourceSearch?: string | null,
) => {
  const searchParams = new URLSearchParams(sourceSearch || "");
  const hasOverride = searchParams.has(SERVICE_ENTRY_GATE_QUERY_KEY);

  if (!hasOverride) {
    return null;
  }

  const override = resolveServiceEntryGateQueryOverride(sourceSearch);
  if (override === null) {
    return null;
  }

  return override ? "1" : "0";
};
