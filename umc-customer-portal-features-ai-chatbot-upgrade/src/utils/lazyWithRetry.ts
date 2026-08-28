import * as React from "react";

const reloadParam = "__app_reload";
const reloadKey = "customer-portal:asset-reload-at";
const reloadCooldownMs = 10000;
const staleAssetPattern =
  /(Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [A-Za-z0-9_-]+ failed|ChunkLoadError)/i;

type LazyModule<T extends React.ComponentType<unknown>> = {
  default: T;
};

type LazyLoader<T extends React.ComponentType<unknown>> = () => Promise<
  LazyModule<T>
>;

function readReloadMarkerFromUrl(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const currentUrl = new URL(window.location.href);
  return Number(currentUrl.searchParams.get(reloadParam) || 0) || 0;
}

function readLastReloadAt(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    return (
      Number(sessionStorage.getItem(reloadKey) || 0) || readReloadMarkerFromUrl()
    );
  } catch {
    return readReloadMarkerFromUrl();
  }
}

function writeLastReloadAt(now: number) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(reloadKey, String(now));
  } catch {
    // Storage access can be blocked by browser privacy settings.
  }
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message || error.stack || String(error);
  }

  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; stack?: unknown };
    if (typeof candidate.message === "string") {
      return candidate.message;
    }
    if (typeof candidate.stack === "string") {
      return candidate.stack;
    }
  }

  return String(error || "");
}

function shouldReload(now: number): boolean {
  return now - readLastReloadAt() > reloadCooldownMs;
}

export function isStaleAssetError(error: unknown): boolean {
  return staleAssetPattern.test(getErrorMessage(error));
}

export function reloadOnceForStaleAsset(reason: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const now = Date.now();
  if (!shouldReload(now)) {
    return false;
  }

  writeLastReloadAt(now);

  if (window.console && typeof window.console.warn === "function") {
    window.console.warn("[lazy-retry]", reason);
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(reloadParam, String(now));
  window.location.replace(nextUrl.toString());
  return true;
}

export function lazyWithRetry<T extends React.ComponentType<unknown>>(
  loader: LazyLoader<T>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await loader();
    } catch (error) {
      if (isStaleAssetError(error)) {
        const reason = getErrorMessage(error);
        if (reloadOnceForStaleAsset(reason)) {
          return new Promise<LazyModule<T>>(() => undefined);
        }
      }

      throw error;
    }
  });
}
