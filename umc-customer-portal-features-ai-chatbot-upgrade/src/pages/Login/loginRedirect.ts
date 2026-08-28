import { parsePaymentResultSearch } from "@/pages/PaymentResult/paymentResultState";
import { isDeepLinkReturnPath } from "@/utils/pendingLoginRedirect";

function getSearchParamCaseInsensitive(
  params: URLSearchParams,
  name: string,
): string | null {
  const target = name.toLowerCase();
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return null;
}

function resolvePaymentResultReturnUrl(params: URLSearchParams): string | null {
  const returnUrl = getSearchParamCaseInsensitive(params, "returnUrl");
  if (!returnUrl || !returnUrl.startsWith("/payment/result?")) {
    return null;
  }

  const parsedUrl = new URL(returnUrl, "https://customer-portal.local");
  if (parsedUrl.origin !== "https://customer-portal.local") {
    return null;
  }

  const paymentResultParams = parsePaymentResultSearch(parsedUrl.search);
  if (!paymentResultParams) {
    return null;
  }

  const safeParams = new URLSearchParams({
    transactionNo: paymentResultParams.transactionNo,
  });
  if (paymentResultParams.source) {
    safeParams.set("src", paymentResultParams.source);
  }

  return `/payment/result?${safeParams.toString()}`;
}

export function resolveAuthenticatedLoginRedirectPath(
  search: string,
  appendPersistentQueryToUrl: (value: string) => string = (value) => value,
  pendingReturnUrl: string | null = null,
): string {
  const params = new URLSearchParams(search || "");
  if (!getSearchParamCaseInsensitive(params, "returnUrl") && pendingReturnUrl) {
    params.set("returnUrl", pendingReturnUrl);
  }
  const paymentResultReturnUrl = resolvePaymentResultReturnUrl(params);
  if (paymentResultReturnUrl) {
    return paymentResultReturnUrl;
  }

  // CP-012 / CP-013: restore the email deep link (id / profileId / action)
  // after login. Only vetted internal paths are accepted (no open redirect).
  const deepLinkReturnUrl = getSearchParamCaseInsensitive(params, "returnUrl");
  if (isDeepLinkReturnPath(deepLinkReturnUrl)) {
    return appendPersistentQueryToUrl(deepLinkReturnUrl);
  }

  const rawType = String(getSearchParamCaseInsensitive(params, "type") || "");
  const normalizedType = rawType.replace(/\s+/g, " ").trim().toLowerCase();
  const serviceId = Number(
    getSearchParamCaseInsensitive(params, "serviceId") || 0,
  );
  const serviceCode = String(
    getSearchParamCaseInsensitive(params, "serviceCode") || "",
  ).trim();

  if (!normalizedType) {
    return appendPersistentQueryToUrl("/home");
  }

  if (Number.isFinite(serviceId) && serviceId > 0) {
    if (normalizedType === "learn more") {
      return appendPersistentQueryToUrl(`/services/service-card?id=${serviceId}`);
    }

    if (normalizedType === "start service") {
      const searchParams = new URLSearchParams();
      searchParams.set("serviceId", String(serviceId));

      if (serviceCode) {
        searchParams.set("serviceCode", serviceCode);
      }

      return appendPersistentQueryToUrl(
        `/services/media-license?${searchParams.toString()}`,
      );
    }
  }

  return appendPersistentQueryToUrl("/home");
}
