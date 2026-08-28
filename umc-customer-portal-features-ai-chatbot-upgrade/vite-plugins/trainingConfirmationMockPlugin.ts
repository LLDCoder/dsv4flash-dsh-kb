import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Connect, Plugin } from "vite";

type ServerResponse = Connect.ServerResponse;

const API_PATH_RE =
  /^\/api\/public\/training-confirmation\/([^/]+)(\/confirm)?$/i;
const VIDEO_PATH = "/training-confirmation-mock-video.mp4";

const writeJson = (
  res: ServerResponse,
  data: Record<string, unknown>,
  statusCode = 200,
) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
};

const getData = (token: string, language: string) => {
  const isArabic = language.toLowerCase().startsWith("ar");
  const serviceNameEn = isArabic
    ? "تصريح الأفراد الزائرين لتقديم محتوى إعلاني أو إعلامي في وسائل التواصل الاجتماعي"
    : "Permit for Visiting Individuals to Provide Advertising or Media Content on Social Media";
  const base = {
    applicationNumber: "NMA-2025-INV-04872",
    recipientName: "Sara Al Mansoori",
    recipientEmail: "sara.almansoori@example.com",
    serviceNameEn,
    serviceNameAr:
      "تصريح الأفراد الزائرين لتقديم محتوى إعلاني أو إعلامي في وسائل التواصل الاجتماعي",
    trainingVideoUrl: VIDEO_PATH,
    confirmedOn: null,
  };

  if (token === "mock-completed") {
    return {
      ...base,
      status: "Completed",
      confirmedOn: "2026-08-21T14:30:12",
    };
  }
  if (token === "mock-expired") {
    return { ...base, status: "Expired", trainingVideoUrl: null };
  }
  if (token === "mock-cancelled") {
    return { ...base, status: "Cancelled", trainingVideoUrl: null };
  }
  if (token === "mock-not-found") {
    return {
      status: "NotFound",
      applicationNumber: null,
      recipientName: null,
      recipientEmail: null,
      serviceNameEn: null,
      serviceNameAr: null,
      trainingVideoUrl: null,
      confirmedOn: null,
    };
  }
  if (token === "mock-video-missing") {
    return { ...base, status: "Pending", trainingVideoUrl: null };
  }
  if (token === "mock-null-name") {
    return { ...base, status: "Pending", recipientName: null };
  }
  if (token === "mock-invalid-payload") {
    return { ...base, status: "Pending", recipientEmail: null };
  }

  return { ...base, status: "Pending" };
};

export function trainingConfirmationMockPlugin(): Plugin {
  const video = readFileSync(
    resolve(process.cwd(), "vite-plugins/fixtures/training-confirmation.mp4"),
  );
  const videoRefreshRequests = new Map<string, number>();

  return {
    name: "training-confirmation-mock",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");

        if (url.pathname === VIDEO_PATH) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader("Content-Length", String(video.length));
          res.setHeader("Cache-Control", "no-store");
          res.end(video);
          return;
        }

        const match = url.pathname.match(API_PATH_RE);
        if (!match) {
          next();
          return;
        }

        const token = match[1] || "";
        if (!token.startsWith("mock-")) {
          next();
          return;
        }

        if (token === "mock-get-error" && req.method === "GET") {
          writeJson(
            res,
            {
              isSuccess: false,
              statusCode: 500,
              message: "Mock load failure",
              data: null,
            },
            500,
          );
          return;
        }

        const language = String(
          req.headers.language || req.headers["accept-language"] || "en",
        );

        if (!match[2] && req.method === "GET") {
          const data = getData(token, language);
          if (token === "mock-video-refresh") {
            const requestCount = (videoRefreshRequests.get(token) || 0) + 1;
            if (requestCount === 1) {
              videoRefreshRequests.set(token, requestCount);
              data.trainingVideoUrl =
                "/training-confirmation-missing-video.mp4";
            } else {
              videoRefreshRequests.delete(token);
              data.trainingVideoUrl = VIDEO_PATH;
            }
          }

          writeJson(res, {
            isSuccess: true,
            statusCode: 200,
            message: "Request successful",
            data,
          });
          return;
        }

        if (match[2] && req.method === "POST") {
          if (token === "mock-confirm-error") {
            writeJson(
              res,
              {
                isSuccess: false,
                statusCode: 500,
                message: "Mock confirmation failure",
                data: null,
              },
              500,
            );
            return;
          }

          writeJson(res, {
            isSuccess: true,
            statusCode: 200,
            message: "Request successful",
            data: {
              ...getData(token, language),
              status: "Completed",
              confirmedOn: "2026-08-21T14:30:12",
            },
          });
          return;
        }

        next();
      });
    },
  };
}
