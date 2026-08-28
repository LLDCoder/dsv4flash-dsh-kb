import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import { resolve } from "path";
import { saveFormilyMockPlugin } from "./vite-plugins/saveFormilyMockPlugin";
import { trainingConfirmationMockPlugin } from "./vite-plugins/trainingConfirmationMockPlugin";
import {
  OCR_API_BASE_URL,
  OCR_API_DEV_PROXY_PREFIX,
} from "./src/config/constants";

const require = createRequire(import.meta.url);
const autoprefixer = require("autoprefixer");
const pxtorem = require("postcss-pxtorem");
const pdfWorkerRequestPath = "/assets/pdf.worker.min.js";
const pdfWorkerOutputPath = "assets/pdf.worker.min.js";
const opencvRequestPath = "/assets/opencv.js";
const opencvLicenseRequestPath = "/assets/opencv.LICENSE.txt";
const opencvOutputPath = "assets/opencv.js";
const opencvLicenseOutputPath = "assets/opencv.LICENSE.txt";
const standaloneHtmlRouteRules = [
  {
    pattern: /^\/inspection-declaration\/?$/,
    htmlPath: "/inspection-declaration.html",
  },
  {
    pattern: /^\/training-confirmation\/[^/]+\/?$/,
    htmlPath: "/training-confirmation.html",
  },
];
let pdfWorkerSourceCache: string | undefined;
let opencvSourceCache: Uint8Array | undefined;
let opencvLicenseSourceCache: string | undefined;

const createPxToRemPlugin = Object.assign(
  () =>
    pxtorem({
      rootValue: 16,
      propList: ["*"],
      unitPrecision: 5,
      replace: true,
      mediaQuery: false,
      minPixelValue: 1,
      exclude: /node_modules/i,
    }),
  { postcss: true },
);

function standaloneHtmlRoutePlugin(): PluginOption {
  return {
    name: "standalone-html-routes",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || "/", "http://localhost");

  const rule = standaloneHtmlRouteRules.find(({ pattern }) =>
  pattern.test(url.pathname),
  );

  if (rule) {
  req.url = `${rule.htmlPath}${url.search}`;
  }

        next();
      });
    },
  };
}

