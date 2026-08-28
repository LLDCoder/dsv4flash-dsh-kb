import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
 
function compileModule(filePath) {
  return ts.transpileModule(fs.readFileSync(path.resolve(filePath), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
}
 
function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
 
function loadAuthSessionSync() {
  const listeners = new Map();
  const localStorage = createStorage();
  const window = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    localStorage,
    removeEventListener: (type) => listeners.delete(type),
  };
  const module = { exports: {} };
 
  new Function("exports", "module", "window", compileModule("src/utils/authSessionSync.ts"))(
    module.exports,
    module,
    window,
  );
 
  return { exports: module.exports, listeners, localStorage, window };
}
 
test("SWITCH_IDENTITY is published, parsed, and delivered to another tab", () => {
  const { exports, listeners, localStorage, window } = loadAuthSessionSync();
  const received = [];
  const unsubscribe = exports.subscribeAuthSessionSync((action) => received.push(action));
 
  exports.publishAuthSessionSync(exports.AUTH_SESSION_SYNC_ACTION.SWITCH_IDENTITY);
  const value = localStorage.getItem(exports.AUTH_SESSION_SYNC_STORAGE_KEY);
  const message = JSON.parse(value);
 
  assert.equal(
    exports.parseAuthSessionSyncMessage(value),
    exports.AUTH_SESSION_SYNC_ACTION.SWITCH_IDENTITY,
  );
  assert.equal(typeof message.eventId, "string");
  assert.equal(typeof message.occurredAt, "number");
 
  listeners.get("storage")({
    key: exports.AUTH_SESSION_SYNC_STORAGE_KEY,
    newValue: value,
    storageArea: window.localStorage,
  });
  assert.deepEqual(received, [exports.AUTH_SESSION_SYNC_ACTION.SWITCH_IDENTITY]);
 
  unsubscribe();
  assert.equal(listeners.has("storage"), false);
});
 
test("invalid auth sync messages are ignored", () => {
  const { exports } = loadAuthSessionSync();
 
  assert.equal(exports.parseAuthSessionSyncMessage(null), null);
  assert.equal(exports.parseAuthSessionSyncMessage("{"), null);
  assert.equal(
    exports.parseAuthSessionSyncMessage(
      JSON.stringify({ eventId: "event", action: "UNKNOWN" }),
    ),
    null,
  );
});
 
test("identity completion persists and publishes without reloading the current tab", () => {
  const calls = [];
  const userState = {
    currentProfileId: "old-profile",
    setCurrentIdentity: (profileId, userTypeId) =>
      calls.push(["identity", profileId, userTypeId]),
    refreshIdentityContext: () => calls.push(["refresh"]),
    setData: (userInfo) => calls.push(["user", userInfo.token]),
    userInfo: { token: "old-token" },
  };
  const module = { exports: {} };
  const window = {
    location: {
      reload: () => calls.push(["reload"]),
    },
  };
  const require = (specifier) => {
    if (specifier === "@/config/constants") {
      return { TIME: { REFRESH_TOKEN_EXPIRE: 3600 } };
    }
    if (specifier === "@/storage/authStorage") {
      return {
        __esModule: true,
        default: {
          getStorageType: () => "session",
          setTokenInfo: ({ token, remember }) =>
            calls.push(["token", token, remember]),
        },
      };
    }
    if (specifier === "@/store/user") {
      return { useUserStore: { getState: () => userState } };
    }
    if (specifier === "@/store/update-form") {
      return {
        useUpdateFormStore: {
          getState: () => ({
            resetUpdateForm: () => calls.push(["reset-update-form"]),
          }),
        },
      };
    }
    if (specifier === "@/store/licenseLifecycleSource") {
      return {
        useLicenseLifecycleSourceStore: {
          getState: () => ({
            clearLicenseLifecycleSource: () =>
              calls.push(["clear-license-lifecycle-source"]),
          }),
        },
      };
    }
    if (specifier === "@/utils/authSessionSync") {
      return {
        AUTH_SESSION_SYNC_ACTION: { SWITCH_IDENTITY: "SWITCH_IDENTITY" },
        publishAuthSessionSync: (action) => calls.push(["publish", action]),
      };
    }
    if (specifier === "@/utils/profileSwitchSession") {
      return { updateProfileSwitchSession: () => calls.push(["session"]) };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };
 
  new Function(
    "exports",
    "module",
    "require",
    "window",
    compileModule("src/utils/identitySwitch.ts"),
  )(module.exports, module, require, window);
 
  module.exports.completeIdentitySwitch({
    token: "new-token",
    userProfileId: "new-profile",
    userTypeId: "new-type",
  });
 
  assert.deepEqual(calls, [
    ["token", "new-token", false],
    ["user", "new-token"],
    ["identity", "new-profile", "new-type"],
    ["refresh"],
    ["reset-update-form"],
    ["clear-license-lifecycle-source"],
    ["session"],
    ["publish", "SWITCH_IDENTITY"],
  ]);
});
 
test("missing token does not persist or publish", () => {
  const source = fs.readFileSync(path.resolve("src/utils/identitySwitch.ts"), "utf8");
  assert.match(source, /if \(!normalizedToken\)/);
  assert.ok(
    source.indexOf("if (!normalizedToken)") <
      source.indexOf("authStorage.setTokenInfo"),
  );
});
 
test("current tab remounts authenticated content without a full-page reload", () => {
  const identitySwitchSource = fs.readFileSync(
    path.resolve("src/utils/identitySwitch.ts"),
    "utf8",
  );
  const appSource = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
 
  assert.match(
    identitySwitchSource,
    /useUserStore\.getState\(\)\.refreshIdentityContext\(\)/,
  );
  assert.doesNotMatch(identitySwitchSource, /window\.location\.reload\(\)/);
  assert.match(
    appSource,
    /const identityVersion = useUserStore\(\(state\) => state\.identityVersion\)/,
  );
  assert.match(appSource, /<AuthBoundary key=\{identityVersion\}>/);
});
 
test("another tab rehydrates identity state without a full-page reload", () => {
  const appSource = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
  const switchIdentityBranch =
    appSource.match(
      /if \(action === AUTH_SESSION_SYNC_ACTION\.SWITCH_IDENTITY\) \{([\s\S]*?)\n        \}/,
    )?.[1] || "";
 
  assert.match(switchIdentityBranch, /persistedUserStore\.persist\.rehydrate\(\)/);
  assert.match(
    switchIdentityBranch,
    /clearIdentityScopedBusinessContext\(\)/,
  );
  assert.ok(
    switchIdentityBranch.indexOf("clearIdentityScopedBusinessContext()") <
      switchIdentityBranch.indexOf("userStore.refreshIdentityContext()"),
  );
  assert.doesNotMatch(switchIdentityBranch, /window\.location\.reload\(\)/);
});
 
test("profile switch sessions reject overlap and cannot be finished by another session", () => {
  const module = { exports: {} };
  new Function(
    "exports",
    "module",
    compileModule("src/utils/profileSwitchSession.ts"),
  )(module.exports, module);
 
  const first = module.exports.startProfileSwitchSession({
    source: "first",
  });
  assert.ok(first?.sessionId);
  assert.equal(
    module.exports.startProfileSwitchSession({ source: "second" }),
    null,
  );
  module.exports.updateProfileSwitchSession(
    { tokenPersistedAt: new Date().toISOString() },
    first.sessionId,
  );
  const replacement = module.exports.startProfileSwitchSession({
    source: "replacement",
  });
  assert.ok(replacement?.sessionId);
  assert.notEqual(replacement.sessionId, first.sessionId);
 
  module.exports.finishProfileSwitchSession("failed", {}, "wrong-session");
  assert.equal(
    module.exports.getActiveProfileSwitchSession()?.sessionId,
    replacement.sessionId,
  );
 
  module.exports.finishProfileSwitchSession(
    "completed",
    {},
    replacement.sessionId,
  );
  assert.equal(module.exports.getActiveProfileSwitchSession(), null);
  assert.ok(
    module.exports.startProfileSwitchSession({ source: "second" })?.sessionId,
  );
});
