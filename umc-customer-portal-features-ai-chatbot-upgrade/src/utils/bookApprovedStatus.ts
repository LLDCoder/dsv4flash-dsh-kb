export interface BookItemStatusCounts {
  rejected: number;
  approved: number;
  reviewRequired: number;
}

export type BookApprovedStatusMap = Map<string, number>;

export const createEmptyBookItemStatusCounts = (): BookItemStatusCounts => ({
  rejected: 0,
  approved: 0,
  reviewRequired: 0,
});

export const normalizeIsbn = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/[^0-9Xx]/g, "")
    .toUpperCase();

export const normalizeBookApprovedStatus = (value: unknown) => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && !value.trim())
  ) {
    return undefined;
  }

  const status = Number(value);
  return Number.isFinite(status) ? status : undefined;
};

export const createBookApprovedStatusMap = (
  value: unknown,
): BookApprovedStatusMap => {
  if (!Array.isArray(value)) {
    return new Map();
  }

  return new Map(
    value
      .map((item) => {
        if (typeof item !== "object" || item === null) {
          return ["", undefined] as const;
        }

        const itemRecord = item as Record<string, unknown>;
        return [
          normalizeIsbn(itemRecord.isbn),
          normalizeBookApprovedStatus(itemRecord.BookApprovedStatus),
        ] as const;
      })
      .filter(
        (entry): entry is readonly [string, number] =>
          Boolean(entry[0]) && entry[1] !== undefined,
      ),
  );
};

export const addBookItemStatusToCounts = (
  counts: BookItemStatusCounts,
  status: unknown,
) => {
  if (status === 0 || status === "0") {
    counts.rejected += 1;
    return;
  }

  if (status === 1 || status === "1") {
    counts.approved += 1;
    return;
  }

  if (
    (typeof status === "number" && Number.isFinite(status)) ||
    (typeof status === "string" && status.trim().length > 0)
  ) {
    counts.reviewRequired += 1;
  }
};
