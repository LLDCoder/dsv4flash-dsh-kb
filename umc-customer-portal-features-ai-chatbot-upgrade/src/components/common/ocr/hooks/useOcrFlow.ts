import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import CustomMessage from "@/components/common/CustomMessage";
import { isPdfFile } from "@/utils/pdfPreview";
import {
  fileUpload,
  getDocumentUploadResponseUrl,
  ocrExtractByObjectName,
} from "@/services/media";
import {
  OCR_CAPTURE_SOURCE,
  OCR_STEP,
  OCR_USE_REAL_CAMERA,
} from "../constants";
import {
  buildOcrResolvedResult,
  getOcrExampleImage,
  OCR_DOCUMENT_CONFIG,
} from "../data";
import { OCR_MOCK_CAPTURE_RESULT } from "../mock";
import type {
  OcrCaptureSource,
  OcrDocumentType,
  OcrErrorType,
  OcrPreviewFileType,
  OcrResolvedResult,
  OcrStep,
} from "../type";

interface UseOcrFlowOptions {
  visible: boolean;
  documentType: OcrDocumentType;
}

interface UseOcrFlowResult {
  step: OcrStep;
  result: OcrResolvedResult | null;
  previewUrl: string;
  capturedPreviewUrl: string;
  previewFileName: string;
  previewFileType: OcrPreviewFileType;
  captureSource: OcrCaptureSource | null;
  pendingSource: OcrCaptureSource | null;
  errorType: OcrErrorType | null;
  uploadAccept: string;
  videoRef: RefObject<HTMLVideoElement>;
  frameVideoRef: RefObject<HTMLVideoElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  isStartingCamera: boolean;
  isCapturing: boolean;
  isUploading: boolean;
  isRecognizing: boolean;
  isBusy: boolean;
  startCamera: () => Promise<void>;
  capturePhoto: () => Promise<void>;
  triggerChooseImage: () => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  resetToEntry: () => void;
  retryCurrentSource: () => void;
}

const CAMERA_CAPTURE_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const CAMERA_CAPTURE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

const getErrorMessage = (_error: unknown, fallbackMessage: string) =>
  fallbackMessage;

const getFileExtension = (fileName: string) => {
  const parts = fileName.split(".");
  if (parts.length < 2) {
    return "";
  }

  return `.${parts[parts.length - 1].toLowerCase()}`;
};

const matchesAcceptedFile = (
  file: File,
  allowedMimeTypes: string[],
  allowedExtensions: string[],
) => {
  const fileType = String(file.type ?? "").toLowerCase();
  const fileExtension = getFileExtension(file.name);

  return (
    allowedMimeTypes.includes(fileType) || allowedExtensions.includes(fileExtension)
  );
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Canvas blob unavailable"));
    }, "image/png");
  });

const loadMockCaptureFile = async (
  documentType: OcrDocumentType,
) => {
  const mockCaptureConfig = OCR_MOCK_CAPTURE_RESULT[documentType];
  const response = await fetch(getOcrExampleImage(documentType));
  if (!response.ok) {
    throw new Error("Mock preview unavailable");
  }

  const blob = await response.blob();
  const fileType = blob.type || "image/png";

  return new File([blob], mockCaptureConfig.fileName, {
    type: fileType,
  });
};

