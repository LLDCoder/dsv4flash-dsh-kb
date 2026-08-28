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
globalThis.__RULE_TEST_CONTEXT__ = { apiBaseUrl: "http://localhost" };

const server = await createServer({
  root: projectRoot,
  appType: "custom",
  optimizeDeps: { noDiscovery: true },
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
  server: { middlewareMode: true, hmr: false },
});

try {
  const testModule = await server.ssrLoadModule(
    "/scripts/service903ModifyPayload.test.ts",
  );
  await testModule.runService903ModifyPayloadTests();
  console.log("Service 903 modify payload tests passed.");
} finally {
  await server.close();
}

process.exit(0);
