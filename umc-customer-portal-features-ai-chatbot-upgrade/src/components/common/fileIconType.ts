export type FileIconType = "pdf" | "jpg" | "jpeg" | "png" | "video";

export type FileType =
  | "PDF"
  | "JPG"
  | "PNG"
  | "JPEG"
  | "pdf"
  | "jpg"
  | "png"
  | "jpeg"
  | "MP4"
  | "MOV"
  | "M4V"
  | "WEBM"
  | "OGV"
  | "AVI"
  | "MKV"
  | "mp4"
  | "mov"
  | "m4v"
  | "webm"
  | "ogv"
  | "avi"
  | "mkv";

interface ResolveFileIconTypeOptions {
  fileName?: string;
  fileUrl?: string;
  fileType?: FileType;
  fallback?: FileIconType;
}

const VIDEO_FILE_PATTERN = /\.(mp4|mov|m4v|webm|ogv|avi|mkv)(?=$|[?#&])/i;
const PDF_FILE_PATTERN = /\.pdf(?=$|[?#&])/i;
const JPEG_FILE_PATTERN = /\.jpeg(?=$|[?#&])/i;
const JPG_FILE_PATTERN = /\.jpg(?=$|[?#&])/i;
const PNG_FILE_PATTERN = /\.png(?=$|[?#&])/i;

const resolveValueIconType = (value?: string): FileIconType | undefined => {
  if (!value) return undefined;
  if (VIDEO_FILE_PATTERN.test(value)) return "video";
  if (PDF_FILE_PATTERN.test(value)) return "pdf";
  if (JPEG_FILE_PATTERN.test(value)) return "jpeg";
  if (JPG_FILE_PATTERN.test(value)) return "jpg";
  if (PNG_FILE_PATTERN.test(value)) return "png";
  return undefined;
};

const resolveExplicitFileType = (
  fileType?: FileType,
): FileIconType | undefined => {
  const normalizedType = fileType?.toLowerCase();
  if (!normalizedType) return undefined;
  if (["mp4", "mov", "m4v", "webm", "ogv", "avi", "mkv"].includes(normalizedType)) {
    return "video";
  }
  if (normalizedType === "pdf") return "pdf";
  if (normalizedType === "jpeg") return "jpeg";
  if (normalizedType === "jpg") return "jpg";
  if (normalizedType === "png") return "png";
  return undefined;
};

export const resolveFileIconType = ({
  fileName,
  fileUrl,
  fileType,
  fallback = "pdf",
}: ResolveFileIconTypeOptions): FileIconType =>
  resolveValueIconType(fileName) ??
  resolveValueIconType(fileUrl) ??
  resolveExplicitFileType(fileType) ??
  fallback;
