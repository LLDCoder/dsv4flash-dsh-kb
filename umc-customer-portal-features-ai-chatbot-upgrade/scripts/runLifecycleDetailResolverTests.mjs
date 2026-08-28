import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const server = await createServer({
  root: projectRoot,
  mode: "development",
  appType: "custom",
  logLevel: "error",
  resolve: {
    alias: [
      {
        find: "react",
        replacement: path.join(projectRoot, "scripts", "stubs", "reactHooksStub.mjs"),
      },
      {
        find: "@/services/myRequest",
        replacement: path.join(
          projectRoot,
          "scripts",
          "stubs",
          "myRequestLifecycleStub.mjs",
        ),
      },
    ],
  },
});

const noop = () => {};

const run = async () => {
  const resolverModule = await server.ssrLoadModule(
    "/src/pages/MediaLicense/useLifecycleDetailResolver.ts",
  );
  const serviceStub = await server.ssrLoadModule(
    "/scripts/stubs/myRequestLifecycleStub.mjs",
  );

  const createResolver = (permitLifecycleLicensePermitNo = null) =>
    resolverModule.useLifecycleDetailResolver({
      serviceCode: "1202",
      lifecycleSourceApplicationId: 12414,
      permitLifecycleLicensePermitNo,
      lifecycleActivityLoadErrorMessage: "Unable to load lifecycle activities.",
      isLifecycleActivityServiceCode: (serviceCode) => String(serviceCode) === "1202",
      setLifecycleActivityLoading: noop,
      setLifecycleActivityError: noop,
      setLifecycleActivityContext: noop,
    });

  const tests = [
    {
      name: "does not request lifecycle activities before licensePermitNo is known",
      fn: async () => {
        serviceStub.resetLifecycleActivityCalls();

        const { resolveLifecycleDetailRequest } = createResolver(null);
        const result = await resolveLifecycleDetailRequest(12415, {
          syncLifecycleState: true,
        });

        assert.equal(result.resolvedApplicationId, 12415);
        assert.equal(result.lifecycleActivityContext, null);
        assert.equal(result.lifecycleRequestSourceApplicationId, null);
        assert.deepEqual(serviceStub.lifecycleActivityCalls, []);
      },
    },
    {
      name: "passes explicit licensePermitNo to lifecycle activities request",
      fn: async () => {
        serviceStub.resetLifecycleActivityCalls();

        const { fetchLifecycleActivityContextBySourceApplicationId } =
          createResolver(null);
        await fetchLifecycleActivityContextBySourceApplicationId(12414, {
          licensePermitNo: "2773978",
        });

        assert.deepEqual(serviceStub.lifecycleActivityCalls, [
          {
            sourceApplicationId: 12414,
            targetServiceCode: "1202",
            licensePermitNo: "2773978",
          },
        ]);
      },
    },
    {
      name: "uses the explicitly resolved target service code",
      fn: async () => {
        serviceStub.resetLifecycleActivityCalls();

        const { fetchLifecycleActivityContextBySourceApplicationId } =
          resolverModule.useLifecycleDetailResolver({
            serviceCode: "",
            lifecycleSourceApplicationId: 1386,
            permitLifecycleLicensePermitNo: null,
            lifecycleActivityLoadErrorMessage:
              "Unable to load lifecycle activities.",
            isLifecycleActivityServiceCode: (serviceCode) =>
              String(serviceCode) === "80012",
            setLifecycleActivityLoading: noop,
            setLifecycleActivityError: noop,
            setLifecycleActivityContext: noop,
          });

        await fetchLifecycleActivityContextBySourceApplicationId(1386, {
          licensePermitNo: "2977988",
          targetServiceCode: "80012",
        });

        assert.deepEqual(serviceStub.lifecycleActivityCalls, [
          {
            sourceApplicationId: 1386,
            targetServiceCode: "80012",
            licensePermitNo: "2977988",
          },
        ]);
      },
    },
    {
      name: "does not fall back when explicit licensePermitNo is unavailable",
      fn: async () => {
        serviceStub.resetLifecycleActivityCalls();

        const { fetchLifecycleActivityContextBySourceApplicationId } =
          createResolver("4626748");
        await fetchLifecycleActivityContextBySourceApplicationId(1366, {
          licensePermitNo: undefined,
        });

        assert.deepEqual(serviceStub.lifecycleActivityCalls, [
          {
            sourceApplicationId: 1366,
            targetServiceCode: "1202",
            licensePermitNo: null,
          },
        ]);
      },
    },
    {
      name: "keeps existing lifecycle source licensePermitNo behavior",
      fn: async () => {
        serviceStub.resetLifecycleActivityCalls();

        const { resolveLifecycleDetailRequest } = createResolver("2773978");
        await resolveLifecycleDetailRequest(12415);

        assert.deepEqual(serviceStub.lifecycleActivityCalls, [
          {
            sourceApplicationId: 12414,
            targetServiceCode: "1202",
            licensePermitNo: "2773978",
          },
        ]);
      },
    },
  ];

  const failures = [];

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failures.push({ name: test.name, error });
      console.error(`FAIL ${test.name}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length > 0) {
    return 1;
  }

  console.log("Lifecycle detail resolver tests passed.");
  return 0;
};

let exitCode = 0;

try {
  exitCode = await run();
} finally {
  await server.close();
}

process.exit(exitCode);
