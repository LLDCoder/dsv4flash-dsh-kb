import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function findElement(node, targetType) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (node.type === targetType) {
    return node;
  }

  for (const child of node.children ?? []) {
    const match = findElement(child, targetType);
    if (match) return match;
  }
  return null;
}

function loadAuthBoundary() {
  const state = {
    authenticated: true,
    accountSuspensionActive: false,
    accountCheckCalls: 0,
    accountSuspensionResetCalls: 0,
    documentListeners: new Map(),
    effects: [],
    stateCursor: 0,
    stateValues: [],
    windowListeners: new Map(),
  };
  const AccountSuspendedModal = Symbol("AccountSuspendedModal");
  const React = {
    Fragment: Symbol("Fragment"),
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children };
    },
    useCallback: (callback) => callback,
    useEffect(callback) {
      state.effects.push(callback);
    },
    useRef: (current) => ({ current }),
    useState(initial) {
      const index = state.stateCursor;
      state.stateCursor += 1;
      if (!(index in state.stateValues)) {
        state.stateValues[index] = initial;
      }
      return [
        state.stateValues[index],
        (value) => {
          state.stateValues[index] =
            typeof value === "function"
              ? value(state.stateValues[index])
              : value;
        },
      ];
    },
  };
  const document = {
    visibilityState: "visible",
    addEventListener(name, listener) {
      state.documentListeners.set(name, listener);
    },
    removeEventListener(name) {
      state.documentListeners.delete(name);
    },
  };
  const window = {
    addEventListener(name, listener) {
      state.windowListeners.set(name, listener);
    },
    clearTimeout() {},
    location: {
      replace() {},
      search: "",
    },
    removeEventListener(name) {
      state.windowListeners.delete(name);
    },
    setTimeout: () => 1,
  };
  const source = fs.readFileSync(
    path.resolve("src/components/AuthBoundary/index.tsx"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const testModule = { exports: {} };
  const require = (specifier) => {
    if (specifier === "react") {
      return { __esModule: true, default: React, ...React };
    }
    if (specifier === "react-router-dom") {
      return {
        Redirect: Symbol("Redirect"),
        useLocation: () => ({ pathname: "/services" }),
      };
    }
    if (specifier === "@/services/auth") {
      return {
        authService: {
          isAuthenticated: () => state.authenticated,
        },
      };
    }
    if (specifier === "../../routes") {
      return { __esModule: true, default: [] };
    }
    if (specifier === "@/localization/config") {
      return {
        __esModule: true,
        default: { t: (key) => key },
      };
    }
    if (specifier === "@/utils/authSession") {
      return {
        performAuthenticatedLogout(options) {
          options?.onLocalLogout?.();
        },
      };
    }
    if (specifier === "@/services/user") {
      return {
        getCurrentUserInfo: async () => {
          state.accountCheckCalls += 1;
        },
      };
    }
    if (specifier === "@/utils/accountSuspension") {
      return {
        ACCOUNT_SUSPENSION_EVENT: "NMA_SERVICES_AUTH_ACCOUNT_SUSPENDED",
        isAccountSuspensionActive: () => state.accountSuspensionActive,
        resetAccountSuspensionHandling: () => {
          state.accountSuspensionResetCalls += 1;
          state.accountSuspensionActive = false;
        },
      };
    }
    if (specifier === "@/pages/Services/components/AccountSuspendedModal") {
      return { __esModule: true, default: AccountSuspendedModal };
    }
    if (specifier === "@/store/user") {
      return {
        useUserStore: {
          getState: () => ({ resetUserInfo() {} }),
        },
      };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };

  new Function(
    "exports",
    "module",
    "require",
    "document",
    "window",
    "React",
    compiled,
  )(testModule.exports, testModule, require, document, window, React);

  const render = () => {
    state.effects = [];
    state.stateCursor = 0;
    return testModule.exports.default({ children: "content" });
  };
  const runEffects = () => state.effects.map((effect) => effect());

  return {
    AccountSuspendedModal,
    document,
    findModal: (tree) => findElement(tree, AccountSuspendedModal),
    render,
    runEffects,
    state,
  };
}

test("returning to a visible customer tab or window validates the account once", async () => {
  const boundary = loadAuthBoundary();
  boundary.render();
  boundary.runEffects();

  const handleVisibilityChange =
    boundary.state.documentListeners.get("visibilitychange");
  const handleWindowFocus = boundary.state.windowListeners.get("focus");
  assert.equal(typeof handleVisibilityChange, "function");
  assert.equal(typeof handleWindowFocus, "function");

  handleVisibilityChange();
  handleWindowFocus();
  assert.equal(boundary.state.accountCheckCalls, 1);

  await Promise.resolve();
  await Promise.resolve();
  handleWindowFocus();
  assert.equal(boundary.state.accountCheckCalls, 2);
});

test("hidden, unauthenticated, and already suspended states skip account checks", () => {
  const boundary = loadAuthBoundary();
  boundary.render();
  boundary.runEffects();

  const handleVisibilityChange =
    boundary.state.documentListeners.get("visibilitychange");

  boundary.document.visibilityState = "hidden";
  handleVisibilityChange();

  boundary.document.visibilityState = "visible";
  boundary.state.authenticated = false;
  handleVisibilityChange();

  boundary.state.authenticated = true;
  boundary.state.accountSuspensionActive = true;
  handleVisibilityChange();

  assert.equal(boundary.state.accountCheckCalls, 0);
});

test("account suspension event opens the global confirmation modal", () => {
  const boundary = loadAuthBoundary();
  boundary.render();
  boundary.runEffects();

  const handleAccountSuspension = boundary.state.windowListeners.get(
    "NMA_SERVICES_AUTH_ACCOUNT_SUSPENDED",
  );
  assert.equal(typeof handleAccountSuspension, "function");
  handleAccountSuspension();

  const modal = boundary.findModal(boundary.render());
  assert.ok(modal);
  assert.equal(modal.props.visible, true);
});

test("an account suspension detected before subscription still opens the modal", () => {
  const boundary = loadAuthBoundary();
  boundary.state.accountSuspensionActive = true;

  boundary.render();
  boundary.runEffects();

  const modal = boundary.findModal(boundary.render());
  assert.ok(modal);
  assert.equal(modal.props.visible, true);
});

test("confirming the suspension modal clears the active suspension state", () => {
  const boundary = loadAuthBoundary();
  boundary.state.accountSuspensionActive = true;

  boundary.render();
  boundary.runEffects();

  const modal = boundary.findModal(boundary.render());
  modal.props.onConfirm();

  assert.equal(boundary.state.accountSuspensionResetCalls, 1);
  assert.equal(boundary.state.accountSuspensionActive, false);
});
