import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadRequestInterceptor({
  activeProfileSwitch = null,
  authenticated,
  token = "token",
} = {}) {
  const state = {
    accountSuspensionMessages: [],
    logoutCalls: 0,
    responseErrorInterceptor: null,
    unauthorizedMessages: [],
  };

  const service = {
    interceptors: {
      request: {
        use() {},
      },
      response: {
        use(_onFulfilled, onRejected) {
          state.responseErrorInterceptor = onRejected;
        },
      },
    },
  };

  const axios = {
    create: () => service,
    isCancel: () => false,
  };
  const i18next = {
    language: "en",
    t: (key) => key,
  };
  const source = fs
    .readFileSync(path.resolve("src/utils/request.ts"), "utf8")
    .replace("import.meta.env.VITE_API_BASE_URL", '""');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const testModule = { exports: {} };
  const require = (specifier) => {
    if (specifier === "axios") {
      return { __esModule: true, default: axios };
    }
    if (specifier === "@/storage/authStorage") {
      return {
        __esModule: true,
        default: {
          getToken: () => token,
          isTokenValid: () => authenticated ?? Boolean(token),
        },
      };
    }
    if (specifier === "@/localization/config") {
      return { __esModule: true, default: i18next };
    }
    if (specifier === "@/components/common") {
      return {
        CustomMessage: {
          error() {},
        },
      };
    }
    if (specifier === "./authSession") {
      return {
        performAuthenticatedLogout: () => {
          state.logoutCalls += 1;
        },
      };
    }
    if (specifier === "./profileSwitchSession") {
      return {
        getActiveProfileSwitchSession: () => activeProfileSwitch,
      };
    }
    if (specifier === "./errorToastSuppress") {
      return {
        beginNetworkErrorToastSuppress() {},
        endNetworkErrorToastSuppress() {},
      };
    }
    if (specifier === "./unauthorizedSession") {
      return {
        handleUnauthorizedSession: (message) => {
          state.unauthorizedMessages.push(message);
        },
        isLoggedInElsewhereMessage: (message) =>
          String(message ?? "").toLowerCase().includes("logged in elsewhere"),
      };
    }
    if (specifier === "./accountSuspension") {
      return {
        handleAccountSuspension: () => {
          state.accountSuspensionMessages.push(true);
        },
      };
    }
    throw new Error(`Unexpected module: ${specifier}`);
  };

  new Function("exports", "module", "require", compiled)(
    testModule.exports,
    testModule,
    require,
  );

  assert.equal(typeof state.responseErrorInterceptor, "function");
  return state;
}

async function rejectResponse(
  message,
  {
    activeProfileSwitch,
    authenticated,
    httpStatus = 401,
    skipUnauthorizedRedirect = false,
    token,
  } = {},
) {
  const state = loadRequestInterceptor({
    activeProfileSwitch,
    authenticated,
    token,
  });
  const error = {
    config: {
      method: "post",
      skipUnauthorizedRedirect,
      url: "/api/Service/ServicePage",
    },
    response: {
      data: {
        isSuccess: false,
        statusCode: httpStatus,
        message,
        data: null,
      },
      status: httpStatus,
    },
  };

  await assert.rejects(state.responseErrorInterceptor(error));
  return { error, state };
}

for (const message of [
  "Your account has been Suspended.",
  "تم تعليق حسابك.",
]) {
  test(`suspended 401 opens the account modal before logout: ${message}`, async () => {
    const { error, state } = await rejectResponse(message);

    assert.deepEqual(state.accountSuspensionMessages, [true]);
    assert.equal(state.logoutCalls, 0);
    assert.equal(error.isAccountSuspended, true);
  });
}

test("unrelated 401 keeps the existing logout behavior", async () => {
  const { state } = await rejectResponse("The token has expired.");

  assert.deepEqual(state.accountSuspensionMessages, []);
  assert.equal(state.logoutCalls, 1);
});

test("logged-in-elsewhere 401 keeps the existing dedicated handler", async () => {
  const message = "Your account has been logged in elsewhere.";
  const { state } = await rejectResponse(message);

  assert.deepEqual(state.accountSuspensionMessages, []);
  assert.deepEqual(state.unauthorizedMessages, [message]);
  assert.equal(state.logoutCalls, 0);
});

test("unrelated 401 still respects skipUnauthorizedRedirect", async () => {
  const { state } = await rejectResponse("Unauthorized.", {
    skipUnauthorizedRedirect: true,
  });

  assert.deepEqual(state.accountSuspensionMessages, []);
  assert.deepEqual(state.unauthorizedMessages, []);
  assert.equal(state.logoutCalls, 0);
});

test("unrelated 401 during profile switching does not force logout", async () => {
  const { state } = await rejectResponse("Unauthorized.", {
    activeProfileSwitch: { id: "profile-switch" },
  });

  assert.deepEqual(state.accountSuspensionMessages, []);
  assert.deepEqual(state.unauthorizedMessages, []);
  assert.equal(state.logoutCalls, 0);
});

test("authenticated suspended response is handled when the API uses HTTP 400", async () => {
  const { error, state } = await rejectResponse(
    "Your account has been Suspended.",
    { httpStatus: 400, token: "token" },
  );

  assert.deepEqual(state.accountSuspensionMessages, [true]);
  assert.equal(state.logoutCalls, 0);
  assert.equal(error.isAccountSuspended, true);
});

test("suspended login response without a token keeps the login error flow", async () => {
  const { error, state } = await rejectResponse(
    "Your account has been Suspended.",
    { httpStatus: 400, token: "" },
  );

  assert.deepEqual(state.accountSuspensionMessages, []);
  assert.equal(state.logoutCalls, 0);
  assert.equal(error.isAccountSuspended, undefined);
});

test("suspended login response with an expired token keeps the login error flow", async () => {
  const { error, state } = await rejectResponse(
    "Your account has been Suspended.",
    { authenticated: false, httpStatus: 400, token: "expired-token" },
  );

  assert.deepEqual(state.accountSuspensionMessages, []);
  assert.equal(state.logoutCalls, 0);
  assert.equal(error.isAccountSuspended, undefined);
});