const vendorChunkRules: Array<[string, RegExp]> = [
  [
    "vendor-react",
    /\/node_modules\/(?:react|react-dom|scheduler)\//,
  ],
  [
    "vendor-router",
    /\/node_modules\/(?:react-router|react-router-dom|history|path-to-regexp|tiny-warning|tiny-invariant)\//,
  ],
  [
    "vendor-antd",
    /\/node_modules\/(?:antd|@ant-design|rc-[^/]+|@rc-component)\//,
  ],
  ["vendor-i18n", /\/node_modules\/(?:i18next|react-i18next)\//],
  ["vendor-http", /\/node_modules\/axios\//],
  [
    "vendor-state",
    /\/node_modules\/(?:zustand|@reduxjs\/toolkit|redux|immer|reselect|redux-thunk)\//,
  ],
  [
    "vendor-formily-designable",
    /\/node_modules\/(?:@formily|@designable)\//,
  ],
  ["vendor-pdf", /\/node_modules\/pdfjs-dist\//],
  ["vendor-editor", /\/node_modules\/@wangeditor\//],
  ["vendor-xlsx", /\/node_modules\/xlsx\//],
  ["vendor-moment", /\/node_modules\/moment\//],
  ["vendor-lodash", /\/node_modules\/lodash\//],
  ["vendor-signalr", /\/node_modules\/@microsoft\/signalr\//],
  ["vendor-crypto", /\/node_modules\/crypto-js\//],
];

const antdThemeVariablesPath = resolve(
  __dirname,
  "src/styles/variables.less",
).replace(/\\/g, "/");

function manualChunks(id: string) {
  const normalizedId = id.replace(/\\/g, "/");

  if (normalizedId.includes("commonjsHelpers")) {
    return "vendor-runtime";
  }

  if (!normalizedId.includes("/node_modules/")) {
    return undefined;
  }

  const vendorRule = vendorChunkRules.find(([, rule]) => rule.test(normalizedId));

  return vendorRule?.[0];
}

function getPdfWorkerSource() {
  if (!pdfWorkerSourceCache) {
    const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
    pdfWorkerSourceCache = readFileSync(workerPath, "utf8").replace(
      /\n?\/\/# sourceMappingURL=.*(?:\r?\n)?$/u,
      "\n",
    );
  }

  return pdfWorkerSourceCache;
}

function pdfWorkerJsPlugin(): PluginOption {
  return {
    name: "umc-pdf-worker-js",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split("?")[0];

        if (requestPath !== pdfWorkerRequestPath) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(getPdfWorkerSource());
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: pdfWorkerOutputPath,
        source: getPdfWorkerSource(),
      });
    },
  };
}

function getOpenCvSource() {
  if (!opencvSourceCache) {
    opencvSourceCache = readFileSync(
      require.resolve("@techstark/opencv-js/dist/opencv.js"),
    );
  }

  return opencvSourceCache;
}

function getOpenCvLicenseSource() {
  if (!opencvLicenseSourceCache) {
    const packageJsonPath = require.resolve(
      "@techstark/opencv-js/package.json",
    );
    opencvLicenseSourceCache = readFileSync(
      resolve(packageJsonPath, "../LICENSE"),
      "utf8",
    );
  }

  return opencvLicenseSourceCache;
}

function opencvAssetsPlugin(): PluginOption {
  return {
    name: "umc-opencv-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split("?")[0];

        if (requestPath === opencvRequestPath) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.end(getOpenCvSource());
          return;
        }

        if (requestPath === opencvLicenseRequestPath) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.end(getOpenCvLicenseSource());
          return;
        }

        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: opencvOutputPath,
        source: getOpenCvSource(),
      });
      this.emitFile({
        type: "asset",
        fileName: opencvLicenseOutputPath,
        source: getOpenCvLicenseSource(),
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredProxyTarget = env.VITE_API_PROXY_TARGET?.trim();
  const proxyTarget = configuredProxyTarget || env.VITE_API_BASE_URL;
  const customerProxyTarget = env.VITE_LOCAL_CUSTOMER_PROXY_TARGET?.trim();
  const ffAiProxyTarget = env.VITE_FF_AI_PROXY_TARGET?.trim();
  const dshProxyTarget = env.VITE_DSH_PROXY_TARGET?.trim() || (
    command === "serve" ? "http://localhost:8000" : ""
  );
  const configuredDevPort = Number.parseInt(env.VITE_DEV_PORT || "", 10);
  const devPort = Number.isInteger(configuredDevPort) && configuredDevPort > 0
    ? configuredDevPort
    : 5174;
  const trainingConfirmationMockEnabled =
    env.VITE_ENABLE_TRAINING_CONFIRMATION_MOCK === "true";
  const proxyHeaders =
    mode === "daypopdevelopment" || configuredProxyTarget
      ? undefined
      : { Host: "customer.umc.example.com" };
  const buildSourcemap = env.VITE_BUILD_SOURCEMAP === "true";

  return {
    plugins: [
      standaloneHtmlRoutePlugin(),
      ...(command === "serve"
        ? [
            codeInspectorPlugin({
              bundler: "vite",
              behavior: { locate: false, copy: false },
              hideConsole: true,
            }) as PluginOption,
          ]
        : []),
      react(),
      ...(command === "serve"
        ? [
            saveFormilyMockPlugin(),
            ...(trainingConfirmationMockEnabled
              ? [trainingConfirmationMockPlugin()]
              : []),
          ]
        : []),
      pdfWorkerJsPlugin(),
      opencvAssetsPlugin(),
    ],
    server: {
      host: "0.0.0.0",
      port: devPort,
      proxy: {
        ...(dshProxyTarget
          ? {
              "/dsh-api": {
                target: dshProxyTarget,
                changeOrigin: true,
                ws: true,
                rewrite: (path: string) => path.replace(/^\/dsh-api/, ""),
              },
            }
          : {}),
        ...(ffAiProxyTarget
          ? {
              "/api/platform": {
                target: ffAiProxyTarget,
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/api\/platform/, ""),
              },
            }
          : {}),
        ...(customerProxyTarget
          ? {
              "/customer-api": {
                target: customerProxyTarget,
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/customer-api/, ""),
              },
              "/customer-signalr": {
                target: customerProxyTarget,
                changeOrigin: true,
                ws: true,
                rewrite: (path: string) => path.replace(/^\/customer-signalr/, ""),
              },
            }
          : {}),
        ...(OCR_API_BASE_URL
          ? {
              [OCR_API_DEV_PROXY_PREFIX]: {
                target: OCR_API_BASE_URL,
                changeOrigin: true,
                rewrite: (path) =>
                  path.replace(
                    new RegExp(`^${OCR_API_DEV_PROXY_PREFIX}`),
                    "",
                  ),
              },
            }
          : {}),
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          ...(proxyHeaders ? { headers: proxyHeaders } : {}),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              const requestPath = req.url || "";
              const targetUrl = `${proxyTarget}${requestPath}`;
              console.log(
                `[vite proxy] request: ${req.method} ${req.url} -> ${targetUrl}`,
              );
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              const requestPath = req.url || "";
              const targetUrl = `${proxyTarget}${requestPath}`;
              console.log(
                `[vite proxy] response: ${req.method} ${req.url} <- ${proxyRes.statusCode} (${targetUrl})`,
              );
            });
            proxy.on("error", (err, req) => {
              console.error(
                `[vite proxy] error: ${req?.method} ${req?.url}`,
                err,
              );
            });
          },
        },
        "/chatHub": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
          ...(proxyHeaders ? { headers: proxyHeaders } : {}),
        },
      },
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer(),
          createPxToRemPlugin,
        ],
      },
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
           modifyVars: {
            hack: `true; @import (reference) "${antdThemeVariablesPath}";`,
          },
          alias: {
            "~antd": resolve(__dirname, "node_modules/antd"),
            "~": resolve(__dirname, "node_modules"),
          },
        },
      },
    },
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
      alias: {
        "@": resolve(__dirname, "src"),
        react: resolve(__dirname, "node_modules/react"),
        "react-dom": resolve(__dirname, "node_modules/react-dom"),
        "react/jsx-runtime": resolve(__dirname, "node_modules/react/jsx-runtime.js"),
        "react/jsx-dev-runtime": resolve(__dirname, "node_modules/react/jsx-dev-runtime.js"),
        "~antd": resolve(__dirname, "node_modules/antd"),
        "~": resolve(__dirname, "node_modules"),
        "@designable/core": resolve(__dirname, "node_modules/@designable/core"),
        "@designable/shared": resolve(__dirname, "node_modules/@designable/shared"),
        "@designable/react": resolve(__dirname, "node_modules/@designable/react"),
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-google-recaptcha",
        "@formily/react",
        "@formily/core",
        "@formily/antd",
        "@formily/json-schema",
        "@formily/reactive",
        "@formily/reactive-react",
        "@formily/shared",
      ],
      exclude: ["pdfjs-dist", "@designable/shared"],
    },
    build: {
    sourcemap: buildSourcemap,
    rollupOptions: {
      input: {
      main: resolve(__dirname, "index.html"),
      "inspection-declaration": resolve(
        __dirname,
        "inspection-declaration.html",
      ),
      "training-confirmation": resolve(
        __dirname,
        "training-confirmation.html",
      ),
      },
      output: {
      manualChunks,
      },
    },
    },
  };
});
