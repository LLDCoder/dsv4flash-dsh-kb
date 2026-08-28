import request from "@/utils/request";
import type { RequestConfig } from "@/utils/request";
import downloadBlobFile from "@/utils/downloadBlobFile";

export type InspectionReportFile = {
  fileName: string;
  fileUrl: string;
};

const isDirectDownloadUrl = (value: string) =>
  /^(https?:)?\/\//i.test(value) ||
  value.startsWith("data:") ||
  value.startsWith("blob:");

const triggerAnchorDownload = (fileUrl: string, fileName: string) => {
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

/**
 * Downloads an inspection attachment. Absolute/data/blob URLs are downloaded by
 * the browser directly; API paths go through the shared request wrapper so the
 * response blob is saved with the original file name.
 */
export const downloadInspectionReportFile = async (
  file: InspectionReportFile,
  requestConfig: Pick<
    RequestConfig,
    "skipAuth" | "skipErrorToast" | "skipUnauthorizedRedirect"
  > = {},
) => {
  const fileUrl = String(file.fileUrl ?? "").trim();
  const fileName = String(file.fileName ?? "").trim() || "attachment";

  if (!fileUrl) {
    throw new Error("Inspection report file url is missing.");
  }

  if (isDirectDownloadUrl(fileUrl)) {
    triggerAnchorDownload(fileUrl, fileName);
    return;
  }

  const blob = await request.get<Blob, Blob>(
    fileUrl,
    {},
    { responseType: "blob", skipErrorToast: true, ...requestConfig },
  );

  downloadBlobFile(blob, fileName);
};
