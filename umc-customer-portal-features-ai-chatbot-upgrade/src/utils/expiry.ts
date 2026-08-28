import moment from "moment";

export function isDateBeforeToday(value: unknown): boolean {
  if (!value) {
    return false;
  }
  const date = moment.isMoment(value) ? value.clone() : moment(value as any);
  return date.isValid() && date.startOf("day").isBefore(moment().startOf("day"));
}

export function parseIsExpiredDays(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function getIsExpiredDaysFromSource(
  source:
    | {
        IsExpiredDays?: string | number | null;
        isExpiredDays?: string | number | null;
      }
    | null
    | undefined,
): number | null {
  return parseIsExpiredDays(
    source?.IsExpiredDays ?? source?.isExpiredDays ?? null,
  );
}

export function getExpiryStateFromIsExpiredDays(
  value: unknown,
): "expired" | "expiringSoon" | null {
  const parsedValue = parseIsExpiredDays(value);

  if (parsedValue === null) {
    return null;
  }
  if (parsedValue < 0) {
    return "expired";
  }
  if (parsedValue >= 0 && parsedValue <= 30) {
    return "expiringSoon";
  }
  return null;
}

export function getExpiryAlertDaysFromIsExpiredDays(
  value: unknown,
): number | null {
  const parsedValue = parseIsExpiredDays(value);
  if (parsedValue === null) {
    return null;
  }
  return parsedValue < 0 ? Math.abs(parsedValue) : parsedValue;
}
