import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");

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
globalThis.__RULE_TEST_CONTEXT__ = {
  apiBaseUrl: "http://localhost",
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
    "/scripts/service1203RulePayload.test.ts",
  );
  await testModule.runService1203RulePayloadTests();
  console.log("Service 1203 rule payload tests passed.");
} finally {
  await server.close();
}
