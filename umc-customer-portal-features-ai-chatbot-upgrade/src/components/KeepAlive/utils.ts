export type ParsedLocationQuery = Record<string, string | string[]>;

export type ParsedLocationKey = {
  path: string;
  query: ParsedLocationQuery;
};

export function normalizeRoutePath(value?: string | null): string {
  if (!value) {
    return "";
  }

  const [pathWithoutHash] = value.split("#");
  const [pathWithoutSearch] = pathWithoutHash.split("?");
  const withLeadingSlash = pathWithoutSearch.startsWith("/")
    ? pathWithoutSearch
    : `/${pathWithoutSearch}`;

  return withLeadingSlash.replace(/\/+$/, "").toLowerCase() || "/";
}

export function parseLocationKey(key?: string): ParsedLocationKey {
  if (!key) {
    return { path: "", query: {} };
  }

  const [path, search = ""] = key.split("?", 2);
  const params: ParsedLocationQuery = {};
  const searchParams = new URLSearchParams(search);

  searchParams.forEach((value, name) => {
    const previousValue = params[name];

    if (previousValue === undefined) {
      params[name] = value;
      return;
    }

    // Preserve repeated query params as arrays so callbacks can inspect them safely.
    params[name] = Array.isArray(previousValue)
      ? [...previousValue, value]
      : [previousValue, value];
  });

  return {
    path,
    query: params,
  };
}
