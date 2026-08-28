import fs from "node:fs/promises";
import path from "node:path";
import type { Connect } from "vite";
import type { Plugin } from "vite";

/**
 * Dev-only: POST /__dev/save-formily-mock
 * Body: { serviceCode: number, payload: unknown[] }
 * Writes src/pages/MediaLicense/mockData/{serviceCode}mock.json
 */
export function saveFormilyMockPlugin(): Plugin {
  return {
    name: "save-formily-mock",
    configureServer(server) {
      server.middlewares.use(
        (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const pathname = req.url?.split("?")[0] ?? "";
          if (pathname !== "/__dev/save-formily-mock" || req.method !== "POST") {
            next();
            return;
          }

          const chunks: Buffer[] = [];
          req.on("data", (c: Buffer) => chunks.push(c));
          req.on("end", async () => {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            try {
              const raw = Buffer.concat(chunks).toString("utf8");
              const parsed = JSON.parse(raw) as {
                serviceCode?: unknown;
                payload?: unknown;
              };
              const code = parsed.serviceCode;
              const payload = parsed.payload;
              if (code === undefined || code === null || payload === undefined) {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: "serviceCode and payload are required",
                  }),
                );
                return;
              }

              const codeStr = String(code).trim();
              if (!/^\d+$/.test(codeStr)) {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: "serviceCode must be a numeric string or number",
                  }),
                );
                return;
              }

              const filename = `${codeStr}mock.json`;
              const dir = path.resolve(
                process.cwd(),
                "src/pages/MediaLicense/mockData",
              );
              await fs.mkdir(dir, { recursive: true });
              const fullPath = path.join(dir, filename);
              await fs.writeFile(
                fullPath,
                `${JSON.stringify(payload, null, 4)}\n`,
                "utf8",
              );
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  ok: true,
                  filename,
                  fullPath,
                }),
              );
            } catch (e) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  ok: false,
                  error: e instanceof Error ? e.message : String(e),
                }),
              );
            }
          });
        },
      );
    },
  };
}

type ServerResponse = Connect.ServerResponse;
