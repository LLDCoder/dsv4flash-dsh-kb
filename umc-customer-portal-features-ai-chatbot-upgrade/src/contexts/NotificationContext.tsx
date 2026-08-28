import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { NotificationItem } from "@/components/NotificationPopover";
import {
  getMessageList,
  getMessageListShowBox,
  markAllMessagesAsRead,
  markMessageAsRead,
} from "@/services/notification";
import {
  transformMessagesToNotifications,
  transformMessageToNotification,
} from "@/utils/notificationHelper";
import { CustomMessage, AnnouncementModal } from "@/components/common";
import { useTranslation } from "react-i18next";
import { useNotificationSignalR } from "@/hooks/useNotificationSignalR";
import authStorage, { AUTH_STORAGE_KEYS } from "@/storage/authStorage";
import { useUserStore } from "@/store/user";
import { resolveNotificationProfileId } from "@/utils/notificationProfile";

interface NotificationContextType {
  notifications: NotificationItem[];
  loading: boolean;
  unreadCount: number;
  signalRConnected: boolean;
  fetchNotifications: () => Promise<void>;
  handleMarkAllRead: () => Promise<void>;
  handleMarkSingleRead: (mesgId: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith("ar");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const notificationProfileId = resolveNotificationProfileId(currentProfileId);
  const hasResolvedProfile = notificationProfileId !== null;
  const [announcements, setAnnouncements] = useState<NotificationItem[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const token = authStorage.getToken();
      const isValid = authStorage.isTokenValid();
      const authenticated = !!token && isValid;
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEYS.TOKEN) {
        checkAuth();
      }
    };

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-changed", handleAuthChange);

    const interval = setInterval(checkAuth, 60000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-changed", handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || notificationProfileId === null) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const response = await getMessageList({
        pageSize: 100,
        profileId: notificationProfileId,
      });
      const transformedNotifications = transformMessagesToNotifications(
        response.data?.data || response.data || []
      );
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, notificationProfileId]);

  const handleNewNotification = useCallback((message: any) => {
    // Currently no special handling based solely on SignalR payload.
    // Announcement popup is driven by GetNotificationInfoListShowBox instead.
    console.log("Received new notification via SignalR payload", message);
  }, []);

  const handleRefreshNotifications = useCallback(() => {
    fetchNotifications();

    if (!isAuthenticated || notificationProfileId === null) {
      setAnnouncements([]);
      setCurrentAnnouncementIndex(0);
      return;
    }

    const profileIdValue = notificationProfileId;

    (async () => {
      try {
        const res = await getMessageListShowBox(profileIdValue);
        const list = res.data?.data || res.data || [];
        if (list?.length > 0) {
          const transformed = list.map(transformMessageToNotification);
          setAnnouncements(transformed);
          setCurrentAnnouncementIndex(0);
        } else {
          setAnnouncements([]);
          setCurrentAnnouncementIndex(0);
        }
      } catch (error) {
        console.error("Failed to fetch show-box notifications:", error);
      }
    })();
  }, [fetchNotifications, isAuthenticated, notificationProfileId]);

  const { isConnected: signalRConnected } = useNotificationSignalR({
    onNewNotification: handleNewNotification,
    onRefreshNotifications: handleRefreshNotifications,
    enabled: isAuthenticated && hasResolvedProfile,
  });

  const handleMarkAllRead = useCallback(async () => {
    try {
      if (notificationProfileId === null) return;
      await markAllMessagesAsRead(notificationProfileId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      CustomMessage.success(t("notifications.markAllReadSuccess"));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      CustomMessage.error(t("notifications.markAllReadFailed"));
    }
  }, [notificationProfileId, t]);

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
    handleRefreshNotifications();
  }, [fetchNotifications]);

  const handleCloseCurrentAnnouncement = useCallback(
    async (item: NotificationItem) => {
      try {
        await handleMarkSingleRead(Number(item.id));

        const nextIndex = currentAnnouncementIndex + 1;
        if (nextIndex < announcements.length) {
          setCurrentAnnouncementIndex(nextIndex);
        } else {
          setAnnouncements([]);
          setCurrentAnnouncementIndex(0);
        }
      } catch (error) {
        console.error("Failed to mark announcement as read:", error);
      }
    },
    [currentAnnouncementIndex, announcements.length, handleMarkSingleRead]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const value: NotificationContextType = {
    notifications,
    loading,
    unreadCount,
    signalRConnected,
    fetchNotifications,
    handleMarkAllRead,
    handleMarkSingleRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {announcements.length > 0 &&
        currentAnnouncementIndex < announcements.length && (
          <AnnouncementModal
            key={announcements[currentAnnouncementIndex].id}
            visible
            title={
              isArabic
                ? announcements[currentAnnouncementIndex].inAppTitleAr ||
                  announcements[currentAnnouncementIndex].inAppTitleEn
                : announcements[currentAnnouncementIndex].inAppTitleEn ||
                  announcements[currentAnnouncementIndex].inAppTitleAr
            }
            content={
              isArabic
                ? announcements[currentAnnouncementIndex].inAppMessageAr ||
                  announcements[currentAnnouncementIndex].inAppMessageEn
                : announcements[currentAnnouncementIndex].inAppMessageEn ||
                  announcements[currentAnnouncementIndex].inAppMessageAr
            }
            onClose={() =>
              handleCloseCurrentAnnouncement(
                announcements[currentAnnouncementIndex]
              )
            }
          />
        )}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
};
