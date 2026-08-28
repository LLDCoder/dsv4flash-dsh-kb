import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const [modulePath] = process.argv.slice(2);
const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
const commonStub = fileURLToPath(new URL("./stubs/common.ts", import.meta.url));
const antdStub = fileURLToPath(new URL("./stubs/antd.tsx", import.meta.url));

assert(modulePath?.startsWith("/scripts/"), "Pass a verifier path below /scripts/.");

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "error",
  optimizeDeps: { noDiscovery: true },
  resolve: {
    alias: [
      { find: "antd", replacement: antdStub },
      { find: "@/components/common", replacement: commonStub },
      { find: "@", replacement: sourceRoot },
    ],
  },
  server: { hmr: false, middlewareMode: true, ws: false },
});

try {
  await server.ssrLoadModule(modulePath);
} catch (error) {
  console.error(error);
  void server.close();
  process.exit(1);
}

void server.close();
process.exit(0);
