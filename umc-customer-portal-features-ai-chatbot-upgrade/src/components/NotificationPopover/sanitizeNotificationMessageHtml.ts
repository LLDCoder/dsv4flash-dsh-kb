import DOMPurify, { type Config } from "dompurify";

const NOTIFICATION_MESSAGE_SANITIZER_CONFIG: Config = {
  ALLOWED_TAGS: [
    "b",
    "br",
    "em",
    "i",
    "mark",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "u",
  ],
  ALLOWED_ATTR: ["class", "dir", "lang", "title"],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

export function sanitizeNotificationMessageHtml(
  content: string | null | undefined,
): string {
  return DOMPurify.sanitize(
    content ?? "",
    NOTIFICATION_MESSAGE_SANITIZER_CONFIG,
  );
}
