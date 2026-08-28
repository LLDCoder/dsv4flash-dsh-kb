import { createBrowserHistory } from "history";
import {
  buildLoginUrl,
  IDLE_SESSION_LOGOUT_QUERY_KEY,
  type HardRedirectToLoginOptions,
} from "./loginUrl";

const SERVICE_ENTRY_GATE_QUERY_KEY = "serviceEntryGate";

/** Login page reads this (then strips it) to show idle-timeout toast after redirect. */
export { IDLE_SESSION_LOGOUT_QUERY_KEY };
export type { HardRedirectToLoginOptions };
const hasWindow = typeof window !== "undefined";

const getServiceEntryGateValue = (search?: string | null) => {
  const searchParams = new URLSearchParams(search || "");
  return searchParams.get(SERVICE_ENTRY_GATE_QUERY_KEY);
};

let persistedServiceEntryGateValue = hasWindow
  ? getServiceEntryGateValue(window.location.search)
  : null;

const isExternalUrl = (value: string) =>
  /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//");

const appendServiceEntryGateToSearch = (search?: string | null) => {
  if (!persistedServiceEntryGateValue) {
    return search || "";
  }

  const searchParams = new URLSearchParams(search || "");
  if (!searchParams.has(SERVICE_ENTRY_GATE_QUERY_KEY)) {
    searchParams.set(
      SERVICE_ENTRY_GATE_QUERY_KEY,
      persistedServiceEntryGateValue,
    );
  }

  const nextSearch = searchParams.toString();
  return nextSearch ? `?${nextSearch}` : "";
};

export const appendPersistentQueryToUrl = (value: string) => {
  if (!persistedServiceEntryGateValue || !value || value.startsWith("#")) {
    return value;
  }

  if (isExternalUrl(value)) {
    return value;
  }

  try {
    const origin = hasWindow ? window.location.origin : "http://localhost";
    const targetUrl = new URL(value, origin);

    if (hasWindow && targetUrl.origin !== window.location.origin) {
      return value;
    }

    if (!targetUrl.searchParams.has(SERVICE_ENTRY_GATE_QUERY_KEY)) {
      targetUrl.searchParams.set(
        SERVICE_ENTRY_GATE_QUERY_KEY,
        persistedServiceEntryGateValue,
      );
    }

    const nextSearch = targetUrl.searchParams.toString();
    return `${targetUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${targetUrl.hash}`;
  } catch {
    return value;
  }
};

export const buildPersistentLoginUrl = (
  options?: HardRedirectToLoginOptions,
) => {
  return appendPersistentQueryToUrl(buildLoginUrl(options));
};

export const hardRedirectToLogin = (options?: HardRedirectToLoginOptions) => {
  const nextUrl = buildPersistentLoginUrl(options);
  history.replace(nextUrl);
};

type HistoryPathLike =
  | string
  | {
      pathname?: string;
      search?: string;
      hash?: string;
      state?: unknown;
      [key: string]: unknown;
    }
  | null
  | undefined;

const appendPersistentQueryToLocation = (location: HistoryPathLike) => {
  if (typeof location === "string") {
    return appendPersistentQueryToUrl(location);
  }

  if (!location || typeof location !== "object") {
    return location;
  }

  if (typeof location.pathname === "string" && isExternalUrl(location.pathname)) {
    return location;
  }

  return {
    ...location,
    search: appendServiceEntryGateToSearch(location.search),
  };
};

export const history = createBrowserHistory();
const rawPush = history.push.bind(history);
const rawReplace = history.replace.bind(history);

history.push = ((path: Parameters<typeof rawPush>[0], state?: Parameters<typeof rawPush>[1]) => {
  rawPush(appendPersistentQueryToLocation(path), state);
}) as typeof history.push;

history.replace = ((path: Parameters<typeof rawReplace>[0], state?: Parameters<typeof rawReplace>[1]) => {
  rawReplace(appendPersistentQueryToLocation(path), state);
}) as typeof history.replace;

history.listen((location) => {
  persistedServiceEntryGateValue = getServiceEntryGateValue(location.search);
});


export const urlParsing = (str: string) => {
  const str1: string = str.split("?")[1];
  if(!str1) return {};
  const arr: string[] = str1.split("&");
  const data: Record<string, string | string[]> = {};
  arr.forEach((item) => {
    const itemarr: string[] = item.split("=");
    if (Object.prototype.hasOwnProperty.call(data, itemarr[0])) {
      if (Array.isArray(data[itemarr[0]])) {
        (data[itemarr[0]] as string[]).push(itemarr[1]);
      } else {
        data[itemarr[0]] = [data[itemarr[0]], itemarr[1]];
      }
    } else {
      data[itemarr[0]] = itemarr[1];
    }
  })
  return data;
}
