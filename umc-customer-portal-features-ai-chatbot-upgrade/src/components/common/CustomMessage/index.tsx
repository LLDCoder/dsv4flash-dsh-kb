import { message } from "antd";
import { useEffect, useRef, type ReactNode } from "react";
import { shouldSuppressUnauthorizedErrorToast, shouldSuppressNetworkErrorToast } from "@/utils/errorToastSuppress";
import { destroyAllFeedbackMessages } from "@/utils/feedbackMessages";
import "./index.less";
import ToastErrorIcon from "@/assets/icons/toast-error.svg";
import ToastInfoIcon from "@/assets/icons/toast-info.svg";
import ToastLoadingIcon from "@/assets/icons/toast-loading.svg";
import ToastSuccessIcon from "@/assets/icons/toast-success.svg";
import ToastWarningIcon from "@/assets/icons/toast-warning.svg";

export type MessageType = "success" | "error" | "warning" | "info" | "loading";

export interface CustomMessageOptions {
  content: ReactNode;
  type: MessageType;
  duration?: number;
  onClose?: () => void;
}

const DEFAULT_DURATION = 3;
const INTERACTIVE_CONTENT_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface ManagedMessageContentProps {
  content: ReactNode;
  duration: number;
  onExpire: () => void;
}

function ManagedMessageContent({
  content,
  duration,
  onExpire,
}: ManagedMessageContentProps) {
  const contentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (
      duration <= 0 ||
      contentRef.current?.querySelector(INTERACTIVE_CONTENT_SELECTOR)
    ) {
      return;
    }

    const closeTimer = window.setTimeout(onExpire, duration * 1000);

    return () => window.clearTimeout(closeTimer);
  }, [duration, onExpire]);

  return (
    <span ref={contentRef} className="custom-message__content">
      {content}
    </span>
  );
}

const messageIconMap: Record<MessageType, string> = {
  success: ToastSuccessIcon,
  error: ToastErrorIcon,
  warning: ToastWarningIcon,
  info: ToastInfoIcon,
  loading: ToastLoadingIcon,
};

function renderMessageIcon(type: MessageType) {
  return (
    <span className={`custom-message__icon custom-message__icon--${type}`}>
      <img src={messageIconMap[type]} alt="" />
    </span>
  );
}

function showMessage(
  type: MessageType,
  content: ReactNode,
  duration?: number,
  onClose?: () => void,
  key?: string,
) {
  const resolvedDuration = duration ?? DEFAULT_DURATION;
  let hasClosed = false;
  const handleClose = () => {
    if (hasClosed) return;
    hasClosed = true;
    onClose?.();
  };
  const handleExpire = () => {
    result();
    handleClose();
  };

  const result = message[type]({
    content: (
      <ManagedMessageContent
        content={content}
        duration={resolvedDuration}
        onExpire={handleExpire}
      />
    ),
    duration: resolvedDuration,
    onClose: handleClose,
    key,
    icon: renderMessageIcon(type),
    className: `custom-message custom-message--${type}`,
  });
  return result;
}

class CustomMessage {
  static success(content: ReactNode, duration?: number, onClose?: () => void) {
    return showMessage("success", content, duration, onClose);
  }

  static error(content: ReactNode, duration?: number, onClose?: () => void, key?: string) {
    if (shouldSuppressUnauthorizedErrorToast() || shouldSuppressNetworkErrorToast()) {
      return;
    }

    return showMessage("error", content, duration, onClose, key);
  }

  static warning(content: ReactNode, duration?: number, onClose?: () => void) {
    return showMessage("warning", content, duration, onClose);
  }

  static info(content: ReactNode, duration?: number, onClose?: () => void) {
    return showMessage("info", content, duration, onClose);
  }

  static loading(content: ReactNode, duration?: number, onClose?: () => void) {
    return showMessage("loading", content, duration, onClose);
  }

  static show(options: CustomMessageOptions) {
    const { content, type, duration, onClose } = options;

    if (type === "success") {
      return this.success(content, duration, onClose);
    } else if (type === "error") {
      return this.error(content, duration, onClose);
    } else if (type === "warning") {
      return this.warning(content, duration, onClose);
    } else if (type === "info") {
      return this.info(content, duration, onClose);
    } else if (type === "loading") {
      return this.loading(content, duration, onClose);
    }
  }

  static destroy() {
    destroyAllFeedbackMessages();
  }
}

export default CustomMessage;
