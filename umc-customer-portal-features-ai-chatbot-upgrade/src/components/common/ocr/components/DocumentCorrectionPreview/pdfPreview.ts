import {
  ImageKind,
  OPS,
  type PDFPageProxy,
  type RenderTask,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  DOCUMENT_PREVIEW_HEIGHT,
  DOCUMENT_PREVIEW_WIDTH,
  throwIfAborted,
} from "./imageCorrection";

const MIN_PDF_IMAGE_WIDTH = 300;
const MIN_PDF_IMAGE_HEIGHT = 180;
const MAX_PDF_IMAGE_PIXELS = 16_000_000;
const PDF_OBJECT_TIMEOUT_MS = 5_000;

interface PdfImageData {
  width?: unknown;
  height?: unknown;
  bitmap?: unknown;
  data?: unknown;
  kind?: unknown;
}

type SetRenderTask = (task: RenderTask | null) => void;

function createAbortError() {
  const error = new Error("PDF preview processing was cancelled");
  error.name = "AbortError";
  return error;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function getPositiveInteger(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.round(numberValue)
    : 0;
}

function validateImageDimensions(width: number, height: number) {
  return (
    width >= MIN_PDF_IMAGE_WIDTH &&
    height >= MIN_PDF_IMAGE_HEIGHT &&
    width * height <= MAX_PDF_IMAGE_PIXELS
  );
}

function isImageData(value: unknown): value is ImageData {
  return typeof ImageData !== "undefined" && value instanceof ImageData;
}

function isCanvasImageSource(value: unknown): value is CanvasImageSource {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    (typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap) ||
    (typeof HTMLImageElement !== "undefined" &&
      value instanceof HTMLImageElement) ||
    (typeof HTMLCanvasElement !== "undefined" &&
      value instanceof HTMLCanvasElement) ||
    (typeof SVGImageElement !== "undefined" &&
      value instanceof SVGImageElement) ||
    (typeof HTMLVideoElement !== "undefined" &&
      value instanceof HTMLVideoElement) ||
    (typeof OffscreenCanvas !== "undefined" && value instanceof OffscreenCanvas)
  );
}

function getCanvasImageSourceSize(source: CanvasImageSource) {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }

  if (source instanceof HTMLVideoElement) {
    return {
      width: source.videoWidth || source.width,
      height: source.videoHeight || source.height,
    };
  }

  const sizedSource = source as CanvasImageSource & {
    width?: number;
    height?: number;
  };
  return {
    width: getPositiveInteger(sizedSource.width),
    height: getPositiveInteger(sizedSource.height),
  };
}

