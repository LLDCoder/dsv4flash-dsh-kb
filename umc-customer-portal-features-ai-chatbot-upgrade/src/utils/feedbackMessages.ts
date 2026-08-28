import { message, notification } from "antd";

export function destroyAllFeedbackMessages(): void {
  message.destroy();
  notification.destroy();
}
