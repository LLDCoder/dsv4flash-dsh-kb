export interface FfAiConfig {
  apiBaseUrl: string;
  cardAllowedExternalHosts: string[];
}

export interface AppConfig {
  signalr: {
    hubUrl: string;
  };
  ffAi: FfAiConfig;
}

const runtimeEnv =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

let appConfig: AppConfig | null = null;
let configLoadingPromise: Promise<AppConfig> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizeFfAiApiBaseUrl(value: unknown): string {
  const raw = getString(value).replace(/\/+$/, "");
  if (!raw) return "";

  // Same-origin relative gateway path, e.g. "/api/platform".
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  console.error(
    "Rejected external ffAi.apiBaseUrl from runtime config; use a same-origin gateway path.",
  );
  return "";
}

function createAppConfig(value?: unknown): AppConfig {
  const root = isRecord(value) ? value : {};
  const signalr = isRecord(root.signalr) ? root.signalr : {};
  const ffAi = isRecord(root.ffAi) ? root.ffAi : {};

  return {
    signalr: {
      hubUrl:
        getString(signalr.hubUrl) ||
        runtimeEnv.VITE_SIGNALR_HUB_URL ||
        "/chatHub",
    },
    // public/config.json is the single source of truth for ffAi runtime
    // configuration. Missing values fail fast through the existing
    // configuration-error flow instead of falling back to build-time env vars.
    ffAi: {
      apiBaseUrl: normalizeFfAiApiBaseUrl(ffAi.apiBaseUrl),
      cardAllowedExternalHosts: getStringArray(ffAi.cardAllowedExternalHosts),
    },
  };
}

export async function loadAppConfig(): Promise<AppConfig> {
  if (appConfig) {
    return appConfig;
  }

  if (configLoadingPromise) {
    return configLoadingPromise;
  }

  configLoadingPromise = (async () => {
    try {
      const baseUrl = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/";
      const configUrl = new URL(`config.json?t=${Date.now()}`, window.location.origin + baseUrl);
      const response = await fetch(configUrl.toString());
      if (response.ok) {
        const config: unknown = await response.json();
        appConfig = createAppConfig(config);
        console.log('App config loaded from config.json:', appConfig);
        return appConfig;
      }
    } catch (error) {
      console.warn('Failed to load config.json, using default config:', error);
    }

    appConfig = createAppConfig();
    console.log('App config using defaults:', appConfig);
    return appConfig;
  })();

  return configLoadingPromise;
}

export function getAppConfig(): AppConfig {
  if (!appConfig) {
    console.warn('App config not loaded yet, using default config');
    return createAppConfig();
  }
  return appConfig;
}

export async function initAppConfig(): Promise<void> {
  await loadAppConfig();
}

export async function reloadAppConfig(): Promise<AppConfig> {
  appConfig = null;
  configLoadingPromise = null;
  return loadAppConfig();
}
