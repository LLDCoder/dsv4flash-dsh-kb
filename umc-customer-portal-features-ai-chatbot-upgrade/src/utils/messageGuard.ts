import { message, notification } from "antd";
import type { ArgsProps as MessageArgsProps } from "antd/lib/message";
import type { ArgsProps as NotificationArgsProps } from "antd/lib/notification";
import { shouldSuppressUnauthorizedErrorToast } from "./errorToastSuppress";

let guardInstalled = false;

function isErrorMessageConfig(config: unknown): boolean {
  return (
    typeof config === "object" &&
    config !== null &&
    "type" in config &&
    (config as { type?: string }).type === "error"
  );
}

/** Patch antd message/notification so logged-in-elsewhere logout blocks all error toasts. */
export function installUnauthorizedMessageGuard(): void {
  if (guardInstalled) {
    return;
  }
  guardInstalled = true;

  const originalMessageError = message.error.bind(message);
  message.error = ((...args: Parameters<typeof message.error>) => {
    if (shouldSuppressUnauthorizedErrorToast()) {
      return;
    }
    return originalMessageError(...args);
  }) as typeof message.error;

  const originalMessageOpen = message.open.bind(message);
  message.open = ((config: MessageArgsProps) => {
    if (
      shouldSuppressUnauthorizedErrorToast() &&
      isErrorMessageConfig(config)
    ) {
      return;
    }
    return originalMessageOpen(config);
  }) as typeof message.open;

  const originalNotificationError = notification.error.bind(notification);
  notification.error = ((...args: Parameters<typeof notification.error>) => {
    if (shouldSuppressUnauthorizedErrorToast()) {
      return;
    }
    return originalNotificationError(...args);
  }) as typeof notification.error;

  const originalNotificationOpen = notification.open.bind(notification);
  notification.open = ((config: NotificationArgsProps) => {
    if (shouldSuppressUnauthorizedErrorToast() && isErrorMessageConfig(config)) {
      return;
    }
    return originalNotificationOpen(config);
  });
}
