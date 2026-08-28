const LOCAL_HTTP_HOST_RE = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i;

export interface TrustedUrlOptions {
  allowedOrigins?: Array<string | null | undefined>;
  baseOrigin?: string;
  requireHttps?: boolean;
  allowedPathPrefixes?: string[];
}

const getWindowOrigin = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
};

const parseUrl = (value: string, baseOrigin?: string) => {
  const base = baseOrigin || getWindowOrigin() || "https://local.invalid";
  return new URL(value, base);
};

const normalizeOrigin = (value?: string | null) => {
  const text = String(value ?? "").trim();
  if (!text) return "";

  try {
    return parseUrl(text).origin;
  } catch {
    return "";
  }
};

export const splitAllowedOrigins = (value?: string | null) =>
  String(value ?? "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);

const buildAllowedOriginSet = (
  allowedOrigins: Array<string | null | undefined>,
  baseOrigin?: string,
) => {
  const origins = new Set<string>();
  const runtimeOrigin = normalizeOrigin(baseOrigin || getWindowOrigin());

  if (runtimeOrigin) {
    origins.add(runtimeOrigin);
  }

  allowedOrigins.forEach((origin) => {
    const normalized = normalizeOrigin(origin);
    if (normalized) {
      origins.add(normalized);
    }
  });

  return origins;
};

const isLocalHttpUrl = (url: URL) =>
  url.protocol === "http:" && LOCAL_HTTP_HOST_RE.test(url.host);

const warnBlockedOrigin = (url: URL, allowedOrigins: Set<string>) => {
  if (typeof console === "undefined" || typeof console.warn !== "function") {
    return;
  }

  console.warn("[security] Blocked URL origin by trusted URL policy", {
    origin: url.origin,
    host: url.host,
    protocol: url.protocol,
    allowedOrigins: Array.from(allowedOrigins),
  });
};

const hasAsciiControlCharacter = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
};

export const resolveTrustedHttpUrl = (
  value: string | null | undefined,
  options: TrustedUrlOptions = {},
) => {
  const text = String(value ?? "").trim();
  if (!text || hasAsciiControlCharacter(text)) {
    return null;
  }

  let url: URL;
  try {
    url = parseUrl(text, options.baseOrigin);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  if (options.requireHttps !== false && url.protocol !== "https:" && !isLocalHttpUrl(url)) {
    return null;
  }

  if (url.username || url.password) {
    return null;
  }

  const allowedOrigins = buildAllowedOriginSet(
    options.allowedOrigins ?? [],
    options.baseOrigin,
  );
  if (!allowedOrigins.has(url.origin)) {
    warnBlockedOrigin(url, allowedOrigins);
    return null;
  }

  if (
    options.allowedPathPrefixes?.length &&
    !options.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return null;
  }

  return url.toString();
};

export const isTrustedHttpUrl = (
  value: string | null | undefined,
  options: TrustedUrlOptions = {},
) => resolveTrustedHttpUrl(value, options) !== null;
