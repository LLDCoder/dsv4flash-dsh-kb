import React, { useLayoutEffect, useRef, useState } from "react";
import FileUpload from "../FileUpload";
import EyeIcon from "@/assets/icons/document-viewer/view.svg";
import TrashIcon from "@/assets/images/Trash.svg";
import DownloadIcon from "@/assets/icons/document-viewer/download.svg";
import FilePdfIcon from "@/assets/images/FilePdf.svg";
import FileJpgIcon from "@/assets/images/FileJpg.svg";
import FilePngIcon from "@/assets/images/FilePng.svg";
import FileJpegIcon from "@/assets/images/FileJpeg.svg";
import FileVideoIcon from "@/assets/images/movies.svg";
import { fileUpload, getOriginalFileNames } from "@/services/media";
import "./index.less";
import { UploadOutlined } from "@ant-design/icons";
import { isPdfFile, resolveDocumentAccessUrl } from "@/utils/pdfPreview";
import type { RcFile } from "antd/lib/upload";
import CustomMessage from "../CustomMessage";
import PdfPreviewModal from "../PdfPreviewModal";
import CustomImagePreviewModal from "../CustomImagePreviewModal";
import { useTranslation } from "react-i18next";
import {
  resolveFileIconType,
  type FileType,
} from "../fileIconType";

export type { FileType } from "../fileIconType";

interface DocumentViewerUploadRequest {
  file: File;
  onSuccess?: (url: string) => void;
  onError?: (error: unknown) => void;
}

export interface DocumentViewerProps {
  fileName?: string;
  fileUrl?: string;
  fileType?: FileType;
  className?: string;

  hasView?: boolean;
  hasDelete?: boolean;
  /** Replace current file via picker without clearing first (single-file uploads). */
  hasReupload?: boolean;
  hasDownload?: boolean;

  onView?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;

  uploadConfig?: {
    maxSize?: number;
    maxCount?: number;
    accept?: string;
    placeholder?: string;
    uploadTip?: string;
    customRequest?: (options: DocumentViewerUploadRequest) => void;
    onUploadSuccess?: (fileData: { url: string; name: string }[]) => void;
    beforeUpload?: (file: RcFile) => boolean;
    invalidFileTypeMessage?: string;
    maxSizeErrorMessage?: string;
    showUploadTip?: boolean;
  };

  label?: string;
  required?: boolean;
  disabled?: boolean;

  // Form.Item integration
  value?: string | string[];
  onChange?: (value: string | string[]) => void;

  /** Used for native tooltip / accessibility when `hasReupload` is enabled */
  reuploadTooltip?: string;
}

const getBasenameFromPath = (name: string) => {
  const parts = name.split(/[/\\]/);
  return parts[parts.length - 1] || name;
};

const getFileDisplayName = (name?: string) =>
  name ? getBasenameFromPath(name) : "";

/**
 * Preserves the user-facing upload name for the current browser session.
 * This prevents remounted upload fields from falling back to hashed storage names.
 */
const sessionFileNameCache = new Map<string, string>();

function cacheSessionFileName(url: string | undefined, name: string | undefined): void {
  const normalizedUrl = typeof url === "string" ? url.trim() : "";
  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (!normalizedUrl || !normalizedName) return;
  sessionFileNameCache.set(normalizedUrl, normalizedName);
}

function getCachedSessionFileName(url: string | undefined): string | undefined {
  const normalizedUrl = typeof url === "string" ? url.trim() : "";
  if (!normalizedUrl) return undefined;
  return sessionFileNameCache.get(normalizedUrl);
}

/**
 * True only when the session cache holds a real user-facing upload name.
 * A stored record only carries the storage key, and the key (or its basename) is
 * not an original name, so it must not suppress the lookup below.
 */
function isStorageKeyName(url: string, name: string): boolean {
  return name === url || name === getFileDisplayName(url);
}

function hasSessionUploadName(url: string | undefined): boolean {
  const normalizedUrl = typeof url === "string" ? url.trim() : "";
  if (!normalizedUrl) return false;
  const cachedName = sessionFileNameCache.get(normalizedUrl);
  if (!cachedName) return false;
  return !isStorageKeyName(normalizedUrl, cachedName);
}

function clearCachedSessionFileName(url: string | undefined): void {
  const normalizedUrl = typeof url === "string" ? url.trim() : "";
  if (!normalizedUrl) return;
  sessionFileNameCache.delete(normalizedUrl);
}

