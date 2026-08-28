const PDF_WORKER_FILE = "assets/pdf.worker.min.js";

type PdfJsLike = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
};

function joinBaseUrl(baseUrl: string, filePath: string) {
  return `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}${filePath}`;
}

export const pdfWorkerSrc = joinBaseUrl(
  import.meta.env.BASE_URL,
  PDF_WORKER_FILE,
);

export function configurePdfWorker(pdfjs: PdfJsLike) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}
