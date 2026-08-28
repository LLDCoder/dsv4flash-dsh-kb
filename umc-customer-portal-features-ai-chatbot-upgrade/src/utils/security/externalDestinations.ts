import {
  resolveTrustedHttpUrl,
  splitAllowedOrigins,
} from "@/utils/security/trustedUrl";

const envList = (value?: string) => splitAllowedOrigins(value);

const getAuthorizeOrigin = () => {
  const authorizeUrl = String(import.meta.env.VITE_UAE_PASS_URL ?? "").trim();
  if (!authorizeUrl) return "";

  try {
    return new URL(authorizeUrl).origin;
  } catch {
    return "";
  }
};

export const resolveTrustedFilePreviewUrl = (value?: string | null) =>
  resolveTrustedHttpUrl(value, {
    allowedOrigins: [
      import.meta.env.VITE_API_BASE_URL,
      import.meta.env.VITE_IMG_BASE_URL,
      import.meta.env.VITE_DownloadPDF_URL,
      ...envList(import.meta.env.VITE_ALLOWED_FILE_PREVIEW_ORIGINS),
    ],
    requireHttps: false,
  });

export const resolveTrustedDocumentUrl = (value?: string | null) =>
  resolveTrustedHttpUrl(value, {
    allowedOrigins: [
      import.meta.env.VITE_API_BASE_URL,
      import.meta.env.VITE_IMG_BASE_URL,
      import.meta.env.VITE_DownloadPDF_URL,
      ...envList(import.meta.env.VITE_ALLOWED_DOCUMENT_ORIGINS),
    ],
    requireHttps: false,
  });

export const resolveTrustedPaymentUrl = (value?: string | null) =>
  resolveTrustedHttpUrl(value, {
    allowedOrigins: [
      import.meta.env.VITE_API_BASE_URL,
      import.meta.env.VITE_API_PAYFINES_URL,
      ...envList(import.meta.env.VITE_ALLOWED_PAYMENT_ORIGINS),
    ],
  });

export const resolveTrustedUaePassLogoutUrl = (value?: string | null) =>
  resolveTrustedHttpUrl(value, {
    allowedOrigins: [
      getAuthorizeOrigin(),
      ...envList(import.meta.env.VITE_ALLOWED_UAE_PASS_LOGOUT_ORIGINS),
    ],
  });
