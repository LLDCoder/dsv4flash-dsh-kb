import type { CV } from "@techstark/opencv-js";

export type OpenCvInstance = CV;

type OpenCvGlobalValue = OpenCvInstance | PromiseLike<OpenCvInstance>;

const OPENCV_SCRIPT_ID = "umc-opencv-js";
const OPENCV_LOAD_TIMEOUT_MS = 45_000;

const REQUIRED_FUNCTIONS: Array<keyof OpenCvInstance> = [
  "Mat",
  "MatVector",
  "Point",
  "Size",
  "imread",
  "imshow",
  "cvtColor",
  "GaussianBlur",
  "Canny",
  "getStructuringElement",
  "morphologyEx",
  "findContours",
  "contourArea",
  "arcLength",
  "approxPolyDP",
  "isContourConvex",
  "matFromArray",
  "getPerspectiveTransform",
  "warpPerspective",
];

const REQUIRED_CONSTANTS: Array<keyof OpenCvInstance> = [
  "COLOR_RGBA2GRAY",
  "MORPH_RECT",
  "MORPH_CLOSE",
  "RETR_LIST",
  "CHAIN_APPROX_SIMPLE",
  "CV_32FC2",
  "INTER_LINEAR",
  "BORDER_REPLICATE",
];

let openCvPromise: Promise<OpenCvInstance> | null = null;

function getOpenCvGlobal() {
  return (globalThis as typeof globalThis & { cv?: OpenCvGlobalValue }).cv;
}

function getOpenCvAssetUrl() {
  const baseUrl = String(import.meta.env.BASE_URL || "/");
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}assets/opencv.js`;
}

function validateOpenCv(value: OpenCvInstance) {
  const hasAllFunctions = REQUIRED_FUNCTIONS.every(
    (key) => typeof value?.[key] === "function",
  );
  const hasAllConstants = REQUIRED_CONSTANTS.every(
    (key) => typeof value?.[key] === "number",
  );

  if (!hasAllFunctions || !hasAllConstants) {
    throw new Error("Required OpenCV APIs are unavailable");
  }

  return value;
}

async function resolveOpenCvGlobal() {
  const openCvGlobal = getOpenCvGlobal();
  if (!openCvGlobal) {
    throw new Error("OpenCV global is unavailable");
  }

  return validateOpenCv(await Promise.resolve(openCvGlobal));
}

function injectOpenCvScript() {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("OpenCV requires a browser environment"));
  }

  const existingGlobal = getOpenCvGlobal();
  if (existingGlobal) {
    return resolveOpenCvGlobal();
  }

  return new Promise<OpenCvInstance>((resolve, reject) => {
    let script = document.getElementById(
      OPENCV_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    let timeoutId: number | undefined;

    const cleanup = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      void resolveOpenCvGlobal()
        .then((openCv) => {
          cleanup();
          resolve(openCv);
        })
        .catch((error: unknown) => {
          cleanup();
          reject(error);
        });
    };

    const handleError = () => {
      cleanup();
      reject(new Error("OpenCV script failed to load"));
    };

    if (!script) {
      script = document.createElement("script");
      script.id = OPENCV_SCRIPT_ID;
      script.async = true;
      script.src = getOpenCvAssetUrl();
      document.head.appendChild(script);
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    const globalAfterInjection = getOpenCvGlobal();
    if (globalAfterInjection) {
      handleLoad();
      return;
    }

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("OpenCV initialization timed out"));
    }, OPENCV_LOAD_TIMEOUT_MS);
  });
}

export function loadOpenCv() {
  if (!openCvPromise) {
    openCvPromise = injectOpenCvScript().catch((error: unknown) => {
      openCvPromise = null;
      throw error;
    });
  }

  return openCvPromise;
}
