import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const modulePath = path.resolve("src/utils/authSessionSync.ts");
const source = fs.readFileSync(modulePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

function loadModule(windowObject) {
  const testModule = { exports: {} };
  new Function("exports", "module", "window", compiled)(
    testModule.exports,
    testModule,
    windowObject,
  );
  return testModule.exports;
}

function loadAuthSessionModule(options = {}) {
  const source = fs.readFileSync(path.resolve("src/utils/authSession.ts"), "utf8");
  const compiledAuthSession = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const calls = [];
  let currentToken = options.token ?? "";
  const localStorage = {
    removeItem: (key) => calls.push(["removeItem", key]),
  };
  const sessionStorage = {};
  const windowObject = {
    location: {
      assign: (url) => calls.push(["externalRedirect", url]),
    },
  };
  const authStorage = {
    clearAuth: () => {
      currentToken = "";
      calls.push(["clearAuth"]);
    },
    getToken: () => currentToken,
    isUaePassSession: () => options.isUaePassSession ?? false,
  };
  const require = (specifier) => {
    if (specifier === "@/services/uaePassLogout") {
      return {
        requestUaePassLogout:
          options.requestUaePassLogout ?? (async () => null),
      };
    }
    if (specifier === "@/storage/authStorage") {
      return {
        __esModule: true,
        default: authStorage,
        AUTH_USER_STORAGE_KEY: "NMA_SERVICES_USER_STORAGE",
      };
    }
    if (specifier === "@/utils/history") {
      return {
        hardRedirectToLogin: () => calls.push(["redirect", "/login"]),
      };
    }
    if (specifier === "@/utils/logoutNotice") {
      return {
        clearLogoutNotice: () => {},
        consumeLogoutNotice: () => null,
        storeLogoutNotice: () => {},
      };
    }
    if (specifier === "@/utils/authSessionSync") {
      return {
        AUTH_SESSION_SYNC_ACTION: {
          LOGIN: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN",
          LOGOUT: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT",
        },
        publishAuthSessionSync: (action) => calls.push(["publish", action]),
      };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };
  const testModule = { exports: {} };

  new Function(
    "exports",
    "module",
    "require",
    "localStorage",
    "sessionStorage",
    "window",
    compiledAuthSession,
  )(
    testModule.exports,
    testModule,
    require,
    localStorage,
    sessionStorage,
    windowObject,
  );

  return {
    calls,
    module: testModule.exports,
    setToken: (token) => {
      currentToken = token;
    },
  };
}

test("parses valid login and logout synchronization messages", () => {
  const { parseAuthSessionSyncMessage } = loadModule({});

  assert.equal(
    parseAuthSessionSyncMessage(
      JSON.stringify({
        eventId: "event-login",
        action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN",
      }),
    ),
    "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN",
  );
  assert.equal(
    parseAuthSessionSyncMessage(
      JSON.stringify({
        eventId: "event-logout",
        action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT",
      }),
    ),
    "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT",
  );
});

test("ignores empty, malformed, incomplete, and unknown messages", () => {
  const { parseAuthSessionSyncMessage } = loadModule({});
  const invalidMessages = [
    null,
    "",
    "not-json",
    JSON.stringify(null),
    JSON.stringify({ eventId: "", action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN" }),
    JSON.stringify({ eventId: "   ", action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN" }),
    JSON.stringify({ eventId: "event-login" }),
    JSON.stringify({ eventId: "event-generic-login", action: "login" }),
    JSON.stringify({ eventId: "event-generic-logout", action: "logout" }),
    JSON.stringify({ eventId: "event-unknown", action: "refresh" }),
  ];

  for (const message of invalidMessages) {
    assert.equal(parseAuthSessionSyncMessage(message), null);
  }
});

test("publishes a uniquely identifiable synchronization message", () => {
  const storedValues = [];
  const localStorage = {
    removeItem: () => {},
    setItem: (key, value) => storedValues.push([key, JSON.parse(value)]),
  };
  const { publishAuthSessionSync } = loadModule({ localStorage });

  publishAuthSessionSync("@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN");
  publishAuthSessionSync("@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN");

  assert.equal(storedValues.length, 2);
  assert.equal(storedValues[0][0], "NMA_SERVICES_AUTH_SESSION_SYNC_EVENT");
  assert.equal(storedValues[0][1].action, "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN");
  assert.equal(typeof storedValues[0][1].eventId, "string");
  assert.notEqual(storedValues[0][1].eventId, storedValues[1][1].eventId);
});

test("does not block the current auth flow when synchronization storage fails", () => {
  const localStorage = {
    setItem: () => {
      throw new Error("storage unavailable");
    },
  };
  const { publishAuthSessionSync } = loadModule({ localStorage });

  assert.doesNotThrow(() =>
    publishAuthSessionSync("@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN"),
  );
});

test("tracks and clears an in-progress login before publishing", () => {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const {
    isAuthSessionLoginPending,
    markAuthSessionLoginPending,
    publishAuthSessionSync,
  } = loadModule({ localStorage });

  assert.equal(markAuthSessionLoginPending(), true);
  assert.equal(isAuthSessionLoginPending(), true);
  publishAuthSessionSync("@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN");
  assert.equal(isAuthSessionLoginPending(), false);
});

test("expires a stale in-progress login marker", () => {
  const values = new Map([
    [
      "NMA_SERVICES_AUTH_SESSION_LOGIN_PENDING",
      JSON.stringify({ createdAt: Date.now() - 31 * 60 * 1000 }),
    ],
  ]);
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const { isAuthSessionLoginPending } = loadModule({ localStorage });

  assert.equal(isAuthSessionLoginPending(), false);
  assert.equal(values.has("NMA_SERVICES_AUTH_SESSION_LOGIN_PENDING"), false);
});

test("subscribes only to valid messages from the dedicated local storage key", () => {
  const listeners = new Map();
  let currentSyncMessage = null;
  const localStorage = {
    getItem: () => currentSyncMessage,
  };
  const windowObject = {
    localStorage,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
  };
  const { subscribeAuthSessionSync } = loadModule(windowObject);
  const actions = [];
  const unsubscribe = subscribeAuthSessionSync((action) => actions.push(action));
  const handleStorage = listeners.get("storage");

  handleStorage({
    key: "auth:token",
    newValue: JSON.stringify({
      eventId: "wrong-key",
      action: "@@AUTH_SESSION_SYNC/LOGIN",
    }),
    storageArea: localStorage,
  });
  handleStorage({
    key: "NMA_WORKSPACE_AUTH_SESSION_SYNC_EVENT",
    newValue: JSON.stringify({
      eventId: "other-portal",
      action: "@@NMA_WORKSPACE_AUTH_SESSION_SYNC/LOGOUT",
    }),
    storageArea: localStorage,
  });
  handleStorage({
    key: "NMA_SERVICES_AUTH_SESSION_SYNC_EVENT",
    newValue: "not-json",
    storageArea: localStorage,
  });
  handleStorage({
    key: "NMA_SERVICES_AUTH_SESSION_SYNC_EVENT",
    newValue: JSON.stringify({
      eventId: "wrong-storage",
      action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN",
    }),
    storageArea: {},
  });
  currentSyncMessage = JSON.stringify({
    eventId: "logout-event",
    action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT",
  });
  handleStorage({
    key: "NMA_SERVICES_AUTH_SESSION_SYNC_EVENT",
    newValue: currentSyncMessage,
    storageArea: localStorage,
  });

  assert.deepEqual(actions, ["@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT"]);
  unsubscribe();
  assert.equal(listeners.has("storage"), false);
});

test("ignores an event that has already been superseded in storage", () => {
  const listeners = new Map();
  const latestMessage = JSON.stringify({
    eventId: "latest-login",
    action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGIN",
  });
  const localStorage = {
    getItem: () => latestMessage,
  };
  const windowObject = {
    localStorage,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: () => {},
  };
  const { subscribeAuthSessionSync } = loadModule(windowObject);
  const actions = [];
  subscribeAuthSessionSync((action) => actions.push(action));

  listeners.get("storage")({
    key: "NMA_SERVICES_AUTH_SESSION_SYNC_EVENT",
    newValue: JSON.stringify({
      eventId: "stale-logout",
      action: "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT",
    }),
    storageArea: localStorage,
  });

  assert.deepEqual(actions, []);
});

test("local logout clears requested state and publishes once by default", () => {
  const { calls, module } = loadAuthSessionModule();

  module.performLocalLogout({
    clearUserStorage: true,
    onLocalLogout: () => calls.push(["callback"]),
  });

  assert.deepEqual(calls, [
    ["clearAuth"],
    ["callback"],
    ["removeItem", "NMA_SERVICES_USER_STORAGE"],
    ["publish", "@@NMA_SERVICES_AUTH_SESSION_SYNC/LOGOUT"],
  ]);
});

test("local logout can suppress peer-tab rebroadcasting", () => {
  const { calls, module } = loadAuthSessionModule();

  module.performLocalLogout({ syncOtherTabs: false });

  assert.deepEqual(calls, [["clearAuth"]]);
});

test("UAE PASS logout opens the returned logout page after cleanup", async () => {
  let resolveLogoutRequest;
  const logoutRequest = new Promise((resolve) => {
    resolveLogoutRequest = resolve;
  });
  const { calls, module } = loadAuthSessionModule({
    token: "uae-pass-token",
    isUaePassSession: true,
    requestUaePassLogout: () => {
      calls.push(["requestUaePassLogout"]);
      return logoutRequest;
    },
  });

  module.performAuthenticatedLogout();

  assert.equal(calls.filter(([name]) => name === "redirect").length, 0);
  resolveLogoutRequest("https://stg-id.uaepass.ae/logout");
  await logoutRequest;
  await Promise.resolve();
  assert.deepEqual(
    calls.filter(([name]) => name === "externalRedirect"),
    [["externalRedirect", "https://stg-id.uaepass.ae/logout"]],
  );
  assert.equal(calls.filter(([name]) => name === "redirect").length, 0);
});

test("UAE PASS logout falls back to login when no logout page is returned", async () => {
  const { calls, module } = loadAuthSessionModule({
    token: "uae-pass-token",
    isUaePassSession: true,
    requestUaePassLogout: async () => null,
  });

  module.performAuthenticatedLogout();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(calls.filter(([name]) => name === "externalRedirect").length, 0);
  assert.equal(calls.filter(([name]) => name === "redirect").length, 1);
});

test("UAE PASS logout clears a token written while cleanup is pending", async () => {
  let resolveLogoutRequest;
  const logoutRequest = new Promise((resolve) => {
    resolveLogoutRequest = resolve;
  });
  const { calls, module, setToken } = loadAuthSessionModule({
    token: "uae-pass-token",
    isUaePassSession: true,
    requestUaePassLogout: () => logoutRequest,
  });

  module.performAuthenticatedLogout();
  setToken("concurrent-token");
  resolveLogoutRequest("https://stg-id.uaepass.ae/logout");
  await logoutRequest;
  await Promise.resolve();

  assert.equal(calls.filter(([name]) => name === "clearAuth").length, 2);
  assert.equal(calls.filter(([name]) => name === "externalRedirect").length, 1);
});
