import { useState, useEffect, useCallback } from "react";
import type { NotificationItem } from "@/components/NotificationPopover";
import {
  getMessageList,
  markAllMessagesAsRead,
  markMessageAsRead,
} from "@/services/notification";
import { transformMessagesToNotifications } from "@/utils/notificationHelper";
import { CustomMessage } from "@/components/common";
import { useNotificationSignalR } from "./useNotificationSignalR";
import { useUserStore } from "@/store/user";
import { useTranslation } from "react-i18next";

export const useNotifications = (
  pageSize: number = 5,
  enableSignalR: boolean = true
) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const currentProfileId = useUserStore((state) => state.currentProfileId);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMessageList({
        pageSize,
        profileId: currentProfileId || 0,
      });
      const transformedNotifications = transformMessagesToNotifications(
        response.data
      );
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [currentProfileId, pageSize]);

  const handleNewNotification = useCallback((notification: any) => {
    console.log("Received new notification via SignalR:", notification);
  }, []);

  const handleRefreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const signalRHook = enableSignalR
    ? useNotificationSignalR({
        onNewNotification: handleNewNotification,
        onRefreshNotifications: handleRefreshNotifications,
      })
    : { isConnected: false, error: null };

  const { isConnected: signalRConnected } = signalRHook;

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllMessagesAsRead(currentProfileId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      CustomMessage.success(t("notifications.markAllReadSuccess"));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      CustomMessage.error(t("notifications.markAllReadFailed"));
    }
  }, [currentProfileId, t]);

  const handleMarkSingleRead = useCallback(async (mesgId: number) => {
    try {
      await markMessageAsRead(mesgId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === String(mesgId) ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark single message as read:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    handleMarkAllRead,
    handleMarkSingleRead,
    signalRConnected,
  };
};