/**
 * Display-only lookup cache for storage key -> original upload name.
 * Only successfully resolved names are stored here.
 * Module level on purpose: several viewers on one page share the same keys.
 */
const originalFileNameCache = new Map<string, string>();

/**
 * Keys the backend answered for but had no original name for. Kept out of the
 * positive cache and only for a short window, so a later mount can ask again
 * (the name may have been backfilled) without hammering the endpoint.
 * Request failures are NOT recorded here at all: a failed call must never
 * permanently suppress the lookup for that key.
 */
const unresolvedOriginalNameKeys = new Map<string, number>();
const UNRESOLVED_ORIGINAL_NAME_TTL_MS = 60 * 1000;

const hasOriginalNameLookupResult = (key: string): boolean => {
  if (originalFileNameCache.has(key)) return true;
  const markedAt = unresolvedOriginalNameKeys.get(key);
  if (markedAt === undefined) return false;
  if (Date.now() - markedAt < UNRESOLVED_ORIGINAL_NAME_TTL_MS) return true;
  unresolvedOriginalNameKeys.delete(key);
  return false;
};

const ORIGINAL_NAME_BATCH_SIZE = 50;

/**
 * A detail page mounts several viewers at once, so keys requested inside the same
 * short window are merged into a single call instead of one call per field.
 * Every in-flight key keeps its own promise, so a viewer always waits for the
 * batch that actually carries its keys and never reads the cache too early.
 */
const ORIGINAL_NAME_BATCH_WINDOW_MS = 16;

const inFlightOriginalNameRequests = new Map<string, Promise<void>>();
let pendingBatchKeys: string[] = [];
let pendingBatchSettled: {
  promise: Promise<void>;
  resolve: () => void;
} | null = null;
let batchTimer: ReturnType<typeof setTimeout> | null = null;

const runOriginalNameBatch = async (keys: string[]) => {
  try {
    const items = await getOriginalFileNames(keys);
    // Results are matched back by key, never by response order, so a viewer
    // cannot pick up a name that belongs to another field.
    const resolved = new Map(
      items.map((item) => [item.key, item.originalFileName || ""]),
    );
    keys.forEach((key) => {
      const originalFileName = resolved.get(key) || "";
      if (originalFileName) {
        originalFileNameCache.set(key, originalFileName);
        unresolvedOriginalNameKeys.delete(key);
        return;
      }
      // Answered, but with no usable name: remember it briefly so one page render
      // does not re-ask, while still allowing a retry after the TTL.
      unresolvedOriginalNameKeys.set(key, Date.now());
    });
  } catch {
    // Name resolution is display-only; keep the key basename when it fails and do
    // not record anything, so the next mount can retry this key.
  }
};

const flushOriginalNameBatch = () => {
  batchTimer = null;
  const keys = pendingBatchKeys;
  const settled = pendingBatchSettled;
  pendingBatchKeys = [];
  pendingBatchSettled = null;
  if (!settled) return;

  const chunks: string[][] = [];
  for (let index = 0; index < keys.length; index += ORIGINAL_NAME_BATCH_SIZE) {
    chunks.push(keys.slice(index, index + ORIGINAL_NAME_BATCH_SIZE));
  }

  Promise.all(chunks.map(runOriginalNameBatch)).then(() => {
    keys.forEach((key) => {
      if (inFlightOriginalNameRequests.get(key) === settled.promise) {
        inFlightOriginalNameRequests.delete(key);
      }
    });
    settled.resolve();
  });
};

/**
 * Queues the missing keys onto the shared batch and resolves once every batch
 * holding one of them has written its results into the cache.
 */
const resolveOriginalFileNames = (keys: string[]): Promise<void> => {
  const waits: Promise<void>[] = [];

  keys.forEach((key) => {
    const inFlight = inFlightOriginalNameRequests.get(key);
    if (inFlight) {
      waits.push(inFlight);
      return;
    }

    if (!pendingBatchSettled) {
      let resolveBatch: () => void = () => undefined;
      const promise = new Promise<void>((resolve) => {
        resolveBatch = resolve;
      });
      pendingBatchSettled = { promise, resolve: resolveBatch };
    }

    pendingBatchKeys.push(key);
    inFlightOriginalNameRequests.set(key, pendingBatchSettled.promise);
    waits.push(pendingBatchSettled.promise);
  });

  if (pendingBatchKeys.length > 0 && batchTimer === null) {
    batchTimer = setTimeout(
      flushOriginalNameBatch,
      ORIGINAL_NAME_BATCH_WINDOW_MS,
    );
  }

  return waits.length > 0
    ? Promise.all(waits).then(() => undefined)
    : Promise.resolve();
};

