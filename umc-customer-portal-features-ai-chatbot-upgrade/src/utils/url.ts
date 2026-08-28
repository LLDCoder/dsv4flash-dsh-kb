const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const ImageBaseUrl = `${apiBaseUrl}/api/Document/Dowload?fileName=`;
const DocumentPreview = `${apiBaseUrl}/api/pdf/preview?fileName=`;

const isDirectFileUrl = (value: string) =>
  value.startsWith("http://") ||
  value.startsWith("https://") ||
  value.startsWith("data:") ||
  value.startsWith("blob:") ||
  value.startsWith("/");

const resolveFileUrl = (value?: string | null) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "";
  }

  if (isDirectFileUrl(normalized)) {
    return normalized;
  }

  return `${ImageBaseUrl}${normalized.replace(/^\/+/, "")}`;
};

export { ImageBaseUrl, DocumentPreview, resolveFileUrl };

const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

const hasAsciiControlCharacter = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
};

/**
 * Resolves a user-supplied external link into a safe absolute http(s) URL.
 * Returns null when the value is empty or cannot be trusted as a web link.
 */
const resolveExternalWebUrl = (value?: string | null) => {
  const text = String(value ?? "").trim();

  if (!text || hasAsciiControlCharacter(text)) {
    return null;
  }

  const candidate = ABSOLUTE_URL_RE.test(text) ? text : `https://${text}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
};

export { resolveExternalWebUrl };
