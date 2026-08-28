import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Modal, Spin } from "antd";
import type { ModalProps } from "antd";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import CustomMessage from "@/components/common/CustomMessage";
import DownloadIcon from "@/assets/images/Download.svg";
import {
  getDocument,
  GlobalWorkerOptions,
  PasswordResponses,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist/legacy/build/pdf";
import { useTranslation } from "react-i18next";
import { configurePdfWorker } from "@/utils/pdfWorker";
import {
  resolveDocumentAccessUrl,
  resolvePdfPreviewUrl,
} from "@/utils/pdfPreview";
import "./index.less";

configurePdfWorker({ GlobalWorkerOptions });

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const PRELOAD_ROOT_MARGIN = "800px 0px";
const PAGE_OBSERVER_THRESHOLD = [0, 0.25, 0.6];
const PAGE_HORIZONTAL_PADDING = 32;

function getSafeViewportWidth(width: number) {
  if (width > 0) return width;
  if (typeof window === "undefined") return 800;

  return Math.max(window.innerWidth - 240, 320);
}

function getFitScale(pageWidth: number, viewportWidth: number) {
  const safeWidth = Math.max(
    getSafeViewportWidth(viewportWidth) - PAGE_HORIZONTAL_PADDING,
    240,
  );

  return safeWidth / pageWidth;
}

interface PdfPreviewModalProps {
  visible: boolean;
  fileUrl: string;
  fileName?: string;
  filePath?: string;
  onCancel: () => void;
  modalProps?: Partial<ModalProps>;
}

interface PdfPageCanvasProps {
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  zoomPercent: number;
  viewportWidth: number;
  estimatedHeight: number;
  scrollRoot: HTMLDivElement | null;
  renderErrorMessage: string;
  eager?: boolean;
  onVisible: (pageNumber: number) => void;
}

function PdfPageCanvas({
  pageNumber,
  pdfDocument,
  zoomPercent,
  viewportWidth,
  estimatedHeight,
  scrollRoot,
  renderErrorMessage,
  eager = false,
  onVisible,
}: PdfPageCanvasProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldRender, setShouldRender] = useState(eager);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageHeight, setPageHeight] = useState(estimatedHeight);

  useEffect(() => {
    setPageHeight(estimatedHeight);
  }, [estimatedHeight]);

  useEffect(() => {
    const node = pageRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          setShouldRender(true);

          if (entry.intersectionRatio >= 0.25) {
            onVisible(pageNumber);
          }
        });
      },
      {
        root: scrollRoot,
        rootMargin: PRELOAD_ROOT_MARGIN,
        threshold: PAGE_OBSERVER_THRESHOLD,
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [onVisible, pageNumber, scrollRoot]);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) {
      return;
    }

    let disposed = false;
    let renderTask: RenderTask | null = null;

    const renderPage = async () => {
      try {
        setIsRendering(true);
        setRenderError(null);

        const page = await pdfDocument.getPage(pageNumber);
        if (disposed || !canvasRef.current) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const fitScale = getFitScale(unscaledViewport.width, viewportWidth);
        const renderScale = fitScale * (zoomPercent / 100);
        const viewport = page.getViewport({ scale: renderScale });
        const outputScale = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas context is not available.");
        }

        canvas.width = Math.ceil(viewport.width * outputScale);
        canvas.height = Math.ceil(viewport.height * outputScale);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          transform:
            outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        });

        setPageHeight(viewport.height);
        await renderTask.promise;
      } catch (error) {
        const name = (error as { name?: string } | undefined)?.name;
        if (disposed || name === "RenderingCancelledException") {
          return;
        }

        console.error("Failed to render PDF page:", error);
        setRenderError(renderErrorMessage);
      } finally {
        if (!disposed) {
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      disposed = true;
      renderTask?.cancel();
    };
  }, [
    pageNumber,
    pdfDocument,
    renderErrorMessage,
    shouldRender,
    viewportWidth,
    zoomPercent,
  ]);

  return (
    <div
      ref={pageRef}
      className="pdf-preview-modal__page-shell"
      style={{ minHeight: Math.max(pageHeight, 240) }}
    >
      <div className="pdf-preview-modal__page-number">{pageNumber}</div>
      <div className="pdf-preview-modal__page-canvas">
        <canvas ref={canvasRef} />
        {isRendering ? (
          <div className="pdf-preview-modal__page-loading">
            <Spin size="large" />
          </div>
        ) : null}
        {renderError ? (
          <div className="pdf-preview-modal__page-error">{renderError}</div>
        ) : null}
      </div>
    </div>
  );
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  visible,
  fileUrl,
  fileName,
  filePath,
  onCancel,
  modalProps,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const activeDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [, setCurrentPage] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordCallback, setPasswordCallback] = useState<
    ((password: string) => void) | null
  >(null);
  const [estimatedPageSize, setEstimatedPageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const pdfUrl = useMemo(
    () => resolvePdfPreviewUrl(fileUrl, filePath),
    [filePath, fileUrl],
  );
  const downloadUrl = useMemo(
    () => resolveDocumentAccessUrl(filePath || fileUrl),
    [filePath, fileUrl],
  );

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!visible || !node) return;

    let frameId = 0;
    const updateWidth = () => {
      setViewportWidth(node.clientWidth);
    };

    updateWidth();
    frameId = window.requestAnimationFrame(updateWidth);

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !pdfUrl) {
      setPdfDocument(null);
      setPageCount(0);
      setCurrentPage(1);
      setEstimatedPageSize(null);
      setLoadError(null);
      setPasswordVisible(false);
      setPasswordValue("");
      setPasswordCallback(null);
      return;
    }

    let cancelled = false;
    setPdfDocument(null);
    setPageCount(0);
    setCurrentPage(1);
    setEstimatedPageSize(null);
    setLoadError(null);
    setIsLoading(true);
    setZoomPercent(100);
    setPasswordVisible(false);
    setPasswordValue("");
    setPasswordCallback(null);

    const loadingTask = getDocument(pdfUrl);
    loadingTaskRef.current = loadingTask;

    loadingTask.onPassword = (callback: (password: string) => void, reason: number) => {
      if (reason === PasswordResponses.INCORRECT_PASSWORD) {
        CustomMessage.error(t("previewModal.incorrectPassword"));
      }
      setPasswordCallback(() => callback);
      setPasswordVisible(true);
      setPasswordValue("");
    };

    const loadDocument = async () => {
      try {
        const documentProxy = await loadingTask.promise;
        if (cancelled) {
          await documentProxy.destroy().catch(() => undefined);
          return;
        }

        activeDocumentRef.current = documentProxy;
        setPdfDocument(documentProxy);
        setPageCount(documentProxy.numPages);

        const firstPage = await documentProxy.getPage(1);
        if (cancelled) return;

        const initialViewport = firstPage.getViewport({ scale: 1 });
        setEstimatedPageSize({
          width: initialViewport.width,
          height: initialViewport.height,
        });
      } catch (error) {
        const name = (error as { name?: string } | undefined)?.name;
        if (cancelled || name === "RenderingCancelledException") {
          return;
        }

        console.error("Failed to load PDF document:", error);
        setLoadError(t("previewModal.documentLoadFailed"));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      loadingTaskRef.current?.destroy().catch(() => undefined);
      loadingTaskRef.current = null;
      activeDocumentRef.current?.destroy().catch(() => undefined);
      activeDocumentRef.current = null;
    };
  }, [pdfUrl, t, visible]);

  const estimatedPageHeight = useMemo(() => {
    if (!estimatedPageSize) return 520;

    const fitScale = getFitScale(estimatedPageSize.width, viewportWidth);
    return estimatedPageSize.height * fitScale * (zoomPercent / 100);
  }, [estimatedPageSize, viewportWidth, zoomPercent]);

  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount],
  );

  const handlePasswordSubmit = () => {
    if (!passwordCallback) return;

    const callback = passwordCallback;
    setPasswordVisible(false);
    setPasswordCallback(null);
    callback(passwordValue);
    setPasswordValue("");
  };

  const handlePasswordCancel = () => {
    setPasswordVisible(false);
    setPasswordValue("");
    setPasswordCallback(null);
    onCancel();
  };

  const handleZoomIn = () => {
    setZoomPercent((current) => Math.min(current + ZOOM_STEP, ZOOM_MAX));
  };

  const handleZoomOut = () => {
    setZoomPercent((current) => Math.max(current - ZOOM_STEP, ZOOM_MIN));
  };

  const handleDownload = () => {
    if (!downloadUrl) return;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName || "download.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canDownload = !isLoading && !loadError && !!pdfDocument && !!downloadUrl;
  const modalTitle = (
    <div className="pdf-preview-modal__title">
      <span className="pdf-preview-modal__title-text">
        {fileName || t("previewModal.documentPreview")}
      </span>
      {canDownload ? (
        <button
          type="button"
          className="pdf-preview-modal__download-button"
          onClick={handleDownload}
          aria-label={t("previewModal.download")}
          title={t("previewModal.download")}
        >
          <img src={DownloadIcon} alt="" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <Modal
        {...modalProps}
        centered
        title={modalTitle}
        visible={visible}
        onCancel={onCancel}
        footer={null}
        destroyOnClose
        className={["pdf-preview-modal", modalProps?.className]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="pdf-preview-modal__body">
          <div ref={scrollContainerRef} className="pdf-preview-modal__scroll-container">
            {isLoading ? (
              <div className="pdf-preview-modal__state">
                <Spin size="large" />
              </div>
            ) : null}

            {!isLoading && loadError ? (
              <div className="pdf-preview-modal__state pdf-preview-modal__state--error">
                {loadError}
              </div>
            ) : null}

            {!isLoading && !loadError && pdfDocument ? (
              <div className="pdf-preview-modal__pages">
                {pageNumbers.map((pageNumber) => (
                  <PdfPageCanvas
                    key={`${pageNumber}-${zoomPercent}-${viewportWidth}`}
                    pageNumber={pageNumber}
                    pdfDocument={pdfDocument}
                    zoomPercent={zoomPercent}
                    viewportWidth={viewportWidth}
                    estimatedHeight={estimatedPageHeight}
                    scrollRoot={scrollContainerRef.current}
                    renderErrorMessage={t("previewModal.pageRenderFailed")}
                    eager={pageNumber <= 2}
                    onVisible={setCurrentPage}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {!isLoading && !loadError && pageCount > 0 ? (
            <>
              {/* <div className="pdf-preview-modal__floating-info">
                {currentPage} / {pageCount}
              </div> */}
              <div className="pdf-preview-modal__zoom-control">
                <MinusOutlined
                  onClick={handleZoomOut}
                  className={zoomPercent <= ZOOM_MIN ? "is-disabled" : ""}
                />
                <span>{zoomPercent}%</span>
                <PlusOutlined
                  onClick={handleZoomIn}
                  className={zoomPercent >= ZOOM_MAX ? "is-disabled" : ""}
                />
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal centered
        title={t("previewModal.passwordTitle")}
        visible={passwordVisible}
        onCancel={handlePasswordCancel}
        footer={[
          <Button key="cancel" onClick={handlePasswordCancel}>
            {t("previewModal.cancel")}
          </Button>,
          <Button key="submit" type="primary" onClick={handlePasswordSubmit}>
            {t("previewModal.confirm")}
          </Button>,
        ]}
        className="pdf-preview-modal__password-modal"
        destroyOnClose
        zIndex={1001}
        closable={false}
        maskClosable={false}
      >
        <div className="pdf-preview-modal__password-body">
          <div>{t("previewModal.passwordPrompt")}</div>
          <Input.Password
            value={passwordValue}
            onChange={(event) => setPasswordValue(event.target.value)}
            onPressEnter={handlePasswordSubmit}
            placeholder={t("previewModal.passwordPlaceholder")}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
};

export default PdfPreviewModal;
