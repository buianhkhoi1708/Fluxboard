import { create } from "zustand";
import { notificationApi } from "../api/notificationApi";
import { NotificationStore, AppNotification } from "../types/notificationTypes";

let isPollingActive = false;
let currentPollingUserId: string | null = null;

const optionalString = (value: any): string | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
};

const getRawNotificationId = (notif: any): string => {
  return String(notif?._id || notif?.id || notif?.notification_id || "");
};

const normalizeActionUrl = (rawUrl?: string | null): string | undefined => {
  if (!rawUrl) return undefined;

  let url = String(rawUrl).trim();
  if (!url) return undefined;

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      url = `${parsed.pathname}${parsed.search}`;
    }
  } catch {}

  if (url.startsWith("/boards/")) {
    url = url.replace("/boards/", "/board/");
  }

  return url;
};

const mapNotification = (notif: any): AppNotification => {
  const id = getRawNotificationId(notif);

  return {
    id,
    title: optionalString(notif?.title) || "",
    message: optionalString(notif?.message) || "",
    type: optionalString(notif?.type) || "",

    referenceId: optionalString(notif?.reference_id || notif?.referenceId),
    referenceType: optionalString(
      notif?.reference_type || notif?.referenceType,
    ),
    actionUrl: normalizeActionUrl(notif?.action_url || notif?.actionUrl),

    metadata: notif?.metadata || {},

    timestamp: notif?.created_at
      ? new Date(notif.created_at).getTime()
      : notif?.timestamp
        ? new Date(notif.timestamp).getTime()
        : Date.now(),

    isRead: Boolean(notif?.is_read ?? notif?.isRead ?? false),
  };
};

const sortNotifications = (items: AppNotification[]): AppNotification[] => {
  return [...items].sort((a, b) => b.timestamp - a.timestamp);
};

const extractNotificationList = (response: any): any[] => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.notifications)) {
    return response.notifications;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  latestToastNotification: null,
  stompClient: null,

  connectWebSocket: async (userId: string) => {
    if (!userId) return;

    const normalizedUserId = String(userId);

    if (isPollingActive && currentPollingUserId === normalizedUserId) {
      return;
    }

    if (isPollingActive && currentPollingUserId !== normalizedUserId) {
      isPollingActive = false;
    }

    isPollingActive = true;
    currentPollingUserId = normalizedUserId;

    try {
      const response: any = await notificationApi.getNotificationHistory(1, 50);
      const rawList = extractNotificationList(response);

      const mappedNotifs = sortNotifications(
        rawList
          .map((rawNotif: any) => mapNotification(rawNotif))
          .filter((item: AppNotification) => Boolean(item.id)),
      );

      const unread = mappedNotifs.filter(
        (n: AppNotification) => !n.isRead,
      ).length;

      set({
        notifications: mappedNotifs,
        unreadCount: unread,
      });
    } catch (error) {
      console.error(
        "Failed to load initial MongoDB notification history:",
        error,
      );
    }

    const executePoll = async () => {
      if (!isPollingActive || currentPollingUserId !== normalizedUserId) return;

      try {
        const response: any = await notificationApi.listenToLongPolling();
        const incomingNotifications = extractNotificationList(response);

        if (incomingNotifications.length > 0) {
          set((state) => {
            let currentList = [...state.notifications];
            let currentUnread = state.unreadCount;
            let latestNewNotification: AppNotification | null = null;

            incomingNotifications.forEach((rawNotif: any) => {
              const mapped = mapNotification(rawNotif);

              if (!mapped.id) return;

              const exists = currentList.some(
                (item: AppNotification) => item.id === mapped.id,
              );

              if (!exists) {
                currentList = [mapped, ...currentList];

                if (!mapped.isRead) {
                  currentUnread += 1;
                }

                if (!latestNewNotification) {
                  latestNewNotification = mapped;
                }

                return;
              }

              currentList = currentList.map((item: AppNotification) =>
                item.id === mapped.id
                  ? {
                      ...item,
                      ...mapped,
                      isRead: item.isRead || mapped.isRead,
                    }
                  : item,
              );
            });

            return {
              notifications: sortNotifications(currentList),
              unreadCount: currentUnread,
              latestToastNotification:
                latestNewNotification || state.latestToastNotification,
            };
          });
        }

        if (isPollingActive && currentPollingUserId === normalizedUserId) {
          setTimeout(executePoll, 0);
        }
      } catch (error) {
        if (isPollingActive && currentPollingUserId === normalizedUserId) {
          setTimeout(executePoll, 5000);
        }
      }
    };

    executePoll();
  },

  disconnectWebSocket: () => {
    isPollingActive = false;
    currentPollingUserId = null;
    console.log("Notification real-time pipeline stopped.");
  },

  addNotification: (message: string, extra: Partial<AppNotification> = {}) => {
    set((state) => {
      const newNotif: AppNotification = {
        id: extra.id || Math.random().toString(36).substring(2, 9),
        title: extra.title || "",
        message,
        type: extra.type || "LOCAL",

        referenceId: extra.referenceId,
        referenceType: extra.referenceType,
        actionUrl: normalizeActionUrl(extra.actionUrl),

        metadata: extra.metadata || {},
        timestamp: extra.timestamp || Date.now(),
        isRead: extra.isRead ?? false,
      };

      return {
        notifications: sortNotifications([newNotif, ...state.notifications]),
        unreadCount: state.unreadCount + (newNotif.isRead ? 0 : 1),
        latestToastNotification: newNotif,
      };
    });
  },

  markAsRead: async (id: string) => {
    if (!id) return;

    const targetNotif = get().notifications.find(
      (n: AppNotification) => n.id === id,
    );

    if (targetNotif?.isRead) {
      return;
    }

    try {
      await notificationApi.markAsReadOnServer(id);

      set((state) => {
        const target = state.notifications.find(
          (n: AppNotification) => n.id === id,
        );

        const unreadDecrease = target && !target.isRead ? 1 : 0;

        return {
          notifications: state.notifications.map((n: AppNotification) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
          unreadCount: Math.max(0, state.unreadCount - unreadDecrease),
        };
      });
    } catch (error) {
      console.error("Failed to sync notification status to server:", error);
    }
  },

  markAllAsRead: async () => {
    const unreadNotifications = get().notifications.filter(
      (n: AppNotification) => !n.isRead,
    );

    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map((n: AppNotification) =>
          notificationApi.markAsReadOnServer(n.id),
        ),
      );

      set((state) => ({
        notifications: state.notifications.map((n: AppNotification) => ({
          ...n,
          isRead: true,
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error(
        "Failed to clear all unread notification statuses on server:",
        error,
      );
    }
  },

  clearToastNotification: (id?: string) => {
    set((state) => {
      if (!id || state.latestToastNotification?.id === id) {
        return {
          latestToastNotification: null,
        };
      }

      return state;
    });
  },
}));
