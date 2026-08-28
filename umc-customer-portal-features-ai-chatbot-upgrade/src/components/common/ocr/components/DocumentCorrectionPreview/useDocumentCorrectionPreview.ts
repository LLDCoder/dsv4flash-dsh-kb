import { useEffect, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { configurePdfWorker } from "@/utils/pdfWorker";
import { resolvePdfPreviewUrl } from "@/utils/pdfPreview";
import type { OcrPreviewFileType } from "../../type";
import {
  canvasToObjectUrl,
  correctDocumentCanvas,
  loadImageCanvas,
  throwIfAborted,
} from "./imageCorrection";
import { loadOpenCv } from "./opencvLoader";
import {
  extractFirstPdfPageImage,
  renderPdfFirstPageFallback,
} from "./pdfPreview";

configurePdfWorker({ GlobalWorkerOptions });

const CORRECTION_LOG_PREFIX = "[DocumentCorrectionPreview]";

type CorrectionFailureReason =
  | "corners-not-found"
  | "opencv-load-failed"
  | "opencv-processing-failed";

interface UseDocumentCorrectionPreviewOptions {
  fileUrl: string;
  fileType: OcrPreviewFileType;
  fallbackPreviewImage: string;
}

function isAbortError(error: unknown) {
  return (error as { name?: string } | undefined)?.name === "AbortError";
}

function getErrorName(error: unknown) {
  if (error instanceof Error && error.name) {
    return error.name;
  }

  return typeof error;
}

export function useDocumentCorrectionPreview({
  fileUrl,
  fileType,
  fallbackPreviewImage,
}: UseDocumentCorrectionPreviewOptions) {
  const [previewUrl, setPreviewUrl] = useState(() =>
    fileType === "image" && fileUrl ? fileUrl : fallbackPreviewImage,
  );
  const [previewErrorFallbackUrl, setPreviewErrorFallbackUrl] = useState(
    fallbackPreviewImage,
  );
  const [isProcessing, setIsProcessing] = useState(
    () => fileType === "image" || fileType === "pdf",
  );

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const createdObjectUrls = new Set<string>();
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let pdfDocument: PDFDocumentProxy | null = null;
    let renderTask: RenderTask | null = null;
    const reportedCorrectionFailures = new Set<CorrectionFailureReason>();

    const isCurrent = () => !cancelled && !signal.aborted;

    const updatePreviewUrl = (
      nextPreviewUrl: string,
      errorFallbackUrl = fallbackPreviewImage,
    ) => {
      if (isCurrent()) {
        setPreviewUrl(nextPreviewUrl || fallbackPreviewImage);
        setPreviewErrorFallbackUrl(errorFallbackUrl);
      }
    };

    const createManagedObjectUrl = async (canvas: HTMLCanvasElement) => {
      const objectUrl = await canvasToObjectUrl(canvas, signal);
      if (!isCurrent()) {
        URL.revokeObjectURL(objectUrl);
        throwIfAborted(signal);
      }
      createdObjectUrls.add(objectUrl);
      return objectUrl;
    };

    const reportCorrectionFailure = (
      reason: CorrectionFailureReason,
      error?: unknown,
    ) => {
      if (!isCurrent() || reportedCorrectionFailures.has(reason)) {
        return;
      }

      reportedCorrectionFailures.add(reason);
      const details = {
        reason,
        fileType,
        fallback: "original-preview",
        ...(error === undefined ? {} : { errorName: getErrorName(error) }),
      };

      if (reason === "corners-not-found") {
        console.warn(CORRECTION_LOG_PREFIX, details);
        return;
      }

      console.error(CORRECTION_LOG_PREFIX, details);
    };

    const applyDocumentCorrection = async (
      sourceCanvas: HTMLCanvasElement,
      originalPreviewUrl: string,
    ) => {
      let openCv: Awaited<ReturnType<typeof loadOpenCv>>;

      try {
        openCv = await loadOpenCv();
      } catch (error) {
        if (!isCurrent()) {
          throwIfAborted(signal);
          return;
        }

        reportCorrectionFailure("opencv-load-failed", error);
        return;
      }

      throwIfAborted(signal);

      let correctionResult: ReturnType<typeof correctDocumentCanvas>;
      try {
        correctionResult = correctDocumentCanvas(sourceCanvas, openCv);
      } catch (error) {
        reportCorrectionFailure("opencv-processing-failed", error);
        return;
      }

      if (correctionResult.status === "corners-not-found") {
        reportCorrectionFailure("corners-not-found");
        return;
      }

      try {
        updatePreviewUrl(
          await createManagedObjectUrl(correctionResult.canvas),
          originalPreviewUrl,
        );
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
      }
    };

    const processImage = async () => {
      updatePreviewUrl(fileUrl || fallbackPreviewImage);
      if (!fileUrl) {
        return;
      }

      try {
        const sourceCanvas = await loadImageCanvas(fileUrl, signal);
        await applyDocumentCorrection(
          sourceCanvas,
          fileUrl || fallbackPreviewImage,
        );
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        // Keep the original image when OpenCV or canvas processing fails.
      }
    };

    const processPdf = async () => {
      const pdfUrl = resolvePdfPreviewUrl(fileUrl);
      if (!pdfUrl) {
        updatePreviewUrl(fallbackPreviewImage);
        return;
      }

      loadingTask = getDocument(pdfUrl);
      pdfDocument = await loadingTask.promise;
      throwIfAborted(signal);
      const firstPage = await pdfDocument.getPage(1);
      throwIfAborted(signal);

      let extractedImage: HTMLCanvasElement | null = null;
      try {
        extractedImage = await extractFirstPdfPageImage(firstPage, signal);
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        extractedImage = null;
      }

      if (extractedImage) {
        const originalObjectUrl = await createManagedObjectUrl(extractedImage);
        updatePreviewUrl(originalObjectUrl);
        await applyDocumentCorrection(extractedImage, originalObjectUrl);
        return;
      }

      const pageCanvas = await renderPdfFirstPageFallback(
        firstPage,
        signal,
        (task) => {
          renderTask = task;
        },
      );
      updatePreviewUrl(await createManagedObjectUrl(pageCanvas));
    };

    const processPreview = async () => {
      setIsProcessing(fileType === "image" || fileType === "pdf");

      if (fileType === "image") {
        await processImage();
      } else if (fileType === "pdf") {
        setPreviewUrl("");
        await processPdf();
      } else {
        updatePreviewUrl(fallbackPreviewImage);
      }
    };

    void processPreview()
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          updatePreviewUrl(fallbackPreviewImage);
        }
      })
      .finally(() => {
        if (isCurrent()) {
          setIsProcessing(false);
        }
      });

    return () => {
      cancelled = true;
      abortController.abort();
      renderTask?.cancel();

      if (pdfDocument) {
        void pdfDocument.destroy().catch(() => undefined);
      } else {
        void loadingTask?.destroy().catch(() => undefined);
      }

      createdObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [fallbackPreviewImage, fileType, fileUrl]);

  return {
    previewUrl,
    previewErrorFallbackUrl,
    isProcessing,
  };
}