export function useOcrFlow({
  visible,
  documentType,
}: UseOcrFlowOptions): UseOcrFlowResult {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string>("");
  const isMountedRef = useRef(true);
  const requestVersionRef = useRef(0);
  const captureAttemptRef = useRef(0);
  const latestVisibleRef = useRef(visible);

  const documentConfig = OCR_DOCUMENT_CONFIG[documentType];

  const [step, setStep] = useState<OcrStep>(OCR_STEP.ENTRY);
  const [result, setResult] = useState<OcrResolvedResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState("");
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewFileType, setPreviewFileType] =
    useState<OcrPreviewFileType>("unknown");
  const [captureSource, setCaptureSource] = useState<OcrCaptureSource | null>(
    null,
  );
  const [pendingSource, setPendingSource] = useState<OcrCaptureSource | null>(
    null,
  );
  const [errorType, setErrorType] = useState<OcrErrorType | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const isBusy =
    isStartingCamera || isCapturing || isUploading || isRecognizing;

  const invalidatePendingRequests = useCallback(() => {
    requestVersionRef.current += 1;
    return requestVersionRef.current;
  }, []);

  const isRequestCurrent = useCallback(
    (requestVersion: number) =>
      isMountedRef.current &&
      latestVisibleRef.current &&
      requestVersionRef.current === requestVersion,
    [],
  );

  const invalidateCaptureAttempt = useCallback(() => {
    captureAttemptRef.current += 1;
    return captureAttemptRef.current;
  }, []);

  const isCaptureAttemptCurrent = useCallback(
    (captureAttempt: number) =>
      isMountedRef.current && captureAttemptRef.current === captureAttempt,
    [],
  );

  const stopStream = useCallback(() => {
    if (!streamRef.current) {
      return;
    }

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (frameVideoRef.current) {
      frameVideoRef.current.srcObject = null;
    }
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (!objectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
  }, []);

  const clearPreview = useCallback(() => {
    revokeObjectUrl();
    setPreviewUrl("");
    setPreviewFileName("");
    setPreviewFileType("unknown");
  }, [revokeObjectUrl]);

  const cleanupResources = useCallback(() => {
    invalidatePendingRequests();
    stopStream();
    revokeObjectUrl();
  }, [invalidatePendingRequests, revokeObjectUrl, stopStream]);

  const resetState = useCallback(() => {
    invalidatePendingRequests();
    invalidateCaptureAttempt();
    stopStream();
    clearPreview();
    setCapturedPreviewUrl("");
    setStep(OCR_STEP.ENTRY);
    setResult(null);
    setCaptureSource(null);
    setPendingSource(null);
    setErrorType(null);
    setIsStartingCamera(false);
    setIsCapturing(false);
    setIsUploading(false);
    setIsRecognizing(false);
  }, [
    clearPreview,
    invalidateCaptureAttempt,
    invalidatePendingRequests,
    stopStream,
  ]);

  useEffect(() => {
    latestVisibleRef.current = visible;

    if (!visible) {
      resetState();
    }
  }, [resetState, visible]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupResources();
    };
  }, [cleanupResources]);

  const attachVideoStream = useCallback(async (stream: MediaStream) => {
    const videoElements = [videoRef.current, frameVideoRef.current].filter(
      (element): element is HTMLVideoElement => !!element,
    );

    if (
      !isMountedRef.current ||
      !latestVisibleRef.current ||
      videoElements.length === 0 ||
      stream.getTracks().length === 0
    ) {
      return;
    }

    await Promise.all(
      videoElements.map(async (videoElement) => {
        if (videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
        }

        try {
          await videoElement.play();
        } catch {
          // Ignore autoplay rejection; the user can still interact with the video element.
        }
      }),
    );
  }, []);

  useEffect(() => {
    if (
      !visible ||
      step !== OCR_STEP.SCAN ||
      !streamRef.current
    ) {
      return;
    }

    // The scan step mounts the video node after the camera request starts.
    // Re-attach the active stream once the scan scene has rendered.
    void attachVideoStream(streamRef.current);
  }, [attachVideoStream, step, visible]);

  const showErrorStep = useCallback(
    (nextErrorType: OcrErrorType) => {
      invalidatePendingRequests();
      invalidateCaptureAttempt();
      stopStream();
      clearPreview();
      setCapturedPreviewUrl("");
      setResult(null);
      setCaptureSource(null);
      setPendingSource(null);
      setErrorType(nextErrorType);
      setStep(OCR_STEP.ERROR);
      setIsStartingCamera(false);
      setIsCapturing(false);
      setIsUploading(false);
      setIsRecognizing(false);
    },
    [
      clearPreview,
      invalidateCaptureAttempt,
      invalidatePendingRequests,
      stopStream,
    ],
  );

  const uploadSourceFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("files", file);

    try {
      const uploadResponse = await fileUpload(formData);
      return getDocumentUploadResponseUrl(uploadResponse);
    } catch {
      return null;
    }
  }, []);

  const processSelectedFile = useCallback(
    async (
      file: File,
      source: OcrCaptureSource,
      options?: {
        previewUrl?: string;
        previewFileType?: OcrPreviewFileType;
        mockRecognitionResponse?: ReturnType<
          typeof buildOcrResolvedResult
        >["response"];
      },
    ) => {
      const requestVersion = invalidatePendingRequests();
      const isManualUpload = source === OCR_CAPTURE_SOURCE.UPLOAD;
      const allowedMimeTypes = isManualUpload
        ? documentConfig.uploadMimeTypes
        : CAMERA_CAPTURE_MIME_TYPES;
      const allowedExtensions = isManualUpload
        ? documentConfig.uploadExtensions
        : CAMERA_CAPTURE_EXTENSIONS;

      if (!matchesAcceptedFile(file, allowedMimeTypes, allowedExtensions)) {
        CustomMessage.error(t(documentConfig.invalidFileTypeMessageKey));
        return false;
      }

      if (file.size / 1024 / 1024 > documentConfig.maxFileSizeMb) {
        CustomMessage.error(
          t("individualIdentity.validation.fileSizeLessThan5Mb"),
        );
        return false;
      }

      if (isManualUpload) {
        stopStream();
      }

      setPendingSource(source);
      setErrorType(null);
      setIsUploading(true);
      setIsRecognizing(false);

      const uploadedObjectName = await uploadSourceFile(file);
      if (!isRequestCurrent(requestVersion)) {
        return false;
      }

      setIsUploading(false);

      if (uploadedObjectName === null) {
        setPendingSource(null);
        return false;
      }

      if (!uploadedObjectName) {
        CustomMessage.error(t("ocr.errors.uploadFailed"));
        setPendingSource(null);
        return false;
      }

      let recognitionResult = null;
      // Keep the existing env semantics: in OCR flow this flag also controls
      // the mock-recognition fallback used for no-camera/dev scenarios.
      const mockRecognitionResponse =
        options?.mockRecognitionResponse ||
        (isManualUpload && !OCR_USE_REAL_CAMERA
          ? OCR_MOCK_CAPTURE_RESULT[documentType].response
          : null);

      if (mockRecognitionResponse) {
        recognitionResult = mockRecognitionResponse;
      } else {
        setIsRecognizing(true);

        try {
          recognitionResult = await ocrExtractByObjectName({
            documentType: documentConfig.apiDocumentType,
            objectName: uploadedObjectName,
          });
        } catch (error) {
          if (!isRequestCurrent(requestVersion)) {
            return false;
          }

          CustomMessage.error(
            getErrorMessage(
              error,
              t("ocr.errors.recognitionFailed"),
            ),
          );
          setIsRecognizing(false);
          setPendingSource(null);
          return false;
        }
      }

      if (!isRequestCurrent(requestVersion)) {
        return false;
      }

      if (!mockRecognitionResponse) {
        setIsRecognizing(false);
      }

      if (!recognitionResult?.success) {
        CustomMessage.error(t("ocr.errors.recognitionFailed"));
        setPendingSource(null);
        return false;
      }

      let nextPreviewUrl = options?.previewUrl ?? "";
      let nextPreviewFileType = options?.previewFileType ?? "unknown";

      if (!nextPreviewUrl && file.type.startsWith("image/")) {
        nextPreviewUrl = URL.createObjectURL(file);
        nextPreviewFileType = "image";
      } else if (
        nextPreviewFileType === "unknown" &&
        isPdfFile(file.name, file.type)
      ) {
        nextPreviewUrl = uploadedObjectName;
        nextPreviewFileType = "pdf";
      } else if (
        nextPreviewFileType === "unknown" &&
        file.type.startsWith("image/")
      ) {
        nextPreviewFileType = "image";
      }

      if (source === OCR_CAPTURE_SOURCE.CAMERA) {
        stopStream();
      }

      clearPreview();
      if (nextPreviewFileType === "image" && nextPreviewUrl.startsWith("blob:")) {
        objectUrlRef.current = nextPreviewUrl;
      }
      setPreviewUrl(nextPreviewUrl);
      setPreviewFileName(file.name);
      setPreviewFileType(nextPreviewFileType);
      setCaptureSource(source);
      setPendingSource(null);
      setResult(
        buildOcrResolvedResult(documentType, recognitionResult, uploadedObjectName),
      );
      setStep(OCR_STEP.RESULT);
      return true;
    },
    [
      clearPreview,
      documentConfig.apiDocumentType,
      documentConfig.invalidFileTypeMessageKey,
      documentConfig.maxFileSizeMb,
      documentConfig.uploadExtensions,
      documentConfig.uploadMimeTypes,
      documentType,
      invalidatePendingRequests,
      isRequestCurrent,
      stopStream,
      t,
      uploadSourceFile,
    ],
  );

  const startCamera = useCallback(async () => {
    if (isBusy) {
      return;
    }

    invalidateCaptureAttempt();

    if (!OCR_USE_REAL_CAMERA) {
      invalidatePendingRequests();
      stopStream();
      clearPreview();
      setCapturedPreviewUrl("");
      setResult(null);
      setCaptureSource(OCR_CAPTURE_SOURCE.CAMERA);
      setPendingSource(null);
      setErrorType(null);
      setStep(OCR_STEP.SCAN);
      setIsStartingCamera(false);
      setIsCapturing(false);
      setIsUploading(false);
      setIsRecognizing(false);
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      showErrorStep("cameraUnavailable");
      return;
    }

    const requestVersion = invalidatePendingRequests();
    setIsStartingCamera(true);
    stopStream();
    clearPreview();
    setCapturedPreviewUrl("");
    setResult(null);

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!isRequestCurrent(requestVersion)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      await attachVideoStream(stream);

      if (!isRequestCurrent(requestVersion)) {
        stopStream();
        return;
      }

      setCaptureSource(OCR_CAPTURE_SOURCE.CAMERA);
      setPendingSource(null);
      setErrorType(null);
      setStep(OCR_STEP.SCAN);
    } catch {
      if (!isRequestCurrent(requestVersion)) {
        return;
      }

      stopStream();
      showErrorStep("cameraUnavailable");
    } finally {
      if (isRequestCurrent(requestVersion)) {
        setIsStartingCamera(false);
      }
    }
  }, [
    attachVideoStream,
    clearPreview,
    invalidateCaptureAttempt,
    invalidatePendingRequests,
    isBusy,
    isRequestCurrent,
    showErrorStep,
    stopStream,
  ]);

  const capturePhoto = useCallback(async () => {
    if (isBusy) {
      return;
    }

    const captureAttempt = invalidateCaptureAttempt();

    if (!OCR_USE_REAL_CAMERA) {
      setIsCapturing(true);
      const capturedPreviewUrl = getOcrExampleImage(documentType);
      setCapturedPreviewUrl(capturedPreviewUrl);

      try {
        const captureFile = await loadMockCaptureFile(documentType);
        if (!isCaptureAttemptCurrent(captureAttempt)) {
          return;
        }

        await processSelectedFile(captureFile, OCR_CAPTURE_SOURCE.CAMERA, {
          previewUrl: capturedPreviewUrl,
          previewFileType: "image",
          mockRecognitionResponse: OCR_MOCK_CAPTURE_RESULT[documentType].response,
        });
      } catch {
        CustomMessage.error(t("ocr.errors.captureFailed"));
      } finally {
        if (isCaptureAttemptCurrent(captureAttempt)) {
          setIsCapturing(false);
          setCapturedPreviewUrl("");
        }
      }

      return;
    }

    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      CustomMessage.error(t("ocr.errors.captureFailed"));
      return;
    }

    setIsCapturing(true);
    video.pause();
    frameVideoRef.current?.pause();

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable");
      }

      context.drawImage(video, 0, 0, width, height);
      const capturedPreviewUrl = canvas.toDataURL("image/png");
      setCapturedPreviewUrl(capturedPreviewUrl);
      const blob = await canvasToBlob(canvas);
      if (!isCaptureAttemptCurrent(captureAttempt)) {
        return;
      }

      const captureFile = new File(
        [blob],
        `${documentConfig.apiDocumentType}-${Date.now()}.png`,
        {
          type: "image/png",
        },
      );

      await processSelectedFile(captureFile, OCR_CAPTURE_SOURCE.CAMERA, {
        previewUrl: capturedPreviewUrl,
        previewFileType: "image",
      });
    } catch {
      CustomMessage.error(t("ocr.errors.captureFailed"));
    } finally {
      if (isCaptureAttemptCurrent(captureAttempt)) {
        setIsCapturing(false);
        setCapturedPreviewUrl("");

        if (streamRef.current) {
          void attachVideoStream(streamRef.current);
        }
      }
    }
  }, [
    attachVideoStream,
    documentType,
    documentConfig.apiDocumentType,
    invalidateCaptureAttempt,
    isBusy,
    isCaptureAttemptCurrent,
    processSelectedFile,
    t,
  ]);

  const triggerChooseImage = useCallback(() => {
    if (isBusy) {
      return;
    }

    fileInputRef.current?.click();
  }, [isBusy]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      void processSelectedFile(file, OCR_CAPTURE_SOURCE.UPLOAD);
    },
    [processSelectedFile],
  );

  const resetToEntry = useCallback(() => {
    resetState();
  }, [resetState]);

  const retryCurrentSource = useCallback(() => {
    if (isBusy) {
      return;
    }

    if (captureSource === OCR_CAPTURE_SOURCE.CAMERA) {
      void startCamera();
      return;
    }

    triggerChooseImage();
  }, [captureSource, isBusy, startCamera, triggerChooseImage]);

  return {
    step,
    result,
    previewUrl,
    capturedPreviewUrl,
    previewFileName,
    previewFileType,
    captureSource,
    pendingSource,
    errorType,
    uploadAccept: documentConfig.uploadAccept,
    videoRef,
    frameVideoRef,
    fileInputRef,
    isStartingCamera,
    isCapturing,
    isUploading,
    isRecognizing,
    isBusy,
    startCamera,
    capturePhoto,
    triggerChooseImage,
    handleFileChange,
    resetToEntry,
    retryCurrentSource,
  };
}
