import type { OpenCvInstance } from "./opencvLoader";

const MAX_PROCESSING_EDGE = 1280;
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 700;
const MIN_DOCUMENT_AREA_RATIO = 0.15;
const MAX_DOCUMENT_AREA_RATIO = 0.95;
const POLYGON_APPROXIMATION_RATIO = 0.02;
const CANNY_LOW_THRESHOLD = 50;
const CANNY_HIGH_THRESHOLD = 150;
const FALLBACK_CANNY_LOW_THRESHOLD = 30;
const FALLBACK_CANNY_HIGH_THRESHOLD = 100;
const MORPHOLOGY_KERNEL_SIZE = 3;
const MORPHOLOGY_ITERATIONS = 2;

interface Point {
  x: number;
  y: number;
}

interface DeletableOpenCvObject {
  delete: () => unknown;
}

export type DocumentCorrectionResult =
  | {
      status: "corrected";
      canvas: HTMLCanvasElement;
    }
  | {
      status: "corners-not-found";
    };

function createAbortError() {
  const error = new Error("Preview processing was cancelled");
  error.name = "AbortError";
  return error;
}

export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw createAbortError();
  }
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function isCrossOriginUrl(url: string) {
  if (!/^https?:\/\//i.test(url) || typeof window === "undefined") {
    return false;
  }

  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function loadImageCanvas(url: string, signal: AbortSignal) {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    if (!url) {
      reject(new Error("Preview image URL is unavailable"));
      return;
    }

    throwIfAborted(signal);

    const image = new Image();
    if (isCrossOriginUrl(url)) {
      image.crossOrigin = "anonymous";
    }

    const cleanup = () => {
      signal.removeEventListener("abort", handleAbort);
      image.onload = null;
      image.onerror = null;
    };

    const handleAbort = () => {
      cleanup();
      image.src = "";
      reject(createAbortError());
    };

    image.onload = () => {
      try {
        throwIfAborted(signal);
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) {
          throw new Error("Preview image has invalid dimensions");
        }

        const scale = Math.min(1, MAX_PROCESSING_EDGE / Math.max(width, height));
        const canvas = createCanvas(width * scale, height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Canvas context unavailable");
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        cleanup();
        resolve(canvas);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("Preview image failed to load"));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    image.src = url;
  });
}

