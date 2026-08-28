import type { Connect } from "vite";
import type { Plugin } from "vite";

type ServerResponse = Connect.ServerResponse;

interface ServiceEntryGateMockRecord {
  statusCode: number;
  body: unknown;
}

interface ServiceEntryGateMockRequestBody {
  serviceId?: string | number | null;
  statusCode?: number | null;
  body?: unknown;
}

const DEFAULT_SERVICE_KEY = "*";

const readRequestBody = async (
  req: Connect.IncomingMessage,
): Promise<string> => {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve());
    req.on("error", reject);
  });
  return Buffer.concat(chunks).toString("utf8");
};

const writeJson = (
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(`${JSON.stringify(payload)}\n`);
};

const normalizeServiceKey = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_SERVICE_KEY;
  }
  return String(value).trim();
};

const getServiceIdFromCheckPath = (pathname: string) => {
  const matched = pathname.match(/^\/api\/Service\/([^/]+)\/Check$/i);
  return matched?.[1] ?? null;
};

export function serviceEntryGateMockPlugin(): Plugin {
  const mocks = new Map<string, ServiceEntryGateMockRecord>();

  return {
    name: "service-entry-gate-mock",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(
        async (
          req: Connect.IncomingMessage,
          res: ServerResponse,
          next: Connect.NextFunction,
        ) => {
          const url = new URL(
            req.url || "/",
            "http://localhost:5174",
          );
          const pathname = url.pathname;

          if (pathname === "/__dev/service-entry-gate/mock") {
            if (req.method === "GET") {
              writeJson(res, 200, {
                ok: true,
                mocks: Object.fromEntries(mocks.entries()),
              });
              return;
            }

            if (req.method === "DELETE") {
              const serviceKey = normalizeServiceKey(
                url.searchParams.get("serviceId"),
              );
              if (serviceKey === DEFAULT_SERVICE_KEY) {
                mocks.clear();
              } else {
                mocks.delete(serviceKey);
              }
              writeJson(res, 200, {
                ok: true,
                serviceId: serviceKey,
                cleared: true,
              });
              return;
            }

            if (req.method === "POST") {
              try {
                const rawBody = await readRequestBody(req);
                const parsed = JSON.parse(
                  rawBody || "{}",
                ) as ServiceEntryGateMockRequestBody;
                const serviceKey = normalizeServiceKey(parsed.serviceId);
                const mockRecord: ServiceEntryGateMockRecord = {
                  statusCode: Number(parsed.statusCode ?? 200),
                  body: parsed.body ?? null,
                };
                mocks.set(serviceKey, mockRecord);
                writeJson(res, 200, {
                  ok: true,
                  serviceId: serviceKey,
                  mock: mockRecord,
                });
              } catch (error) {
                writeJson(res, 400, {
                  ok: false,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
              return;
            }
          }

          const serviceId = getServiceIdFromCheckPath(pathname);
          if (!serviceId || req.method !== "GET") {
            next();
            return;
          }

          const mockRecord =
            mocks.get(serviceId) ?? mocks.get(DEFAULT_SERVICE_KEY);
          if (!mockRecord) {
            next();
            return;
          }

          writeJson(res, mockRecord.statusCode, mockRecord.body);
        },
      );
    },
  };
}