const applyCachedOriginalNames = (
  entries: UploadedFileEntry[],
): UploadedFileEntry[] => {
  let changed = false;
  const next = entries.map((entry) => {
    const cachedName = originalFileNameCache.get(entry.url);
    if (!cachedName || entry.name === cachedName) return entry;
    changed = true;
    return { ...entry, name: cachedName };
  });

  return changed ? next : entries;
};

const FILE_NAME_ELLIPSIS = "....";

/** Probe width is often slightly under real layout (Inter/CJK/subpixel). */
const MEASURE_WIDTH_FUDGE = 1.18;

/** Subpixel / rounding slack vs container clientWidth. */
const TEXT_FIT_WIDTH_SLACK_PX = 6;

/**
 * Measures text using the same layout engine as on-screen text (canvas measureText is often
 * wrong for CJK + Latin mixes, which caused full names to be shown then clipped by overflow).
 */
function measureTextWidthDom(text: string, referenceEl: HTMLElement): number {
  if (!text) return 0;
  const doc = referenceEl.ownerDocument;
  const span = doc.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "white-space:nowrap",
    "visibility:hidden",
    "pointer-events:none",
  ].join(";");
  const cs = getComputedStyle(referenceEl);
  span.style.font = cs.font;
  span.style.letterSpacing = cs.letterSpacing;
  span.style.fontFeatureSettings = cs.fontFeatureSettings;
  span.style.fontVariantNumeric = cs.fontVariantNumeric;
  doc.body.appendChild(span);
  span.textContent = text;
  const w = span.getBoundingClientRect().width;
  doc.body.removeChild(span);
  return w;
}

/**
 * Fits basename into maxWidthPx using DOM measurement on the real label styles.
 * With an extension, keeps ext and inserts "...." before it.
 */
function fitBasenameToWidth(base: string, maxWidthPx: number, referenceEl: HTMLElement): string {
  if (!base) return "";
  if (maxWidthPx <= 1) return base;

  const budget = Math.max(0, maxWidthPx - TEXT_FIT_WIDTH_SLACK_PX);
  const m = (t: string) =>
    measureTextWidthDom(t, referenceEl) * MEASURE_WIDTH_FUDGE + 1;
  if (m(base) <= budget) return base;

  const lastDot = base.lastIndexOf(".");
  const hasExt = lastDot > 0 && lastDot < base.length - 1;
  const stem = hasExt ? base.slice(0, lastDot) : base;
  const ext = hasExt ? base.slice(lastDot) : "";

  if (hasExt) {
    const suffix = FILE_NAME_ELLIPSIS + ext;
    if (m(suffix) > budget) {
      return m(ext) <= budget ? ext : FILE_NAME_ELLIPSIS;
    }
    let low = 0;
    let high = stem.length;
    let best = 0;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const candidate = stem.slice(0, mid) + suffix;
      if (m(candidate) <= budget) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return stem.slice(0, best) + suffix;
  }

  if (m(FILE_NAME_ELLIPSIS) > budget) return FILE_NAME_ELLIPSIS;
  let low = 0;
  let high = stem.length;
  let best = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const candidate = stem.slice(0, mid) + FILE_NAME_ELLIPSIS;
    if (m(candidate) <= budget) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return stem.slice(0, best) + FILE_NAME_ELLIPSIS;
}

/** True if text fits in a box of maxWidthPx with same typography as reference (uses scrollWidth). */
function textFitsBox(
  text: string,
  boxWidthPx: number,
  referenceEl: HTMLElement,
): boolean {
  if (!text || boxWidthPx <= 1) return true;
  const span = referenceEl.ownerDocument.createElement("span");
  span.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "visibility:hidden",
    "white-space:nowrap",
    "overflow:hidden",
    `width:${Math.floor(boxWidthPx)}px`,
    "box-sizing:border-box",
  ].join(";");
  const cs = getComputedStyle(referenceEl);
  span.style.font = cs.font;
  span.style.letterSpacing = cs.letterSpacing;
  span.style.fontFeatureSettings = cs.fontFeatureSettings;
  span.style.fontVariantNumeric = cs.fontVariantNumeric;
  span.textContent = text;
  referenceEl.ownerDocument.body.appendChild(span);
  const ok = span.scrollWidth <= span.clientWidth + 1;
  span.remove();
  return ok;
}