export function canvasToObjectUrl(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
) {
  return new Promise<string>((resolve, reject) => {
    throwIfAborted(signal);

    canvas.toBlob(
      (blob) => {
        if (signal.aborted) {
          reject(createAbortError());
          return;
        }
        if (!blob) {
          reject(new Error("Preview canvas could not be encoded"));
          return;
        }

        resolve(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function createProcessingCanvas(source: HTMLCanvasElement) {
  const longestEdge = Math.max(source.width, source.height);
  if (longestEdge <= MAX_PROCESSING_EDGE) {
    return source;
  }

  const scale = MAX_PROCESSING_EDGE / longestEdge;
  const canvas = createCanvas(source.width * scale, source.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function getUniqueOrderedCorners(points: Point[]) {
  if (points.length !== 4) {
    return null;
  }

  const topLeft = points.reduce((current, point) =>
    point.x + point.y < current.x + current.y ? point : current,
  );
  const bottomRight = points.reduce((current, point) =>
    point.x + point.y > current.x + current.y ? point : current,
  );
  const topRight = points.reduce((current, point) =>
    point.x - point.y > current.x - current.y ? point : current,
  );
  const bottomLeft = points.reduce((current, point) =>
    point.x - point.y < current.x - current.y ? point : current,
  );
  const ordered = [topLeft, topRight, bottomRight, bottomLeft];
  const uniquePointCount = new Set(
    ordered.map((point) => `${point.x}:${point.y}`),
  ).size;

  return uniquePointCount === 4 ? ordered : null;
}

function deleteOpenCvObject(value?: DeletableOpenCvObject | null) {
  try {
    value?.delete();
  } catch {
    // OpenCV cleanup must never interrupt the OCR flow.
  }
}

function findDocumentCorners(
  cv: OpenCvInstance,
  edges: InstanceType<OpenCvInstance["Mat"]>,
  imageArea: number,
) {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let bestArea = 0;
  let bestCorners: Point[] | null = null;

  try {
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE,
    );

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const approximation = new cv.Mat();

      try {
        const area = Math.abs(cv.contourArea(contour));
        const areaRatio = imageArea > 0 ? area / imageArea : 0;
        if (
          area <= bestArea ||
          areaRatio < MIN_DOCUMENT_AREA_RATIO ||
          areaRatio > MAX_DOCUMENT_AREA_RATIO
        ) {
          continue;
        }

        const perimeter = cv.arcLength(contour, true);
        cv.approxPolyDP(
          contour,
          approximation,
          perimeter * POLYGON_APPROXIMATION_RATIO,
          true,
        );

        if (approximation.rows !== 4 || !cv.isContourConvex(approximation)) {
          continue;
        }

        const coordinates = Array.from(approximation.data32S);
        if (coordinates.length < 8) {
          continue;
        }

        const orderedCorners = getUniqueOrderedCorners([
          { x: coordinates[0], y: coordinates[1] },
          { x: coordinates[2], y: coordinates[3] },
          { x: coordinates[4], y: coordinates[5] },
          { x: coordinates[6], y: coordinates[7] },
        ]);

        if (orderedCorners) {
          bestArea = area;
          bestCorners = orderedCorners;
        }
      } finally {
        deleteOpenCvObject(approximation);
        deleteOpenCvObject(contour);
      }
    }

    return bestCorners;
  } finally {
    deleteOpenCvObject(hierarchy);
    deleteOpenCvObject(contours);
  }
}

export function correctDocumentCanvas(
  inputCanvas: HTMLCanvasElement,
  cv: OpenCvInstance,
): DocumentCorrectionResult {
  if (!inputCanvas.width || !inputCanvas.height) {
    throw new Error("Document preview has invalid dimensions");
  }

  const processingCanvas = createProcessingCanvas(inputCanvas);
  const source = cv.imread(processingCanvas);
  const grayscale = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  let fallbackEdges: InstanceType<OpenCvInstance["Mat"]> | null = null;
  let connectedEdges: InstanceType<OpenCvInstance["Mat"]> | null = null;
  let morphologyKernel: InstanceType<OpenCvInstance["Mat"]> | null = null;
  let sourcePoints: InstanceType<OpenCvInstance["Mat"]> | null = null;
  let destinationPoints: InstanceType<OpenCvInstance["Mat"]> | null = null;
  let transform: InstanceType<OpenCvInstance["Mat"]> | null = null;
  let corrected: InstanceType<OpenCvInstance["Mat"]> | null = null;

  try {
    cv.cvtColor(source, grayscale, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(grayscale, blurred, new cv.Size(5, 5), 0, 0);
    cv.Canny(
      blurred,
      edges,
      CANNY_LOW_THRESHOLD,
      CANNY_HIGH_THRESHOLD,
      3,
      false,
    );

    let corners = findDocumentCorners(
      cv,
      edges,
      processingCanvas.width * processingCanvas.height,
    );

    if (!corners) {
      fallbackEdges = new cv.Mat();
      connectedEdges = new cv.Mat();
      morphologyKernel = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(MORPHOLOGY_KERNEL_SIZE, MORPHOLOGY_KERNEL_SIZE),
      );
      cv.Canny(
        blurred,
        fallbackEdges,
        FALLBACK_CANNY_LOW_THRESHOLD,
        FALLBACK_CANNY_HIGH_THRESHOLD,
        3,
        false,
      );
      cv.morphologyEx(
        fallbackEdges,
        connectedEdges,
        cv.MORPH_CLOSE,
        morphologyKernel,
        new cv.Point(-1, -1),
        MORPHOLOGY_ITERATIONS,
      );
      corners = findDocumentCorners(
        cv,
        connectedEdges,
        processingCanvas.width * processingCanvas.height,
      );
    }

    if (!corners) {
      return { status: "corners-not-found" };
    }

    sourcePoints = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      corners.flatMap((point) => [point.x, point.y]),
    );
    destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      TARGET_WIDTH - 1,
      0,
      TARGET_WIDTH - 1,
      TARGET_HEIGHT - 1,
      0,
      TARGET_HEIGHT - 1,
    ]);
    transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);
    corrected = new cv.Mat();
    cv.warpPerspective(
      source,
      corrected,
      transform,
      new cv.Size(TARGET_WIDTH, TARGET_HEIGHT),
      cv.INTER_LINEAR,
      cv.BORDER_REPLICATE,
    );

    const outputCanvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
    cv.imshow(outputCanvas, corrected);
    return {
      status: "corrected",
      canvas: outputCanvas,
    };
  } finally {
    deleteOpenCvObject(corrected);
    deleteOpenCvObject(transform);
    deleteOpenCvObject(destinationPoints);
    deleteOpenCvObject(sourcePoints);
    deleteOpenCvObject(morphologyKernel);
    deleteOpenCvObject(connectedEdges);
    deleteOpenCvObject(fallbackEdges);
    deleteOpenCvObject(edges);
    deleteOpenCvObject(blurred);
    deleteOpenCvObject(grayscale);
    deleteOpenCvObject(source);
  }
}

export const DOCUMENT_PREVIEW_WIDTH = TARGET_WIDTH;
export const DOCUMENT_PREVIEW_HEIGHT = TARGET_HEIGHT;
