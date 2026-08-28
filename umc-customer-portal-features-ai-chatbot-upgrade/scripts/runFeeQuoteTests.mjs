import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const candidateServiceIds = [
  1, 4, 6, 7, 13, 14, 20, 21, 205, 301, 302, 303, 801, 901, 1001, 1002,
  1003, 1004, 1005, 1006, 1007, 1008, 1009, 1101, 1102, 1201, 1801, 1802, 1901,
  2202, 8006, 8007,
];

const developmentEnv = loadEnv("development", projectRoot, "");
const apiBaseUrl =
  developmentEnv.VITE_API_BASE_URL || "https://umc-customerportal.sol.daypop.ai";

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const pathExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const writeJson = async (filePath, data) => {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const normalizeFormilyList = (input) => {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    if (Array.isArray(input.formsList)) return input.formsList;
    if (Array.isArray(input.data?.formsList)) return input.data.formsList;
  }
  throw new Error("Input JSON is not a recognizable formilyList shape.");
};

const createInputCandidates = (serviceId) => {
  const docDir = path.join(projectRoot, "src", "doc", String(serviceId));
  const mockDir = path.join(projectRoot, "src", "pages", "MediaLicense", "mockData");

  return [
    { type: "mockData", path: path.join(mockDir, `${serviceId}mock.json`) },
    { type: "mock", path: path.join(docDir, `${serviceId}mock.json`) },
  ];
};

const resolveInputSource = async (serviceId) => {
  for (const candidate of createInputCandidates(serviceId)) {
    if (!(await pathExists(candidate.path))) continue;

    try {
      const parsed = await readJson(candidate.path);
      return {
        ...candidate,
        formilyList: normalizeFormilyList(parsed),
      };
    } catch (error) {
      console.warn(
        `[service ${serviceId}] skip invalid input ${candidate.path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return null;
};

class FeeQuoteApiError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "FeeQuoteApiError";
    this.details = details;
  }
}

const callFeeQuoteApi = async (requestPayload, token) => {
  const target = new URL("/api/customer-engines/fee/quote", apiBaseUrl);
  const response = await fetch(target, {
    method: "POST",
    headers: {
      "Accept-Language": "en",
      "Content-Type": "application/json;charset=utf-8",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(requestPayload),
  });

  const responseText = await response.text();
  let json;

  try {
    json = responseText ? JSON.parse(responseText) : null;
  } catch {
    json = {
      raw: responseText,
    };
  }

  if (!response.ok) {
    throw new FeeQuoteApiError(
      json?.message ||
        `Fee Quote API failed with HTTP ${response.status} ${response.statusText}`,
      {
        status: response.status,
        statusText: response.statusText,
        body: json,
      },
    );
  }

  return json;
};

const loadFeePayloadTools = async (server) => {
  const module = await server.ssrLoadModule(
    "/src/pages/MediaLicense/feeStrategyPayload/index.ts",
  );

  if (typeof module?.buildMediaLicenseFeeStrategyPayload !== "function") {
    throw new Error(
      "Export buildMediaLicenseFeeStrategyPayload not found in feeStrategyPayload/index.ts",
    );
  }

  if (typeof module?.getMediaLicenseFeeStrategyConfig !== "function") {
    throw new Error(
      "Export getMediaLicenseFeeStrategyConfig not found in feeStrategyPayload/index.ts",
    );
  }

  return {
    buildMediaLicenseFeeStrategyPayload:
      module.buildMediaLicenseFeeStrategyPayload,
    getMediaLicenseFeeStrategyConfig: module.getMediaLicenseFeeStrategyConfig,
  };
};

const parseServiceIds = () => {
  const cliServiceIds = process.argv.slice(2)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (cliServiceIds.length > 0) return cliServiceIds;
  return candidateServiceIds;
};

const main = async () => {
  const userInfoPath = path.join(projectRoot, "src", "doc", "UserInfo.json");
  const userInfo = await readJson(userInfoPath);

  globalThis.__RULE_TEST_CONTEXT__ = {
    apiBaseUrl,
    token: userInfo.token,
  };

  const server = await createServer({
    root: projectRoot,
    mode: "development",
    appType: "custom",
    resolve: {
      alias: [
        {
          find: "@/services/services",
          replacement: path.join(projectRoot, "scripts", "stubs", "servicesStub.mjs"),
        },
        {
          find: "@/services/userProfile",
          replacement: path.join(projectRoot, "scripts", "stubs", "userProfileStub.mjs"),
        },
      ],
    },
  });

  try {
    const summary = [];
    const {
      buildMediaLicenseFeeStrategyPayload,
      getMediaLicenseFeeStrategyConfig,
    } = await loadFeePayloadTools(server);

    for (const serviceId of parseServiceIds()) {
      const docDir = path.join(projectRoot, "src", "doc", String(serviceId));
      const resultPath = path.join(docDir, "fee-quote-test.json");

      await ensureDir(docDir);

      const baseConfig = getMediaLicenseFeeStrategyConfig(serviceId);
      if (!baseConfig) {
        const result = {
          serviceId,
          status: "unsupported-service",
          message: "No fee strategy config found for this service.",
        };
        await writeJson(resultPath, result);
        summary.push(result);
        console.log(`[service ${serviceId}] unsupported service`);
        continue;
      }

      const inputSource = await resolveInputSource(serviceId);
      if (!inputSource) {
        const result = {
          serviceId,
          status: "missing-input",
          message: "No src/doc/<serviceId>/<serviceId>mock.json file found for this service.",
        };
        await writeJson(resultPath, result);
        summary.push(result);
        console.log(`[service ${serviceId}] missing input`);
        continue;
      }

      const config = {
        serviceId,
        expectedFeeVersion: `${serviceId}.1.0`,
        kind: baseConfig.kind,
      };

      let requestPayload;
      try {
        requestPayload = await buildMediaLicenseFeeStrategyPayload({
          config,
          formilyList: inputSource.formilyList,
          currentProfileId: "9210",
          userInfo,
        });

        const response = await callFeeQuoteApi(requestPayload, userInfo.token);
        const result = {
          serviceId,
          status: "completed",
          config,
          inputSource: {
            type: inputSource.type,
            path: path.relative(projectRoot, inputSource.path),
          },
          request: requestPayload,
          response,
          summary: {
            isSuccess: response?.isSuccess ?? null,
            totalAmount: response?.data?.totalAmount ?? null,
            currency: response?.data?.currency ?? null,
            message: response?.message ?? "",
          },
        };

        await writeJson(resultPath, result);
        summary.push(result);
        console.log(
          `[service ${serviceId}] completed isSuccess=${String(
            result.summary.isSuccess,
          )} totalAmount=${String(result.summary.totalAmount)}`,
        );
      } catch (error) {
        const result = {
          serviceId,
          status: "failed",
          config,
          inputSource: inputSource
            ? {
                type: inputSource.type,
                path: path.relative(projectRoot, inputSource.path),
              }
            : null,
          ...(typeof requestPayload !== "undefined" ? { request: requestPayload } : {}),
          ...(error instanceof FeeQuoteApiError
            ? {
                response: error.details.body,
                responseMeta: {
                  status: error.details.status,
                  statusText: error.details.statusText,
                },
              }
            : {}),
          error: error instanceof Error ? error.message : String(error),
        };
        await writeJson(resultPath, result);
        summary.push(result);
        console.log(`[service ${serviceId}] failed ${result.error}`);
      }
    }

    await writeJson(path.join(projectRoot, "src", "doc", "feeQuoteTestSummary.json"), {
      generatedAt: new Date().toISOString(),
      services: summary,
    });
  } finally {
    await server.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