function fitBasenameToVisibleMax(
  base: string,
  maxWidthPx: number,
  referenceEl: HTMLElement,
): string {
  let w = Math.max(8, Math.floor(maxWidthPx - TEXT_FIT_WIDTH_SLACK_PX));
  let text = fitBasenameToWidth(base, w, referenceEl);
  for (let i = 0; i < 16 && !textFitsBox(text, maxWidthPx, referenceEl); i++) {
    w = Math.max(8, Math.floor(w * 0.9));
    text = fitBasenameToWidth(base, w, referenceEl);
  }
  return text;
}

function getHorizontalGap(el: HTMLElement | null): number {
  if (!el) return 0;
  const styles = getComputedStyle(el);
  return parseFloat(styles.columnGap || styles.gap || "0") || 0;
}

function getHorizontalPadding(el: HTMLElement | null): number {
  if (!el) return 0;
  const styles = getComputedStyle(el);
  return (
    (parseFloat(styles.paddingLeft || "0") || 0) +
    (parseFloat(styles.paddingRight || "0") || 0)
  );
}

function getAvailableWidthFromInfo(span: HTMLSpanElement): number {
  const width = span.clientWidth;
  if (width >= 2) return Math.floor(width);

  const parent = span.parentElement;
  if (!parent) return 0;

  const icon = parent.querySelector(".file-icon") as HTMLElement | null;
  const iconWidth = icon?.getBoundingClientRect().width ?? 24;
  const infoGap = getHorizontalGap(parent) || 12;
  return Math.max(0, Math.floor(parent.clientWidth - iconWidth - infoGap));
}

function availableWidthForFileNameLabel(
  span: HTMLSpanElement,
  rowEl: HTMLDivElement | null,
  infoEl: HTMLDivElement | null,
  actionsEl: HTMLDivElement | null,
): number {
  const fallbackWidth = getAvailableWidthFromInfo(span);
  if (!rowEl || !infoEl) return fallbackWidth;

  const icon = infoEl.querySelector(".file-icon") as HTMLElement | null;
  const iconWidth = icon?.getBoundingClientRect().width ?? 24;
  const infoGap = getHorizontalGap(infoEl) || 12;
  const rowGap = getHorizontalGap(rowEl);
  const actionsWidth = actionsEl?.getBoundingClientRect().width ?? 0;
  const rowContentWidth = rowEl.clientWidth - getHorizontalPadding(rowEl);
  const measuredWidth =
    rowContentWidth - actionsWidth - rowGap - iconWidth - infoGap;

  if (fallbackWidth > 0) {
    return Math.max(0, Math.floor(Math.min(measuredWidth, fallbackWidth)));
  }

  return Math.max(0, Math.floor(measuredWidth));
}

interface DocumentFileNameProps {
  raw: string;
  rowRef: React.RefObject<HTMLDivElement>;
  infoRef: React.RefObject<HTMLDivElement>;
  actionsRef: React.RefObject<HTMLDivElement>;
}

const DocumentFileName: React.FC<DocumentFileNameProps> = ({
  raw,
  rowRef,
  infoRef,
  actionsRef,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const basename = getBasenameFromPath(raw);
  const [displayText, setDisplayText] = useState(basename);

  useLayoutEffect(() => {
    setDisplayText(basename);
    const el = spanRef.current;
    if (!el) return;

    const apply = () => {
      const w = availableWidthForFileNameLabel(
        el,
        rowRef.current,
        infoRef.current,
        actionsRef.current,
      );
      if (w < 2) return;
      const nextText = fitBasenameToVisibleMax(basename, w, el);
      setDisplayText((prev) => (prev === nextText ? prev : nextText));
    };

    apply();
    const rafId = window.requestAnimationFrame(apply);
    const delayedTimer = window.setTimeout(apply, 120);
    const iconEl = infoRef.current?.querySelector(".file-icon");
    iconEl?.addEventListener("load", apply);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(delayedTimer);
        iconEl?.removeEventListener("load", apply);
      };
    }

    const resizeObserver = new ResizeObserver(() => apply());
    if (rowRef.current) {
      resizeObserver.observe(rowRef.current);
    }
    if (infoRef.current) {
      resizeObserver.observe(infoRef.current);
    }
    if (actionsRef.current) {
      resizeObserver.observe(actionsRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(delayedTimer);
      iconEl?.removeEventListener("load", apply);
      resizeObserver.disconnect();
    };
  }, [actionsRef, basename, infoRef, rowRef]);

  if (!basename) return null;

  return (
    <span ref={spanRef} className="file-name" title={basename}>
      {displayText}
    </span>
  );
};

