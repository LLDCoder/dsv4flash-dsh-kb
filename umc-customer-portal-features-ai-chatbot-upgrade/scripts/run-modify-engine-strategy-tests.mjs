import path from "node:path";
import { createServer } from "vite";

const projectRoot = path.resolve(import.meta.dirname, "..");

const createMemoryStorage = () => {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
};

globalThis.localStorage = createMemoryStorage();
globalThis.sessionStorage = createMemoryStorage();
const ruleTestContext = {
  apiBaseUrl: "http://localhost",
  failLanguages: false,
};
globalThis.__RULE_TEST_CONTEXT__ = ruleTestContext;

globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (
    url.pathname === "/api/ContentLibrary/Languages" &&
    ruleTestContext.failLanguages
  ) {
    return {
      ok: false,
      json: async () => ({ message: "Languages request failed" }),
    };
  }
  const responseByPath = {
    "/api/ContentLibrary/Languages": {
      data: [
        { id: 1, nameEn: "Arabic", nameAr: "العربية" },
        { id: 2, nameEn: "English", nameAr: "الإنجليزية" },
        { id: 47, nameEn: "French", nameAr: "الفرنسية" },
        { id: 136, nameEn: "Russian", nameAr: "الروسية" },
      ],
    },
    "/api/User/GetNationalityList": { data: [] },
    "/api/Lookup/GetArtistWorkTypes": { data: [] },
  };
  const body = responseByPath[url.pathname];

  if (!body) {
    throw new Error(`Unexpected test request: ${url.pathname}`);
  }

  return {
    ok: true,
    json: async () => body,
  };
};

const server = await createServer({
  root: projectRoot,
  appType: "custom",
  optimizeDeps: {
    noDiscovery: true,
  },
  resolve: {
    alias: [
      {
        find: /^lodash(?:\/get)?$/,
        replacement: path.join(
          projectRoot,
          "scripts",
          "stubs",
          "lodashGetStub.mjs",
        ),
      },
      {
        find: "@/services/services",
        replacement: path.join(projectRoot, "scripts", "stubs", "servicesStub.mjs"),
      },
      {
        find: "@/services/userProfile",
        replacement: path.join(
          projectRoot,
          "scripts",
          "stubs",
          "userProfileStub.mjs",
        ),
      },
    ],
  },
  server: {
    middlewareMode: true,
    hmr: false,
  },
});

try {
  const testModule = await server.ssrLoadModule(
    "/scripts/modifyEngineStrategies.test.ts",
  );
  await testModule.runModifyEngineStrategiesTests();
  console.log("Modify engine strategy tests passed.");
} finally {
  await server.close();
}

process.exit(0);
