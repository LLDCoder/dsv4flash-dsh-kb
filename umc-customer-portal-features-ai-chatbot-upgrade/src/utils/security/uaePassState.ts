const STATE_LENGTH_BYTES = 24;

const getCrypto = () => {
  if (typeof crypto !== "undefined") {
    return crypto;
  }

  return null;
};

export const createUaePassState = () => {
  const cryptoApi = getCrypto();
  if (!cryptoApi) {
    return "";
  }

  const bytes = new Uint8Array(STATE_LENGTH_BYTES);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const withUaePassState = (
  authorizeUrl: string | undefined,
  state: string,
) => {
  const text = String(authorizeUrl ?? "").trim();
  if (!text || !state) {
    return "";
  }

  try {
    const url = new URL(text);
    url.searchParams.set("state", state);
    return url.toString();
  } catch {
    return "";
  }
};
