import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function compileModule(filePath, replacements = []) {
  let source = fs.readFileSync(path.resolve(filePath), "utf8");
  for (const [search, replacement] of replacements) {
    source = source.replace(search, replacement);
  }

  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
}

function loadSignalRHook(isProduction) {
  const state = {
    accessTokenFactory: null,
    hubUrl: null,
    logLevel: null,
    negotiateUrl: null,
    token: "initial-token",
  };

  class HubConnectionBuilder {
    withUrl(url, options) {
      state.hubUrl = url;
      state.accessTokenFactory = options.accessTokenFactory;
      return this;
    }

    withAutomaticReconnect() {
      return this;
    }

    configureLogging(logLevel) {
      state.logLevel = logLevel;
      return this;
    }

    withServerTimeout() {
      return this;
    }

    build() {
      return {
        connectionId: "connection-id",
        invoke: async () => {},
        onclose: () => {},
        onreconnected: () => {},
        onreconnecting: () => {},
        start: async () => {
          state.negotiateUrl = `${state.hubUrl}/negotiate?negotiateVersion=1`;
        },
        stop: async () => {},
      };
    }
  }

  const react = {
    useCallback: (callback) => callback,
    useEffect: () => {},
    useRef: (current) => ({ current }),
    useState: (initial) => [initial, () => {}],
  };
  const signalR = {
    HubConnectionBuilder,
    LogLevel: { Information: 2, Warning: 3 },
  };
  const authStorage = {
    getToken: () => state.token,
  };
  const compiled = compileModule("src/hooks/useSignalR.ts", [
    ["import.meta.env.PROD", String(isProduction)],
  ]);
  const testModule = { exports: {} };
  const require = (specifier) => {
    if (specifier === "react") return react;
    if (specifier === "@microsoft/signalr") return signalR;
    if (specifier === "@/storage/authStorage") {
      return { __esModule: true, default: authStorage };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };

  new Function("exports", "module", "require", compiled)(
    testModule.exports,
    testModule,
    require,
  );

  return { useSignalR: testModule.exports.useSignalR, state, signalR };
}

function loadSignalRConfig() {
  const compiled = compileModule("src/config/signalr.ts", [
    ["import.meta.env.VITE_SIGNALR_HUB_URL", "undefined"],
  ]);
  const testModule = { exports: {} };

  new Function("exports", "module", compiled)(testModule.exports, testModule);

  return testModule.exports.SIGNALR_CONFIG;
}

function loadNotificationSignalRHook(signalRConfig) {
  const state = { hubUrl: null };
  const compiled = compileModule("src/hooks/useNotificationSignalR.ts");
  const testModule = { exports: {} };
  const react = {
    useCallback: (callback) => callback,
    useEffect: () => {},
  };
  const require = (specifier) => {
    if (specifier === "react") return react;
    if (specifier === "./useSignalR") {
      return {
        useSignalR: (hubUrl) => {
          state.hubUrl = hubUrl;
          return { connection: null, error: null, isConnected: false };
        },
      };
    }
    if (specifier === "@/config/signalr") {
      return { SIGNALR_CONFIG: signalRConfig };
    }
    if (specifier === "@/store/user") {
      return { useUserStore: (selector) => selector({ currentProfileId: 1 }) };
    }
    if (specifier === "@/utils/notificationProfile") {
      return { resolveNotificationProfileId: (profileId) => Number(profileId) };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };

  new Function("exports", "module", "require", compiled)(
    testModule.exports,
    testModule,
    require,
  );

  return { useNotificationSignalR: testModule.exports.useNotificationSignalR, state };
}

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("SignalR reads the latest token and limits production logging", async () => {
  const signalRConfig = loadSignalRConfig();
  const notification = loadNotificationSignalRHook(signalRConfig);
  notification.useNotificationSignalR({ enabled: true });
  assert.equal(notification.state.hubUrl, "/chatHub");

  const production = loadSignalRHook(true);
  const connection = production.useSignalR(notification.state.hubUrl, undefined, undefined, false);

  await connection.connect();
  assert.equal(production.state.negotiateUrl, "/chatHub/negotiate?negotiateVersion=1");
  assert.equal(production.state.logLevel, production.signalR.LogLevel.Warning);
  assert.equal(production.state.accessTokenFactory(), "initial-token");

  production.state.token = "refreshed-token";
  assert.equal(production.state.accessTokenFactory(), "refreshed-token");

  production.state.token = "";
  assert.equal(production.state.accessTokenFactory(), "");

  const development = loadSignalRHook(false);
  await development.useSignalR("https://example.test/hub", undefined, undefined, false).connect();
  assert.equal(development.state.logLevel, development.signalR.LogLevel.Information);
});

test("removeToken clears access and refresh tokens from both storage types", () => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  const storageManagerCompiled = compileModule("src/storage/storageManager.ts");
  const storageManagerModule = { exports: {} };

  new Function("exports", "module", "localStorage", "sessionStorage", storageManagerCompiled)(
    storageManagerModule.exports,
    storageManagerModule,
    localStorage,
    sessionStorage,
  );

  const authStorageCompiled = compileModule("src/storage/authStorage.ts");
  const authStorageModule = { exports: {} };
  const require = (specifier) => {
    if (specifier === "./storageManager") {
      return { __esModule: true, default: storageManagerModule.exports.default };
    }
    if (specifier === "@/config/constants") {
      return { TIME: { TOKEN_REFRESH_AHEAD: 0 } };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };

  new Function("exports", "module", "require", authStorageCompiled)(
    authStorageModule.exports,
    authStorageModule,
    require,
  );

  const { AUTH_STORAGE_KEYS, authStorage } = authStorageModule.exports;
  for (const storage of [localStorage, sessionStorage]) {
    storage.setItem(AUTH_STORAGE_KEYS.TOKEN, "access-token");
    storage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, "refresh-token");
  }

  authStorage.removeToken();

  for (const storage of [localStorage, sessionStorage]) {
    assert.equal(storage.getItem(AUTH_STORAGE_KEYS.TOKEN), null);
    assert.equal(storage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN), null);
  }
  assert.equal(authStorage.getToken(), "");
  assert.equal(authStorage.getRefreshToken(), "");
  assert.equal(authStorage.isTokenValid(), false);
});
