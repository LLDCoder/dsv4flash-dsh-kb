import { useEffect, useCallback } from "react";
import { useSignalR } from "./useSignalR";
import { SIGNALR_CONFIG } from "@/config/signalr";
import { useUserStore } from '@/store/user';
import { resolveNotificationProfileId } from "@/utils/notificationProfile";

interface NotificationMessage {
  id: number;
  title: string;
  content: string;
  messageType: number;
  [key: string]: any;
}

interface UseNotificationSignalRProps {
  onNewNotification?: (notification: NotificationMessage) => void;
  onRefreshNotifications?: () => void;
  enabled?: boolean; 
}

export const useNotificationSignalR = ({
  onNewNotification,
  onRefreshNotifications,
  enabled = true, 
}: UseNotificationSignalRProps) => {
  const currentProfileId = useUserStore(state=>state.currentProfileId);
  const notificationProfileId = resolveNotificationProfileId(currentProfileId);
  const canConnect = enabled && notificationProfileId !== null;
  
  const handleConnected = useCallback((connectionId: string) => {
    console.log("SignalR Connected:", connectionId);
  }, []);

  const handleDisconnected = useCallback(() => {
    console.log("SignalR Disconnected");
  }, []);

  const { connection, isConnected, error } = useSignalR(
    SIGNALR_CONFIG.HUB_URL,
    handleConnected,
    handleDisconnected,
    canConnect
  );

  useEffect(() => {
    if (connection) {
      connection.on(
        SIGNALR_CONFIG.EVENTS.RECEIVE_NOTIFICATION,
        (user: any, message: any) => {
          console.log("New notification received:", user, message);
          if (onNewNotification) {
            onNewNotification(message);
          }
          if (onRefreshNotifications) {
            onRefreshNotifications();
          }
        }
      );

      return () => {
        connection.off(SIGNALR_CONFIG.EVENTS.RECEIVE_NOTIFICATION);
      };
    }
  }, [connection, onNewNotification, onRefreshNotifications]);

  return {
    isConnected,
    error,
  };
};