function drawCanvasImageSource(
  source: CanvasImageSource,
  declaredWidth?: unknown,
  declaredHeight?: unknown,
) {
  const sourceSize = getCanvasImageSourceSize(source);
  const width = getPositiveInteger(declaredWidth) || sourceSize.width;
  const height = getPositiveInteger(declaredHeight) || sourceSize.height;
  if (!validateImageDimensions(width, height)) {
    return null;
  }

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function drawBinaryImageData(image: PdfImageData) {
  const width = getPositiveInteger(image.width);
  const height = getPositiveInteger(image.height);
  if (!validateImageDimensions(width, height)) {
    return null;
  }

  const source = image.data;
  if (!(source instanceof Uint8Array || source instanceof Uint8ClampedArray)) {
    return null;
  }

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  const imageData = context.createImageData(width, height);
  const destination = imageData.data;
  const pixelCount = width * height;
  const inferredKind =
    source.length >= pixelCount * 4
      ? ImageKind.RGBA_32BPP
      : source.length >= pixelCount * 3
        ? ImageKind.RGB_24BPP
        : image.kind;

  if (inferredKind === ImageKind.RGBA_32BPP) {
    destination.set(source.subarray(0, pixelCount * 4));
  } else if (inferredKind === ImageKind.RGB_24BPP) {
    let sourceIndex = 0;
    let destinationIndex = 0;
    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      destination[destinationIndex] = source[sourceIndex];
      destination[destinationIndex + 1] = source[sourceIndex + 1];
      destination[destinationIndex + 2] = source[sourceIndex + 2];
      destination[destinationIndex + 3] = 255;
      sourceIndex += 3;
      destinationIndex += 4;
    }
  } else if (inferredKind === ImageKind.GRAYSCALE_1BPP) {
    const rowByteLength = Math.ceil(width / 8);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceByte = source[y * rowByteLength + Math.floor(x / 8)] ?? 0;
        const color = sourceByte & (128 >> (x % 8)) ? 255 : 0;
        const destinationIndex = (y * width + x) * 4;
        destination[destinationIndex] = color;
        destination[destinationIndex + 1] = color;
        destination[destinationIndex + 2] = color;
        destination[destinationIndex + 3] = 255;
      }
    }
  } else {
    return null;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function decodePdfImage(value: unknown) {
  if (isImageData(value)) {
    if (!validateImageDimensions(value.width, value.height)) {
      return null;
    }

    const canvas = createCanvas(value.width, value.height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable");
    }
    context.putImageData(value, 0, 0);
    return canvas;
  }

  if (isCanvasImageSource(value)) {
    return drawCanvasImageSource(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const image = value as PdfImageData;
  if (isCanvasImageSource(image.bitmap)) {
    return drawCanvasImageSource(image.bitmap, image.width, image.height);
  }

  return drawBinaryImageData(image);
}

function getPdfObject(
  page: PDFPageProxy,
  objectId: string,
  signal: AbortSignal,
) {
  return new Promise<unknown>((resolve, reject) => {
    throwIfAborted(signal);

    let settled = false;
    let timeoutId: number | undefined;

    const cleanup = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      signal.removeEventListener("abort", handleAbort);
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    const handleAbort = () => {
      finish(() => reject(createAbortError()));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("PDF image object timed out")));
    }, PDF_OBJECT_TIMEOUT_MS);

    try {
      if (page.objs.has(objectId)) {
        finish(() => resolve(page.objs.get(objectId)));
        return;
      }

      page.objs.get(objectId, (value: unknown) => {
        finish(() => resolve(value));
      });
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

async function getOperatorImage(
  page: PDFPageProxy,
  operator: number,
  args: unknown[],
  signal: AbortSignal,
) {
  if (
    operator === OPS.paintInlineImageXObject ||
    operator === OPS.paintInlineImageXObjectGroup
  ) {
    return args[0];
  }

  if (
    operator === OPS.paintImageXObject ||
    operator === OPS.paintImageXObjectRepeat
  ) {
    const objectId = typeof args[0] === "string" ? args[0] : "";
    return objectId ? getPdfObject(page, objectId, signal) : null;
  }

  return null;
}

export async function extractFirstPdfPageImage(
  page: PDFPageProxy,
  signal: AbortSignal,
) {
  const operatorList = await page.getOperatorList();
  throwIfAborted(signal);

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    throwIfAborted(signal);
    const operator = operatorList.fnArray[index];
    if (
      operator !== OPS.paintImageXObject &&
      operator !== OPS.paintInlineImageXObject &&
      operator !== OPS.paintInlineImageXObjectGroup &&
      operator !== OPS.paintImageXObjectRepeat
    ) {
      continue;
    }

    try {
      const args = Array.isArray(operatorList.argsArray[index])
        ? operatorList.argsArray[index]
        : [];
      const image = await getOperatorImage(page, operator, args, signal);
      const canvas = decodePdfImage(image);
      if (canvas) {
        return canvas;
      }
    } catch (error) {
      if ((error as { name?: string } | undefined)?.name === "AbortError") {
        throw error;
      }
      // Continue to the next page-one image when this object cannot be decoded.
    }
  }

  return null;
}

export async function renderPdfFirstPageFallback(
  page: PDFPageProxy,
  signal: AbortSignal,
  setRenderTask: SetRenderTask,
) {
  throwIfAborted(signal);
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = Math.max(
    Math.min(
      DOCUMENT_PREVIEW_WIDTH / unscaledViewport.width,
      DOCUMENT_PREVIEW_HEIGHT / unscaledViewport.height,
    ),
    0.1,
  );
  const viewport = page.getViewport({ scale });
  const pageCanvas = createCanvas(viewport.width, viewport.height);
  const pageContext = pageCanvas.getContext("2d");
  if (!pageContext) {
    throw new Error("Canvas context unavailable");
  }

  const renderTask = page.render({
    canvas: pageCanvas,
    canvasContext: pageContext,
    viewport,
  });
  setRenderTask(renderTask);

  try {
    await renderTask.promise;
    throwIfAborted(signal);
  } finally {
    setRenderTask(null);
  }

  const outputCanvas = createCanvas(
    DOCUMENT_PREVIEW_WIDTH,
    DOCUMENT_PREVIEW_HEIGHT,
  );
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) {
    throw new Error("Canvas context unavailable");
  }

  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputContext.drawImage(
    pageCanvas,
    Math.round((outputCanvas.width - pageCanvas.width) / 2),
    Math.round((outputCanvas.height - pageCanvas.height) / 2),
  );
  return outputCanvas;
}
