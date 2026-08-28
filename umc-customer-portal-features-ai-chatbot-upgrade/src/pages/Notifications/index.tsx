import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import type { NotificationItem } from "@/components/NotificationPopover";
import { useNotificationContext } from "@/contexts/NotificationContext";
import "./index.less";
import emptyIcon from "@/assets/images/empty.svg";
import {
  sanitizeNotificationMessageHtml,
} from "@/components/NotificationPopover/sanitizeNotificationMessageHtml";
import { getApplicationPage } from "@/services/myRequest";
import { getAppealList, unwrapApiData } from "@/services/appeal";
import { useUserStore } from "@/store/user";
import {
  createNotificationNavigationGuard,
  isNotificationAppealReference,
  resolveNotificationAppealDetailPath,
  resolveNotificationApplicationDetailPath,
} from "./notificationApplicationNavigation";

const NOTIFICATION_REF_NO_REGEX =
  /\b(RF|MC|ML|MP|IN|HC)-[^-]+-[^-]+-\d{7}\b/g;

function wrapNotificationRefNos(html: string): string {
  if (!html) return "";
  return html.replace(
    NOTIFICATION_REF_NO_REGEX,
    '<span class="notification-ref-no">$&</span>',
  );
}

function getNotificationTargetPath(link?: string): string {
  const value = String(link ?? "").trim();
  if (!value) return "";

  try {
    const parsedUrl = new URL(value, window.location.origin);
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return value;
  }
}

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const navigationGuard = useRef(createNotificationNavigationGuard()).current;
  const userId = useUserStore(
    (state) =>
      state.userInfo.id || state.userInfo.userId || state.userInfo.userID || "",
  );

  useEffect(
    () => () => {
      navigationGuard.invalidate();
    },
    [navigationGuard],
  );

  const handleTabClick = (tab: "all" | "unread" | "read", e: React.MouseEvent<HTMLDivElement>) => {
    setActiveTab(tab);
    e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  };

  const {
    notifications,
    loading,
    handleMarkAllRead,
    handleMarkSingleRead
  } = useNotificationContext();

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : activeTab === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications.filter((n) => n.isRead);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (notification: NotificationItem, e: React.MouseEvent<HTMLParagraphElement>) => {
    const referenceElement = (e.target as HTMLElement).closest<HTMLElement>(
      ".notification-ref-no",
    );
    const referenceNumber = referenceElement?.textContent?.trim();

    if (!referenceNumber) {
      return;
    }

    const navigationRequestId = navigationGuard.begin();

    try {
      let detailPath = "";

      if (isNotificationAppealReference(referenceNumber) && userId) {
        const response = await getAppealList({
          createdBy: userId,
          pageNumber: 1,
          pageSize: 10,
          keyword: referenceNumber,
        });
        const data = unwrapApiData(response);
        detailPath = resolveNotificationAppealDetailPath(
          referenceNumber,
          data.items ?? [],
        );
      } else {
        const response = await getApplicationPage({
          pageSize: 10,
          pageIndex: 1,
          keyword: referenceNumber,
        });
        detailPath = resolveNotificationApplicationDetailPath(
          referenceNumber,
          response.data?.applicationPage?.items ?? [],
        );
      }

      if (!navigationGuard.isCurrent(navigationRequestId)) {
        return;
      }

      if (detailPath) {
        history.push(detailPath);
      } else {
        const targetPath = getNotificationTargetPath(
          notification?.linkVariableValues,
        );
        if (targetPath) {
          history.push(targetPath);
        }
      }
    } catch {
      if (!navigationGuard.isCurrent(navigationRequestId)) {
        return;
      }

      const targetPath = getNotificationTargetPath(
        notification?.linkVariableValues,
      );
      if (targetPath) {
        history.push(targetPath);
      }
    }

    if (!notification.isRead) {
      handleMarkSingleRead(Number(notification.id));
    }
  };
  const handleNotificationCard = (notification: NotificationItem) => {
    if (!notification.isRead) {
      handleMarkSingleRead(Number(notification.id));
    }
  };
  return (
    <div className="notifications-page">

      <div className="notifications-line">

      </div>
      <div className="notifications-layout">
        <div className="notifications-sidebar">
          <div
            className={`filter-item ${activeTab === "all" ? "active" : ""}`}
            onClick={(e) => handleTabClick("all", e)}
          >
            <span className="filter-label">{t('notifications.all')} ({notifications.length})</span>
          </div>
          <div
            className={`filter-item ${activeTab === "unread" ? "active" : ""}`}
            onClick={(e) => handleTabClick("unread", e)}
          >
            <span className="filter-label">
              {t('notifications.unreadMessages')} ({unreadCount})
            </span>
          </div>
          <div
            className={`filter-item ${activeTab === "read" ? "active" : ""}`}
            onClick={(e) => handleTabClick("read", e)}
          >
            <span className="filter-label">
              {t('notifications.readMessages')} ({notifications.length - unreadCount})
            </span>
          </div>
        </div>

        <div className="notifications-container">
          <div className="notifications-header">
            <div className="notifications-hint">
              {t('notifications.showNotificationsHint')}
            </div>
            <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
              {t('notifications.markAllAsRead')}
            </button>
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="notifications-empty">
                <p className="empty-text">{t('notifications.loading')}</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notifications-empty">
                <div className="empty-icon">
                  <img src={emptyIcon} />
                </div>
                <p className="empty-text">{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-card ${!notification.isRead ? "unread" : ""
                    }`}
                    onClick={() => handleNotificationCard(notification)}
                >
                  <div className="notification-main">
                    {!notification.isRead ? (
                      <span className="unread-dot" />
                    ) : (
                      <span className="readed-dot" />
                    )}
                    <div className="notification-content-wrapper">
                      <div className="notification-title-row">
                        <h3>{i18n.language.startsWith('ar') ? notification.inAppTitleAr : notification.inAppTitleEn}</h3>
                        <span className="notification-time">
                          {notification.time}
                        </span>
                      </div>
                      <p
                        onClick={(e) => handleNotificationClick(notification, e)}
                        className="notification-content"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeNotificationMessageHtml(
                            wrapNotificationRefNos(
                              i18n.language.startsWith("ar")
                                ? notification.inAppMessageAr
                                : notification.inAppMessageEn,
                            ),
                          ),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