type UploadedFileEntry = { url: string; name: string; fileType?: FileType };

interface DocumentFileItemProps {
  fileData: UploadedFileEntry;
  index: number;
  fileType: FileType;
  showUploadComponent: boolean;
  isLoading: boolean;
  hasView: boolean;
  hasDelete: boolean;
  hasReupload: boolean;
  hasDownload: boolean;
  disabled: boolean;
  uploadConfig?: DocumentViewerProps["uploadConfig"];
  reuploadTooltip?: string;
  getFileIcon: (
    fileUrl?: string,
    type?: FileType,
    fileName?: string,
  ) => string;
  onView: (fileData: UploadedFileEntry) => void;
  onDelete: (index: number) => void;
  onDownload: (fileData: UploadedFileEntry) => void;
  onReupload: () => void;
  uploadLabel: string;
}

const DocumentFileItem: React.FC<DocumentFileItemProps> = ({
  fileData,
  index,
  fileType,
  showUploadComponent,
  isLoading,
  hasView,
  hasDelete,
  hasReupload,
  hasDownload,
  disabled,
  uploadConfig,
  reuploadTooltip,
  getFileIcon,
  onView,
  onDelete,
  onDownload,
  onReupload,
  uploadLabel,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      className="document-file"
      style={{ marginTop: showUploadComponent ? "10px" : "0" }}
    >
      <div ref={infoRef} className="file-info">
        <img
          src={getFileIcon(
            fileData.url,
            fileData.fileType || fileType,
            fileData.name,
          )}
          alt="file"
          className="file-icon"
        />
        <DocumentFileName
          raw={fileData.name || fileData.url}
          rowRef={rowRef}
          infoRef={infoRef}
          actionsRef={actionsRef}
        />
      </div>
      <div ref={actionsRef} className="file-actions">
        {hasView && (
          <img
            src={EyeIcon}
            alt="view"
            className={`action-icon ${isLoading ? "loading" : ""}`}
            onClick={() => onView(fileData)}
          />
        )}
        {hasReupload && uploadConfig && !disabled ? (
          <UploadOutlined
            className={`action-icon ant-document-viewer-reupload ${isLoading ? "loading" : ""}`}
            title={reuploadTooltip || uploadLabel}
            aria-label={reuploadTooltip || uploadLabel}
            onClick={onReupload}
          />
        ) : null}
        {hasDownload && (
          <img
            src={DownloadIcon}
            alt="download"
            className={`action-icon ${isLoading ? "loading" : ""}`}
            onClick={() => onDownload(fileData)}
          />
        )}
        {hasDelete && !disabled && (
          <img
            src={TrashIcon}
            alt="delete"
            className="action-icon"
            onClick={() => onDelete(index)}
          />
        )}
      </div>
    </div>
  );
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  fileName,
  fileUrl,
  fileType = "PDF",
  className,
  hasView = true,
  hasDelete = false,
  hasReupload = false,
  hasDownload = false,
  onView,
  onDelete,
  onDownload,
  uploadConfig,
  disabled = false,
  value,
  onChange,
  reuploadTooltip,
}) => {
  const { t } = useTranslation();
  const reuploadInputRef = useRef<HTMLInputElement>(null);
  const getInitialFileList = React.useCallback(() => {
    if (fileName || fileUrl) {
      const resolvedUrl = fileUrl || fileName || "";
      const resolvedName =
        fileName || getCachedSessionFileName(resolvedUrl) || resolvedUrl;
      // Caching the storage key as a session name would mark the field as already
      // resolved and permanently skip the original-name lookup, so only a real
      // user-facing upload name is stored.
      if (!isStorageKeyName(resolvedUrl, resolvedName)) {
        cacheSessionFileName(resolvedUrl, resolvedName);
      }
      return [{
        url: resolvedUrl,
        name: resolvedName,
        fileType,
      }];
    }

    return [];
  }, [fileName, fileType, fileUrl]);

  const [uploadedFileList, setUploadedFileList] = useState<UploadedFileEntry[]>(
    getInitialFileList,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pdfVisible, setPdfVisible] = useState(false);
  const [currentFileData, setCurrentFileData] = useState<{
    url?: string;
    name?: string;
  }>({});

  const resetPreviewState = React.useCallback(() => {
    setVisible(false);
    setPdfVisible(false);
    setCurrentFileData({});
  }, []);

  React.useEffect(() => {

    if (onChange) {
      const explicitEmpty =
        value === "" ||
        value === null ||
        (Array.isArray(value) && value.length === 0);

      if (value !== undefined && value !== null && value !== "") {
        const values = Array.isArray(value) ? value : [value];
        const urls = values.filter((v): v is string => typeof v === "string" && !!v);
        setUploadedFileList((prev) =>
          urls.map((v) => {
            const preserved = prev.find((p) => p.url === v);
            const cachedName = getCachedSessionFileName(v);
            return {
              url: v,
              name: preserved?.name ?? cachedName ?? getFileDisplayName(v),
              fileType: preserved?.fileType ?? fileType,
            };
          }),
        );
      } else if (explicitEmpty) {
        resetPreviewState();
        setUploadedFileList([]);
      } else if (value === undefined && (fileName || fileUrl)) {
        setUploadedFileList(getInitialFileList());
      } else if (!fileName && !fileUrl) {
        resetPreviewState();
        setUploadedFileList([]);
      }
    } else if (fileName || fileUrl) {
      setUploadedFileList(getInitialFileList());
    } else {
      resetPreviewState();
      setUploadedFileList([]);
    }
  }, [value, fileName, fileUrl, onChange, getInitialFileList, fileType, resetPreviewState]);

  // The stored value only carries the storage key, so a record reopened in a later
  // session falls back to the key basename. Resolve the original upload name for
  // display only: value, onChange payload and the submit path stay untouched.
  // Stable dependency for the lookup below: only entries still showing the storage
  // basename need resolving, so unrelated list updates cannot re-trigger the effect.
  const fallbackNameKeys = Array.from(
   new Set(
    uploadedFileList
     .filter(
      (entry) =>
       Boolean(entry.url) &&
       !hasSessionUploadName(entry.url) &&
       isStorageKeyName(entry.url, entry.name),
     )
     .map((entry) => entry.url),
   ),
  ).join("\n");

  React.useEffect(() => {
   let cancelled = false;

   const fallbackKeys = fallbackNameKeys ? fallbackNameKeys.split("\n") : [];

   if (fallbackKeys.some((key) => originalFileNameCache.has(key))) {
    // applyCachedOriginalNames returns the same array reference when nothing
    // changes, so React bails out instead of looping on this effect.
    setUploadedFileList(applyCachedOriginalNames);
   }

   const missingKeys = fallbackKeys.filter(
    (key) => !hasOriginalNameLookupResult(key),
   );

   if (missingKeys.length === 0) {
    return () => {
     cancelled = true;
    };
   }

   resolveOriginalFileNames(missingKeys).then(() => {
    if (cancelled) return;
    setUploadedFileList(applyCachedOriginalNames);
   });

   return () => {
    cancelled = true;
   };
  }, [fallbackNameKeys]);

  React.useEffect(() => {
   if (!currentFileData.url) return;
    const currentFileStillExists = uploadedFileList.some(
      (file) => file.url === currentFileData.url,
    );
    if (!currentFileStillExists) {
      resetPreviewState();
    }
  }, [currentFileData.url, resetPreviewState, uploadedFileList]);

  // Built-in upload method
  const uploadFile = async (options: DocumentViewerUploadRequest) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append("files", file);
    try {
      setIsLoading(true);
      const res = await fileUpload(formData);
      const responseData = res.data as Array<
        string | { url?: string; fileName?: string; name?: string }
      >;
      if (Array.isArray(responseData) && responseData.length > 0) {
        const item = responseData[0];
        const url =
          typeof item === "string"
            ? item
            : (item?.url ?? item?.fileName ?? item?.name ?? item);
        if (typeof url === "string" && url) {
          onSuccess?.(url);
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (
    fileUrl?: string,
    type?: FileType,
    fileName?: string,
  ) => {
    const iconType = resolveFileIconType({ fileName, fileUrl, fileType: type });

    switch (iconType) {
      case "jpg":
        return FileJpgIcon;
      case "jpeg":
        return FileJpegIcon;
      case "png":
        return FilePngIcon;
      case "video":
        return FileVideoIcon;
      case "pdf":
      default:
        return FilePdfIcon;
    }
  };

  const getResolvedFileUrl = (url: string) => resolveDocumentAccessUrl(url);

  const handleDelete = (index: number) => {
    const deletedFile = uploadedFileList[index];
    clearCachedSessionFileName(deletedFile?.url);
    if (deletedFile?.url && currentFileData.url === deletedFile.url) {
      resetPreviewState();
    }
    if (onDelete) {
      onDelete();
    } else {
      const newFileList = uploadedFileList.filter((_, i) => i !== index);
      setUploadedFileList(newFileList);

      // Update form value
      if (onChange) {
        if (newFileList.length === 0) {
          onChange("");
        } else {
          const fileNames = newFileList.map((file) => file.url);
          onChange(fileNames.length === 1 ? fileNames[0] : fileNames);
        }
      }
    }
  };

  const handleView = async (fileData: { url: string; name: string }) => {
    if (onView) {
      onView();
    } else {
      setCurrentFileData(fileData);
      const isPdf = isPdfFile(fileData.name, fileData.url);
      if (isPdf) {
        setVisible(false);
        setPdfVisible(true);
      } else {
        setPdfVisible(false);
        setVisible(true);
      }
    }
  };

  const handleDownload = async (fileData: { url: string; name: string }) => {
    if (onDownload) {
      onDownload();
    } else {
      try {
        setIsLoading(true);
        const url = getResolvedFileUrl(fileData.url);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileData.name || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Download failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUploadSuccess = (fileData: { url: string; name: string }[]) => {
    if (fileData && fileData.length > 0) {
      fileData.forEach((item) => {
        cacheSessionFileName(item.url, item.name);
      });
      const shouldReplaceCurrentFile = maxCount === 1;
      if (shouldReplaceCurrentFile) {
        uploadedFileList.forEach((file) => {
          clearCachedSessionFileName(file.url);
        });
        resetPreviewState();
      }
      const newFileList = shouldReplaceCurrentFile
        ? [fileData[fileData.length - 1]]
        : [...uploadedFileList, ...fileData];
      setUploadedFileList(newFileList);

      // Update form value
      if (onChange) {
        const fileNames = newFileList.map((file) => file.url);
      
        onChange(fileNames.length === 1 ? fileNames[0] : fileNames);
      }

      if (uploadConfig?.onUploadSuccess) {
        uploadConfig.onUploadSuccess(fileData);
      }
    }
  };

  const maxCount = uploadConfig?.maxCount || 1;
  const showUploadComponent = Boolean(
    uploadConfig &&
      (uploadedFileList.length === 0 ||
        (maxCount > 1 && uploadedFileList.length <= maxCount)),
  );

  const beforeUpload = (file: RcFile) => {
    const allowedMimeTypes: string[] = [];
    const accept =
      uploadConfig?.accept?.replaceAll(".", "") || "pdf,jpg,jpeg,png";
    accept.split(",").forEach((mimeType) => {
      allowedMimeTypes.push(mimeType.trim().toLowerCase());
    });
    if (allowedMimeTypes.includes(file.type?.split("/")[1]?.toLowerCase())) {
      return true;
    } else {
      CustomMessage.error(
        uploadConfig?.invalidFileTypeMessage ||
          t("common.fileUpload.invalidFileType"),
      );
      return false;
    }
  };

  const triggerReuploadPicker = () => {
    if (disabled || isLoading || !uploadConfig || !hasReupload) return;
    reuploadInputRef.current?.click();
  };

  const handleReuploadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    if (!rawFile || !uploadConfig || disabled) return;

    const maxMb = uploadConfig.maxSize || 5;
    if (rawFile.size / 1024 / 1024 > maxMb) {
      CustomMessage.error(
        uploadConfig.maxSizeErrorMessage ||
          t("common.fileUpload.fileSizeExceeded", { maxSize: maxMb }),
      );
      return;
    }

    const rcFile = rawFile as RcFile;
    const passed = uploadConfig.beforeUpload
      ? uploadConfig.beforeUpload(rcFile)
      : beforeUpload(rcFile);
    if (!passed) return;

    const requestFn = uploadConfig.customRequest || uploadFile;
    requestFn({
      file: rcFile,
      onSuccess: (url: string) => {
        uploadedFileList.forEach((file) => {
          clearCachedSessionFileName(file.url);
        });
        const entry = {
          url,
          name: rawFile.name,
          fileType,
        };
        cacheSessionFileName(entry.url, entry.name);
        resetPreviewState();
        setUploadedFileList([entry]);
        if (onChange) {
         
          onChange(url);
        }
        uploadConfig.onUploadSuccess?.([entry]);
      },
      onError: () => undefined,
    });
  };

  return (
    <div className={["document-viewer-wrapper", className].filter(Boolean).join(" ")}>
      {uploadConfig && hasReupload ? (
        <input
          ref={reuploadInputRef}
          type="file"
          accept={uploadConfig.accept || ".pdf"}
          style={{ display: "none" }}
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleReuploadInputChange}
        />
      ) : null}

      {/* Upload component - show when no files or can upload more */}
      {showUploadComponent && uploadConfig && (
        <FileUpload
          value={[]}
          onChange={handleUploadSuccess}
          maxCount={maxCount - uploadedFileList.length}
          maxSize={uploadConfig.maxSize || 5}
          accept={uploadConfig.accept || ".pdf,.jpg,.jpeg,.png"}
          placeholder={
            uploadConfig.placeholder || t("formPlaceholders.common.uploadFile")
          }
          uploadTip={uploadConfig.uploadTip}
          customRequest={uploadConfig.customRequest || uploadFile}
          disabled={disabled || uploadedFileList.length >= maxCount}
          beforeUpload={uploadConfig.beforeUpload || beforeUpload}
          maxSizeErrorMessage={uploadConfig.maxSizeErrorMessage}
          showUploadTip={uploadConfig.showUploadTip}
        />
      )}

      {/* File list - show all uploaded files */}
      {uploadedFileList.map((fileData, index) => (
        <DocumentFileItem
          key={index}
          fileData={fileData}
          index={index}
          fileType={fileType}
          showUploadComponent={showUploadComponent}
          isLoading={isLoading}
          hasView={hasView}
          hasDelete={hasDelete}
          hasReupload={hasReupload}
          hasDownload={hasDownload}
          disabled={disabled}
          uploadConfig={uploadConfig}
          reuploadTooltip={reuploadTooltip}
          getFileIcon={getFileIcon}
          onView={handleView}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onReupload={triggerReuploadPicker}
          uploadLabel={t("formPlaceholders.common.uploadFile")}
        />
      ))}

      {hasView ? (
        <CustomImagePreviewModal
          visible={visible}
          src={currentFileData.url ? getResolvedFileUrl(currentFileData.url) : ""}
          fileName={currentFileData.name}
          onCancel={() => setVisible(false)}
        />
      ) : null}

      {/* Show single file view for non-upload mode */}
      {/* {!uploadConfig && fileName && (
        <div className="document-file">
          <div className="file-info">
            <img
              src={getFileIcon(fileUrl, fileType)}
              alt="file"
              className="file-icon"
            />
            <span className="file-name">{getFileDisplayName(fileName)}</span>
          </div>
          <div className="file-actions">
            {hasView && onView && (
              <img
                src={EyeIcon}
                alt="view"
                className={`action-icon ${isLoading ? "loading" : ""}`}
                onClick={onView}
              />
            )}
            {hasDownload && onDownload && (
              <img
                src={DownloadIcon}
                alt="download"
                className={`action-icon ${isLoading ? "loading" : ""}`}
                onClick={onDownload}
              />
            )}
            {hasDelete && !disabled && onDelete && (
              <img
                src={TrashIcon}
                alt="delete"
                className="action-icon"
                onClick={onDelete}
              />
            )}
          </div>
        </div>
      )} */}

      <PdfPreviewModal
        visible={pdfVisible}
        fileUrl={currentFileData.url || ""}
        fileName={currentFileData.name}
        onCancel={() => setPdfVisible(false)}
        modalProps={{
          width: "90vw",
          centered: true,
          style: { maxWidth: "90%", top: 20 },
          className: "document-viewer-pdf-modal",
        }}
      />
    </div>
  );
};

export default DocumentViewer;
